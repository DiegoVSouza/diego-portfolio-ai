import { describe, expect, it } from "vitest";
import { inspect, judge, parseGlb } from "../../tools/atelier/inspect-core.mjs";

/** A GLB built in memory from a JSON document and a binary chunk. */
function glb(doc: object, bin: Uint8Array): Uint8Array {
  const json = new TextEncoder().encode(JSON.stringify(doc));
  const jsonPad = new Uint8Array(json.length + ((4 - (json.length % 4)) % 4)).fill(0x20);
  jsonPad.set(json);
  const binPad = new Uint8Array(bin.length + ((4 - (bin.length % 4)) % 4));
  binPad.set(bin);
  const out = new Uint8Array(12 + 8 + jsonPad.length + 8 + binPad.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x46546c67, true);
  v.setUint32(4, 2, true);
  v.setUint32(8, out.length, true);
  v.setUint32(12, jsonPad.length, true);
  v.setUint32(16, 0x4e4f534a, true);
  out.set(jsonPad, 20);
  const at = 20 + jsonPad.length;
  v.setUint32(at, binPad.length, true);
  v.setUint32(at + 4, 0x004e4942, true);
  out.set(binPad, at + 8);
  return out;
}

/** A 2 x 1 x 2 box footprint (two triangles are enough) with its node translated by `translation`. */
const model = (translation: number[], extra: object = {}) =>
  glb(
    {
      asset: { version: "2.0" },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, translation }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
      accessors: [
        { bufferView: 0, componentType: 5126, count: 4, type: "VEC3", min: [-1, 0, -1], max: [1, 1, 1] },
        { bufferView: 1, componentType: 5123, count: 6, type: "SCALAR" },
      ],
      bufferViews: [{ buffer: 0, byteLength: 48 }, { buffer: 0, byteOffset: 48, byteLength: 12 }],
      buffers: [{ byteLength: 60 }],
      ...extra,
    },
    new Uint8Array(60),
  );

describe("atelier GLB inspector", () => {
  it("counts triangles and reads bounds through node transforms", () => {
    const report = inspect(parseGlb(model([0, 3, 0])).doc);
    expect(report.triangles).toBe(2);
    expect(report.bounds?.size).toEqual([2, 1, 2]);
    expect(report.originOffset).toEqual({ x: 0, y: 3, z: 0 });
  });

  it("reads quantized (normalized integer) positions in model units", () => {
    const quantized = model([0, 0, 0], {
      accessors: [
        { bufferView: 0, componentType: 5122, normalized: true, count: 4, type: "VEC3", min: [-32767, 0, -32767], max: [32767, 32767, 32767] },
        { bufferView: 1, componentType: 5123, count: 6, type: "SCALAR" },
      ],
    });
    expect(inspect(parseGlb(quantized).doc).bounds?.size).toEqual([2, 1, 2]);
  });

  it("passes a clean model and flags origin, textures and budget problems", () => {
    expect(judge(inspect(parseGlb(model([0, 0, 0])).doc))).toEqual([]);
    expect(judge(inspect(parseGlb(model([0, 3, 0])).doc)).join(" ")).toMatch(/origin is not at the base/);
    const textured = inspect(parseGlb(model([0, 0, 0], { images: [{ uri: "a.png" }], textures: [{ source: 0 }] })).doc);
    expect(judge(textured).join(" ")).toMatch(/CSP/);
    expect(judge(inspect(parseGlb(model([0, 0, 0])).doc), { budget: 1 }).join(" ")).toMatch(/over the budget/);
  });

  it("rejects a file that is not a GLB", () => {
    expect(() => parseGlb(new Uint8Array(32))).toThrow(/not a GLB/);
  });
});
