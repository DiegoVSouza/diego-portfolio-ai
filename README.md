# Lab Portfolio

Static React site that presents the lab's seven independent AI projects (P00–P06) with the status each project records for itself. Nothing is rounded up: `PENDING` stays `PENDING`, and every project shows what is still open.

## Develop

```powershell
npm ci
npm run dev                      # Vite dev server
npm run catalog:gen              # refresh src/data/catalog.generated.json from sibling projects
python scripts/check_fast.py     # lint, types, catalog drift, unit and axe tests
python scripts/check_full.py     # plus build, bundle budget, Playwright + axe (needs Chrome)
```

## How the content is made

- `src/data/catalog.generated.json` is generated from each project's `docs/harness/feature_list.json`, `pyproject.toml` or `package.json`, and Git remote. Do not edit it.
- `src/data/projects.ts` holds only curated text (EN and pt-BR) and stated limits, each citing a project file.
- No number is written by hand.

Design: `DESIGN_SYSTEM_COLAGEM_URBANA_NOITE.md`, level 1, tema Breu, red preset, from the vendored `colagem-ui` tarball (pinned in `docs/harness/sources.lock.json`). Budget: 100 KB gzip initial JS. Target host is Cloudflare Pages (ADR-001); nothing is deployed until the owner authorizes it.
