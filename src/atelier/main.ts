/**
 * The atelier page (dev only: `npm run dev`, then /atelier.html). Two tools in one page:
 *  - Models: look at a GLB, see its numbers and the problems the site rules find (same inspector as `atelier.mjs inspect`).
 *  - Camera: edit one stop's shot with sliders and see it in the real scene.
 * Nothing here ships: atelier.html is not an entry of the production build.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { inspect, judge, parseGlb } from "../../tools/atelier/inspect-core.mjs";
import { stops } from "../content/districts";
import { type Shot, type ShotPatch, patchShot, shippedShot, sideOf } from "../scene/layout";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const STORE = "atelier-shots";

/* ------------------------------------------------------------------ tabs */
const tabs = { models: $("tab-models"), camera: $("tab-camera") };
function showTab(which: "models" | "camera"): void {
  for (const [name, button] of Object.entries(tabs)) {
    button.classList.toggle("on", name === which);
    $(name).hidden = name !== which;
  }
  $("view").hidden = which !== "models";
  $("preview").hidden = which !== "camera";
  if (which === "camera") openPreview();
}
tabs.models.onclick = () => showTab("models");
tabs.camera.onclick = () => showTab("camera");

/* ---------------------------------------------------------------- models */
const modelUrls = import.meta.glob("../../assets/game/models/*.glb", { query: "?url", import: "default", eager: true }) as Record<string, string>;
const canvas = $<HTMLCanvasElement>("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0c0c);
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 2000);
camera.position.set(6, 4, 8);
const controls = new OrbitControls(camera, canvas);
scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 1.4));
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(5, 10, 6);
scene.add(sun);
const grid = new THREE.GridHelper(40, 40, 0xe4122a, 0x333333);
scene.add(grid, new THREE.AxesHelper(2));
const stage = new THREE.Group();
scene.add(stage);

type Mode = "original" | "palette" | "wireframe" | "normals";
const state = { mode: "original" as Mode, bounds: true, fit: 0, name: "", turntable: false, root: null as THREE.Object3D | null, box: null as THREE.Box3Helper | null };

const paletteMaterial = (): THREE.MeshStandardMaterial => {
  // Same idea as the scene's paletteMat: mix ink and paper by the baked lightness, then to red by the accent.
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.55, metalness: 0.25 });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nconst vec3 uInk = vec3(0.05);\nconst vec3 uPaper = vec3(0.94, 0.91, 0.86);\nconst vec3 uRed = vec3(0.9, 0.07, 0.16);")
      .replace("#include <color_fragment>", "diffuseColor.rgb = mix(mix(uInk, uPaper, vColor.r), uRed, vColor.g);");
  };
  return m;
};

function applyMode(): void {
  const originals = (state.root?.userData.originals ?? new Map()) as Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
  state.root?.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const own = originals.get(mesh) ?? mesh.material;
    if (state.mode === "original") mesh.material = own;
    else if (state.mode === "wireframe") mesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    else if (state.mode === "normals") mesh.material = new THREE.MeshNormalMaterial({ flatShading: true });
    else mesh.material = mesh.geometry.getAttribute("color") ? paletteMaterial() : own;
  });
}

function frame(): void {
  if (!state.root) return;
  const box = new THREE.Box3().setFromObject(state.root);
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) || 1;
  controls.target.set(0, size.y / 2, 0);
  camera.position.set(radius * 1.4, radius * 0.9 + size.y / 2, radius * 1.8);
  camera.near = radius / 100;
  camera.far = radius * 100;
  camera.updateProjectionMatrix();
  controls.update();
}

async function show(name: string, bytes: ArrayBuffer): Promise<void> {
  state.name = name;
  if (state.root) stage.remove(state.root);
  if (state.box) scene.remove(state.box);
  const gltf = await new GLTFLoader().parseAsync(bytes, "");
  const root = gltf.scene;
  const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) originals.set(o as THREE.Mesh, (o as THREE.Mesh).material);
  });
  root.userData.originals = originals;
  // The scene scales every model to a target size (cars 7.4, trucks 9...): show it at the same size to judge it in context.
  if (state.fit > 0) {
    const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    root.scale.multiplyScalar(state.fit / Math.max(size.x, size.y, size.z, 1e-6));
  }
  stage.add(root);
  state.root = root;
  state.box = new THREE.Box3Helper(new THREE.Box3().setFromObject(root), 0xffcc00);
  state.box.visible = state.bounds;
  scene.add(state.box);
  applyMode();
  frame();
  const report = inspect(parseGlb(new Uint8Array(bytes)).doc);
  const problems = judge(report);
  $("info").textContent = [
    `${name}`,
    `${report.triangles} triangles, ${report.vertices} vertices`,
    `${report.bounds?.size.map((v: number) => v.toFixed(2)).join(" x ")} (file units; on screen ${state.fit || "as is"})`,
    `${report.materials} materials, ${report.textures} textures, ${report.animations.length} animations`,
    `attributes: ${report.attributes.join(", ")}`,
    problems.length ? "" : "no problems found",
  ].join("\n");
  $("problems").textContent = problems.map((p: string) => `! ${p}`).join("\n");
}

async function load(url: string, name: string): Promise<void> {
  await show(name, await (await fetch(url)).arrayBuffer());
}

function buildModelsTab(): void {
  const names = Object.keys(modelUrls).sort();
  $("models").innerHTML = `
    <fieldset><legend>Model</legend>
      <select id="pick">${names.map((n) => `<option value="${n}">${n.split("/").pop()}</option>`).join("")}</select>
      <input id="file" type="file" accept=".glb" />
      <div class="muted" style="color:var(--dim)">or drop an improved GLB (for example from .cache/atelier-out)</div>
    </fieldset>
    <fieldset><legend>Look</legend>
      <div class="row">
        <button data-mode="original" class="on">original</button><button data-mode="palette">palette</button>
        <button data-mode="wireframe">wire</button><button data-mode="normals">normals</button>
      </div>
      <label>fit longest side to<input id="fit" type="text" value="0" /></label>
      <div class="row"><button id="bounds" class="on">bounds</button><button id="turn">turntable</button><button id="refit">frame</button></div>
    </fieldset>
    <pre id="info"></pre><pre id="problems" class="bad"></pre>`;
  const pick = $<HTMLSelectElement>("pick");
  pick.onchange = () => void load(modelUrls[pick.value]!, pick.value.split("/").pop()!);
  $<HTMLInputElement>("file").onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) await show(file.name, await file.arrayBuffer());
  };
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
    button.onclick = () => {
      state.mode = button.dataset.mode as Mode;
      document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("on", b === button));
      applyMode();
    };
  }
  $<HTMLInputElement>("fit").onchange = (e) => {
    state.fit = Number((e.target as HTMLInputElement).value) || 0;
    pick.onchange?.(new Event("change"));
  };
  $("bounds").onclick = () => {
    state.bounds = !state.bounds;
    $("bounds").classList.toggle("on", state.bounds);
    if (state.box) state.box.visible = state.bounds;
  };
  $("turn").onclick = () => {
    state.turntable = !state.turntable;
    $("turn").classList.toggle("on", state.turntable);
  };
  $("refit").onclick = frame;
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", async (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file?.name.toLowerCase().endsWith(".glb")) await show(file.name, await file.arrayBuffer());
  });
  if (names[0]) void load(modelUrls[names[0]]!, names[0].split("/").pop()!);
}

function resize(): void {
  const host = canvas.parentElement!;
  renderer.setSize(host.clientWidth, host.clientHeight, false);
  camera.aspect = host.clientWidth / Math.max(1, host.clientHeight);
  camera.updateProjectionMatrix();
  const scale = Math.min(1, host.clientWidth / 1280, host.clientHeight / 800);
  $("preview").style.transform = `scale(${scale})`;
}
window.addEventListener("resize", resize);
renderer.setAnimationLoop(() => {
  if (!canvas.hidden) {
    if (state.turntable && state.root) state.root.rotation.y += 0.01;
    controls.update();
    renderer.render(scene, camera);
  }
});

/* ---------------------------------------------------------------- camera */
type Field = { path: "cam.ahead" | "cam.lat" | "cam.h" | "board.ahead" | "board.lat" | "board.bottom" | "scale" | "aim"; label: string; min: number; max: number; step: number };
const FIELDS: Field[] = [
  { path: "cam.ahead", label: "camera ahead (stops)", min: -1, max: 1.5, step: 0.01 },
  { path: "cam.lat", label: "camera lateral", min: -90, max: 90, step: 0.5 },
  { path: "cam.h", label: "camera height", min: 0.5, max: 60, step: 0.5 },
  { path: "board.ahead", label: "board ahead (stops)", min: -1, max: 1.5, step: 0.01 },
  { path: "board.lat", label: "board lateral", min: -120, max: 120, step: 0.5 },
  { path: "board.bottom", label: "board bottom", min: 0, max: 45, step: 0.5 },
  { path: "scale", label: "board scale", min: 0.3, max: 2.2, step: 0.01 },
  { path: "aim", label: "aim height (0 = board middle)", min: 0, max: 60, step: 0.5 },
];

let patches: Record<string, ShotPatch> = {};
try {
  patches = JSON.parse(localStorage.getItem(STORE) ?? "{}") as Record<string, ShotPatch>;
} catch {
  patches = {};
}
let current = 0;

/** The shot of stop k as a stop on the right of the avenue sees it (lateral values un-mirrored). */
function working(k: number): Shot {
  const side = sideOf(k);
  const shot = patchShot(shippedShot(k), patches[String(k)], side);
  return { ...shot, cam: { ...shot.cam, lat: shot.cam.lat * side }, board: { ...shot.board, lat: shot.board.lat * side } };
}
const read = (shot: Shot, path: Field["path"]): number => (path === "scale" ? shot.scale : path === "aim" ? shot.aim ?? 0 : path.startsWith("cam.") ? shot.cam[path.slice(4) as keyof Shot["cam"]] : shot.board[path.slice(6) as keyof Shot["board"]]);

function record(k: number, path: Field["path"], value: number): void {
  const patch: ShotPatch = patches[String(k)] ?? {};
  if (path === "scale") patch.scale = value;
  else if (path === "aim") patch.aim = value === 0 ? null : value;
  else if (path.startsWith("cam.")) patch.cam = { ...patch.cam, [path.slice(4)]: value };
  else patch.board = { ...patch.board, [path.slice(6)]: value };
  patches[String(k)] = patch;
  output();
}
function output(): void {
  $<HTMLTextAreaElement>("patch-out").value = JSON.stringify(patches, null, 2);
}

function buildCameraTab(): void {
  const options = stops.map((s, i) => `<option value="${i}">${i + 1}. ${s.id} (${shippedShot(i).kind}, side ${sideOf(i) > 0 ? "right" : "left"})</option>`).join("");
  $("camera").innerHTML = `
    <fieldset><legend>Stop</legend>
      <select id="stop">${options}</select>
      <div class="row"><button id="apply">apply and reload preview</button><button id="reset-stop">reset stop</button><button id="reset-all">reset all</button></div>
    </fieldset>
    <fieldset id="fields"><legend>Shot (written for a stop on the right; mirrored automatically)</legend></fieldset>
    <fieldset><legend>Patches (JSON)</legend><textarea id="patch-out" readonly></textarea>
      <div class="row"><button id="copy">copy JSON</button></div>
      <div style="color:var(--dim)">Patches work in dev only. To keep them, copy the numbers into baseShot() in src/scene/layout.ts (docs/atelier/PLAYBOOK.md).</div>
    </fieldset>`;
  const draw = (): void => {
    const shot = working(current);
    $("fields").innerHTML = `<legend>Shot (written for a stop on the right; mirrored automatically)</legend>${FIELDS.map((f) => {
      const v = read(shot, f.path);
      return `<label>${f.label}<output id="o-${f.path}">${v}</output><input type="range" data-path="${f.path}" min="${f.min}" max="${f.max}" step="${f.step}" value="${v}" /></label>`;
    }).join("")}`;
    for (const input of document.querySelectorAll<HTMLInputElement>("#fields input")) {
      input.oninput = () => {
        $(`o-${input.dataset.path}`).textContent = input.value;
        record(current, input.dataset.path as Field["path"], Number(input.value));
      };
    }
  };
  $<HTMLSelectElement>("stop").onchange = (e) => {
    current = Number((e.target as HTMLSelectElement).value);
    draw();
    goto(current);
  };
  $("apply").onclick = () => {
    localStorage.setItem(STORE, JSON.stringify(patches));
    openPreview(true);
  };
  $("reset-stop").onclick = () => {
    delete patches[String(current)];
    localStorage.setItem(STORE, JSON.stringify(patches));
    draw();
    output();
    openPreview(true);
  };
  $("reset-all").onclick = () => {
    patches = {};
    localStorage.removeItem(STORE);
    draw();
    output();
    openPreview(true);
  };
  $("copy").onclick = () => void navigator.clipboard.writeText($<HTMLTextAreaElement>("patch-out").value);
  draw();
  output();
}

/** The real scene in an iframe: reload it so it reads the saved patches, then jump to the stop the way the menu does (instant cut). */
function openPreview(reload = false): void {
  const frameEl = $<HTMLIFrameElement>("preview");
  if (!frameEl.src || reload) frameEl.src = "/";
  frameEl.onload = () => void goto(current);
}
async function goto(k: number): Promise<void> {
  const win = $<HTMLIFrameElement>("preview").contentWindow;
  if (!win) return;
  for (let tries = 0; tries < 200; tries += 1) {
    const canvasEl = win.document.querySelector<HTMLCanvasElement>("canvas.scene");
    if (canvasEl?.dataset.scene === "3d") break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const el = win.document.querySelectorAll<HTMLElement>("[data-stop]")[k];
  const station = Number(el?.dataset.stationY);
  if (!Number.isFinite(station)) return;
  win.scrollTo({ top: Math.max(0, station - win.innerHeight / 2), behavior: "instant" });
  win.dispatchEvent(new Event("scene-cut"));
}

buildModelsTab();
buildCameraTab();
resize();
