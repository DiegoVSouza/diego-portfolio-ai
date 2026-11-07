# Collision candidates (phase 016)

Method: oriented footprint (separating-axis test on XZ) plus Y-interval overlap, EPS 0.05. Solids = generated towers, board buildings, viaduct deck/pillars (exact boxes recorded by the scene), imported landmarks (approximate: a square sized from the reserved circle), and the instanced moving objects (exact oriented bounds from the model bounding boxes; wheels and body details are inside those boxes). Candidates are listed; each one needs the reading below before it is called confirmed.

Statics: 297 solids (11 approximate).

## Static vs static

56 overlapping pairs.

- viaduct-deck x viaduct-deck: 56 pair(s), deepest footprint penetration 1.83, overlap height up to 1.40

Pairs where neither solid is approximate: 56.

## Moving vs moving, and moving vs static (30 snapshots, 2.1 s apart)

- metro-station x viaduct-deck: 90 case(s) in 30 snapshot(s); deepest 7.60 (footprint), overlap height 1.05; e.g. metro-station#0 / viaduct-deck at snapshot 0

## Contact with the ground / deck (lowest point of each moving kind, over all snapshots)

| kind | lowest y (min) | lowest y (max) |
|---|---:|---:|
| fleet-0 | 0.05 | 0.05 |
| fleet-10 | 0.21 | 0.21 |
| fleet-3 | 0.05 | 0.05 |
| fleet-6 | 0.05 | 0.05 |
| metro-head | 14.35 | 14.35 |
| metro-middle | 14.35 | 14.35 |
| metro-station | 12.95 | 12.95 |
| metro-tail | 14.35 | 14.35 |
| wheels-10 | 0.05 | 0.05 |
| wheels-6 | 0.21 | 0.21 |

Expected: cars near y = 0.0..0.1 (road at 0.03), trains near y = 14.35 (deck top 14.0, trains lifted 0.35 for the Kenney model).
