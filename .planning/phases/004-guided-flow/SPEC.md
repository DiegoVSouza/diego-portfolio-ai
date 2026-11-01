# Specification — guided flow

Status: draft, 2026-11-01. Research: `docs/knowledge/guided-flow-research.md`. Owner request: navigation and flow of the site are "terrible"; wants **About me, then each project with its live demo and an interactive flowchart, then the README explained, all in one easy-to-follow flow**.

## Goal

A visitor always knows where they are, what comes next, and can reach it with one action. The site reads as one trail with 3 stops per project, not as a set of parallel pages.

## The trail

```
About -> Project 1: Demo -> Flow -> README -> Project 2: Demo -> Flow -> README -> ... -> Project 8 -> Contact
```

| Stop | Content | Source (no new claims) |
| --- | --- | --- |
| About | Who, what, proof strip, short career, links | `profile.ts`, evidence records |
| 1. Demo | The live demo (SupportOps) or a **replay of a recorded run** with its source, or `PENDING`. Never a simulated result | `evidence`, `/demo/` |
| 2. Flow | The project's interactive `FlowDiagram`: click a node for detail, code and docs links, autoplay, text equivalent | `flows` |
| 3. README | The project's README, explained in order: problem, decisions, failures, results, what I would do differently, next. Link to the pinned README | `cases/*.ts` |
| Contact | WhatsApp, e-mail, LinkedIn, GitHub | `profile.ts` |

## Requirements

- **FLOW-001** The home page opens with About, then the proof strip, then the projects as the start of the trail. No standalone system diagram on the home page (it moves to the flagship's Flow stop).
- **FLOW-002** A case page shows the three stops stacked, in order, each with its heading and an anchor (`#demo`, `#flow`, `#readme`). No content hidden behind tabs. Old anchors (`#architecture`, `#decisions`, `#numbers`) still land on the right section.
- **FLOW-003** A step rail shows "Project N of 8" and the three stops, with the current one marked (`aria-current`). It never covers a heading after an anchor jump.
- **FLOW-004** Every case ends with one primary action: the next project's first stop. The last case ends with Contact. The first stop of the first project is reachable from About.
- **FLOW-005** One primary navigation: the header carries the brand, **Tour**, Simple version and language. Evidence, Method, Experience and Design system move to the footer and stay reachable by URL.
- **FLOW-006** Scroll is never captured. The 3D scene stays decorative. Nothing important is only in the scene (NN/g, Scrolljacking 101).
- **FLOW-007** Works without JavaScript (stacked, linked), in EN and pt-BR, at 360, 1000 and 1280 px. axe passes with contrast.
- **FLOW-008** The Demo stop never shows a number or status absent from a generated or cited source. A project without a recorded run shows `PENDING`.
- **FLOW-009** Optional: remember the last stop (`localStorage`, wrapped in try/catch) and offer **Continue**. The page renders correctly without it.
- **FLOW-010** Optional, progressive: cross-document View Transitions with `@view-transition { navigation: auto; }`, off under `prefers-reduced-motion`. Browser support confirmed on MDN and caniuse before it ships.

## Out of scope

Turnstile, the "estilhaço B" scene shard (owner's earlier decision), new 3D assets, new live backends, new metrics.

## Success criteria

1. A stranger who opens `/`, using only the primary action, reaches Contact after visiting every project's three stops, and never has to open a menu. Measured by an e2e walk (VERIFY).
2. Primary navigation drops from 4 header pages plus palette, metro, scene controls and tabs to a header Tour link plus the trail line.
3. `check_full.py` exit 0, budget under 100 KB gzip, axe clean, Lighthouse desktop performance recorded (previous run: 0.83).
4. No claim removed from the site; every content block still traces to its source.
