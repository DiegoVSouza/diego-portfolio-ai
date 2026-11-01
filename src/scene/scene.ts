/**
 * Level 2 background: the night city from the v5 collage scene, ported to the site and driven by its tokens.
 * The camera flies a curve through the city and stops at one station per project, where that project's object takes
 * the colour, breaks into its triangles and comes back together. This is a lazy chunk: the page never depends on it,
 * and any failure here leaves the level 1 background.
 */
import * as THREE from "three";
import { burstGeo, burstMaterial, type BurstUniforms } from "./burst";
import { buildCity } from "./city";
import { V3, fit, rng, tick } from "./geometry";
import { buildPane } from "./glass";
import { createPost } from "./post";
import { createQuality, type Quality } from "./quality";
import { SYMBOLS, fallbackSymbol } from "./symbols";
import { readPalette } from "./tokens";

export type { Quality } from "./quality";
export type SceneMode = "3d" | "3d-static";

export interface SceneOptions {
  /** One entry per project, in flight order. */
  slugs: string[];
  mode: SceneMode;
  /** Half-tone screen pass (the identity of the design system). On by default. */
  halftone?: boolean;
  /** Case pages: hold the camera at this project's station. Nothing moves and the page does not scroll the scene. */
  focus?: number;
  /** Real models, served by the site (Kenney, CC0). */
  models: { truck: string; moto: string };
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

export async function start(canvas: HTMLCanvasElement, options: SceneOptions): Promise<SceneController> {
  const p = readPalette();
  const count = Math.max(1, options.slugs.length);
  const fixed = options.focus !== undefined;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor(p.ink, 1);
  // The composer renders several passes per frame; count draw calls across all of them, reset once per frame.
  renderer.info.autoReset = false;
  const scene = new THREE.Scene();
  scene.background = p.ink;
  scene.fog = new THREE.Fog(p.ink, 8, 40);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 120);

  // The flight curve: one anchor per project, one before and one after.
  const anchors: THREE.Vector3[] = [];
  for (let i = -1; i <= count; i += 1) anchors.push(V3(i * 3 + Math.sin(i * 1.3) * 1.4, -i * 1.7 + Math.cos(i * 1.1) * 0.8, -i * 4.2));
  const curve = new THREE.CatmullRomCurve3(anchors, false, "catmullrom", 0.5);
  const at = (t: number, out: THREE.Vector3) => curve.getPoint(Math.min(1, Math.max(0, (t + 1) / (count + 1))), out);
  const frameAt = (t: number) => {
    const u = Math.min(1, Math.max(0, (t + 1) / (count + 1)));
    const point = curve.getPoint(u);
    const tangent = curve.getTangent(u);
    return { p: point, T: tangent, R: new THREE.Vector3().crossVectors(tangent, V3(0, 1, 0)).normalize() };
  };
  const lane = (dx: number, dy: number, dz: number) => new THREE.CatmullRomCurve3(anchors.map((a) => V3(a.x + dx, a.y + dy, a.z + dz)), false, "catmullrom", 0.5);

  scene.add(new THREE.AmbientLight(new THREE.Color().setScalar(1), 0.35));
  const key = new THREE.DirectionalLight(new THREE.Color().setScalar(1), 2.4);
  key.position.set(-6, 9, 8);
  scene.add(key);
  const redLight = new THREE.PointLight(p.red, 300, 42, 2);
  scene.add(redLight);

  const rnd = rng(11);

  // One ring of broken glass per project.
  const glassMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide });
  const panes: { mesh: THREE.Mesh; phase: number }[] = [];
  for (let k = 0; k < count; k += 1) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(buildPane(rnd, p), glassMaterial);
    group.add(mesh);
    const tp = k + 1.5 - 1.35;
    group.position.copy(at(tp, V3(0, 0, 0)));
    group.lookAt(at(tp + 0.05, V3(0, 0, 0)));
    scene.add(group);
    panes.push({ mesh, phase: rnd() * 6.28 });
    await tick();
  }

  // One solid per project, which breaks into its triangles when it takes the focus.
  const solids: { group: THREE.Group; u: BurstUniforms; burst: number; index: number }[] = [];
  for (let i = 0; i < options.slugs.length; i += 1) {
    const group = new THREE.Group();
    const material = burstMaterial(p);
    const build = SYMBOLS[options.slugs[i]!] ?? fallbackSymbol;
    const mesh = new THREE.Mesh(burstGeo(fit(build(), 5.4), rnd), material);
    group.add(mesh);
    scene.add(group);
    solids.push({ group, u: material.userData.u as BurstUniforms, burst: 0, index: i });
    await tick();
  }

  // State.
  let motion = options.mode === "3d" && !fixed;
  let time = 0;
  let tCur = 0;
  let active = -1;
  let width = 0;
  let height = 0;
  let narrow = false;
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

  // The vehicle models load while the city is still being built in small tasks. If they arrive first, the callback waits
  // until the city exists; calling it earlier read `city` before it was assigned (a TDZ error seen on the live site).
  let ready = false;
  let vehiclesWaiting = false;
  const vehiclesLoaded = () => {
    city.place(time, !motion);
    refreshOrigin();
    dirty = true;
    schedule();
  };
  const city = await buildCity({
    scene,
    p,
    rnd,
    count,
    anchors,
    at,
    frameAt,
    lane,
    signs: options.slugs.map((s) => s.replace(/-/g, " ")),
    models: options.models,
    onVehicles: () => {
      if (ready) vehiclesLoaded();
      else vehiclesWaiting = true;
    },
  });
  if (document.fonts?.load) {
    void document.fonts
      .load('400 430px "Anton"')
      .then(() => {
        city.repaintGhosts();
        dirty = true;
        schedule();
      })
      .catch(() => undefined);
  }

  const post = createPost(renderer, scene, camera, p, fixed ? 0.5 : 0.3);
  post.halftone.enabled = options.halftone !== false;
  canvas.dataset.halftone = post.halftone.enabled ? "on" : "off";

  const applyScale = () => {
    // The dot cell follows the pixel ratio actually in use, so adaptive quality does not change the dot's look.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * quality.scale;
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

  /** Positions of the project cards, measured once and when the layout changes, never per frame. */
  const measure = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.aspect = width / height;
    narrow = camera.aspect < 1;
    camera.updateProjectionMatrix();
    applyScale();
    const found = new Map<string, number>();
    document.querySelectorAll<HTMLElement>("[data-scene-case]").forEach((el) => {
      const r = el.getBoundingClientRect();
      found.set(el.dataset.sceneCase ?? "", r.top + window.scrollY + r.height / 2);
    });
    const ys = options.slugs.map((s) => found.get(s)).filter((y): y is number => y !== undefined);
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - height);
    if (ys.length === count) {
      // One station per card, at the card's own position. Each is at least a pixel below the one before it.
      centers = [];
      for (const y of ys) centers.push(Math.max(y, (centers.at(-1) ?? -Infinity) + 1));
    } else {
      centers = options.slugs.map((_, i) => height / 2 + (maxScroll * 0.92 * i) / Math.max(1, count - 1));
    }
    dirty = true;
  };

  const flightT = (): number => {
    const y = window.scrollY + height / 2;
    const cs = centers;
    if (!cs.length) return 0;
    if (y < cs[0]!) return -Math.min(1, (cs[0]! - y) / height) * 0.9;
    for (let i = 0; i < count - 1; i += 1) if (y <= cs[i + 1]!) return i + (y - cs[i]!) / Math.max(1, cs[i + 1]! - cs[i]!);
    return count - 1 + Math.min(1, (y - cs[count - 1]!) / (height * 0.6)) * 0.7;
  };

  const schedule = () => {
    if (dead || raf || document.hidden) return;
    if (motion || dirty) raf = requestAnimationFrame(frame);
  };

  const select = (index: number) => {
    const next = Math.min(count - 1, Math.max(0, index));
    if (next === active) return;
    active = next;
    options.onActive?.(active);
    window.clearTimeout(settleTimer);
    // Break the object, shake and split only once the selection has settled, never for projects that are passing by.
    settleTimer = window.setTimeout(() => {
      if (!motion) return;
      solids[active]!.burst = 1;
      shake = 1;
      glitch = 1;
    }, SETTLE_MS);
    dirty = true;
  };

  const onScroll = () => {
    if (fixed) return;
    const index = Math.min(count - 1, Math.max(0, Math.round(flightT())));
    select(index);
    if (!motion) {
      tCur = index;
      dirty = true;
    }
    schedule();
  };

  const poseSolids = () => {
    solids.forEach((s, i) => {
      const a = anchors[i + 1]!;
      if (narrow) s.group.position.set(a.x + 1.4, a.y + 2.4, a.z - 3);
      else s.group.position.set(a.x + 4.6, a.y - 0.2, a.z - 2.2);
      const near = Math.exp(-(i - tCur) * (i - tCur) * 2.2);
      s.group.scale.setScalar(0.55 + 0.95 * near);
      s.u.uAct.value = Math.min(1, near * 1.3);
      s.u.uExp.value = motion ? near * 0.015 + s.burst * 1.2 : 0;
      s.group.rotation.x = i % 5 === 3 ? 0.5 : 0.14;
      s.group.rotation.z = -0.08;
      s.group.rotation.y = motion ? (i % 2 ? Math.sin(time * 0.4 + i) * 0.65 : time * (0.12 + near * 0.7)) : -0.4;
    });
    for (const g of city.ghosts) {
      const a = anchors[g.index + 1]!;
      const near = Math.exp(-(g.index - tCur) * (g.index - tCur) * 1.2);
      g.mesh.position.set(a.x + (narrow ? 1 : 7) - (tCur - g.index) * 2, a.y + (narrow ? 3 : 1.5), a.z - 15);
      g.material.opacity = 0.12 + 0.88 * near;
    }
    panes.forEach((pane) => {
      pane.mesh.rotation.z = motion ? pane.phase + tCur * 0.18 : 0;
    });
  };

  const poseCamera = () => {
    const cp = at(tCur, V3(0, 0, 0));
    const ca = at(tCur + 0.35, V3(0, 0, 0));
    const sx = motion ? (Math.random() - 0.5) * shake * 0.35 : 0;
    const sy = motion ? (Math.random() - 0.5) * shake * 0.35 : 0;
    camera.position.set(cp.x - 1.6 + px * 0.7 + sx, cp.y + 1.8 + py * 0.4 + sy, cp.z + 7.5);
    camera.up.set(-Math.sin(0.2), Math.cos(0.2), 0);
    camera.lookAt(ca.x + 1, ca.y - 0.2, ca.z - 3);
    redLight.position.copy(camera.position).add(V3(3, 2, -2));
  };

  function frame(now: number) {
    raf = 0;
    if (dead) return;
    const rawDt = (now - last) / 1000;
    last = now;
    const dt = Math.min(0.05, rawDt);
    if (motion) {
      quality.sample(rawDt, now);
      time += dt;
      tCur += (flightT() - tCur) * (1 - Math.exp(-4.5 * dt));
      px += (pxT - px) * (1 - Math.exp(-4 * dt));
      py += (pyT - py) * (1 - Math.exp(-4 * dt));
      glitch *= Math.exp(-6 * dt);
      shake *= Math.exp(-5 * dt);
      for (const s of solids) s.burst *= Math.exp(-2.6 * dt);
      city.place(time, false);
    } else if (!dirty) {
      return;
    }
    post.finish.uniforms.uVel!.value = motion ? glitch * 2.5 : 0;
    post.finish.uniforms.uTime!.value = motion ? time : 0;
    if (glitch > 0.05 && canvas.dataset.splitSeen !== "1") canvas.dataset.splitSeen = "1";
    poseSolids();
    poseCamera();
    renderer.info.reset();
    post.composer.render();
    if (firstDraw) {
      canvas.dataset.draws = String(renderer.info.render.calls);
      firstDraw = false;
    }
    dirty = false;
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
    tCur = active;
  } else {
    onScroll();
    tCur = motion ? flightT() : Math.max(0, active);
  }
  city.place(0, !motion);
  refreshOrigin();
  ready = true;
  if (vehiclesWaiting) vehiclesLoaded();
  frame(performance.now());

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
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose();
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
        tCur = Math.max(0, active);
        time = 0;
        city.place(0, true);
        for (const s of solids) s.burst = 0;
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
      solids[active]!.burst = 1;
      glitch = Math.max(glitch, 0.6);
      schedule();
    },
  };
}
