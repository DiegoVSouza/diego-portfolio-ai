# Plan — the real portfolio

Revision 2. Execution is handed to another model: lab `docs/harness/portfolio/NEXT-EXECUTOR-PROMPT.pt-BR.md`. Stages marked **go** have external effects. The owner's budgets are USD 5 on Fly and USD 10 on models; they do not by themselves authorize a deploy or a push.

| Stage | Where | Content | Gate | Go |
| --- | --- | --- | --- | --- |
| W0 | lab, P07 | Research, ADRs, spec | Owner reviewed | done |
| W1 | all repositories | Public-readiness audit | `docs/harness/public-readiness.md` | done |
| W1b | lab | Verify in Fly and Groq: Machines API cost data, prepaid behavior, real rate limits | Findings recorded | no |
| W2 | P00–P08 | Fix findings: clean-clone failures, READMEs as case studies, CI on fresh runners, personal paths at HEAD | Clean clone passes | no |
| W3 | GitHub | Push, create repositories, change visibility, one at a time | Hosted CI green | **go, per repository** |
| W4 | P05 | `demo-live-v1`, live refund flow, key failover, per-step usage, boundary tests | Fake gate plus a live smoke inside budget | smoke: **go** |
| W5 | P07 | Prerender, routes, `/pt/`, content model, evidence generator, Functions with mocks | `check_full.py` | no |
| W6 | P08 | `colagem-ui` 0.4.0 | `check_full.py`, tarball pinned | no |
| W7 | P07 | Home, flagship, demo page, run viewer, profile and experience in EN | Owner reads; squint review | no |
| W8 | lab, P05, P06, Cloudflare | Hardening, volume reduction, CORS release, Keycloak origins, cost guard, Pages console, Turnstile, Fly live deploy | Public e2e with a real model, rollback rehearsal | **go, per group** |
| W9 | P07 | Other cases, evidence board, method, `llms.txt` | `check_full.py`, parity | no |
| W10 | Cloudflare | Publish `diego-portfolio-ai` | Public axe, link check | **go** |
| W11 | outside | Stranger verification, rubric, one month of real bills | Success criteria | no |

Code visibility comes first because permalinks depend on it. P05's accounted path comes before the demo page because the page depends on real output. The flagship ships before the other cases so review happens on one complete example.

allowed_write_paths: per stage, in each repository's own phase. P07 stages: `projects/p07/**`.

forbidden_changes: `harness-kit/`, Go, a number without evidence, a `fake` result under a model-quality label, silent fallback from live, removing `accounted_guard_required` or the live workflow guard without its accounted replacement, spending P00's protected budget, a phone number on the site, the CV in Git, pushing or publishing without go, weakening a test.

stop conditions: three failed attempts on one failure; a secret anywhere; projected spend over either ceiling; any step that publishes or restarts a Fly machine without go.

Owner inputs still needed: review of the copy and of the English CV, after the site is up.
