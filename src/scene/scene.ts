/**
 * Level 2 background: a night city you travel by scrolling. The camera rides a rail through six districts; at each stop the
 * district's projects float beside the avenue and take the colour, and between stops the camera flies, swinging, banking and
 * widening the lens with speed. It is a lazy chunk: the page never depends on it, and any failure leaves the level 1 background.
 */
import * as THREE from "three";
import { V3, rng } from "./geometry";
import { createPost } from "./post";
import { createQuality, type Quality } from "./quality";
import { createFrameScheduler } from "./loop";
import { flightMs } from "./layout";
import { createRail } from "./rail";
import { MAX_TURN_RATE, turnToward } from "./turn";
import { readPalette } from "./tokens";
import { buildWorld } from "./world";

export type { Quality } from "./quality";
export type SceneMode = "3d" | "3d-static";

export interface SceneOptions {
  /** One entry per stop (one per card), in journey order. `title` and `tag` are painted on the stop's billboard. */
  stops: { id: string; district: number; title: string; tag: string; wide: boolean }[];
  districtCount: number;
  mode: SceneMode;
  /** The line over the arrival gate. */
  headline: string;
  /** Half-tone screen pass (the identity of the design system). On by default. */
  halftone?: boolean;
  /** Case pages: hold the camera at this stop. Nothing moves and the page does not scroll the scene. */
  focus?: number;
  /** Real models, served by the site (Kenney, Quaternius and the owner's packs: see docs/harness/assets-pipeline.md). */
  models: { truck: string; moto: string; buildings?: string[]; cars?: string[]; station?: string; trains?: string[] };
  onActive?: (index: number) => void;
  onQuality?: (scale: number) => void;
  /** Called when WebGL is lost or the loop throws. The host then falls back to level 1. */
  onFail?: () => void;
}

export interface SceneController {
  dispose(): void;
  setQuality(q: Quality): void;
  setMotion(on: boolean): void;
  setHalftone(on: boolean): void;
  /** Fires one finite event per finished run step (used by /demo/). Driven only by real run data. */
  pulse(): void;
}

/** The card's size in CSS pixels while it hangs in the city. Keep in step with `.stop-card` in src/styles/site.css and BOARD_RATIO in world.ts. */
const CARD_W = 640;
const CARD_H = 460;
const SETTLE_MS = 140;
/** Fraction of a leg the camera rests at each end: the stop is a place, not a point. */
const DWELL = 0.12;
/** Swing between stops: sideways shift on the avenue (units), pan (radians) and bank (radians). All are zero at a stop. */
const SWING_SHIFT = 2;
const SWING_PAN = 0.4;
const BANK = 0.28;
const smooth = (x: number) => x * x * (3 - 2 * x);

export async function start(canvas: HTMLCanvasElement, options: SceneOptions): Promise<SceneController> {
  const p = readPalette();
  const count = Math.max(2, options.stops.length);
  const fixed = options.focus !== undefined;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor(p.ink, 1);
  // The composer renders several passes per frame; count draw calls across all of them, reset once per frame.
  renderer.info.autoReset = false;
  const scene = new THREE.Scene();
  scene.background = p.ink;
  scene.fog = new THREE.Fog(p.ink, 70, 300);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.5, 420);
  const trafficCanvas = document.createElement("canvas");
  trafficCanvas.className = "scene-traffic";
  trafficCanvas.setAttribute("aria-hidden", "true");
  canvas.insertAdjacentElement("afterend", trafficCanvas);
  const trafficRenderer = new THREE.WebGLRenderer({ canvas: trafficCanvas, alpha: true, antialias: false });
  trafficRenderer.setClearColor(0x000000, 0);
  const trafficPlane = new THREE.Plane();
  trafficRenderer.clippingPlanes = [trafficPlane];
  const rail = createRail(count);
  // The menu flies each leg for as long as the leg is long (src/site/DistrictMenu.tsx reads this).
  document.documentElement.dataset.legMs = rail.legLengths.map(flightMs).join(",");

  // Three lights at most: a flat fill, one key, and a red point that travels with the camera.
  const ambient = new THREE.AmbientLight(new THREE.Color().setScalar(1), 0.4);
  ambient.layers.enable(1);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(new THREE.Color().setScalar(1), 2.2);
  key.position.set(-30, 60, 40);
  key.layers.enable(1);
  scene.add(key);
  const redLight = new THREE.PointLight(p.red, 400, 90, 2);
  redLight.layers.enable(1);
  scene.add(redLight);

  const rnd = rng(11);

  const projected = V3(0, 0, 0);
  const cards: (HTMLElement | null)[] = [];
  /** The last value written to each custom property of each card: a write that changes nothing still costs a style recalculation. */
  const written = new Map<HTMLElement, Record<string, string>>();
  const put = (el: HTMLElement, name: string, value: string) => {
    let known = written.get(el);
    if (!known) written.set(el, (known = {}));
    if (known[name] === value) return;
    known[name] = value;
    el.style.setProperty(name, value);
  };
  const cardWidth: number[] = [];
  const cardHeight: number[] = [];

  // State.
  let motion = options.mode === "3d" && !fixed;
  let time = 0;
  let cCur = 0; // where the camera is on the rail, in stops
  let vel = 0; // stops per second, smoothed
  let fov = 58;
  let active = -1;
  let width = 0;
  let height = 0;
  let centers: number[] = [];
  let last = performance.now();
  let settleTimer = 0;
  let glitch = 0;
  let shake = 0;
  let pxT = 0;
  let pyT = 0;
  let px = 0;
  let py = 0;
  let dead = false;
  let dirty = true;
  let firstDraw = true;

  const refreshOrigin = () => {
    // SCENE-003: report how many instances still sit at the origin (the known stacking bug). It must be zero.
    let n = 0;
    const m = new THREE.Matrix4();
    const v = new THREE.Vector3();
    scene.traverse((o) => {
      const mesh = o as THREE.InstancedMesh;
      if (!mesh.isInstancedMesh) return;
      for (let i = 0; i < mesh.count; i += 1) {
        mesh.getMatrixAt(i, m);
        v.setFromMatrixPosition(m);
        if (v.lengthSq() < 1e-6) n += 1;
      }
    });
    canvas.dataset.atOrigin = String(n);
  };

  // Models arrive after the city is built; one that comes first waits until `world` exists.
  let ready = false;
  let modelsWaiting = false;
  const modelsLoaded = () => {
    world.place(time, !motion);
    canvas.dataset.landmarks = String(world.landmarks);
    canvas.dataset.vehicleKinds = String(world.vehicleKinds());
    canvas.dataset.stations = String(world.stations());
    canvas.dataset.train = world.trainKind();
    refreshOrigin();
    dirty = true;
    schedule();
  };
  const world = await buildWorld({
    scene,
    p,
    rnd,
    rail,
    stops: options.stops,
    districtCount: options.districtCount,
    headline: options.headline,
    models: options.models,
    onModels: () => {
      if (ready) modelsLoaded();
      else modelsWaiting = true;
    },
  });
  canvas.dataset.landmarks = String(world.landmarks);
  // Development-only inventory: the audit records actual world-space instance bounds, not guessed layout values.
  if (import.meta.env.DEV) {
    (window as unknown as { __worldAudit?: () => unknown }).__worldAudit = () => {
      scene.updateMatrixWorld(true);
      const objects: unknown[] = [];
      const instance = new THREE.Matrix4();
      const worldMatrix = new THREE.Matrix4();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh || !mesh.geometry) return;
        mesh.geometry.computeBoundingBox();
        const box = mesh.geometry.boundingBox;
        if (!box) return;
        const instanced = mesh as THREE.InstancedMesh;
        const bounds = [];
        for (let i = 0; i < (instanced.isInstancedMesh ? instanced.count : 1); i += 1) {
          if (instanced.isInstancedMesh) {
            instanced.getMatrixAt(i, instance);
            worldMatrix.multiplyMatrices(mesh.matrixWorld, instance);
          } else worldMatrix.copy(mesh.matrixWorld);
          const b = box.clone().applyMatrix4(worldMatrix);
          bounds.push({ min: b.min.toArray(), max: b.max.toArray(), matrix: worldMatrix.toArray() });
        }
        objects.push({ name: mesh.name || mesh.parent?.name || "unnamed", geometry: mesh.geometry.type, visible: mesh.visible, layers: mesh.layers.mask, localBounds: { min: box.min.toArray(), max: box.max.toArray() }, bounds });
      });
      const poses = Array.from({ length: count }, (_, k) => {
        const position = V3(0, 0, 0);
        const look = V3(0, 0, 0);
        const board = Array.from({ length: 4 }, () => V3(0, 0, 0));
        rail.pose(k, position, look);
        world.boardCorners(k, board);
        return { stop: k, position: position.toArray(), look: look.toArray(), board: board.map((v) => v.toArray()) };
      });
      const path = Array.from({ length: (count - 1) * 20 + 1 }, (_, i) => {
        const c = i / 20;
        const position = V3(0, 0, 0);
        const look = V3(0, 0, 0);
        rail.pose(c, position, look);
        return { c, position: position.toArray(), look: look.toArray() };
      });
      return { railLength: rail.length, roadStart: rail.frameAt(0).p.toArray(), roadEnd: rail.frameAt(1).p.toArray(), camera: camera.position.toArray(), cameraNear: camera.near, cameraFar: camera.far, poses, path, footprints: world.auditFootprints(), boxes: world.auditBoxes(), objects };
    };
  }
  // Development-only: every mesh's triangles in world space (instanced meshes expanded), for the mesh-level audit in tools/world-direction-*.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__worldTriangles = (skipInstanced: boolean) => {
      scene.updateMatrixWorld(true);
      const out: { id: number; name: string; parent: string; instance: number; visible: boolean; positions: number[]; index: number[] | null }[] = [];
      const instance = new THREE.Matrix4();
      const matrix = new THREE.Matrix4();
      const point = V3(0, 0, 0);
      let id = 0;
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh || !mesh.geometry) return;
        const instanced = mesh as THREE.InstancedMesh;
        if (instanced.isInstancedMesh && skipInstanced) return;
        const position = mesh.geometry.getAttribute("position");
        const index = mesh.geometry.getIndex();
        const count = instanced.isInstancedMesh ? instanced.count : 1;
        for (let i = 0; i < count; i += 1) {
          if (instanced.isInstancedMesh) {
            instanced.getMatrixAt(i, instance);
            matrix.multiplyMatrices(mesh.matrixWorld, instance);
          } else matrix.copy(mesh.matrixWorld);
          const positions: number[] = [];
          for (let v = 0; v < position.count; v += 1) {
            point.fromBufferAttribute(position, v).applyMatrix4(matrix);
            positions.push(Math.round(point.x * 1000) / 1000, Math.round(point.y * 1000) / 1000, Math.round(point.z * 1000) / 1000);
          }
          out.push({ id: id++, name: mesh.name || "unnamed", parent: mesh.parent?.name ?? "", instance: i, visible: mesh.visible, positions, index: index ? Array.from(index.array) : null });
        }
      });
      return out;
    };
  }
  // Development-only: from each stop's camera, rays to nine points of its board; a hit before the board means something stands in front of the card.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__worldSight = () => {
      scene.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      const origin = V3(0, 0, 0);
      const look = V3(0, 0, 0);
      const corners = Array.from({ length: 4 }, () => V3(0, 0, 0));
      const report: { stop: number; blocked: { point: string; by: string; at: number; of: number }[] }[] = [];
      for (let k = 0; k < count; k += 1) {
        rail.pose(k, origin, look);
        world.boardCorners(k, corners);
        const centre = corners[0]!.clone().add(corners[2]!).multiplyScalar(0.5);
        const targets: [string, THREE.Vector3][] = [["centre", centre]];
        corners.forEach((c, i) => targets.push([`corner${i}`, c.clone().lerp(centre, 0.05)]));
        corners.forEach((c, i) => targets.push([`edge${i}`, c.clone().add(corners[(i + 1) % 4]!).multiplyScalar(0.5).lerp(centre, 0.05)]));
        // A grid over the card and a margin of a fifth around it: anything nearer than the board there is drawn under the card, or beside it.
        const across = corners[1]!.clone().sub(corners[0]!);
        const up = corners[3]!.clone().sub(corners[0]!);
        for (let i = -1; i <= 6; i += 1) for (let j = -1; j <= 6; j += 1) targets.push([`grid${i},${j}`, corners[0]!.clone().addScaledVector(across, i / 5).addScaledVector(up, j / 5)]);
        const meshes: THREE.Object3D[] = [];
        scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh || m.name === "sky" || m.name === "ground-grid") return;
          for (let p: THREE.Object3D | null = m; p; p = p.parent) if (p.name === `board-${k}`) return;
          if (m.name === `board-face-${k}`) return;
          meshes.push(m);
        });
        const blocked: { point: string; by: string; at: number; of: number }[] = [];
        for (const [label, target] of targets) {
          const direction = target.clone().sub(origin);
          const distance = direction.length();
          ray.set(origin, direction.normalize());
          ray.far = distance - 0.3;
          const hit = ray.intersectObjects(meshes, false)[0];
          if (hit) blocked.push({ point: label, by: hit.object.name || hit.object.parent?.name || "unnamed", at: Math.round(hit.distance * 10) / 10, of: Math.round(distance * 10) / 10 });
        }
        report.push({ stop: k, blocked });
      }
      return report;
    };
  }
  // Development-only: what does the camera see at a pixel (CSS pixels of the canvas)? Name, parent, world point, and the mesh's own bounds.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__worldPick = (px: number, py: number) => {
      scene.updateMatrixWorld(true);
      const rect = canvas.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(((px - rect.left) / rect.width) * 2 - 1, -(((py - rect.top) / rect.height) * 2 - 1)), camera);
      const hits = ray.intersectObjects(scene.children, true).filter((h) => h.object.name !== "sky");
      return hits.slice(0, 3).map((h) => {
        const mesh = h.object as THREE.Mesh;
        mesh.geometry.computeBoundingBox();
        return { name: mesh.name || "unnamed", parent: mesh.parent?.name ?? "", distance: h.distance, point: h.point.toArray(), instance: h.instanceId ?? null, tris: (mesh.geometry.getIndex()?.count ?? mesh.geometry.getAttribute("position").count) / 3 };
      });
    };
  }
  // Development-only frame probe: what the camera and the cards did in the frame just drawn (read by tools/world-direction-*).
  if (import.meta.env.DEV) {
    const raycaster = new THREE.Raycaster();
    const dirs = [V3(0, 1, 0), V3(0, -1, 0), V3(1, 0, 0), V3(-1, 0, 0), V3(0, 0, 1), V3(0, 0, -1)];
    const solids: THREE.Mesh[] = [];
    (window as unknown as Record<string, unknown>).__worldProbe = () => ({
      t: performance.now(), time, cCur, vel, fov: camera.fov, shown: canvas.dataset.shown, flight: document.documentElement.dataset.flight ?? "",
      scrollY: window.scrollY, snap: snapTurn, frames: drawn, pos: camera.position.toArray(), quat: camera.quaternion.toArray(), cards: canvas.dataset.cards,
    });
    /** For each point: the distance to the nearest solid face, and whether the point is inside a solid (the first face a ray meets points away). */
    (window as unknown as Record<string, unknown>).__worldInside = (points: number[][]) => {
      if (!solids.length) scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !(m as THREE.InstancedMesh).isInstancedMesh && /^district-/.test(m.name)) solids.push(m); });
      const sides = solids.map((m) => (m.material as THREE.Material).side);
      solids.forEach((m) => { (m.material as THREE.Material).side = THREE.DoubleSide; });
      const out = points.map(([x, y, z]) => {
        let nearest = Infinity;
        let inside = false;
        let by = "";
        for (const d of dirs) {
          raycaster.set(V3(x!, y!, z!), d);
          raycaster.far = 400;
          const hit = raycaster.intersectObjects(solids, false)[0];
          if (!hit) continue;
          nearest = Math.min(nearest, hit.distance);
          if (hit.face && hit.face.normal.clone().transformDirection(hit.object.matrixWorld).dot(d) > 0.01) { inside = true; by = hit.object.name; }
        }
        return { inside, nearest, by };
      });
      solids.forEach((m, i) => { (m.material as THREE.Material).side = sides[i]!; });
      return out;
    };
  }
  if (document.fonts?.load) {
    void document.fonts
      .load('400 84px "Anton"')
      .then(() => {
        world.repaintText();
        dirty = true;
        schedule();
      })
      .catch(() => undefined);
  }

  const post = createPost(renderer, scene, camera, p, fixed ? 0.8 : 0.14);
  post.halftone.enabled = options.halftone !== false;
  canvas.dataset.halftone = post.halftone.enabled ? "on" : "off";

  const applyScale = () => {
    // The dot cell follows the pixel ratio actually in use, so adaptive quality does not change the dot's look.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25) * quality.scale;
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    trafficRenderer.setPixelRatio(dpr);
    trafficRenderer.setSize(width, height, false);
    post.composer.setPixelRatio(dpr);
    post.composer.setSize(width, height);
    post.halftone.uniforms.res!.value.set(width * dpr, height * dpr);
    post.halftone.uniforms.cell!.value = 5 * dpr;
  };
  // A device that looks weak starts a step down; the adaptive loop then raises or lowers it from the real frame time.
  const nav = navigator as Navigator & { deviceMemory?: number };
  const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || (typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches);
  const quality = createQuality(() => {
    applyScale();
    options.onQuality?.(quality.scale);
    dirty = true;
  }, weak ? 1 : 0);

  /** Where each district's section sits on the page, measured once and when the layout changes, never per frame. */
  const measure = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    applyScale();
    const found = new Map<string, number>();
    cards.length = 0;
    document.querySelectorAll<HTMLElement>("[data-stop]").forEach((el) => {
      const r = el.getBoundingClientRect();
      const y = r.top + window.scrollY + r.height / 2;
      found.set(el.dataset.stop ?? "", y);
      el.dataset.stationY = String(Math.round(y));
    });
    options.stops.forEach((stop, k) => {
      cards[k] = document.querySelector<HTMLElement>(`[data-stop="${stop.id}"] .stop-card`);
      // Every card has one fixed size while it hangs in the city (src/styles/site.css), so the board and the card always match.
      cardWidth[k] = CARD_W;
      cardHeight[k] = CARD_H;
    });
    const ys = options.stops.map((d) => found.get(d.id)).filter((y): y is number => y !== undefined);
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - height);
    if (ys.length === count) {
      centers = [];
      for (const y of ys) centers.push(Math.max(y, (centers.at(-1) ?? -Infinity) + 1));
    } else {
      centers = options.stops.map((_, i) => height / 2 + (maxScroll * 0.92 * i) / Math.max(1, count - 1));
    }
    dirty = true;
  };

  /** The stop parameter for the current scroll position: a section's middle is its stop, the camera rests there, then flies to the next. */
  const flightC = (): number => {
    const y = window.scrollY + height / 2;
    const cs = centers;
    if (!cs.length || y <= cs[0]!) return 0;
    // During a flight started by a key, the wheel or the menu (src/site/DistrictMenu.tsx) the scroll is already eased, and the camera must
    // leave the moment the visitor asks: no rest at the start of the leg and no second easing on top.
    const flight = document.documentElement.dataset.flight === "1";
    for (let i = 0; i < count - 1; i += 1) {
      if (y <= cs[i + 1]!) {
        const f = (y - cs[i]!) / Math.max(1, cs[i + 1]! - cs[i]!);
        if (flight) return i + f;
        return i + (f < DWELL ? 0 : f > 1 - DWELL ? 1 : smooth((f - DWELL) / (1 - 2 * DWELL)));
      }
    }
    return count - 1;
  };
  const rawIndex = (): number => {
    const y = window.scrollY + height / 2;
    let best = 0;
    for (let i = 0; i < count; i += 1) if (Math.abs(centers[i]! - y) < Math.abs(centers[best]! - y)) best = i;
    return best;
  };

  /** One request at a time: see loop.ts. `frameLoop` is a function declaration below, so it is available here. */
  const loop = createFrameScheduler((now) => frameLoop(now), () => !dead && !document.hidden && (motion || dirty));
  const schedule = () => {
    loop.schedule();
  };

  const select = (index: number) => {
    const next = Math.min(count - 1, Math.max(0, index));
    if (next === active) return;
    active = next;
    options.onActive?.(active);
    window.clearTimeout(settleTimer);
    // Break the objects, shake and split only once the selection has settled, never for districts that are passing by.
    settleTimer = window.setTimeout(() => {
      if (!motion) return;
      shake = 1;
      glitch = 1;
    }, SETTLE_MS);
    dirty = true;
  };

  const onScroll = () => {
    if (fixed) return;
    select(rawIndex());
    if (!motion) {
      cCur = active;
      dirty = true;
    }
    schedule();
  };

  /** The stop the camera is at (the nearest one). The menu follows this, so it always names what the screen shows. */
  let shown = -1;
  const announceShown = () => {
    const now = Math.min(count - 1, Math.max(0, Math.round(cCur)));
    if (now === shown) return;
    shown = now;
    canvas.dataset.shown = String(now);
    window.dispatchEvent(new CustomEvent("scene-shown", { detail: now }));
  };
  /** The menu jumped more than one stop: the camera cuts to the stop instead of flying past every stop in between. */
  const onCut = () => {
    if (fixed) return;
    select(rawIndex());
    cCur = motion ? flightC() : Math.max(0, active);
    snapTurn = true;
    vel = 0;
    if (motion) {
      glitch = 1;
      shake = 0.6;
    }
    dirty = true;
    schedule();
  };

  let lastTravel = 1;
  /** The camera's orientation as flown (rate limited); `snapTurn` makes the next frame take the target at once (a cut, or no motion). */
  const flownTurn = new THREE.Quaternion();
  let snapTurn = true;
  /** Frames drawn so far: the development probe reports it, so a doubled loop shows as twice the display rate. */
  let drawn = 0;
  const camPos = V3(0, 0, 0);
  const camLook = V3(0, 0, 0);
  const view = V3(0, 0, 0);
  const side = V3(0, 0, 0);
  /**
   * The camera flies the rail and turns as it goes. Between two stops it shifts across the avenue, pans, and banks into the
   * turn; faster scrolling banks more and widens the lens. All of it is zero at a stop, so a project is always seen head-on.
   * Under reduced motion `motion` is false: no swing, no bank, no lens change.
   */
  const poseCamera = (dt: number) => {
    rail.pose(cCur, camPos, camLook);
    const leg = Math.floor(cCur);
    const dir = ((leg % 2) + 2) % 2 === 0 ? 1 : -1;
    const swing = motion ? Math.sin((cCur - leg) * Math.PI) : 0;
    view.subVectors(camLook, camPos);
    // The avenue's right-hand side, from the view direction on the ground.
    side.set(-view.z, 0, view.x).normalize();
    const pan = swing * dir * SWING_PAN;
    // Pan: turn the view about the vertical axis, around the camera.
    const cos = Math.cos(pan);
    const sin = Math.sin(pan);
    const vx = view.x * cos - view.z * sin;
    const vz = view.x * sin + view.z * cos;
    const sx = motion ? (Math.random() - 0.5) * shake * 0.35 : 0;
    const sy = motion ? (Math.random() - 0.5) * shake * 0.35 : 0;
    const shift = swing * dir * SWING_SHIFT;
    camera.position.set(camPos.x + side.x * shift + px * 0.8 + sx, camPos.y + py * 0.5 + sy, camPos.z + side.z * shift);
    const speedRoll = motion ? Math.max(-0.2, Math.min(0.2, vel * 0.1)) : 0;
    const roll = swing * dir * BANK + speedRoll;
    camera.up.set(-Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(camera.position.x + vx, camLook.y, camera.position.z + vz);
    if (motion && !snapTurn && dt > 0) {
      turnToward(flownTurn, camera.quaternion, MAX_TURN_RATE * dt);
      camera.quaternion.copy(flownTurn);
    } else flownTurn.copy(camera.quaternion);
    snapTurn = false;
    const wide = 58 + (motion ? Math.min(9, Math.abs(vel) * 5) : 0);
    fov += (wide - fov) * 0.2;
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    redLight.position.set(camera.position.x + 4, camera.position.y + 3, camera.position.z - 6);
    // Development-only free camera for the audit and the surroundings plan: `window.__freeCam = { pos, look, fov }` replaces the rail pose.
    if (import.meta.env.DEV) {
      const free = (window as unknown as { __freeCam?: { pos: number[]; look: number[]; fov?: number } }).__freeCam;
      if (free) {
        camera.up.set(0, 1, 0);
        camera.position.set(free.pos[0]!, free.pos[1]!, free.pos[2]!);
        camera.lookAt(free.look[0]!, free.look[1]!, free.look[2]!);
        if (free.fov && camera.fov !== free.fov) {
          camera.fov = free.fov;
          camera.updateProjectionMatrix();
        }
      }
    }
    // The page's panels lean with the camera (src/pages/Home.tsx listens); the attribute is what the e2e suite reads.
    if (Math.abs(pan - lastTravel) > 0.004 || pan === 0) {
      lastTravel = pan;
      canvas.dataset.travel = pan.toFixed(3);
    }
  };

  /**
   * Each card IS its board. The board's four corners are projected to the screen and the card is fitted to them with a perspective
   * transform (a homography written as matrix3d), so the card leans, shrinks and foreshortens exactly as the sign does, and grows out of
   * the city as the camera comes. Only the card at the camera's stop is interactive; the others are previews. Transform and opacity only,
   * written as one custom property on at most three elements per frame.
   */
  const corners = [V3(0, 0, 0), V3(0, 0, 0), V3(0, 0, 0), V3(0, 0, 0)];
  const quad = [0, 0, 0, 0, 0, 0, 0, 0];
  const homography = (cw: number, ch: number): string => {
    const [x0, y0, x1, y1, x2, y2, x3, y3] = quad as [number, number, number, number, number, number, number, number];
    const dx1 = x1 - x2;
    const dx2 = x3 - x2;
    const dx3 = x0 - x1 + x2 - x3;
    const dy1 = y1 - y2;
    const dy2 = y3 - y2;
    const dy3 = y0 - y1 + y2 - y3;
    const det = dx1 * dy2 - dy1 * dx2;
    const g = Math.abs(det) < 1e-9 ? 0 : (dx3 * dy2 - dy3 * dx2) / det;
    const h = Math.abs(det) < 1e-9 ? 0 : (dx1 * dy3 - dy1 * dx3) / det;
    const a = x1 - x0 + g * x1;
    const b = x3 - x0 + h * x3;
    const d = y1 - y0 + g * y1;
    const e = y3 - y0 + h * y3;
    const n = (v: number) => v.toFixed(6);
    return `matrix3d(${n(a / cw)},${n(d / cw)},0,${n(g / cw)},${n(b / ch)},${n(e / ch)},0,${n(h / ch)},0,0,1,0,${n(x0)},${n(y0)},0,1)`;
  };
  const updateCards = () => {
    camera.updateMatrixWorld();
    trafficCanvas.style.visibility = "hidden";
    let shown = 0;
    for (let k = 0; k < cards.length; k += 1) {
      const el = cards[k];
      if (!el) continue;
      const d = cCur - k;
      const ad = Math.abs(d);
      const visible = d > -1.15 && d < 0.55;
      const hide = () => {
        world.setCardOverlay(k, false);
        if (el.dataset.shown !== "0") {
          el.dataset.shown = "0";
          delete el.dataset.near;
          put(el, "--o", "0");
          el.inert = true;
        }
      };
      if (!visible) {
        hide();
        continue;
      }
      world.boardCorners(k, corners);
      let near3 = true;
      for (let i = 0; i < 4; i += 1) {
        projected.copy(corners[i]!).applyMatrix4(camera.matrixWorldInverse);
        if (-projected.z < 2) near3 = false;
        projected.copy(corners[i]!).project(camera);
        quad[i * 2] = ((projected.x + 1) / 2) * width;
        quad[i * 2 + 1] = ((1 - projected.y) / 2) * height;
      }
      if (!near3) {
        hide();
        continue;
      }
      const near = ad < 0.22;
      if (near) {
        trafficPlane.setFromCoplanarPoints(corners[0]!, corners[1]!, corners[2]!);
        if (trafficPlane.distanceToPoint(camera.position) < 0) trafficPlane.negate();
        trafficCanvas.style.clipPath = `polygon(${Array.from({ length: 4 }, (_, i) => `${quad[i * 2]}px ${quad[i * 2 + 1]}px`).join(", ")})`;
        trafficCanvas.style.visibility = "visible";
      }
      // Previews fade in from the distance; the card at its stop is fully there.
      const o = near ? 1 : Math.max(0, 0.9 * (1 - (ad - 0.22) / 0.9));
      world.setCardOverlay(k, o > 0);
      put(el, "--m", homography(cardWidth[k]!, cardHeight[k]!));
      put(el, "--o", o.toFixed(2));
      if (el.dataset.shown !== "1" || el.inert === near) {
        el.dataset.shown = "1";
        el.inert = !near;
      }
      if (near) el.dataset.near = "1";
      else delete el.dataset.near;
      shown += 1;
    }
    if (canvas.dataset.cards !== String(shown)) canvas.dataset.cards = String(shown);
  };

  // CPU time of one frame in milliseconds (our own JavaScript, not the GPU), averaged over sixty frames: the number to watch for a stuttering scroll.
  let cpuSum = 0;
  let cpuFrames = 0;
  function frameLoop(now: number) {
    loop.enter();
    if (dead) return;
    const started = performance.now();
    const rawDt = (now - last) / 1000;
    last = now;
    const dt = Math.min(0.05, rawDt);
    if (motion) {
      quality.sample(rawDt, now);
      time += dt;
      const before = cCur;
      const target = flightC();
      // Programmatic navigation already eases the scroll; do not ease it a second time.
      cCur = document.documentElement.dataset.flight === "1" ? target : cCur + (target - cCur) * (1 - Math.exp(-7 * dt));
      if (dt > 0) vel += ((cCur - before) / dt - vel) * (1 - Math.exp(-10 * dt));
      px += (pxT - px) * (1 - Math.exp(-4 * dt));
      py += (pyT - py) * (1 - Math.exp(-4 * dt));
      glitch *= Math.exp(-6 * dt);
      shake *= Math.exp(-5 * dt);
      world.place(time, false);
    } else if (!dirty) {
      return;
    }
    post.finish.uniforms.uVel!.value = motion ? glitch * 2.5 + Math.min(0.6, Math.abs(vel) * 0.08) : 0;
    post.finish.uniforms.uTime!.value = motion ? time : 0;
    if (glitch > 0.05 && canvas.dataset.splitSeen !== "1") canvas.dataset.splitSeen = "1";
    drawn += 1;
    poseCamera(motion ? dt : 0);
    announceShown();
    updateCards();
    renderer.info.reset();
    post.composer.render();
    let trafficDraws = 0;
    if (trafficCanvas.style.visibility === "visible") {
      const background = scene.background;
      scene.background = null;
      camera.layers.set(1);
      trafficRenderer.render(scene, camera);
      trafficDraws = trafficRenderer.info.render.calls;
      camera.layers.set(0);
      scene.background = background;
    }
    if (firstDraw) {
      canvas.dataset.draws = String(renderer.info.render.calls + trafficDraws);
      firstDraw = false;
    }
    dirty = false;
    cpuSum += performance.now() - started;
    cpuFrames += 1;
    if (cpuFrames >= 60) {
      canvas.dataset.cpuMs = (cpuSum / cpuFrames).toFixed(2);
      cpuSum = 0;
      cpuFrames = 0;
    }
    schedule();
  }

  const onVisibility = () => {
    if (document.hidden) {
      loop.cancel();
    } else {
      last = performance.now();
      dirty = true;
      schedule();
    }
  };
  const onLost = (event: Event) => {
    event.preventDefault();
    dispose();
    options.onFail?.();
  };
  const onResize = () => {
    measure();
    onScroll();
    schedule();
  };
  const onPointer = (event: PointerEvent) => {
    if (!motion) return;
    pxT = (event.clientX / window.innerWidth) * 2 - 1;
    pyT = -((event.clientY / window.innerHeight) * 2 - 1);
  };

  const observer = new ResizeObserver(onResize);
  observer.observe(document.body);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointermove", onPointer);
  window.addEventListener("scene-cut", onCut);
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onLost);

  measure();
  if (fixed) {
    select(Math.min(count - 1, Math.max(0, options.focus!)));
    cCur = active;
  } else {
    onScroll();
    cCur = motion ? flightC() : Math.max(0, active);
  }
  world.place(0, !motion);
  refreshOrigin();
  ready = true;
  if (modelsWaiting) modelsLoaded();
  frameLoop(performance.now());

  function dispose() {
    if (dead) return;
    dead = true;
    if (import.meta.env.DEV) delete (window as unknown as { __worldAudit?: () => unknown }).__worldAudit;
    loop.cancel();
    window.clearTimeout(settleTimer);
    observer.disconnect();
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("scene-cut", onCut);
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("webglcontextlost", onLost);
    delete document.documentElement.dataset.legMs;
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
      const free = (x: THREE.Material) => {
        const map = (x as THREE.MeshBasicMaterial).map;
        map?.dispose();
        x.dispose();
      };
      if (Array.isArray(m)) m.forEach(free);
      else if (m) free(m);
    });
    post.composer.dispose();
    trafficRenderer.dispose();
    trafficCanvas.remove();
    renderer.dispose();
  }

  return {
    dispose,
    setQuality(q) {
      quality.set(q);
      schedule();
    },
    setMotion(on) {
      if (options.mode === "3d-static" || fixed) return;
      motion = on;
      snapTurn = true;
      if (!on) {
        cCur = Math.max(0, active);
        time = 0;
        vel = 0;
        world.place(0, true);
        glitch = 0;
        shake = 0;
      }
      dirty = true;
      schedule();
    },
    setHalftone(on) {
      post.halftone.enabled = on;
      canvas.dataset.halftone = on ? "on" : "off";
      dirty = true;
      schedule();
    },
    pulse() {
      if (!motion || active < 0) return;
      glitch = Math.max(glitch, 0.6);
      schedule();
    },
  };
}
