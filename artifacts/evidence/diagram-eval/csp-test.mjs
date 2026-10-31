// cwd = diagram-eval. Renders one six-node flow per candidate in real Chrome under the site's CSP.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement as h } from "react";

const require = createRequire("file:///C:/estudo/Golpe/lab/projects/p07/package.json");
const { chromium } = require("@playwright/test");
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'";
const SITE = "site";
mkdirSync(SITE, { recursive: true });
const FLOW = "flowchart LR\n  V[Visitor] --> A[Console]\n  A --> B[P05 API]\n  B --> C[Queue]\n  C --> D[Agents]\n  D --> E[Approval]";
const NODES = ["Visitor", "Console", "P05 API", "Queue", "Agents", "Approval"];
const page = (title, body) => `<!doctype html><meta charset=utf-8><title>${title}</title><link rel=stylesheet href=/app.css>${body}`;
const bundle = (name, source) => {
  writeFileSync(`entries/t-${name}.jsx`, source);
  execFileSync(process.execPath, ["node_modules/esbuild/bin/esbuild", `entries/t-${name}.jsx`, "--bundle", "--minify", "--format=esm", "--splitting", `--outdir=${SITE}/${name}`,
    "--loader:.css=css", "--log-level=error", "--define:process.env.NODE_ENV=\"production\""], { stdio: "pipe" });
};
writeFileSync(`${SITE}/app.css`, "body{margin:0;background:#050505;color:#f2ede4;font:16px monospace}#root{width:1000px;height:400px}");

// 1 mermaid at runtime
bundle("mermaid", `import m from "mermaid"; m.initialize({startOnLoad:false}); m.render("g",${JSON.stringify(FLOW)}).then(r=>{document.getElementById("root").innerHTML=r.svg;window.done=1}).catch(e=>{window.done=2;console.error(String(e))})`);
writeFileSync(`${SITE}/mermaid.html`, page("mermaid", `<div id=root></div><script type=module src=/mermaid/t-mermaid.js></script>`));

// 2 react flow at runtime
bundle("xyflow", `import {createRoot} from "react-dom/client"; import {ReactFlow} from "@xyflow/react"; import "@xyflow/react/dist/style.css";
const names=${JSON.stringify(NODES)};
const nodes=names.map((n,i)=>({id:String(i),position:{x:i*160,y:i%2*60},data:{label:n}}));
const edges=names.slice(1).map((_,i)=>({id:"e"+i,source:String(i),target:String(i+1)}));
createRoot(document.getElementById("root")).render(<ReactFlow nodes={nodes} edges={edges} fitView/>);setTimeout(()=>window.done=1,800)`);
writeFileSync(`${SITE}/xyflow.html`, page("xyflow", `<link rel=stylesheet href=/xyflow/t-xyflow.css><div id=root></div><script type=module src=/xyflow/t-xyflow.js></script>`));

// 3 D2 rendered at build time, inlined
const { D2 } = await import("@terrastruct/d2");
const d2 = new D2();
const d2source = NODES.slice(1).map((n, i) => `"${NODES[i]}" -> "${n}"`).join("\n");
const compiled = await d2.compile(d2source, { layout: "elk" });
const d2svg = await d2.render(compiled.diagram, compiled.renderOptions);
writeFileSync(`${SITE}/d2.html`, page("d2", `<div id=root>${d2svg}</div>`));
writeFileSync(`${SITE}/d2.svg`, d2svg);
writeFileSync(`${SITE}/d2img.html`, page("d2img", `<div id=root><img src=/d2.svg width=1000 alt=flow></div>`));

// 4 ELK at build time, our React renders SVG with classes only
const ELK = (await import("elkjs/lib/elk.bundled.js")).default;
const started = performance.now();
const graph = await new ELK().layout({ id: "root", layoutOptions: { "elk.algorithm": "layered", "elk.direction": "RIGHT", "elk.spacing.nodeNode": "48", "elk.layered.spacing.nodeNodeBetweenLayers": "64", "elk.edgeRouting": "ORTHOGONAL" },
  children: NODES.map((n, i) => ({ id: String(i), width: 132, height: 56 })), edges: NODES.slice(1).map((_, i) => ({ id: "e" + i, sources: [String(i)], targets: [String(i + 1)] })) });
const layoutMs = performance.now() - started;
const path = (e) => e.sections.map((s) => `M${s.startPoint.x},${s.startPoint.y}${(s.bendPoints ?? []).map((p) => `L${p.x},${p.y}`).join("")}L${s.endPoint.x},${s.endPoint.y}`).join("");
const svg = renderToStaticMarkup(h("svg", { viewBox: `0 0 ${graph.width} ${graph.height}`, role: "img", "aria-labelledby": "t", className: "flow" }, h("title", { id: "t" }, "Live run"),
  graph.edges.map((e) => h("path", { key: e.id, d: path(e), className: "edge" })),
  graph.children.map((n, i) => h("g", { key: n.id, transform: `translate(${n.x},${n.y})`, className: "node" }, h("rect", { width: n.width, height: n.height }), h("text", { x: 66, y: 33, textAnchor: "middle" }, NODES[i])))));
writeFileSync(`${SITE}/flow.css`, ".flow{width:1000px}.edge{fill:none;stroke:#e5121f;stroke-width:3}.node rect{fill:#0c0c0c;stroke:#f2ede4;stroke-width:2}.node text{fill:#f2ede4;font:14px monospace}");
writeFileSync(`${SITE}/elk.html`, page("elk", `<link rel=stylesheet href=/flow.css><div id=root>${svg}</div>`));
console.log("elk build layout ms", layoutMs.toFixed(1), "svg bytes", svg.length, "d2 svg bytes", d2svg.length);

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  const file = join(SITE, decodeURIComponent(req.url.split("?")[0]));
  if (!existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream", "Content-Security-Policy": CSP });
  res.end(readFileSync(file));
}).listen(44199);
const browser = await chromium.launch({ channel: "chrome" });
const results = [];
for (const name of ["mermaid", "xyflow", "d2", "d2img", "elk"]) {
  const tab = await browser.newPage({ viewport: { width: 1040, height: 440 } });
  const violations = [];
  tab.on("console", (m) => { if (/Content.Security.Policy/i.test(m.text())) violations.push(m.text().slice(0, 100)); });
  const bytes = { total: 0 };
  tab.on("response", async (r) => { try { bytes.total += (await r.body()).length; } catch { /* none */ } });
  await tab.goto(`http://localhost:44199/${name}.html`);
  await tab.waitForTimeout(2500);
  const state = await tab.evaluate(() => {
    const nodes = document.querySelectorAll("svg text, .react-flow__node, foreignObject, .label").length;
    const box = document.querySelector("#root svg, #root .react-flow, #root img")?.getBoundingClientRect();
    return { nodes, width: Math.round(box?.width ?? 0), height: Math.round(box?.height ?? 0) };
  });
  await tab.screenshot({ path: `${name}.png` });
  results.push({ name, csp_violations: violations.length, first: violations[0]?.slice(0, 70) ?? "", ...state, kb_transferred: Math.round(bytes.total / 1024) });
  await tab.close();
}
await browser.close();
server.close();
console.table(results);
writeFileSync("csp.json", JSON.stringify(results, null, 2));
