#!/usr/bin/env node
// Dev tool: assemble one metro station from the Modular Underground Metro pieces (a 4 m grid, in metres) and write it as a GLB.
// Usage: node scripts/build_station.mjs <Objects dir of the extracted pack> out.glb
// Platform along +x, the track side at +z, the back wall at -z, y up. The scene turns +x along the flight curve.
import { join } from "node:path";
import { THREE, loadFbxMeshes, material, writeGlb } from "./lib/fbx.mjs";

const [dir, out] = process.argv.slice(2);
if (!dir || !out) {
  console.error("usage: build_station.mjs <Objects dir> out.glb");
  process.exit(2);
}

const root = new THREE.Group();
const part = (file, x, y, z, ry = 0) => {
  for (const geometry of loadFbxMeshes(join(dir, file))) {
    geometry.rotateY(ry);
    geometry.translate(x, y, z);
    root.add(new THREE.Mesh(geometry, material));
  }
};

const LENGTH = 24;
for (let x = 0; x < LENGTH; x += 8) part("Metro/FloorPlatform_2.fbx", x, 0, 0); // platform, 8 x 4, top at y = 0
for (let x = 0; x < LENGTH; x += 4) part("Metro/Ceiling.fbx", x, 0, 0); // ceiling over the platform
for (let x = 0; x < LENGTH; x += 2) part("Metro/Wall_1.fbx", x, 0, -4); // back wall
for (let x = 0; x <= LENGTH; x += 8) part("Metro/Post_1.fbx", x - 0.4, 0, -1.2); // posts along the platform edge
for (let x = 0; x < LENGTH; x += 4) {
  part("Rails/Rails_1.fbx", x, -1.0, 2.0); // two rails
  part("Rails/Rails_1.fbx", x, -1.0, 3.5);
}
for (const x of [2, 10, 18]) part("Props/Lights.fbx", x, 2.95, -2);
part("Props/SignBoards_1.fbx", 12, 2.4, -0.3);

await writeGlb(root, out).catch((error) => {
  console.error("export failed", error);
  process.exit(1);
});
