# Verification

Three levels, kept apart.

1. **Technical acceptance**: commands, exit codes and saved output (below).
2. **Agent visual review**: screenshots the agent opened and read, listed in `artifacts/evidence/world-direction-016/FINDINGS.md`. It is a reading, not an approval.
3. **Human approval**: **pending**. Nothing about composition, colour, motion feel or the surroundings is approved.

## Commands and results

All outputs are in `artifacts/evidence/world-direction-016/`.

| Command | Exit | Result |
|---|---:|---|
| `npx tsc --noEmit`, `npx eslint src e2e scripts functions` | 0 | clean |
| `python scripts/check_fast.py` (`check-fast.txt`) | 0 | lint, typecheck, catalog, evidence, flow and 115 unit tests |
| `python scripts/check_full.py` (`check-full.txt`) | 0 | `check-full: PASS`: fast 0, build 0, budget 0, e2e 0 (64 passed) |
| `npm run -s test`, `build`, `budget`, `e2e` run one by one (`check-steps.txt`) | 0, 0, 0, 0 | 64 browser tests passed |
| `node tools/world-direction-motion.cjs` + `analyze.py` | 0 | `MOTION.md` |
| `node tools/world-direction-static.cjs` + `collide.py` | 0 | `COLLISIONS.md` |
| `node tools/world-direction-cards.cjs` | 0 | `cards-check.json`: ten stops clean |
| `node tools/assets.mjs audit` | 0 | `audit: OK (15 arquivos)`; two OWNER-DECLARED warnings kept as they were; no asset added |

The first `check_fast.py` attempt failed at `flow:check` (`check-fast-first-attempt.txt`, FLOW-002 about the `p00` pin). It came from the owner's uncommitted edits to the foundation case, committed meanwhile as `f8a3461`; after that the gate passed. This phase did not touch those files.

## Acceptance criteria

| Id | Result |
|---|---|
| A1 sampling | met: 9 forward legs, 9 backward legs, 3 menu cuts, wheel down and up, arrow key, reduced motion, frame by frame |
| A2 map and candidates | met with limits: oriented boxes for generated solids, approximate boxes for imported landmarks (11), instanced models by exact oriented bounds. Station against trains: **confirmed at mesh level** with Blender MCP (`blender-station.json`: 83 of 401 slide positions overlap on one track, 635 to 792 triangle pairs); the fix is an art choice, owner decision D4 |
| A3 fixes with tests | met for six defects (see FINDINGS); each has a test, except the render-loop doubling whose test covers the scheduler, not the whole scene |
| A4 cards | met: no cone on the card layer, one near card, controls reach the click, traffic canvas inert |
| A5 plan | met: `docs/world/SURROUNDINGS-PLAN.pt-BR.md` with region map, annotated captures, models, budget, steps and decisions |
| A6 local improvement | met: two procedural rings, draw calls 80 to 82 of 100, one switch to turn them off |
| A7 gates | met: `check_fast.py` 0 and `check_full.py` 0 on the final code |

## Not claimed

- The world is **not** declared collision-free: sampled frames and boxes only; imported landmarks and the station are approximate.
- No claim about devices, slow GPUs or long sessions.
- Blender MCP was down during the main run. Afterwards it was used once, for the station mesh test only (the open scene was the default cube scene; imports were removed, no leftover objects). The other findings were not re-run in Blender.
- Art acceptance: pending the owner (decisions D1 to D4 in the plan).
