import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { BOARD_PANEL_Z, BOARD_WIDTH, ROAD_EXTRA, TRAIN_CAR_SPACING, boardMid, frameFront, patchShot, shotKind, shotOf, trafficAt, trainLead } from "./layout";
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
  it("keeps adjacent cars clear on the curved inner and outer tracks", () => {
    const rail = createRail(10);
    const start = rail.distanceAt(rail.u(5, -1.2));
    const trackLength = rail.distanceAt(rail.u(6, 1.2)) - start;
    const spacing = TRAIN_CAR_SPACING;
    const room = (4 * spacing) / trackLength;
    const dummy = new THREE.Object3D();
    // The widest downloaded carriage is 1.35 x 1.57 x 2.6 at scale 5.2.
    const box = new OBB(new THREE.Vector3(0, 4, 0), new THREE.Vector3(1.35 * 5.2 / 2, 1.57 * 5.2 / 2, 2.6 * 5.2 / 2));
    for (const lateral of [-45.7, -38.3, 38.3, 45.7]) for (let step = 0; step < 100; step += 1) {
      const { lead, forward } = trainLead(step / 100, room);
      const dir = forward ? 1 : -1;
      let previous: OBB | undefined;
      for (let slot = 0; slot < 5; slot += 1) {
        const frame = rail.frameAt(rail.uAtDistance(start + lead * trackLength - dir * slot * spacing));
        dummy.position.set(frame.p.x + frame.R.x * lateral, 14, frame.p.z + frame.R.z * lateral);
        dummy.rotation.set(0, Math.atan2(frame.T.x, frame.T.z) + (forward ? 0 : Math.PI), 0);
        dummy.updateMatrix();
        const next = box.clone().applyMatrix4(dummy.matrix);
        if (previous) expect(previous.intersectsOBB(next)).toBe(false);
        previous = next;
      }
    }
  });
});

describe("board frame", () => {
  it("keeps every frame part behind the panel", () => {
    expect(frameFront()).toBeLessThan(BOARD_PANEL_Z);
  });
});

describe("traffic spacing", () => {
  it("keeps vehicles in separate lanes with consistent separation through the loop", () => {
    for (let t = 0; t < 100; t += 0.5) {
      const cars = Array.from({ length: 13 }, (_, i) => trafficAt(i, 13, t, false));
      for (let i = 0; i < cars.length; i += 1) for (let j = i + 1; j < cars.length; j += 1) {
        if (cars[i]!.lateral !== cars[j]!.lateral) continue;
        const gap = Math.abs(cars[i]!.u - cars[j]!.u);
        expect(Math.min(gap, 1 - gap)).toBeGreaterThan(0.14);
      }
    }
  });
  it("keeps positions still with reduced motion", () => {
    expect(trafficAt(4, 13, 0, true)).toEqual(trafficAt(4, 13, 999, true));
  });
});

describe("rail", () => {
  it("converts the spline parameter to distance and back, including the ends", () => {
    const rail = createRail(10);
    for (let i = 0; i <= 100; i += 1) {
      const u = i / 100;
      expect(rail.uAtDistance(rail.distanceAt(u))).toBeCloseTo(u, 5);
    }
  });
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

describe("shots", () => {
  it("vary: the street, a facade, a side street, a roof, the kerb and the viaduct all appear, and few boards stand on posts", () => {
    const kinds = Array.from({ length: 10 }, (_, k) => shotKind(k));
    expect(new Set(kinds).size).toBe(6);
    expect(kinds.filter((m) => m === "post").length).toBeLessThanOrEqual(2);
  });
  it("keeps boards on buildings clear of the avenue and the camera in the right place", () => {
    for (let k = 0; k < 10; k += 1) {
      const shot = shotOf(k);
      if (shot.kind === "facade" || shot.kind === "roof") expect(Math.abs(shot.board.lat) - (BOARD_WIDTH * shot.scale) / 2 - 1).toBeGreaterThan(12);
      if (shot.kind === "side") expect(Math.abs(shot.cam.lat)).toBeGreaterThan(30);
      if (shot.kind === "roof") expect(shot.cam.h).toBeGreaterThan(20);
      if (shot.kind === "curb") {
        expect(shot.cam.h).toBeLessThan(3);
        // The board is across the avenue from the car.
        expect(Math.sign(shot.board.lat)).toBe(-Math.sign(shot.cam.lat));
      }
    }
  });
  it("points the camera past the board's middle, never at the ground", () => {
    const rail = createRail(10);
    const look = new THREE.Vector3();
    const pos = new THREE.Vector3();
    for (let k = 0; k < 10; k += 1) {
      rail.pose(k, pos, look);
      expect(look.y).toBeCloseTo(shotOf(k).aim ?? boardMid(k), 5);
      expect(pos.y).toBeCloseTo(shotOf(k).cam.h, 5);
    }
  });
});

describe("shot patches (the atelier's camera tuner)", () => {
  it("changes only what the patch names, and mirrors lateral values to the stop's side", () => {
    const base = shotOf(1); // stop 1 is on the left (side -1)
    const patched = patchShot(base, { cam: { h: 20, lat: 15 }, scale: 2 }, -1);
    expect(patched.cam.h).toBe(20);
    expect(patched.cam.lat).toBe(-15);
    expect(patched.cam.ahead).toBe(base.cam.ahead);
    expect(patched.board).toEqual(base.board);
    expect(patched.scale).toBe(2);
  });

  it("removes the aim with null and leaves a shot alone without a patch", () => {
    const curb = shotOf(4);
    expect(curb.aim).toBeDefined();
    expect(patchShot(curb, { aim: null }, 1).aim).toBeUndefined();
    expect(patchShot(curb, undefined, 1)).toBe(curb);
  });
});
