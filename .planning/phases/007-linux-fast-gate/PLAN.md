# Plan 007

allowed_write_paths: `src/site/Disclosure.tsx`, `src/data/catalog.generated.json`, `.planning/phases/007-linux-fast-gate/**`, `artifacts/evidence/linux-fast-gate-007/**`, `docs/harness/progress.md`.

1. Preserve the red clean Linux run and identify the pending import.
2. Load GSAP on disclosure interaction instead of mount, retaining the native immediate toggle until it is ready.
3. Refresh the catalog after the lab feature status changes; run local and clean Linux fast gates; save commands, exit codes and output.
4. Review staged diff and commit locally.
