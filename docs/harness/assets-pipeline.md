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
| `metro-station.glb` | **loafbrr**, Modular Underground Metro (itch.io, https://loafbrr.itch.io/modular-underground-metro), 8 pieces assembled by `scripts/build_station.mjs` | **CC BY 1.0** (credit required: footer and `assets/CREDITS.md`) | 29 KB; 2.9k |
| `train-subway-a.glb`, `train-subway-b.glb`, `train-subway-c.glb` | Kenney Train Kit 1.1: `train-electric-subway-a/b/c` (head, middle, tail), credit also to Guus Vermeulen and Tony Schaer | **CC0** (`License.txt`) | 69 to 81 KB; 1.5k, 1.3k, 1.6k |
| `truck.glb`, `moto.glb` | Kenney | **CC0** | already in the repository |

### What OWNER-DECLARED means (one file)

`Free Sample.zip` (the `Building_06` model) ships no licence file and its origin page was not found. On 2026-11-01 the owner stated that it was free to download and use.
It is recorded as exactly that: `license: OWNER-DECLARED`, with the decision in the ledger entry, a warning from `node tools/assets.mjs audit`, and a separate section in
`assets/CREDITS.md`. It is **not** recorded as CC0, because nobody granted CC0, and the site's footer says it comes from a free pack without a licence file.

What this does not settle: "free to download" is not "free to redistribute". If the author objects, delete the file and its ledger entry; three of the twelve skyline towers
fall back to boxes by themselves.

### The metro station is CC BY 1.0, not unlicensed

The Modular Underground Metro pack looked unlicensed because the zip has no licence file. Its itch.io page names the author (loafbrr) and the licence
(Creative Commons Attribution 1.0 International; the page also says it can be used commercially and modified). It is therefore registered as `CC-BY-1.0`
(`tools/assets.mjs` accepts it with `--allow-cc-by`), the credit is shown in the footer of every page (`Shell.tsx`, with links to the pack and to the licence),
and it is listed under "Atribuição obrigatória" in `assets/CREDITS.md`. The station is a modified work (eight pieces assembled), which the licence allows.

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

# 3b. Kenney Train Kit (GLB with a colormap texture): bake the palette into vertex roles, drop the texture, then prune and weld
python -I scripts/glb_bake_palette.py "<kit>/Models/GLB format/train-electric-subway-a.glb" baked.glb
npx --yes @gltf-transform/cli@4.5.1 prune baked.glb pruned.glb && npx --yes @gltf-transform/cli@4.5.1 weld pruned.glb train-subway-a.glb

# 4. register and audit (CC BY needs --allow-cc-by and shows a credit)
node tools/assets.mjs register assets/game/models/<file>.glb --author ... --license CC0 --url ...
node tools/assets.mjs register assets/game/models/<file>.glb --author ... --license none --url ... --owner-declared "reason"
node tools/assets.mjs credits && node tools/assets.mjs audit
```

Not simplified below 23k triangles: `Building_06` (29 separate meshes; the simplifier stops there). It is used for three towers only.

## Runtime

`src/scene/city.ts` loads the files from the site's own origin (CSP `connect-src 'self'`).

- **Buildings:** in the four towered districts every third (or fourth) tower is one of four building models, scaled to its own height, turned to face the
  avenue (the front is assumed to be +Z), and merged per district. The other towers stay boxes with lit windows.
- **Metro:** two trains of five cars on the viaduct, one on each track: the Kenney subway cars (head, three middle, tail), scaled to 9.4 long. Their palette is baked
  into two numbers per vertex (lightness, accent) and the material mixes the design tokens with them, so the train follows the tokens and needs no texture (the CSP
  has no `blob:` in `img-src`). `canvas[data-train]` says `kenney` or `procedural`; if the models fail, a generated train takes their place.
- **Cars:** the truck, the moto and the two cars share one 13-instance fleet. The cars' front is +X (clear for A_R7, assumed for S64Compact) and is
  turned to +Z.
- **Station:** one, 24 m long, on the viaduct of the platform district, with the platform along the avenue. Two trains shuttle past it.
- `KHR_mesh_quantization` attributes are widened to float before any matrix is applied.
- A model that fails to load logs `did not load` and a generated one takes its place. `canvas[data-landmarks]`, `[data-vehicle-kinds]` and
  `[data-stations]` (one) say which path ran, and `e2e/v2.spec.ts` fails if a fallback was used.
- The files total about 0.6 MB and load after the page is interactive, only where the 3D scene runs (not in portrait or under the simple version).

## Not used

The rest of the Downtown City MegaKit (about 150 modular pieces), the Metro pack's walls, stairs, decals, props and the Unity and Blender files,
the cars' rims and spoilers, and the other two `Building_*` models in the free Downtown pack are unused.
