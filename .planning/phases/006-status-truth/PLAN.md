# Plan 006

allowed_write_paths: `projects/p07/**` for the site; the sibling projects only through their own `status-reconcile` phase, limited to `docs/harness/feature_list.json`, `docs/harness/progress.md`, `docs/harness/decisions.md` and `artifacts/evidence/status-reconcile/`. forbidden: the kit, a colour literal in scene code, a number without evidence, rewriting history.

| Step | What | Evidence |
| --- | --- | --- |
| 1 | F1 read-only verification: hosted CI of nine repositories, console e2e on Fly, P04 queue on Fly, Keycloak on Fly, Pages status | `artifacts/evidence/status-truth/F1-*.txt` |
| 2 | Fix the P07 hosted CI failure (5 e2e tests red on the deployed commit) at the root cause | red then green hosted run |
| 3 | Reconcile feature lists: P01, P04, P05, P06, P00, P07, P08 | each repo `artifacts/evidence/status-reconcile/` |
| 4 | Catalog covers P00 to P08; derive seals; add `status-truth.test.ts` (red first) | vitest output |
| 5 | Adapter P05 to P02 `ExecutionLimits`, ADR for P04 RAG | pytest output in P05, P02 |
| 6 | Production traces from the live stack; model-quality evaluation under the cap | run records |
| 7 | Hygiene: password findings, readiness allowlist | `public_readiness.py` output |
| 8 | Password rotation, clean-tree deploy, push, public e2e 3 of 3 | deploy record, e2e output |

stop conditions: three failed attempts on one failure; any ceiling reached; a red check that can only pass by weakening a test; a finding that is a real secret (stop and tell the owner).
