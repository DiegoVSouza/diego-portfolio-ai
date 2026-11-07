# Reader lint gate evidence

2026-11-07, project root `projects/p07`.

| Command | Exit | Observed output |
|---|---:|---|
| `npx eslint scripts/a11y-reader.mjs` | 0 | No lint diagnostics. |
| `python scripts/check_fast.py` | 0 | `check-fast: OK`; lint, typecheck, catalog, evidence, flow checks passed; 10 test files and 90 tests passed. |
| `python scripts/check_full.py` | 0 | `check-full: PASS`; fast, build, budget, e2e exit 0; 64 browser tests passed in 3.6 minutes. |

The fix declares `document` only for the reader script. The reader was not rerun against the sitemap as part of this lint fix. Full-gate browser tests regenerate their configured screenshots.
