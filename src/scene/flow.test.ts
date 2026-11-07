import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { FLIGHT_MAX_MS, FLIGHT_MIN_MS, flightMs } from "./layout";
import { createRail } from "./rail";

describe("camera flow along the rail", () => {
  const rail = createRail(10);
  const here = new THREE.Vector3();
  const look = new THREE.Vector3();

  it("still rests exactly on every stop's knot", () => {
    for (let k = 0; k < 10; k += 1) {
      rail.pose(k, here, look);
      const rest = rail.cameraAt(k, new THREE.Vector3());
      expect(here.distanceTo(rest)).toBeLessThan(1e-6);
    }
  });
  it("flies each leg at an even rate per unit of c (no part of a leg is much faster than its mean)", () => {
    const N = 200;
    for (let k = 0; k < 9; k += 1) {
      let length = 0;
      let peak = 0;
      let previous: THREE.Vector3 | null = null;
      for (let i = 0; i <= N; i += 1) {
        rail.pose(k + i / N, here, look);
        if (previous) {
          const step = here.distanceTo(previous);
          length += step;
          peak = Math.max(peak, step);
        }
        previous = here.clone();
      }
      // Measured before the fix: the peak was 1.09 to 1.56 times the mean (leg 2 to 3, 1.56).
      expect(peak / (length / N), `leg ${k}`).toBeLessThan(1.06);
      expect(rail.legLengths[k]!, `leg ${k}`).toBeCloseTo(length, 0);
    }
  });
  it("sizes each leg's flight by its length, inside the limits", () => {
    const times = rail.legLengths.map(flightMs);
    for (const ms of times) {
      expect(ms).toBeGreaterThanOrEqual(FLIGHT_MIN_MS);
      expect(ms).toBeLessThanOrEqual(FLIGHT_MAX_MS);
    }
    // The longest leg takes longer than the shortest one.
    const longest = rail.legLengths.indexOf(Math.max(...rail.legLengths));
    const shortest = rail.legLengths.indexOf(Math.min(...rail.legLengths));
    expect(times[longest]!).toBeGreaterThan(times[shortest]!);
    // Peak speed of the cubic ease-out is three times the mean: it stays between 85 and 160 units per second on every leg.
    rail.legLengths.forEach((length, k) => {
      const peak = (3 * length) / (times[k]! / 1000);
      expect(peak, `leg ${k}`).toBeGreaterThan(85);
      expect(peak, `leg ${k}`).toBeLessThan(160);
    });
  });
});
