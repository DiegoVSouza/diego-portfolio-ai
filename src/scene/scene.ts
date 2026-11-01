/**
 * Level 2 background: a night city you travel by scrolling. The camera rides a rail through six districts; at each stop the
 * district's projects float beside the avenue and take the colour, and between stops the camera flies, swinging, banking and
 * widening the lens with speed. It is a lazy chunk: the page never depends on it, and any failure leaves the level 1 background.
 */
import * as THREE from "three";
import { V3, rng } from "./geometry";
import { createPost } from "./post";
import { createQuality, type Quality } from "./quality";
import { createRail } from "./rail";
import { readPalette } from "./tokens";
import { BILLBOARD_WIDTH, BILLBOARD_WIDTH_WIDE, buildWorld } from "./world";

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
  models: { truck: string; moto: string; buildings?: string[]; cars?: string[]; station?: string };
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

const SETTLE_MS = 140;
/** Fraction of a leg the camera rests at each end: the stop is a place, not a point. */
const DWELL = 0.12;
/** Swing between stops: sideways shift on the avenue (units), pan (radians) and bank (radians). All are zero at a stop. */
const SWING_SHIFT = 5;
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
  const rail = createRail(count);

  // Three lights at most: a flat fill, one key, and a red point that travels with the camera.
  scene.add(new THREE.AmbientLight(new THREE.Color().setScalar(1), 0.4));
  const key = new THREE.DirectionalLight(new THREE.Color().setScalar(1), 2.2);
  key.position.set(-30, 60, 40);
  scene.add(key);
  const redLight = new THREE.PointLight(p.red, 400, 90, 2);
  scene.add(redLight);

  const rnd = rng(11);

  const anchor = V3(0, 0, 0);
  const projected = V3(0, 0, 0);
  const cards: (HTMLElement | null)[] = [];
  const cardWidth: number[] = [];

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
  let raf = 0;
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
    post.composer.setPixelRatio(dpr);
    post.composer.setSize(width, height);
    post.halftone.uniforms.res!.value.set(width * dpr, height * dpr);
    post.halftone.uniforms.cell!.value = 5 * dpr;
  };
  const quality = createQuality(() => {
    applyScale();
    options.onQuality?.(quality.scale);
    dirty = true;
  });

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
      cardWidth[k] = stop.wide ? 640 : 520;
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
    for (let i = 0; i < count - 1; i += 1) {
      if (y <= cs[i + 1]!) {
        const f = (y - cs[i]!) / Math.max(1, cs[i + 1]! - cs[i]!);
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

  const schedule = () => {
    if (dead || raf || document.hidden) return;
    if (motion || dirty) raf = requestAnimationFrame(frameLoop);
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

  const camPos = V3(0, 0, 0);
  const camLook = V3(0, 0, 0);
  const view = V3(0, 0, 0);
  const side = V3(0, 0, 0);
  /**
   * The camera flies the rail and turns as it goes. Between two stops it shifts across the avenue, pans, and banks into the
   * turn; faster scrolling banks more and widens the lens. All of it is zero at a stop, so a project is always seen head-on.
   * Under reduced motion `motion` is false: no swing, no bank, no lens change.
   */
  const poseCamera = () => {
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
    const wide = 58 + (motion ? Math.min(9, Math.abs(vel) * 5) : 0);
    fov += (wide - fov) * 0.2;
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    redLight.position.set(camera.position.x + 4, camera.position.y + 3, camera.position.z - 6);
    // The page's panels lean with the camera (src/pages/Home.tsx listens); the attribute is what the e2e suite reads.
    canvas.dataset.travel = pan.toFixed(3);
    if (motion && !fixed) window.dispatchEvent(new CustomEvent("scene:travel", { detail: { yaw: pan, roll } }));
  };

  /**
   * Each card hangs in its part of the city: its screen position and size are the projection of its billboard, so it grows out of the
   * city as the camera comes and drifts away behind it. Only the card at the camera's stop is interactive; the others are previews.
   * Transform and opacity only, written as custom properties on at most three elements per frame.
   */
  const updateCards = () => {
    camera.updateMatrixWorld();
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    let shown = 0;
    for (let k = 0; k < cards.length; k += 1) {
      const el = cards[k];
      if (!el) continue;
      const d = cCur - k;
      const ad = Math.abs(d);
      const visible = d > -1.15 && d < 0.55;
      if (!visible) {
        if (el.dataset.shown !== "0") {
          el.dataset.shown = "0";
          el.style.setProperty("--o", "0");
          el.inert = true;
        }
        continue;
      }
      rail.cardAnchor(k, anchor);
      projected.copy(anchor).applyMatrix4(camera.matrixWorldInverse);
      const depth = -projected.z;
      if (depth < 3) {
        el.dataset.shown = "0";
        el.style.setProperty("--o", "0");
        el.inert = true;
        continue;
      }
      projected.copy(anchor).project(camera);
      const px = ((projected.x + 1) / 2) * width;
      const py = ((1 - projected.y) / 2) * height;
      const world = options.stops[k]!.wide ? BILLBOARD_WIDTH_WIDE : BILLBOARD_WIDTH;
      const pxPerUnit = height / (2 * depth * tan);
      const scale = Math.min(1.12, Math.max(0.08, (world * pxPerUnit) / cardWidth[k]!));
      const near = ad < 0.22;
      // Previews fade in from the distance; the card at its stop is fully there.
      const o = near ? 1 : Math.max(0, 0.9 * (1 - (ad - 0.22) / 0.9));
      el.style.setProperty("--x", px.toFixed(1));
      el.style.setProperty("--y", py.toFixed(1));
      el.style.setProperty("--s", scale.toFixed(3));
      el.style.setProperty("--o", o.toFixed(2));
      if (el.dataset.shown !== "1" || el.inert === near) {
        el.dataset.shown = "1";
        el.inert = !near;
      }
      if (near) el.dataset.near = "1";
      else delete el.dataset.near;
      shown += 1;
    }
    canvas.dataset.cards = String(shown);
  };

  // CPU time of one frame in milliseconds (our own JavaScript, not the GPU), averaged over sixty frames: the number to watch for a stuttering scroll.
  let cpuSum = 0;
  let cpuFrames = 0;
  function frameLoop(now: number) {
    raf = 0;
    if (dead) return;
    const started = performance.now();
    const rawDt = (now - last) / 1000;
    last = now;
    const dt = Math.min(0.05, rawDt);
    if (motion) {
      quality.sample(rawDt, now);
      time += dt;
      const before = cCur;
      cCur += (flightC() - cCur) * (1 - Math.exp(-7 * dt));
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
    poseCamera();
    updateCards();
    renderer.info.reset();
    post.composer.render();
    if (firstDraw) {
      canvas.dataset.draws = String(renderer.info.render.calls);
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
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
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
    if (raf) cancelAnimationFrame(raf);
    window.clearTimeout(settleTimer);
    observer.disconnect();
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("pointermove", onPointer);
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("webglcontextlost", onLost);
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
