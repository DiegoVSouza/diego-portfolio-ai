import * as THREE from "three";
import { V3, bar, fit, mergeGeometries, tick, tint } from "./geometry";
import { loadModel } from "./loaders";
import { BOARD_BEAM_DEPTH, BOARD_BEAM_Z, BOARD_POST_DEPTH, BOARD_POST_Z, BOARD_WIDTH, ROAD_EXTRA, shotOf, trainLead } from "./layout";
import { cardSide, type Frame, type Rail } from "./rail";
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
  /** The four corners of stop k's board in the world: top left, top right, bottom right, bottom left, as seen from the front. */
  boardCorners(k: number, out: THREE.Vector3[]): void;
}

/** World width of a board, in units, before it is fitted to its card; the board is never taller than BOARD_MAX_HEIGHT. */
export const BILLBOARD_WIDTH = BOARD_WIDTH;
/** Height over width: the card is 640 by 460 px (src/styles/site.css), so the board has the same proportions. */
const BILLBOARD_RATIO = 460 / 640;
const BOARD_MAX_HEIGHT = 30;
/** Roof the building keeps in front of a rooftop billboard, so it stands on the roof and not on its edge. */
const ROOF_APRON = 12;
/** Boards with a frame, lamps and a catwalk: the card covers the inner part only, so the frame stays visible around it. */
const CARD_INSET = 0.9;
const framed = (kind: string): boolean => kind === "post" || kind === "roof" || kind === "under";

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
  /** The street goes on ROAD_EXTRA stops past the last stop; the harbour waits at the far end of it. */
  const endStop = stops.length - 1 + ROAD_EXTRA;
  /** Cross streets: u of each one, kept clear of towers. Filled when the street is built, read by `lane`. */
  const crossUs: number[] = [];
  const shotYaw: number[] = [];
  /** Where something already stands (a circle on the ground): a tower is not placed on top of another, or on a board's building. */
  const footprints: { x: number; z: number; r: number }[] = [];
  const collides = (x: number, z: number, r: number): boolean => footprints.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + r);
  /**
   * The building a board hangs on (none for a post board). It is a whole building, not a slab: as wide as the board plus a margin,
   * deep, with a setback on top, standing behind the board. Computed before the towers so they keep clear of it.
   */
  interface Block {
    x: number;
    z: number;
    ry: number;
    width: number;
    depth: number;
    height: number;
    bottom: number;
    roof: boolean;
    boardH: number;
  }
  const blocks: (Block | null)[] = stops.map((_, k) => {
    const shot = shotOf(k);
    const at = rail.cardAnchor(k, V3(0, 0, 0));
    const cam = rail.cameraAt(k, V3(0, 0, 0));
    // The board faces the camera of its shot, turned a little toward the avenue.
    const ry = Math.atan2(cam.x - at.x, cam.z - at.z) + 0.1 * cardSide(k);
    shotYaw[k] = ry;
    if (shot.kind === "post" || shot.kind === "under") return null;
    const boardW = BOARD_WIDTH * shot.scale;
    const boardH = Math.min(BOARD_MAX_HEIGHT, boardW * BILLBOARD_RATIO);
    const roof = shot.kind === "roof";
    const width = boardW + (roof ? 14 : 12);
    // A roof billboard stands well back from the roof's edge: the roof goes on for ROOF_APRON in front of it.
    const depth = roof ? 36 + ROOF_APRON : 34;
    const height = roof ? shot.board.bottom : shot.board.bottom + boardH + 16;
    const back = roof ? depth / 2 - ROOF_APRON : 1 + depth / 2;
    const block = { x: at.x - Math.sin(ry) * back, z: at.z - Math.cos(ry) * back, ry, width, depth, height, bottom: shot.board.bottom, roof, boardH };
    footprints.push({ x: block.x, z: block.z, r: Math.max(width, depth) * 0.62 + 3 });
    return block;
  });
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
  /** Horizontal signs on the avenue-facing wall of a building, at street height. */
  const wallSpots: { x: number; y: number; z: number; ry: number }[] = [];

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
      // Old exports omit normals; Blender exports include them. Keep merged attributes consistent.
      if (!g.hasAttribute("normal")) g.computeVertexNormals();
      g.computeBoundingBox();
      const bb = g.boundingBox!;
      g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
      return { g, height: bb.max.y - bb.min.y, span: Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) };
    });
  let landmarkCount = 0;
  let heavyUsed = 0;
  /** A real building (its front is +Z) facing `towards`, scaled to `height`. Returns false when no model is available. */
  const landmark = (d: number, x: number, z: number, towardsX: number, towardsZ: number, height: number): boolean => {
    if (!protos.length) return false;
    const i = landmarkCount % protos.length;
    // Keep the sample landmark at most twice to preserve the skyline composition.
    if (i === protos.length - 1 && protos.length > 3 && heavyUsed >= 2) return false;
    const proto = protos[i]!;
    const s = height / proto.height;
    if (collides(x, z, (s * proto.span) / 2)) return false;
    if (i === protos.length - 1 && protos.length > 3) heavyUsed += 1;
    footprints.push({ x, z, r: (s * proto.span) / 2 });
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
    /** Horizontal signs on walls facing the avenue, low enough to read from the street. */
    walls?: number;
    /** Tower id stays free of cross streets (default true). */
    clear?: boolean;
    /** Stop the lane at this u instead of the district's end. */
    until?: number;
  }
  /** Side streets: half the carriageway, the pavement on each side of it, and how far they reach from the avenue. */
  const CROSS_HALF = 6;
  const SIDEWALK = 3;
  const CROSS_REACH = 150;
  /** Both sides keep clear for the billboards (they alternate): nothing stands closer than this to the avenue. */
  const SIDE_CLEAR = 34;
  /** Towers on both sides of the avenue for district d. Returns where they stood, for features that sit on roofs. */
  const lane = (d: number, o: Lane) => {
    const [u0, u1Span] = span(d);
    const u1 = o.until ?? u1Span;
    const placed: { x: number; z: number; w: number; dd: number; h: number; ry: number; s: number }[] = [];
    let signsLeft = o.signs ?? 0;
    let wallsLeft = o.walls ?? 0;
    // A tower whose footprint would cross a side street is skipped and another is drawn, up to three tries per tower.
    for (let attempt = 0, n = 0; n < o.count && attempt < o.count * 6; attempt += 1) {
      const uPick = u0 + rnd() * (u1 - u0);
      rail.frameAt(uPick, f);
      const s = o.side ?? (n % 2 ? 1 : -1);
      const w = o.wMin + rnd() * (o.wMax - o.wMin);
      const dd = o.wMin + rnd() * (o.wMax - o.wMin);
      const h = o.hMin + rnd() * (o.hMax - o.hMin);
      // The nearest face stands at least `latMin` from the avenue's middle (billboards hang on both sides).
      const near = Math.max(o.latMin, SIDE_CLEAR);
      const lat = near + w / 2 + rnd() * (o.latMax - o.latMin);
      const x = f.p.x + f.R.x * s * lat;
      const z = f.p.z + f.R.z * s * lat + (rnd() - 0.5) * 5;
      const ry = yaw(f.T);
      // Nothing stands on top of another tower or on the building a board hangs on: overlapping boxes flicker where their faces meet.
      if (collides(x, z, Math.max(w, dd) * 0.62)) continue;
      if (o.clear !== false && crossUs.some((cu) => Math.abs(uPick - cu) * rail.length < CROSS_HALF + SIDEWALK + Math.max(dd, 9) / 2 + 3)) continue;
      n += 1;
      if (o.realEvery && (n - 1) % o.realEvery === 0 && landmark(d, x, z, -f.R.x * s, -f.R.z * s, h)) {
        if (rnd() < 0.5) beacon(x, h + 0.3, z);
        placed.push({ x, z, w, dd, h, ry, s });
        continue;
      }
      const towerTone = toneTower();
      // A street-level plinth and a recessed crown give the generated skyline a readable silhouette.
      const crown = h > 28 ? Math.min(7, h * 0.14) : 0;
      solid(d, w, h - crown, dd, x, 0, z, ry, towerTone);
      if (crown) {
        solid(d, w * 0.72, crown, dd * 0.76, x, h - crown, z, ry, towerTone);
        solid(d, w * 0.76, 0.35, dd * 0.8, x, h - crown, z, ry, grey(0.4), false);
      }
      solid(d, w + 0.45, 0.55, dd + 0.45, x, 0, z, ry, grey(0.24), false);
      // Roof plant is deliberately large enough to read from the distant camera.
      if (n % 3 === 0) solid(d, w * 0.28, 1.2, dd * 0.4, x, h, z, ry, grey(0.36), false);
      footprints.push({ x, z, r: Math.max(w, dd) * 0.62 });
      if (rnd() < 0.5) beacon(x + (rnd() - 0.5) * w * 0.6, h + 0.3, z);
      if (signsLeft > 0 && h > 24) {
        signSpots.push({ x: f.p.x + f.R.x * s * (lat - w / 2 - 0.12), y: h * (0.4 + rnd() * 0.3), z: f.p.z + f.R.z * s * (lat - w / 2 - 0.12), ry: face(-f.R.x * s, -f.R.z * s) });
        signsLeft -= 1;
      }
      if (wallsLeft > 0 && h > 10 && w > 5) {
        wallSpots.push({ x: f.p.x + f.R.x * s * (lat - w / 2 - 0.12), y: 5 + rnd() * Math.min(10, h - 9), z: f.p.z + f.R.z * s * (lat - w / 2 - 0.12) + (rnd() - 0.5) * 2, ry: face(-f.R.x * s, -f.R.z * s) });
        wallsLeft -= 1;
      }
      placed.push({ x, z, w, dd, h, ry, s });
    }
    return placed;
  };

  await tick();
  /* ---------- the street: ground, avenue, sidewalks, lane marks, lamps ---------- */
  rail.frameAt(1, f2);
  rail.frameAt(rail.u(endStop, 0.55), f);
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

  /* ---------- side streets: one in every gap between two stops, on both sides of the avenue ---------- */
  {
    const asphalt = { pos: [] as number[], idx: [] as number[] };
    const pavement = { pos: [] as number[], idx: [] as number[] };
    const slab = (to: typeof asphalt, latA: number, latB: number, alongA: number, alongB: number, y: number) => {
      const base = to.pos.length / 3;
      for (const [lat, along] of [[latA, alongA], [latB, alongA], [latB, alongB], [latA, alongB]] as const) {
        to.pos.push(f.p.x + f.R.x * lat + f.T.x * along, y, f.p.z + f.R.z * lat + f.T.z * along);
      }
      to.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    const dashes: { x: number; z: number; ry: number }[] = [];
    for (let k = 0; k <= endStop - 2; k += 1) {
      const u = rail.u(k, 0.62);
      crossUs.push(u);
      rail.frameAt(u, f);
      for (const side of [-1, 1]) {
        const a = side * 8;
        const b = side * CROSS_REACH;
        slab(asphalt, a, b, -CROSS_HALF, CROSS_HALF, 0.12);
        slab(pavement, a, b, CROSS_HALF, CROSS_HALF + SIDEWALK, 0.13);
        slab(pavement, a, b, -CROSS_HALF - SIDEWALK, -CROSS_HALF, 0.13);
        for (let lat = 18; lat < CROSS_REACH; lat += 9) dashes.push({ x: f.p.x + f.R.x * side * lat, z: f.p.z + f.R.z * side * lat, ry: yaw(f.T) });
      }
    }
    const build = (src: typeof asphalt, tone: THREE.Color) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(src.pos, 3));
      g.setIndex(src.idx);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: tone, side: THREE.DoubleSide }));
      m.frustumCulled = false;
      scene.add(m);
    };
    build(asphalt, p.ink2);
    build(pavement, grey(0.1));
    const dashMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(3, 0.05, 0.35), new THREE.MeshBasicMaterial({ color: p.paper }), dashes.length);
    dashMesh.frustumCulled = false;
    dashes.forEach((d, i) => {
      dummy.position.set(d.x, 0.15, d.z);
      dummy.rotation.set(0, d.ry, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      dashMesh.setMatrixAt(i, dummy.matrix);
    });
    scene.add(dashMesh);
  }

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
    new THREE.CylinderGeometry(0.13, 0.23, 6.6, 6).translate(0, 3.6, 0),
    new THREE.CylinderGeometry(0.35, 0.42, 0.6, 6).translate(0, 0.3, 0),
    new THREE.BoxGeometry(2.6, 0.22, 0.26).translate(1.2, 6.9, 0),
    new THREE.BoxGeometry(1.35, 0.28, 0.7).translate(2.25, 6.65, 0),
    bar(V3(0, 5.8, 0), V3(1.7, 6.8, 0), 0.12),
  ])!;
  const lampSlots = Math.floor(rail.length / 22) * 2;
  /**
   * A lamp post on a board's side of the avenue, between the camera's stop and the board, would stand in front of the board in 3D while
   * the card (drawn over the canvas) hides it: it flickers in front of the sign as the card fades. Those lamps are left out.
   */
  const blocksBoard = (u: number, side: number): boolean => {
    for (let k = 0; k < stops.length; k += 1) {
      const shot = shotOf(k);
      // Shots that look across the avenue or down a side street lose the lamps on both sides near them.
      const both = shot.kind === "side" || shot.kind === "curb" || shot.kind === "roof" || shot.kind === "under";
      if (!both && cardSide(k) !== side) continue;
      const from = rail.u(k, Math.min(shot.cam.ahead, shot.board.ahead));
      const to = rail.u(k, Math.max(shot.cam.ahead, shot.board.ahead));
      const slack = 0.3 / (rail.length / 85);
      if (u > from - slack && u < to + slack + (both ? 0.1 : 0)) return true;
    }
    return false;
  };
  const lampList: { u: number; s: 1 | -1; i: number }[] = [];
  for (let i = 0; i < lampSlots; i += 1) {
    const s = i % 2 ? 1 : -1;
    const u = (Math.floor(i / 2) + 0.5) / (lampSlots / 2);
    if (!blocksBoard(u, s)) lampList.push({ u, s, i });
  }
  const lamps = new THREE.InstancedMesh(lampGeo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.7, metalness: 0.2 }), lampList.length);
  lamps.frustumCulled = false;
  lampList.forEach(({ u, s, i }, n) => {
    rail.frameAt(u, f);
    dummy.position.set(f.p.x + f.R.x * s * 11.5, 0, f.p.z + f.R.z * s * 11.5);
    dummy.rotation.set(0, Math.atan2(f.R.z * s, -f.R.x * s), 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    lamps.setMatrixAt(n, dummy.matrix);
    lamps.setColorAt(n, col.copy(i % 6 < 2 ? p.red : grey(0.3)));
  });
  scene.add(lamps);

  /* ---------- district 0, ARRIVAL: the avenue into town, with a gate ---------- */
  await tick();
  const roofSigns: { x: number; y: number; z: number; ry: number }[] = [];
  /** A frame on a roof that carries a horizontal sign, turned a little toward the avenue. */
  const roofFrame = (d: number, b: { x: number; z: number; h: number; ry: number; s: number }, i: number) => {
    const frame = (dx: number, dy: number) => V3(b.x + Math.cos(b.ry) * dx, b.h + dy, b.z - Math.sin(b.ry) * dx);
    for (const dx of [-5, 5]) strut(d, frame(dx, 0), frame(dx, 6.5), 0.35, grey(0.5));
    strut(d, frame(-5, 6.5), frame(5, 6.5), 0.35, p.red);
    roofSigns.push({ x: b.x, y: b.h + 3.4, z: b.z, ry: face(-b.s, 0) + (i % 2 ? 0.2 : -0.2) });
  };
  const roofsOf = (d: number, list: { x: number; z: number; h: number; ry: number; s: number; w: number }[], minH: number, count: number) =>
    list.filter((b) => b.h > minH && b.w >= 6).slice(0, count).forEach((b, i) => roofFrame(d, b, i));
  const l0 = lane(0, { count: 20, latMin: 17, latMax: 50, hMin: 16, hMax: 58, wMin: 4, wMax: 9, realEvery: 3, signs: 4, walls: 8 });
  roofsOf(0, l0, 20, 3);
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
  const l1 = lane(1, { count: 14, latMin: 18, latMax: 48, hMin: 14, hMax: 36, wMin: 5, wMax: 9, realEvery: 3, signs: 2, walls: 6 });
  roofsOf(1, l1, 18, 3);
  // (A stepped landmark tower stood here, 32 to the side of the avenue: right where the facade board of stop 2 hangs. It showed through the card.)

  /* ---------- district 2, CORE: a dense glass core joined by sky bridges ---------- */
  await tick();
  const l2 = lane(2, { count: 46, latMin: 15, latMax: 62, hMin: 44, hMax: 98, wMin: 5, wMax: 11, realEvery: 4, signs: 5, walls: 10 });
  roofsOf(2, l2, 60, 4);
  for (let k = first[2]!; k <= last[2]!; k += 1) {
    rail.frameAt(rail.u(k, -0.3), f);
    const ry = yaw(f.T);
    const y = 36 + (k % 3) * 5;
    solid(2, 54, 2.6, 4.2, f.p.x, y, f.p.z, ry, grey(0.32));
    solid(2, 54, 0.5, 0.5, f.p.x, y - 0.4, f.p.z, ry, p.red, false);
    for (const s of [-1, 1]) strut(2, V3(f.p.x + f.R.x * s * 27, y, f.p.z + f.R.z * s * 27), V3(f.p.x + f.R.x * s * 27, y - 12, f.p.z + f.R.z * s * 27), 0.5, grey(0.4));
  }

  /* ---------- district 3, PLATFORM: an elevated viaduct beside the avenue, a metro station and trains ---------- */
  await tick();
  lane(3, { count: 22, latMin: 56, latMax: 82, hMin: 20, hMax: 54, wMin: 5, wMax: 10, realEvery: 4, side: -1, signs: 2, walls: 6 });
  lane(3, { count: 8, latMin: 56, latMax: 80, hMin: 14, hMax: 30, wMin: 5, wMax: 9, side: 1 });
  /**
   * A viaduct on each side of the avenue, past the boards, at about eye height: from the street the trains cross the view at an angle
   * instead of coming end-on, so they read. The boards alternate sides, so the viaduct opposite the active board is the one in the clear.
   */
  const VIADUCT_LAT = -42;
  const VIADUCT_Y = 14;
  /** Each of the two tracks runs this far from the viaduct's middle. */
  const LANE = 3.7;
  // The viaduct runs a stop and a bit beyond each end of the district, so a train is nearly always in view ahead of the camera there.
  const [vu0, vu1] = [rail.u(first[3]!, -1.2), rail.u(last[3]!, 1.2)];
  const viaductLength = (vu1 - vu0) * rail.length;
  for (const side of [-1, 1]) {
    const segments = Math.ceil(viaductLength / 7);
    for (let i = 0; i < segments; i += 1) {
      rail.frameAt(vu0 + ((i + 0.5) / segments) * (vu1 - vu0), f);
      const x = f.p.x + f.R.x * side * 42;
      const z = f.p.z + f.R.z * side * 42;
      const ry = yaw(f.T);
      solid(3, 14, 1.4, 7.6, x, VIADUCT_Y - 1.4, z, ry, grey(0.24), false);
      // Two tracks, two rails each.
      for (const lane of [-LANE, LANE]) for (const s of [-1, 1]) solid(3, 0.3, 0.3, 7.6, x + f.R.x * (lane + s * 1.8), VIADUCT_Y, z + f.R.z * (lane + s * 1.8), ry, grey(0.5), false);
      // The pillar is left out where a board stands under the deck (it would stand in the board).
      const uSeg = vu0 + ((i + 0.5) / segments) * (vu1 - vu0);
      const blocked = stops.some((_, k) => {
        const shot = shotOf(k);
        return shot.kind === "under" && Math.sign(shot.board.lat) === side && Math.abs(uSeg - rail.u(k, shot.board.ahead)) * rail.length < 12;
      });
      if (i % 2 === 0 && !blocked) solid(3, 3, VIADUCT_Y - 1.4, 2.4, x, 0, z, ry, grey(0.18), false);
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
  // Two trains per viaduct: the first two on the left one, the others on the right one.
  const TRAINS = 4;
  /** The trains are drawn larger than life, so they read from the avenue across a long street. A car is 2.6 long in the model. */
  const TRAIN_SCALE = 5.2;
  /** Seconds for one trip there and back. */
  const TRAIN_CYCLE = 60;
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
  const low = lane(4, { count: 40, latMin: 14, latMax: 58, hMin: 7, hMax: 22, wMin: 6, wMax: 14, signs: 0, walls: 8 });
  roofsOf(4, low, 12, 6);
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

  /* ---------- district 5, TERMINAL: the avenue goes on past the last stop, towers on both sides, and the harbour waits at its far end ---------- */
  await tick();
  const l5 = lane(5, { count: 64, latMin: 17, latMax: 62, hMin: 14, hMax: 64, wMin: 5, wMax: 11, realEvery: 4, signs: 3, walls: 8, until: rail.u(endStop, -0.7) });
  roofsOf(5, l5, 24, 5);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1000, 480), new THREE.MeshBasicMaterial({ color: p.mix(p.ink, p.dred, 0.5) }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.4, shoreZ - 240);
  scene.add(water);
  {
    rail.frameAt(rail.u(endStop, 0.55), f);
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
    // Container stacks beside the avenue, in a few colours; the left-hand side stays clear for the last billboard.
    const stackCount = 48;
    const stacks = new THREE.InstancedMesh(new THREE.BoxGeometry(2.8, 2.8, 6.4), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8, metalness: 0.1 }), stackCount);
    stacks.frustumCulled = false;
    const tones = [p.red, p.paper, grey(0.32), p.dred, grey(0.18)];
    const lastStop = endStop;
    for (let i = 0; i < stackCount; i += 1) {
      const s = i % 2 ? 1 : -1;
      const row = Math.floor(i / 2) % 8;
      const level = Math.floor(i / 16);
      rail.frameAt(rail.u(lastStop, -0.45 + row * 0.12), f);
      const lat = s < 0 ? 38 + (i % 3) * 3.2 : 15 + (i % 3) * 3.2;
      dummy.position.set(f.p.x + f.R.x * s * lat, 1.4 + level * 2.8, f.p.z + f.R.z * s * lat);
      dummy.rotation.set(0, yaw(f.T), 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      stacks.setMatrixAt(i, dummy.matrix);
      stacks.setColorAt(i, col.copy(tones[Math.floor(rnd() * tones.length)]!));
    }
    scene.add(stacks);
    // Portal cranes straddling the right stacks.
    for (let j = 0; j < 3; j += 1) {
      rail.frameAt(rail.u(lastStop, -0.35 + j * 0.3), f);
      const a = f.p.clone().addScaledVector(f.R, 28);
      const b = f.p.clone().addScaledVector(f.R, 10);
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
    // Lamp posts along both edges of the quay.
    for (let i = 0; i < 8; i += 1) {
      for (const side of [-1, 1]) {
        const lampZ = shoreZ - 8 - i * 17;
        strut(5, V3(f.p.x + side * 21, 0, lampZ), V3(f.p.x + side * 21, 9, lampZ), 0.3, grey(0.4));
        beacon(f.p.x + side * 21, 9.4, lampZ, 0.7);
      }
    }
    // A cargo ship at the left of the quay: a hull, a bridge, a funnel and a deck of containers.
    const shipX = f.p.x - 40;
    const shipZ = shoreZ - 70;
    solid(5, 13, 5, 44, shipX, -1.5, shipZ, 0, grey(0.18), false);
    solid(5, 13.4, 0.8, 44.4, shipX, 3.4, shipZ, 0, p.red, false);
    solid(5, 10, 8, 9, shipX, 4.2, shipZ + 16, 0, grey(0.3));
    solid(5, 3, 4, 3, shipX, 12.2, shipZ + 16, 0, p.red, false);
    beacon(shipX, 16.6, shipZ + 16, 0.8);
    const deck = [p.red, p.paper, grey(0.32), p.dred];
    for (let row = 0; row < 4; row += 1) for (let col = 0; col < 2; col += 1) {
      solid(5, 5, 3, 7, shipX + (col ? 3 : -3), 4.2 + (row % 2 ? 3 : 0), shipZ - 14 + row * 8, 0, deck[(row + col) % deck.length]!, false);
    }
  }

  /* ---------- one billboard per stop: the card's place in the city ---------- */
  const signPairs: [THREE.Color, THREE.Color][] = [[p.red, p.paper], [p.paper, p.ink2], [p.ink2, p.red], [p.red, p.ink2], [p.paper, p.red], [p.ink2, p.paper]];
  const painters: (() => void)[] = [];
  /** Signs with the same text and colours share one texture and one material; the geometry is shared per size. */
  const signMaterials = new Map<string, THREE.MeshBasicMaterial>();
  const signGeometries = new Map<string, THREE.PlaneGeometry>();
  const makeSign = (text: string, w: number, h: number, bg: THREE.Color, fg: THREE.Color, vertical: boolean): THREE.Mesh => {
    const key = `${text}|${bg.getHexString()}|${fg.getHexString()}|${vertical ? "v" : "h"}`;
    const known = signMaterials.get(key);
    if (known) {
      const sizeKey = `${w}x${h}`;
      let geometry = signGeometries.get(sizeKey);
      if (!geometry) signGeometries.set(sizeKey, (geometry = new THREE.PlaneGeometry(w, h)));
      return new THREE.Mesh(geometry, known);
    }
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
    const material = new THREE.MeshBasicMaterial({ map });
    signMaterials.set(key, material);
    const sizeKey = `${w}x${h}`;
    let geometry = signGeometries.get(sizeKey);
    if (!geometry) signGeometries.set(sizeKey, (geometry = new THREE.PlaneGeometry(w, h)));
    return new THREE.Mesh(geometry, material);
  };
  /** The painted face of a board: the number outlined, the name in up to three lines, a line under it. The card hides it when it is near. */
  const boardRatio: number[] = stops.map(() => BILLBOARD_RATIO);
  const makeBillboardMap = (index: number): { map: THREE.CanvasTexture; paint: () => void } => {
    const stop = stops[index]!;
    const cv = document.createElement("canvas");
    cv.width = 1024;
    cv.height = 1024;
    const map = new THREE.CanvasTexture(cv);
    map.colorSpace = THREE.SRGBColorSpace;
    const paint = () => {
      const x = cv.getContext("2d")!;
      const r = boardRatio[index]!;
      const H = Math.round(1024 * r);
      // Design space is 1024 by H; the texture is square, and the plane is as tall as it is wide times r, so the stretch cancels.
      x.setTransform(1, 0, 0, 1 / r, 0, 0);
      x.fillStyle = p.css(p.ink);
      x.fillRect(0, 0, 1024, H);
      x.fillStyle = p.css(p.red);
      x.fillRect(0, 0, 26, H);
      x.strokeStyle = p.css(p.paper);
      x.lineWidth = 10;
      x.strokeRect(5, 5, 1024 - 10, H - 10);
      x.textBaseline = "alphabetic";
      x.textAlign = "right";
      x.font = "400 250px Anton, Impact, sans-serif";
      x.lineWidth = 6;
      x.strokeStyle = p.css(p.red);
      x.strokeText(String(index + 1).padStart(2, "0"), 1024 - 50, 250);
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
      rows.forEach((row, i) => x.fillText(row, 70, 330 + i * fs * 0.98));
      x.fillStyle = p.css(p.red);
      x.fillRect(70, H - 176, 300, 24);
      x.fillStyle = p.css(p.paper);
      x.font = '700 42px "Courier Prime", "Courier New", monospace';
      x.fillText(stop.tag.toUpperCase().slice(0, 34), 70, H - 70);
      map.needsUpdate = true;
    };
    paint();
    painters.push(paint);
    return { map, paint };
  };
  /**
   * One board per stop, standing on two red posts. The card IS the board's face: the scene fits the card to the board's four corners
   * in perspective, so it leans, shrinks and foreshortens with the street. Until the card is near, the painted face shows.
   */
  interface Board {
    group: THREE.Group;
    panel: THREE.Mesh;
    posts: THREE.Mesh[];
    beams: THREE.Mesh[];
    repaint: () => void;
    width: number;
    height: number;
  }
  const frameMat = new THREE.MeshBasicMaterial({ color: p.red });
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  /**
   * What makes a board a billboard: a row of floodlights on arms over its top edge, each with a cone of light on the face, a row of bulbs
   * along the top and bottom beams, a catwalk with a rail under it, and a steel brace behind. The metro-viaduct board has the bulbs only
   * (the deck is right over it).
   */
  const lampMat = new THREE.MeshBasicMaterial({ color: p.paper });
  const glowMat = new THREE.MeshBasicMaterial({ color: p.paper, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const steelMat = new THREE.MeshBasicMaterial({ color: grey(0.32) });
  const dress = (b: Board, kind: string, bottom: number) => {
    const g = b.group;
    const w = b.width;
    const top = bottom + b.height;
    // Everything is merged: three meshes per billboard (steel, lamps and bulbs, light cones), so the draw-call budget holds.
    const steel: Part[] = [];
    const lit: Part[] = [];
    const glow: Part[] = [];
    const place = (geo: Part, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, quat?: THREE.Quaternion): Part => {
      dummy.position.set(x, y, z);
      dummy.scale.set(sx, sy, sz);
      dummy.rotation.set(0, 0, 0);
      if (quat) dummy.quaternion.copy(quat);
      dummy.updateMatrix();
      return geo.clone().applyMatrix4(dummy.matrix);
    };
    const cube = new THREE.BoxGeometry(1, 1, 1);
    // Bulbs along the top and bottom beams.
    const bulbCount = Math.max(6, Math.round(w / 2.4));
    for (let i = 0; i < bulbCount; i += 1) {
      for (const y of [top + 0.3, bottom - 0.3]) lit.push(place(cube, -w / 2 - 0.3 + ((i + 0.5) / bulbCount) * (w + 0.6), y, -0.05, 0.34, 0.34, 0.3));
    }
    if (kind !== "under") {
      // Floodlights over the top edge, lighting the face.
      const lamps = Math.max(3, Math.round(w / 6));
      const coneH = Math.min(11, b.height * 0.7);
      const tilt = new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), Math.atan(2.4 / coneH));
      for (let i = 0; i < lamps; i += 1) {
        const x = -w / 2 + ((i + 0.5) / lamps) * w;
        steel.push(place(cube, x, top + 0.7, 1.2, 0.22, 0.22, 2.4));
        lit.push(place(cube, x, top + 0.55, 2.4, 0.9, 0.5, 0.9));
        // The cone's apex is at the lamp: tilt it about the lamp, then lay it down toward the face.
        const cone = new THREE.ConeGeometry(Math.min(3.4, w / lamps / 2 + 0.6), coneH, 14, 1, true).translate(0, -coneH / 2, 0);
        dummy.position.set(x, top + 0.4, 2.4);
        dummy.scale.set(1, 1, 1);
        dummy.quaternion.copy(tilt);
        dummy.updateMatrix();
        glow.push(cone.applyMatrix4(dummy.matrix));
      }
      // Catwalk under the face, with a rail.
      steel.push(place(cube, 0, bottom - 0.55, 1, w + 2, 0.25, 1.9));
      steel.push(place(cube, 0, bottom + 0.55, 1.9, w + 2, 0.12, 0.12));
      for (const x of [-w / 2 - 0.9, -w / 6, w / 6, w / 2 + 0.9]) steel.push(place(cube, x, bottom, 1.9, 0.12, 1.1, 0.12));
      // A brace behind each end, from the ground (or the roof) up to the top beam.
      const footing = kind === "roof" ? bottom : 0;
      for (const x of [-w / 3, w / 3]) {
        const from = V3(x, footing, -4);
        const to = V3(x, top, -0.7);
        const mid = from.clone().add(to).multiplyScalar(0.5);
        const quat = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), to.clone().sub(from).normalize());
        steel.push(place(cube, mid.x, mid.y, mid.z, 0.3, 0.3, from.distanceTo(to), quat));
      }
    }
    if (steel.length) g.add(new THREE.Mesh(mergeGeometries(steel)!, steelMat));
    g.add(new THREE.Mesh(mergeGeometries(lit)!, lampMat));
    if (glow.length) {
      const beams = new THREE.Mesh(mergeGeometries(glow)!, glowMat);
      beams.layers.enable(1);
      g.add(beams);
    }
  };
  const boards: Board[] = stops.map((_, k) => {
    rail.cardAnchor(k, anchor);
    const shot = shotOf(k);
    const group = new THREE.Group();
    group.position.set(anchor.x, 0, anchor.z);
    group.rotation.y = shotYaw[k]!;
    const painted = makeBillboardMap(k);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: painted.map, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    const posts = [0, 1].map(() => new THREE.Mesh(unitBox, frameMat));
    const beams = [0, 1].map(() => new THREE.Mesh(unitBox, frameMat));
    group.add(panel, ...posts, ...beams);
    scene.add(group);
    const board: Board = { group, panel, posts, beams, repaint: painted.paint, width: 1, height: 1 };
    fitBoard(board, (BILLBOARD_WIDTH * shot.scale) / (framed(shot.kind) ? CARD_INSET : 1), BILLBOARD_RATIO, shot.board.bottom, shot.kind);
    // A board on a building: the whole building stands behind it (see `blocks`), with a setback on top and a beacon.
    const block = blocks[k];
    if (block) {
      solid(stops[k]!.district, block.width, block.height, block.depth, block.x, 0, block.z, block.ry, block.roof ? grey(0.26) : grey(0.2));
      // A beacon on a corner of the roof (never a box in the middle: it would show behind the card as a building inside a building).
      beacon(block.x + Math.cos(block.ry) * block.width * 0.4, block.height + 0.4, block.z - Math.sin(block.ry) * block.width * 0.4);
    }
    if (shot.kind === "post" || shot.kind === "roof" || shot.kind === "under") dress(board, shot.kind, shot.board.bottom);
    return board;
  });
  function fitBoard(b: Board, baseWidth: number, ratio: number, bottom: number, kind: string) {
    // Keep the card's proportions; a tall card makes a narrower board so it never grows past the screen.
    const h = Math.min(BOARD_MAX_HEIGHT, baseWidth * ratio);
    const w = h / ratio;
    b.width = w;
    b.height = h;
    const mid = bottom + h / 2;
    b.panel.scale.set(w, h, 1);
    b.panel.position.set(0, mid, 0);
    // Posts run from the ground (post board) or from the roof (roof billboard); a board on a wall has none, the wall holds it.
    const hasPosts = kind === "post" || kind === "roof" || kind === "under";
    const footing = kind === "roof" ? bottom : 0;
    b.posts.forEach((post, i) => {
      const side = i ? 1 : -1;
      post.visible = hasPosts;
      post.scale.set(0.7, bottom + h - footing, BOARD_POST_DEPTH);
      post.position.set(side * (w / 2 + 0.35), footing + (bottom + h - footing) / 2, BOARD_POST_Z);
    });
    b.beams.forEach((beam, i) => {
      beam.scale.set(w + 1.4, 0.6, BOARD_BEAM_DEPTH);
      beam.position.set(0, i ? bottom + h + 0.3 : bottom - 0.3, BOARD_BEAM_Z);
    });
    b.group.updateMatrixWorld(true);
  }
  const corner = V3(0, 0, 0);
  const CORNERS: [number, number][] = [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]];
  const board = (k: number) => boards[k]!;

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
  // Horizontal signs on walls facing the avenue, so the city has lettering at street height and not only on the road and the roofs.
  const wallWords = [...words, "OPEN", "24H", "TRACE", "EVAL", "AGENTS", "RAG", "MCP"];
  wallSpots.forEach((s, i) => {
    const [bg, fg] = signPairs[(i * 5 + 1) % signPairs.length]!;
    const m = makeSign(wallWords[(i * 3) % wallWords.length]!, 9, 2.25, bg, fg, false);
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
  type Fleet = { mesh: THREE.InstancedMesh; wheels?: THREE.InstancedMesh; n: number; base: number; lift: number };
  let fleet: Fleet[] | null = null;
  let kindsLoaded = 0;
  const VEHICLES = 13;
  const KERB_CARS = 3;
  const KERB_TRAFFIC = stops.map((_, k) => k).filter((k) => shotOf(k).kind === "curb");
  const vehicleData = Array.from({ length: VEHICLES }, (_, i) => ({
    u: i < KERB_TRAFFIC.length * KERB_CARS ? (i % KERB_CARS) / KERB_CARS + 0.1 * (i % 2) : rnd(),
    sp: (0.01 + rnd() * 0.012) * (i % 2 ? 1 : -1),
    off: (i % 2 ? 1 : -1) * (3 + (i % 3) * 1.8) * (i < KERB_TRAFFIC.length * KERB_CARS ? 0.8 : 1),
  }));
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
      mesh.layers.enable(1);
      mesh.frustumCulled = false;
      const tones = [p.red, p.paper, grey(0.17), p.red];
      for (let i = 0; i < k.n; i += 1) mesh.setColorAt(i, col.copy(tones[(i + base) % 4]!));
      scene.add(mesh);
      // The S64 source contains a body shell only. Fill its four wheel arches with dark wheels.
      let wheels: THREE.InstancedMesh | undefined;
      if (cars[1] && k.g === cars[1]) {
        const wheelParts: THREE.BufferGeometry[] = [];
        for (const x of [-1.36, 1.36]) for (const z of [-2.47, 2.52]) {
          wheelParts.push(new THREE.CylinderGeometry(0.53, 0.53, 0.35, 12).rotateZ(Math.PI / 2).translate(x, -0.72, z));
        }
        wheels = new THREE.InstancedMesh(mergeGeometries(wheelParts)!, new THREE.MeshStandardMaterial({ color: p.ink, flatShading: true, roughness: 0.9 }), k.n);
        wheels.frustumCulled = false;
        wheels.layers.enable(1);
        scene.add(wheels);
      }
      const entry: Fleet = { mesh, wheels, n: k.n, base, lift: k.lift };
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
      // Scale the cars (about 2.6 long, 1.1 to 1.35 wide) to TRAIN_SCALE, and stand them on their wheels, centred on their own origin.
      const prepare = (g: THREE.BufferGeometry) => {
        g.computeBoundingBox();
        const bb = g.boundingBox!;
        g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
        return g.scale(TRAIN_SCALE, TRAIN_SCALE, TRAIN_SCALE);
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
          const index = k.base + i;
          let u: number;
          if (index < KERB_TRAFFIC.length * KERB_CARS) {
            // The kerb stops get their own cars, looping up and down the avenue in front of the camera so some always cross the board.
            const stop = KERB_TRAFFIC[Math.floor(index / KERB_CARS)]!;
            const frac = (((v.u + (reduce ? 0 : (time * dir) / 7)) % 1) + 1) % 1;
            u = rail.u(stop, -0.5 + frac * 1.4);
          } else u = (((v.u + (reduce ? 0 : time * v.sp)) % 1) + 1) % 1;
          rail.frameAt(u, f);
          dummy.position.set(f.p.x + f.R.x * v.off, k.lift, f.p.z + f.R.z * v.off);
          dummy.lookAt(dummy.position.x + f.T.x * dir, dummy.position.y, dummy.position.z + f.T.z * dir);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          k.mesh.setMatrixAt(i, dummy.matrix);
          k.wheels?.setMatrixAt(i, dummy.matrix);
        }
        k.mesh.instanceMatrix.needsUpdate = true;
        if (k.wheels) k.wheels.instanceMatrix.needsUpdate = true;
      }
    }
    // Two trains, one on each track, shuttle along the viaduct: each eases to a stop at an end, waits, and comes back with the other
    // end leading. Nothing wraps and nothing pops: a train is always on the viaduct and always whole.
    const length = 14;
    const cars = MIDS + 2;
    const room = ((cars - 1) * length) / viaductLength;
    for (let t = 0; t < TRAINS; t += 1) {
      const q = reduce ? 0.25 + (t % 2) * 0.2 : (((time / TRAIN_CYCLE + t * 0.37) % 1) + 1) % 1;
      // The leading car's place on the viaduct, kept inside it so the whole train stays on the deck (and does not jump at the turnaround).
      const { lead, forward } = trainLead(q, room);
      const dir = forward ? 1 : -1;
      for (let slot = 0; slot < cars; slot += 1) {
        rail.frameAt(vu0 + (lead - dir * ((slot * length) / viaductLength)) * (vu1 - vu0), f);
        const offset = (t < 2 ? VIADUCT_LAT : -VIADUCT_LAT) + (t % 2 ? LANE : -LANE);
        dummy.position.set(f.p.x + f.R.x * offset, VIADUCT_Y + (realTrain ? 0.35 : 0.1), f.p.z + f.R.z * offset);
        const isHead = slot === 0;
        const isTail = slot === cars - 1;
        // A model faces +z, so a train going back turns every car about. The leading car is always the head, the last one the tail.
        dummy.rotation.set(0, yaw(f.T) + (forward ? 0 : Math.PI) + (isTail && !realTrain ? Math.PI : 0), 0);
        dummy.scale.setScalar(realTrain ? 1 : 1.45);
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
    boardCorners(k, out) {
      const b = board(k);
      const inset = framed(shotOf(k).kind) ? CARD_INSET : 1;
      CORNERS.forEach(([cx, cy], i) => out[i]!.copy(corner.set(cx * inset, cy * inset, 0)).applyMatrix4(b.panel.matrixWorld));
    },
  };
}
