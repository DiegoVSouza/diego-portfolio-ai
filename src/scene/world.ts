import * as THREE from "three";
import { V3, bar, fit, mergeGeometries, tick, tint } from "./geometry";
import { loadModel } from "./loaders";
import type { Frame, Rail } from "./rail";
import { truckFallback } from "./symbols";
import type { Palette } from "./tokens";

export interface WorldContext {
  scene: THREE.Scene;
  p: Palette;
  rnd: () => number;
  rail: Rail;
  /** Words for the vertical neon signs (district and project names). */
  signs: string[];
  /** The line on the arrival gate. */
  headline: string;
  models: { truck: string; moto: string; buildings?: string[]; cars?: string[]; station?: string };
  /** Called when a model has loaded after the first frame, so the scene draws again. */
  onModels(): void;
}

export interface World {
  /** Put every moving thing where it belongs at `time` seconds. Called each frame in motion, once in static modes. */
  place(time: number, reduce: boolean): void;
  /** How many skyline buildings come from the real models (zero when they failed to load). */
  landmarks: number;
  vehicleKinds(): number;
  stations(): number;
  /** Sign text is painted again once the display font is ready. */
  repaintText(): void;
}

type Part = THREE.BufferGeometry;

/**
 * The city, laid out around the rail. Six districts, each with its own built form (see .planning/phases/005-city-journey/SPEC.md).
 * Static geometry is merged per district (so the camera culls whole districts), moving things are instanced, and every colour is
 * a mix of the design tokens. Real models (buildings, cars, metro station) replace generated ones when they load.
 */
export async function buildWorld(c: WorldContext): Promise<World> {
  const { scene, p, rnd, rail } = c;
  const N = rail.count;
  const grey = (t: number) => p.mix(p.ink, p.paper, t);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const f = { p: V3(0, 0, 0), T: V3(0, 0, 0), R: V3(0, 0, 0) } as Frame;
  const f2 = { p: V3(0, 0, 0), T: V3(0, 0, 0), R: V3(0, 0, 0) } as Frame;
  const yaw = (T: THREE.Vector3) => Math.atan2(T.x, T.z);
  const face = (x: number, z: number) => Math.atan2(x, z);

  /* ---------- window texture and materials ---------- */
  const winTex = (() => {
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 128;
    const x = cv.getContext("2d")!;
    x.fillStyle = p.css(p.ink);
    x.fillRect(0, 0, 64, 128);
    for (let r = 0; r < 16; r += 1) {
      for (let q = 0; q < 4; q += 1) {
        const v = rnd();
        x.fillStyle = v < 0.3 ? p.css(p.red) : v < 0.38 ? p.css(p.paper) : p.css(p.mix(p.ink, p.dred, 0.25));
        x.fillRect(q * 16 + 3, r * 8 + 2, 10, 4);
      }
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const windowMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8, metalness: 0.1, emissive: new THREE.Color().setScalar(1), emissiveMap: winTex, emissiveIntensity: 1 });

  /* ---------- building blocks ---------- */
  const parts: Part[][] = Array.from({ length: N }, () => []);
  const realParts: Part[][] = Array.from({ length: N }, () => []);
  const beacons: Part[] = [];
  const signSpots: { x: number; y: number; z: number; ry: number; h: number }[] = [];

  /** A box with the window texture mapped to its sides (the top and bottom sample the dark corner), tinted, turned and placed. */
  const solid = (k: number, w: number, h: number, d: number, x: number, y0: number, z: number, ry: number, tone: THREE.Color, windows = true) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv!;
    for (let i = 0; i < uv.count; i += 1) {
      const face = Math.floor(i / 4);
      if (!windows || face === 2 || face === 3) uv.setXY(i, 0.02, 0.02);
      else uv.setXY(i, (uv.getX(i) * (face < 2 ? d : w)) / 3.2, (uv.getY(i) * h) / 4);
    }
    g.rotateY(ry);
    g.translate(x, y0 + h / 2, z);
    tint(g, tone);
    parts[k]!.push(g);
  };
  /** A square bar between two points, as a structural part (no windows). */
  const strut = (k: number, a: THREE.Vector3, b: THREE.Vector3, w: number, tone: THREE.Color) => {
    const g = bar(a, b, w);
    const uv = g.attributes.uv!;
    for (let i = 0; i < uv.count; i += 1) uv.setXY(i, 0.02, 0.02);
    tint(g, tone);
    parts[k]!.push(g);
  };
  const beacon = (x: number, y: number, z: number, s = 0.6) => beacons.push(new THREE.BoxGeometry(s, s, s).translate(x, y, z));
  const toneTower = () => (rnd() < 0.16 ? p.dred : rnd() < 0.5 ? grey(0.28) : grey(0.19));

  /* ---------- real buildings, when they load ---------- */
  const protos = (await Promise.all((c.models.buildings ?? []).map(loadModel)))
    .filter((g): g is THREE.BufferGeometry => g !== null)
    .map((g) => {
      g.computeBoundingBox();
      const bb = g.boundingBox!;
      g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
      return { g, height: bb.max.y - bb.min.y };
    });
  let landmarkCount = 0;
  let heavyUsed = 0;
  /** A real building (its front is +Z) facing `towards`, scaled to `height`. Returns false when no model is available. */
  const landmark = (k: number, x: number, z: number, towardsX: number, towardsZ: number, height: number): boolean => {
    if (!protos.length) return false;
    const i = landmarkCount % protos.length;
    // The heavy sample model (23k triangles) is used at most twice.
    if (i === protos.length - 1 && protos.length > 3 && heavyUsed >= 2) return false;
    if (i === protos.length - 1 && protos.length > 3) heavyUsed += 1;
    const proto = protos[i]!;
    const s = height / proto.height;
    const g = proto.g.clone().scale(s, s, s);
    g.rotateY(face(towardsX, towardsZ));
    g.translate(x, 0, z);
    tint(g, toneTower());
    realParts[k]!.push(g);
    landmarkCount += 1;
    return true;
  };

  /** District k covers the path from half a stop before it to half a stop after. */
  const span = (k: number): [number, number] => [rail.u(k, -0.5), rail.u(k, 0.5)];

  interface Lane {
    count: number;
    latMin: number;
    latMax: number;
    hMin: number;
    hMax: number;
    wMin: number;
    wMax: number;
    /** Every n-th tower is a real building when one is available (0: never). */
    realEvery?: number;
    /** Only this side (+1 right, -1 left); both when omitted. */
    side?: 1 | -1;
    signs?: number;
  }
  /** Towers on both sides of the avenue for district k. Returns where they stood, for features that sit on roofs. */
  const lane = (k: number, o: Lane) => {
    const [u0, u1] = span(k);
    const placed: { x: number; z: number; w: number; d: number; h: number; ry: number; s: number }[] = [];
    let signsLeft = o.signs ?? 0;
    for (let n = 0; n < o.count; n += 1) {
      rail.frameAt(u0 + rnd() * (u1 - u0), f);
      const s = o.side ?? (n % 2 ? 1 : -1);
      const w = o.wMin + rnd() * (o.wMax - o.wMin);
      const d = o.wMin + rnd() * (o.wMax - o.wMin);
      // The nearest face stands at least `latMin` from the avenue's middle.
      const lat = o.latMin + w / 2 + rnd() * (o.latMax - o.latMin);
      const h = o.hMin + rnd() * (o.hMax - o.hMin);
      const x = f.p.x + f.R.x * s * lat;
      const z = f.p.z + f.R.z * s * lat + (rnd() - 0.5) * 5;
      const ry = yaw(f.T);
      if (o.realEvery && n % o.realEvery === 0 && landmark(k, x, z, -f.R.x * s, -f.R.z * s, h)) {
        if (rnd() < 0.5) beacon(x, h + 0.3, z);
        placed.push({ x, z, w, d, h, ry, s });
        continue;
      }
      solid(k, w, h, d, x, 0, z, ry, toneTower());
      if (rnd() < 0.5) beacon(x + (rnd() - 0.5) * w * 0.6, h + 0.3, z);
      if (signsLeft > 0 && h > 24) {
        signSpots.push({ x: f.p.x + f.R.x * s * (lat - w / 2 - 0.12), y: h * (0.4 + rnd() * 0.3), z: f.p.z + f.R.z * s * (lat - w / 2 - 0.12), ry: face(-f.R.x * s, -f.R.z * s), h });
        signsLeft -= 1;
      }
      placed.push({ x, z, w, d, h, ry, s });
    }
    return placed;
  };

  await tick();
  /* ---------- the street: ground, avenue, sidewalks, lane marks, lamps ---------- */
  const ground = (() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    const x = cv.getContext("2d")!;
    x.fillStyle = p.css(p.ink);
    x.fillRect(0, 0, 256, 256);
    x.fillStyle = p.css(p.mix(p.ink, p.paper, 0.07));
    x.fillRect(0, 0, 256, 3);
    x.fillRect(0, 0, 3, 256);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(900 / 30, 750 / 30);
    t.magFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(900, 750), new THREE.MeshBasicMaterial({ map: t }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, -0.06, -225);
    return m;
  })();
  scene.add(ground);

  const ribbon = (from: number, to: number, y: number, tone: THREE.Color): THREE.Mesh => {
    const steps = Math.ceil(rail.length / 3);
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= steps; i += 1) {
      rail.frameAt(i / steps, f);
      pos.push(f.p.x + f.R.x * from, y, f.p.z + f.R.z * from, f.p.x + f.R.x * to, y, f.p.z + f.R.z * to);
      if (i < steps) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: tone, side: THREE.DoubleSide }));
    m.frustumCulled = false;
    return m;
  };
  scene.add(ribbon(-8, 8, 0.03, p.ink2));
  scene.add(ribbon(8, 12, 0.1, grey(0.1)));
  scene.add(ribbon(-12, -8, 0.1, grey(0.1)));

  const marks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.05, 2.4), new THREE.MeshBasicMaterial({ color: p.paper }), Math.floor(rail.length / 6));
  marks.frustumCulled = false;
  for (let i = 0; i < marks.count; i += 1) {
    rail.frameAt((i + 0.5) / marks.count, f);
    dummy.position.set(f.p.x, 0.07, f.p.z);
    dummy.rotation.set(0, yaw(f.T), 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    marks.setMatrixAt(i, dummy.matrix);
  }
  scene.add(marks);

  const lampGeo = mergeGeometries([
    new THREE.BoxGeometry(0.3, 7, 0.3).translate(0, 3.5, 0),
    new THREE.BoxGeometry(2.6, 0.25, 0.25).translate(1.2, 6.9, 0),
    new THREE.BoxGeometry(0.8, 0.4, 0.8).translate(2.5, 6.7, 0),
  ])!;
  const lampCount = Math.floor(rail.length / 22) * 2;
  const lamps = new THREE.InstancedMesh(lampGeo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.7, metalness: 0.2 }), lampCount);
  lamps.frustumCulled = false;
  for (let i = 0; i < lampCount; i += 1) {
    const s = i % 2 ? 1 : -1;
    rail.frameAt((Math.floor(i / 2) + 0.5) / (lampCount / 2), f);
    dummy.position.set(f.p.x + f.R.x * s * 11.5, 0, f.p.z + f.R.z * s * 11.5);
    dummy.rotation.set(0, Math.atan2(f.R.z * s, -f.R.x * s), 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    lamps.setMatrixAt(i, dummy.matrix);
    lamps.setColorAt(i, col.copy(i % 6 < 2 ? p.red : grey(0.3)));
  }
  scene.add(lamps);

  /* ---------- 0 ARRIVAL: the avenue into town, with a gate ---------- */
  await tick();
  lane(0, { count: 22, latMin: 17, latMax: 52, hMin: 16, hMax: 58, wMin: 4, wMax: 9, realEvery: 3, signs: 4 });
  {
    rail.frameAt(rail.u(0, 0.5), f);
    const ry = yaw(f.T);
    for (const s of [-1, 1]) {
      solid(0, 3.4, 34, 3.4, f.p.x + f.R.x * s * 16, 0, f.p.z + f.R.z * s * 16, ry, grey(0.22), false);
      solid(0, 3.8, 1.2, 3.8, f.p.x + f.R.x * s * 16, 33.4, f.p.z + f.R.z * s * 16, ry, p.red, false);
    }
    solid(0, 36, 3.2, 3.2, f.p.x, 32, f.p.z, ry, grey(0.3), false);
    solid(0, 36, 0.9, 3.5, f.p.x, 31, f.p.z, ry, p.red, false);
    beacon(f.p.x, 36.5, f.p.z, 1);
  }

  /* ---------- 1 OPS: a control tower with setbacks and a beacon ---------- */
  await tick();
  lane(1, { count: 14, latMin: 18, latMax: 48, hMin: 14, hMax: 36, wMin: 5, wMax: 9, realEvery: 3, signs: 2 });
  {
    rail.frameAt(rail.u(1, 0.26), f);
    const ry = yaw(f.T);
    const cx = f.p.x + f.R.x * 28;
    const cz = f.p.z + f.R.z * 28;
    solid(1, 16, 30, 16, cx, 0, cz, ry, grey(0.2));
    solid(1, 11, 18, 11, cx, 30, cz, ry, grey(0.26));
    solid(1, 6, 12, 6, cx, 48, cz, ry, p.dred);
    solid(1, 17, 1, 17, cx, 29.6, cz, ry, p.red, false);
    solid(1, 12, 0.8, 12, cx, 47.6, cz, ry, p.red, false);
    strut(1, V3(cx, 60, cz), V3(cx, 76, cz), 0.4, grey(0.4));
    strut(1, V3(cx - 3, 66, cz), V3(cx + 3, 66, cz), 0.3, grey(0.4));
    beacon(cx, 76.5, cz, 1.2);
  }

  /* ---------- 2 CORE: a dense glass core joined by sky bridges ---------- */
  await tick();
  lane(2, { count: 30, latMin: 15, latMax: 62, hMin: 44, hMax: 98, wMin: 5, wMax: 11, realEvery: 4, signs: 4 });
  for (let j = 0; j < 4; j += 1) {
    rail.frameAt(rail.u(2, -0.3 + j * 0.2), f);
    const ry = yaw(f.T);
    const y = 36 + j * 5;
    solid(2, 54, 2.6, 4.2, f.p.x, y, f.p.z, ry, grey(0.32));
    solid(2, 54, 0.5, 0.5, f.p.x, y - 0.4, f.p.z, ry, p.red, false);
    for (const s of [-1, 1]) strut(2, V3(f.p.x + f.R.x * s * 27, y, f.p.z + f.R.z * s * 27), V3(f.p.x + f.R.x * s * 27, y - 12, f.p.z + f.R.z * s * 27), 0.5, grey(0.4));
  }

  /* ---------- 3 PLATFORM: an elevated viaduct, a metro station and trains ---------- */
  await tick();
  lane(3, { count: 18, latMin: 30, latMax: 58, hMin: 20, hMax: 54, wMin: 5, wMax: 10, realEvery: 4, side: -1, signs: 2 });
  lane(3, { count: 6, latMin: 36, latMax: 60, hMin: 14, hMax: 30, wMin: 5, wMax: 9, side: 1 });
  const VIADUCT_LAT = 19;
  const VIADUCT_Y = 15;
  const [vu0, vu1] = [rail.u(3, -0.45), rail.u(3, 0.45)];
  const viaductLength = (vu1 - vu0) * rail.length;
  {
    const segments = Math.ceil(viaductLength / 7);
    for (let i = 0; i < segments; i += 1) {
      rail.frameAt(vu0 + ((i + 0.5) / segments) * (vu1 - vu0), f);
      const x = f.p.x + f.R.x * VIADUCT_LAT;
      const z = f.p.z + f.R.z * VIADUCT_LAT;
      const ry = yaw(f.T);
      solid(3, 7.4, 1.4, 7.6, x, VIADUCT_Y - 1.4, z, ry, grey(0.24), false);
      for (const s of [-1, 1]) solid(3, 0.3, 0.3, 7.6, x + f.R.x * s * 1.8, VIADUCT_Y, z + f.R.z * s * 1.8, ry, grey(0.5), false);
      if (i % 2 === 0) solid(3, 2.2, VIADUCT_Y - 1.4, 2.2, x, 0, z, ry, grey(0.18), false);
    }
  }
  let stationCount = 0;
  const trainCars = 10;
  const trains = new THREE.InstancedMesh(new THREE.BoxGeometry(3.4, 2.8, 7.4), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.6, metalness: 0.2 }), trainCars);
  trains.frustumCulled = false;
  for (let i = 0; i < trainCars; i += 1) trains.setColorAt(i, col.copy(i % 5 === 0 ? p.red : i < 5 ? p.paper : grey(0.5)));
  scene.add(trains);

  /* ---------- 4 CRAFT: low rooftops with billboards, scaffolding and a crane ---------- */
  await tick();
  const low = lane(4, { count: 36, latMin: 14, latMax: 58, hMin: 7, hMax: 22, wMin: 6, wMax: 14, signs: 0 });
  const roofSigns: { x: number; y: number; z: number; ry: number }[] = [];
  low.filter((b) => b.h > 12).slice(0, 6).forEach((b, i) => {
    const frame = (dx: number, dy: number) => V3(b.x + Math.cos(b.ry) * dx, b.h + dy, b.z - Math.sin(b.ry) * dx);
    for (const dx of [-5, 5]) strut(4, frame(dx, 0), frame(dx, 6.5), 0.35, grey(0.5));
    strut(4, frame(-5, 6.5), frame(5, 6.5), 0.35, p.red);
    roofSigns.push({ x: b.x, y: b.h + 3.4, z: b.z, ry: face(-b.s * 1, 0) + (i % 2 ? 0.2 : -0.2) });
  });
  low.filter((b) => b.h > 9).slice(6, 9).forEach((b) => {
    for (let level = 0; level < 4; level += 1) {
      const y = b.h + level * 3;
      const a = V3(b.x - b.w / 2, y, b.z + b.d / 2 + 0.8);
      const e = V3(b.x + b.w / 2, y, b.z + b.d / 2 + 0.8);
      strut(4, a, e, 0.22, grey(0.45));
    }
    for (let i = 0; i <= 4; i += 1) {
      const x = b.x - b.w / 2 + (i * b.w) / 4;
      strut(4, V3(x, b.h, b.z + b.d / 2 + 0.8), V3(x, b.h + 9, b.z + b.d / 2 + 0.8), 0.22, grey(0.45));
    }
  });
  {
    rail.frameAt(rail.u(4, 0.3), f);
    const cx = f.p.x + f.R.x * 34;
    const cz = f.p.z + f.R.z * 34;
    strut(4, V3(cx, 0, cz), V3(cx, 46, cz), 1.1, grey(0.35));
    strut(4, V3(cx - f.R.x * 12, 46, cz - f.R.z * 12), V3(cx + f.R.x * 22, 46, cz + f.R.z * 22), 0.7, p.red);
    strut(4, V3(cx + f.R.x * 18, 46, cz + f.R.z * 18), V3(cx + f.R.x * 18, 34, cz + f.R.z * 18), 0.14, grey(0.6));
    solid(4, 3, 3, 3, cx - f.R.x * 10, 42.5, cz - f.R.z * 10, 0, grey(0.3), false);
    beacon(cx, 47.2, cz, 0.9);
  }

  /* ---------- 5 TERMINAL: a harbour, container stacks, cranes and a lighthouse ---------- */
  await tick();
  rail.frameAt(1, f2);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 440), new THREE.MeshBasicMaterial({ color: p.mix(p.ink, p.dred, 0.5) }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.4, -820);
  scene.add(water);
  {
    const quay = new THREE.Mesh(new THREE.BoxGeometry(46, 0.7, 190), new THREE.MeshBasicMaterial({ color: grey(0.12) }));
    quay.position.set(f2.p.x, -0.1, -650);
    scene.add(quay);
    const streaks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.05, 6), new THREE.MeshBasicMaterial({ color: p.paper }), 46);
    streaks.frustumCulled = false;
    for (let i = 0; i < streaks.count; i += 1) {
      dummy.position.set(f2.p.x + (rnd() - 0.5) * 360, -0.34, f2.p.z - 40 - rnd() * 170);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 0.5 + rnd() * 2);
      dummy.updateMatrix();
      streaks.setMatrixAt(i, dummy.matrix);
    }
    scene.add(streaks);
    // Container stacks beside the quay, in three colours.
    const stackCount = 44;
    const stacks = new THREE.InstancedMesh(new THREE.BoxGeometry(2.8, 2.8, 6.4), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8, metalness: 0.1 }), stackCount);
    stacks.frustumCulled = false;
    const tones = [p.red, p.paper, grey(0.32), p.dred, grey(0.18)];
    for (let i = 0; i < stackCount; i += 1) {
      const s = i % 2 ? 1 : -1;
      const row = Math.floor(i / 2) % 7;
      const level = Math.floor(i / 14);
      rail.frameAt(rail.u(5, -0.5 + row * 0.11), f);
      dummy.position.set(f.p.x + f.R.x * s * (15 + (i % 3) * 3.2), 1.4 + level * 2.8, f.p.z + f.R.z * s * (15 + (i % 3) * 3.2));
      dummy.rotation.set(0, yaw(f.T), 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      stacks.setMatrixAt(i, dummy.matrix);
      stacks.setColorAt(i, col.copy(tones[Math.floor(rnd() * tones.length)]!));
    }
    scene.add(stacks);
    // Portal cranes straddling the stacks.
    for (let j = 0; j < 3; j += 1) {
      rail.frameAt(rail.u(5, -0.35 + j * 0.25), f);
      const a = f.p.clone().addScaledVector(f.R, -26);
      const b = f.p.clone().addScaledVector(f.R, 26);
      for (const q of [a, b]) {
        strut(5, V3(q.x, 0, q.z), V3(q.x, 26, q.z), 0.8, grey(0.4));
      }
      strut(5, V3(a.x, 26, a.z), V3(b.x, 26, b.z), 1, p.red);
      strut(5, V3(a.x, 26, a.z), V3(a.x + f.T.x * 0, 31, a.z), 0.4, grey(0.5));
      beacon(a.x, 31.5, a.z, 0.7);
    }
    // The lighthouse at the end of the quay.
    const lx = f2.p.x + f2.T.x * 70;
    const lz = f2.p.z + f2.T.z * 70;
    solid(5, 9, 22, 9, lx, 0, lz, 0, grey(0.24));
    solid(5, 6, 16, 6, lx, 22, lz, 0, grey(0.3));
    solid(5, 7, 1, 7, lx, 38, lz, 0, p.red, false);
    solid(5, 3.4, 4, 3.4, lx, 39, lz, 0, p.paper, false);
    beacon(lx, 44, lz, 2);
  }

  /* ---------- merge every district, add the real models that need placing ---------- */
  await tick();
  for (let k = 0; k < N; k += 1) {
    if (parts[k]!.length) {
      const m = new THREE.Mesh(mergeGeometries(parts[k]!)!, windowMat);
      scene.add(m);
    }
    if (realParts[k]!.length) {
      const m = new THREE.Mesh(mergeGeometries(realParts[k]!)!, windowMat);
      scene.add(m);
    }
  }
  const beaconMesh = new THREE.Mesh(mergeGeometries(beacons)!, new THREE.MeshBasicMaterial({ color: p.red }));
  beaconMesh.frustumCulled = false;
  scene.add(beaconMesh);

  /* ---------- vertical neon signs ---------- */
  const signPairs: [THREE.Color, THREE.Color][] = [[p.red, p.paper], [p.paper, p.ink2], [p.ink2, p.red], [p.red, p.ink2], [p.paper, p.red], [p.ink2, p.paper]];
  const painters: (() => void)[] = [];
  const makeSign = (text: string, w: number, h: number, bg: THREE.Color, fg: THREE.Color, vertical: boolean): THREE.Mesh => {
    const cv = document.createElement("canvas");
    cv.width = vertical ? 128 : 512;
    cv.height = vertical ? 512 : 128;
    const map = new THREE.CanvasTexture(cv);
    map.colorSpace = THREE.SRGBColorSpace;
    const paint = () => {
      const x = cv.getContext("2d")!;
      x.fillStyle = p.css(bg);
      x.fillRect(0, 0, cv.width, cv.height);
      x.strokeStyle = p.css(fg);
      x.lineWidth = 8;
      x.strokeRect(8, 8, cv.width - 16, cv.height - 16);
      x.fillStyle = p.css(fg);
      x.textAlign = "center";
      x.textBaseline = "middle";
      const chars = [...text.toUpperCase().replace(/-/g, " ")];
      if (vertical) {
        const fs = Math.min(84, Math.floor(430 / chars.length));
        x.font = `400 ${fs}px Anton, Impact, sans-serif`;
        chars.forEach((ch, i) => x.fillText(ch, 64, 256 + (i - (chars.length - 1) / 2) * fs * 1.02));
      } else {
        const fs = Math.min(84, Math.floor(470 / Math.max(4, chars.length) * 1.7));
        x.font = `400 ${fs}px Anton, Impact, sans-serif`;
        x.fillText(chars.join(""), cv.width / 2, cv.height / 2 + 4);
      }
      map.needsUpdate = true;
    };
    paint();
    painters.push(paint);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map }));
  };
  const words = [...c.signs, "LIVE", "AI", "EVIDENCE"];
  signSpots.slice(0, 16).forEach((s, i) => {
    const [bg, fg] = signPairs[i % signPairs.length]!;
    const m = makeSign(words[i % words.length]!, 2.2, 8.8, bg, fg, true);
    m.position.set(s.x, s.y, s.z);
    m.rotation.y = s.ry;
    scene.add(m);
  });
  {
    // The headline over the arrival gate faces the camera, which comes from behind it.
    rail.frameAt(rail.u(0, 0.5), f);
    const m = makeSign(c.headline, 24, 6, p.red, p.paper, false);
    m.position.set(f.p.x, 31.8, f.p.z);
    m.rotation.y = face(-f.T.x, -f.T.z);
    m.translateZ(1.9);
    scene.add(m);
  }
  roofSigns.forEach((s, i) => {
    const [bg, fg] = signPairs[(i + 1) % signPairs.length]!;
    const m = makeSign(words[(i + 2) % words.length]!, 11, 5.4, bg, fg, false);
    m.position.set(s.x, s.y, s.z);
    m.rotation.y = s.ry;
    scene.add(m);
  });

  /* ---------- the fleet, the station: models that load after the first frame ---------- */
  type Fleet = { mesh: THREE.InstancedMesh; n: number; base: number };
  let fleet: Fleet[] | null = null;
  let kindsLoaded = 0;
  const VEHICLES = 13;
  const vehicleData = Array.from({ length: VEHICLES }, (_, i) => ({ u: rnd(), sp: (0.012 + rnd() * 0.016) * (i % 2 ? 1 : -1), off: (i % 2 ? 1 : -1) * (2.6 + (i % 3) * 1.4) }));
  const carFront = (g: THREE.BufferGeometry | null) => g?.rotateY(-Math.PI / 2) ?? null; // the cars' front is +X; vehicles drive along +Z
  void Promise.all([loadModel(c.models.truck), loadModel(c.models.moto), ...(c.models.cars ?? []).map((url) => loadModel(url).then(carFront))]).then(([truck, moto, ...cars]) => {
    const kinds = [
      { g: truck ?? truckFallback(), n: 3, size: 3.8 },
      { g: moto ?? truckFallback(), n: 3, size: 2.6 },
      ...cars.map((g, i) => ({ g, n: i ? 3 : 4, size: 3.4 })).filter((k): k is { g: THREE.BufferGeometry; n: number; size: number } => k.g !== null),
    ];
    let base = 0;
    fleet = kinds.slice(0, 4).map((k) => {
      const mesh = new THREE.InstancedMesh(fit(k.g.clone(), k.size), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.6, metalness: 0.2 }), k.n);
      mesh.frustumCulled = false;
      const tones = [p.red, p.paper, grey(0.17), p.red];
      for (let i = 0; i < k.n; i += 1) mesh.setColorAt(i, col.copy(tones[(i + base) % 4]!));
      scene.add(mesh);
      const entry = { mesh, n: k.n, base };
      base += k.n;
      return entry;
    });
    kindsLoaded = kinds.length;
    c.onModels();
  });
  if (c.models.station) {
    void loadModel(c.models.station).then((g) => {
      if (!g) return;
      g.translate(-12, 0, 0); // centre the 24 m platform on its own origin
      const mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8, metalness: 0.1 }), 1);
      mesh.frustumCulled = false;
      rail.frameAt(rail.u(3, 0), f);
      dummy.position.set(f.p.x + f.R.x * VIADUCT_LAT, VIADUCT_Y + 0.1, f.p.z + f.R.z * VIADUCT_LAT);
      dummy.rotation.set(0, yaw(f.T) - Math.PI / 2, 0);
      dummy.scale.setScalar(1.15);
      dummy.updateMatrix();
      mesh.setMatrixAt(0, dummy.matrix);
      mesh.setColorAt(0, col.copy(p.paper));
      scene.add(mesh);
      stationCount = 1;
      c.onModels();
    });
  }

  const beam = (() => {
    const pivot = new THREE.Group();
    pivot.position.set(f2.p.x + f2.T.x * 70, 41, f2.p.z + f2.T.z * 70);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 60), new THREE.MeshBasicMaterial({ color: p.paper }));
    arm.position.set(0, 0, -30);
    pivot.add(arm);
    scene.add(pivot);
    return pivot;
  })();

  const place = (time: number, reduce: boolean) => {
    // Traffic: a lane each way down the avenue.
    if (fleet) {
      for (const k of fleet) {
        for (let i = 0; i < k.n; i += 1) {
          const v = vehicleData[k.base + i]!;
          const dir = v.sp > 0 ? 1 : -1;
          const u = (((v.u + (reduce ? 0 : time * v.sp)) % 1) + 1) % 1;
          rail.frameAt(u, f);
          dummy.position.set(f.p.x + f.R.x * v.off, 0.9, f.p.z + f.R.z * v.off);
          dummy.lookAt(dummy.position.x + f.T.x * dir, dummy.position.y, dummy.position.z + f.T.z * dir);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          k.mesh.setMatrixAt(i, dummy.matrix);
        }
        k.mesh.instanceMatrix.needsUpdate = true;
      }
    }
    // Two trains on the viaduct, shuttling along it.
    const head = reduce ? 0.35 : (time * 0.045) % 1;
    for (let i = 0; i < trainCars; i += 1) {
      const train = i < 5 ? 0 : 1;
      const slot = i % 5;
      const phase = ((head + train * 0.5 - slot * (8.2 / viaductLength)) % 1 + 1) % 1;
      rail.frameAt(vu0 + phase * (vu1 - vu0), f);
      dummy.position.set(f.p.x + f.R.x * (VIADUCT_LAT + (train ? 1.5 : -1.5)), VIADUCT_Y + 1.6, f.p.z + f.R.z * (VIADUCT_LAT + (train ? 1.5 : -1.5)));
      dummy.rotation.set(0, yaw(f.T), 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      trains.setMatrixAt(i, dummy.matrix);
    }
    trains.instanceMatrix.needsUpdate = true;
    beam.rotation.y = reduce ? 2.2 : time * 0.7;
  };

  return {
    place,
    get landmarks() {
      return landmarkCount;
    },
    vehicleKinds: () => kindsLoaded,
    stations: () => stationCount,
    repaintText: () => painters.forEach((paint) => paint()),
  };
}
