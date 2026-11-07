# Phase 016 — World direction: audit, fixes and surroundings plan

Re-audit the city and the camera flow from the current state (phase 015 results are history, not proof), fix reproducible defects with focused regression tests, and produce a reviewable plan for the scenery around the city. Local and reversible only: no network at runtime, deploy, push or publish.

## Acceptance criteria (technical; the owner's art approval is separate)

- A1. Every stop, adjacent transition (both directions), long jump (menu cut), wheel/keyboard/menu navigation and reduced motion is sampled frame by frame in a real browser; camera speed, acceleration, jumps and passes through solids are measured and recorded in `artifacts/evidence/world-direction-016/`.
- A2. Spatial map regenerated with oriented boxes for generated buildings, viaducts, tracks, traffic and trains; every collision candidate is investigated and labelled confirmed / rejected / not decidable (merged or imported meshes are approximate and say so).
- A3. Each confirmed defect has a fix, a focused test that fails before and passes after, and evidence.
- A4. HTML cards keep the floodlight cones out of the card layer; the card/WebGL relation is rechecked (depth, occlusion, clicks).
- A5. `docs/world/SURROUNDINGS-PLAN.md` covers horizon, distant silhouette, sides, city-harbour transition, background and edge treatment, with a per-region map, foreground/mid/background split, annotated captures, models (source/licence/triangles/draw calls), loading and fallback, steps, criteria, risks and owner-approval items.
- A6. Local reversible improvements implemented behind code that keeps the 100 draw call first-frame budget; reduced-motion and fallbacks kept.
- A7. `python scripts/check_fast.py` and `python scripts/check_full.py` exit 0, saved under `artifacts/evidence/world-direction-016/`.

## Three separate acceptance levels

1. Technical acceptance: commands, exit codes, saved output.
2. Agent visual review: screenshots that the agent actually read (listed by name).
3. Human approval: pending until the owner decides. Never claimed here.

## Limits

- No claim that the whole world is collision-free: only sampled frames and approximate boxes.
- Blender MCP was not connected (port 9876 down); headless Blender is available.
- Assets enter `assets/` only through `node tools/assets.mjs` with ledger and `audit` exit 0; CC0 (or CC-BY with credit and authorization); GLB without textures and without literal colours; at most 8,000 triangles per model.
