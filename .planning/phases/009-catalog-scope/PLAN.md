# Plan

1. Filter OUT_OF_SCOPE records before catalog generation and cover the P08 scope regression.
2. Refresh the generated catalog and run project fast/full gates, saving logs.

allowed_write_paths: `scripts/catalog.mjs`, `src/status-truth.test.ts`, `src/content/seal.ts`, `src/data/catalog.generated.json`, `.planning/phases/009-catalog-scope/**`, `artifacts/evidence/catalog-scope-009/**`, `docs/harness/progress.md`.

forbidden_changes: publication, other projects, historical artifacts and review outcomes. llm_mode: fake; budget: USD 0; max_tries: 3. Validation: full local gate; stop after three failures or unavailable runtime.
