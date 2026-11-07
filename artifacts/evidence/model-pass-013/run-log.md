# Executed checks — 2026-11-07

- `npm run atelier -- status`: exit 0. Node v24.12.0, Python 3.13.12, Blender 5.2.1 LTS, MCP port 9876 up.
- `npm run atelier -- inspect assets/game/models`: exit 1. Sample 23,366 triangles, 549.99 x 1280.01 x 1120.00; over budget and base -699.59. Large/medium/small building footprint offsets 8.06/5.97/5.41; station offset 12.05.
- Live MCP: addon 1.8, protocol 15, telemetry false. Saved `.cache/blender-session-backup.blend` before edits. Imported candidate and viewed front/right/top/three-quarter. Hexagonal facade and overall silhouette remain visible. No human approval claimed.
- `npm run atelier -- improve assets/game/models/building-sample.glb .cache/atelier-out/building-sample-013.glb --budget 7800 --height 12.8`: exit 0. 23,366 -> 7,799 triangles. glTF bounds 5.4998 x 12.8 x 11.2. Inspect clean. Machine-readable result: `artifacts/evidence/atelier/building-sample-013.improve.json`.
- `npm run atelier -- palette .cache/atelier-out/building-sample-013.glb .cache/atelier-out/building-sample-013-palette.glb`: exit 1, KeyError images. Source has no textures; building runtime replaces colour with token tint. No palette output integrated.
- `node tools/assets.mjs register ... --from ... --owner-declared ...`: exit 0, one derivative registered. Original retained; license exception preserved.
- `node tools/assets.mjs audit`: exit 0, OK (15 files), expected OWNER-DECLARED warnings for original and derivative.
- `npx vitest run`: exit 0, 10 files / 90 tests passed (before the subsequent normals compatibility fix).
- `npx eslint src e2e`: exit 0 (before the subsequent normals compatibility fix).
- `python scripts/check_fast.py`: exit 1, eight pre-existing no-undef errors for document in untracked `scripts/a11y-reader.mjs`, lines 31,34,36,38,41,48,49,50.
- `python scripts/check_full.py`: exit 1 at fast, same errors.
- First browser run interrupted after two scene-start failures. Cause: new Blender normals mixed with old exports without normals. Fixed by computing missing building normals before merging.
- `npx playwright test e2e/scene.spec.ts e2e/v2.spec.ts e2e/city-fixes.spec.ts`: rerun exit 0, 24 passed (1.1m), including real model loading and first-frame budget assertions.
- Atelier browser tool failed twice: kernel exited, Windows sandbox helper setup refresh errors. Models palette/wire review remains pending.
- Read regenerated `city-fixes-011/stop-3.png`: card readable, frame and lamps outside its rectangle; dense halftone hides small facade details. This image does not establish isolated-model quality at distance 40.

Remaining scope: other origin/scale fixes, selected props, atelier review, complete technical and visual acceptance. No deploy or push.
