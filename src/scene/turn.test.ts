import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { MAX_TURN_RATE, turnToward } from "./turn";

const yaw = (angle: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);

describe("turnToward", () => {
  it("never turns more than the allowed angle in one step, and arrives exactly", () => {
    const current = yaw(0);
    const target = yaw(2.5);
    const dt = 1 / 60;
    let frames = 0;
    let left = Infinity;
    while (left > 0 && frames < 1000) {
      const before = current.clone();
      left = turnToward(current, target, MAX_TURN_RATE * dt);
      expect(before.angleTo(current)).toBeLessThanOrEqual(MAX_TURN_RATE * dt + 1e-6);
      frames += 1;
    }
    expect(current.angleTo(target)).toBeLessThan(1e-6);
    // 2.5 rad at 5 rad/s takes half a second: a whip pan is spread over it.
    expect(frames / 60).toBeGreaterThan(0.45);
    expect(frames / 60).toBeLessThan(0.55);
  });
  it("follows a target that moves slower than the limit without lag", () => {
    const current = yaw(0);
    for (let i = 1; i <= 120; i += 1) {
      const target = yaw(i * 0.02);
      expect(turnToward(current, target, MAX_TURN_RATE / 60)).toBe(0);
      expect(current.angleTo(target)).toBeLessThan(1e-6);
    }
  });
  it("takes the short way round", () => {
    const current = yaw(3.0);
    const target = yaw(-3.0);
    turnToward(current, target, 0.05);
    expect(current.angleTo(target)).toBeLessThan(current.angleTo(yaw(0)));
  });
});
