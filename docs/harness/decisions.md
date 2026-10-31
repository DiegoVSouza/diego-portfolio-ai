# Intake decisions — P07 Lab Portfolio

- Product: static React site that presents the lab's independent projects (P00–P06) to a reviewer: what each one is, what its own gates proved, and what is still `PENDING`. Spec: `.planning/phases/001-portfolio/SPEC.md`.
- Success criterion: every project card shows only facts that trace to a file in that project's repository; every project shows at least one open or partial item; `check_full.py` and Playwright + axe pass.
- Pattern: no model is used. `workflow-automation` with `has_agent: false` is the closest kit profile; `stack.frontend: react-ts`, `backend: none`. No agent, so no trifecta: no private data, no untrusted content, no external communication.
- Why a new project and not P06: P06 is a work console that needs the P05 API and Keycloak. A portfolio must open with nothing running, so it carries its own content.
- Content source: `src/data/projects.ts` (curated text and links) plus `src/data/catalog.generated.json` (generated from each project's `docs/harness/feature_list.json` by `npm run catalog:gen`, never edited by hand). Sibling repositories are not imported at build time, so the site builds from this repository alone.
- Numbers: none written by hand. Feature counts come from the generated catalog. No test count, latency, cost or quality score is shown unless a project's evidence file states it, and then it is cited. Otherwise `PENDING`.
- Honesty rule: project status wording is kept. `PASS_LOCAL_*`, `INCOMPLETE_*` and `PENDING` are not rounded up to "done".
- Stack: React 19, TypeScript, Vite, Vitest, Playwright with axe. No router (hash route), no state library, no runtime third-party origin. Versions pinned as in P06.
- Design system: `DESIGN_SYSTEM_COLAGEM_URBANA_NOITE.md`, level 0, tema Breu, red preset, self-hosted Fontsource fonts. 3D (levels 1–2) deferred to its own phase with a static fallback first.
- Budget: initial JS at most 100 KB gzip, checked by `npm run budget`.
- Language: UI in English with a pt-BR toggle; `README.md` English, `README.pt-BR.md` Portuguese.
- Hosting: none decided. No deploy, publish or push without explicit authorization (lab rule 9).
- Kit: no `web-saas` profile here. P06 and P07 are now two real web projects, so a proposal can be opened as its own kit phase, not in this one.
