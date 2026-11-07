# Collision candidates (phase 016)

Method: oriented footprint (separating-axis test on XZ) plus Y-interval overlap, EPS 0.05. Solids = generated towers, board buildings, viaduct deck/pillars (exact boxes recorded by the scene), imported landmarks (approximate: a square sized from the reserved circle), and the instanced moving objects (exact oriented bounds from the model bounding boxes; wheels and body details are inside those boxes). Candidates are listed; each one needs the reading below before it is called confirmed.

Statics: 251 solids (11 approximate).

## Static vs static

94 overlapping pairs.

- viaduct-deck x viaduct-deck: 72 pair(s), deepest footprint penetration 1.83, overlap height up to 1.40
- generated-building x viaduct-deck: 9 pair(s), deepest footprint penetration 7.60, overlap height up to 1.40
- board-building x viaduct-deck: 8 pair(s), deepest footprint penetration 7.60, overlap height up to 1.40
- board-building x viaduct-pillar: 3 pair(s), deepest footprint penetration 2.40, overlap height up to 12.60
- generated-building x viaduct-pillar: 2 pair(s), deepest footprint penetration 1.26, overlap height up to 8.58

Pairs where neither solid is approximate: 94.

## Moving vs moving, and moving vs static (30 snapshots, 2.1 s apart)

- metro-station x viaduct-deck: 120 case(s) in 30 snapshot(s); deepest 7.60 (footprint), overlap height 1.05; e.g. metro-station#0 / viaduct-deck at snapshot 0
- metro-middle x board-building-4: 51 case(s) in 20 snapshot(s); deepest 5.72 (footprint), overlap height 8.17; e.g. metro-middle#0 / board-building-4 at snapshot 1
- metro-middle x generated-building: 20 case(s) in 16 snapshot(s); deepest 5.72 (footprint), overlap height 8.17; e.g. metro-middle#7 / generated-building at snapshot 7
- metro-station x metro-middle: 17 case(s) in 11 snapshot(s); deepest 4.17 (footprint), overlap height 3.43; e.g. metro-station#0 / metro-middle#1 at snapshot 19
- metro-tail x generated-building: 9 case(s) in 9 snapshot(s); deepest 6.91 (footprint), overlap height 8.17; e.g. metro-tail#2 / generated-building at snapshot 10
- metro-tail x board-building-4: 9 case(s) in 9 snapshot(s); deepest 7.02 (footprint), overlap height 8.17; e.g. metro-tail#1 / board-building-4 at snapshot 19
- metro-head x generated-building: 9 case(s) in 7 snapshot(s); deepest 6.90 (footprint), overlap height 8.17; e.g. metro-head#2 / generated-building at snapshot 3
- metro-head x board-building-4: 8 case(s) in 8 snapshot(s); deepest 7.02 (footprint), overlap height 8.17; e.g. metro-head#1 / board-building-4 at snapshot 13
- metro-station x metro-head: 6 case(s) in 6 snapshot(s); deepest 4.66 (footprint), overlap height 3.43; e.g. metro-station#0 / metro-head#0 at snapshot 18
- metro-station x metro-tail: 5 case(s) in 5 snapshot(s); deepest 4.78 (footprint), overlap height 3.43; e.g. metro-station#0 / metro-tail#0 at snapshot 8
- metro-tail x board-building-3: 2 case(s) in 2 snapshot(s); deepest 3.09 (footprint), overlap height 8.17; e.g. metro-tail#0 / board-building-3 at snapshot 26
- metro-head x board-building-3: 1 case(s) in 1 snapshot(s); deepest 0.07 (footprint), overlap height 8.17; e.g. metro-head#0 / board-building-3 at snapshot 25

## Contact with the ground / deck (lowest point of each moving kind, over all snapshots)

| kind | lowest y (min) | lowest y (max) |
|---|---:|---:|
| fleet-0 | 0.01 | 0.01 |
| fleet-10 | 0.41 | 0.41 |
| fleet-3 | 0.05 | 0.05 |
| fleet-6 | 0.57 | 0.57 |
| metro-head | 14.35 | 14.35 |
| metro-middle | 14.35 | 14.35 |
| metro-station | 12.95 | 12.95 |
| metro-tail | 14.35 | 14.35 |
| s64-wheels | 0.25 | 0.25 |

Expected: cars near y = 0.0..0.1 (road at 0.03), trains near y = 14.35 (deck top 14.0, trains lifted 0.35 for the Kenney model).
