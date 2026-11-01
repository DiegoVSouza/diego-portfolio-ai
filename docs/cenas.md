# Scenes: story, rhythm, contracts and states

Source of truth for the contracts is `src/content/scenes.json`. `src/scenes.test.ts` fails the build when a scene lacks a proof, trigger, static frame, reduced-motion fallback, mobile path or focus order, when a proof is not tied to content, or when a built scene's static frame is missing.

## Story contract

> In one minute a visitor understands that I am an AI engineer, sees a real run, and can reach the architecture of a project.

A scene that does not serve this sentence is removed.

## Rhythm

| Time | Scene | The visitor can |
| --- | --- | --- |
| 0 to 10 s | S0 arrival | Say what I do, what the proof is, and what to do next |
| 10 to 60 s | S1 flight, S6 demo | See a project, see a real run with its numbers |
| 1 to 3 min | S3 case | Read the decisions, the rejected options, the failures and the diagram |
| any time | header, side index | Reach the demo, the evidence, the contact |

## Scroll only where it is space

Flying along the city is scroll: the visitor walks through the projects. A case page is discrete content with direct access, so it is a fixed sequence of sections reached by link or by the side index, never sections pinned to the scroll. Native scroll is kept everywhere: no scroll lock, no programmatic scroll except returning to the top on navigation.

## Scenes

See `scenes.json`. `built` scenes have a static frame saved by the e2e suite under `artifacts/evidence/portfolio-w7b/` (and `portfolio-w7/` for the first frame). `planned` scenes have none yet.

## How this differs from the original plan

- Routes are real pages (`/projects/<slug>/`, prerendered), not a hash on one page. A shared link lands on the full case with its HTML, and search engines see it.
- A case page is one ordered document with a side index. A tab stepper was not adopted: the order of sections is fixed by test (`tldr, run, how, decisions, results, failures, validation, differences, next`) and tabs would hide content from the first read and from search.
- Numbers on the site come only from evidence records (`{ev:id}` tokens). The plan's example metrics are not used.
- Status is the evidence mode of a record (`fake`, `replay`, `live`, `service`) with a glyph and a word, not a free `ao_vivo / gravado / em_construcao` field.
- The demo is the real stack, woken on request after a human check. It is not an embedded iframe: the console is a separate origin with its own login, so the demo page links to it, shows the stack status and budget, and shows the run log from real runs.
- Everything is bilingual (English and Portuguese).

## States and errors

See the `states` table in `scenes.json`. The demo states are tested in `src/app.test.tsx`; the background fallbacks are tested in `e2e/scene.spec.ts`.

## Shatter decision

In the scene, a symbol object shatters 140 ms after the selection settles and then recomposes. On its own this is effect without content.

| Option | What it is | Cost | Status |
| --- | --- | --- | --- |
| A. Keep as is | Shatter and recompose on settle, and one event per real run step on `/demo/` | Zero. Already built and tested | **Current default** |
| B. Pieces become diagram nodes | On opening a case, the pieces of the symbol move to the positions of that case's diagram nodes, so the effect carries information | About one day: node positions have to be passed from `flows.generated.json` to the scene, and a DOM-to-world mapping has to be kept in sync with layout and resize. Adds a reduced-motion variant and a test | **Proposed, not implemented, needs the owner's approval** |

Option A stays until the owner chooses.
