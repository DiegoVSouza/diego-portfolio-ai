# Scene assets: where they come from, their status, and how to rebuild them

The originals are packs the owner downloaded by hand (`free-3d-assets-kit/zips/` in the lab). They are not stored in this
repository (the building pack alone is 254 MB); only the prepared GLB files are, each registered in `assets/ledger.json`.

## What is used

| Output (`assets/game/models/`) | Source | Licence status | Size, triangles |
| --- | --- | --- | --- |
| `building-large.glb`, `building-medium.glb`, `building-small.glb` | Quaternius, Downtown City MegaKit [Standard]: `Building_Large_2`, `Building_Medium_2_001`, `Building_Small_1` (glTF) | **CC0 1.0** (`License_Standard.txt`) | 42 / 29 / 26 KB; 2.4k / 1.7k / 1.3k |
| `car-r7.glb` | `A_R7.zip`, `Body/A_R7_Body_1.fbx` | **CC0** (`licence.txt`); author not named | 83 KB; 3.8k |
| `car-s64.glb` | `S64Compact_v1_C.zip`, `Body/S64Compact_Body_1.fbx` | **CC0** (`licence.txt`); author not named | 35 KB; 1.6k |
| `building-sample.glb` | `Free Sample.zip`, `Building_06.fbx` | **OWNER-DECLARED** (no licence file) | 256 KB; 23k |
| `metro-station.glb` | `ModularUndergroundMetro.zip`, 8 pieces assembled by `scripts/build_station.mjs` | **OWNER-DECLARED** (no licence file) | 29 KB; 2.9k |
| `truck.glb`, `moto.glb` | Kenney | **CC0** | already in the repository |

### What OWNER-DECLARED means

`Free Sample.zip` and `ModularUndergroundMetro.zip` ship no licence file. On 2026-11-01 the owner stated that both were free to download and use,
and asked for them to be used. They are recorded as exactly that: `license: OWNER-DECLARED`, with the decision written in the ledger entry,
a warning from `node tools/assets.mjs audit` for every such file, and a separate section in `assets/CREDITS.md`. They are **not** recorded as CC0,
because nobody granted CC0, and the site's footer says they come from free packs without a licence file.

What this does not settle: "free to download" is not the same as "free to redistribute". The site serves these two GLB files to every visitor,
so if either pack's author objects, the file must come out. Removal is local: delete the file and its ledger entry, and the scene falls back on
its own (`building-sample`: three of the twelve towers fall back to boxes; `metro-station`: no stations). The owner can lift the warning by finding
the packs' pages and licence terms and re-registering them with a real licence.

## Rebuild

```bash
# 1. extract into staging (rejects traversal and links)
python -I tools/safe_extract.py "<pack>.zip" .cache/asset-staging/<name> --max-files 1000 --max-bytes 400000000

# 2. Quaternius buildings (glTF). Remove the texture references AND the normals from the .gltf JSON before building the GLB:
#    normals are per face, so the vertices cannot be welded and `simplify` stalls (45k triangles stayed at 16k; without them, 2.4k).
#    The scene shades flat, so it does not need them. Then (gltf-transform 4.5.1, exact):
npx --yes @gltf-transform/cli@4.5.1 copy x.gltf x.glb
npx --yes @gltf-transform/cli@4.5.1 prune x.glb x2.glb --keep-attributes false
npx --yes @gltf-transform/cli@4.5.1 weld x2.glb x3.glb
npx --yes @gltf-transform/cli@4.5.1 simplify x3.glb x4.glb --ratio 0.03 --error 0.3
npx --yes @gltf-transform/cli@4.5.1 quantize x4.glb building-large.glb

# 3. FBX (no Blender or FBX2glTF on this machine; three's own loader is used, textures are never read)
node scripts/fbx_to_glb.mjs out.glb Body.fbx                       # cars: keep normals
node scripts/fbx_to_glb.mjs --no-normals out.glb Building_06.fbx   # buildings: then weld, simplify, prune, quantize as above
node scripts/build_station.mjs "<extracted>/Objects" station.glb   # metro station, then weld and quantize

# 4. register and audit
node tools/assets.mjs register assets/game/models/<file>.glb --author ... --license CC0 --url ...
node tools/assets.mjs register assets/game/models/<file>.glb --author ... --license none --url ... --owner-declared "reason"
node tools/assets.mjs credits && node tools/assets.mjs audit
```

Not simplified below 23k triangles: `Building_06` (29 separate meshes; the simplifier stops there). It is used for three towers only.

## Runtime

`src/scene/city.ts` loads the files from the site's own origin (CSP `connect-src 'self'`).

- **Buildings:** every third tower of the skyline is one of four building models, scaled to a height of 24 to 46, turned to face the avenue
  (the front is assumed to be +Z), and merged into one mesh. The other towers stay boxes with lit windows.
- **Cars:** the truck, the moto and the two cars share one 13-instance fleet. The cars' front is +X (clear for A_R7, assumed for S64Compact) and is
  turned to +Z.
- **Stations:** one per project, 24 m long, hung 9.5 units to the left of the flight curve with the track side facing the avenue and the platform
  along the curve. It is the site's metro line made solid.
- `KHR_mesh_quantization` attributes are widened to float before any matrix is applied.
- A model that fails to load logs `did not load` and a generated one takes its place. `canvas[data-landmarks]`, `[data-vehicle-kinds]` and
  `[data-stations]` say which path ran, and `e2e/v2.spec.ts` fails if a fallback was used.
- The files total about 0.6 MB and load after the page is interactive, only where the 3D scene runs (not in portrait or under the simple version).

## Not used

The rest of the Downtown City MegaKit (about 150 modular pieces), the Metro pack's walls, stairs, decals, props and the Unity and Blender files,
the cars' rims and spoilers, and the other two `Building_*` models in the free Downtown pack are unused.
