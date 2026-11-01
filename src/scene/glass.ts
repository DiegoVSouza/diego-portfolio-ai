import * as THREE from "three";
import { mergeGeometries } from "./geometry";
import type { Palette } from "./tokens";

/** One ring of broken glass, a mesh of irregular extruded shards in four tones. The camera flies through it. */
export function buildPane(rnd: () => number, p: Palette): THREE.BufferGeometry {
  const tones: [THREE.Color, number][] = [
    [p.ink2, 0.66],
    [p.mix(p.ink2, p.paper, 0.1), 0.2],
    [p.red, 0.09],
    [p.paper, 0.05],
  ];
  const pick = () => {
    const r = rnd();
    let a = 0;
    for (const [c, w] of tones) {
      a += w;
      if (r <= a) return c;
    }
    return tones[0]![0];
  };
  const radii = [7.6, 10.2, 14, 19];
  const grid: THREE.Vector2[][] = [];
  radii.forEach((R, k) => {
    const n = 9 + k * 3;
    const row: THREE.Vector2[] = [];
    for (let j = 0; j < n; j += 1) {
      const a = ((j + (rnd() - 0.5) * 0.55) / n) * Math.PI * 2;
      const r = R * (1 + (rnd() - 0.5) * 0.18);
      row.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
    }
    grid.push(row);
  });
  const geos: THREE.BufferGeometry[] = [];
  const add = (pts: THREE.Vector2[]) => {
    if (rnd() < 0.4) return;
    const c = new THREE.Vector2();
    pts.forEach((q) => c.add(q));
    c.multiplyScalar(1 / pts.length);
    const shape = new THREE.Shape(pts.map((q) => new THREE.Vector2(c.x + (q.x - c.x) * 0.94, c.y + (q.y - c.y) * 0.94)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
    g.translate(-c.x, -c.y, 0);
    g.rotateX((rnd() - 0.5) * 0.5);
    g.rotateY((rnd() - 0.5) * 0.5);
    g.rotateZ((rnd() - 0.5) * 0.15);
    const push = 1 + rnd() * 0.05;
    g.translate(c.x * push, c.y * push, (rnd() - 0.5) * 2.4);
    const col = pick();
    const count = g.attributes.position!.count;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = col.r;
      arr[i * 3 + 1] = col.g;
      arr[i * 3 + 2] = col.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    g.deleteAttribute("uv");
    geos.push(g);
  };
  for (let k = 0; k < radii.length - 1; k += 1) {
    const A = grid[k]!;
    const B = grid[k + 1]!;
    for (let j = 0; j < A.length; j += 1) {
      const a0 = A[j]!;
      const a1 = A[(j + 1) % A.length]!;
      const jb = Math.min(B.length - 1, Math.round((j * B.length) / A.length));
      const jb1 = Math.round(((j + 1) * B.length) / A.length) % B.length;
      const b0 = B[jb]!;
      const b1 = B[jb1]!;
      if (rnd() < 0.4) {
        add([a0, a1, b1]);
        add([a0, b1, b0]);
      } else add([a0, a1, b1, b0]);
    }
  }
  const merged = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  if (!merged) throw new Error("glass: empty pane");
  return merged;
}
