# Plan

1. Replace the paragraph containing LazyPalette with a neutral block container.
2. Refresh generated catalog inputs and execute the required fast and full local checks, saving output and exit codes.

allowed_write_paths: `src/site/Shell.tsx`, `src/data/catalog.generated.json`, `src/data/evidence.generated.json`, `.planning/phases/008-footer-markup/**`, `artifacts/evidence/footer-markup-008/**`, `docs/harness/progress.md`.

forbidden_changes: external publication, other projects, model calls, accessibility review outcomes. llm_mode: fake; budget: USD 0; max_tries: 3. Stop on unavailable browser/runtime or three failed gate attempts. Validation: `python scripts/check_fast.py` and `python scripts/check_full.py`.
