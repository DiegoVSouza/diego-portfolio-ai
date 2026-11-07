import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BOARD_WIDTH, shotKind, shotOf } from "./layout";
import { cardSide, createRail } from "./rail";

/** The board's width as world.ts fits it (fitBoard): a framed board is cut by its inset, and never taller than 30. */
const CARD_INSET = 0.9;
const RATIO = 460 / 640;
const boardWidth = (k: number): number => {
  const shot = shotOf(k);
  const framed = shot.kind === "post" || shot.kind === "roof" || shot.kind === "under";
  return Math.min(30, ((BOARD_WIDTH * shot.scale) / (framed ? CARD_INSET : 1)) * RATIO) / RATIO;
};

describe("billboards and the street", () => {
  const rail = createRail(10);
  const frame = rail.frameAt(0);
  /** Distance from the avenue's middle line (sideways), at the nearest point of the rail. */
  const lateralOf = (x: number, z: number): number => {
    let best = Infinity;
    let lateral = 0;
    for (let i = 0; i <= 3000; i += 1) {
      rail.frameAt(i / 3000, frame);
      const d = Math.hypot(x - frame.p.x, z - frame.p.z);
      if (d < best) {
        best = d;
        lateral = (x - frame.p.x) * frame.R.x + (z - frame.p.z) * frame.R.z;
      }
    }
    return Math.abs(lateral);
  };

  it("keeps every board's frame off the road and the sidewalks (the kerb is at 12)", () => {
    for (let k = 0; k < 10; k += 1) {
      if (shotKind(k) === "under") continue;
      const at = rail.cardAnchor(k, new THREE.Vector3());
      const cam = rail.cameraAt(k, new THREE.Vector3());
      const ry = Math.atan2(cam.x - at.x, cam.z - at.z) + 0.1 * cardSide(k);
      const half = boardWidth(k) / 2 + 0.7;
      for (const sign of [-1, 1]) {
        const x = at.x + Math.cos(ry) * half * sign;
        const z = at.z - Math.sin(ry) * half * sign;
        expect(lateralOf(x, z), `stop ${k} (${shotKind(k)}), end ${sign}`).toBeGreaterThanOrEqual(13);
      }
    }
  });
});
