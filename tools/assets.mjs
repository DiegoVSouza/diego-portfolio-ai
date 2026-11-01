#!/usr/bin/env node
// assets.mjs — CLI sem dependências para buscar, baixar, registrar e auditar assets 3D gratuitos.
// Requer Node >= 18 (fetch nativo) e Python 3 (só para extrair ZIP com segurança).
// Rode da raiz do projeto: node tools/assets.mjs help
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const pos = [];
const flags = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) flags[a.slice(2)] = true;
    else { flags[a.slice(2)] = next; i++; }
  } else pos.push(a);
}

const root = path.resolve(typeof flags.root === 'string' ? flags.root : process.cwd());
const P = {
  raw: path.join(root, 'assets', 'raw'),
  ledger: path.join(root, 'assets', 'ledger.json'),
  credits: path.join(root, 'assets', 'CREDITS.md'),
  cache: path.join(root, '.cache', 'asset-downloads'),
  staging: path.join(root, '.cache', 'asset-staging'),
};
const MAX_BYTES = Number(flags['max-mb'] ?? 300) * 1024 * 1024;
const UA = process.env.ASSET_UA ?? 'AssetKit/1.0 (dev tooling; defina ASSET_UA com seu contato)';
const DRY = Boolean(flags['dry-run']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const die = (msg, code = 1) => { console.error(`assets: ${msg}`); process.exit(code); };
const posix = p => p.split(path.sep).join('/');
const safeId = id => { if (!/^[A-Za-z0-9_.-]+$/.test(id ?? '')) die(`id inválido: ${id}`); return id; };

// ---------- .env mínimo (sem dependência) ----------
try {
  for (const line of (await fs.readFile(path.join(root, '.env'), 'utf8')).split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch { /* sem .env: ok */ }

// ---------- licenças: só valores exatos conhecidos; o resto bloqueia ----------
const LICENSES = {
  'cc0': 'CC0', 'cc0 1.0': 'CC0', 'cc0 1.0 universal': 'CC0', 'cc0 public domain': 'CC0', 'public domain (cc0)': 'CC0',
  'cc-by 4.0': 'CC-BY-4.0', 'cc by 4.0': 'CC-BY-4.0', 'cc-by-4.0': 'CC-BY-4.0', 'cc attribution': 'CC-BY-4.0',
};
function resolveLicense(raw, { author, title, url }) {
  let norm = LICENSES[String(raw ?? '').trim().toLowerCase()];
  if (!norm && typeof flags['accept-licence'] === 'string' && ['CC0', 'CC-BY-4.0'].includes(flags['accept-licence'])) {
    console.warn(`aviso: licença "${raw}" desconhecida; aceita manualmente como ${flags['accept-licence']} (você verificou na página oficial).`);
    norm = flags['accept-licence'];
  }
  if (!norm) die(`licença não reconhecida/permitida: "${raw}". Verifique na página oficial (${url}); só CC0 (ou CC-BY-4.0 com --allow-cc-by). Se confirmou, repita com --accept-licence CC0.`);
  if (norm === 'CC-BY-4.0' && !flags['allow-cc-by']) die(`"${title}" é CC-BY-4.0 (exige crédito). Repita com --allow-cc-by se for aceitável.`);
  const meta = { author, license: norm, url };
  if (norm === 'CC-BY-4.0') meta.attribution = `"${title}" by ${author} (${url}), licensed under CC BY 4.0`;
  return meta;
}

// ---------- HTTP ----------
class Fatal extends Error {}
const redact = s => String(s).replace(/([?&](?:token|key|X-Amz-[A-Za-z-]+|Signature)=)[^&\s]+/gi, '$1***');
async function request(url, headers) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 30000);
  try { return await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: ctl.signal, redirect: 'follow' }); }
  finally { clearTimeout(t); }
}
async function retrying(fn) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await fn(); } catch (e) {
      last = e;
      if (e instanceof Fatal || attempt === 2) break;
      await sleep(Math.max((e.retryAfter ?? 0) * 1000, 500 * 2 ** attempt));
    }
  }
  throw last;
}
function checkStatus(res, url) {
  if (res.ok) return;
  const e = [401, 403, 404].includes(res.status) ? new Fatal(`HTTP ${res.status} em ${redact(url)}`) : new Error(`HTTP ${res.status} em ${redact(url)}`);
  e.retryAfter = Number(res.headers.get('retry-after') ?? 0);
  throw e;
}
const getJson = (url, headers = {}) => retrying(async () => {
  const res = await request(url, headers);
  checkStatus(res, url);
  if (!(res.headers.get('content-type') ?? '').toLowerCase().includes('json')) throw new Fatal(`resposta não-JSON em ${redact(url)} (bot-block ou API mudou?)`);
  return res.json();
});
async function download(url, dest, { headers = {}, md5, zip = false } = {}) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  return retrying(async () => {
    const part = `${dest}.part`;
    try {
      const res = await request(url, headers);
      checkStatus(res, url);
      if (!res.url.startsWith('https://')) throw new Fatal('redirecionamento para http bloqueado');
      if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) throw new Fatal(`excede --max-mb (${MAX_BYTES} bytes)`);
      const sha = crypto.createHash('sha256'), m5 = crypto.createHash('md5');
      const fh = await fs.open(part, 'w');
      let size = 0, head = Buffer.alloc(0);
      try {
        for await (const chunk of res.body) {
          size += chunk.byteLength;
          if (size > MAX_BYTES) throw new Fatal('download excede --max-mb');
          if (head.length < 4) head = Buffer.concat([head, chunk]).subarray(0, 4);
          sha.update(chunk); m5.update(chunk); await fh.write(chunk);
        }
      } finally { await fh.close(); }
      if (zip && !head.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) throw new Fatal('não é ZIP (assinatura PK ausente; provável página HTML/bot-block)');
      if (md5 && m5.digest('hex') !== md5) throw new Fatal(`MD5 não confere em ${path.basename(dest)}`);
      await fs.rename(part, dest);
      return { size, sha256: sha.digest('hex') };
    } catch (e) { await fs.rm(part, { force: true }); throw e; }
  });
}

// ---------- ledger / créditos ----------
async function loadLedger() {
  try { return JSON.parse(await fs.readFile(P.ledger, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return { assets: [] }; throw e; }
}
const sha256File = async f => crypto.createHash('sha256').update(await fs.readFile(f)).digest('hex');
async function writeCredits(ledger) {
  const cc0 = ledger.assets.filter(a => a.license === 'CC0');
  const by = ledger.assets.filter(a => a.license !== 'CC0');
  const lines = ['# Credits', '', '_Gerado por tools/assets.mjs a partir de assets/ledger.json. Não edite à mão._', ''];
  if (by.length) { lines.push('## Atribuição obrigatória', ''); for (const a of by) lines.push(`- \`${a.path}\` — ${a.attribution ?? `${a.author} (${a.url}) — ${a.license}`}`); lines.push(''); }
  lines.push('## CC0 (sem atribuição obrigatória; crédito é cortesia)', '');
  for (const a of cc0) lines.push(`- \`${a.path}\` — ${a.author} — ${a.url}`);
  await fs.mkdir(path.dirname(P.credits), { recursive: true });
  await fs.writeFile(P.credits, `${lines.join('\n')}\n`, 'utf8');
}
// Registra tudo-ou-nada: valida todos os arquivos antes de gravar o ledger.
async function registerFiles(absFiles, meta) {
  const ledger = await loadLedger();
  const added = [];
  for (const abs of absFiles) {
    const rel = posix(path.relative(root, abs));
    if (!rel.startsWith('assets/')) throw new Error(`fora de assets/: ${rel}`);
    const sha256 = await sha256File(abs);
    const prior = ledger.assets.find(a => a.path === rel);
    if (prior) { if (prior.sha256 && prior.sha256 !== sha256) throw new Error(`já registrado com hash diferente: ${rel}`); continue; }
    added.push({ path: rel, author: meta.author, license: meta.license, url: meta.url, ...(meta.attribution ? { attribution: meta.attribution } : {}), source: meta.source ?? 'manual', sha256, fetchedAt: new Date().toISOString() });
  }
  ledger.assets.push(...added);
  ledger.assets.sort((a, b) => a.path.localeCompare(b.path));
  await fs.mkdir(path.dirname(P.ledger), { recursive: true });
  await fs.writeFile(P.ledger, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  await writeCredits(ledger);
  return added.length;
}
async function walk(dir, out = []) {
  let items; try { items = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const it of items) { const p = path.join(dir, it.name); if (it.isDirectory()) await walk(p, out); else out.push(p); }
  return out;
}

// ---------- extração segura de ZIP ----------
const globRe = g => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*').replace(/\?/g, '[^/]')}$`, 'i');
async function ingestArchive(zipPath, { id, meta, select, maxExtractMb = 1500 }) {
  const stage = path.join(P.staging, id);
  await fs.rm(stage, { recursive: true, force: true });
  const py = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
  try {
    execFileSync(py, ['-I', path.join(TOOLS_DIR, 'safe_extract.py'), zipPath, stage, '--max-bytes', String(maxExtractMb * 1024 * 1024)], { stdio: 'pipe' });
  } catch (e) { die(`extração rejeitada: ${String(e.stdout ?? e.message).trim()}`); }
  const all = (await walk(stage)).map(f => posix(path.relative(stage, f)));
  if (!select) {
    console.log(`INVENTÁRIO (${all.length} arquivos) em ${posix(path.relative(root, stage))}:`);
    all.slice(0, 200).forEach(f => console.log(`  ${f}`));
    if (all.length > 200) console.log(`  ... +${all.length - 200}`);
    console.log('Escolha o que usar e repita com --select "glob1,glob2" (ex.: "**/*.glb,**/textures/**").');
    return;
  }
  const res = String(select).split(',').map(s => globRe(s.trim()));
  const picked = all.filter(f => res.some(r => r.test(f)));
  if (!picked.length) die(`--select não casou com nenhum arquivo (${all.length} no pacote).`);
  const outDir = path.join(P.raw, meta.source, id);
  const created = [];
  try {
    for (const rel of picked) {
      const dest = path.join(outDir, ...rel.split('/'));
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(path.join(stage, ...rel.split('/')), dest);
      created.push(dest);
    }
    const n = await registerFiles(created, meta);
    console.log(`OK: ${picked.length} arquivos em ${posix(path.relative(root, outDir))} (${n} novos no ledger).`);
  } catch (e) { for (const f of created) await fs.rm(f, { force: true }); die(`promoção revertida: ${e.message}`); }
  await fs.rm(stage, { recursive: true, force: true });
}
async function promoteFiles(items, outDir, meta) { // items: [{cache, rel}]
  const created = [];
  try {
    for (const it of items) {
      const dest = path.join(outDir, ...it.rel.split('/'));
      if (!path.resolve(dest).startsWith(`${path.resolve(outDir)}${path.sep}`)) throw new Error(`caminho inseguro: ${it.rel}`);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(it.cache, dest);
      created.push(dest);
    }
    const n = await registerFiles(created, meta);
    console.log(`OK: ${created.length} arquivos em ${posix(path.relative(root, outDir))} (${n} novos no ledger).`);
  } catch (e) { for (const f of created) await fs.rm(f, { force: true }); die(`promoção revertida: ${e.message}`); }
}

// ---------- provedores ----------
const PH = 'https://api.polyhaven.com';
const ACG = 'https://ambientcg.com/api/v2';
const PP = 'https://api.poly.pizza/v1';
const SF = 'https://api.sketchfab.com/v3';
const need = (key, name) => process.env[key] || die(`${name} ausente: defina ${key} no .env (veja README).`);
const PH_TYPES = ['hdris', 'textures', 'models'];

const providers = {
  async polyhaven_search(q, limit) {
    const t = flags.type ?? 'all';
    const url = `${PH}/assets?t=${encodeURIComponent(t)}${flags.category ? `&c=${encodeURIComponent(flags.category)}` : ''}`;
    const data = await getJson(url);
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return Object.entries(data)
      .filter(([id, a]) => { const hay = [id, a.name, ...(a.tags ?? []), ...(a.categories ?? [])].join(' ').toLowerCase(); return words.every(w => hay.includes(w)); })
      .sort((a, b) => (b[1].download_count ?? 0) - (a[1].download_count ?? 0)).slice(0, limit)
      .map(([id, a]) => `${id} | ${a.name} | ${['hdri', 'texture', 'model'][a.type]} | ${(a.categories ?? []).join('/')} | ${a.polycount ? `${a.polycount} tris` : ''} | CC0 | ${Object.keys(a.authors ?? {}).join(', ')}`);
  },
  async polyhaven_get(id) {
    safeId(id);
    const info = await getJson(`${PH}/info/${id}`);
    const tree = await getJson(`${PH}/files/${id}`);
    const kind = ['hdri', 'texture', 'model'][info.type];
    const res = flags.res ?? '1k';
    const files = [];
    const pick = (node, label) => { if (!node?.url) die(`${id}: ${label} não existe em ${res}. Disponível: ${JSON.stringify(Object.keys(tree))}`); return node; };
    if (kind === 'hdri') {
      const fmt = flags.format ?? 'hdr';
      files.push({ rel: `${id}_${res}.${fmt}`, ...pick(tree.hdri?.[res]?.[fmt], `hdri/${fmt}`) });
    } else if (kind === 'model') {
      const fmt = flags.format ?? 'gltf';
      const node = pick(tree[fmt]?.[res]?.[fmt], `${fmt}/${res}`);
      files.push({ rel: path.posix.basename(new URL(node.url).pathname), ...node });
      for (const [rel, f] of Object.entries(node.include ?? {})) files.push({ rel, ...f });
    } else {
      const fmt = flags.format ?? 'jpg';
      for (const map of String(flags.maps ?? 'Diffuse,nor_gl,arm,Displacement').split(',')) {
        const f = tree[map]?.[res]?.[fmt];
        if (!f) { console.warn(`aviso: mapa ${map} (${res}/${fmt}) ausente; ignorado`); continue; }
        files.push({ rel: path.posix.basename(new URL(f.url).pathname), ...f });
      }
    }
    const total = files.reduce((s, f) => s + (f.size ?? 0), 0);
    console.log(`${id} (${kind}) — ${files.length} arquivos, ${(total / 1048576).toFixed(1)} MiB, CC0`);
    if (DRY) { files.forEach(f => console.log(`  ${f.rel}`)); return; }
    const items = [];
    for (const f of files) {
      const cache = path.join(P.cache, 'polyhaven', id, `${res}-${flags.format ?? 'default'}`, ...f.rel.split('/'));
      let ok = false;
      try { ok = !flags.force && crypto.createHash('md5').update(await fs.readFile(cache)).digest('hex') === f.md5; } catch { /* sem cache */ }
      if (!ok) { await sleep(300); await download(f.url, cache, { md5: f.md5 }); }
      items.push({ cache, rel: f.rel });
    }
    const author = Object.keys(info.authors ?? {}).join(', ') || 'Poly Haven';
    await promoteFiles(items, path.join(P.raw, 'polyhaven', id), { source: 'polyhaven', author, license: 'CC0', url: `https://polyhaven.com/a/${id}` });
  },

  async ambientcg_search(q, limit) {
    const type = { textures: 'Material', hdris: 'HDRI', decals: 'Decal' }[flags.type] ?? flags.type ?? 'Material';
    const d = await getJson(`${ACG}/full_json?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}&sort=popular&limit=${limit}`);
    return (d.foundAssets ?? []).map(a => `${a.assetId} | ${a.displayName ?? ''} | ${a.dataType} | ${a.category ?? ''} | CC0`);
  },
  async ambientcg_get(id) {
    safeId(id);
    const d = await getJson(`${ACG}/full_json?id=${encodeURIComponent(id)}&include=downloadData`);
    const a = (d.foundAssets ?? []).find(x => x.assetId === id) ?? die(`ambientCG: ${id} não encontrado`);
    const attr = `${String(flags.res ?? '1k').toUpperCase()}-${String(flags.format ?? 'jpg').toUpperCase()}`;
    const list = a.downloadFolders?.default?.downloadFiletypeCategories?.zip?.downloads ?? [];
    const dl = list.find(x => x.attribute === attr) ?? die(`ambientCG ${id}: variante ${attr} ausente. Disponível: ${list.map(x => x.attribute).join(', ')}`);
    console.log(`${id} ${attr} — ${(dl.size / 1048576).toFixed(1)} MiB, CC0`);
    if (DRY) return;
    const cache = path.join(P.cache, 'ambientcg', dl.fileName);
    if (flags.force || !(await fs.stat(cache).catch(() => null))) await download(dl.downloadLink, cache, { zip: true });
    await ingestArchive(cache, { id, select: flags.select ?? '**', meta: { source: 'ambientcg', author: 'ambientCG', license: 'CC0', url: `https://ambientcg.com/view?id=${id}` } });
  },

  async polypizza_search(q, limit) {
    const key = need('POLY_PIZZA_API_KEY', 'chave do Poly Pizza');
    const d = await getJson(`${PP}/search/${encodeURIComponent(q)}?limit=${limit}${flags.animated ? '&animated=true' : ''}`, { 'X-Auth-Token': key });
    return (d.results ?? d.models ?? []).map(m => `${m.ID ?? m.id} | ${m.Title ?? m.title} | licença: ${m.Licence ?? m.licence} | ${m.Creator?.Username ?? ''} | ${m.TriCount ?? ''} tris`);
  },
  async polypizza_get(id) {
    safeId(id);
    const m = await getJson(`${PP}/model/${id}`, { 'X-Auth-Token': need('POLY_PIZZA_API_KEY', 'chave do Poly Pizza') });
    const title = m.Title ?? id, author = m.Creator?.Username ?? 'desconhecido', url = `https://poly.pizza/m/${id}`;
    const meta = { source: 'polypizza', ...resolveLicense(m.Licence, { author, title, url }) };
    const link = m.Download ?? die('Poly Pizza: resposta sem campo Download');
    console.log(`${title} por ${author} — ${meta.license}`);
    if (DRY) return;
    const cache = path.join(P.cache, 'polypizza', `${id}.glb`);
    if (flags.force || !(await fs.stat(cache).catch(() => null))) await download(link, cache);
    await promoteFiles([{ cache, rel: `${id}.glb` }], path.join(P.raw, 'polypizza', id), meta);
  },

  async sketchfab_search(q, limit) {
    const lic = flags.license ?? 'cc0';
    const d = await getJson(`${SF}/search?type=models&q=${encodeURIComponent(q)}&downloadable=true&license=${encodeURIComponent(lic)}&count=${Math.min(limit, 24)}${flags.animated ? '&animated=true' : ''}`);
    return (d.results ?? []).map(m => `${m.uid} | ${m.name} | ${m.license?.label} | ${m.user?.displayName} | ${m.faceCount} faces | anim:${m.animationCount}`);
  },
  async sketchfab_get(id) {
    safeId(id);
    const token = need('SKETCHFAB_TOKEN', 'token do Sketchfab');
    const m = await getJson(`${SF}/models/${id}`);
    const url = m.viewerUrl ?? `https://sketchfab.com/3d-models/${id}`;
    const meta = { source: 'sketchfab', ...resolveLicense(m.license?.label, { author: m.user?.displayName ?? m.user?.username ?? 'desconhecido', title: m.name, url }) };
    console.log(`${m.name} — ${meta.license}, ${m.faceCount} faces`);
    if (DRY) return;
    const dl = await getJson(`${SF}/models/${id}/download`, { Authorization: `Token ${token}` });
    const kind = flags.format === 'glb' && dl.glb ? 'glb' : 'gltf';
    const link = dl[kind]?.url ?? die(`Sketchfab: formato ${kind} indisponível (${Object.keys(dl).join(', ')})`);
    const cache = path.join(P.cache, 'sketchfab', `${id}.${kind === 'glb' ? 'glb' : 'zip'}`);
    await download(link, cache, { zip: kind !== 'glb' }); // URL assinada expira: nunca reaproveitar cache antigo nem logar a URL
    if (kind === 'glb') await promoteFiles([{ cache, rel: `${id}.glb` }], path.join(P.raw, 'sketchfab', id), meta);
    else await ingestArchive(cache, { id, select: flags.select ?? '**', meta });
  },
};

// ---------- pacotes conhecidos (sources.json) e URL direta ----------
async function loadSources() {
  return JSON.parse(await fs.readFile(path.join(TOOLS_DIR, '..', 'sources.json'), 'utf8'));
}
async function cmdPack(id) {
  const src = await loadSources();
  const pkg = src.packages.find(p => p.id === id) ?? die(`pacote desconhecido: ${id}. Veja: node tools/assets.mjs packs`);
  const meta = resolveLicense(pkg.license, { author: pkg.author, title: pkg.name, url: pkg.page });
  meta.source = new URL(pkg.page).hostname.split('.').slice(-2, -1)[0]; // opengameart | itch | kenney → assets/raw/<fonte>/<id>/
  const zip = path.join(P.cache, pkg.file);
  const present = await fs.stat(zip).catch(() => null);
  if (!present) {
    if (pkg.mode === 'manual') { console.log(`MANUAL: baixe "${pkg.name}" em ${pkg.page} e salve em .cache/asset-downloads/${pkg.file}\n(itch.io/kenney: clique em Download e escolha pagar $0 quando disponível; não contorne checkout.)`); process.exit(3); }
    console.log(`${pkg.name} — ${pkg.approxMB} MB (${pkg.mode})`);
    if (DRY) return;
    await sleep(1000);
    await download(pkg.url, zip, { zip: true });
  }
  console.log(`SHA-256 do zip: ${await sha256File(zip)} (primeiro hash observado NÃO prova a origem)`);
  await ingestArchive(zip, { id: pkg.id, meta, select: flags.select, maxExtractMb: pkg.maxExtractMB ?? 1500 });
}
async function cmdUrl(url) {
  if (!url?.startsWith('https://')) die('use uma URL https');
  for (const k of ['author', 'license', 'page']) if (typeof flags[k] !== 'string') die(`--${k} é obrigatório (prova de licença na página original)`);
  const id = safeId(flags.name ?? path.basename(new URL(url).pathname).replace(/\.[a-z0-9]+$/i, ''));
  const meta = { source: 'url', ...resolveLicense(flags.license, { author: flags.author, title: id, url: flags.page }) };
  const cache = path.join(P.cache, 'url', path.basename(decodeURIComponent(new URL(url).pathname)));
  if (DRY) return console.log(`baixaria ${url}`);
  const isZip = /\.zip$/i.test(cache);
  if (flags.force || !(await fs.stat(cache).catch(() => null))) { await sleep(1000); await download(url, cache, { zip: isZip }); }
  if (isZip) await ingestArchive(cache, { id, meta, select: flags.select });
  else await promoteFiles([{ cache, rel: path.basename(cache) }], path.join(P.raw, 'url', id), meta);
}

// ---------- register / audit / inspect ----------
async function cmdRegister(target) {
  for (const k of ['author', 'license', 'url']) if (typeof flags[k] !== 'string') die(`--${k} é obrigatório`);
  const abs = path.resolve(root, target ?? die('informe o arquivo/pasta dentro de assets/'));
  const st = await fs.stat(abs).catch(() => die(`não existe: ${target}`));
  const files = st.isDirectory() ? await walk(abs) : [abs];
  const meta = { source: 'manual', ...resolveLicense(flags.license, { author: flags.author, title: path.basename(abs), url: flags.url }) };
  console.log(`registrados ${await registerFiles(files, meta)} novos arquivos.`);
}
async function cmdAudit() {
  const ledger = await loadLedger();
  const skip = new Set(['ledger.json', 'CREDITS.md', 'README.md']);
  const files = (await walk(path.join(root, 'assets'))).filter(f => !skip.has(path.basename(f)));
  const problems = [];
  const byPath = new Map(ledger.assets.map(a => [a.path, a]));
  for (const f of files) {
    const rel = posix(path.relative(root, f)), e = byPath.get(rel);
    if (!e) { problems.push(`sem registro no ledger: ${rel}`); continue; }
    if (!['CC0', 'CC-BY-4.0'].includes(e.license)) problems.push(`licença não permitida (${e.license}): ${rel}`);
    if (e.license === 'CC-BY-4.0' && !e.attribution) problems.push(`CC-BY sem atribuição: ${rel}`);
    if (e.sha256 && e.sha256 !== await sha256File(f)) problems.push(`hash divergente: ${rel}`);
  }
  const present = new Set(files.map(f => posix(path.relative(root, f))));
  for (const a of ledger.assets) if (!present.has(a.path)) problems.push(`ledger aponta arquivo ausente: ${a.path}`);
  problems.forEach(p => console.error(`FALHA: ${p}`));
  console.log(problems.length ? `audit: ${problems.length} problema(s)` : `audit: OK (${files.length} arquivos)`);
  process.exit(problems.length ? 1 : 0);
}
async function cmdInspect(file) {
  const buf = await fs.readFile(path.resolve(root, file ?? die('informe um .glb/.gltf')));
  let json;
  if (buf.toString('ascii', 0, 4) === 'glTF') {
    let off = 12;
    while (off < buf.length) {
      const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
      if (type === 0x4e4f534a) { json = JSON.parse(buf.toString('utf8', off + 8, off + 8 + len)); break; }
      off += 8 + len;
    }
  } else json = JSON.parse(buf.toString('utf8'));
  if (!json) die('JSON do glTF não encontrado');
  const acc = json.accessors ?? [];
  let tris = 0, prims = 0;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const m of json.meshes ?? []) for (const p of m.primitives ?? []) {
    prims++;
    if ((p.mode ?? 4) === 4) tris += (p.indices !== undefined ? acc[p.indices].count : acc[p.attributes.POSITION].count) / 3;
    const pa = acc[p.attributes.POSITION];
    if (pa?.min && pa?.max) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], pa.min[i]); max[i] = Math.max(max[i], pa.max[i]); }
  }
  const anims = (json.animations ?? []).map(a => ({ name: a.name, seconds: +Math.max(0, ...a.samplers.map(s => acc[s.input]?.max?.[0] ?? 0)).toFixed(3), channels: a.channels.length }));
  const out = {
    file, generator: json.asset?.generator, version: json.asset?.version,
    meshes: json.meshes?.length ?? 0, primitives: prims, triangles: Math.round(tris), materials: json.materials?.length ?? 0,
    textures: json.textures?.length ?? 0, images: (json.images ?? []).map(i => i.uri ?? `(embutida:${i.mimeType})`),
    externalBuffers: (json.buffers ?? []).filter(b => b.uri && !b.uri.startsWith('data:')).map(b => b.uri),
    skins: (json.skins ?? []).map(s => ({ joints: s.joints.length, first: s.joints.slice(0, 3).map(j => json.nodes[j].name) })),
    animations: anims, extensionsUsed: json.extensionsUsed ?? [], extensionsRequired: json.extensionsRequired ?? [],
    bboxLocalSemTransformDeNos: min[0] === Infinity ? null : { min, max, size: max.map((v, i) => +(v - min[i]).toFixed(3)) },
  };
  console.log(JSON.stringify(out, null, 2));
  if (out.extensionsRequired.length) console.warn(`aviso: extensões obrigatórias (${out.extensionsRequired.join(', ')}) precisam de decoder no loader (Draco/KTX2/meshopt).`);
}

// ---------- CLI ----------
const HELP = `assets.mjs — assets 3D gratuitos (CC0 por padrão)

  sources                                lista provedores e como cada um funciona
  packs                                  lista pacotes conhecidos (Quaternius/Kenney/OGA)
  search <fonte> <termos> [--type T] [--category C] [--limit N] [--animated] [--license cc0|by]
  get <fonte> <id> [--res 1k] [--format F] [--maps a,b] [--select globs] [--dry-run] [--force]
  pack <id> [--select "globs"]           baixa (ou confere o ZIP manual) e extrai com segurança
  url <https://...> --author A --license CC0 --page <url> [--select globs] [--name id]
  register <arquivo|pasta> --author A --license CC0 --url <página>   (downloads manuais)
  inspect <arquivo.glb|gltf>             triângulos, rig, animações, extensões
  credits | audit                        regenera CREDITS.md | valida ledger vs. arquivos

fontes: polyhaven, ambientcg (sem chave) · polypizza (POLY_PIZZA_API_KEY) · sketchfab (SKETCHFAB_TOKEN)
flags úteis: --allow-cc-by (aceita CC-BY-4.0) · --accept-licence CC0 (licença desconhecida já conferida à mão)
             --max-mb 300 · --root <dir> · env ASSET_UA="SeuApp/1.0 (email)"
exit: 0 ok · 1 erro · 3 ação manual pendente`;

const [cmd, a1, a2] = pos;
const limit = Number(flags.limit ?? 15);
try {
  if (!cmd || cmd === 'help') console.log(HELP);
  else if (cmd === 'sources') { const s = await loadSources(); for (const p of s.providers) console.log(`${p.id.padEnd(12)} ${p.access.padEnd(7)} ${p.license.padEnd(14)} ${p.name} — ${p.notes}`); }
  else if (cmd === 'packs') { const s = await loadSources(); for (const p of s.packages) console.log(`${p.id.padEnd(16)} ${p.mode.padEnd(7)} ${String(p.approxMB).padStart(4)} MB  ${p.name}`); }
  else if (cmd === 'search') {
    const fn = providers[`${a1}_search`] ?? die(`fonte desconhecida: ${a1} (polyhaven|ambientcg|polypizza|sketchfab)`);
    const rows = await fn(pos.slice(2).join(' ') || '', limit);
    console.log(rows.length ? rows.join('\n') : '(nada encontrado)');
  } else if (cmd === 'get') { await (providers[`${a1}_get`] ?? die(`fonte desconhecida: ${a1}`))(a2); }
  else if (cmd === 'pack') await cmdPack(a1);
  else if (cmd === 'url') await cmdUrl(a1);
  else if (cmd === 'register') await cmdRegister(a1);
  else if (cmd === 'inspect') await cmdInspect(a1);
  else if (cmd === 'credits') { await writeCredits(await loadLedger()); console.log('assets/CREDITS.md gerado'); }
  else if (cmd === 'audit') await cmdAudit();
  else die(`comando desconhecido: ${cmd}\n${HELP}`);
} catch (e) { die(redact(e.message)); }
