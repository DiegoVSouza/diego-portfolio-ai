import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { flat, mergeGeometries } from "./geometry";

const loader = new GLTFLoader();

/**
 * One GLB from the site's own origin, as a single merged geometry (position, normal when the file has one, and the attributes named in `keep`) in world space.
 * Resolves to null when anything goes wrong, so the caller can fall back to a generated model: no model is required.
 */
export function loadModel(url: string, keep: string[] = []): Promise<THREE.BufferGeometry | null> {
  return fetch(url)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(
      (buffer) =>
        new Promise<THREE.BufferGeometry | null>((resolve) => {
          loader.parse(
            buffer,
            "",
            (gltf) => {
              const list: THREE.BufferGeometry[] = [];
              gltf.scene.updateMatrixWorld(true);
              gltf.scene.traverse((o) => {
                const mesh = o as THREE.Mesh;
                if (!mesh.isMesh) return;
                const g = mesh.geometry.clone();
                // KHR_mesh_quantization keeps normalised integers; a world matrix would overflow them.
                for (const key of ["position", "normal"]) {
                  const attr = g.getAttribute(key);
                  if (!attr || attr.array instanceof Float32Array) continue;
                  const wide = new Float32Array(attr.count * attr.itemSize);
                  for (let i = 0; i < attr.count; i += 1) {
                    wide[i * attr.itemSize] = attr.getX(i);
                    wide[i * attr.itemSize + 1] = attr.getY(i);
                    wide[i * attr.itemSize + 2] = attr.getZ(i);
                  }
                  g.setAttribute(key, new THREE.BufferAttribute(wide, attr.itemSize));
                }
                g.applyMatrix4(mesh.matrixWorld);
                list.push(flat(g, keep));
              });
              resolve(list.length ? mergeGeometries(list) : null);
            },
            () => resolve(null),
          );
        }),
    )
    .catch((error: unknown) => {
      console.warn(`scene: model ${url} did not load, a generated model is used`, error);
      return null;
    });
}
