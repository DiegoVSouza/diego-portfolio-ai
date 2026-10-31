# Plan

1. Tooling: package, TypeScript, ESLint, Vitest, budget script, real `check_fast.py` and `check_full.py` replacing the placeholders.
2. Data: `scripts/catalog.mjs` generates `src/data/catalog.generated.json` from sibling `feature_list.json` files; `catalog:check` detects drift; `projects.ts` holds curated EN and pt-BR text.
3. Application: tokens, layout, home, project page, method section, language toggle, with unit and axe tests.
4. Browser gate: Playwright + axe against `vite preview`, home and every project page at 1280 and 360 px.
5. Docs: `README.md`, `README.pt-BR.md`, `docs/architecture.md`.

allowed_write_paths: `projects/p07/**`.

forbidden_changes: `harness-kit/`, other projects' files, secrets, third-party runtime origins, any number without a source, removing or weakening a test to pass, deploy or push.

llm_mode: fake (no model). budget: USD 0. validation: `python scripts/check_full.py` plus the e2e run recorded in VERIFY.md.

stop conditions: three failed attempts on one failure, or a change that needs a deploy or push.
