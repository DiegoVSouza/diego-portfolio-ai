import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { EMPTY_EDITS, editMatches, editMatrix, editPoint, parseEdits, worldEdits } from "./world-edits";

describe("world edits", () => {
  it("ships an empty file, so the city is the generated one", () => {
    expect(worldEdits).toEqual(EMPTY_EDITS);
  });

  it("falls back to empty on anything it does not understand", () => {
    expect(parseEdits(null)).toEqual(EMPTY_EDITS);
    expect(parseEdits({ version: 2, props: [{}] })).toEqual(EMPTY_EDITS);
  });

  it("keeps valid items and drops broken ones", () => {
    const out = parseEdits({
      version: 1,
      props: [
        { id: "a", model: "truck.glb", x: 1, y: 0, z: 2, ry: 0, scale: 1 },
        { id: "b", model: "../secret.txt", x: 1, y: 0, z: 2, ry: 0, scale: 1 },
        { id: "c", model: "truck.glb", x: 1, y: 0, z: 2, ry: 0, scale: 0 },
      ],
      towers: { "t0.1": { at: [3, 4], hide: true, dx: 2, hs: -1, junk: 1 }, bad: { at: [1] } },
      lamps: { l3: { at: [0, 0], dry: 0.5 } },
    });
    expect(out.props.map((p) => p.id)).toEqual(["a"]);
    expect(out.towers).toEqual({ "t0.1": { at: [3, 4], hide: true, dx: 2 } });
    expect(out.lamps.l3).toEqual({ at: [0, 0], dry: 0.5 });
  });

  it("matches an item only where the generator put it", () => {
    expect(editMatches({ at: [10, 20] }, 10.4, 20.2)).toBe(true);
    expect(editMatches({ at: [10, 20] }, 14, 20)).toBe(false);
  });

  it("turns about the item's centre, then shifts", () => {
    const [x, y, z] = editPoint({ at: [10, 10], dry: Math.PI / 2, dx: 5 }, 10, 10, 11, 3, 10);
    // (1, 0) relative, turned a quarter about Y (three.js sense): ends at (0, -1) relative, then +5 on x.
    expect([x, y, z].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([15, 3, 9]);
  });

  it("stretches height from the ground and leaves the footprint", () => {
    const m = editMatrix({ at: [0, 0], hs: 2 }, 0, 0);
    const top = new THREE.Vector3(1, 10, 1).applyMatrix4(m);
    expect(top.toArray()).toEqual([1, 20, 1]);
  });
});
