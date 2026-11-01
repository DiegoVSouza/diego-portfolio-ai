# Plan 005

allowed_write_paths: `projects/p07/**`. forbidden: the kit, a colour literal in scene code, scroll hijack, a number without evidence.

| Step | What | Evidence |
| --- | --- | --- |
| 1 | `src/content/districts.ts`: districts, names, blurbs (EN, PT); slug to district map | unit test |
| 2 | `src/scene/rail.ts`, `world.ts`, `scene.ts`: the new city, rail camera, controller (old `city.ts`, `glass.ts`, the ring and ghost code removed) | tsc, first-frame screenshots per district |
| 3 | `SceneHost` passes districts; models loaded as before | e2e scene |
| 4 | Home as districts; `DistrictMenu` (game menu); CSS | e2e, screenshots |
| 5 | Update e2e: scene contracts, menu, travel | `npx playwright test` in Edge |
| 6 | Budget, docs, commit | `check_fast`, budget |

stop conditions: three failed attempts on one failure; first-load budget exceeded; a draw-call count over 100.
