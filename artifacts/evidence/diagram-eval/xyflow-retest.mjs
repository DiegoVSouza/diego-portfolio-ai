import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const require = createRequire("file:///C:/estudo/Golpe/lab/projects/p07/package.json");
const { chromium } = require("@playwright/test");
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'";
writeFileSync("entries/t-xy2.jsx", `import React from "react"; import {createRoot} from "react-dom/client"; import {ReactFlow} from "@xyflow/react"; import "@xyflow/react/dist/style.css";
const names=["Visitor","Console","P05 API","Queue","Agents","Approval"];
const nodes=names.map((n,i)=>({id:String(i),position:{x:i*170,y:i%2*60},data:{label:n}}));
const edges=names.slice(1).map((_,i)=>({id:"e"+i,source:String(i),target:String(i+1)}));
createRoot(document.getElementById("root")).render(React.createElement(ReactFlow,{nodes,edges,fitView:true}));`);
execFileSync(process.execPath, ["node_modules/esbuild/bin/esbuild", "entries/t-xy2.jsx", "--bundle", "--minify", "--format=esm", "--outdir=site/xy2", "--loader:.css=css", "--log-level=error", "--define:process.env.NODE_ENV=\"production\""], { stdio: "pipe" });
writeFileSync("site/xy2.html", `<!doctype html><meta charset=utf-8><title>x</title><link rel=stylesheet href=/app.css><link rel=stylesheet href=/xy2/t-xy2.css><div id=root></div><script type=module src=/xy2/t-xy2.js></script>`);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = createServer((req, res) => {
  const file = join("site", req.url.split("?")[0]);
  if (!existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": types[extname(file)] ?? "text/plain", "Content-Security-Policy": CSP });
  res.end(readFileSync(file));
}).listen(44198);
const browser = await chromium.launch({ channel: "chrome" });
const tab = await browser.newPage({ viewport: { width: 1040, height: 440 } });
const log = [];
tab.on("console", (m) => log.push(`${m.type()}: ${m.text().slice(0, 140)}`));
tab.on("pageerror", (e) => log.push(`pageerror: ${String(e).slice(0, 200)}`));
tab.on("requestfailed", (r) => log.push(`failed: ${r.url()}`));
await tab.goto("http://localhost:44198/xy2.html");
await tab.waitForTimeout(2500);
console.log(JSON.stringify({
  nodes: await tab.locator(".react-flow__node").count(),
  edges: await tab.locator(".react-flow__edge").count(),
  style_attrs: await tab.evaluate(() => document.querySelectorAll("#root [style]").length),
  style_tags: await tab.evaluate(() => document.querySelectorAll("style").length),
  log: log.slice(0, 6),
}));
await tab.screenshot({ path: "xy2.png" });
await browser.close();
server.close();
process.exit(0);
