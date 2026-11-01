import * as THREE from "three";
import { V3, bar, box, mergeFlat, wheel } from "./geometry";

/** One generated object per project. The tower and the elevated train come from the v5 scene; the rest follow the plan. */

function lattice(): THREE.BufferGeometry {
  const g: THREE.BufferGeometry[] = [];
  const lv: [number, number][] = [[0, 2.2], [1.6, 1.55], [3.2, 1.05], [4.6, 0.7], [5.8, 0.45]];
  const at = (l: number, k: number) => {
    const [y, r] = lv[l]!;
    return V3((k & 1 ? 1 : -1) * r, y, (k & 2 ? 1 : -1) * r);
  };
  const ring = [0, 1, 3, 2] as const;
  for (let l = 0; l < lv.length - 1; l += 1) {
    for (let k = 0; k < 4; k += 1) g.push(bar(at(l, k), at(l + 1, k), 0.13));
    for (let j = 0; j < 4; j += 1) {
      const a = ring[j]!;
      const b = ring[(j + 1) % 4]!;
      g.push(bar(at(l + 1, a), at(l + 1, b), 0.09), bar(at(l, a), at(l + 1, b), 0.06), bar(at(l, b), at(l + 1, a), 0.06));
    }
  }
  g.push(box(1.7, 0.2, 1.7, 0, 3.2, 0), box(1, 0.16, 1, 0, 4.6, 0), bar(V3(0, 5.8, 0), V3(0, 8.4, 0), 0.08));
  return mergeFlat(g);
}

function elevatedTrain(): THREE.BufferGeometry {
  const g: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 3; k += 1) {
    const x = k * 3.3;
    g.push(box(3, 1.15, 1.05, x, 0, 0), box(2.6, 0.34, 1.1, x, 0.2, 0), box(0.9, 0.12, 0.5, x, 0.68, 0), bar(V3(x - 0.5, 0.7, 0), V3(x + 0.3, 1.18, 0), 0.06), bar(V3(x + 0.3, 1.18, 0), V3(x + 0.9, 0.7, 0), 0.06));
    for (const wx of [-1, 1]) for (const wz of [-0.45, 0.45]) g.push(wheel(0.2, 0.14, x + wx, -0.62, wz));
  }
  g.push(box(10, 0.16, 0.7, 3.3, -0.85, 0), box(0.5, 2, 0.5, 0.6, -1.9, 0), box(0.5, 2, 0.5, 6.2, -1.9, 0));
  return mergeFlat(g);
}

/** SupportOps: a vault door with two keyholes, because two people must agree. */
function vault(): THREE.BufferGeometry {
  return mergeFlat([
    box(4, 4, 0.8, 0, 0, 0),
    new THREE.CylinderGeometry(1.5, 1.5, 0.5, 20).rotateX(Math.PI / 2).translate(0, 0, 0.55),
    box(0.3, 0.8, 0.3, -0.6, 0, 0.9),
    box(0.3, 0.8, 0.3, 0.6, 0, 0.9),
    box(0.25, 2.6, 0.2, 0, 0, 0.95, Math.PI / 2),
  ]);
}

/** Foundation: stacked blocks. */
function blocks(): THREE.BufferGeometry {
  const g: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i += 1) g.push(box(3.4 - i * 0.5, 0.9, 3.4 - i * 0.5, i * 0.15, -1.6 + i * 1.0, 0));
  return mergeFlat(g);
}

/** Toolkit: a toolbox with a handle. */
function toolbox(): THREE.BufferGeometry {
  return mergeFlat([box(3.4, 1.8, 1.8, 0, -0.6, 0), box(3.5, 0.3, 1.9, 0, 0.45, 0), new THREE.TorusGeometry(0.8, 0.12, 6, 14, Math.PI).translate(0, 0.6, 0)]);
}

/** Observability: a radar dish on a mast. */
function radar(): THREE.BufferGeometry {
  return mergeFlat([
    new THREE.CylinderGeometry(0.3, 0.3, 3, 10).translate(0, -0.5, 0),
    new THREE.SphereGeometry(1.9, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.4).rotateX(-Math.PI / 3).translate(0, 1.3, 0),
    box(0.12, 1.6, 0.12, 0, 2, 0.8, 0),
  ]);
}

/** Design system: a torn paper plate with cut-out letters. */
function plate(): THREE.BufferGeometry {
  const g: THREE.BufferGeometry[] = [box(4, 2.6, 0.12, 0, 0, 0, -0.08)];
  for (let i = 0; i < 4; i += 1) g.push(box(0.5, 1.1 - (i % 2) * 0.3, 0.2, -1.3 + i * 0.9, 0, 0.12));
  return mergeFlat(g);
}

/** Harness: a construction crane. */
function crane(): THREE.BufferGeometry {
  return mergeFlat([box(0.4, 5, 0.4, 0, -0.2, 0), box(4.6, 0.3, 0.3, 0.8, 2.4, 0), box(1, 0.8, 0.8, -1.3, 2.1, 0), box(0.08, 1.4, 0.08, 2.6, 1.7, 0)]);
}

export const SYMBOLS: Record<string, () => THREE.BufferGeometry> = {
  supportops: vault,
  foundation: blocks,
  agents: lattice,
  toolkit: toolbox,
  observability: radar,
  async: elevatedTrain,
  "design-system": plate,
  harness: crane,
};

/** Used when a slug has no symbol of its own. */
export const fallbackSymbol = (): THREE.BufferGeometry => mergeFlat([box(2.5, 2.5, 2.5, 0, 0, 0)]);

/** A procedural truck, used for road traffic when the real model cannot be loaded. */
export function truckFallback(): THREE.BufferGeometry {
  const g: THREE.BufferGeometry[] = [box(2.6, 1.2, 1.3, -0.4, 0.2, 0), box(1.1, 0.9, 1.25, 1.5, 0, 0)];
  for (const wx of [-1.1, 1.4]) for (const wz of [-0.7, 0.7]) g.push(wheel(0.3, 0.25, wx, -0.5, wz));
  return mergeFlat(g);
}
