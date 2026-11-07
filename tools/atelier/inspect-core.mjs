// Pure glTF 2.0 inspector core (no node imports, so the atelier page can use it in the browser).
const MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
/** A normalized integer accessor stores value / this (KHR_mesh_quantization); its min and max are raw integers. */
const NORMALIZER = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** Split a GLB into its JSON document and its binary chunk. */
export function parseGlb(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 20 || view.getUint32(0, true) !== MAGIC) throw new Error("not a GLB file");
  if (view.getUint32(4, true) !== 2) throw new Error("only glTF 2.0 is supported");
  let doc = null;
  let bin = null;
  for (let offset = 12; offset < view.getUint32(8, true); ) {
    const size = view.getUint32(offset, true);
    const kind = view.getUint32(offset + 4, true);
    const body = bytes.subarray(offset + 8, offset + 8 + size);
    if (kind === JSON_CHUNK) doc = JSON.parse(new TextDecoder().decode(body));
    else if (bin === null) bin = body;
    offset += 8 + size;
  }
  if (!doc) throw new Error("GLB has no JSON chunk");
  return { doc, bin };
}

/** Column-major 4x4 of a node: its `matrix`, or translation, rotation (quaternion) and scale. */
function local(node) {
  if (node.matrix) return node.matrix.slice();
  const [x = 0, y = 0, z = 0, w = 1] = node.rotation ?? [];
  const [sx = 1, sy = 1, sz = 1] = node.scale ?? [];
  const [tx = 0, ty = 0, tz = 0] = node.translation ?? [];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}
function mul(a, b) {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c += 1) for (let r = 0; r < 4; r += 1) for (let k = 0; k < 4; k += 1) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}
const apply = (m, [x, y, z]) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];

/** Describe a parsed glTF document. */
export function inspect(doc) {
  const accessors = doc.accessors ?? [];
  const meshes = doc.meshes ?? [];
  const nodes = doc.nodes ?? [];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let triangles = 0;
  let vertices = 0;
  const attributes = new Set();
  const visitMesh = (index, world) => {
    for (const prim of meshes[index]?.primitives ?? []) {
      Object.keys(prim.attributes ?? {}).forEach((a) => attributes.add(a));
      const position = accessors[prim.attributes?.POSITION];
      if (!position) continue;
      const count = prim.indices !== undefined ? accessors[prim.indices].count : position.count;
      const mode = prim.mode ?? 4;
      vertices += position.count;
      if (mode === 4) triangles += Math.floor(count / 3);
      else if (mode === 5 || mode === 6) triangles += Math.max(0, count - 2);
      if (!position.min || !position.max) continue;
      const unit = position.normalized ? NORMALIZER[position.componentType] ?? 1 : 1;
      const lo = position.min.map((v) => v / unit);
      const hi = position.max.map((v) => v / unit);
      for (let i = 0; i < 8; i += 1) {
        const p = apply(world, [i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2]]);
        for (let k = 0; k < 3; k += 1) {
          min[k] = Math.min(min[k], p[k]);
          max[k] = Math.max(max[k], p[k]);
        }
      }
    }
  };
  const visit = (index, parent) => {
    const node = nodes[index];
    const world = mul(parent, local(node));
    if (node.mesh !== undefined) visitMesh(node.mesh, world);
    (node.children ?? []).forEach((c) => visit(c, world));
  };
  const roots = doc.scenes?.[doc.scene ?? 0]?.nodes ?? nodes.map((_, i) => i);
  roots.forEach((r) => visit(r, IDENTITY));
  const finite = Number.isFinite(min[0]);
  return {
    triangles,
    vertices,
    meshes: meshes.length,
    nodes: nodes.length,
    materials: (doc.materials ?? []).length,
    textures: (doc.textures ?? []).length,
    images: (doc.images ?? []).length,
    animations: (doc.animations ?? []).map((a) => ({ name: a.name ?? "", channels: a.channels?.length ?? 0 })),
    skins: (doc.skins ?? []).length,
    attributes: [...attributes].sort(),
    extensionsUsed: doc.extensionsUsed ?? [],
    bounds: finite ? { min, max, size: max.map((v, i) => v - min[i]) } : null,
    /** Where the footprint centre and the base sit relative to the origin: a model placed on the ground wants both near zero. */
    originOffset: finite ? { x: (min[0] + max[0]) / 2, y: min[1], z: (min[2] + max[2]) / 2 } : null,
  };
}

/** Problems against the site rules. `budget` is the triangle ceiling. */
export function judge(report, { budget = 8000, tolerance = 0.05 } = {}) {
  const problems = [];
  if (report.textures > 0 || report.images > 0) problems.push("carries textures: the CSP has no blob: img-src, bake a palette (scripts/glb_bake_palette.py) or strip them");
  if (report.triangles > budget) problems.push(`${report.triangles} triangles is over the budget of ${budget}`);
  if (!report.bounds) problems.push("no bounds: the model has no position data");
  else {
    const size = Math.max(...report.bounds.size);
    const off = report.originOffset;
    if (Math.abs(off.y) > tolerance * size) problems.push(`origin is not at the base (the base is ${off.y.toFixed(2)} from the origin)`);
    if (Math.hypot(off.x, off.z) > 0.15 * size) problems.push(`origin is off the footprint centre by ${Math.hypot(off.x, off.z).toFixed(2)}`);
  }
  if (report.extensionsUsed.some((e) => /draco|meshopt|basisu/i.test(e))) problems.push(`needs a decoder at runtime: ${report.extensionsUsed.join(", ")}`);
  if (report.skins > 0 && report.animations.length === 0) problems.push("has a skin but no animation clips");
  return problems;
}
