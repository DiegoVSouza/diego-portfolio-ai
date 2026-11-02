# Verify 006

- [ ] Hosted CI green on every repository head, saved under `artifacts/evidence/status-truth/`
- [ ] Hosted CI of P07 green on the deployed commit (STAT-005)
- [ ] `status-truth.test.ts` red before, green after; STAT-001 to STAT-004
- [ ] Catalog lists P00 to P08 with version and repository
- [ ] Every card seal derived; none says "published" without a deploy record
- [ ] P01 features with evidence linked or the test run and saved
- [ ] P05 feature statuses match the evidence; the Keycloak-on-Fly split recorded
- [ ] P02 adapter contract test green; P04 RAG ADR committed
- [ ] `python scripts/check_full.py` exit 0 in P07; check_fast in the others, outputs saved
- [ ] Public e2e after deploy, 3 runs in a row
- [ ] Remaining `PENDING` items each have a cause and an owner
