# Architecture

Static single-page app, no backend.

```
sibling projects/*/docs/harness/feature_list.json, pyproject.toml, package.json, .git/config
        │  npm run catalog:gen (scripts/catalog.mjs)
        ▼
src/data/catalog.generated.json   (generated, committed, never edited)
        │
src/data/projects.ts  = catalog + curated EN/pt-BR text + cited limits
        │
src/App.tsx           = Home (cards, method) and ProjectPage (#/pNN)
```

- Routing: hash routes parsed by `src/useRoute.ts`; static hosting needs no rewrite rules.
- Language: `src/i18n.tsx`, preference in `localStorage` with a safe fallback.
- State classes (`verified | claimed | partial | open`) are derived in `scripts/catalog.mjs` from the project's own status string; the string itself is shown unchanged.
- Gates: `scripts/check_fast.py`, `scripts/check_full.py`; budget and CSP described in `.planning/phases/001-portfolio/SPEC.md`.
