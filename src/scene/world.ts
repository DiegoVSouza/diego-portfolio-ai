import * as THREE from "three";
import { V3, bar, fit, mergeGeometries, tick, tint } from "./geometry";
import { loadModel } from "./loaders";
import type { Frame, Rail } from "./rail";
import { truckFallback } from "./symbols";
import type { Palette } from "./tokens";

export interface WorldStop {
  id: string;
  /** Index of the district this stop belongs to. */
  district: number;
  /** Text on the stop's billboard: the project name, and a short line under it. */
  title: string;
  tag: string;
  /** A wider card (the hero and the terminal), so a wider billboard. */
  wide: boolean;
}

export interface WorldContext {
  scene: THREE.Scene;
  p: Palette;
  rnd: () => number;
  rail: Rail;
  stops: WorldStop[];
  districtCount: number;
  /** The line on the arrival gate. */
  headline: string;
  models: { truck: string; moto: string; buildings?: string[]; cars?: string[]; station?: string; /** Metro cars: head, middle, tail (Kenney Train Kit, CC0, with a baked palette). */ trains?: string[] };
  /** Called when a model has loaded after the first frame, so the scene draws again. */
  onModels(): void;
}

export interface World {
  /** Put every moving thing where it belongs at `time` seconds. Called each frame in motion, once in static modes. */
  place(time: number, reduce: boolean): void;
  /** How many skyline buildings come from the real models (zero when they failed to load). */
  readonly landmarks: number;
  vehicleKinds(): number;
  stations(): number;
  /** Which train is on the viaduct: the Kenney metro cars, or the generated fallback. */
  trainKind(): "kenney" | "procedural";
  /** Sign text is painted again once the display font is ready. */
  repaintText(): void;
}

/** World width of a card's billboard, in units: it matches the card (520 px, or 640 px for the wide ones) at the distance of its stop. */
export const BILLBOARD_WIDTH = 22;
export const BILLBOARD_WIDTH_WIDE = 27;
const BILLBOARD_RATIO = 0.68;

type Part = THREE.BufferGeometry;

/**
 * The city, laid out around the rail. Six districts, each with its own built form, and one billboard per stop: the card hangs there,
 * so the visitor sees it in its part of the city before the camera arrives. Static geometry is merged per district (the camera culls
 * whole districts), moving things are instanced, nothing spins or floats, and every colour is a mix of the design tokens. Real models
 * (buildings, cars, metro station) replace generated ones when they load.
 */
export async function buildWorld(c: WorldContext): Promise<World> {
  const { scene, p, rnd, rail, stops } = c;
  const D = c.districtCount;
  const grey = (t: number) => p.mix(p.ink, p.paper, t);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const f = { p: V3(0, 0, 0), T: V3(0, 0, 0), R: V3(0, 0, 0) } as Frame;
  const f2 = { p: V3(0, 0, 0), T: V3(0, 0, 0), R: V3(0, 0, 0) } as Frame;
  const anchor = V3(0, 0, 0);
  const yaw = (T: THREE.Vector3) => Math.atan2(T.x, T.z);
  const face = (x: number, z: number) => Math.atan2(x, z);
  /** First and last stop of each district. */
  const first = Array.from({ length: D }, (_, d) => stops.findIndex((s) => s.district === d));
  const last = Array.from({ length: D }, (_, d) => stops.map((s) => s.district).lastIndexOf(d));

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
  const flatMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6, metalness: 0.2 });
  /**
   * A model with a baked palette (scripts/glb_bake_palette.py) carries two numbers per vertex, not a colour: lightness and accent.
   * The shader mixes the design tokens with them (ink to paper by lightness, then to the accent colour), so the model follows the tokens.
   */
  const paletteMat = () => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.55, metalness: 0.25 });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uInk = { value: p.ink };
      shader.uniforms.uPaper = { value: p.paper };
      shader.uniforms.uRed = { value: p.red };
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uInk;\nuniform vec3 uPaper;\nuniform vec3 uRed;")
        .replace("#include <color_fragment>", "diffuseColor.rgb = mix(mix(uInk, uPaper, vColor.r), uRed, vColor.g);");
    };
    return m;
  };

  /* ---------- building blocks ---------- */
  const parts: Part[][] = Array.from({ length: D }, () => []);
  const realParts: Part[][] = Array.from({ length: D }, () => []);
  const beacons: Part[] = [];
  const signSpots: { x: number; y: number; z: number; ry: number }[] = [];

  /** A box with the window texture mapped to its sides (the top and bottom sample the dark corner), tinted, turned and placed. */
  const solid = (d: number, w: number, h: number, dd: number, x: number, y0: number, z: number, ry: number, tone: THREE.Color, windows = true) => {
    const g = new THREE.BoxGeometry(w, h, dd);
    const uv = g.attributes.uv!;
    for (let i = 0; i < uv.count; i += 1) {
      const side = Math.floor(i / 4);
      if (!windows || side === 2 || side === 3) uv.setXY(i, 0.02, 0.02);
      else uv.setXY(i, (uv.getX(i) * (side < 2 ? dd : w)) / 3.2, (uv.getY(i) * h) / 4);
    }
    g.rotateY(ry);
    g.translate(x, y0 + h / 2, z);
    tint(g, tone);
    parts[d]!.push(g);
  };
  /** A square bar between two points, as a structural part (no windows). */
  const strut = (d: number, a: THREE.Vector3, b: THREE.Vector3, w: number, tone: THREE.Color) => {
    const g = bar(a, b, w);
    const uv = g.attributes.uv!;
    for (let i = 0; i < uv.count; i += 1) uv.setXY(i, 0.02, 0.02);
    tint(g, tone);
    parts[d]!.push(g);
  };
  const beacon = (x: number, y: number, z: number, s = 0.6) => beacons.push(new THREE.BoxGeometry(s, s, s).translate(x, y, z));
  const toneTower = () => (rnd() < 0.16 ? p.dred : rnd() < 0.5 ? grey(0.28) : grey(0.19));

  /* ---------- real buildings, when they load ---------- */
  const protos = (await Promise.all((c.models.buildings ?? []).map((url) => loadModel(url))))
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
  const landmark = (d: number, x: number, z: number, towardsX: number, towardsZ: number, height: number): boolean => {
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
    realParts[d]!.push(g);
    landmarkCount += 1;
    return true;
  };

  /** District d covers the path from half a stop before its first stop to half a stop after its last (the first reaches the start, the last the end). */
  const span = (d: number): [number, number] => [d === 0 ? 0 : rail.u(first[d]!, -0.5), d === D - 1 ? 1 : rail.u(last[d]!, 0.5)];

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
  /** The right-hand side keeps clear for the billboards: nothing stands closer than this to the avenue there. */
  const RIGHT_CLEAR = 34;
  /** Towers on both sides of the avenue for district d. Returns where they stood, for features that sit on roofs. */
  const lane = (d: number, o: Lane) => {
    const [u0, u1] = span(d);
    const placed: { x: number; z: number; w: number; dd: number; h: number; ry: number; s: number }[] = [];
    let signsLeft = o.signs ?? 0;
    for (let n = 0; n < o.count; n += 1) {
      rail.frameAt(u0 + rnd() * (u1 - u0), f);
      const s = o.side ?? (n % 2 ? 1 : -1);
      const w = o.wMin + rnd() * (o.wMax - o.wMin);
      const dd = o.wMin + rnd() * (o.wMax - o.wMin);
      const h = o.hMin + rnd() * (o.hMax - o.hMin);
      // The nearest face stands at least `latMin` from the avenue's middle (more on the right, where the billboards are).
      const near = s > 0 ? Math.max(o.latMin, RIGHT_CLEAR) : o.latMin;
      const lat = near + w / 2 + rnd() * (o.latMax - o.latMin);
      const x = f.p.x + f.R.x * s * lat;
      const z = f.p.z + f.R.z * s * lat + (rnd() - 0.5) * 5;
      const ry = yaw(f.T);
      if (o.realEvery && n % o.realEvery === 0 && landmark(d, x, z, -f.R.x * s, -f.R.z * s, h)) {
        if (rnd() < 0.5) beacon(x, h + 0.3, z);
        placed.push({ x, z, w, dd, h, ry, s });
        continue;
      }
      solid(d, w, h, dd, x, 0, z, ry, toneTower());
      if (rnd() < 0.5) beacon(x + (rnd() - 0.5) * w * 0.6, h + 0.3, z);
      if (signsLeft > 0 && h > 24) {
        signSpots.push({ x: f.p.x + f.R.x * s * (lat - w / 2 - 0.12), y: h * (0.4 + rnd() * 0.3), z: f.p.z + f.R.z * s * (lat - w / 2 - 0.12), ry: face(-f.R.x * s, -f.R.z * s) });
        signsLeft -= 1;
      }
      placed.push({ x, z, w, dd, h, ry, s });
    }
    return placed;
  };

  await tick();
  /* ---------- the street: ground, avenue, sidewalks, lane marks, lamps ---------- */
  rail.frameAt(1, f2);
  rail.frameAt(rail.u(stops.length - 1, 0.55), f);
  const shoreZ = f.p.z;
  const groundDepth = 160 - shoreZ;
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
    t.repeat.set(1000 / 30, groundDepth / 30);
    t.magFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1000, groundDepth), new THREE.MeshBasicMaterial({ map: t }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, -0.06, (160 + shoreZ) / 2);
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

  /* ---------- district 0, ARRIVAL: the avenue into town, with a gate ---------- */
  await tick();
  lane(0, { count: 20, latMin: 17, latMax: 50, hMin: 16, hMax: 58, wMin: 4, wMax: 9, realEvery: 3, signs: 4 });
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

  /* ---------- district 1, OPS: a control tower with setbacks and a beacon ---------- */
  await tick();
  lane(1, { count: 14, latMin: 18, latMax: 48, hMin: 14, hMax: 36, wMin: 5, wMax: 9, realEvery: 3, signs: 2 });
  {
    rail.frameAt(rail.u(first[1]!, 0.4), f);
    const ry = yaw(f.T);
    const cx = f.p.x - f.R.x * 32;
    const cz = f.p.z - f.R.z * 32;
    solid(1, 16, 30, 16, cx, 0, cz, ry, grey(0.2));
    solid(1, 11, 18, 11, cx, 30, cz, ry, grey(0.26));
    solid(1, 6, 12, 6, cx, 48, cz, ry, p.dred);
    solid(1, 17, 1, 17, cx, 29.6, cz, ry, p.red, false);
    solid(1, 12, 0.8, 12, cx, 47.6, cz, ry, p.red, false);
    strut(1, V3(cx, 60, cz), V3(cx, 76, cz), 0.4, grey(0.4));
    strut(1, V3(cx - 3, 66, cz), V3(cx + 3, 66, cz), 0.3, grey(0.4));
    beacon(cx, 76.5, cz, 1.2);
  }

  /* ---------- district 2, CORE: a dense glass core joined by sky bridges ---------- */
  await tick();
  lane(2, { count: 46, latMin: 15, latMax: 62, hMin: 44, hMax: 98, wMin: 5, wMax: 11, realEvery: 4, signs: 5 });
  for (let k = first[2]!; k <= last[2]!; k += 1) {
    rail.frameAt(rail.u(k, -0.3), f);
    const ry = yaw(f.T);
    const y = 36 + (k % 3) * 5;
    solid(2, 54, 2.6, 4.2, f.p.x, y, f.p.z, ry, grey(0.32));
    solid(2, 54, 0.5, 0.5, f.p.x, y - 0.4, f.p.z, ry, p.red, false);
    for (const s of [-1, 1]) strut(2, V3(f.p.x + f.R.x * s * 27, y, f.p.z + f.R.z * s * 27), V3(f.p.x + f.R.x * s * 27, y - 12, f.p.z + f.R.z * s * 27), 0.5, grey(0.4));
  }

  /* ---------- district 3, PLATFORM: an elevated viaduct on the left, a metro station and trains ---------- */
  await tick();
  lane(3, { count: 22, latMin: 36, latMax: 62, hMin: 20, hMax: 54, wMin: 5, wMax: 10, realEvery: 4, side: -1, signs: 2 });
  lane(3, { count: 8, latMin: 36, latMax: 60, hMin: 14, hMax: 30, wMin: 5, wMax: 9, side: 1 });
  const VIADUCT_LAT = -19;
  const VIADUCT_Y = 15;
  /** Each of the two tracks runs this far from the viaduct's middle. */
  const LANE = 2.8;
  const [vu0, vu1] = [rail.u(first[3]!, -0.45), rail.u(last[3]!, 0.45)];
  const viaductLength = (vu1 - vu0) * rail.length;
  {
    const segments = Math.ceil(viaductLength / 7);
    for (let i = 0; i < segments; i += 1) {
      rail.frameAt(vu0 + ((i + 0.5) / segments) * (vu1 - vu0), f);
      const x = f.p.x + f.R.x * VIADUCT_LAT;
      const z = f.p.z + f.R.z * VIADUCT_LAT;
      const ry = yaw(f.T);
      solid(3, 10.4, 1.4, 7.6, x, VIADUCT_Y - 1.4, z, ry, grey(0.24), false);
      // Two tracks, two rails each.
      for (const lane of [-LANE, LANE]) for (const s of [-1, 1]) solid(3, 0.3, 0.3, 7.6, x + f.R.x * (lane + s * 1.3), VIADUCT_Y, z + f.R.z * (lane + s * 1.3), ry, grey(0.5), false);
      if (i % 2 === 0) solid(3, 3, VIADUCT_Y - 1.4, 2.4, x, 0, z, ry, grey(0.18), false);
    }
  }
  let stationCount = 0;

  /**
   * One metro car, 9.4 long: a dark underframe with two bogies and wheels, a body in three bands (paper, windows, paper) with a red stripe,
   * door recesses, a roof with air-conditioning units; the head car adds a cab with a windshield and headlights. Vertex colours, one mesh.
   */
  const trainCar = (head: boolean): Part => {
    const g: Part[] = [];
    const add = (w: number, h: number, d: number, x: number, y: number, z: number, tone: THREE.Color) => g.push(tint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), tone));
    const dark = p.mix(p.ink, p.paper, 0.06);
    add(3.0, 0.5, 8.8, 0, 0.75, 0, grey(0.14)); // underframe
    for (const z of [-3, 3]) {
      add(2.7, 0.45, 2.6, 0, 0.45, z, grey(0.1)); // bogie
      for (const x of [-1.25, 1.25]) for (const dz of [-0.8, 0.8]) g.push(tint(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 10).rotateZ(Math.PI / 2).translate(x, 0.42, z + dz), grey(0.3)));
    }
    add(3.4, 0.95, 9.2, 0, 1.55, 0, p.paper); // lower body
    add(3.44, 0.3, 9.22, 0, 1.95, 0, p.red); // stripe
    add(3.42, 1.05, 8.4, 0, 2.55, 0, dark); // window band
    for (let i = 0; i < 6; i += 1) add(3.45, 0.08, 0.1, 0, 2.55, -3.9 + i * 1.56, grey(0.25)); // window posts
    add(3.4, 0.55, 9.2, 0, 3.35, 0, p.paper); // upper body
    for (const z of [-2.5, 2.5]) add(3.46, 1.9, 1.0, 0, 2.0, z, grey(0.2)); // door recesses
    add(3.0, 0.22, 8.8, 0, 3.72, 0, grey(0.45)); // roof
    for (const z of [-2.3, 2.3]) add(1.5, 0.42, 2.3, 0, 4.0, z, grey(0.38)); // air-conditioning
    if (head) {
      add(3.3, 1.2, 0.25, 0, 2.45, 4.7, dark); // windshield
      add(3.4, 0.55, 0.3, 0, 3.35, 4.75, p.red); // visor
      for (const x of [-1.1, 1.1]) add(0.5, 0.32, 0.12, x, 1.2, 4.78, p.paper); // headlights
    }
    // Merge needs the same attributes everywhere: cylinders and boxes both carry position, normal, uv and colour.
    return mergeGeometries(g)!;
  };
  const TRAINS = 2;
  const MIDS = 3;
  // The procedural train is the fallback; the Kenney metro cars replace it when they load.
  let heads = new THREE.InstancedMesh(trainCar(true), flatMat(), TRAINS * 2);
  let mids = new THREE.InstancedMesh(trainCar(false), flatMat(), TRAINS * MIDS);
  let tails: THREE.InstancedMesh | null = null;
  heads.frustumCulled = false;
  mids.frustumCulled = false;
  scene.add(heads, mids);
  let realTrain = false;

  /* ---------- district 4, CRAFT: low rooftops with billboards, scaffolding and a crane ---------- */
  await tick();
  const low = lane(4, { count: 40, latMin: 14, latMax: 58, hMin: 7, hMax: 22, wMin: 6, wMax: 14, signs: 0 });
  const roofSigns: { x: number; y: number; z: number; ry: number }[] = [];
  low.filter((b) => b.h > 12).slice(0, 6).forEach((b, i) => {
    const frame = (dx: number, dy: number) => V3(b.x + Math.cos(b.ry) * dx, b.h + dy, b.z - Math.sin(b.ry) * dx);
    for (const dx of [-5, 5]) strut(4, frame(dx, 0), frame(dx, 6.5), 0.35, grey(0.5));
    strut(4, frame(-5, 6.5), frame(5, 6.5), 0.35, p.red);
    roofSigns.push({ x: b.x, y: b.h + 3.4, z: b.z, ry: face(-b.s, 0) + (i % 2 ? 0.2 : -0.2) });
  });
  low.filter((b) => b.h > 9).slice(6, 9).forEach((b) => {
    for (let level = 0; level < 4; level += 1) {
      const y = b.h + level * 3;
      strut(4, V3(b.x - b.w / 2, y, b.z + b.dd / 2 + 0.8), V3(b.x + b.w / 2, y, b.z + b.dd / 2 + 0.8), 0.22, grey(0.45));
    }
    for (let i = 0; i <= 4; i += 1) {
      const x = b.x - b.w / 2 + (i * b.w) / 4;
      strut(4, V3(x, b.h, b.z + b.dd / 2 + 0.8), V3(x, b.h + 9, b.z + b.dd / 2 + 0.8), 0.22, grey(0.45));
    }
  });
  {
    rail.frameAt(rail.u(last[4]!, 0.3), f);
    const cx = f.p.x - f.R.x * 36;
    const cz = f.p.z - f.R.z * 36;
    strut(4, V3(cx, 0, cz), V3(cx, 46, cz), 1.1, grey(0.35));
    strut(4, V3(cx - f.R.x * 12, 46, cz - f.R.z * 12), V3(cx + f.R.x * 22, 46, cz + f.R.z * 22), 0.7, p.red);
    strut(4, V3(cx + f.R.x * 18, 46, cz + f.R.z * 18), V3(cx + f.R.x * 18, 34, cz + f.R.z * 18), 0.14, grey(0.6));
    solid(4, 3, 3, 3, cx - f.R.x * 10, 42.5, cz - f.R.z * 10, 0, grey(0.3), false);
    beacon(cx, 47.2, cz, 0.9);
  }

  /* ---------- district 5, TERMINAL: a harbour, container stacks, cranes and a lighthouse ---------- */
  await tick();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1000, 480), new THREE.MeshBasicMaterial({ color: p.mix(p.ink, p.dred, 0.5) }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.4, shoreZ - 240);
  scene.add(water);
  {
    rail.frameAt(rail.u(stops.length - 1, 0.55), f);
    const quay = new THREE.Mesh(new THREE.BoxGeometry(46, 0.7, 170), new THREE.MeshBasicMaterial({ color: grey(0.12) }));
    quay.position.set(f.p.x, -0.1, shoreZ - 65);
    scene.add(quay);
    const streaks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.05, 6), new THREE.MeshBasicMaterial({ color: p.paper }), 46);
    streaks.frustumCulled = false;
    for (let i = 0; i < streaks.count; i += 1) {
      dummy.position.set(f.p.x + (rnd() - 0.5) * 360, -0.34, shoreZ - 30 - rnd() * 200);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 0.5 + rnd() * 2);
      dummy.updateMatrix();
      streaks.setMatrixAt(i, dummy.matrix);
    }
    scene.add(streaks);
    // Container stacks beside the avenue, in a few colours; the right-hand side stays clear for the billboard.
    const stackCount = 48;
    const stacks = new THREE.InstancedMesh(new THREE.BoxGeometry(2.8, 2.8, 6.4), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8, metalness: 0.1 }), stackCount);
    stacks.frustumCulled = false;
    const tones = [p.red, p.paper, grey(0.32), p.dred, grey(0.18)];
    const lastStop = stops.length - 1;
    for (let i = 0; i < stackCount; i += 1) {
      const s = i % 2 ? 1 : -1;
      const row = Math.floor(i / 2) % 8;
      const level = Math.floor(i / 16);
      rail.frameAt(rail.u(lastStop, -0.45 + row * 0.12), f);
      const lat = s > 0 ? 38 + (i % 3) * 3.2 : 15 + (i % 3) * 3.2;
      dummy.position.set(f.p.x + f.R.x * s * lat, 1.4 + level * 2.8, f.p.z + f.R.z * s * lat);
      dummy.rotation.set(0, yaw(f.T), 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      stacks.setMatrixAt(i, dummy.matrix);
      stacks.setColorAt(i, col.copy(tones[Math.floor(rnd() * tones.length)]!));
    }
    scene.add(stacks);
    // Portal cranes straddling the left stacks.
    for (let j = 0; j < 3; j += 1) {
      rail.frameAt(rail.u(lastStop, -0.35 + j * 0.3), f);
      const a = f.p.clone().addScaledVector(f.R, -28);
      const b = f.p.clone().addScaledVector(f.R, -10);
      for (const q of [a, b]) strut(5, V3(q.x, 0, q.z), V3(q.x, 26, q.z), 0.8, grey(0.4));
      strut(5, V3(a.x, 26, a.z), V3(b.x, 26, b.z), 1, p.red);
      beacon(a.x, 27.5, a.z, 0.7);
    }
    // The lighthouse at the end of the quay.
    rail.frameAt(rail.u(lastStop, 0.55), f);
    const lx = f.p.x;
    const lz = shoreZ - 130;
    solid(5, 9, 22, 9, lx, 0, lz, 0, grey(0.24));
    solid(5, 6, 16, 6, lx, 22, lz, 0, grey(0.3));
    solid(5, 7, 1, 7, lx, 38, lz, 0, p.red, false);
    solid(5, 3.4, 4, 3.4, lx, 39, lz, 0, p.paper, false);
    beacon(lx, 44, lz, 2);
  }

  /* ---------- one billboard per stop: the card's place in the city ---------- */
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
        const fs = Math.min(84, Math.floor((470 / Math.max(4, chars.length)) * 1.7));
        x.font = `400 ${fs}px Anton, Impact, sans-serif`;
        x.fillText(chars.join(""), cv.width / 2, cv.height / 2 + 4);
      }
      map.needsUpdate = true;
    };
    paint();
    painters.push(paint);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map }));
  };
  /** The billboard of one stop: the number outlined, the name in up to three lines, a line under it, on the card's own colours. */
  const makeBillboard = (index: number, w: number, h: number): THREE.Mesh => {
    const stop = stops[index]!;
    const cv = document.createElement("canvas");
    cv.width = 1024;
    cv.height = Math.round(1024 * BILLBOARD_RATIO);
    const map = new THREE.CanvasTexture(cv);
    map.colorSpace = THREE.SRGBColorSpace;
    const paint = () => {
      const x = cv.getContext("2d")!;
      x.fillStyle = p.css(p.ink);
      x.fillRect(0, 0, cv.width, cv.height);
      x.fillStyle = p.css(p.red);
      x.fillRect(0, 0, 26, cv.height);
      x.strokeStyle = p.css(p.paper);
      x.lineWidth = 10;
      x.strokeRect(5, 5, cv.width - 10, cv.height - 10);
      x.textBaseline = "alphabetic";
      x.textAlign = "right";
      x.font = "400 250px Anton, Impact, sans-serif";
      x.lineWidth = 6;
      x.strokeStyle = p.css(p.red);
      x.strokeText(String(index + 1).padStart(2, "0"), cv.width - 50, 250);
      x.textAlign = "left";
      x.fillStyle = p.css(p.paper);
      const lines: string[] = [];
      let line = "";
      for (const word of stop.title.toUpperCase().split(" ")) {
        if (line && `${line} ${word}`.length > 14) {
          lines.push(line);
          line = word;
        } else line = line ? `${line} ${word}` : word;
      }
      lines.push(line);
      const rows = lines.slice(0, 3);
      const fs = rows.length > 2 ? 120 : rows.length > 1 ? 150 : 190;
      x.font = `400 ${fs}px Anton, Impact, sans-serif`;
      rows.forEach((r, i) => x.fillText(r, 70, 330 + i * fs * 0.98));
      x.fillStyle = p.css(p.red);
      x.fillRect(70, cv.height - 176, 300, 24);
      x.fillStyle = p.css(p.paper);
      x.font = '700 42px "Courier Prime", "Courier New", monospace';
      x.fillText(stop.tag.toUpperCase().slice(0, 34), 70, cv.height - 70);
      map.needsUpdate = true;
    };
    paint();
    painters.push(paint);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map }));
  };
  stops.forEach((stop, k) => {
    const w = stop.wide ? BILLBOARD_WIDTH_WIDE : BILLBOARD_WIDTH;
    const h = w * BILLBOARD_RATIO;
    rail.cardAnchor(k, anchor, f);
    // It faces the camera's approach (back along the avenue), turned a little toward the avenue.
    const ry = face(-f.T.x - 0.35 * f.R.x, -f.T.z - 0.35 * f.R.z);
    const m = makeBillboard(k, w, h);
    m.position.copy(anchor);
    m.rotation.y = ry;
    scene.add(m);
    // A plinth and a frame, so it stands on the ground and reads as a screen, not a floating plane.
    const bottom = anchor.y - h / 2;
    solid(stop.district, w * 0.5, bottom, 1.8, anchor.x, 0, anchor.z, ry, grey(0.2), false);
    const side = (s: number) => V3(anchor.x + Math.cos(ry) * s * (w / 2 + 0.3), 0, anchor.z - Math.sin(ry) * s * (w / 2 + 0.3));
    for (const s of [-1, 1]) {
      const b = side(s);
      strut(stop.district, V3(b.x, bottom, b.z), V3(b.x, bottom + h, b.z), 0.6, p.red);
      beacon(b.x, bottom + h + 0.6, b.z, 0.7);
    }
    strut(stop.district, V3(side(-1).x, bottom + h, side(-1).z), V3(side(1).x, bottom + h, side(1).z), 0.5, p.red);
    strut(stop.district, V3(side(-1).x, bottom, side(-1).z), V3(side(1).x, bottom, side(1).z), 0.5, p.red);
  });

  /* ---------- merge every district ---------- */
  await tick();
  for (let d = 0; d < D; d += 1) {
    if (parts[d]!.length) scene.add(new THREE.Mesh(mergeGeometries(parts[d]!)!, windowMat));
    if (realParts[d]!.length) scene.add(new THREE.Mesh(mergeGeometries(realParts[d]!)!, windowMat));
  }
  const beaconMesh = new THREE.Mesh(mergeGeometries(beacons)!, new THREE.MeshBasicMaterial({ color: p.red }));
  beaconMesh.frustumCulled = false;
  scene.add(beaconMesh);

  /* ---------- vertical neon signs on tall towers, headline over the gate, rooftop signs ---------- */
  const words = [...stops.filter((s) => s.id !== "arrival" && s.id !== "terminal").map((s) => s.title), "LIVE", "AI", "EVIDENCE"];
  signSpots.slice(0, 16).forEach((s, i) => {
    const [bg, fg] = signPairs[i % signPairs.length]!;
    const m = makeSign(words[i % words.length]!, 2.2, 8.8, bg, fg, true);
    m.position.set(s.x, s.y, s.z);
    m.rotation.y = s.ry;
    scene.add(m);
  });
  {
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

  /* ---------- the fleet and the station: models that load after the first frame ---------- */
  type Fleet = { mesh: THREE.InstancedMesh; n: number; base: number; lift: number };
  let fleet: Fleet[] | null = null;
  let kindsLoaded = 0;
  const VEHICLES = 13;
  const vehicleData = Array.from({ length: VEHICLES }, (_, i) => ({ u: rnd(), sp: (0.01 + rnd() * 0.012) * (i % 2 ? 1 : -1), off: (i % 2 ? 1 : -1) * (3 + (i % 3) * 1.8) }));
  const carFront = (g: THREE.BufferGeometry | null) => g?.rotateY(-Math.PI / 2) ?? null; // the cars' front is +X; vehicles drive along +Z
  void Promise.all([loadModel(c.models.truck), loadModel(c.models.moto), ...(c.models.cars ?? []).map((url) => loadModel(url).then(carFront))]).then(([truck, moto, ...cars]) => {
    // Sizes are the longest side in world units: a car reads as a car next to towers forty units tall.
    const kinds = [
      { g: truck ?? truckFallback(), n: 3, size: 9, lift: 2.1 },
      { g: moto ?? truckFallback(), n: 3, size: 5.2, lift: 1.4 },
      ...cars.map((g, i) => ({ g, n: i ? 3 : 4, size: 7.4, lift: 1.5 })).filter((k): k is { g: THREE.BufferGeometry; n: number; size: number; lift: number } => k.g !== null),
    ];
    let base = 0;
    fleet = kinds.slice(0, 4).map((k) => {
      const mesh = new THREE.InstancedMesh(fit(k.g.clone(), k.size), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.6, metalness: 0.2 }), k.n);
      mesh.frustumCulled = false;
      const tones = [p.red, p.paper, grey(0.17), p.red];
      for (let i = 0; i < k.n; i += 1) mesh.setColorAt(i, col.copy(tones[(i + base) % 4]!));
      scene.add(mesh);
      const entry = { mesh, n: k.n, base, lift: k.lift };
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
      rail.frameAt(rail.u(first[3]!, 0.5), f);
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

  if (c.models.trains?.length === 3) {
    void Promise.all(c.models.trains.map((url) => loadModel(url, ["color"]))).then(([head, mid, tail]) => {
      if (!head || !mid || !tail) return;
      // Scale the cars (about 2.6 long, 1.1 to 1.35 wide) to 9.4 long, and stand them on their wheels, centred on their own origin.
      const prepare = (g: THREE.BufferGeometry) => {
        g.computeBoundingBox();
        const bb = g.boundingBox!;
        g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
        return g.scale(3.6, 3.6, 3.6);
      };
      const make = (g: THREE.BufferGeometry, n: number) => {
        const m = new THREE.InstancedMesh(prepare(g), paletteMat(), n);
        m.frustumCulled = false;
        return m;
      };
      scene.remove(heads, mids);
      heads.geometry.dispose();
      mids.geometry.dispose();
      heads = make(head, TRAINS);
      mids = make(mid, TRAINS * MIDS);
      tails = make(tail, TRAINS);
      scene.add(heads, mids, tails);
      realTrain = true;
      c.onModels();
    });
  }

  const place = (time: number, reduce: boolean) => {
    // Traffic: a lane each way down the avenue.
    if (fleet) {
      for (const k of fleet) {
        for (let i = 0; i < k.n; i += 1) {
          const v = vehicleData[k.base + i]!;
          const dir = v.sp > 0 ? 1 : -1;
          const u = (((v.u + (reduce ? 0 : time * v.sp)) % 1) + 1) % 1;
          rail.frameAt(u, f);
          dummy.position.set(f.p.x + f.R.x * v.off, k.lift, f.p.z + f.R.z * v.off);
          dummy.lookAt(dummy.position.x + f.T.x * dir, dummy.position.y, dummy.position.z + f.T.z * dir);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          k.mesh.setMatrixAt(i, dummy.matrix);
        }
        k.mesh.instanceMatrix.needsUpdate = true;
      }
    }
    // Two trains, one on each track of the viaduct, head and tail cars facing out, shuttling along it.
    const head = reduce ? 0.35 : (time * 0.03) % 1;
    const length = 9.8;
    for (let t = 0; t < TRAINS; t += 1) {
      const cars = MIDS + 2;
      for (let slot = 0; slot < cars; slot += 1) {
        const phase = (((head + t * 0.5 - (slot * length) / viaductLength) % 1) + 1) % 1;
        rail.frameAt(vu0 + phase * (vu1 - vu0), f);
        const offset = VIADUCT_LAT + (t ? LANE : -LANE);
        dummy.position.set(f.p.x + f.R.x * offset, VIADUCT_Y + (realTrain ? 0.35 : 0.1), f.p.z + f.R.z * offset);
        const isHead = slot === 0;
        const isTail = slot === cars - 1;
        // A model faces +z. The first car leads with its own nose; the last one is the other end of the train: turned about, in the procedural train.
        dummy.rotation.set(0, yaw(f.T) + (isTail && !realTrain ? Math.PI : 0), 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        if (isHead) heads.setMatrixAt(realTrain ? t : t * 2, dummy.matrix);
        else if (isTail) {
          if (realTrain && tails) tails.setMatrixAt(t, dummy.matrix);
          else heads.setMatrixAt(t * 2 + 1, dummy.matrix);
        } else mids.setMatrixAt(t * MIDS + (slot - 1), dummy.matrix);
      }
    }
    heads.instanceMatrix.needsUpdate = true;
    mids.instanceMatrix.needsUpdate = true;
    if (tails) tails.instanceMatrix.needsUpdate = true;
  };

  return {
    place,
    get landmarks() {
      return landmarkCount;
    },
    vehicleKinds: () => kindsLoaded,
    stations: () => stationCount,
    trainKind: () => (realTrain ? "kenney" : "procedural"),
    repaintText: () => painters.forEach((paint) => paint()),
  };
}
