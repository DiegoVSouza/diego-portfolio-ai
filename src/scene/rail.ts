import * as THREE from "three";
import { V3 } from "./geometry";

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
  /** Street frame at u in [0, 1] along the whole path (stop k is at u = k / count; u = 1 is the overrun point past the last stop). */
  frameAt(u: number, out?: Frame): Frame;
  /** Where stop k's card hangs: ahead of the stop, on its side of the avenue, at eye height. */
  cardAnchor(k: number, out: THREE.Vector3, frame?: Frame): THREE.Vector3;
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
/** How far the camera moves toward its board's side at a stop (the stops alternate sides, so it weaves down the avenue). */
const CAMERA_LATERAL = 9;
/** The look-at point is the board's middle, a little toward the avenue, so the board sits a touch right of the screen's middle (clear of the menu). */
const LOOK_SHIFT = -2;
/** Ahead of the stop, along the avenue: with the board's width this puts the card at about 60% of the screen. */
export const CARD_AHEAD = 0.27;
export const CARD_LATERAL = 20;
/** The middle of the board (its lower edge is 2.5, and it is 16.4 high: see world.ts). */
export const CARD_HEIGHT = 10.7;

/**
 * Which side of the avenue stop k's card hangs on: +1 right, -1 left. They alternate, so two projects of one district face each other
 * across the street instead of standing in a row.
 */
export const cardSide = (k: number): 1 | -1 => (k % 2 === 0 ? 1 : -1);

export function createRail(count: number): Rail {
  const n = Math.max(2, count);
  // The camera sits 26 units in front of the stop's centre (the city is ahead of it, -z).
  // One control point beyond the last stop (the overrun), so the last stop also has a street ahead of it: the harbour is there.
  const centres = Array.from({ length: n + 1 }, (_, k) => V3(SWAY * Math.sin(k * 0.85), 0, -SPACING * k + 26));
  const ground = new THREE.CatmullRomCurve3(centres, false, "catmullrom", 0.5);
  const up = V3(0, 1, 0);
  const tmp = V3(0, 0, 0);
  const tan = V3(0, 0, 0);
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
  // The camera and its look-at point are splines through one control point per stop, built from the street frame at that stop.
  const sample = (k: number, build: (f: { p: THREE.Vector3; T: THREE.Vector3; R: THREE.Vector3 }, side: number) => THREE.Vector3) => {
    const f = frameOf(Math.min(1, k / n), stopFrame);
    return build(f, k < n ? cardSide(k) : 0);
  };
  const camera = new THREE.CatmullRomCurve3(
    centres.map((_, k) => sample(k, (f, side) => V3(f.p.x + f.R.x * side * CAMERA_LATERAL, CAMERA_HEIGHT, f.p.z + f.R.z * side * CAMERA_LATERAL))),
    false,
    "catmullrom",
    0.5,
  );
  const look = new THREE.CatmullRomCurve3(
    centres.map((_, k) => {
      const ahead = (k + CARD_AHEAD) / n;
      const g = ground.getPoint(Math.min(1, ahead));
      // Past the end of the path (the last stop) the look-at point carries on along the final direction.
      if (ahead > 1) g.addScaledVector(ground.getTangent(1), (ahead - 1) * ground.getLength());
      tan.copy(ground.getTangent(Math.min(1, ahead)));
      tan.y = 0;
      tan.normalize();
      right.crossVectors(tan, up).normalize();
      // The board's middle (lateral CARD_LATERAL on its side), nudged toward the avenue by LOOK_SHIFT.
      const lateral = k < n ? cardSide(k) * CARD_LATERAL + LOOK_SHIFT : 0;
      return V3(g.x + right.x * lateral, CARD_HEIGHT, g.z + right.z * lateral);
    }),
    false,
    "catmullrom",
    0.5,
  );
  return {
    count: n,
    length: ground.getLength(),
    u: (k, ahead = 0) => Math.min(1, Math.max(0, (k + ahead) / n)),
    pose(c, pos, lookAt) {
      const u = Math.min(1, Math.max(0, c / n));
      camera.getPoint(u, pos);
      look.getPoint(u, lookAt);
    },
    frameAt(u, out) {
      return frameOf(u, out ?? { p: V3(0, 0, 0), T: V3(0, 0, 0), R: V3(0, 0, 0) });
    },
    cardAnchor(k, out, frame) {
      const f = frameOf((k + CARD_AHEAD) / n, frame ?? stopFrame);
      tmp.copy(f.p).addScaledVector(f.R, CARD_LATERAL * cardSide(k));
      return out.set(tmp.x, CARD_HEIGHT, tmp.z);
    },
  };
}
