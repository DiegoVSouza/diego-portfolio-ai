# Plan — the real portfolio

Each stage ends with its gate. Stages marked **go** have external effects and wait for the owner.

| Stage | Where | Content | Gate | Go |
| --- | --- | --- | --- | --- |
| W0 | lab, P07 | Research, ADR-002, this spec | Owner review | no |
| W1 | all repositories | Public-readiness audit: history secret scan, tracked evidence review, license proposal, README gaps, clean-clone attempt. Report per repository | Report with findings; no public change | no |
| W2 | P00–P08 | Fix the findings: READMEs as case studies, LICENSE, CI workflows, `checkout` | Clean clone reproduces one check | no |
| W3 | GitHub | Push, create P06–P08 remotes, change visibility, repository by repository | Hosted CI green | **go, per repository** |
| W4 | P07 | Prerender, routes, `/pt/`, content model, `evidence:gen`, `evidence:check` | `check_full.py` | no |
| W5 | P08 | `colagem-ui` 0.4.0 components | `check_full.py`, tarball pinned | no |
| W6 | P07 | Home and flagship case, Tier 0 replay | Owner reads the flagship; squint review | no |
| W7 | lab, P05, P06 | F5 and demo hardening: CORS release, Keycloak origins, admin path, password rotation, reset job, Pages console | Public e2e, rollback rehearsal | **go, per command group** |
| W8 | P07 | Full and standard cases, evidence board, method, about, `llms.txt` | `check_full.py`, parity test | no |
| W9 | Cloudflare | Publish `diego-portifolio-ai` | Public axe, link check | **go** |
| W10 | outside | Stranger verification, rubric review, fixes | Success criteria in SPEC | no |

Why this order: code visibility comes before pretty pages, because permalinks and evidence links depend on it. The flagship ships before the other cases, so review happens on one complete example.

allowed_write_paths: per stage, listed in each repository's own phase. P07 stages: `projects/p07/**`.

forbidden_changes: `harness-kit/`, Go, a number without an evidence record, a fake result under a model-quality label, private data in replay, third-party runtime origins, publishing or pushing without go, weakening a test.

llm_mode: fake. budget: USD 0 until the owner sets a demo ceiling. No new model calls; P00 protected holdout budget stays untouched.

stop conditions: three failed attempts on one failure; any secret found in history (stop, report, do not publish); any step that publishes, spends or restarts a Fly machine.

Owner inputs needed: spelling of the Pages name; visibility per repository; license; demo budget; bio, CV, contact, target role; AI-assistance wording; custom domain.
