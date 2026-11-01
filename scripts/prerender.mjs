// Prerenders every route to dist/<path>/index.html from the SSR bundle (SEO-001), then writes the text files
// for machine readers and the _headers/_redirects files. Needs `vite build` and `vite build --ssr` first.
import { mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const dist = join(root, "dist");
const SITE = process.env.SITE_ORIGIN ?? "https://diego-portfolio-ai.pages.dev";
const server = await import(pathToFileURL(join(root, "dist-ssr/entry-server.js")).href);
const template = readFileSync(join(dist, "index.html"), "utf8");
const manifest = JSON.parse(readFileSync(join(dist, ".vite/manifest.json"), "utf8"));

// The chunk a route needs, and what that chunk imports, as modulepreload links (no request waterfall).
const PAGE_SOURCE = { home: "Home", demo: "Demo", case: "Case", evidence: "Evidence", method: "Method", experience: "Experience", "design-system": "DesignSystem", "not-found": "NotFound" };
function chunkKey(src) {
  const key = Object.keys(manifest).find((k) => manifest[k].src === src);
  if (!key) throw new Error(`no chunk in the manifest for ${src}`);
  return key;
}

function chunksFor(route) {
  const sources = [`src/pages/${PAGE_SOURCE[route.page]}.tsx`];
  const flow = route.page === "home" || route.page === "demo" ? "system" : route.page === "method" ? "harness" : route.page === "case" ? route.slug : null;
  if (route.page === "case") sources.push(`src/content/cases/${route.slug}.ts`);
  if (flow) sources.push(`src/content/flows/${flow}.json`, `src/data/flow-layouts/${flow}.json`);
  const seen = new Set();
  const visit = (key) => {
    if (seen.has(key)) return;
    seen.add(key);
    for (const next of manifest[key]?.imports ?? []) visit(next);
  };
  for (const src of sources) visit(chunkKey(src));
  return [...seen].map((k) => manifest[k].file);
}

// One strict policy. Only the pages that hold the live demo (/demo/ and the SupportOps case) may load Turnstile (SEC-001), and only from this one origin.
const STRICT = "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'none'; base-uri 'none'";
const TURNSTILE = "default-src 'none'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src https://challenges.cloudflare.com; form-action 'none'; base-uri 'none'";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

async function page(url) {
  const meta = server.head(url);
  const route = server.route(url);
  const preloads = chunksFor(route).map((f) => `<link rel="modulepreload" href="/${f}" />`);
  const demo = /\/(demo|projects\/supportops)\/$/.test(url);
  const abs = SITE + url;
  const tags = [
    `<meta http-equiv="Content-Security-Policy" content="${demo ? TURNSTILE : STRICT}" />`,
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<link rel="canonical" href="${abs}" />`,
    `<link rel="alternate" hreflang="en" href="${SITE + meta.alternates.en}" />`,
    `<link rel="alternate" hreflang="pt-BR" href="${SITE + meta.alternates.pt}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${abs}" />`,
    `<meta property="og:image" content="${SITE}/og.png" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    ...preloads,
  ].join("\n    ");
  return template
    .replace('<html lang="en">', `<html lang="${meta.lang}">`)
    .replace("<!--head-->", tags)
    .replace("<!--app-->", await server.render(url));
}

const paths = server.allPaths();
for (const url of paths) {
  const dir = join(dist, url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), await page(url));
}
writeFileSync(join(dist, "404.html"), await page("/404.html"));
// The SPA fallback template is replaced by the home page: nothing is served without its content.
writeFileSync(join(dist, "index.html"), await page("/"));

// _headers comes from one template so the header and the per-page meta tag can never disagree. Pages allows 2000 characters per line.
const headers = readFileSync(join(root, "public/_headers.template"), "utf8").replace("{{STRICT}}", STRICT).replaceAll("{{TURNSTILE}}", TURNSTILE);
for (const line of headers.split(String.fromCharCode(10))) if (line.length > 2000) throw new Error("a _headers line is over 2000 characters");
writeFileSync(join(dist, "_headers"), headers);
rmSync(join(dist, "_headers.template"), { force: true });
const sitemap = ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">", ...paths.map((p) => `  <url><loc>${SITE}${p}</loc></url>`), "</urlset>", ""].join("\n");
writeFileSync(join(dist, "sitemap.xml"), sitemap);
writeFileSync(join(dist, "llms.txt"), server.llmsTxt(SITE));
writeFileSync(join(dist, "resume.md"), server.resumeMd());
writeFileSync(join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`prerender: ${paths.length + 1} pages written`);
