# Phase 017 — World editor (atelier "World" tab)

## Why
The owner wants to adjust the 3D world by hand: some lamp posts glitch, some towers sit wrong, and props cannot be added without editing `world.ts`.
The world is procedural and merged per district, so nothing can be dragged today.

## Goal
A dev-only editor in the atelier: free camera in the real scene, click an item, move / rotate / scale it, hide it, add GLB props, save to a versioned file that the build also reads.

## Requirements
| # | Requirement | Acceptance |
|---|---|---|
| E1 | Edits live in one versioned file `src/scene/world-edits.json` (schema v1: `props`, `towers`, `lamps`) | unit test on parse/validate; empty file = identical world |
| E2 | Towers (generated and imported) get stable ids `t<district>.<n>`; an edit can hide, move (dx, dz), turn (dry) and stretch height (dh) | unit test on the transform; the random stream and the reservations (footprints) do not change when edits exist |
| E3 | Avenue lamps get ids `l<i>`; an edit can hide, move and turn one | same |
| E4 | Props: any GLB of `assets/game/models` can be added with position, yaw, scale; they are real objects (not merged) | unit test on the prop spec; browser check |
| E5 | Editor in the real scene (`/?edit=1`, dev only): orbit camera, click to select, gizmo to move/rotate, numeric fields, hide/show, delete prop, add prop | browser evidence (screenshot) |
| E6 | Save writes `src/scene/world-edits.json` through a dev-server endpoint; reset restores the file | endpoint test |
| E7 | Production: editor code and endpoint are absent from the build; the edits JSON is applied | build output grep + bundle budget |
| E8 | Guide in pt-BR in `docs/atelier/` | file exists, linked from the atelier guide |

## Non goals
Streets, side streets, viaduct, board frames, trains and traffic stay procedural (not editable). No deploy. No new model files. No change to shipped shots.

## Constraints
Edits are applied after every random draw and after every collision test of the original placement, so a hidden or moved tower never changes what else is generated.
Ids follow the generation order: if the generator itself changes, the ids drift. Each edit stores the original position `at: [x, z]`; a mismatch is reported and the edit is skipped.
