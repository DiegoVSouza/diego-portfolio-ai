import { describe, expect, it } from "vitest";
import { validate } from "../../tools/atelier/vite-world-edits.mjs";

describe("world-edits endpoint validation", () => {
  const ok = { version: 1, props: [], towers: { "t0.1": { at: [1, 2], hide: true } }, lamps: { l3: { at: [0, 0], dx: 1 } } };
  it("accepts a good file", () => expect(validate(ok)).toBeNull());
  it("rejects a wrong version, a path-like model and a bad id", () => {
    expect(validate({ ...ok, version: 2 })).toMatch(/version/);
    expect(validate({ ...ok, props: [{ id: "a", model: "../x.glb", x: 0, y: 0, z: 0, ry: 0, scale: 1 }] })).toMatch(/bad prop/);
    expect(validate({ ...ok, towers: { "../x": { at: [0, 0] } } })).toMatch(/bad id/);
    expect(validate({ ...ok, lamps: { l1: { at: [0, 0], dx: "a" } } })).toMatch(/dx/);
  });
});
