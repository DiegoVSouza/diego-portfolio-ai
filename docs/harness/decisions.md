# Intake decisions — P07 Lab Portfolio

- Product: static React site that presents the lab's independent projects (P00–P06) to a reviewer: what each one is, what its own gates proved, and what is still `PENDING`. Spec: `.planning/phases/001-portfolio/SPEC.md`.
- Success criterion: every project card shows only facts that trace to a file in that project's repository; every project shows at least one open or partial item; `check_full.py` and Playwright + axe pass.
- Pattern: no model is used. `workflow-automation` with `has_agent: false` is the closest kit profile; `stack.frontend: react-ts`, `backend: none`. No agent, so no trifecta: no private data, no untrusted content, no external communication.
- Why a new project and not P06: P06 is a work console that needs the P05 API and Keycloak. A portfolio must open with nothing running, so it carries its own content.
- Content source: `src/data/projects.ts` (curated text and links) plus `src/data/catalog.generated.json` (generated from each project's `docs/harness/feature_list.json` by `npm run catalog:gen`, never edited by hand). Sibling repositories are not imported at build time, so the site builds from this repository alone.
- Numbers: none written by hand. Feature counts come from the generated catalog. No test count, latency, cost or quality score is shown unless a project's evidence file states it, and then it is cited. Otherwise `PENDING`.
- Honesty rule: project status wording is kept. `PASS_LOCAL_*`, `INCOMPLETE_*` and `PENDING` are not rounded up to "done".
- Stack: React 19, TypeScript, Vite, Vitest, Playwright with axe (contrast on). No router (hash route, so Pages needs no rewrite), no state library, no runtime third-party origin. Versions pinned as in P06.
- Design system: `DESIGN_SYSTEM_COLAGEM_URBANA_NOITE.md`, **level 1** (2D layers; a portfolio is the document's own example for level 1), tema Breu, red preset. Implemented by the pinned `colagem-ui` package from P08 (`docs/harness/sources.lock.json`), never by local CSS: a test fails on a color literal or `border-radius` in this repository. 3D (level 2) is a later phase and falls back to level 1. Supersedes the earlier level 0 decision.
- Hosting (ADR-001, `docs/decisions/` in the lab): Cloudflare Pages, static. `public/_headers` carries the CSP. No deploy until the owner gives an explicit go.
- Budget: initial JS at most 100 KB gzip, checked by `npm run budget` (measured 78.6 KB with the library).
- Language: UI in English with a pt-BR toggle; `README.md` English, `README.pt-BR.md` Portuguese.
- No deploy, publish or push without explicit authorization (lab rule 9).
- Kit: no `web-saas` profile here. P06 and P07 are now two real web projects, so a proposal can be opened as its own kit phase, not in this one.

## Phase 003 (2026-10-31)

- The portfolio becomes a product: see lab `docs/decisions/ADR-002-portfolio-as-product.md` and `.planning/phases/003-real-portfolio/SPEC.md`. These supersede the "seven project cards" scope of phase 001.
- Pages project: `diego-portfolio-ai`, the owner's choice. Spelling is an open item, because `*.pages.dev` names cannot be renamed.
- Hash routes will be replaced by prerendered paths, so "Pages needs no rewrite" stops being the reason for routing.
- Backend stays Python. No Go.

## 2026-10-31: the contact phone is published

The owner reversed the earlier rule and asked for the phone number and a WhatsApp button on the portfolio. The number is in `src/content/profile.ts` only (a test keeps it out of every other source). The CV `.docx` stays out of Git. An earlier commit contained partial digits inside a test regex; since the number is now public on purpose, history is not rewritten.

## 2026-11-01: the shipped build uses Preact's compatibility layer

- **Why:** Lighthouse mobile on the live site scored performance 69 with TBT 1,330 ms and LCP 2.6 s. The cost was React hydration: one 1.3 s task under 4x CPU slowdown, in a 207 KB raw index chunk. The page is mostly static, so the work is overhead.
- **Decision:** `vite build` aliases `react`, `react-dom` and the JSX runtime to `preact/compat`, and `colagem-ui` is bundled into the SSR build so it shares the alias. Dev server and unit tests stay on React 19.
- **Measured:** worst-route first-load JavaScript 96.6 KB gzip with React, 37.9 KB with Preact. Local Lighthouse mobile on the Preact build: performance 85, LCP 2.0 s, TBT 500 ms (a local run, not the same network as the live run). The full e2e suite (22 tests: axe, CSP, hydration errors, no JavaScript, keyboard, scene, palette) passes against the Preact build.
- **Cost and risk:** unit tests do not exercise Preact, so a behavior difference would show only in e2e. `REACT_BUILD=1 npm run build` builds with React for comparison. Preact 10.29.2 and preact-render-to-string 6.6.1 are pinned.
- **Rejected:** deferring hydration to idle (it moves the long task, it does not remove it), and lazy Suspense boundaries around sections (they need the lazy chunk resolved at prerender and add boundaries without cutting the shared React cost).
