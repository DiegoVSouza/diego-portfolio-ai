# Verify — guided flow

Status: G1 to G4 and G6 done and verified locally on 2026-11-01. G5, G7 (Continue, View Transitions) and G9 (deploy) are **not done**. Evidence is in `artifacts/evidence/portfolio-w8/`.

| Criterion | Command | Result |
| --- | --- | --- |
| check_full | `python scripts/check_full.py` (output: `check_full.txt`) | exit 0: 60 unit tests, 38 e2e tests |
| Journey from `/` to Contact through 8 projects, EN and PT | `e2e/journey.spec.ts`, inside check_full | passed (both languages) |
| axe on a case at 1000 and 360 px, EN and PT, plus SupportOps | `e2e/flow.spec.ts`, inside check_full | passed |
| Budget | `npm run budget`, inside check_full | PASS, worst route 39.8 KB gzip of 100 KB |
| Lighthouse desktop, home | `lighthouse@12.6.1 --preset=desktop` (`lighthouse-desktop.json`) | performance 0.83, LCP 0.5 s, TBT 390 ms, CLS 0.023. One run; same score as before this phase (0.83) |
| Screenshots | `home-1280-full.png`, `case-1280-full.png`, `home-390-full.png`, `case-390-full.png` | captured, read at 1280 |

## Defects found by the new tests

1. The ghost numeral at the end of a case covered the "Next project" button and swallowed the click. Fixed with `.ghost { pointer-events: none; }`. Without the journey test this would have shipped.
2. A link with a hash (`/projects/x/#numbers`, the next stop) landed at the top of the page, because the shell only honored hashes on the home page. The tabs used to handle this. The shell now scrolls to any hash target.
3. The "Live demo" button at the top of every case led to the global SupportOps demo, which is wrong for the other seven projects. It now says "Reproduce it" and points to the first stop; only the SupportOps case keeps "Live demo".

## Test changes, and why

- `app.test.tsx`: the tab-order and tab-enhancement tests became trail-order, reproduce-stop, stacked-stops-with-legacy-anchors, next-action and home-order tests. Same facts (order, no hidden content, no tab bar, anchors), checked in the new structure.
- `flow.spec.ts`: the "case tabs" block became "case stops" (stacked, rail, next button, old anchors, no JavaScript, axe). The axe test no longer clicks four tabs; it loads each case.
- `site.spec.ts`: the failure gallery heading is now level 3 (under the README stop's h2); the diagram test no longer opens a tab.
- No assertion was removed without a replacement.

## Not done, not claimed

- **Not checked at 360 px by eye.** `home-390-full.png` and `case-390-full.png` exist; I read only the 1280 px home. axe passes at 360 px.
- The Demo stop for the seven non-flagship projects is "Reproduce it" (clone and run), not a replay of a recorded run. A replay needs recorded run data per project, which the evidence files do not carry.
- G5 (the metro line marking the stop inside a project), FLOW-009 (Continue) and FLOW-010 (View Transitions) are open.
- Deployed: no.
