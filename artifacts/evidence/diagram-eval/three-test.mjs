// Cost and CSP of a Three.js scene with the design system's post-processing. cwd = diagram-eval.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { gzipSync } from "node:zlib";

const require = createRequire("file:///C:/estudo/Golpe/lab/projects/p07/package.json");
const { chromium } = require("@playwright/test");
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'";
const SCENE = `
const renderer=new THREE.WebGLRenderer({canvas:document.getElementById("gl"),antialias:false,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(1000,400);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x050505);scene.fog=new THREE.Fog(0x050505,8,40);
const camera=new THREE.PerspectiveCamera(58,2.5,0.1,100);camera.position.z=8;
const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,3,1),new THREE.MeshStandardMaterial({color:0xe5121f}),56);
const m=new THREE.Matrix4();for(let i=0;i<56;i++){m.makeTranslation((i%14-7)*2,(i%3)-1,-(i%4)*3);mesh.setMatrixAt(i,m)}
scene.add(mesh,new THREE.AmbientLight(0xffffff,.35),new THREE.DirectionalLight(0xffffff,2.4));
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
composer.addPass(new ShaderPass({uniforms:{tDiffuse:{value:null}},vertexShader:"varying vec2 v;void main(){v=uv;gl_Position=vec4(position,1.);}",fragmentShader:"uniform sampler2D tDiffuse;varying vec2 v;void main(){vec4 c=texture2D(tDiffuse,v);gl_FragColor=c*mix(.5,1.,smoothstep(0.,.6,v.x));}"}));
let frames=0;(function loop(){composer.render();if(++frames<30)requestAnimationFrame(loop);else window.done=frames})();
`;
const imports = `import * as THREE from "three";import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer.js";import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass.js";import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass.js";`;
const entries = {
  vanilla: imports + SCENE,
  fiber: `import React from "react";import {createRoot} from "react-dom/client";import {Canvas} from "@react-three/fiber";
createRoot(document.getElementById("root")).render(React.createElement(Canvas,{style:{width:1000,height:400}},React.createElement("mesh",null,React.createElement("boxGeometry"),React.createElement("meshBasicMaterial",{color:"red"}))));setTimeout(()=>window.done=1,1500);`,
};
const sizes = {};
for (const [name, source] of Object.entries(entries)) {
  writeFileSync(`entries/s-${name}.jsx`, source);
  execFileSync(process.execPath, ["node_modules/esbuild/bin/esbuild", `entries/s-${name}.jsx`, "--bundle", "--minify", "--format=esm", `--outdir=site/s-${name}`, "--log-level=error", "--define:process.env.NODE_ENV=\"production\""], { stdio: "pipe" });
  const js = readFileSync(`site/s-${name}/s-${name}.js`);
  sizes[name] = +(gzipSync(js).length / 1024).toFixed(1);
  writeFileSync(`site/s-${name}.html`, `<!doctype html><meta charset=utf-8><title>x</title><link rel=stylesheet href=/app.css><div id=root></div><canvas id=gl></canvas><script type=module src=/s-${name}/s-${name}.js></script>`);
}
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = createServer((req, res) => {
  const file = join("site", req.url.split("?")[0]);
  if (!existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": types[extname(file)] ?? "text/plain", "Content-Security-Policy": CSP });
  res.end(readFileSync(file));
}).listen(44197);
const browser = await chromium.launch({ channel: "chrome", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const out = [];
for (const name of Object.keys(entries)) {
  const tab = await browser.newPage({ viewport: { width: 1040, height: 440 } });
  const log = [];
  tab.on("console", (m) => { if (m.type() === "error" || /Content.Security/.test(m.text())) log.push(m.text().slice(0, 130)); });
  tab.on("pageerror", (e) => log.push("pageerror " + String(e).slice(0, 130)));
  await tab.goto(`http://localhost:44197/s-${name}.html`);
  await tab.waitForFunction(() => window.done, null, { timeout: 15000 }).catch(() => log.push("timeout"));
  await tab.screenshot({ path: `s-${name}.png` });
  out.push({ name, gzip_kb: sizes[name], csp: log.filter((l) => /Security/.test(l)).length, webgl2: await tab.evaluate(() => !!document.createElement("canvas").getContext("webgl2")), log: log.filter((l) => !/404/.test(l)).slice(0, 2) });
  await tab.close();
}
await browser.close();
server.close();
console.log(JSON.stringify(out, null, 1));
writeFileSync("three.json", JSON.stringify(out, null, 2));
process.exit(0);
