# Specification

Lab Portfolio: a static site that lets a reviewer understand the seven lab projects in minutes and check each claim against evidence.

## Behaviour

- Home: one-line thesis, the product-first method (intake → spec → plan → verify → gate), and a card per project P00–P06 with name, role in the SupportOps stack, version, and a status summary from the generated catalog.
- Project page (`#/p05`): what it is, what it proves, repository link, and a table of features with their real status and evidence path. Open items (`PENDING`, `INCOMPLETE`, partial) come first.
- Method section: the rules the lab enforces (evidence before "done", numbers only from runs, red test is a signal).
- Language toggle EN / pt-BR, kept in `localStorage` with a safe fallback.
- Works with no backend, no network and no running lab stack.

## Engineering contract

| Requirement | Rule |
| --- | --- |
| DATA-001 | Every card and feature row comes from `projects.ts` or `catalog.generated.json`. A unit test fails when a project shows no open or partial item and no documented limit (a limit cites the project's own VERIFY), or when the UI rewrites a status string. |
| DATA-002 | `npm run catalog:check` regenerates from sibling repositories when present and fails on drift; when absent it prints `skipped` and exits 0. |
| SEC-001 | Strict CSP, no inline script, no third-party origin at runtime, `rel="noopener noreferrer"` on external links. |
| A11Y-001 | axe reports zero violations on home and every project page, at 1280 px and 360 px. Keyboard-complete. `prefers-reduced-motion` respected. |
| PERF-001 | Initial JS at most 100 KB gzip. |

Theme: `DESIGN_SYSTEM_COLAGEM_URBANA_NOITE.md`, level 0, tema Breu, red preset.

## Out of scope

3D scene, deploy, custom domain, analytics, any backend, running other projects from the site, copying project source here.
