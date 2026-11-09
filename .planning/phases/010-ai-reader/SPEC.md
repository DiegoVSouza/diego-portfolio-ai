# AI accessibility reader (Playwright + Edge)

Owner decision 2026-11-06: no human screen-reader tester is available; build an AI-driven reader instead. `scripts/a11y-reader.mjs` drives Microsoft Edge through Playwright and reports the accessibility tree, heading outline, landmarks, keyboard tab order with accessible names and axe-core violations for every public route.

Claim boundary: this is automated accessibility review. It must not be described as a human screen-reader evaluation (NVDA/JAWS/VoiceOver). Human review stays PENDING and is recorded as a known limit.

Also recorded: the owner approved the CV text; the site copy follows the CV at the lab root (`Diego_Souza_AI_Engineer_EVT_PT.docx`). A line-by-line diff of site claims against the CV has not been done yet.
