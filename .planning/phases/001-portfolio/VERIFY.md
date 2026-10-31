# Verification

PASS (local) — 2026-10-31, re-run after adopting `colagem-ui` 0.1.1 (level 1). Not deployed.

| Command (cwd: projects/p07) | Exit | Evidence (`artifacts/evidence/portfolio-001/`) |
| --- | --- | --- |
| `python scripts/check_full.py`, final | 0: 20 unit tests, lint, types, catalog check, build, budget 78.6 KB gzip of 100 KB, 5 Playwright tests (axe **with contrast** on home and the 7 project pages at 1280 px and 360 px, keyboard, reduced motion, squint screenshots) | `check-full.txt`, `home.png`, `home-squint.png`, `p05.png`, `p05-squint.png` |

Earlier run (hand-written CSS, level 0) passed with 17 unit tests and 76.2 KB; it is superseded.

Defects found on the way (kept, not hidden):

1. P06's `feature_list.json` records only PASS rows, so "every project shows something open" failed. Fix: curated `limits` with a cited source (P06's own `VERIFY.md`); the rule became "open item or documented limit". The test was not weakened.
2. `App` focused `<main>` on first load, so Tab skipped the skip link. Fixed: focus moves only on navigation.
3. The strict CSP (`style-src 'self'`) blocked the squint test's injected `<style>`. The test now sets the filter through CSSOM. The CSP is unchanged.
4. A stale preview server made one e2e run test an old build. `reuseExistingServer` is now `false`.
5. Library bug found while adopting it: the headline measure was set on a 16 px wrapper. Fixed in `colagem-ui` 0.1.1 and re-pinned (SHA-256 in `sources.lock.json`, checked by a test).

Squint check: on the project page the paper focus card is the brightest area of the blurred screenshot, as the design system wants. The owner's judgement is still pending (`review_mode=human_pending`).

Not covered: screen reader run by a person, Firefox and Safari, any public URL, `catalog:check` without sibling projects (only the `skipped` branch is untested), Level 2 (3D).
