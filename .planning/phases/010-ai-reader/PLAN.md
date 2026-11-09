# Plan
1. Add `scripts/a11y-reader.mjs` and run it against `vite preview` on the built `dist/`.
2. Save `artifacts/evidence/a11y-reader/report.{json,md}`.
3. Triage findings; fix real defects in a follow-up phase with their own tests.

allowed_write_paths: `scripts/a11y-reader.mjs`, `artifacts/evidence/a11y-reader/**`, `.planning/phases/010-ai-reader/**`, `docs/harness/decisions.md`.
forbidden_changes: site source, content, deploys. llm_mode: fake; budget: USD 0 (no model calls; the "AI reader" is a deterministic script).
