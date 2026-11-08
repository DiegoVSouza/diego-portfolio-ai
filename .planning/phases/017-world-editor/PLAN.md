# Plan

allowed_write_paths: `.planning/phases/017-world-editor/`, `src/scene/`, `src/atelier/`, `atelier.html`, `vite.config.ts`, `tools/atelier/`, `docs/atelier/`, `docs/harness/progress.md`, `e2e/`, `artifacts/evidence/world-editor-017/`.
Not touched: the owner's uncommitted `docs/harness/decisions.md`, `.planning/phases/010-ai-reader/`, `scripts/a11y-reader.mjs`, `docs/atelier/PROMPT-MODELADOR.pt-BR.md`, evidence screenshots.

1. Phase documents — `docs(planning)`.
2. `src/scene/world-edits.ts` + test (schema, validate, rigid transform, id parse) — `feat(scene)`.
3. Hooks in `world.ts`: tower edits, lamp edits, props, `editables()` — `feat(scene)`. Empty edits = same world (e2e unchanged).
4. Dev endpoint (`tools/atelier/vite-world-edits.mjs`) + vite config — `feat(atelier)`.
5. `src/scene/editor.ts` (dev only, loaded by `?edit=1`) and the "World" tab — `feat(atelier)`.
6. Guide, progress, VERIFY with gates (`check_fast.py`, `check_full.py`) — `docs(atelier)`.
