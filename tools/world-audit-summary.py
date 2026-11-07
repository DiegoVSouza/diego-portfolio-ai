import json
import math
from collections import Counter
from pathlib import Path

out = Path('artifacts/evidence/world-audit-015')
snapshots = [json.loads((out / f'world-{i}.json').read_text(encoding='utf8')) for i in range(10)]
capture = json.loads((out / 'capture.json').read_text(encoding='utf8'))
base = snapshots[0]
fmt = lambda a: ', '.join(f'{v:.2f}' for v in a)
lines = ['# World spatial map', '', 'Coordinates are world-space Three.js units: +Y is up; the avenue progresses approximately toward -Z. Boxes are axis-aligned bounds, not collision meshes. Each JSON snapshot records every scene mesh and each instance at that stop; static district geometry is merged, so its bounds encompass many pieces.', '',
         f"Rail length: {base['railLength']:.2f}; start ({fmt(base['roadStart'])}); end ({fmt(base['roadEnd'])}); camera near/far {base['cameraNear']}/{base['cameraFar']}.", '',
         '## Stops and cards', '', '| Stop | Camera X,Y,Z | Look X,Y,Z | Card corners X,Y,Z (top-left, top-right, bottom-right, bottom-left) |', '|---:|---|---|---|']
for p in base['poses']:
    corners = ' / '.join(f"({fmt(v)})" for v in p['board'])
    lines.append(f"| {p['stop']} | {fmt(p['position'])} | {fmt(p['look'])} | {corners} |")

lines += ['', '## Scene meshes and instance bounds', '', 'The following inventory is from stop 0; named repeated objects list aggregate bounds here. Individual bounds and the other nine samples are in `world-0.json` through `world-9.json`.', '', '| Name | Geometry | Instances | Aggregate min X,Y,Z | Aggregate max X,Y,Z |', '|---|---|---:|---|---|']
for i, obj in enumerate(base['objects']):
    bounds = obj['bounds']
    lo = [min(b['min'][axis] for b in bounds) for axis in range(3)]
    hi = [max(b['max'][axis] for b in bounds) for axis in range(3)]
    lines.append(f"| {obj['name']} #{i} | {obj['geometry']} | {len(bounds)} | {fmt(lo)} | {fmt(hi)} |")

lines += ['', '## Building reservations', '', 'Circles are conservative placement reservations, not mesh outlines. Board buildings are pre-reserved before towers. Height is the intended building height.', '', '| Kind | District | X | Z | Radius | Height |', '|---|---:|---:|---:|---:|---:|']
for f in base['footprints']:
    lines.append(f"| {f['kind']} | {f['district']} | {f['x']:.2f} | {f['z']:.2f} | {f['r']:.2f} | {f['height']:.2f} |")

collisions = []
for i, a in enumerate(base['footprints']):
    for b in base['footprints'][i+1:]:
        gap = math.hypot(a['x'] - b['x'], a['z'] - b['z']) - a['r'] - b['r']
        if gap < -1e-5:
            collisions.append((a['kind'], b['kind'], round(gap, 2)))
lines += ['', '## Reservation overlaps', '', f"Conservative circles: {len(collisions)} overlaps. Counts by pair: {dict(Counter((a,b) for a,b,_ in collisions))}. Board-to-board reservations may overlap because cards and their buildings are anchored before procedural buildings; inspect exact boxes before treating a circle overlap as a physical intersection.", '', '## Road, backdrop and motion', '', '- Avenue surface spans local lateral -8 to +8, sidewalks 8 to 12 on each side. Cross streets span 150 units from the avenue, with a 12-unit carriageway and 3-unit sidewalks.', '- The ground grid is a 1,000-unit-wide plane, from world Z=160 to shoreZ. Harbour water is a 1,000 by 480 plane beyond shoreZ; quay, containers and the district 5 merged geometry contain the lighthouse, cranes and ship. Named objects and their measured bounds are in the inventory above.', '- Two 14-unit-wide viaducts are centred 42 units from the rail, height 14, and extend about 1.2 stops beyond district 3. Each carries two tracks. Procedural and downloaded train parts are listed by name in each snapshot.', '- First-frame camera clipping is near 0.5, far 420. Fog starts at 70 and ends at 300. The visible city can end before its geometry due to fog and clipping.', '- Traffic uses two lanes at lateral ±4, a shared per-lane speed and evenly spaced cyclic positions. Dynamic boxes in each JSON are samples, not a continuous collision proof. S64 wheels intentionally overlap their body.', '- Camera follows a two-spline rail. Automated navigation eases scrolling once; free scrolling uses damping. A small lateral swing and pan remain. Far menu jumps cut directly.', '', '## Capture conditions and limits', '', f"Captured ten stops at 1280×800 with a client-only Vite development mount; snapshots sampled moving objects once per stop. Development capture reported {len(capture['errors'])} page error(s). Production hydration and browser gate must be checked separately.", 'No mesh-level or continuous collision audit is implied by intersecting axis-aligned bounding boxes; animated trains and vehicles move between samples. Human review of the motion and composition is pending.', '']
hits = []
for sample in base['path']:
    x, y, z = sample['position']
    for f in base['footprints']:
        if 0 <= y <= f['height'] and math.hypot(x - f['x'], z - f['z']) < f['r']:
            hits.append((sample['c'], f['kind'], f['district']))
lines += ['## Sampled camera path', '', f"{len(base['path'])} rail positions sampled at 0.05 stop intervals. {len(hits)} position/reservation-circle intersections, which are conservative candidates, not proven mesh collisions. Swing, pointer and shake offsets are not represented. Samples and reservations are in each JSON.", '']
if hits:
    lines += [f'- stop parameter {c:.2f}: {kind}, district {district}' for c, kind, district in hits]
(out / 'WORLD-MAP.md').write_text('\n'.join(lines), encoding='utf8')
print(f"{len(base['objects'])} mesh groups; {len(base['footprints'])} reservations; {len(collisions)} conservative reservation overlaps")
print(f'{len(hits)} camera sample/reservation intersections', hits[:20])
for row in collisions[:20]: print(row)
