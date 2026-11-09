# Verification
Status: PASS for the automated scope; human review PENDING.

Command: `node scripts/a11y-reader.mjs` (cwd `projects/p07`, `vite preview` on :44173, routes read from `dist/sitemap.xml`), exit 0, Edge 157.0.4341.42. Output: `artifacts/evidence/a11y-reader/report.{md,json}`. 28 routes (EN and PT-BR): all load, one h1 each, no unnamed or invisible tab stops, no images without alt, zero axe violations (wcag2a/aa, 2.1 aa, 2.2 aa, best-practice).

Corrections to the first run:
- `page-has-heading-one` on `/` and `/pt/` was caused by the script: Tab walked all stages before axe ran, so the first stage's h1 was hidden. Axe now runs on the untouched page.
- `/projects/` is not a route (no prerendered page); the first route list was wrong. Routes now come from the sitemap.

Limits: automated only, not NVDA/JAWS/VoiceOver; the Tab walk is capped at 80 stops and does not exercise 3D stage interactions; CV-versus-site claim diff and visual review are not done.
