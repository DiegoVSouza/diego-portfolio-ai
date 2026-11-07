import { describe, expect, it } from "vitest";
import { clearRun, obbOverlap, stretchClearOf, viaductSegments, type Obb } from "./corridor";
import { createRail } from "./rail";

const box = (x: number, z: number, w: number, d: number, ry = 0): Obb => ({ x, z, w, d, ry });

describe("obbOverlap", () => {
  it("separates boxes that only touch or are apart, and sees a rotated box that crosses", () => {
    expect(obbOverlap(box(0, 0, 4, 4), box(10, 0, 4, 4))).toBe(false);
    expect(obbOverlap(box(0, 0, 4, 4), box(4, 0, 4, 4))).toBe(false);
    expect(obbOverlap(box(0, 0, 4, 4), box(3, 0, 4, 4))).toBe(true);
    // A long thin box turned 45 degrees reaches a box its axis-aligned bounds would miss.
    expect(obbOverlap(box(0, 0, 2, 20, Math.PI / 4), box(6, 6, 2, 2))).toBe(true);
    expect(obbOverlap(box(0, 0, 2, 20, Math.PI / 4), box(6, -6, 2, 2))).toBe(false);
  });
  it("applies the margin to both boxes", () => {
    expect(obbOverlap(box(0, 0, 4, 4), box(5, 0, 4, 4), 0)).toBe(false);
    expect(obbOverlap(box(0, 0, 4, 4), box(5, 0, 4, 4), 1)).toBe(true);
  });
});

describe("clearRun", () => {
  const rail = createRail(10);
  const segments = viaductSegments(rail, rail.u(3, -1.2), rail.u(6, 1.2), -1);
  it("lays the viaduct as a chain of segments along the avenue", () => {
    expect(segments.length).toBeGreaterThan(40);
    for (let i = 1; i < segments.length; i += 1) expect(Math.hypot(segments[i]!.x - segments[i - 1]!.x, segments[i]!.z - segments[i - 1]!.z)).toBeLessThan(9);
  });
  it("is the whole viaduct when nothing blocks it", () => {
    expect(clearRun(segments, [], 4)).toEqual([0, segments.length - 1]);
  });
  it("stops short of a building on the line and keeps the longer side", () => {
    const at = segments[10]!;
    const run = clearRun(segments, [box(at.x, at.z, 30, 30, at.ry)], 4)!;
    expect(run[0]).toBeGreaterThan(10);
    for (let i = run[0]; i <= run[1]; i += 1) expect(obbOverlap(segments[i]!, box(at.x, at.z, 30, 30, at.ry), 4)).toBe(false);
    expect(clearRun(segments, [box(at.x, at.z, 4000, 4000)], 4)).toBeNull();
  });
});

describe("stretchClearOf", () => {
  it("leaves a stretch alone when the blocker is outside it", () => {
    expect(stretchClearOf(10, 100, 200, 20)).toEqual({ start: 10, length: 100 });
    expect(stretchClearOf(10, 100, -50, 20)).toEqual({ start: 10, length: 100 });
  });
  it("keeps the longer side of a blocker inside the stretch", () => {
    expect(stretchClearOf(0, 100, 30, 10)).toEqual({ start: 40, length: 60 });
    expect(stretchClearOf(0, 100, 70, 10)).toEqual({ start: 0, length: 60 });
  });
  it("gives zero length when the blocker covers the whole stretch", () => {
    expect(stretchClearOf(0, 20, 10, 15).length).toBe(0);
  });
});
