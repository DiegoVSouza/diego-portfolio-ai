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
import { CAR_SIZE, carKindOf, r7Wheels, s64Wheels } from "../scene/car-wheels";
import { type Shot, type ShotPatch, patchShot, shippedShot, sideOf } from "../scene/layout";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const STORE = "atelier-shots";

/* ------------------------------------------------------------------ tabs */
const tabs = { models: $("tab-models"), camera: $("tab-camera"), world: $("tab-world") };
const panels: Record<keyof typeof tabs, string> = { models: "models", camera: "camera", world: "world-panel" };
function showTab(which: keyof typeof tabs): void {
  for (const [name, button] of Object.entries(tabs)) {
    button.classList.toggle("on", name === which);
    $(panels[name as keyof typeof tabs]).hidden = name !== which;
  }
  $("view").hidden = which !== "models";
  $("preview").hidden = which !== "camera";
  $("world").hidden = which !== "world";
  if (which === "camera") openPreview();
  if (which === "world") openWorld();
}
tabs.models.onclick = () => showTab("models");
tabs.camera.onclick = () => showTab("camera");
tabs.world.onclick = () => showTab("world");

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
  let root: THREE.Object3D = gltf.scene;
  const kind = carKindOf(name);
  if (kind) {
    // The car GLBs are bodies with empty arches. Show them the way the scene does: front +Z, centred, 7.4 long, with the scene's wheels.
    const body = gltf.scene;
    body.rotation.y = -Math.PI / 2;
    const car = new THREE.Group();
    car.add(body);
    car.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(car);
    const centre = box.getCenter(new THREE.Vector3());
    const extent = box.getSize(new THREE.Vector3());
    const k = CAR_SIZE / Math.max(extent.x, extent.y, extent.z);
    car.scale.setScalar(k);
    car.position.copy(centre).multiplyScalar(-k);
    const tyre = new THREE.Color(0x2e2e2e);
    const hub = new THREE.Color(0xa0a0a0);
    const wheels = new THREE.Mesh(kind === "s64" ? s64Wheels(tyre, hub) : r7Wheels(box, tyre, hub), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }));
    const group = new THREE.Group();
    group.add(car, wheels);
    root = group;
  }
  const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) originals.set(o as THREE.Mesh, (o as THREE.Mesh).material);
  });
  root.userData.originals = originals;
  // The scene scales every model to a target size (cars 7.4, trucks 9...): show it at the same size to judge it in context.
  if (state.fit > 0 && !kind) {
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

/* ----------------------------------------------------------------- world */
/** What the editor inside the scene iframe offers (src/scene/editor.ts). Plain data only. */
interface WorldRow { id: string; x: number; z: number; h: number; edited: boolean; hidden: boolean }
interface WorldProp { id: string; model: string; x: number; y: number; z: number; ry: number; scale: number }
interface WorldEditorApi {
  list(): { towers: WorldRow[]; lamps: WorldRow[]; props: WorldProp[] };
  selected(): { kind: "tower" | "lamp" | "prop"; id: string; item?: { hide?: boolean; dx?: number; dz?: number; dry?: number; hs?: number }; prop?: WorldProp } | null;
  select(kind: "tower" | "lamp" | "prop", id: string | null): void;
  focus(): void;
  mode(mode: "translate" | "rotate"): void;
  proxies(visible: boolean): void;
  patch(values: Record<string, number>): void;
  toggleHide(): void;
  reset(): void;
  addProp(model: string): Promise<void>;
  removeProp(): void;
  models(): string[];
  json(): string;
  save(): Promise<string>;
}
let worldKind: "tower" | "lamp" | "prop" = "tower";
let worldFilter = "";
const editorOf = (): WorldEditorApi | null => ($<HTMLIFrameElement>("world").contentWindow as unknown as { __worldEditor?: WorldEditorApi } | null)?.__worldEditor ?? null;
const DEG = 180 / Math.PI;

function openWorld(): void {
  const frameEl = $<HTMLIFrameElement>("world");
  if (frameEl.src) return;
  frameEl.onload = () => void attachWorld();
  frameEl.src = "/?edit=1";
}
async function attachWorld(): Promise<void> {
  for (let tries = 0; tries < 300 && !editorOf(); tries += 1) await new Promise((r) => setTimeout(r, 100));
  const win = $<HTMLIFrameElement>("world").contentWindow;
  if (!win || !editorOf()) {
    $("world-status").textContent = "the editor did not start (is this the dev server?)";
    return;
  }
  win.addEventListener("editor-change", drawWorld);
  $("world-status").textContent = "ready: click a box in the scene, or pick one in the list";
  drawWorld();
}

function buildWorldTab(): void {
  $("world-panel").innerHTML = `
    <fieldset><legend>Pick</legend>
      <div class="row"><button data-wk="tower" class="on">towers</button><button data-wk="lamp">lamps</button><button data-wk="prop">props</button></div>
      <input id="world-filter" type="text" placeholder="filter by id, e.g. t2. or l14" />
      <div id="world-list"></div>
    </fieldset>
    <fieldset><legend>Selected</legend>
      <div id="world-sel" style="color:var(--dim)">nothing</div>
      <div class="row"><button id="w-move" class="on">move (w)</button><button id="w-turn">turn (e)</button><button id="w-fly">fly to</button></div>
      <div id="world-fields"></div>
      <div class="row"><button id="w-hide">hide / show</button><button id="w-reset">reset</button><button id="w-del">delete prop</button></div>
    </fieldset>
    <fieldset><legend>Add a prop</legend>
      <select id="w-model"></select>
      <button id="w-add">add at the camera target</button>
    </fieldset>
    <fieldset><legend>File</legend>
      <div class="row"><button id="w-boxes" class="on">boxes</button><button id="w-save">save to world-edits.json</button><button id="w-copy">copy JSON</button></div>
      <div id="world-status" style="color:var(--dim)">starting the editor...</div>
      <div style="color:var(--dim)">Save writes src/scene/world-edits.json and reloads the scene so the real towers move. The file is versioned and ships in the build. Walkthrough: docs/atelier/GUIA-MUNDO.pt-BR.md.</div>
    </fieldset>`;
  document.querySelectorAll<HTMLButtonElement>("[data-wk]").forEach((b) => {
    b.onclick = () => {
      worldKind = b.dataset.wk as typeof worldKind;
      document.querySelectorAll("[data-wk]").forEach((x) => x.classList.toggle("on", x === b));
      drawWorld();
    };
  });
  $<HTMLInputElement>("world-filter").oninput = (e) => {
    worldFilter = (e.target as HTMLInputElement).value.trim();
    drawWorld();
  };
  const withEditor = (fn: (api: WorldEditorApi) => unknown) => async () => {
    const api = editorOf();
    if (!api) return;
    try {
      await fn(api);
    } catch (error) {
      $("world-status").textContent = String(error);
    }
    drawWorld();
  };
  $("w-move").onclick = withEditor((api) => {
    api.mode("translate");
    $("w-move").classList.add("on");
    $("w-turn").classList.remove("on");
  });
  $("w-turn").onclick = withEditor((api) => {
    api.mode("rotate");
    $("w-turn").classList.add("on");
    $("w-move").classList.remove("on");
  });
  $("w-fly").onclick = withEditor((api) => api.focus());
  $("w-hide").onclick = withEditor((api) => api.toggleHide());
  $("w-reset").onclick = withEditor((api) => api.reset());
  $("w-del").onclick = withEditor((api) => api.removeProp());
  $("w-add").onclick = withEditor((api) => api.addProp($<HTMLSelectElement>("w-model").value));
  $("w-boxes").onclick = withEditor((api) => {
    $("w-boxes").classList.toggle("on");
    api.proxies($("w-boxes").classList.contains("on"));
  });
  $("w-save").onclick = withEditor(async (api) => {
    await api.save();
    $("world-status").textContent = "saved; the scene reloads";
  });
  $("w-copy").onclick = withEditor((api) => navigator.clipboard.writeText(api.json()));
}

const numberField = (key: string, label: string, value: number, step: number): string =>
  `<label>${label}<output>${value}</output><input type="range" data-wf="${key}" min="${value - 100 * step}" max="${value + 100 * step}" step="${step}" value="${value}" /></label>`;

function drawWorld(): void {
  const api = editorOf();
  if (!api) return;
  const data = api.list();
  const sel = api.selected();
  const rows: { id: string; text: string; cls: string }[] =
    worldKind === "prop"
      ? data.props.map((p) => ({ id: p.id, text: `${p.id}  ${p.model}`, cls: "edited" }))
      : (worldKind === "tower" ? data.towers : data.lamps).map((r) => ({ id: r.id, text: `${r.id}  (${r.x}, ${r.z}) h ${r.h}`, cls: r.hidden ? "hidden" : r.edited ? "edited" : "" }));
  $("world-list").innerHTML = rows
    .filter((r) => r.id.includes(worldFilter))
    .slice(0, 400)
    .map((r) => `<button data-id="${r.id}" class="${r.cls} ${sel?.kind === worldKind && sel.id === r.id ? "sel" : ""}">${r.text}</button>`)
    .join("");
  document.querySelectorAll<HTMLButtonElement>("#world-list button").forEach((b) => {
    b.onclick = () => {
      api.select(worldKind, b.dataset.id!);
      api.focus();
    };
  });
  if (!$("w-model").children.length) $("w-model").innerHTML = api.models().map((m) => `<option>${m}</option>`).join("");
  $("w-del").hidden = sel?.kind !== "prop";
  $("w-hide").hidden = !sel || sel.kind === "prop";
  $("w-reset").hidden = !sel || sel.kind === "prop";
  if (!sel) {
    $("world-sel").textContent = "nothing";
    $("world-fields").innerHTML = "";
    return;
  }
  $("world-sel").textContent = `${sel.kind} ${sel.id}${sel.item?.hide ? " (hidden)" : ""}`;
  if (document.activeElement?.matches("#world-fields input")) return;
  const fields =
    sel.kind === "prop" && sel.prop
      ? [numberField("x", "x", sel.prop.x, 0.5), numberField("y", "y (height)", sel.prop.y, 0.1), numberField("z", "z", sel.prop.z, 0.5), numberField("ry", "turn (deg)", Math.round(sel.prop.ry * DEG), 1), numberField("scale", "scale", sel.prop.scale, 0.05)]
      : [numberField("dx", "shift x", sel.item?.dx ?? 0, 0.5), numberField("dz", "shift z", sel.item?.dz ?? 0, 0.5), numberField("dry", "extra turn (deg)", Math.round((sel.item?.dry ?? 0) * DEG), 1), ...(sel.kind === "tower" ? [numberField("hs", "height x", sel.item?.hs ?? 1, 0.05)] : [])];
  $("world-fields").innerHTML = fields.join("");
  document.querySelectorAll<HTMLInputElement>("#world-fields input").forEach((input) => {
    input.oninput = () => {
      const key = input.dataset.wf!;
      const value = Number(input.value);
      input.previousElementSibling!.textContent = input.value;
      api.patch({ [key]: key === "ry" || key === "dry" ? value / DEG : value });
    };
    // Redrawing on every input would rebuild the slider under the pointer: redraw when the pointer is released.
    input.onchange = drawWorld;
  });
}

buildModelsTab();
buildCameraTab();
buildWorldTab();
resize();
