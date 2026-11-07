# Plan

allowed_write_paths: `.planning/phases/016-world-direction/`, `src/scene/`, `src/site/DistrictMenu.tsx` (per-leg flight time only), `e2e/`, `tools/world-direction*`, `artifacts/evidence/world-direction-016/`, `docs/world/`, `docs/harness/`, `.cache/`.
Read-only: sibling projects, `free-3d-assets-kit`. Existing uncommitted files of the owner (screenshots, `docs/harness/decisions.md`, `.planning/phases/010-ai-reader/`, `scripts/a11y-reader.mjs`, `docs/atelier/PROMPT-MODELADOR.pt-BR.md`) are not touched or staged.

1. Phase documents (this folder) — commit `docs(planning)`.
2. Audit tooling: dev-only frame probe, motion sampler, oriented-box collision analysis (`tools/world-direction-*`) — commit `test(scene)` / `chore(tools)`.
3. Run the audit on the current state; record findings in `artifacts/evidence/world-direction-016/FINDINGS.md`.
4. One fix per confirmed defect, test first, commit `fix(scene)`.
5. Surroundings plan with annotated captures (`docs/world/`), commit `docs(world)`.
6. Local reversible improvements from the plan, each with test/evidence, commit `feat(scene)`.
7. Gates: `check_fast.py`, `check_full.py`; VERIFY.md; commit `docs(planning)`.
