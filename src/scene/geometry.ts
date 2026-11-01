import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Give the browser a turn between two heavy build steps, so no single task blocks the page for long. */
export const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Seeded random numbers, so the city is the same on every visit. */
export function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Non-indexed, position and normal only: flat shading and a clean merge. */
export const flat = (g: THREE.BufferGeometry, keep: string[] = []): THREE.BufferGeometry => {
  const out = g.index ? g.toNonIndexed() : g;
  for (const key of Object.keys(out.attributes)) if (key !== "position" && key !== "normal" && !keep.includes(key)) out.deleteAttribute(key);
  return out;
};

export function mergeFlat(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(list.map((g) => flat(g)));
  list.forEach((g) => g.dispose());
  if (!merged) throw new Error("mergeFlat: nothing to merge");
  return merged;
}

/** Centre the geometry and scale its longest side to `size`. */
export function fit(g: THREE.BufferGeometry, size: number): THREE.BufferGeometry {
  g.computeBoundingBox();
  const box = g.boundingBox!;
  const centre = box.getCenter(V3(0, 0, 0));
  const extent = box.getSize(V3(0, 0, 0));
  const k = size / Math.max(extent.x, extent.y, extent.z);
  g.translate(-centre.x, -centre.y, -centre.z);
  g.scale(k, k, k);
  return g;
}

const UP = V3(0, 1, 0);

/** A square bar from a to b. */
export function bar(a: THREE.Vector3, b: THREE.Vector3, w: number): THREE.BufferGeometry {
  const d = b.clone().sub(a);
  const length = d.length();
  const g = new THREE.BoxGeometry(w, length, w);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

export const box = (w: number, h: number, d: number, x: number, y: number, z: number, rz = 0): THREE.BufferGeometry =>
  new THREE.BoxGeometry(w, h, d).rotateZ(rz).translate(x, y, z);

export const wheel = (r: number, w: number, x: number, y: number, z: number): THREE.BufferGeometry =>
  new THREE.CylinderGeometry(r, r, w, 8).rotateX(Math.PI / 2).translate(x, y, z);

/** Give a geometry one vertex colour. */
export function tint(g: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const count = g.attributes.position!.count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

export { mergeGeometries };
