/**
 * Pure placement geometry shared by the world builder and its tests: oriented boxes on the ground plane, the metro viaduct's segments,
 * and the stretch of viaduct that stays clear of the buildings the boards hang on.
 */
import type { Rail } from "./rail";

/** A box on the ground plane: centre (x, z), width `w` across and depth `d` along its yaw `ry` (three.js `rotateY`). */
export interface Obb {
  x: number;
  z: number;
  w: number;
  d: number;
  ry: number;
}

const corners = (b: Obb, grow: number): [number, number][] => {
  const c = Math.cos(b.ry);
  const s = Math.sin(b.ry);
  const out: [number, number][] = [];
  for (const dx of [-(b.w / 2 + grow), b.w / 2 + grow]) {
    for (const dz of [-(b.d / 2 + grow), b.d / 2 + grow]) out.push([b.x + dx * c + dz * s, b.z - dx * s + dz * c]);
  }
  return out;
};

/** True when two oriented boxes overlap on the ground plane, each grown by `margin` (separating-axis test). */
export function obbOverlap(a: Obb, b: Obb, margin = 0): boolean {
  const pa = corners(a, margin);
  const pb = corners(b, margin);
  const axes: [number, number][] = [];
  for (const o of [a, b]) axes.push([Math.cos(o.ry), -Math.sin(o.ry)], [Math.sin(o.ry), Math.cos(o.ry)]);
  for (const [ax, az] of axes) {
    const ra = pa.map(([x, z]) => x * ax + z * az);
    const rb = pb.map(([x, z]) => x * ax + z * az);
    if (Math.max(...ra) <= Math.min(...rb) || Math.max(...rb) <= Math.min(...ra)) return false;
  }
  return true;
}

/** One viaduct deck segment is 14 wide (across the tracks) and 7.6 long. */
export const VIADUCT_SEGMENT = { w: 14, d: 7.6 } as const;
/** Distance of each viaduct from the avenue's middle, and how far a segment is drawn from the next one. */
export const VIADUCT_OFFSET = 42;
const SEGMENT_STEP = 7;

export interface ViaductSegment extends Obb {
  /** Rail parameter at the segment's middle. */
  u: number;
}

/** The deck segments of the viaduct on `side` (+1 right, -1 left) between rail parameters u0 and u1, in order. */
export function viaductSegments(rail: Rail, u0: number, u1: number, side: 1 | -1): ViaductSegment[] {
  const length = rail.distanceAt(u1) - rail.distanceAt(u0);
  const n = Math.ceil(length / SEGMENT_STEP);
  const frame = rail.frameAt(u0);
  return Array.from({ length: n }, (_, i) => {
    const u = u0 + ((i + 0.5) / n) * (u1 - u0);
    rail.frameAt(u, frame);
    return {
      u,
      x: frame.p.x + frame.R.x * side * VIADUCT_OFFSET,
      z: frame.p.z + frame.R.z * side * VIADUCT_OFFSET,
      w: VIADUCT_SEGMENT.w,
      d: VIADUCT_SEGMENT.d,
      ry: Math.atan2(frame.T.x, frame.T.z),
    };
  });
}

/**
 * The longest stretch of segments, as an inclusive index range, that keeps `clearance` away from every blocker; null when none is clear.
 * A viaduct cannot go through a building, so it stops short of it: the trains then use only this stretch.
 */
export function clearRun(segments: readonly ViaductSegment[], blockers: readonly Obb[], clearance: number): [number, number] | null {
  let best: [number, number] | null = null;
  let start = -1;
  const close = (end: number) => {
    if (start >= 0 && (!best || end - start > best[1] - best[0])) best = [start, end];
    start = -1;
  };
  segments.forEach((segment, i) => {
    if (blockers.some((blocker) => obbOverlap(segment, blocker, clearance))) close(i - 1);
    else if (start < 0) start = i;
  });
  close(segments.length - 1);
  return best;
}
