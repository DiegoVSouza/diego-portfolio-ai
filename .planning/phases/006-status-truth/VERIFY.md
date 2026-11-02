# Verify 006

Evidence is under `artifacts/evidence/status-truth/` unless another path is given.

- [x] Hosted CI green on every repository head (`F6-hosted-ci-after-push.txt`: eight green; P07 was red on `f2efce2` and green on `bd1d3b1`, `F7-p07-hosted-ci.txt`)
- [x] Hosted CI of P07 green on the fixed head, which is what was deployed (`F7-p07-hosted-ci.txt`)
- [x] `status-truth.test.ts` red before (`F3-status-truth-red.txt`), green after (`F2-p07-check-full.txt`, `F6-p07-check-full-final.txt`)
- [x] Catalog lists P00 to P08 and the lab with version and repository (`src/status-truth.test.ts`, STAT-002)
- [x] Every card seal derived; none says "published" or "live" (STAT-003, STAT-006)
- [x] P01: six features cite a 119-test fake-mode run, exit 0 (P01 `artifacts/evidence/status-reconcile/unittest-fake.txt`); quality metrics recorded as PENDING
- [x] P05 statuses match the evidence; the Keycloak-on-Fly split is recorded (P05 `artifacts/evidence/status-reconcile/`)
- [x] P02 adapter: red then green then check_fast exit 0 (P05 `artifacts/evidence/toolkit-limits-037/`), deployed with one live run under the limit
- [x] P04 RAG ADR committed (P04 `docs/harness/decisions.md`)
- [x] `python scripts/check_full.py` exit 0 in P07: unit 73, e2e 50 (`F6-p07-check-full-final.txt`)
- [x] Public e2e after deploy, 3 runs in a row: 48 passed, 2 skipped each (`F13-public-e2e-run1..3.txt`), after the Turnstile-aware test changes (`F8`, `F10`, `F12` failures are kept)
- [x] Remaining `PENDING` items each have a cause and an owner (see below)

## Left open, with cause and owner

| Item | Cause | Owner |
| --- | --- | --- |
| SCENE-005 device FPS | no phone measurement | owner (device) |
| Turnstile start flow end to end | a human challenge cannot be driven by a script; keys are set and `startAvailable` is true | owner (click once on `/demo/`) |
| Model-quality evaluation (P05 `real-model-evaluation`, P00 `funded-replacement-development`) | P00 owns the controlled campaign and its ledger; a parallel run would bypass that counter. Review and promotion are pending | owner, through P00 |
| Third-party IdP acceptance | Keycloak on Fly is the lab's own | owner (a provider account) |
| Production metrics (P03), production acceptance of trace export (P04) | one real trace was checked; no metrics run exists | a later phase |
| Demo password rotation | the IdP image has the admin API switched off on purpose; the passwords are published by design on `/api/status` | owner decision |
| Turnstile script behaviour in the public suite (data: fetch refused by the CSP, a worker blob, its own POST) | tolerated only against the deployed site in `e2e/site.spec.ts`; CSP unchanged; reversible, see `decisions.md` | closed unless the owner prefers allowing `data:` |
| Second real defect found by hosted CI: Back to the surface landed on the previous stop in 3D (fixed in `9ad435e`) | closed |
| Menu over footer text at the page end | `home-3d.png` (scrolled to the bottom at 1280x720) shows the fixed menu covering part of the credits line; not fixed in this phase | next P07 phase (squint review) |
| Metro index on mobile, symbol hero on case pages | feature work not started | next P07 phase |
| P00 local service e2e | Docker containers were not started | P00 phase |
