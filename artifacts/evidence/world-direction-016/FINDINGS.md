# Phase 016 findings

Everything here comes from runs in this phase on the current state (dev server, headless Chrome 1280 x 800, 100 Hz display). Phase 015 results were not reused as proof. Three separate levels: **technical** (numbers and tests), **agent visual review** (screenshots the agent opened and read, listed), **human approval** (none yet).

## Reproduce

`npm run dev -- --host 127.0.0.1 --port 5187 --strictPort`, then:

| Tool | Output |
|---|---|
| `node tools/world-direction-motion.cjs` then `python tools/world-direction-analyze.py` | `motion-frames.json`, `MOTION.md` |
| `node tools/world-direction-static.cjs` then `python tools/world-direction-collide.py` | `world-static.json`, `world-moving.json`, `COLLISIONS.md` |
| `node tools/world-direction-cards.cjs` | `cards-check.json` |
| `node tools/world-direction-shots.cjs <tag>` / `node tools/world-direction-view.cjs <tag> <views.json>` | screenshots under `<tag>/` |
| `python tools/world-direction-annotate.py` | `docs/world/img/*` |

The tools need dev-only hooks in `scene.ts` (`__worldProbe`, `__worldInside`, `__worldAudit`, `__freeCam`); production builds drop them.

## Confirmed defects and fixes

| # | Defect | Evidence (before, after) | Fix and test | Commit |
|---|---|---|---|---|
| 1 | Towers and one board building stood on the metro viaduct (deck and pillars); trains ran through those buildings | `COLLISIONS-before.md`: 94 static pairs and 12 train/building classes from exact oriented boxes; `COLLISIONS.md`: none between exact solids | viaduct keeps the longest clear stretch per side, towers skip the corridor, trains use the drawn stretch, buffer stops at the ends; `corridor.test.ts` | `6ea65af` |
| 2 | Cars hovered over the road: lowest point 0.41 (S64) and 0.57 (R7) above it | `COLLISIONS-before.md` (contact table) vs `COLLISIONS.md`: 0.05 | `groundLift` by lowest point of body and wheels; test in `city-fixes.test.ts` | `6ea65af` |
| 3 | The render loop ran twice per frame (two request chains from start-up); the second call had dt = 0 | `loop-rate.txt`: 202 calls/s before, 100.2 after | `loop.ts` scheduler; `loop.test.ts` | `d8161a5` |
| 4 | Camera whip: up to 11.9 rad/s leaving roof and side stops | `MOTION-limiter-only.md` (100 ms windows, taken while the doubled loop still defeated the limiter, so it equals the unlimited camera): fwd-6-7 10.69, back-8-7 10.66, back-3-2 11.91 rad/s; after (final run): at most 5.12 in every flight (`MOTION.md`; the limit is 5, a 100 ms window can read a little above it). `MOTION-before.md` holds the first, noisier per-frame metrics and is not used for rates | rate limit 5 rad/s (`turn.ts`); `turn.test.ts` | `d8161a5` |
| 5 | Uneven speed: legs of 65 to 171 units all took 2.2 s, and the spline ran up to 1.56 times faster than its mean inside a leg. Peak speed 80 to 302 u/s | `MOTION-limiter-only.md` (before): peak speed 80 to 302 u/s, acceleration mostly 150 to 660 u/s2 over 100 ms windows. `MOTION.md` (final run): peak speed 90 to 138 u/s; acceleration 64 to 178 u/s2 in all but three runs: `fwd-0-1` 656 (the first leg from rest; cause not isolated), `wheel-down` 256 and `wheel-up` 218 | arc-length remap per leg and a flight time proportional to the leg; `flow.test.ts` | `d8161a5` |
| 6 | Curb-stop cameras (stops 4 and 9) sat 0.09 from the side of a passing truck (truck 4.82 wide on a lane at 4; camera at 6.5), inside the 0.5 near plane | geometry from `world-moving.json` bounds | camera to 7.8; test requires 1 unit of clearance for every low camera | `b5460c5` |

## Candidates not settled

| Candidate | What the evidence says | Status |
|---|---|---|
| Station against trains | `COLLISIONS.md`: station box overlaps the cars (up to 4.8 planar). Scale arithmetic: trains are 7.0 wide, the whole station 9.0 wide. `views-1/station-close.png` shows the cars running behind the platform rail and posts | **Confirmed at mesh level** with Blender MCP (`blender-station.json`, `tools/world-direction-blender-station.py`): real triangles of `metro-station.glb` (2,938) against each car model (`train-subway-a/b/c.glb`), with the transforms of `world.ts`, car slid along the track in 0.5 steps over 401 positions. Lane -3.7: 0 overlapping positions. Lane +3.7: 83 of 401 positions (first at 20.5 before the station centre) with 635 to 792 overlapping triangle pairs. So the station clips one of its two tracks, for all three car models. The station's footprint (world x -4.15 to 4.8) cannot be moved off the track: a car is 7.0 wide on a 14 wide deck. **Fixed afterwards** (`stretchClearOf` in `corridor.ts`): the left-viaduct trains use the longer stretch on one side of the station and stop short of its platform. `COLLISIONS.md` re-run: no train x station case left. The station itself is kept (the e2e contract expects it); it still sinks 1.05 into the deck on purpose (its base), and the owner may still pick another station per D4 |
| Viaduct decks overlapping each other (62 pairs, up to 1.83) | adjacent segments are 7.6 long on a 7.0 step, same colour and same top height | not changed; flicker cannot be judged from still images |
| Camera "inside" flags | 403 flags on 9,507 samples, all on imported landmark meshes with the nearest face at least 12.1 away; the smallest distance from any sample to any solid was 7.35 | false positives (open GLB shells); the camera did not touch a solid in the sampled frames (final run, after every fix: 9,507 samples, smallest distance 7.35) |
| Cars wrapping at the ends of the road | analytical: the start is behind the stop 0 view; the far end is 315 from stop 9, past the fog | not sampled in frames |
| Harbour never visible | stop 9 is 327 from the water's edge, fog ends at 300 | decision D2 |

| Wheels invisible | the fleet's wheels were ink on an ink road, and R7's own wheels share the body tint: at street level every car read as wheelless (`vehicles-mid/`) | light hubs (`grey 0.62`) on R7 and S64, S64 tyres `grey 0.2`; `vehicles-after/` shows them |

## Mesh-level audit of the whole scene (follow-up)

`tools/world-direction-triangles.cjs` dumps every non-instanced mesh's world triangles (162 meshes, about 51,000 triangles, `__worldTriangles` dev hook); `tools/world-direction-blender-audit.py` builds one BVH per mesh in Blender (MCP) and lists every pair that intersects; `tools/world-direction-overlaps.py` groups them (`triangles/OVERLAPS.txt`). Instanced meshes (fleet, trains, station) were audited before with oriented boxes and the station mesh test. Overlaps inside one merged district mesh are not visible to this audit.

| Found | Fix | After |
|---|---|---|
| The viaduct deck went through the post board of stop 5 (frame and posts), and boards 1, 2, 4, 7, 9 touched their own building's front (frame reached 1.05 behind the panel, the wall stood 1 behind) | post boards are blockers for the viaduct run; the wall stands 2.5 behind the panel | board 5 and boards 1, 2, 4, 7, 9 no longer in the list |
| The "under" board (stop 6) rose above the viaduct deck's underside | its height is capped below the deck | gone from the list |
| Surroundings were black: the far ring was 16-26% and the sky flat ink | sky glow band (`sky.ts`, follows the camera, fog off, no depth write), near ring grey 0.20-0.32, far ring 40-60% | silhouettes against a red horizon in `sky1/horizon-left.png` |

Left in the list and judged intended contact, not crossings: roof boards 3 and 8 stand with their posts in the roof (their footing); ribbons and lamp bases touching boards 0 and 5 at ground level (y 0.0 to 0.1); crowns and signs flush with towers; props on the harbour quay. These are readings of positions and one screenshot, not a guarantee.

## Owner review round (card numbers 1, 3, 4, 6, 8, 9 = stops 0, 2, 3, 5, 7, 8)

| Report | Cause found | Change | Evidence |
|---|---|---|---|
| Boards 1 and 6 enter the street | post boards (stops 0 and 5) hung at 20 from the avenue's middle with a frame 33 wide: the frame's near end was 3.6 from the middle line | board at 32, test `boards.test.ts` (every frame end at least 13 from the middle; fails on the old values with 3.6) | `now5/stop-0.png`, unit test |
| Building in front of 3 and 8, card over the building | towers and imported buildings stood on the camera-to-board line; the card is a DOM layer drawn over everything | a chain of keep-clear circles along each camera-to-board line (`sight`) | `tools/world-direction-sight.cjs` (rays from each camera to 64+ points over the card and a fifth around it): with the circles disabled stops 0 and 2 were blocked (negative control); with them nothing is nearer than the board inside the card area at any stop. Stop 7 was not flagged even in the negative control, so what was seen there is not explained |
| Light beams behind the card (4 and 9) | board light cones | removed for every board (floodlight lamps stay) | `now5/stop-3.png` |
| Road sign flying right of 4 | the sky bridges of district 2: a 54 wide slab at 36 to 46 high on two thin struts touching no building (`__worldPick` at that pixel returned `district-2-generated` at y 42) | removed; also the roof signs on struts | `now5/stop-3.png` |

"Too close" was read as the post boards sitting near the camera and the road; the other camera distances were not changed.

## Checks that came out clean

- Cards: `cards-check.json` (all ten stops): no light cone on the card layer, exactly one near card, every control inside the viewport and reaching the click (hit test), traffic canvas `pointer-events: none`, painted face hidden under the card.
- Navigation sampled: 9 forward legs, 9 backward legs, 3 menu cuts, 160-step wheel down and up, arrow key, and reduced motion (four steps: each press goes straight to the stop, no flight, no page error). No direction reversals in flight, no frame step above 30 units outside the cuts.
- First-frame draw calls: 80 before the surroundings, 82 after (limit 100).

## Screenshots actually opened and read

`after-fixes-1/stop-4, stop-5, stop-6`; `views-1/station-close, viaduct-start-left, avenue-overview`; `views-2/end-of-avenue, harbour-from-above, skyline-wide-aerial, ground-edge-high, behind-start, avenue-end-ground`; `views-3/skyline-wide-aerial, end-of-avenue, horizon-left, harbour-from-above`; `after-final/flight-6-7, stop-3, stop-9`; `after-curb/stop-9, stop-4`; `docs/world/img/region-map.png`. Not opened: the other stops and flight frames, `station-side`, `station-along`, and the remaining free views.

## Not verified

Blender MCP was not connected (port 9876 down), so no open scene was touched. Real devices, frame time on slow GPUs and long sessions were not tested. Colour and composition are an agent reading, not approval.
