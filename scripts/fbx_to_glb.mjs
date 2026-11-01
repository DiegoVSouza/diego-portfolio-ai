#!/usr/bin/env node
// Dev tool: FBX parts -> one GLB (geometry and colour only). Usage: node scripts/fbx_to_glb.mjs out.glb in1.fbx [in2.fbx ...]
// There is no Blender or FBX2glTF on this machine, so the parts are read with three's own FBXLoader and written with its
// GLTFExporter. Nothing from the archives is executed: the files are only parsed. Textures are never read.
import { Buffer } from "node:buffer";
import { readFileSync, writeFileSync } from "node:fs";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// GLTFExporter turns a Blob into bytes with FileReader, which Node lacks.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
};

const [out, ...inputs] = process.argv.slice(2);
if (!out || inputs.length === 0) {
  console.error("usage: fbx_to_glb.mjs out.glb in1.fbx [in2.fbx ...]");
  process.exit(2);
}

const root = new THREE.Group();
const loader = new FBXLoader();
const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.1 });
for (const file of inputs) {
  const bytes = readFileSync(file);
  const model = loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (!o.isMesh) return;
    const geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const key of Object.keys(geometry.attributes)) if (key !== "position" && key !== "normal") geometry.deleteAttribute(key);
    root.add(new THREE.Mesh(geometry, material));
  });
}
if (root.children.length === 0) {
  console.error("no mesh found in the inputs");
  process.exit(1);
}

const exporter = new GLTFExporter();
exporter.parse(
  root,
  (result) => {
    writeFileSync(out, Buffer.from(result));
    console.log(`${out}: ${result.byteLength} bytes, ${root.children.length} meshes`);
  },
  (error) => {
    console.error("export failed", error);
    process.exit(1);
  },
  { binary: true },
);
