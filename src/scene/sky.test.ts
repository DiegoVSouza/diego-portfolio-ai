import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { SKY, createSky } from "./sky";

describe("createSky", () => {
  const ink = new THREE.Color(0.04, 0.04, 0.04);
  const glow = new THREE.Color(0.5, 0.05, 0.08);
  const sky = createSky(ink, glow);
  const geometry = sky.geometry as THREE.BufferGeometry;
  const position = geometry.getAttribute("position");
  const color = geometry.getAttribute("color");

  it("is glow at the horizon and the background colour overhead", () => {
    let low = -1;
    let high = -1;
    for (let i = 0; i < position.count; i += 1) {
      if (Math.abs(position.getY(i)) < 1e-3) low = i;
      if (position.getY(i) >= 110) high = i;
    }
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeGreaterThanOrEqual(0);
    expect(color.getX(low)).toBeCloseTo(glow.r, 3);
    expect(color.getX(high)).toBeCloseTo(ink.r, 3);
  });
  it("stays inside the camera's far plane, ignores fog and draws first", () => {
    expect(SKY.radius).toBeLessThan(420);
    const material = sky.material as THREE.MeshBasicMaterial;
    expect(material.fog).toBe(false);
    expect(material.depthWrite).toBe(false);
    expect(sky.renderOrder).toBeLessThan(0);
  });
});
