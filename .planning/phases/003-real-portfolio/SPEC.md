# Specification — the real portfolio

Status: revision 2, 2026-10-31, after the owner's decisions. Research: lab `docs/knowledge/portfolios-de-ai.md`. Decisions: lab `docs/decisions/ADR-001`, `ADR-002`. Audit: lab `docs/harness/public-readiness.md`.

## Goal

Diego Vieira Gonçalves de Souza, **AI Engineer**. A recruiter understands that in the first screen. A hiring manager sees judgment. An engineer triggers a real model, watches it work, opens the code at the exact commit, runs the check and reads the docs. The site sells, and everything it sells can be checked.

## Audiences

| Reader | Needs | Path |
| --- | --- | --- |
| Recruiter | Role, seniority, proof, contact | Hero, proof strip, experience, contact |
| Hiring manager | Judgment, tradeoffs, failures | Flagship case, decisions, failure gallery |
| Engineer | Real code, tests, does it run | Live demo, validate it yourself, permalinks, CI |

## Selling points

Everything below is used. Each has a source class: `evidence` (generated record) or `cv` (owner's statement, shown as career history, never as a measured result).

| Point | Where | Source |
| --- | --- | --- |
| Live multi-agent system the visitor can trigger | Hero, `/demo/` | evidence |
| Refund dual control: AI proposes, a second person approves, the requester is refused | Flagship | evidence |
| Real-model campaign reported with its failures: 27/36, Wilson interval, failing families, `FAIL_PROVISIONAL` | Evidence board, P00 | evidence |
| Live workflow with reconciled receipts and a content-free correlated trace | P05, P03 | evidence |
| Durable async: leases, DLQ, crash recovery | P04 | evidence |
| Multi-tenant auth with Keycloak OIDC, PKCE, MCP boundary, RAG on pgvector | P05 | evidence |
| Budget ledger across fake, replay and live | P00, method | evidence |
| Engineering harness: specs, gates, evals, evidence, budget | Method, harness case | evidence |
| Own design system with machine-checked contrast | P08 | evidence |
| Production WhatsApp multi-agent assistant, tens of thousands of students a month, 20% less manual support | Experience | cv |
| Stack in production: Python, LangGraph, LangChain, MCP, Claude and OpenAI APIs, pgvector, AWS ECS | Experience, skills | cv |
| 4 years of software engineering, 2+ in generative AI, 1+ in production | Hero | cv |
| Yamaha Motor e-commerce platform, international team | Experience | cv |
| Peer-reviewed paper at SBCAS 2024 with DOI; SEPEC 2024 | About | cv, link |
| `newsAR`, MIT library on PyPI | Other work | cv, link |
| Master's in risk modeling (in progress), BSc in Computational Mathematics | About | cv |
| AWS Certified Cloud Practitioner, English C1, Spanish B1 | About | cv |
| Remote from Crato, CE, Brazil | Hero, contact | cv |

Copy draft for the first screen, for owner review:

> **AI Engineer building agents you can verify.**
> Four years of software engineering, two in generative AI, shipping production agents. This site runs a live multi-agent support platform. Trigger it, watch every step, then read the code and the evals behind it.

Harness statement draft:

> Built with coding agents under an engineering harness: specs before code, gated checks, evals, budget ledgers and saved evidence, following AI engineering best practices. Every number here links to the run that produced it.

Contact shows email, LinkedIn and GitHub. **The phone number is not published.** The CV is rewritten in English from `Diego_Souza_AI_Engineer_EVT_PT.docx`, which stays out of Git.

## Information architecture

Real, prerendered paths. EN at the root, pt-BR under `/pt/`.

| Route | Content |
| --- | --- |
| `/` | Hero, live status, proof strip, system map, flagship, projects, experience, method summary, contact |
| `/demo/` | Live demo: status, wake, accounts, guided tour, run viewer, budget left |
| `/projects/<slug>/` | Case page |
| `/evidence/` | Every metric, filterable by mode and project |
| `/method/` | Harness, SDD, gates, ledger, AI-assistance statement |
| `/experience/` | Career, publications, education, certifications, skills, CV |
| `/design-system/` | `colagem-ui` gallery |
| `/llms.txt`, `/resume.md` | Plain text for machine readers. Own idea, not research-backed; low cost |

## Rendering: React and dynamic pages

Yes, dynamic pages work, and the site uses them. Three layers:

1. **Prerendered HTML** for every route, hydrated by React. Readable without JavaScript (design system principle 7), indexable, with a real link preview.
2. **Client-side React** for everything interactive: demo, run viewer, stepper, filters, language.
3. **Pages Functions** (`functions/api/*`) for runtime data, with secrets kept server-side:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/status` | Asleep or awake per Fly app through the Machines API, **without waking anything**, plus live budget left. Cached |
| `POST /api/demo/start` | Verifies Turnstile, then wakes the stack in dependency order |
| `GET /api/runs/latest` | Recent live runs: steps, tokens, latency, model. No visitor text |

Server-side rendering of a whole page is not needed: nothing here is personalized, and it would add cold paths to a site that must always open. A route can move to SSR later through Functions.

**Hosting.** The Cloudflare plugin recommends Workers + Static Assets for new sites, and Pages for existing ones. This spec stays on Pages, a deliberate deviation: it is the owner's choice, it gives the short `diego-portfolio-ai.pages.dev`, whereas Workers uses an account-wide subdomain and custom domains need Cloudflare nameservers, and Functions cover the dynamic needs. Cron Triggers are Workers-only, so the cost guard is one small separate Worker. Revisit if a custom domain on Cloudflare DNS appears; `_headers` carries over.

Considered and left out of v1: AI Gateway in front of Groq (cache, analytics and rate limits, but it changes the audited transport), D1 and KV as stores (a KV cache for `/api/status` is allowed).

## Live demo

**The demo is always live.** Machines autostop; the stack is always ready to start in `LLM_MODE=live`. No environment serves fake answers to visitors.

### Flow

1. Visitor opens `/demo/`. `/api/status` shows state. Nothing wakes.
2. `Start live demo` passes Turnstile and wakes the stack. Wake state shows elapsed time and which service is starting.
3. Visitor signs in with the demo account shown on the page, in the console.
4. Tour: create a ticket or pick a sample, run triage on the real model, see the answer with citations, request a refund, sign in as approver, approve; the requester is refused.
5. Run viewer: classifier, researcher, billing agent, responder, each with latency, tokens, cost estimate and model, and which lab project owns the step.
6. Links from each step into code and docs.

Every project appears in that one run: P00 contracts, P01 runner, P02 guards, P03 telemetry, P04 queue, P05 API and RAG, P06 console. Case pages deep-link to their step. **Libraries are demonstrated inside the real system, not with toy pages.**

### Required P05 work

Live is not a flag. Today `run_configured_triage` refuses the live refund workflow, and `live_groq.py` deliberately refuses unaccounted calls. Those guards stay. New work:

- `demo-live-v1`: an accounted path for public traffic, built on the existing receipts, on a persistent ledger in Postgres.
- Live refund and approval workflow. The model proposes; the deterministic gate and a human decide.
- Key failover across the four numbered credentials on 429.
- `llm_usage` per step in the API (additive; the client is regenerated).
- Fly image built with `INSTALL_LIVE=true`; keys as Fly secrets; `LLM_MODE=live`.

### Budget

| Limit | Value | Enforced by |
| --- | --- | --- |
| Model spend ceiling | **USD 10** total, as a precaution | Persistent ledger, using estimated cost per call. Fail closed |
| Provider limits | As high as the free organizations allow | Real rate-limit headers; failover between keys |
| Per-run | Output token cap and 4 steps, as today | Existing runner |
| Per-visitor | High enough for a full tour; set from measurement | Turnstile plus rate limits |
| P00 protected budget | Untouched: 84 holdout and 60 confirmation calls stay reserved | Separate campaign in the ledger |

When a limit is reached the demo says so plainly and offers recorded live runs, labelled with their date. **It never silently substitutes fake output.**

Free organizations should cost nothing; the ledger is a safety net, not a bill. Before launch, confirm that no organization has a card attached, and that Groq's terms allow rotating between several organizations. Rate limits apply per organization.

### Fly budget: USD 5

**Fly has no hard spending cap.** Staff forum posts say so, and the closest thing is prepaid credit, with reports of it rolling into an invoice anyway. Check the dashboard. So the ceiling needs our own guard:

| Item | Estimate from `fly-deployment.md`, unmeasured |
| --- | --- |
| Idle floor, volumes and stopped filesystems | about USD 2 per month |
| Whole stack running | about USD 0.03 per hour |
| Left for compute under USD 5 | about 100 stack-hours per month, or about USD 3 |
| One visit, with about 11 minutes to idle stop | about 500 isolated visits per month |

Actions:

- Move the 10 GB Postgres volume to 1 GB (saves about USD 1.35 per month).
- Scope the wake to what a demo needs; keep Jaeger and SNS asleep where possible.
- **Cost guard:** a Cron Worker sums machine time from the Machines API, alerts at USD 4, and at USD 5 disables autostart, so the site offers recorded runs. Feasibility `[VERIFICAR]` in W1b.
- Retire `supportops-lab-web` after Pages works.

### Abuse and safety

Public text reaches a real model. Controls:

- Triage stays tool-free. Refunds stay simulated. Only synthetic tenant data. No outbound messages.
- Output is rendered as text. Guard screens stay on.
- Keycloak admin path closed publicly; bootstrap admin and demo passwords rotated.
- Scheduled data reset. The page warns that entries are public and temporary.
- No visitor text in `/api/runs/latest` or in logs.
- Security review of the public surface before announcing.

## Project map

| Group | Project | Slug | Depth | Repository | Demo |
| --- | --- | --- | --- | --- | --- |
| Flagship | P05 + P06 | `supportops` | Full | `supportops-platform`, new `supportops-console` | Live |
| AI core | P00 Foundation and evals | `foundation` | Full | `supportops-foundation` | Step in live run; campaign browser |
| AI core | P01 Orchestration | `agents` | Full | `supportops-agents` | Step in live run; runner comparison |
| AI core | P02 Toolkit | `toolkit` | Standard | `supportops-ai-toolkit` | Guards in live run; run logs |
| Platform | P04 Async | `async` | Full | `supportops-async` | Queue in live run; crash replay |
| Platform | P03 Observability | `observability` | Standard | `supportops-observability` | Trace of the live run |
| Craft | P07 + P08 | `design-system` | Standard | new `diego-portfolio-ai`, new `colagem-ui` | This site, gallery |
| Craft | Lab harness | `harness` | Standard | `ai-engineer-lab` | One phase, start to gate |

Other work: `newsAR`, public repositories worth linking, chosen by the owner.

## Case page template

Order is fixed. A section with no honest content says why.

1. **Header.** Number, name, one-line outcome, evidence seal, and `Live demo · Code · Docs` above the fold.
2. **TL;DR.** Problem, my role, stack, result.
3. **See it run.**
4. **How it works.** One diagram, a short walkthrough.
5. **Decisions.** Three to seven, each with code permalink and a final `Rejected:` line.
6. **Results.** `Measured`, then `Not measured, so not claimed`.
7. **Failure gallery.** Three to five real failures: what, cause, change or why open.
8. **Validate it yourself.** Clone, command, expected result, CI status.
9. **What I would do differently.**
10. **Next project.**

Voice: first person, plain, specific. Confident where evidence exists, frank where it does not.

## Content model

- Case text in `src/content/<slug>.ts`, EN and pt-BR, typed. CV facts in `src/content/profile.ts`.
- `src/data/evidence.generated.json` generated from sibling repositories.

```ts
interface Evidence {
  id: string; project: string; label: Text;
  value: string;                 // exactly as the source states it
  mode: "fake" | "replay" | "live" | "service";
  command: string; exitCode: number;
  commit: string; path: string;  // permalink = repo + commit + path
  recordedAt: string;
  caveat?: Text;                 // e.g. "development set, not held-out"
}
```

## Design system mapping

Level 1, tema Breu, preset vermelho, `colagem-ui` only.

| Concept | Here |
| --- | --- |
| Item | Project |
| Selo | `● verified`, `◐ partial`, `! claimed`, `○ open`, `✕ failed`, always glyph plus word |
| Meta | Mode and last verified date |
| Comando | `$ project open 05` |
| Número fantasma | Project number on each case |
| Índice | Lateral project index, `j`/`k`, hidden under 900 px |
| HUD | `05/08 · flagship · supportops`; on the demo, the current step |
| Faixa | Keywords band, home only |
| Listras | Only when a person chooses a project |
| Cartão em foco | One per screen: flagship on the home, TL;DR on a case, current step on the demo |
| Objeto-símbolo | Flat SVG per project; 3D in the later phase |

New generic components for `colagem-ui` 0.4.0: `LinkTrio`, `MetricTable`, `RunLog`, `Stepper`, `Timeline`, `DecisionCard`, `FailureCard`, `SideIndex`, `Hud`, `Wipe`, `Tabs`. System map and run viewer stay in P07.

## Requirements

| ID | Rule |
| --- | --- |
| EV-001 | Every metric in project content is an `Evidence` record. A test fails on an untagged digit-bearing claim. CV facts live only in `profile.ts`, labelled as career history. |
| EV-002 | `evidence:check` fails if a referenced file is missing or the value drifted. |
| EV-003 | A `fake` record cannot render under a model-quality label. |
| EV-004 | Each project has at least one `Not measured` item and one failure or limit. |
| LINK-001 | Code links are permalinks with a full commit hash, and a release gate checks each publicly. |
| LIVE-001 | No deployed configuration serves `fake` to visitors. A test fails on `LLM_MODE = "fake"` in demo Fly configs. |
| LIVE-002 | The ledger fails closed at USD 10. Tested at the boundary, with concurrent runs. |
| LIVE-003 | On exhausted quota or budget, the demo states it and offers labelled recordings. A test proves there is no silent fallback. |
| LIVE-004 | Opening a page wakes nothing. Only `Start live demo` does. |
| LIVE-005 | Wake shows elapsed time, per-service progress and retry. |
| COST-001 | The Fly guard stops autostart at USD 5 by its own estimate, and alerts at USD 4. |
| SEC-001 | Strict CSP. Third-party runtime origin only for Turnstile, only on `/demo/`. Secrets only in Fly secrets and Pages environment. |
| SEC-002 | Reviewed public surface, closed admin, rotated passwords, no phone number, no visitor text in public output. |
| SEO-001 | Each route prerendered, readable without JavaScript, with title, description and Open Graph image. |
| I18N-001 | EN and pt-BR parity; a missing key fails a test. |
| A11Y-001 | axe with contrast on every route at 360 and 1000 px. Full keyboard path. |
| PERF-001 | Initial JS at most 100 KB gzip per route. LCP target 2.5 s on 4G, measured. |
| DS-001 | No local color, radius or blurred shadow. Design system section 16 checklist recorded. |
| CUR-001 | Each case shows a generated last-verified date and commit. |

## Success criteria

| Test | Pass |
| --- | --- |
| Rubric | Specificity, Evidence, Focus, Process, Currency, Voice reviewed with examples |
| First screen | A person outside the lab states role and specialty after one look |
| Stranger verification | Someone reaches code and evidence for a claim, unaided |
| Clean clone | A fresh machine reproduces one flagship check from the README |
| Demo | From cold, on a phone, a real-model tour completes |
| Budget | A month ends under USD 5 on Fly and USD 10 on models, by the bill |

## Out of scope

Three.js scene (later, level 2), blog, third-party analytics, a chat assistant over the site. Go (ADR-002): the lab's backend is Python.
