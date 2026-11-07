import { describe, expect, it } from "vitest";
import { obbOverlap } from "./corridor";
import { FAR_FADE, FAR_LAT, NEAR_LAT, TRIANGLES_PER_BLOCK, skylineBlocks } from "./horizon";
import { rng } from "./geometry";
import { createRail } from "./rail";

const rail = createRail(10);
const shoreZ = rail.frameAt(1).p.z - 12;
const blocks = skylineBlocks(rail, rng(11), { shoreZ });
const near = blocks.filter((b) => b.layer === "near");
const far = blocks.filter((b) => b.layer === "far");

describe("skyline rings around the city", () => {
  it("is deterministic", () => {
    expect(skylineBlocks(rail, rng(11), { shoreZ })).toEqual(blocks);
  });
  it("fills both sides of the avenue", () => {
    expect(near.filter((b) => b.side === -1).length).toBeGreaterThan(15);
    expect(near.filter((b) => b.side === 1).length).toBeGreaterThan(15);
    expect(far.filter((b) => b.side === -1).length).toBeGreaterThan(8);
    expect(far.filter((b) => b.side === 1).length).toBeGreaterThan(8);
  });
  it("keeps clear of the avenue, its side streets (150 long) and the town", () => {
    const along = Array.from({ length: 600 }, (_, i) => rail.frameAt(i / 599).p);
    for (const b of near) {
      const closest = Math.min(...along.map((p) => Math.hypot(p.x - b.x, p.z - b.z)));
      // The block's own half-diagonal is inside the distance, so even its corner stays past the side streets.
      expect(closest - Math.hypot(b.w, b.d) / 2, `near block at ${b.x.toFixed(0)}, ${b.z.toFixed(0)}`).toBeGreaterThan(NEAR_LAT[0] - 40);
      expect(closest).toBeGreaterThan(150);
    }
  });
  it("never stands in the harbour water (near ring) and never overlaps its own ring", () => {
    for (const b of near) expect(b.z - Math.max(b.w, b.d)).toBeGreaterThan(shoreZ);
    for (const layer of [near, far]) {
      for (let i = 0; i < layer.length; i += 1) for (let j = i + 1; j < layer.length; j += 1) expect(obbOverlap(layer[i]!, layer[j]!), `${layer[i]!.layer} ${i}/${j}`).toBe(false);
    }
  });
  it("keeps the far ring inside the camera's range and its fade before the far plane", () => {
    expect(FAR_FADE.end).toBeLessThan(420);
    expect(FAR_FADE.start).toBeLessThan(FAR_FADE.end);
    expect(FAR_LAT[0]).toBeGreaterThan(NEAR_LAT[1]);
  });
  it("stays within the triangle budget (well under one prop's 1,500)", () => {
    expect(blocks.length * TRIANGLES_PER_BLOCK).toBeLessThan(2000);
    for (const b of blocks) expect(b.h).toBeLessThanOrEqual(190);
  });
});
