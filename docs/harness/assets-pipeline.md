# Scene assets: where they come from and how to rebuild them

The originals are packs the owner downloaded by hand (`free-3d-assets-kit/zips/` in the lab). They are not stored in this
repository (the building pack is 254 MB); only the prepared GLB files are, each registered in `assets/ledger.json`.

| Output (`assets/game/models/`) | Source pack | Licence | Notes |
| --- | --- | --- | --- |
| `building-large.glb`, `building-medium.glb`, `building-small.glb` | Quaternius, Downtown City MegaKit [Standard] (`Building_Large_2`, `Building_Medium_2_001`, `Building_Small_1`, glTF) | CC0 1.0 (`License_Standard.txt`) | simplified, no textures |
| `car-r7.glb` | `A_R7.zip`, `Body/A_R7_Body_1.fbx` | CC0 (`licence.txt`); author not named in the pack | converted from FBX |
| `car-s64.glb` | `S64Compact_v1_C.zip`, `Body/S64Compact_Body_1.fbx` | CC0 (`licence.txt`); author not named in the pack | converted from FBX |
| `truck.glb`, `moto.glb` | Kenney | CC0 | already in the repository |

Not used: `ModularUndergroundMetro.zip` and `Free Sample.zip` carry no licence file, so by the project rules they cannot be imported
until the owner confirms a licence.

## Rebuild

```bash
# 1. extract into staging (rejects traversal and links)
python -I tools/safe_extract.py "<pack>.zip" .cache/asset-staging/<name> --max-files 1000 --max-bytes 400000000
# 2. buildings: drop the texture references, then weld, simplify, prune, quantize (gltf-transform 4.5.1)
python -I scripts/glb_strip_textures.py ...   # or its strip() on the .gltf JSON; textures must go BEFORE the GLB is built
npx --yes @gltf-transform/cli@4.5.1 copy x.gltf x.glb && ... weld ... simplify --ratio 0.03 --error 0.3 ... prune --keep-attributes false ... quantize
# 3. cars: FBX has no Blender or FBX2glTF here, so three's own loader is used
node scripts/fbx_to_glb.mjs out.glb Body.fbx && npx --yes @gltf-transform/cli@4.5.1 weld out.glb w.glb && ... quantize w.glb car.glb
# 4. register and audit
node tools/assets.mjs register assets/game/models/<file>.glb --author ... --license CC0 --url ...
node tools/assets.mjs credits && node tools/assets.mjs audit
```

## Runtime

`src/scene/city.ts` loads the files from the site's own origin (CSP `connect-src 'self'`). `KHR_mesh_quantization` attributes are
widened to float before any matrix is applied. A model that fails to load logs `did not load` and the generated model (towers as boxes,
truck fallback) takes its place; `canvas[data-landmarks]` and `canvas[data-vehicle-kinds]` say which path was taken, and
`e2e/v2.spec.ts` fails if a fallback was used. The cars' front is assumed to be +X (clear for A_R7; assumed for S64Compact).
Sizes: buildings 0.3 to 0.57 MB each, cars 35 and 83 KB, loaded after the page is interactive and only where the 3D scene runs.
