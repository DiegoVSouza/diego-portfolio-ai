# Scenes: story, rhythm, contracts and states

Source of truth for the contracts is `src/content/scenes.json`. `src/scenes.test.ts` fails the build when a scene lacks a proof, trigger, static frame, reduced-motion fallback, mobile path or focus order, when a proof is not tied to content, or when a built scene's static frame is missing.

## Story contract

> In one minute a visitor understands that I am an AI engineer, sees a real run, and can reach the architecture of a project.

A scene that does not serve this sentence is removed.

## Phase 005: the city journey (supersedes the one-station-per-project flight on the home)

The home is a scroll journey through six districts of one city (`.planning/phases/005-city-journey/SPEC.md`), in the style of a game menu:

| # | District | Holds | Built form |
| --- | --- | --- | --- |
| 1 | Arrival | Hero | Avenue, a gate with the headline, towers on both sides |
| 2 | SupportOps | The flagship | A control tower with setbacks and a beacon |
| 3 | AI core | Foundation, Agents, Toolkit | Dense towers joined by sky bridges |
| 4 | Platform | Observability, Async | Elevated viaduct, the metro station, two trains |
| 5 | Craft | Design system, Harness | Low rooftops with billboards, scaffolding, a crane |
| 6 | Terminal | About, contact | Harbour: water, container stacks, cranes, a lighthouse |

- **Revision:** one stop per card (ten), with the card hung on a billboard in the city; see the phase 005 spec. The text below describes the district view.
- **Camera as transition.** Each district is a tall section; the camera rests at its stop for the middle of the section and flies the rail to the next
  one, swinging across the avenue, panning and banking (zero at a stop) and widening the lens with speed. Native scroll only.
- **Game menu.** Left: the district list, the active one on a red shard, a description box, the keys (`j`, `k`, number keys). Right: the panel of the
  district, held in view while its section passes. Between them, the city. Choosing an entry scrolls to its district, so the camera flies there.
  Under 1200 px the menu is a bar with previous and next and the panels are full width.
- **Fallbacks.** No WebGL, portrait, save-data, the simple version: level 1 background, same content, working menu or bar. Reduced motion: a static frame
  per district, no swing, no events.
- **Case pages** hold the camera at the stop of the district that holds the project.
- Contracts in `scenes.json` describe the earlier station flight; the e2e suite (`v2.spec.ts`, `flow.spec.ts`, `scene.spec.ts`) is the source of truth for the journey until they are rewritten.

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
- A case has four tabs (demo, architecture, decisions, numbers) as an enhancement. In the HTML every panel is present, stacked and visible, and there is no tab bar; with JavaScript the bar appears and the hash names the tab (`#decisions`, or an id inside a panel). The summary and the links to "not measured" and "failure gallery" stay above the tabs.
- The scene is the v5 collage scene, ported to TypeScript modules (`src/scene/`: tokens, geometry, symbols, burst, glass, city, post, quality, scene). Its hard-coded colours were replaced by the design tokens, and the RGB split fires only when a selection settles, not with scroll speed.
- Numbers on the site come only from evidence records (`{ev:id}` tokens).
- Status is the evidence mode of a record (`fake`, `replay`, `live`, `service`) with a glyph and a word.
- The demo is the real stack, woken on request after a human check, not an iframe: the console is a separate origin with its own login.
- The descent (stripes) plays when a project opens. The Simple version button turns off the scene, the background layers and the stripes. Back to the surface returns to the same project on the home.
- Everything is bilingual (English and Portuguese).

## Assets

`assets/ledger.json` is the source of truth for every file under `assets/`; `node tools/assets.mjs audit` must exit 0. The scene's models, all in `assets/game/models/`: the truck and the motorcycle (Kenney, CC0, from the v5 file), twelve skyline buildings from four building models (three from Quaternius' Downtown City MegaKit, CC0, and one from the Free Sample pack), two cars (A_R7 and S64Compact, CC0 per their licence files), and one metro station per project assembled from the Modular Underground Metro pieces. The Free Sample building and the metro station come from packs that ship no licence file; they are registered as `OWNER-DECLARED` on the owner's word (terms unverified) and listed apart in `assets/CREDITS.md`. All are stripped of textures (the CSP has no `blob:` in `img-src`, and the scene colours every instance itself) and served by the site. See `docs/harness/assets-pipeline.md`. Everything else in the scene is generated by code. If a model fails to load, a generated one takes its place and a warning is logged; `canvas[data-landmarks]`, `[data-vehicle-kinds]` and `[data-stations]` say which path ran.

The kit's automatic sources do not have low-poly city props that fit this style: Poly Haven models are realistic and 12 to 90 thousand triangles each, and the Quaternius packs it can fetch are medieval and fantasy. Better vehicles and city props would come from Kenney's Car Kit and City Kit (CC0, manual download from kenney.nl, which the kit does not fetch) or from Poly Pizza (needs a free API key).

## States and errors

See the `states` table in `scenes.json`. The demo states are tested in `src/app.test.tsx`; the background fallbacks are tested in `e2e/scene.spec.ts`.

## Shatter decision

In the scene, a symbol object shatters 140 ms after the selection settles and then recomposes. On its own this is effect without content.

| Option | What it is | Cost | Status |
| --- | --- | --- | --- |
| A. Keep as is | Shatter and recompose on settle, and one event per real run step on `/demo/` | Zero. Already built and tested | **Current default** |
| B. Pieces become diagram nodes | On opening a case, the pieces of the symbol move to the positions of that case's diagram nodes, so the effect carries information | About one day: node positions have to be passed from `flows.generated.json` to the scene, and a DOM-to-world mapping has to be kept in sync with layout and resize. Adds a reduced-motion variant and a test | **Proposed, not implemented, needs the owner's approval** |

Option A stays until the owner chooses.
