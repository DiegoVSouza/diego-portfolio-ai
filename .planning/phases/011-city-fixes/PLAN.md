# Plan

1. Red first: unit tests for the train turnaround, board layout and rail extension (`src/scene/city-fixes.test.ts`).
2. Implement C3, C4 (world.ts), C7 + C6 + C5 (rail.ts, world.ts), C1 + C2 (scene.ts, DistrictMenu.tsx).
3. Run `python scripts/check_fast.py`; run the scene e2e specs if a browser is available; save logs.

allowed_write_paths: `src/scene/**`, `src/site/DistrictMenu.tsx`, `e2e/**` (only specs about the menu or scene), `.planning/phases/011-city-fixes/**`, `artifacts/evidence/city-fixes-011/**`, `docs/harness/progress.md`.

forbidden_changes: publication, deploy, other projects, assets, the uncommitted phase 010 files. llm_mode: fake; budget: USD 0; max_tries: 3.
