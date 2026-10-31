// PERF-001: initial JavaScript per route, as the prerendered HTML loads it (entry script + modulepreload links), gzip.
// The lazy 3D scene chunk is not part of the initial load; it has its own limit (SCENE_LIMIT_KB).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { gzipSync } from "node:zlib";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const limitKb = Number(/max_bundle_kb: (\d+)/.exec(readFileSync(join(root, "harness.yaml"), "utf8"))?.[1]);
const SCENE_LIMIT_KB = 500;
if (!limitKb) {
  console.error("budget: saas.frontend_budget.max_bundle_kb is missing from harness.yaml");
  process.exit(1);
}
const dist = join(root, "dist");
const gz = (file) => gzipSync(readFileSync(join(dist, file))).length / 1024;

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (name === "assets" || name === ".vite") return [];
    return statSync(full).isDirectory() ? htmlFiles(full) : name.endsWith(".html") ? [full] : [];
  });
}

let worst = { kb: 0, route: "" };
for (const file of htmlFiles(dist)) {
  const html = readFileSync(file, "utf8");
  const sources = new Set([...html.matchAll(/<script[^>]+src="\/([^"]+\.js)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/<link rel="modulepreload"[^>]+href="\/([^"]+\.js)"/g)) sources.add(m[1]);
  const kb = [...sources].reduce((sum, s) => sum + gz(s), 0);
  const route = file.slice(dist.length).split(sep).join("/");
  if (kb > worst.kb) worst = { kb, route };
  if (kb > limitKb) {
    console.error(`budget: ${route} loads ${kb.toFixed(1)} KB gzip of JavaScript, over ${limitKb} KB`);
    process.exit(1);
  }
}
const scene = readdirSync(join(dist, "assets")).filter((n) => /^scene-.*\.js$/.test(n)).reduce((sum, n) => sum + gz(`assets/${n}`), 0);
if (scene > SCENE_LIMIT_KB) {
  console.error(`budget: the scene chunk is ${scene.toFixed(1)} KB gzip, over ${SCENE_LIMIT_KB} KB`);
  process.exit(1);
}
console.log(`budget: PASS (worst route ${worst.route}: ${worst.kb.toFixed(1)} KB gzip of ${limitKb} KB; scene chunk ${scene.toFixed(1)} KB of ${SCENE_LIMIT_KB} KB)`);
