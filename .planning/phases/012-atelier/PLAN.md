# Plan — phase 012 atelier

allowed_write_paths: `tools/atelier/**`, `atelier.html`, `src/atelier/**`, `docs/atelier/**`, `src/scene/layout.ts` (dev-only override hook),
`src/scene/*.test.ts`, `package.json` (scripts), `README*.md` (links), `docs/harness/progress.md`, `.planning/phases/012-atelier/**`,
`artifacts/evidence/atelier/**`, `assets/**` (only through `tools/assets.mjs`).

1. Spec and plan (this folder). Research: `survive` reuse map, Blender MCP, glTF-Transform, three.js camera rails, skills (web, with sources).
2. `tools/atelier/inspect-glb.mjs` (pure parser, no dependency) + unit test first.
3. `tools/atelier/blender/axis_proof.py`, `improve_model.py`; `atelier.mjs` CLI (`status`, `candidates`, `inspect`, `improve`, `axis`).
4. Run `improve` on one megakit prop and `inspect` before/after; keep evidence.
5. Shot override hook in `layout.ts` (dev only, pure merge function, tested) and `atelier.html` page (viewer, tuner).
6. Docs (playbook, pt-BR guide), scripts in package.json, README links.
7. Gates: vitest, eslint, tsc, `vite build` shows no atelier output, e2e unchanged. Commit atomically.
