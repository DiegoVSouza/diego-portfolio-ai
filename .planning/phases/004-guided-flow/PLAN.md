# Plan — guided flow

allowed_write_paths: `projects/p07/**`.
forbidden_changes: `harness-kit/`, sibling projects, a number without evidence, hidden or removed claims, weakening a test to pass, a new runtime third-party origin, scroll capture.
stop conditions: three failed attempts on one failure; budget over 100 KB gzip; a secret; any deploy or push without a go.

| Stage | Change | Files | Gate |
| --- | --- | --- | --- |
| G0 | Research, SPEC, PLAN, decisions entry | `docs/knowledge/guided-flow-research.md`, this folder | Owner reviews |
| G1 | `CaseSteps` replaces `CaseTabs`: three stacked stops, step rail, next-stop button. Old anchors kept | `src/site/CaseSteps.tsx`, `src/pages/Case.tsx`, `src/styles/site.css`, `src/content/ui.ts` | e2e on a case page, axe |
| G2 | Home: About first, proof, then projects as the trail start; the system diagram leaves the home | `src/pages/Home.tsx`, `src/content/ui.ts` | e2e, axe |
| G3 | Header: Tour as the primary link; the other pages move to the footer | `src/site/Shell.tsx`, `src/styles/site.css` | e2e, axe |
| G4 | Demo page joins the trail: "Next: Flow" and "Back to the tour" | `src/pages/Demo.tsx` | e2e |
| G5 | Metro line shows the stop inside the project; `j` and `k` stay | `src/site/MetroLine.tsx` | e2e, axe |
| G6 | Journey e2e: from `/` to Contact through 8 projects, EN and PT | `e2e/journey.spec.ts` | green |
| G7 | Optional: Continue (FLOW-009), View Transitions (FLOW-010) | `src/site/*` | e2e; support confirmed |
| G8 | Verify: `check_full.py`, Lighthouse, 360/1000/1280, screenshots, VERIFY.md | `artifacts/evidence/portfolio-w8/` | exit codes saved |
| G9 | Deploy | none | **owner go** |

Existing e2e tests that assume tabs, the four header links or the home diagram change with the intended navigation. Each change is listed in VERIFY with the reason; no assertion is deleted without a replacement that checks the same fact in its new place.

## Defaults chosen (the owner can override)

- Demo stop for non-flagship projects: replay of a recorded run if the evidence file has one, else `PENDING`.
- README stop: curated case text in the site, plus a link to the pinned README of the repository.
- The order of the three stops is fixed, but they are anchors on one page, so the visitor may jump.
