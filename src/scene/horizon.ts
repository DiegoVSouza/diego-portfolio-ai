/**
 * The city's surroundings: two rings of dark silhouettes beyond the streets and along the avenue, so the world does not end in a black void at the edge of the fog.
 * `near` stands past the end of the cross streets (inside the fog, so it fades with distance); `far` stands near the camera's far plane and
 * fades to the background on its own (see `fadeMaterial` in world.ts). Pure placement: no WebGL here, so the rules are testable.
 */
import { obbOverlap, type Obb } from "./corridor";
import type { Rail } from "./rail";

export interface SkylineBlock extends Obb {
  h: number;
  layer: "near" | "far";
  /** Which side of the avenue: +1 right, -1 left. */
  side: -1 | 1;
}

/** Side streets reach 150 from the avenue's middle (CROSS_REACH in world.ts); the near ring starts past them. */
export const NEAR_LAT = [172, 232] as const;
export const FAR_LAT = [318, 372] as const;
/** The camera's far plane is 420: the far ring is gone before it. */
export const FAR_FADE = { start: 330, end: 405 } as const;
const GAP = 3;

export interface SkylineOptions {
  /** Where the harbour water begins (world z): no block of the near ring stands in the water. */
  shoreZ: number;
}

/** Deterministic: the same rail and the same random source give the same silhouettes. */
export function skylineBlocks(rail: Rail, rnd: () => number, { shoreZ }: SkylineOptions): SkylineBlock[] {
  const blocks: SkylineBlock[] = [];
  const free = (candidate: SkylineBlock) => !blocks.some((b) => b.layer === candidate.layer && obbOverlap(b, candidate, GAP));
  const frame = rail.frameAt(0);
  const ring = (layer: "near" | "far", lat: readonly [number, number], step: [number, number], size: [number, number], height: [number, number]) => {
    for (const side of [-1, 1] as const) {
      for (let distance = 0; distance < rail.length; ) {
        rail.frameAt(rail.uAtDistance(distance), frame);
        const w = size[0] + rnd() * (size[1] - size[0]);
        const d = size[0] + rnd() * (size[1] - size[0]);
        const across = lat[0] + w / 2 + rnd() * (lat[1] - lat[0]);
        const block: SkylineBlock = {
          x: frame.p.x + frame.R.x * side * across,
          z: frame.p.z + frame.R.z * side * across,
          w,
          d,
          ry: Math.atan2(frame.T.x, frame.T.z),
          h: height[0] + rnd() * (height[1] - height[0]),
          layer,
          side,
        };
        distance += step[0] + rnd() * (step[1] - step[0]);
        if (layer === "near" && block.z - Math.max(w, d) < shoreZ + 12) continue;
        if (free(block)) blocks.push(block);
      }
    }
  };
  ring("near", NEAR_LAT, [26, 46], [14, 30], [26, 92]);
  ring("far", FAR_LAT, [52, 92], [30, 64], [70, 190]);
  // No far shore across the harbour: the last stop is 327 units from the water's edge, so a bank beyond it is never within the camera's range.
  return blocks;
}

/** Triangles of one box mesh as the scene builds it (12 per box); the budget test uses this. */
export const TRIANGLES_PER_BLOCK = 12;
