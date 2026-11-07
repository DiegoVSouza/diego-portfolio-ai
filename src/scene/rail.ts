import * as THREE from "three";
import { V3 } from "./geometry";
import { type Shot, ROAD_EXTRA, SIDE_JUNCTION, boardMid, shotOf, sideOf } from "./layout";

/**
 * The camera rail. One stop per card; the camera flies a spline that passes exactly through the stops, and a second spline carries the
 * look-at point. `ground` is the same path on the street: the city is laid out around it, so the camera always flies down an avenue
 * and the buildings stand on both sides. Each stop also has a card anchor: a point in the city, to the right of the avenue and ahead of
 * the stop, where that card hangs.
 */
export interface Frame {
  p: THREE.Vector3;
  /** Unit tangent, direction of travel. */
  T: THREE.Vector3;
  /** Unit right-hand vector on the ground plane. */
  R: THREE.Vector3;
}

export interface Rail {
  count: number;
  /** Camera position and look-at point for the stop parameter c in [0, count - 1] (an integer is a stop). */
  pose(c: number, pos: THREE.Vector3, look: THREE.Vector3): void;
  /** Street frame at u in [0, 1] along the whole path (stop k is at u = k / (count + ROAD_EXTRA); u = 1 is the end of the street). */
  frameAt(u: number, out?: Frame): Frame;
  /** Where stop k's board hangs (its middle). */
  cardAnchor(k: number, out: THREE.Vector3): THREE.Vector3;
  /** Where the camera rests at stop k. */
  cameraAt(k: number, out: THREE.Vector3): THREE.Vector3;
  /** Ground path length in world units. */
  length: number;
  /** u of stop k plus `ahead` stops. */
  u(k: number, ahead?: number): number;
}

/** Spacing between stops, and the sway of the avenue (a long gentle S). */
const SPACING = 85;
const SWAY = 26;
/** The camera rides low and to the side of its board, close enough for the card to fill most of the screen. */
const CAMERA_HEIGHT = 12;
/** The look-at point is the board's middle, a little toward the avenue, so the board sits a touch right of the screen's middle (clear of the menu). */
const LOOK_SHIFT = 3.5;
/** Ahead of the stop, along the avenue: with the board's width this puts the card at about 60% of the screen. */
export const CARD_AHEAD = 0.27;
export const CARD_LATERAL = 20;
/** The middle of the board (its lower edge is 2.5, and it is 18 high: see world.ts). */
export const CARD_HEIGHT = 11.5;

/**
 * Which side of the avenue stop k's card hangs on: +1 right, -1 left. They alternate, so two projects of one district face each other
 * across the street instead of standing in a row.
 */
export const cardSide = sideOf;
export function createRail(count: number): Rail {
  const n = Math.max(2, count);
  // The street goes on for ROAD_EXTRA stops past the last stop, so the last stop looks down a street, not at a square.
  // `total` is the length of the whole path in stop units; u = k / total.
  const total = n + ROAD_EXTRA;
  // The camera sits 26 units in front of the stop's centre (the city is ahead of it, -z).
  const centres = Array.from({ length: total + 1 }, (_, k) => V3(SWAY * Math.sin(k * 0.85), 0, -SPACING * k + 26));
  const ground = new THREE.CatmullRomCurve3(centres, false, "catmullrom", 0.5);
  const up = V3(0, 1, 0);
  const right = V3(0, 0, 0);
  const frameOf = (u: number, out: { p: THREE.Vector3; T: THREE.Vector3; R: THREE.Vector3 }) => {
    const uu = Math.min(1, Math.max(0, u));
    ground.getPoint(uu, out.p);
    ground.getTangent(uu, out.T);
    out.T.y = 0;
    out.T.normalize();
    out.R.crossVectors(out.T, up).normalize();
    return out;
  };
  const stopFrame = { p: V3(0, 0, 0), T: V3(0, 0, 0), R: V3(0, 0, 0) };
  /** A point on the street frame `ahead` stops past stop k, `lat` to the right, `y` high. */
  const at = (k: number, ahead: number, lat: number, y: number): THREE.Vector3 => {
    const f = frameOf(Math.min(1, (k + ahead) / total), stopFrame);
    return V3(f.p.x + f.R.x * lat, y, f.p.z + f.R.z * lat);
  };
  const shotAt = (k: number): Shot | null => (k < n ? shotOf(k) : null);
  const camPts = centres.map((_, k) => {
    const sh = shotAt(k);
    return sh ? at(k, sh.cam.ahead, sh.cam.lat, sh.cam.h) : at(k, 0, 0, CAMERA_HEIGHT);
  });
  const boardPts = centres.map((_, k) => {
    const sh = shotAt(k);
    return sh ? at(k, sh.board.ahead, sh.board.lat, boardMid(k)) : at(k, CARD_AHEAD, 0, CARD_HEIGHT);
  });
  /** The camera looks a little to the left of the board's middle, so the board sits right of the screen's middle, clear of the menu. */
  const lookPts = boardPts.map((b, k) => {
    if (k >= n) return b.clone();
    const dir = V3(b.x - camPts[k]!.x, 0, b.z - camPts[k]!.z).normalize();
    right.crossVectors(dir, up);
    return V3(b.x - right.x * LOOK_SHIFT, shotAt(k)?.aim ?? b.y, b.z - right.z * LOOK_SHIFT);
  });
  // The camera's path is a spline through knots. Each stop is a knot at its own integer c. A stop in a side street gets two more, on the
  // avenue just before and just after the junction, so the camera follows the street to the turn instead of cutting across the blocks.
  interface Knot {
    c: number;
    cam: THREE.Vector3;
    look: THREE.Vector3;
  }
  const knots: Knot[] = [];
  centres.forEach((_, k) => {
    const sh = shotAt(k);
    if (sh?.kind === "side") {
      const s = sideOf(k);
      knots.push({ c: k - 0.4, cam: at(k, SIDE_JUNCTION - 0.08, 7 * s, CAMERA_HEIGHT), look: lookPts[k]!.clone() });
      knots.push({ c: k, cam: camPts[k]!, look: lookPts[k]! });
      knots.push({ c: k + 0.4, cam: at(k, SIDE_JUNCTION + 0.08, 7 * s, CAMERA_HEIGHT), look: lookPts[k]!.clone() });
    } else knots.push({ c: k, cam: camPts[k]!, look: lookPts[k]! });
  });
  const camera = new THREE.CatmullRomCurve3(knots.map((x) => x.cam), false, "catmullrom", 0.5);
  const look = new THREE.CatmullRomCurve3(knots.map((x) => x.look), false, "catmullrom", 0.5);
  /** The spline parameter for stop parameter c: knots are not evenly spaced in c, the curve's segments are. */
  const tOf = (c: number): number => {
    const cc = Math.min(knots.at(-1)!.c, Math.max(0, c));
    let i = 0;
    while (i < knots.length - 2 && knots[i + 1]!.c <= cc) i += 1;
    const span = knots[i + 1]!.c - knots[i]!.c;
    return (i + (cc - knots[i]!.c) / span) / (knots.length - 1);
  };
  return {
    count: n,
    length: ground.getLength(),
    u: (k, ahead = 0) => Math.min(1, Math.max(0, (k + ahead) / total)),
    pose(c, pos, lookAt) {
      const t = tOf(c);
      camera.getPoint(t, pos);
      look.getPoint(t, lookAt);
    },
    frameAt(u, out) {
      return frameOf(u, out ?? { p: V3(0, 0, 0), T: V3(0, 0, 0), R: V3(0, 0, 0) });
    },
    cardAnchor(k, out) {
      return out.copy(boardPts[k]!);
    },
    cameraAt(k, out) {
      return out.copy(camPts[k]!);
    },
  };
}
