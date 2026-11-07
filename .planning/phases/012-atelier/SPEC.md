# Phase 012 — Atelier: model and camera workbench

## Why
The city scene still falls back to hand-built boxes for most props (lamp posts, signs, bollards, planters, trees, street furniture), because the
free packs sit unimported in `free-3d-assets-kit/zips` (Downtown City MegaKit 153 glTF, Modular Underground Metro 114 FBX, Kenney Train Kit 103 GLB).
Models that did get imported were tuned by hand each time, and camera shots (`shotOf` in `src/scene/layout.ts`) are tuned by editing numbers, building
and taking screenshots (phase 011 took many rounds). The sibling project `survive` solved the same problems with a Blender pipeline and verifiable gates.

## Goal
One local workbench (the "atelier") to (1) inspect, fix and import models and (2) tune camera shots live, without hand-editing numbers blind.
Plus the documentation that says how to run it, and what was reused from `survive`.

## Requirements
| # | Requirement | Acceptance |
|---|---|---|
| A1 | Reuse from `survive` is mapped: what was copied, what was adapted, what was left (and why) | `docs/atelier/PLAYBOOK.md` section "Reuse map"; adapted scripts carry a source note |
| A2 | `node tools/atelier/atelier.mjs inspect <glb>` reports triangles, bounds, origin offset, scale, materials, textures, attributes, animations and flags problems against the site's rules (no textures: CSP; origin at the base; budget) | unit test on a generated GLB; run on all 12 shipped models |
| A3 | `atelier.mjs improve <in> <out>` runs Blender headless: clean (weld, normals, apply transforms), place the origin at the base centre, Y up and front +Z, optional decimate to a triangle budget, export GLB | run on at least one unimported megakit model (FBX/glTF) and re-inspect |
| A4 | `atelier.mjs axis` proves the Blender to glTF axis mapping by exporting and reading nodes (from `survive`) | exits 0, writes result under `artifacts/evidence/atelier/` |
| A5 | `atelier.mjs status` reports Blender path/version, MCP addon port, node, python, and the unimported candidates | prints a table; exit 0 even when MCP is down |
| A6 | `atelier.mjs candidates` lists unimported pack models grouped by what the scene needs (lamp, sign, prop, street...) | uses the pack zips read-only |
| A7 | Atelier page (`/atelier.html`, dev only, never in the production build): model viewer (orbit, bounds, axes, scale references, wireframe, palette material, triangle count) | opens in dev; build output has no atelier file |
| A8 | Camera tuner in the same page: pick a stop, edit its shot (camera ahead/lat/height, board ahead/lat/bottom/scale/aim) with sliders, preview in the real scene (iframe), copy the result as the `KINDS`/`shotOf` data | overrides apply only in dev; tests keep the shipped shots |
| A9 | Documentation: playbook (pipeline, MCP setup, camera and animation flow, skills and agents researched online with sources), pt-BR quick guide | files exist; links in README |

## Non goals
No new models are shipped to production in this phase except through the documented gate. No deploy. No change to the shipped shots. Blender MCP
live sessions are documented, not required: the scripted headless path is the reproducible one.

## Constraints
Only CC0 (or recorded exceptions in `assets/ledger.json`); every file under `assets/` needs a ledger record (`tools/assets.mjs`); no network at runtime;
CSP unchanged; production bundle size unchanged (atelier is not an entry of the build).
