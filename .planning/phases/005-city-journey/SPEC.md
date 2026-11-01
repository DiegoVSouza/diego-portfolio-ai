# Phase 005: the city journey

Status: in progress. Owner request (2026-11-01): rebuild the 3D city from scratch as a scroll journey through parts of the city,
in the style of a game menu, the transition being the camera movement, in our design system.

## Contract

One sentence every scene serves: a visitor scrolls (or picks from a menu) and the camera flies the city, district by district, to the
project that district holds; at each stop the content is the focus and the city is the backdrop.

## Districts (home)

| # | id | Holds | Built form |
| --- | --- | --- | --- |
| 0 | arrival | Hero: who I am, the proof, the next step | Avenue into downtown, a portal gate, towers on both sides |
| 1 | ops | SupportOps (flagship) | A control tower with setbacks and a beacon, lit mid-rise around it |
| 2 | core | Foundation, Agents, Toolkit | Dense glass core: tall towers joined by sky bridges |
| 3 | platform | Observability, Async | Elevated viaduct, a metro station, trains |
| 4 | craft | Design system, Harness | Low rooftops with billboards, scaffolding, a crane |
| 5 | terminal | About and contact | Harbour: water, container stacks, cranes, a lighthouse |

## Behaviour

1. **Native scroll only.** No scroll hijack. Each district is a tall section; the camera dwells at a stop for the middle of the
   section and flies along a rail between stops. The flight swings (orbit), banks and widens the lens with speed; the swing is zero at a stop.
2. **Menu.** A fixed game-style menu lists the districts: slanted red shard for the active one, a description box, number keys,
   arrows or `j`/`k`, Enter. Choosing an item scrolls to its district, so the transition is the camera flight. Under reduced motion the jump is instant.
3. **Content is the focus.** The panel of a district sits on the right on a wide screen, the menu on the left, the city between them.
4. **Design system.** Every colour comes from a token; halftone pass kept; cut corners, hard shadows; text only on opaque surfaces.
5. **Cases.** A project page holds the camera at its district stop, nothing scrolls the scene (as before).
6. **Fallbacks.** No WebGL, portrait, save-data, simple version or reduced motion: level 1 background, content unchanged; the menu becomes a bar
   under 1200 px. Reduced motion: static frame per district, no swing, no events.
7. **Assets.** Real models (buildings, cars, metro station) as in `docs/harness/assets-pipeline.md`; a model that fails falls back to generated geometry.

## Budgets

First-load JavaScript of a route stays under 100 KB gzip; the scene chunk under 500 KB; at most 100 draw calls on the first frame;
at most 3 active lights; static geometry merged per district; moving things instanced; pixel ratio capped at 1.5; one render loop, on demand when static.
Practices taken from `emalorenzo/three-agent-skills` (`three-best-practices`, read, not installed).

## References read (ideas, no code copied)

- `dingdongkkk/portfolio-persona`: game-menu structure (slanted list, description box, HUD crumb, scenes).
- `billpwchan/neon-zenith` and `connect-world-1985-ai/2026-10-20-city3d-demo`: districts with their own identity, merged chunks, instancing, quality tiers.

## Revision (2026-11-01): one stop per card, hung in the city

Owner feedback after the first journey: the objects that spin and float are not needed; the cars are too small and the train too plain; the scroll felt stuck;
each card should already appear in a part of the city, and each scroll scene should leave the camera on it.

- **Stops.** Ten stops, one per card (arrival, eight projects, terminal); six districts group them (the menu lists districts, `j`/`k` step stops, the active
  district lists its projects). `src/content/districts.ts` holds both.
- **Cards hang in the city.** Each stop has a billboard in its part of the avenue (right side, ahead of the stop). The scene projects the billboard to the screen
  and writes `--x`, `--y`, `--s`, `--o` on the card, so the card grows out of the city as the camera comes and drifts behind it. Only the card at the camera's stop
  is interactive (`data-near`); the others are previews (`inert`). Without the scene (no WebGL, portrait, simple, narrow) the cards are plain sections in order.
- **Nothing spins or floats.** The project symbols, the burst effect, the lean of the panels and the lighthouse beam are gone.
- **Scroll.** No inner scrolling panels (they captured the wheel), no sticky elements, shorter rest at a stop (12 %), faster follow, pixel ratio capped at 1.25;
  the JavaScript cost per frame is published as `canvas[data-cpu-ms]` (0.7 ms measured while scrolling in Edge). GPU cost on a real phone is still unmeasured.
- **Vehicles.** Truck 9, car 7.4, moto 5.2 units (they were 3.8 and 3.4); two trains of five cars with bogies, wheels, window band, doors, air-conditioning and cabs.
- **Models.** The Kenney Train Kit (CC0, downloaded by the owner) supplies the metro cars: `train-electric-subway-a/b/c`, with the palette baked into vertex roles so the
  tokens colour them. The procedural train stays as the fallback.
