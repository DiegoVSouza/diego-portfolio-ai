# Phase 006: status truth

Status: done, with the open items listed in VERIFY.md. Owner request (2026-11-02): map every wrong or stale status label on the published projects, fix them, and build what is still missing. Roadmap: lab `docs/harness/portfolio/PLANO-CORRECAO-STATUS.pt-BR.md`.

## Contract

Every seal on a case card is derived from a feature record that cites evidence. A seal can never say more than the record proves, and a record that is stale fails the build.

## Requirements

| ID | Requirement |
| --- | --- |
| STAT-001 | Each card seal is generated from the catalog (feature states and the pending tokens of their `status`), not typed by hand |
| STAT-002 | The catalog covers P00 to P08. P07 and P08 read their own `docs/harness/feature_list.json` |
| STAT-003 | A test fails when a seal claims "published" or "live" without a deploy record in `artifacts/evidence/pages/`, claims a pending axis no feature carries, or hides one a feature carries |
| STAT-004 | A bare `passes: true` with no evidence stays `claimed` and the seal says so. The owning project links evidence so the claim becomes `verified` |
| STAT-005 | Hosted CI must be green on the commit that is deployed. A red hosted CI blocks the word "verified" on that card |
| STAT-006 | Numbers, versions and dates in labels come from a record. No record, no number |

## Owner decisions (2026-11-02)

- A "third-party IdP" means a provider outside the lab. Keycloak on Fly is ours: record it as `PASS_KEYCLOAK_ON_FLY; THIRD_PARTY_IDP_PENDING`.
- P02 token limit: add a real adapter in P05 that reports usage through `ExecutionLimits.consume`, with a contract test.
- P04 RAG moves to P05 and leaves the P04 feature list, with a short ADR.
- Shatter option B is not built. Option A stays.
- Turnstile widget exists; keys live in the lab `.env` (never committed). Pages already serves `startAvailable: true`.
- Device FPS (SCENE-005) stays `PENDING`.
- Authorized by the owner for this phase: confirming live smoke, waking the stack for production traces, a model-quality evaluation (cap set in the plan), password rotation, push and deploy. Each still respects the USD 10 model and USD 5 Fly ceilings and the counters already spent.

## Out of scope

History rewrites; the kit; any number without a recorded run.
