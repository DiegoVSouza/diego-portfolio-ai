/**
 * Wheels for the two car models. Both GLBs are bodies with empty wheel arches (the packs ship the wheels as separate files), so the scene
 * adds wheels itself and the atelier viewer adds the same ones, from this one place.
 *
 * Frame: the car after `rotateY(-PI / 2)` (front +Z), centred, its longest side scaled to `size`: what `fit()` makes of the body.
 */
import * as THREE from "three";
import { mergeGeometries, tint } from "./geometry";

export const CAR_SIZE = 7.4;
export type CarKind = "s64" | "r7";
export const carKindOf = (file: string): CarKind | null => (/car-s64/.test(file) ? "s64" : /car-r7/.test(file) ? "r7" : null);

/** One wheel: a tyre and, outside it, a light hub. `x` decides the side. */
function wheel(tyreColor: THREE.Color, hubColor: THREE.Color, r: number, w: number, x: number, y: number, z: number, hubRadius: number, hubWidth: number): THREE.BufferGeometry[] {
  const side = Math.sign(x);
  const tyre = tint(new THREE.CylinderGeometry(r, r, w, 12).rotateZ(Math.PI / 2).translate(x, y, z), tyreColor);
  const hub = tint(new THREE.CylinderGeometry(hubRadius, hubRadius, hubWidth, 12).rotateZ(Math.PI / 2).translate(x + (side * (w + hubWidth)) / 2, y, z), hubColor);
  return [tyre, hub];
}

/** S64: the source is a body shell only. Four wheels fill its arches (centres measured on the fitted model). */
export function s64Wheels(tyre: THREE.Color, hub: THREE.Color): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const x of [-1.36, 1.36]) for (const z of [-2.47, 2.52]) parts.push(...wheel(tyre, hub, 0.53, 0.35, x, -0.72, z, 0.3, 0.06));
  return mergeGeometries(parts)!;
}

/**
 * R7: also a body shell (its arches are empty too). Axles at 88 and -114.5 along the length, wheel centres 20.5 up, in the source's units;
 * `box` is the rotated, unscaled body's bounds, so the numbers map through the same centring and scale as `fit()`.
 */
export function r7Wheels(box: THREE.Box3, tyre: THREE.Color, hub: THREE.Color): THREE.BufferGeometry {
  const c = box.getCenter(new THREE.Vector3());
  const e = box.getSize(new THREE.Vector3());
  const k = CAR_SIZE / Math.max(e.x, e.y, e.z);
  const parts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) for (const along of [88, -114.5]) {
    parts.push(...wheel(tyre, hub, 20.5 * k, 24 * k, (side * 62 - c.x) * k, (20.5 - c.y) * k, (along - c.z) * k, 13 * k, 3 * k));
  }
  return mergeGeometries(parts)!;
}
