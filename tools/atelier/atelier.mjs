#!/usr/bin/env node
// atelier.mjs: the model workbench CLI. No dependencies; Blender and Python are only needed by `improve`, `axis` and `candidates`.
//
//   node tools/atelier/atelier.mjs status
//   node tools/atelier/atelier.mjs candidates [--packs <dir>]
//   node tools/atelier/atelier.mjs inspect <model.glb|dir> [--budget N] [--json]
//   node tools/atelier/atelier.mjs improve <in | pack.zip::member> <out.glb> [--budget N] [--planar DEG] [--height H] [--rotate-y DEG] [--keep-textures]
//   node tools/atelier/atelier.mjs palette <textured.glb> <out.glb>   (bake the palette into vertex colours, drop the texture bytes)
//   node tools/atelier/atelier.mjs axis
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectFile, judge } from "./inspect-glb.mjs";

const NL = String.fromCharCode(10);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const argv = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (!a.startsWith("--")) pos.push(a);
  else if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) flags[a.slice(2)] = true;
  else flags[a.slice(2)] = argv[(i += 1)];
}
const packsDir = path.resolve(root, typeof flags.packs === "string" ? flags.packs : "../../free-3d-assets-kit/zips");
const evidence = path.join(root, "artifacts", "evidence", "atelier");

function blenderPath() {
  const candidates = [process.env.BLENDER, "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe", "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe", "C:/Program Files/Blender Foundation/Blender 4.5/blender.exe"].filter(Boolean);
  const found = candidates.find((c) => existsSync(c));
  if (found) return found;
  const probe = spawnSync("blender", ["--version"], { encoding: "utf8" });
  return probe.status === 0 ? "blender" : null;
}
const blenderVersion = (exe) => spawnSync(exe, ["--version"], { encoding: "utf8" }).stdout.split("\n")[0]?.trim() ?? "unknown";
const mcpUp = (port = 9876) =>
  new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port, timeout: 800 });
    socket.once("connect", () => (socket.destroy(), resolve(true)));
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => (socket.destroy(), resolve(false)));
  });
const need = (exe) => {
  if (!exe) throw new Error("Blender not found: install Blender 4.5+ or set BLENDER to its executable");
  return exe;
};

/** Names of every model in a pack zip, read-only, via Python's zipfile (no extraction). */
function packMembers(zip) {
  const code = "import sys,zipfile;print('\\n'.join(n for n in zipfile.ZipFile(sys.argv[1]).namelist() if n.lower().endswith(('.glb','.gltf','.fbx','.obj'))))";
  return execFileSync("python", ["-I", "-c", code, zip], { encoding: "utf8" }).split("\n").filter(Boolean);
}

/** Extract one member (and, for a .gltf, its siblings in the same folder: .bin and textures) into a fresh folder; refuses unsafe names. */
function extractMember(zip, member, outDir) {
  const code = [
    "import sys,zipfile,os,posixpath",
    "zip,member,out=sys.argv[1:4]",
    "f=zipfile.ZipFile(zip)",
    "folder=posixpath.dirname(member)",
    "want=[n for n in f.namelist() if not n.endswith('/') and (n==member or (member.lower().endswith('.gltf') and posixpath.dirname(n)==folder and not n.lower().endswith(('.gltf','.fbx'))))]",
    "total=0",
    "for n in want:",
    "  if n.startswith('/') or '..' in n.split('/') or ':' in n: raise SystemExit('unsafe name '+n)",
    "  total+=f.getinfo(n).file_size",
    "  if total>200*1024*1024: raise SystemExit('too large')",
    "  dest=os.path.join(out,posixpath.basename(n))",
    "  open(dest,'wb').write(f.read(n))",
    "print(os.path.join(out,posixpath.basename(member)))",
  ].join("\n");
  mkdirSync(outDir, { recursive: true });
  return execFileSync("python", ["-I", "-c", code, zip, member, outDir], { encoding: "utf8" }).trim();
}

const COMMANDS = {
  async status() {
    const exe = blenderPath();
    const rows = [
      ["node", process.version],
      ["python", spawnSync("python", ["--version"], { encoding: "utf8" }).stdout.trim() || "missing"],
      ["blender", exe ? `${blenderVersion(exe)} (${exe})` : "not found"],
      ["blender mcp :9876", (await mcpUp()) ? "up (a Blender with the MCP addon is listening)" : "down (headless scripts still work)"],
      ["packs", existsSync(packsDir) ? `${readdirSync(packsDir).filter((f) => f.endsWith(".zip")).length} zips in ${path.relative(root, packsDir) || "."}` : `missing: ${packsDir}`],
    ];
    for (const [k, v] of rows) console.log(k.padEnd(20), v);
  },

  candidates() {
    if (!existsSync(packsDir)) throw new Error(`no packs folder at ${packsDir} (use --packs)`);
    const kinds = [
      ["street", /Street_|Sidewalk_|Floor_/],
      ["building", /Building_|Free Sample/],
      ["prop", /Prop_|Planter|Bollard|Barrier|Bench|Lamp|Sign|Hydrant|Trash|Bin/i],
      ["facade part", /Brick_|Cornice|Trim|Metal_|Roof_|Window|Door|Entrance|Stairs/],
      ["decal / poster", /Decal|Posters|Char_|Tape|Cracks|Magazine|Letter/],
      ["rail", /railroad|track|spline/i],
      ["metro interior", /Metro\/|Rails\/|Shutter\//],
    ];
    const total = {};
    for (const zip of readdirSync(packsDir).filter((f) => f.endsWith(".zip"))) {
      const members = packMembers(path.join(packsDir, zip));
      // A pack ships the same model in several formats: count each name once.
      const names = new Map();
      for (const m of members) names.set(path.basename(m).replace(/\.[^.]+$/, ""), m);
      const groups = {};
      for (const [name, member] of names) {
        const kind = kinds.find(([, re]) => re.test(member))?.[0] ?? "other";
        (groups[kind] ??= []).push(name);
      }
      console.log(`\n${zip}: ${names.size} distinct models`);
      for (const [kind, list] of Object.entries(groups)) {
        console.log(`  ${kind.padEnd(16)} ${String(list.length).padStart(3)}  e.g. ${list.slice(0, 4).join(", ")}`);
        total[kind] = (total[kind] ?? 0) + list.length;
      }
    }
    console.log("\nUse `improve <pack.zip>::<member>` on one of these; the pack file name is a path inside the zip (see PLAYBOOK).");
  },

  inspect() {
    const target = pos[1];
    if (!target) throw new Error("usage: inspect <model.glb|folder> [--budget N] [--json]");
    const files = statSync(target).isDirectory() ? readdirSync(target).filter((f) => /\.(glb|gltf)$/i.test(f)).map((f) => path.join(target, f)) : [target];
    const budget = Number(flags.budget ?? 8000);
    const reports = files.map((f) => ({ ...inspectFile(f), problems: [] }));
    for (const r of reports) r.problems = judge(r, { budget });
    if (flags.json) return console.log(JSON.stringify(reports, null, 2));
    for (const r of reports) {
      const size = r.bounds ? r.bounds.size.map((v) => v.toFixed(2)).join(" x ") : "?";
      console.log(`${path.basename(r.file)}: ${r.triangles} tris, ${(r.bytes / 1024).toFixed(0)} KB, ${size}, ${r.materials} materials, ${r.textures} textures, attributes ${r.attributes.join("/")}`);
      for (const p of r.problems) console.log(`   ! ${p}`);
    }
    if (reports.some((r) => r.problems.length)) process.exitCode = 1;
  },

  improve() {
    const exe = need(blenderPath());
    const [, input, output] = pos;
    if (!input || !output) throw new Error("usage: improve <in | pack.zip::member> <out.glb> [options]");
    let source = input;
    if (input.includes("::")) {
      const [zip, member] = input.split("::");
      const zipPath = path.isAbsolute(zip) ? zip : path.join(packsDir, zip);
      source = extractMember(zipPath, member, path.join(root, ".cache", "atelier", path.basename(member).replace(/\W+/g, "-")));
    }
    const passthrough = [];
    for (const key of ["budget", "height", "rotate-y", "origin", "planar"]) if (flags[key] !== undefined) passthrough.push(`--${key}`, String(flags[key]));
    if (flags["keep-textures"]) passthrough.push("--keep-textures");
    if (flags["keep-winding"]) passthrough.push("--keep-winding");
    const run = spawnSync(exe, ["--background", "--python", path.join(here, "blender", "improve_model.py"), "--", source, path.resolve(output), ...passthrough], { encoding: "utf8" });
    const line = run.stdout.split("\n").find((l) => l.startsWith("ATELIER_IMPROVE "));
    if (run.status !== 0 || !line) {
      console.error(run.stdout.split("\n").slice(-15).join("\n"), run.stderr.split("\n").slice(-15).join("\n"));
      throw new Error("Blender failed (see output above)");
    }
    const info = JSON.parse(line.slice("ATELIER_IMPROVE ".length));
    console.log(`improved ${info.in}: ${info.before.triangles} -> ${info.after.triangles} tris, size ${info.before.size.join("x")} -> ${info.after.size.join("x")} (${info.blender})`);
    const report = inspectFile(path.resolve(output));
    const problems = judge(report, { budget: Number(flags.budget ?? 8000) });
    console.log(problems.length ? problems.map((p) => `   ! ${p}`).join("\n") : "   inspect: clean");
    mkdirSync(evidence, { recursive: true });
    writeFileSync(path.join(evidence, `${path.basename(output, ".glb")}.improve.json`), JSON.stringify({ ...info, inspect: report, problems }, null, 2));
  },

  palette() {
    const [, input, output] = pos;
    if (!input || !output) throw new Error("usage: palette <textured.glb> <out.glb>");
    const tmp = path.join(root, ".cache", "atelier", "palette-tmp.glb");
    mkdirSync(path.dirname(tmp), { recursive: true });
    mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    const run = (script, args) => spawnSync("python", ["-I", path.join(root, script), ...args], { encoding: "utf8" });
    const baked = run("scripts/glb_bake_palette.py", [path.resolve(input), tmp]);
    if (baked.status !== 0) throw new Error(`palette bake failed: ${baked.stderr.split(NL).slice(-4).join(" ")}`);
    const packed = run("tools/atelier/compact_glb.py", [tmp, path.resolve(output)]);
    if (packed.status !== 0) throw new Error(`compact failed: ${packed.stderr.split(NL).slice(-4).join(" ")}`);
    console.log(packed.stdout.trim());
    const report = inspectFile(path.resolve(output));
    const problems = judge(report, { budget: Number(flags.budget ?? 8000) });
    console.log(`${report.triangles} tris, ${(report.bytes / 1024).toFixed(0)} KB, attributes ${report.attributes.join("/")}`);
    console.log(problems.length ? problems.map((p) => `   ! ${p}`).join(NL) : "   inspect: clean");
    if (problems.length) process.exitCode = 1;
  },

  axis() {
    const exe = need(blenderPath());
    const out = path.join(evidence, "axis-proof");
    const run = spawnSync(exe, ["--background", "--python", path.join(here, "blender", "axis_proof.py"), "--", out], { encoding: "utf8" });
    const ok = run.stdout.includes("ATELIER_AXIS_PROOF_PASSED");
    console.log(ok ? run.stdout.split("\n").find((l) => l.includes("ATELIER_AXIS_PROOF_PASSED")) : run.stdout.split("\n").slice(-12).join("\n") + run.stderr.slice(-800));
    if (!ok) process.exitCode = 1;
  },
};

const command = pos[0];
if (!command || !(command in COMMANDS)) {
  console.log("usage: atelier.mjs status | candidates | inspect <glb|dir> | improve <in> <out.glb> | palette <in.glb> <out.glb> | axis");
  process.exit(command ? 2 : 0);
}
try {
  await COMMANDS[command]();
} catch (error) {
  console.error(`atelier: ${error.message}`);
  process.exit(1);
}
