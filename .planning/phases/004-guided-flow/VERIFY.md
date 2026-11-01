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

## Audit after the first build (2026-11-01) and fixes

An audit of the running site (1280 and 390 px, EN and PT) found three serious problems and six medium ones. Fixed in this round, each checked by a render or a test:

- Next project, Start the tour and the header Tour now land on the top of the case (title and TL;DR), not on `#demo` 1,400 px down.
- The tour text no longer says every project has a live demo; only SupportOps does. The tour section has a "Start with SupportOps" button.
- The step rail is sticky and shows "Project N of 8" with the current stop marked (verified at 390 px by screenshot). Rail labels are short: Demo or Run it, Flow, README.
- One numbering: the trail position (01 to 08) is used in the metro, the cards, the command line and the ghost numeral.
- Only the last stop of a project has the primary button; the others are secondary.
- Legibility: seal, command and TL;DR labels 13 px, step rail and diagram buttons 14 px, 44 px targets for lone links. Wide diagrams stay wide: measured text went from 11.9 px to 15.8 px (SupportOps) and 13.7 to 18.2 px (agents). The diagram scrolls sideways inside a focusable, named region (`FlowScroll`) because axe flagged `scrollable-region-focusable` on the first attempt.

`check_full`: exit 0, 60 unit and 38 e2e tests, budget 40.0 KB gzip.

Still open: the live demo cannot start until the Turnstile site key and secret are deployed to Pages (owner configured them in `.env`; not yet wired). The desktop diagram's sideways scroll has no visible hint other than the clipped last node. Contrast of text over the 3D scene is not measured.

## The live demo moves into the flow (2026-11-01)

The owner pointed out that sending the visitor to `/demo/` broke the single flow. The SupportOps case now holds the live demo inside its first stop (`DemoPanel`, headings one level down). The home buttons, the case link row and the palette point to `/projects/supportops/#demo`. `/demo/` remains as a direct URL for old links and is no longer linked from the header or the footer.

- CSP: `/projects/supportops/` and `/pt/projects/supportops/` may load Turnstile, like `/demo/` (`scripts/prerender.mjs`, `public/_headers.template`, both checked in `dist/_headers`). Every other route keeps the strict policy.
- Defect found by the e2e suite: the case page did not preload the `system` flow the demo uses ("flow system is not loaded"). Fixed in `src/site/pages.ts`.
- New unit test: the demo status section sits inside the first stop, before the flow stop, and no other case has it.
- `site.spec.ts`: the diagram test is scoped to `#flow`, since the demo's guided tour has its own Next button.
- `check_full`: exit 0, 61 unit and 38 e2e tests, worst route 42.1 KB gzip.
- Read in a browser at 1280 and 390 px with the status API stubbed. Not deployed; production still has the previous version.

## Production check after the in-flow deploy (2026-11-01)

Deploy `046c0af3` (commit `cf1042a`). Entering from the home page by the "Live demo" button: URL `/projects/supportops/#demo`, CSP allows the Turnstile origin, the challenge frame loads, the stack status reads from the API, the start button is disabled with the reason "Confirm that you are human", no page errors, no POST to our API (nothing woken, budget USD 5.00 of 5.00). Screenshot: `artifacts/evidence/portfolio-w8/demo-prod-in-flow.png`.

Two things found on the way. (1) Reaching the page by in-place navigation kept the strict CSP of the home document and blocked the widget; the router now loads the document (`cf1042a`, covered by an e2e test). (2) The first load right after the deploy failed to fetch the `Case` chunk, and a second check minutes later was fine; the asset answers 200. Treated as edge propagation, not reproduced.

Not done: a human click on the challenge and a real Start. Those wake the Fly stack and spend the budget.
