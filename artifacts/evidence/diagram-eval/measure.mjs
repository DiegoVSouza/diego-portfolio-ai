// Real bundle cost of each candidate, react external, minified then gzip. cwd = diagram-eval.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const entries = {
  mermaid: `import m from "mermaid"; m.initialize({startOnLoad:false}); window.x=m;`,
  xyflow: `import {ReactFlow} from "@xyflow/react"; window.x=ReactFlow;`,
  elkjs: `import E from "elkjs/lib/elk.bundled.js"; window.x=E;`,
  dagre: `import * as d from "@dagrejs/dagre"; window.x=d;`,
  roughjs: `import r from "roughjs"; window.x=r;`,
  motion: `import {motion} from "motion/react"; window.x=motion;`,
  cytoscape: `import c from "cytoscape"; window.x=c;`,
  viz: `import * as v from "@viz-js/viz"; window.x=v;`,
  d2: `import {D2} from "@terrastruct/d2"; window.x=D2;`,
};
mkdirSync("entries", { recursive: true });
const rows = [];
for (const [name, source] of Object.entries(entries)) {
  writeFileSync(`entries/${name}.js`, source);
  const out = `out/${name}`;
  try {
    execFileSync(process.execPath, ["node_modules/esbuild/bin/esbuild", `entries/${name}.js`, "--bundle", "--minify", "--format=esm", "--splitting", `--outdir=${out}`,
      "--external:react", "--external:react-dom", "--loader:.wasm=file", "--loader:.css=empty", "--log-level=error", "--platform=browser"], { stdio: "pipe" });
    const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
    const files = walk(out);
    const js = files.filter((f) => f.endsWith(".js"));
    const gz = js.reduce((s, f) => s + gzipSync(readFileSync(f)).length, 0);
    const main = gzipSync(readFileSync(`${out}/${name}.js`)).length;
    const wasm = files.filter((f) => f.endsWith(".wasm")).reduce((s, f) => s + gzipSync(readFileSync(f)).length, 0);
    rows.push({ name, initial_kb: +(main / 1024).toFixed(1), all_js_kb: +(gz / 1024).toFixed(1), wasm_kb: +(wasm / 1024).toFixed(1), chunks: js.length });
  } catch (error) {
    rows.push({ name, error: String(error.stderr ?? error).slice(0, 200) });
  }
}
console.table(rows);
writeFileSync("sizes.json", JSON.stringify(rows, null, 2));
