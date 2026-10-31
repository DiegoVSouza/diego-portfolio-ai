// Enforces the initial JavaScript budget from harness.yaml on the production build.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const limitKb = Number(/max_bundle_kb: (\d+)/.exec(readFileSync(join(root, "harness.yaml"), "utf8"))?.[1]);
if (!limitKb) {
  console.error("budget: saas.frontend_budget.max_bundle_kb is missing from harness.yaml");
  process.exit(1);
}
const assets = join(root, "dist/assets");
const scripts = readdirSync(assets).filter((name) => name.endsWith(".js"));
if (scripts.length === 0) {
  console.error("budget: no JavaScript in dist/assets; run npm run build first");
  process.exit(1);
}
const bytes = scripts.reduce((sum, name) => sum + gzipSync(readFileSync(join(assets, name))).length, 0);
const kb = bytes / 1024;
if (kb > limitKb) {
  console.error(`budget: ${kb.toFixed(1)} KB gzip exceeds ${limitKb} KB; remove a dependency or split a route`);
  process.exit(1);
}
console.log(`budget: PASS (${kb.toFixed(1)} KB gzip of ${limitKb} KB)`);
