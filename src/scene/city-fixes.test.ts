import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { BOARD_PANEL_Z, ROAD_EXTRA, frameFront, trainLead } from "./layout";
import { createRail } from "./rail";

describe("shuttle train", () => {
  const room = 0.15;
  const body = (q: number) => {
    const { lead, forward } = trainLead(q, room);
    return forward ? [lead - room, lead] : [lead, lead + room];
  };
  it("occupies the same interval on both sides of the turnaround", () => {
    const before = body(0.5 - 1e-9);
    const after = body(0.5 + 1e-9);
    expect(after[0]).toBeCloseTo(before[0]!, 6);
    expect(after[1]).toBeCloseTo(before[1]!, 6);
  });
  it("never leaves the viaduct", () => {
    for (let i = 0; i < 1000; i += 1) {
      const [a, b] = body(i / 1000);
      expect(a).toBeGreaterThanOrEqual(-1e-9);
      expect(b).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
  it("is continuous at the start of the cycle", () => {
    const end = body(1 - 1e-9);
    const start = body(0);
    expect(start[0]).toBeCloseTo(end[0]!, 6);
  });
});

describe("board frame", () => {
  it("keeps every frame part behind the panel", () => {
    expect(frameFront()).toBeLessThan(BOARD_PANEL_Z);
  });
});

describe("rail", () => {
  it("keeps stops where they were and adds road after the last one", () => {
    const rail = createRail(10);
    expect(rail.count).toBe(10);
    expect(rail.u(9, 0.5)).toBeLessThan(0.75);
    expect(rail.u(9 + ROAD_EXTRA)).toBeLessThanOrEqual(1);
    const pos = new THREE.Vector3();
    const look = new THREE.Vector3();
    rail.pose(9, pos, look);
    const end = rail.frameAt(1).p;
    // The camera at the last stop is about ROAD_EXTRA stops of street away from the end of the road.
    expect(pos.distanceTo(end)).toBeGreaterThan(80 * ROAD_EXTRA);
  });
});
