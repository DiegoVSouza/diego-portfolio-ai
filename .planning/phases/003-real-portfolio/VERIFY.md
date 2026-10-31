# Verify — the real portfolio

Status: W5, the cases of W7 and W9, and the offline part of the demo page are done locally. The 3D scene (W7b), every deploy (W8) and the publication (W10) are **not done**.

| Stage | Gate | Result | Evidence |
| --- | --- | --- | --- |
| W5 | Prerender, routes, `/pt/`, content model, evidence generator, Functions with mocks | PASS_LOCAL | `artifacts/evidence/portfolio-w7/check-full.txt` |
| W6 | `colagem-ui` 0.4.0 with FlowDiagram, layoutFlow and ten blocks | PASS_LOCAL (P08 `check_full.py` exit 0, 62 unit tests, real-Chrome axe in both themes) | P08 `artifacts/evidence/colagem-ui-040/check-full.txt` |
| W7 | Home with the system flow, flagship case, demo page, run viewer, experience in English | PASS_LOCAL. The run viewer reads `/api/runs/latest`; no real run exists yet, so it shows the empty state | `artifacts/evidence/portfolio-w7/e2e-run5.txt` |
| W7b | Level 2 scene | **NOT DONE** | |
| W9 | Other cases with their flows, evidence board, method, `llms.txt` | PASS_LOCAL. Mermaid export exists (`npm run flow:mermaid`) but is not yet pasted into the READMEs | same |

## Requirements

| ID | Status |
| --- | --- |
| EV-001 | PASS. `src/rules.test.ts` fails on a digit outside an evidence token |
| EV-002 | PASS locally. `evidence:check` rebuilds from the sibling repositories; skipped when they are absent |
| EV-003 | PASS (test) |
| EV-004 | PASS (test): each case has a not-measured item and a failure |
| LINK-001 | PARTIAL. Links use full commit hashes pinned by `flow:gen`. The public check of each link waits for the repositories to be public |
| LIVE-001 | PASS for this repository: nothing here sets `LLM_MODE`. The Fly configs are checked in W8 |
| LIVE-002 | PASS in P05 (`tests/test_demo_live.py`) |
| LIVE-003 | PASS (test): the page shows an empty state or "unavailable" and never invented steps |
| LIVE-004 | PASS (test and Chrome): opening `/demo/` makes no POST and no third-party request |
| LIVE-005 | PARTIAL. Wake progress shows elapsed time; per-service progress needs the deployed status |
| COST-001 | **NOT DONE**: the cost guard Worker is not written |
| SEC-001 | PARTIAL. Strict CSP in the meta tag and `_headers`; the Turnstile origin is allowed on `/demo/` only, by construction and test. Not checked against the real widget |
| SEC-002 | **NOT DONE** (needs the deployed stack) |
| SEO-001 | PASS locally for title, description, canonical, hreflang and prerendered content. The Open Graph image `og.png` is **missing** |
| I18N-001 | PASS (test) |
| A11Y-001 | PASS in Chrome with axe and contrast, 28 routes, 1000 and 360 px |
| PERF-001 | PASS for initial JS (95.1 KB worst route). LCP with the scene: PENDING |
| SCENE-001 to SCENE-005 | **NOT DONE** |
| DS-001 | PASS (test: no color literal, no radius) |
| CUR-001 | PASS: each case shows the pinned commit and the newest evidence date |
| FLOW-001 | PASS (`flow:check`) |
| FLOW-002 | PASS (`flow:check`, with the sibling repositories) |
| FLOW-003 | PASS: `elkjs` appears only in `scripts/flows.mjs`; P08 `budget.mjs` keeps it out of `index.js` |
| FLOW-004 | PASS in Chrome (axe, 360 px, no overflow); no pan or zoom |
| FLOW-005 | PASS (Chrome with JavaScript off shows the diagram and the list) |
| FLOW-006 | PASS (unit test: no run, no lit node) |
