import * as THREE from "three";
import { V3 } from "./geometry";

/**
 * The camera rail. One stop per district; the camera flies a spline that passes exactly through the stops, and a second
 * spline carries the look-at point. `ground` is the same path on the street: the city is laid out around it, so the camera
 * always flies down an avenue and the buildings stand on both sides.
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
  /** Street frame at u in [0, 1] along the whole path (stop k is at u = k / (count - 1)). */
  frameAt(u: number, out?: Frame): Frame;
  /** Ground path length in world units. */
  length: number;
  /** u of stop k plus `ahead` stops. */
  u(k: number, ahead?: number): number;
}

/** Stop centres on the ground: a long gentle S down -z, 130 to 135 units apart, so each district has room to be its own place. */
const CENTRES: [number, number][] = [
  [0, 0],
  [-26, -130],
  [24, -262],
  [-22, -394],
  [28, -524],
  [-2, -652],
];
const CAMERA_HEIGHT = [19, 14, 17, 15, 14, 12];
/** Where the camera looks, ahead of its own stop, in stops. */
const LOOK_AHEAD = 0.3;
const LOOK_HEIGHT = [9, 10, 12, 9, 8, 6];

export function createRail(count: number): Rail {
  const n = Math.min(count, CENTRES.length);
  const centres = CENTRES.slice(0, n);
  // The camera sits 30 units in front of the district centre (the city is ahead of it, -z).
  const ground = new THREE.CatmullRomCurve3(centres.map(([x, z]) => V3(x, 0, z + 30)), false, "catmullrom", 0.5);
  const camera = new THREE.CatmullRomCurve3(centres.map(([x, z], k) => V3(x, CAMERA_HEIGHT[k]!, z + 30)), false, "catmullrom", 0.5);
  const look = new THREE.CatmullRomCurve3(
    centres.map((_, k) => {
      const ahead = (k + LOOK_AHEAD) / Math.max(1, n - 1);
      const g = ground.getPoint(Math.min(1, ahead));
      // Past the end of the path (the last stop) the look-at point carries on along the final direction.
      if (ahead > 1) g.addScaledVector(ground.getTangent(1), (ahead - 1) * ground.getLength());
      return V3(g.x, LOOK_HEIGHT[k]!, g.z);
    }),
    false,
    "catmullrom",
    0.5,
  );
  const tmp = V3(0, 0, 0);
  const up = V3(0, 1, 0);
  return {
    count: n,
    length: ground.getLength(),
    u: (k, ahead = 0) => Math.min(1, Math.max(0, (k + ahead) / Math.max(1, n - 1))),
    pose(c, pos, lookAt) {
      const u = Math.min(1, Math.max(0, c / Math.max(1, n - 1)));
      camera.getPoint(u, pos);
      look.getPoint(u, lookAt);
    },
    frameAt(u, out) {
      const f = out ?? { p: V3(0, 0, 0), T: V3(0, 0, 0), R: V3(0, 0, 0) };
      const uu = Math.min(1, Math.max(0, u));
      ground.getPoint(uu, f.p);
      ground.getTangent(uu, f.T);
      f.T.y = 0;
      f.T.normalize();
      f.R.crossVectors(f.T, up).normalize();
      tmp.copy(f.R);
      return f;
    },
  };
}
