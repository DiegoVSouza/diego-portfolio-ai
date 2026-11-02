# Content review, 2026-11-02

Every prerendered route (28, English and Portuguese) was read in full, EN against PT line by line, and the visible layout was checked at 1280 and 390 px.

## Found and fixed

| Finding | Fix | Guard |
| --- | --- | --- |
| Card seals read like tokens ("open: p04 model metrics, production acceptance, production") and the Portuguese seals mixed English words | Every open axis has a reader-facing phrase in both languages, grouped so a meaning appears once (`src/content/seal.ts`) | `status-truth.test.ts` fails while any axis has no words or a PT seal holds an English word |
| Case text showed literal backticks (`FAIL_PROVISIONAL`, `TriageRunner`, `AGENTS.md`) | Code spans are drawn as code (`src/site/Inline.tsx`) | `app.test.tsx`, red before the fix |
| SupportOps said the live demo "has not been measured" and "no public live run exists" while live runs are recorded; its test count was from an older phase | Result and not-measured lines rewritten from new evidence records: service gate on the current version, one real triage (calls, tokens, estimated cost) | the digit rule (EV-001) and the evidence check |
| Observability, Async, Design system and Harness had no measured results, or said "never applied" where one Fly run exists | New evidence records: Jaeger traces of a real triage, one task on Fly, the browser suite on the deployed site, Lighthouse medians, phases with spec, plan and verification | `evidence:check`, EV-001 |
| Demo page said "once the demo is deployed" although it is | Wording says what is true: the status did not load, or the demo is paused | `app.test.tsx` |
| Evidence page listed features for P00 to P06 only | P07, P08 and the lab are listed | catalog test |
| "Last verified" pointed at commits from 2026-10-29 to 31 | Pins refreshed to the current heads (`npm run flow:gen`) | `flows:check` |
| On a 390 px screen the owner's name was cut ("GONÇALVE...") | The kicker wraps onto a second line | visual check |

## Not changed, owner to decide

- The Experience page shows "English draft of the CV, pending the owner's review". Remove that line when the draft is approved.
- Figures in Experience and on the home (tens of thousands of students, 20% less manual support, 97.27% and 95.74%, years of experience) come from the CV, which the page says plainly. They are not measured on this site.
- The phone number is published on purpose (owner decision, 2026-10-31).
- Job titles and some stack lists stay in English on the Portuguese pages, as proper names.
- The evidence table is ordered by record id, not grouped by project.
