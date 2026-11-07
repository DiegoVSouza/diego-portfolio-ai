# Diego Souza, AI Engineer: portfolio

<!-- case:start -->
## The case

- **Problem.** A portfolio makes claims. Without a rule that ties each number to a saved run, it drifts toward marketing.
- **Decision.** A prerendered React site where every number is an evidence record copied from a project repository at an exact commit. A test fails on a digit in case text that has no record. Diagrams are laid out by ELK at build time and drawn as SVG by React; no layout engine reaches the browser.
- **Measured.** Real Chrome with axe and contrast passes on all 28 routes (14 pages in each language) at 1000 and 360 px. The worst route loads 95.1 KB gzip of JavaScript against a 100 KB budget. Source: `artifacts/evidence/portfolio-w7/check-full.txt`.
- **Run it.** `npm ci && python scripts/check_fast.py` (then `python scripts/check_full.py` with Chrome installed).
- **Live.** https://diego-portfolio-ai.pages.dev (Cloudflare Pages). The same Playwright suite passes against it: `artifacts/evidence/portfolio-w7/public-e2e.txt`.
- **Limits.** The 3D scene is deployed, but frame rate on a physical phone is not measured. The live run log has one run; the Turnstile start flow remains pending. Screen-reader and owner visual review remain pending.
- **Docs.** [Atelier: models and camera workbench](docs/atelier/PLAYBOOK.md) ([pt-BR](docs/atelier/GUIA.pt-BR.md)), [Architecture](docs/architecture.md), [phase 003](.planning/phases/003-real-portfolio/SPEC.md).
<!-- case:end -->

<!-- flow:start -->
## How it works

Generated from the same data as the diagram on the portfolio site (`projects/design-system/`), so the two cannot drift.

```mermaid
flowchart LR
  file["Evidence file"]
  gen["Evidence generator"]
  record["Evidence record"]
  rule["Number rule"]
  page["Number on the page"]
  file --> gen
  gen --> record
  record --> rule
  rule --> page
```
<!-- flow:end -->

Static React site for [Diego Vieira Gonçalves de Souza](https://www.linkedin.com/in/diegovsouza99), AI Engineer. The English CV text in `src/content/profile.ts` is a draft until the owner reviews it; the CV file itself is never in Git. The contact phone and WhatsApp link are published on purpose, on the owner's explicit instruction of 2026-10-31.

## Develop

```powershell
npm ci
npm run dev                      # Vite dev server (client only)
npm run evidence:gen             # copy values from the sibling repositories into src/data/evidence.generated.json
npm run flow:gen                 # lay out the flows with ELK and pin the sibling commits
python scripts/check_fast.py     # lint, types, catalog, evidence and flow checks, unit tests
python scripts/check_full.py     # plus build, per-route budget, Playwright + axe in Chrome
```

## How it is built

- `vite build` makes the client, `vite build --ssr` makes the server bundle, and `scripts/prerender.mjs` writes every route to `dist/<path>/index.html` with its own title, description, Open Graph tags, hreflang links and a modulepreload for the chunks that route needs.
- `src/content/cases/*.ts` is case text (EN and pt-BR). A digit that states a result must come through an `{ev:id}` token. `src/content/profile.ts` holds the CV, labelled as career history.
- Each card seal is derived, never typed: `scripts/catalog.mjs` reads the `docs/harness/feature_list.json` of P00 to P08 and of the lab, and `src/content/seal.ts` turns verified counts and open `status` tokens into a phrase in both languages. A new open axis needs words in `seal.ts`, or `src/status-truth.test.ts` fails. Case text marks code with backticks, drawn as code by `src/site/Inline.tsx`. The review notes are in `docs/harness/content-review-2026-11-02.md`.
- `functions/api/*` are Cloudflare Pages Functions: `status` (reads Fly with a read-only token, wakes nothing), `demo/start` (Turnstile, kill switch, per-visitor limit, then wakes in dependency order) and `runs/latest` (recorded runs, no visitor text). Tested with mocks; not deployed.
- `elkjs` is a build-time dev dependency (EPL-2.0 OR GPL-3.0). It is imported only by `scripts/flows.mjs`, never by anything under `src/`.

Design: `DESIGN_SYSTEM_COLAGEM_URBANA_NOITE.md`, tema Breu, from the vendored `colagem-ui` tarball (pinned in `docs/harness/sources.lock.json`).
