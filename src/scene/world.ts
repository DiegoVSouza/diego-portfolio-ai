import * as THREE from "three";
import { V3, bar, fit, groundLift, mergeGeometries, rng, tick, tint } from "./geometry";
import { VIADUCT_OFFSET, clearRun, obbOverlap, stretchClearOf, viaductSegments } from "./corridor";
import { fadeMaterial } from "./fade";
import { FAR_FADE, skylineBlocks } from "./horizon";
import { loadModel } from "./loaders";
import { createSky } from "./sky";
import { BOARD_BEAM_DEPTH, BOARD_BEAM_Z, BOARD_POST_DEPTH, BOARD_POST_Z, BOARD_WIDTH, ROAD_EXTRA, SURROUNDINGS, TRAIN_CAR_SPACING, shotOf, trafficAt, trainLead } from "./layout";
import { cardSide, type Frame, type Rail } from "./rail";
import { propUrl } from "./props";
import { truckFallback } from "./symbols";
import type { Palette } from "./tokens";
import { editMatches, editMatrix, editPoint, worldEdits, type PropEdit } from "./world-edits";

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
  /** Hide the painted fallback face whenever its HTML card is visible. */
  setCardOverlay(k: number, visible: boolean): void;
  /** Placement reservations for the development-only spatial audit. */
  auditFootprints(): readonly { x: number; z: number; r: number; kind: string; district: number; height: number }[];
  /** Oriented boxes of generated solids (towers, board buildings, viaduct), for the development-only audit. `approx` marks imported or merged shapes. */
  auditBoxes(): readonly AuditBox[];
  /** Towers and lamps as the generator placed them (before any edit), for the atelier's World tab. */
  editables(): { towers: EditableTower[]; lamps: EditableLamp[] };
  /** Hand-placed props: the editor adds, finds and removes them while the page is open. */
  props: { add(spec: PropEdit): Promise<THREE.Object3D | null>; get(id: string): THREE.Object3D | undefined; remove(id: string): void };
}

/** A generated tower, with the id its edits are filed under (`t<district>.<n>`). Position and size are the generator's own. */
export interface EditableTower {
  id: string;
  district: number;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  ry: number;
  imported: boolean;
}
export interface EditableLamp {
  id: string;
  x: number;
  z: number;
  ry: number;
}

/** An oriented box on the ground plane: centre (x, z), size w across and d along its yaw `ry`, from y0 to y1. */
export interface AuditBox {
  kind: string;
  x: number;
  z: number;
  w: number;
  d: number;
  ry: number;
  y0: number;
  y1: number;
  approx?: boolean;
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
  const footprints: { x: number; z: number; r: number; kind: string; district: number; height: number }[] = [];
  const auditBoxes: AuditBox[] = [];
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
  const frameBlockers: { x: number; z: number; w: number; d: number; ry: number }[] = [];
  const blocks: (Block | null)[] = stops.map((_, k) => {
    const shot = shotOf(k);
    const at = rail.cardAnchor(k, V3(0, 0, 0));
    const cam = rail.cameraAt(k, V3(0, 0, 0));
    // The board faces the camera of its shot, turned a little toward the avenue.
    const ry = Math.atan2(cam.x - at.x, cam.z - at.z) + 0.1 * cardSide(k);
    shotYaw[k] = ry;
    // A post board has no building, but its frame is as tall as a building's lower half: the viaduct keeps clear of it (an "under" board
    // is meant to stand below the deck, and fitBoard keeps it there).
    if (shot.kind === "post") frameBlockers.push({ x: at.x, z: at.z, w: BOARD_WIDTH * shot.scale + 6, d: 5, ry });
    if (shot.kind === "post" || shot.kind === "under") return null;
    const boardW = BOARD_WIDTH * shot.scale;
    const boardH = Math.min(BOARD_MAX_HEIGHT, boardW * BILLBOARD_RATIO);
    const roof = shot.kind === "roof";
    const width = boardW + (roof ? 14 : 12);
    // A roof billboard stands well back from the roof's edge: the roof goes on for ROOF_APRON in front of it.
    const depth = roof ? 36 + ROOF_APRON : 34;
    const height = roof ? shot.board.bottom : shot.board.bottom + boardH + 16;
    // The wall stands clear of the frame: the posts and beam reach 1.05 behind the panel, the spot lights a little more.
    const back = roof ? depth / 2 - ROOF_APRON : 2.5 + depth / 2;
    const block = { x: at.x - Math.sin(ry) * back, z: at.z - Math.cos(ry) * back, ry, width, depth, height, bottom: shot.board.bottom, roof, boardH };
    footprints.push({ x: block.x, z: block.z, r: Math.hypot(width, depth) / 2 + 3, kind: "board-building", district: stops[k]!.district, height });
    auditBoxes.push({ kind: `board-building-${k}`, x: block.x, z: block.z, w: width, d: depth, ry, y0: 0, y1: height });
    return block;
  });
  const last = Array.from({ length: D }, (_, d) => stops.map((s) => s.district).lastIndexOf(d));
  /**
   * The line of sight from each stop's camera to its board stays clear: the card is drawn over the scene, so a tower standing between the
   * camera and the board would show the card on top of it. A chain of circles along that line, widening toward the board, keeps towers and
   * imported buildings out of it (the board's own building stands behind the board, past the last circle).
   */
  stops.forEach((stop, k) => {
    const from = rail.cameraAt(k, V3(0, 0, 0));
    const to = rail.cardAnchor(k, V3(0, 0, 0));
    const boardW = BOARD_WIDTH * shotOf(k).scale;
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    for (let along = 0; along < length - 2; along += 4) {
      const t = along / length;
      footprints.push({ x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t, r: 6 + (boardW / 2 + 2 - 6) * t, kind: "sight", district: stop.district, height: 0 });
    }
  });

  /**
   * The metro viaduct runs on each side of the avenue, past the boards. It cannot go through a building: each side keeps the longest
   * stretch that stays clear of the buildings the boards hang on, and no tower is placed on that stretch (see `lane`).
   */
  const VIADUCT_CLEARANCE = 4;
  const [vu0, vu1] = [rail.u(first[3]!, -1.2), rail.u(last[3]!, 1.2)];
  const boardBlockers = [...blocks.flatMap((b) => (b ? [{ x: b.x, z: b.z, w: b.width, d: b.depth, ry: b.ry }] : [])), ...frameBlockers];
  const viaducts = ([-1, 1] as const).map((side) => {
    const segments = viaductSegments(rail, vu0, vu1, side);
    const run = clearRun(segments, boardBlockers, VIADUCT_CLEARANCE) ?? ([0, segments.length - 1] as [number, number]);
    return { side, segments, run, drawn: segments.slice(run[0], run[1] + 1) };
  });
  const onViaduct = (x: number, z: number, w: number, dd: number, ry: number): boolean => viaducts.some((v) => v.drawn.some((seg) => obbOverlap(seg, { x, z, w, d: dd, ry }, 3)));

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
  const signSpots: { x: number; y: number; z: number; ry: number; hidden?: boolean }[] = [];
  /** Horizontal signs on the avenue-facing wall of a building, at street height. */
  const wallSpots: { x: number; y: number; z: number; ry: number; hidden?: boolean }[] = [];

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
      return { g, height: bb.max.y - bb.min.y, span: Math.hypot(bb.max.x - bb.min.x, bb.max.z - bb.min.z) };
    });
  let landmarkCount = 0;
  let heavyUsed = 0;
  /** A real building (its front is +Z) facing `towards`, scaled to `height`. Returns false when no model is available. */
  const landmark = (d: number, x: number, z: number, towardsX: number, towardsZ: number, height: number, maxRadius: number): boolean => {
    if (!protos.length) return false;
    const i = landmarkCount % protos.length;
    // Keep the sample landmark at most twice to preserve the skyline composition.
    if (i === protos.length - 1 && protos.length > 3 && heavyUsed >= 2) return false;
    const proto = protos[i]!;
    // Fit the imported footprint within the same reserved area as the generated tower.
    const s = Math.min(height / proto.height, (maxRadius * 2) / proto.span);
    if (collides(x, z, (s * proto.span) / 2)) return false;
    if (i === protos.length - 1 && protos.length > 3) heavyUsed += 1;
    footprints.push({ x, z, r: (s * proto.span) / 2, kind: `landmark-${i}`, district: d, height: s * proto.height });
    auditBoxes.push({ kind: `landmark-${i}`, x, z, w: s * proto.span, d: s * proto.span, ry: 0, y0: 0, y1: s * proto.height, approx: true });
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

  /* ---------- hand edits (phase 017): applied after the generator has drawn and reserved everything, so the random stream does not move ---------- */
  const towerSeq: number[] = Array.from({ length: D }, () => 0);
  const towerList: EditableTower[] = [];
  const settleTower = (id: string, d: number, x: number, z: number, snap: { parts: number; real: number; beacons: number; signs: number; walls: number }) => {
    const edit = worldEdits.towers[id];
    if (!edit) return;
    if (!editMatches(edit, x, z)) {
      console.warn(`world-edits: ${id} is not at ${edit.at.join(", ")} any more (it is at ${x.toFixed(1)}, ${z.toFixed(1)}); edit skipped`);
      return;
    }
    if (edit.hide) {
      parts[d]!.length = snap.parts;
      realParts[d]!.length = snap.real;
      beacons.length = snap.beacons;
      for (let i = snap.signs; i < signSpots.length; i += 1) signSpots[i]!.hidden = true;
      for (let i = snap.walls; i < wallSpots.length; i += 1) wallSpots[i]!.hidden = true;
      return;
    }
    const m = editMatrix(edit, x, z);
    for (let i = snap.parts; i < parts[d]!.length; i += 1) parts[d]![i]!.applyMatrix4(m);
    for (let i = snap.real; i < realParts[d]!.length; i += 1) realParts[d]![i]!.applyMatrix4(m);
    for (let i = snap.beacons; i < beacons.length; i += 1) beacons[i]!.applyMatrix4(m);
    for (const list of [signSpots.slice(snap.signs), wallSpots.slice(snap.walls)]) {
      for (const spot of list) {
        [spot.x, spot.y, spot.z] = editPoint(edit, x, z, spot.x, spot.y, spot.z);
        spot.ry += edit.dry ?? 0;
      }
    }
  };

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
      if (collides(x, z, Math.hypot(w + 0.45, dd + 0.45) / 2 + 1)) continue;
      if (onViaduct(x, z, w + 0.45, dd + 0.45, ry)) continue;
      if (o.clear !== false && crossUs.some((cu) => Math.abs(uPick - cu) * rail.length < CROSS_HALF + SIDEWALK + Math.max(dd, 9) / 2 + 3)) continue;
      n += 1;
      const id = `t${d}.${towerSeq[d]!++}`;
      const snap = { parts: parts[d]!.length, real: realParts[d]!.length, beacons: beacons.length, signs: signSpots.length, walls: wallSpots.length };
      const reservation = Math.hypot(w + 0.45, dd + 0.45) / 2 + 1;
      if (o.realEvery && (n - 1) % o.realEvery === 0 && landmark(d, x, z, -f.R.x * s, -f.R.z * s, h, reservation)) {
        if (rnd() < 0.5) beacon(x, footprints.at(-1)!.height + 0.3, z);
        const fp = footprints.at(-1)!;
        towerList.push({ id, district: d, x, z, w: fp.r * 1.4, d: fp.r * 1.4, h: fp.height, ry: face(-f.R.x * s, -f.R.z * s), imported: true });
        settleTower(id, d, x, z, snap);
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
      footprints.push({ x, z, r: Math.hypot(w + 0.45, dd + 0.45) / 2 + 1, kind: "generated-building", district: d, height: h });
      auditBoxes.push({ kind: "generated-building", x, z, w: w + 0.45, d: dd + 0.45, ry, y0: 0, y1: h });
      if (rnd() < 0.5) beacon(x + (rnd() - 0.5) * w * 0.6, h + 0.3, z);
      if (signsLeft > 0 && h > 24) {
        signSpots.push({ x: f.p.x + f.R.x * s * (lat - w / 2 - 0.12), y: h * (0.4 + rnd() * 0.3), z: f.p.z + f.R.z * s * (lat - w / 2 - 0.12), ry: face(-f.R.x * s, -f.R.z * s) });
        signsLeft -= 1;
      }
      if (wallsLeft > 0 && h > 10 && w > 5) {
        wallSpots.push({ x: f.p.x + f.R.x * s * (lat - w / 2 - 0.12), y: 5 + rnd() * Math.min(10, h - 9), z: f.p.z + f.R.z * s * (lat - w / 2 - 0.12) + (rnd() - 0.5) * 2, ry: face(-f.R.x * s, -f.R.z * s) });
        wallsLeft -= 1;
      }
      towerList.push({ id, district: d, x, z, w, d: dd, h, ry, imported: false });
      settleTower(id, d, x, z, snap);
      placed.push({ x, z, w, dd, h, ry, s });
    }
    return placed;
  };

  await tick();
  /* ---------- the street: ground, avenue, sidewalks, lane marks, lamps ---------- */
  rail.frameAt(1, f2);
  rail.frameAt(rail.u(endStop, 0.55), f);
  // Keep the ground beyond the full road ribbon, including the avenue's sideways width at its end.
  const shoreZ = f2.p.z - 12;
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
    m.name = "ground-grid";
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
  lamps.name = "avenue-lamps";
  lamps.frustumCulled = false;
  const lampEdits: EditableLamp[] = [];
  lampList.forEach(({ u, s, i }, n) => {
    rail.frameAt(u, f);
    const lx = f.p.x + f.R.x * s * 11.5;
    const lz = f.p.z + f.R.z * s * 11.5;
    const lry = Math.atan2(f.R.z * s, -f.R.x * s);
    lampEdits.push({ id: `l${i}`, x: lx, z: lz, ry: lry });
    const lampEdit = worldEdits.lamps[`l${i}`];
    const lampOk = lampEdit && editMatches(lampEdit, lx, lz);
    if (lampEdit && !lampOk) console.warn(`world-edits: l${i} is not at ${lampEdit.at.join(", ")} any more; edit skipped`);
    dummy.position.set(lx + (lampOk ? lampEdit.dx ?? 0 : 0), 0, lz + (lampOk ? lampEdit.dz ?? 0 : 0));
    dummy.rotation.set(0, lry + (lampOk ? lampEdit.dry ?? 0 : 0), 0);
    dummy.scale.setScalar(lampOk && lampEdit.hide ? 0 : 1);
    dummy.updateMatrix();
    lamps.setMatrixAt(n, dummy.matrix);
    lamps.setColorAt(n, col.copy(i % 6 < 2 ? p.red : grey(0.3)));
  });
  scene.add(lamps);

  /* ---------- district 0, ARRIVAL: the avenue into town, with a gate ---------- */
  await tick();
  // Roof signs (a hovering sign on thin struts) are gone: under the halftone the struts vanish and the sign reads as floating.
  lane(0, { count: 20, latMin: 17, latMax: 50, hMin: 16, hMax: 58, wMin: 4, wMax: 9, realEvery: 3, signs: 4, walls: 8 });
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
  lane(1, { count: 14, latMin: 18, latMax: 48, hMin: 14, hMax: 36, wMin: 5, wMax: 9, realEvery: 3, signs: 2, walls: 6 });
  // (A stepped landmark tower stood here, 32 to the side of the avenue: right where the facade board of stop 2 hangs. It showed through the card.)

  /* ---------- district 2, CORE: a dense glass core ---------- */
  await tick();
  lane(2, { count: 46, latMin: 15, latMax: 62, hMin: 44, hMax: 98, wMin: 5, wMax: 11, realEvery: 4, signs: 5, walls: 10 });
  // (The sky bridges are gone: each was a 54 wide slab across the avenue at 36 to 46 high on two thin struts, touching no building. From the roof stop it
  // read as a road sign flying beside the card.)

  /* ---------- district 3, PLATFORM: an elevated viaduct beside the avenue, a metro station and trains ---------- */
  await tick();
  lane(3, { count: 22, latMin: 56, latMax: 82, hMin: 20, hMax: 54, wMin: 5, wMax: 10, realEvery: 4, side: -1, signs: 2, walls: 6 });
  lane(3, { count: 8, latMin: 56, latMax: 80, hMin: 14, hMax: 30, wMin: 5, wMax: 9, side: 1 });
  /**
   * A viaduct on each side of the avenue, past the boards, at about eye height: from the street the trains cross the view at an angle
   * instead of coming end-on, so they read. The boards alternate sides, so the viaduct opposite the active board is the one in the clear.
   */
  const VIADUCT_LAT = -VIADUCT_OFFSET;
  const VIADUCT_Y = 14;
  /** Each of the two tracks runs this far from the viaduct's middle. */
  const LANE = 3.7;
  // The viaduct runs a stop and a bit beyond each end of the district, so a train is nearly always in view ahead of the camera there.
  /** Each side's trains use only the drawn stretch, less half a car at each end so a nose never hangs over the edge. */
  const trackRange = viaducts.map((v) => {
    const n = v.segments.length;
    const uA = vu0 + (v.run[0] / n) * (vu1 - vu0);
    const uB = vu0 + ((v.run[1] + 1) / n) * (vu1 - vu0);
    return { start: rail.distanceAt(uA) + TRAIN_CAR_SPACING / 2, length: rail.distanceAt(uB) - rail.distanceAt(uA) - TRAIN_CAR_SPACING, uA, uB };
  });
  // The station stands on the left viaduct and a car is wider than half the deck, so no train may run through it: the left trains use the longer
  // stretch on one side of it, and stop short of its platform (half its length, plus half a car for the nose, plus a gap).
  const STATION_HALF_LENGTH = 14.4;
  const left = trackRange[0]!;
  const stationAt = rail.distanceAt(rail.u(first[3]!, 0.5));
  Object.assign(left, stretchClearOf(left.start, left.length, stationAt, STATION_HALF_LENGTH + TRAIN_CAR_SPACING / 2 + 1.5));
  for (const [index, v] of viaducts.entries()) {
    const side = v.side;
    v.drawn.forEach((seg, i) => {
      rail.frameAt(seg.u, f);
      const { x, z, ry } = seg;
      solid(3, 14, 1.4, 7.6, x, VIADUCT_Y - 1.4, z, ry, grey(0.24), false);
      auditBoxes.push({ kind: "viaduct-deck", x, z, w: 14, d: 7.6, ry, y0: VIADUCT_Y - 1.4, y1: VIADUCT_Y });
      // Two tracks, two rails each.
      for (const lane of [-LANE, LANE]) for (const s of [-1, 1]) solid(3, 0.3, 0.3, 7.6, x + f.R.x * (lane + s * 1.8), VIADUCT_Y, z + f.R.z * (lane + s * 1.8), ry, grey(0.5), false);
      // The pillar is left out where a board stands under the deck (it would stand in the board).
      const blocked = stops.some((_, k) => {
        const shot = shotOf(k);
        return shot.kind === "under" && Math.sign(shot.board.lat) === side && Math.abs(seg.u - rail.u(k, shot.board.ahead)) * rail.length < 12;
      });
      if ((i + v.run[0]) % 2 === 0 && !blocked) {
        solid(3, 3, VIADUCT_Y - 1.4, 2.4, x, 0, z, ry, grey(0.18), false);
        auditBoxes.push({ kind: "viaduct-pillar", x, z, w: 3, d: 2.4, ry, y0: 0, y1: VIADUCT_Y - 1.4 });
      }
    });
    // A buffer stop on each track at both ends of the stretch: the line ends there, it does not hang in the air.
    for (const [edge, toward] of [[trackRange[index]!.uA, 1], [trackRange[index]!.uB, -1]] as const) {
      rail.frameAt(edge, f);
      for (const lane of [-LANE, LANE]) {
        solid(3, 1.8, 1.2, 0.7, f.p.x + f.R.x * (side * VIADUCT_OFFSET + lane) + f.T.x * toward * 1.2, VIADUCT_Y, f.p.z + f.R.z * (side * VIADUCT_OFFSET + lane) + f.T.z * toward * 1.2, yaw(f.T), p.red, false);
      }
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
  heads.name = "metro-head-fallback";
  mids.name = "metro-middle-fallback";
  let tails: THREE.InstancedMesh | null = null;
  heads.frustumCulled = false;
  mids.frustumCulled = false;
  scene.add(heads, mids);
  let realTrain = false;

  /* ---------- district 4, CRAFT: low rooftops with billboards, scaffolding and a crane ---------- */
  await tick();
  const low = lane(4, { count: 40, latMin: 14, latMax: 58, hMin: 7, hMax: 22, wMin: 6, wMax: 14, signs: 0, walls: 8 });
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
  lane(5, { count: 64, latMin: 17, latMax: 62, hMin: 14, hMax: 64, wMin: 5, wMax: 11, realEvery: 4, signs: 3, walls: 8, until: rail.u(endStop, -0.7) });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1000, 480), new THREE.MeshBasicMaterial({ color: p.mix(p.ink, p.dred, 0.5) }));
  water.name = "harbour-water";
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.4, shoreZ - 240);
  scene.add(water);
  {
    rail.frameAt(rail.u(endStop, 0.55), f);
    const quay = new THREE.Mesh(new THREE.BoxGeometry(46, 0.7, 170), new THREE.MeshBasicMaterial({ color: grey(0.12) }));
    quay.name = "harbour-quay";
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
    stacks.name = "harbour-containers";
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

  /* ---------- the surroundings: two rings of dark silhouettes past the streets, so the world does not end in a void ---------- */
  if (SURROUNDINGS) {
    // Its own random source: the town's skyline above does not change when the surroundings are switched on or off.
    const blocks = skylineBlocks(rail, rng(23), { shoreZ });
    const boxes = (layer: "near" | "far", tone: () => THREE.Color, windows: boolean): Part[] =>
      blocks.filter((b) => b.layer === layer).map((b) => {
        const g = new THREE.BoxGeometry(b.w, b.h, b.d);
        const uv = g.attributes.uv!;
        for (let i = 0; i < uv.count; i += 1) {
          const side = Math.floor(i / 4);
          if (!windows || side === 2 || side === 3) uv.setXY(i, 0.02, 0.02);
          else uv.setXY(i, (uv.getX(i) * (side < 2 ? b.d : b.w)) / 3.2, (uv.getY(i) * b.h) / 4);
        }
        g.rotateY(b.ry);
        g.translate(b.x, b.h / 2, b.z);
        auditBoxes.push({ kind: `skyline-${layer}`, x: b.x, z: b.z, w: b.w, d: b.d, ry: b.ry, y0: 0, y1: b.h });
        return tint(g, tone());
      });
    // The near ring is inside the fog and fades with it. The far ring stands near the camera's far plane, where the fog has long since
    // turned everything to the background: it is drawn without fog and fades to the background by distance instead.
    const nearMesh = new THREE.Mesh(mergeGeometries(boxes("near", () => grey(0.2 + rnd() * 0.12), true))!, windowMat);
    nearMesh.name = "skyline-near";
    const farMaterial = fadeMaterial(p.ink, FAR_FADE.start, FAR_FADE.end);
    const farMesh = new THREE.Mesh(mergeGeometries(boxes("far", () => p.mix(p.ink, p.dred, 0.4 + rnd() * 0.2), false))!, farMaterial);
    farMesh.name = "skyline-far";
    scene.add(nearMesh, farMesh);
  }
  // The sky comes with the surroundings: a glow band at the horizon for the silhouettes to stand against.
  if (SURROUNDINGS) scene.add(createSky(p.ink, p.mix(p.ink, p.red, 0.55)));

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
   * What makes a board a billboard: a row of floodlights on arms over its top edge (no light cones: they drew behind the HTML card), a row of bulbs
   * along the top and bottom beams, a catwalk with a rail under it, and a steel brace behind. The metro-viaduct board has the bulbs only
   * (the deck is right over it).
   */
  const lampMat = new THREE.MeshBasicMaterial({ color: p.paper });
  const steelMat = new THREE.MeshBasicMaterial({ color: grey(0.32) });
  const dress = (b: Board, kind: string, bottom: number) => {
    const g = b.group;
    const w = b.width;
    const top = bottom + b.height;
    // Everything is merged: two meshes per billboard (steel, lamps and bulbs), so the draw-call budget holds.
    const steel: Part[] = [];
    const lit: Part[] = [];
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
      for (let i = 0; i < lamps; i += 1) {
        const x = -w / 2 + ((i + 0.5) / lamps) * w;
        steel.push(place(cube, x, top + 0.7, 1.2, 0.22, 0.22, 2.4));
        lit.push(place(cube, x, top + 0.55, 2.4, 0.9, 0.5, 0.9));
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
  };
  const boards: Board[] = stops.map((_, k) => {
    rail.cardAnchor(k, anchor);
    const shot = shotOf(k);
    const group = new THREE.Group();
    group.name = `board-${k}`;
    group.position.set(anchor.x, 0, anchor.z);
    group.rotation.y = shotYaw[k]!;
    const painted = makeBillboardMap(k);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: painted.map, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    panel.name = `board-face-${k}`;
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
    // A board under the viaduct stays below its deck (whose underside is VIADUCT_Y - 1.4), beam included.
    const cap = kind === "under" ? VIADUCT_Y - 1.4 - 1 - bottom : BOARD_MAX_HEIGHT;
    const h = Math.min(cap, baseWidth * ratio);
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
    if (parts[d]!.length) {
      const m = new THREE.Mesh(mergeGeometries(parts[d]!)!, windowMat);
      m.name = `district-${d}-generated`;
      scene.add(m);
    }
    if (realParts[d]!.length) {
      const m = new THREE.Mesh(mergeGeometries(realParts[d]!)!, windowMat);
      m.name = `district-${d}-landmarks`;
      scene.add(m);
    }
  }
  const beaconMesh = new THREE.Mesh(mergeGeometries(beacons)!, new THREE.MeshBasicMaterial({ color: p.red }));
  beaconMesh.frustumCulled = false;
  scene.add(beaconMesh);

  /* ---------- vertical neon signs on tall towers, headline over the gate, rooftop signs ---------- */
  const words = [...stops.filter((s) => s.id !== "arrival" && s.id !== "terminal").map((s) => s.title), "LIVE", "AI", "EVIDENCE"];
  signSpots.slice(0, 16).forEach((s, i) => {
    if (s.hidden) return;
    const [bg, fg] = signPairs[i % signPairs.length]!;
    const m = makeSign(words[i % words.length]!, 2.2, 8.8, bg, fg, true);
    m.position.set(s.x, s.y, s.z);
    m.rotation.y = s.ry;
    scene.add(m);
  });
  // Horizontal signs on walls facing the avenue, so the city has lettering at street height and not only on the road and the roofs.
  const wallWords = [...words, "OPEN", "24H", "TRACE", "EVAL", "AGENTS", "RAG", "MCP"];
  wallSpots.forEach((s, i) => {
    if (s.hidden) return;
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

  /* ---------- the fleet and the station: models that load after the first frame ---------- */
  type Fleet = { mesh: THREE.InstancedMesh; wheels?: THREE.InstancedMesh; n: number; base: number; lift: number };
  let fleet: Fleet[] | null = null;
  let kindsLoaded = 0;
  const VEHICLES = 13;
  /** Top of the avenue's surface: the road ribbon is at 0.03 and the lane marks at 0.07. */
  const ROAD_TOP = 0.05;
  const carFront = (g: THREE.BufferGeometry | null) => g?.rotateY(-Math.PI / 2) ?? null; // the cars' front is +X; vehicles drive along +Z
  void Promise.all([loadModel(c.models.truck), loadModel(c.models.moto), ...(c.models.cars ?? []).map((url) => loadModel(url).then(carFront))]).then(([truck, moto, ...cars]) => {
    // Sizes are the longest side in world units: a car reads as a car next to towers forty units tall.
    const kinds = [
      { g: truck ?? truckFallback(), n: 3, size: 9 },
      { g: moto ?? truckFallback(), n: 3, size: 5.2 },
      ...cars.map((g, i) => ({ g, n: i ? 3 : 4, size: 7.4 })).filter((k): k is { g: THREE.BufferGeometry; n: number; size: number } => k.g !== null),
    ];
    let base = 0;
    fleet = kinds.slice(0, 4).map((k) => {
      const body = fit(k.g.clone(), k.size);
      // The wheels are dark, like the road, so they vanish at street level. Each one gets a light hub, standing a little proud of the body.
      const tyre = grey(0.2);
      const hub = grey(0.62);
      const wheelPart = (r: number, w: number, x: number, y: number, z: number, hubRadius: number, hubWidth: number) => {
        const tyrePart = tint(new THREE.CylinderGeometry(r, r, w, 12).rotateZ(Math.PI / 2).translate(x, y, z), tyre);
        const side = Math.sign(x);
        const hubPart = tint(new THREE.CylinderGeometry(hubRadius, hubRadius, hubWidth, 12).rotateZ(Math.PI / 2).translate(x + (side * (w + hubWidth)) / 2, y, z), hub);
        return [tyrePart, hubPart];
      };
      let wheelGeometry: THREE.BufferGeometry | undefined;
      if (cars[1] && k.g === cars[1]) {
        // The S64 source contains a body shell only. Fill its four wheel arches with wheels.
        const wheelParts: THREE.BufferGeometry[] = [];
        for (const x of [-1.36, 1.36]) for (const z of [-2.47, 2.52]) wheelParts.push(...wheelPart(0.53, 0.35, x, -0.72, z, 0.3, 0.06));
        wheelGeometry = mergeGeometries(wheelParts)!;
      } else if (cars[0] && k.g === cars[0]) {
        // The R7 source has its wheels inside the body mesh (one colour), so only the hubs are added. Centres were measured on the model
        // (front axle at 88, rear at -114.5 along the length; 50 out; 20.5 up; source units) and mapped through the same centring and scale.
        k.g.computeBoundingBox();
        const bb = k.g.boundingBox!;
        const cx = (bb.min.x + bb.max.x) / 2;
        const cy = (bb.min.y + bb.max.y) / 2;
        const cz = (bb.min.z + bb.max.z) / 2;
        const scale = k.size / Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
        const hubParts: THREE.BufferGeometry[] = [];
        for (const side of [-1, 1]) for (const along of [88, -114.5]) {
          const hubGeometry = new THREE.CylinderGeometry(13 * scale, 13 * scale, 3 * scale, 12).rotateZ(Math.PI / 2);
          hubParts.push(tint(hubGeometry.translate((side * 72 - cx) * scale, (20.5 - cy) * scale, (along - cz) * scale), hub));
        }
        wheelGeometry = mergeGeometries(hubParts)!;
      }
      // Each kind stands on the road by its own lowest point (body or wheels), whatever the model's origin is.
      const lift = groundLift(wheelGeometry ? [body, wheelGeometry] : [body], ROAD_TOP);
      const mesh = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.6, metalness: 0.2 }), k.n);
      mesh.name = `fleet-${base}`;
      mesh.layers.enable(1);
      mesh.frustumCulled = false;
      const tones = [p.red, p.paper, grey(0.17), p.red];
      for (let i = 0; i < k.n; i += 1) mesh.setColorAt(i, col.copy(tones[(i + base) % 4]!));
      scene.add(mesh);
      let wheels: THREE.InstancedMesh | undefined;
      if (wheelGeometry) {
        wheels = new THREE.InstancedMesh(wheelGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }), k.n);
        wheels.name = `wheels-${base}`;
        wheels.frustumCulled = false;
        wheels.layers.enable(1);
        scene.add(wheels);
      }
      const entry: Fleet = { mesh, wheels, n: k.n, base, lift };
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
      mesh.name = "metro-station";
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
      heads.name = "metro-head";
      mids.name = "metro-middle";
      tails.name = "metro-tail";
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
          const index = k.base + i;
          const v = trafficAt(index, VEHICLES, time, reduce);
          rail.frameAt(v.u, f);
          dummy.position.set(f.p.x + f.R.x * v.lateral, k.lift, f.p.z + f.R.z * v.lateral);
          dummy.lookAt(dummy.position.x + f.T.x * v.direction, dummy.position.y, dummy.position.z + f.T.z * v.direction);
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
    // Give the 13.52-unit cars clearance on both the inside and outside of curved tracks.
    const length = TRAIN_CAR_SPACING;
    const cars = MIDS + 2;
    for (let t = 0; t < TRAINS; t += 1) {
      // Trains 0 and 1 run on the left viaduct, 2 and 3 on the right one; each uses the stretch that was drawn on its side.
      const range = trackRange[t < 2 ? 0 : 1]!;
      const room = ((cars - 1) * length) / range.length;
      const q = reduce ? 0.25 + (t % 2) * 0.2 : (((time / TRAIN_CYCLE + t * 0.37) % 1) + 1) % 1;
      // The leading car's place on the viaduct, kept inside it so the whole train stays on the deck (and does not jump at the turnaround).
      const { lead, forward } = trainLead(q, room);
      const dir = forward ? 1 : -1;
      for (let slot = 0; slot < cars; slot += 1) {
        const distance = range.start + lead * range.length - dir * slot * length;
        rail.frameAt(rail.uAtDistance(distance), f);
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

  /* ---------- hand-placed props (world-edits.json): loose objects, loaded after the first frame like the other models ---------- */
  const propGroup = new THREE.Group();
  propGroup.name = "edit-props";
  scene.add(propGroup);
  const propMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6, metalness: 0.2 });
  const propPalette = paletteMat();
  const propObjects = new Map<string, THREE.Mesh>();
  const addProp = async (spec: PropEdit): Promise<THREE.Object3D | null> => {
    const url = propUrl(spec.model);
    if (!url) {
      console.warn(`world-edits: prop ${spec.id} uses ${spec.model}, which is not in assets/game/models`);
      return null;
    }
    const g = await loadModel(url, ["color"]);
    if (!g) return null;
    if (!g.hasAttribute("normal")) g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, g.hasAttribute("color") ? propPalette : propMat);
    mesh.name = `edit-prop:${spec.id}`;
    mesh.userData.propId = spec.id;
    mesh.position.set(spec.x, spec.y, spec.z);
    mesh.rotation.y = spec.ry;
    mesh.scale.setScalar(spec.scale);
    propGroup.add(mesh);
    propObjects.set(spec.id, mesh);
    return mesh;
  };
  void Promise.all(worldEdits.props.map(addProp)).then(() => {
    if (worldEdits.props.length) c.onModels();
  });

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
    setCardOverlay: (k, visible) => { board(k).panel.visible = !visible; },
    auditFootprints: () => footprints,
    auditBoxes: () => auditBoxes,
    editables: () => ({ towers: towerList, lamps: lampEdits }),
    props: {
      add: addProp,
      get: (id) => propObjects.get(id),
      remove: (id) => {
        const mesh = propObjects.get(id);
        if (mesh) propGroup.remove(mesh);
        propObjects.delete(id);
      },
    },
  };
}
