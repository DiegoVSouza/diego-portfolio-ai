#!/usr/bin/env node
// Dev tool: FBX parts -> one GLB (geometry only). Usage: node scripts/fbx_to_glb.mjs [--no-normals] out.glb in1.fbx [in2.fbx ...]
// --no-normals drops the normals so the vertices can be welded and simplified (the scene shades flat and does not need them).
import { THREE, loadFbxMeshes, material, writeGlb } from "./lib/fbx.mjs";

const args = process.argv.slice(2);
const noNormals = args[0] === "--no-normals";
const [out, ...inputs] = noNormals ? args.slice(1) : args;
if (!out || inputs.length === 0) {
  console.error("usage: fbx_to_glb.mjs [--no-normals] out.glb in1.fbx [in2.fbx ...]");
  process.exit(2);
}
const root = new THREE.Group();
for (const file of inputs) for (const geometry of loadFbxMeshes(file)) {
    if (noNormals) geometry.deleteAttribute("normal");
    root.add(new THREE.Mesh(geometry, material));
  }
if (root.children.length === 0) {
  console.error("no mesh found in the inputs");
  process.exit(1);
}
await writeGlb(root, out).catch((error) => {
  console.error("export failed", error);
  process.exit(1);
});
