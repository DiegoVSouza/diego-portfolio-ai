# S64 wheels and foreground floodlights

The S64 source GLB was inspected in Blender: its wheel arches were empty. Four twelve-sided wheels are added as a separate dark instanced mesh and use the same instance transforms as the S64. The original CC0 GLB remains unchanged. Blender preview of the equivalent wheel positions showed the four wheels aligned with the arches; the scene screenshot does not show an isolated S64 close-up.

The existing floodlight cone mesh now participates in the foreground renderer, with material opacity 0.04. The approximate CSS light wash was removed. `fix-wheel-light-shot.png` was reviewed: floodlight cones fall across the card and the text remains legible.

`npm run atelier -- inspect assets/game/models/car-s64.glb --json`: exit 0; source has 1,644 triangles, no textures. `npx vitest run`: exit 0, 90 passed. `npx eslint src e2e`: exit 0. `npx playwright test e2e/city-fixes.spec.ts e2e/v2.spec.ts`: exit 0, 15 passed before the final S64 identification adjustment. Final `python scripts/check_full.py`: exit 0, 90 unit and 64 browser tests passed; full output in `fix-wheel-light-gate.txt`. Existing modified screenshots were restored after the final gate.

Human acceptance and an in-scene close-up of the S64 wheels remain pending.
