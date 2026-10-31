# Specification — the real portfolio

Status: draft for owner review. Research: lab `docs/knowledge/portfolios-de-ai.md`. Decisions: lab `docs/decisions/ADR-002-portfolio-as-product.md`, ADR-001.

## Goal

A recruiter understands who Diego is and what he builds in the first screen. An engineer can open any project, use a demo, read the code at the exact commit, run the check themselves and find the documentation. Nothing on the site needs to be taken on trust.

## Audiences

| Reader | Needs | Path |
| --- | --- | --- |
| Recruiter, non-technical | What role, what proof, how to contact | Home hero, flagship summary, contact |
| Hiring manager | Judgment, tradeoffs, failures | Flagship case, decisions, failure gallery |
| Engineer doing a screen | Real code, tests, can it run | Validate it yourself, repository permalinks, CI |

## Information architecture

Real, prerendered paths. EN at the root, pt-BR under `/pt/`.

| Route | Content |
| --- | --- |
| `/` | Hero, proof strip, system map, flagship, project list, method summary, not-measured summary, contact |
| `/projects/<slug>/` | Case page |
| `/evidence/` | Every metric across projects, filterable by mode and project |
| `/method/` | How the lab works: SDD, gates, evidence, budget ledger, AI-assistance statement |
| `/demo/` | Demo hub: tiers, accounts, wake state, guided tour |
| `/design-system/` | `colagem-ui` gallery, as a project of its own |
| `/about/` | Bio, CV, contact |
| `/llms.txt`, `/resume.md` | Plain text for machine readers. Own idea, not backed by the research; low cost |

### First screen of the home

Name and role, one sentence of positioning, three actions (`Try the demo`, `Read the flagship case`, `GitHub`), and one real measured fact with its evidence link. Decorative layers stay behind opaque surfaces.

## Project map

| Group | Project | Slug | Depth | Repository | Demo tier |
| --- | --- | --- | --- | --- | --- |
| Flagship | P05 + P06 SupportOps Platform and Console | `supportops` | Full | `supportops-platform`, P06 repo TBD | 1, with 0 fallback |
| AI core | P00 Foundation and live evals | `foundation` | Full | `supportops-foundation` | 0 |
| AI core | P01 Multi-agent orchestration | `agents` | Full | `supportops-agents` | 0 |
| AI core | P02 AI toolkit | `toolkit` | Standard | `supportops-ai-toolkit` | 0 |
| Platform | P04 Durable async | `async` | Full | `supportops-async` | 0 |
| Platform | P03 Observability | `observability` | Standard | `supportops-observability` | 0 |
| Craft | P07 + P08 Portfolio and design system | `design-system` | Standard | P07, P08 repos TBD | live gallery |
| Craft | Lab harness | `harness` | Standard | `ai-engineer-lab` | 0 |

A project shown as private has no code link and says so. Going public is the gate, not the wording.

## Case page template

Order is fixed. A section with no honest content says why instead of disappearing.

1. **Header.** Number, name, one-line outcome, evidence seal, and the link trio `Demo · Code · Docs` above the fold.
2. **TL;DR.** Problem, my role, stack, result.
3. **Try it.** Demo panel with its tier.
4. **How it works.** One diagram, then a short walkthrough.
5. **Decisions.** Three to seven. Each: context, choice, permalink to code, and a final `Rejected:` line naming the alternatives.
6. **Results.** `Measured` table, then `Not measured, so not claimed`.
7. **Failure gallery.** Three to five real failures: what happened, cause, what changed, or why it stays open.
8. **Validate it yourself.** Clone, exact command, expected result, CI status.
9. **What I would do differently.**
10. **Next and previous project.**

Voice: first person, plain, specific. Admit limits. No adjective a number could replace.

## Content model

- Case text lives in `src/content/<slug>.ts`, EN and pt-BR, typed. No MDX runtime.
- `src/data/evidence.generated.json` is generated from the sibling repositories.

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

Text cites evidence by id (`<Metric id="p00-live-pass-rate" />`). A numeral typed into prose fails a test.

## Demo

| Tier | What | Rule |
| --- | --- | --- |
| 0 Replay | Recorded runs inside the site: trace stepper, run log with command, exit code and commit, failure browser | Always works, no network. Labelled with its mode and date. Only recordings of real runs. Content-free or synthetic data only |
| 1 Real stack | Console on Pages, P05 and Keycloak on Fly, `LLM_MODE=fake`, demo accounts shown on the page, guided tour: create ticket, triage, request refund, a second account approves, requester is refused | The owner chooses when it is on. Wake state with elapsed time. If unavailable, offer Tier 0 |
| 2 Real model | Same flow with a real provider | Out of this phase. Needs a spend ceiling, a provider and an abuse plan |

Replay per project:

| Project | Replay |
| --- | --- |
| P00 | Campaign browser: pass and fail by family and language, Wilson interval, budget ledger. Protected holdout stays out, and answers need a privacy review |
| P01 | One ticket through the supervisor step by step, and the runner comparison |
| P02 | Retry, timeout, schema rejection and injection screen scenarios as run logs |
| P03 | Waterfall of a real content-free trace, plus dashboard screenshots |
| P04 | Worker crash and lease recovery, DLQ path, as a timeline |
| Harness | One phase from intake to gate, with its real artifacts |

The demo wakes Fly only when a visitor presses Start. Merely opening a page wakes nothing.

## Design system mapping

Level 1, tema Breu, preset vermelho, `colagem-ui` only.

| Concept | Here |
| --- | --- |
| Item | Project |
| Selo | Evidence state: `● verified`, `◐ partial`, `! claimed`, `○ open`, `✕ failed`, always glyph plus word |
| Meta | Mode and last verified date, tag with the group |
| Comando | `$ project open 05` |
| Número fantasma | Project number on each case page |
| Índice | Lateral project index, `j`/`k`, hidden under 900 px |
| HUD | `05/08 · flagship · supportops` |
| Faixa | Keywords band on the home only |
| Listras | Only when a person chooses a project; never in reduced motion |
| Cartão em foco | One per screen: the flagship on the home, the TL;DR on a case |
| Objeto-símbolo | Flat SVG per project at level 1; 3D in the later phase |

New generic components go to `colagem-ui` 0.4.0: `LinkTrio`, `MetricTable`, `RunLog`, `Stepper`, `Timeline`, `DecisionCard`, `FailureCard`, `SideIndex`, `Hud`, `Wipe`, `Tabs`. System map and trace waterfall stay in P07 unless a second consumer appears.

## Requirements

| ID | Rule |
| --- | --- |
| EV-001 | Every metric is an `Evidence` record. A test fails on a digit-bearing claim in case prose that is not a `Metric` or an allowlisted non-claim. |
| EV-002 | `evidence:check` fails if a referenced file is missing in the sibling repository or the value drifted. |
| EV-003 | A `fake` record cannot render under a model-quality label. |
| EV-004 | Each project has at least one `Not measured` item and one failure or stated limit. |
| LINK-001 | Every code link is a permalink with a full commit hash, and a release gate checks that each one answers publicly. |
| DEMO-001 | Tier 0 works with the network off. |
| DEMO-002 | Tier 1 shows wake state with elapsed seconds, a retry, and a Tier 0 fallback. |
| SEO-001 | Each route is prerendered, readable without JavaScript, with its own title, description and Open Graph image. |
| I18N-001 | EN and pt-BR have full parity. A missing key fails a test. |
| SEC-001 | CSP stays strict. No third-party runtime origin. Hydration needs no `unsafe-inline`. |
| A11Y-001 | axe with contrast on every route at 360 px and 1000 px. Full keyboard path, including `j`, `k`, `Esc`. Stepper and timeline work without pointer. |
| PERF-001 | Initial JS at most 100 KB gzip per route. LCP target 2.5 s on 4G, measured, not assumed. |
| DS-001 | No local color, radius or blurred shadow. Design system checklist section 16 is walked through and recorded. |
| CUR-001 | Each case shows a generated "last verified" date and commit. |

## Public-readiness gate

Runs before any repository changes visibility. Local work, no external effect.

- Secret scan across **full history** of every repository. A hit means the history is rewritten or the secret is rotated before anything is public.
- Review tracked evidence for personal data, tokens, account IDs and provider responses.
- `LICENSE`, and a README that opens with problem and decision, not setup.
- Clean-clone run in a fresh directory: documented command, documented result. Fix `stack.py checkout`, which depends on unpublished commits.
- Hosted CI for each public repository; badge links to real runs.
- Package dependencies between repositories resolvable by a stranger.

## Public demo hardening

Required before Tier 1 is announced.

- Keycloak admin path not reachable publicly. Rotate bootstrap admin and demo passwords.
- Data resets on a schedule, synthetic only, and the page warns that entries are public and temporary.
- Rate limits verified from the outside.
- Security review of the deployed surface and of free text entered by strangers.
- Fly spend ceiling set by the owner, with an alert.
- Total wake time from cold, and worker wake-up during triage, measured.

## Success criteria

| Test | Pass |
| --- | --- |
| Rubric | Specificity, Evidence, Focus, Process, Currency and Voice each reviewed with examples |
| First screen | A person outside the lab states role and specialty after one look |
| Stranger verification | Someone outside the lab picks a claim and reaches the code and the evidence unaided |
| Clean clone | A fresh machine reproduces one flagship check from the README alone |
| Demo | The guided tour completes from cold on a phone |

## Out of scope

Three.js scene, Tier 2, blog, analytics, comments, a chat assistant over the site. The assistant comes up often in the portfolios read, and it is only worth building after the verified content exists. Go is excluded (ADR-002).
