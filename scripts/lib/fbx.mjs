// Shared by the asset scripts: read FBX parts and write a GLB, with no Blender and no FBX2glTF on this machine.
// Nothing from an archive is executed, files are only parsed, and textures are never read.
import { Buffer } from "node:buffer";
import { readFileSync, writeFileSync } from "node:fs";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// A texture reference in an FBX becomes an empty texture (Node has no document to load images with).
THREE.TextureLoader.prototype.load = function () {
  return new THREE.Texture();
};

// GLTFExporter turns a Blob into bytes with FileReader, which Node lacks.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
};

const quiet = (fn) => {
  const warn = console.warn;
  console.warn = () => undefined; // FBXLoader warns once per unsupported texture map
  try {
    return fn();
  } finally {
    console.warn = warn;
  }
};

/** Meshes of one FBX file, in world space, with position and normal only. */
export function loadFbxMeshes(file) {
  const bytes = readFileSync(file);
  const model = quiet(() => new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ""));
  model.updateMatrixWorld(true);
  const out = [];
  model.traverse((o) => {
    if (!o.isMesh) return;
    const geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const key of Object.keys(geometry.attributes)) if (key !== "position" && key !== "normal") geometry.deleteAttribute(key);
    out.push(geometry);
  });
  return out;
}

export const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.1 });

export function writeGlb(root, out) {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(
      root,
      (result) => {
        writeFileSync(out, Buffer.from(result));
        console.log(`${out}: ${result.byteLength} bytes, ${root.children.length} meshes`);
        resolve();
      },
      reject,
      { binary: true },
    );
  });
}

export { THREE };
