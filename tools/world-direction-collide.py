"""Phase 016: oriented-box overlap analysis from world-static.json and world-moving.json. Writes COLLISIONS.md.
Method: each solid is a convex footprint on XZ (hull of the 8 transformed box corners) plus a Y interval; two solids overlap when the
footprints intersect (separating-axis test) and the Y intervals overlap by more than EPS. Imported landmarks are approximate (circle-sized box)."""
import json, math, itertools
from pathlib import Path
out = Path('artifacts/evidence/world-direction-016')
S = json.loads((out / 'world-static.json').read_text(encoding='utf8'))
M = json.loads((out / 'world-moving.json').read_text(encoding='utf8'))
EPS = 0.05

def hull(pts):
    pts = sorted(set(pts))
    if len(pts) < 3: return pts
    cross = lambda o, a, b: (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]

def sat_depth(a, b):
    """Smallest penetration over all edge normals; <= 0 means separated."""
    best = math.inf
    for poly in (a, b):
        for i in range(len(poly)):
            x1, y1 = poly[i]; x2, y2 = poly[(i+1) % len(poly)]
            nx, ny = y1 - y2, x2 - x1
            n = math.hypot(nx, ny)
            if n < 1e-9: continue
            nx, ny = nx/n, ny/n
            pa = [p[0]*nx + p[1]*ny for p in a]; pb = [p[0]*nx + p[1]*ny for p in b]
            ov = min(max(pa), max(pb)) - max(min(pa), min(pb))
            if ov <= 0: return 0.0
            best = min(best, ov)
    return best

def corners_of(local, m):
    mn, mx = local['min'], local['max']
    res = []
    for x in (mn[0], mx[0]):
        for y in (mn[1], mx[1]):
            for z in (mn[2], mx[2]):
                # three.js matrices are column-major
                res.append((m[0]*x+m[4]*y+m[8]*z+m[12], m[1]*x+m[5]*y+m[9]*z+m[13], m[2]*x+m[6]*y+m[10]*z+m[14]))
    return res

def solid_from_corners(name, cs, approx=False):
    return {'name': name, 'poly': hull([(c[0], c[2]) for c in cs]), 'y0': min(c[1] for c in cs), 'y1': max(c[1] for c in cs), 'approx': approx}

def solid_from_box(b):
    c, s = math.cos(b['ry']), math.sin(b['ry'])
    pts = []
    for dx in (-b['w']/2, b['w']/2):
        for dz in (-b['d']/2, b['d']/2):
            # rotateY(ry): x' = x cos + z sin ; z' = -x sin + z cos
            pts.append((b['x'] + dx*c + dz*s, b['z'] - dx*s + dz*c))
    return {'name': b['kind'], 'poly': hull(pts), 'y0': b['y0'], 'y1': b['y1'], 'approx': bool(b.get('approx'))}

def overlap(a, b):
    y = min(a['y1'], b['y1']) - max(a['y0'], b['y0'])
    if y <= EPS: return None
    d = sat_depth(a['poly'], b['poly'])
    return (d, y) if d > EPS else None

statics = [solid_from_box(b) for b in S['boxes']]
lines = ['# Collision candidates (phase 016)', '', 'Method: oriented footprint (separating-axis test on XZ) plus Y-interval overlap, EPS 0.05. Solids = generated towers, board buildings, viaduct deck/pillars (exact boxes recorded by the scene), imported landmarks (approximate: a square sized from the reserved circle), and the instanced moving objects (exact oriented bounds from the model bounding boxes; wheels and body details are inside those boxes). Candidates are listed; each one needs the reading below before it is called confirmed.', '',
         f'Statics: {len(statics)} solids ({sum(1 for s in statics if s["approx"])} approximate).', '']

# 1. static vs static
cands = []
for i, a in enumerate(statics):
    for b in statics[i+1:]:
        r = overlap(a, b)
        if r: cands.append((a['name'], b['name'], r))
by = {}
for a, b, (d, y) in cands:
    key = tuple(sorted((a.split('-')[0] + ('-' + a.split('-')[1] if a.startswith(('viaduct', 'generated', 'board')) else ''), b.split('-')[0] + ('-' + b.split('-')[1] if b.startswith(('viaduct', 'generated', 'board')) else ''))))
    by.setdefault(key, []).append((d, y))
lines += ['## Static vs static', '', f'{len(cands)} overlapping pairs.', '']
for k, v in sorted(by.items(), key=lambda kv: -len(kv[1])):
    lines.append(f'- {k[0]} x {k[1]}: {len(v)} pair(s), deepest footprint penetration {max(d for d, _ in v):.2f}, overlap height up to {max(y for _, y in v):.2f}')
nonapprox = [(a, b, r) for a, b, r in cands if not any(s['approx'] and s['name'] in (a, b) for s in statics)]
lines += ['', f'Pairs where neither solid is approximate: {len(nonapprox)}.', '']

# 2. moving
def moving_solids(sample):
    items = []
    for o in sample['moving']:
        for i, m in enumerate(o['matrices']):
            items.append(solid_from_corners(f"{o['name']}#{i}", corners_of(o['local'], m)))
    return items
dyn = {}
floor = {}
for si, sample in enumerate(M['samples']):
    ms = moving_solids(sample)
    for a in ms:
        kind = a['name'].split('#')[0]
        f = floor.setdefault(kind, [math.inf, -math.inf])
        f[0] = min(f[0], a['y0']); f[1] = max(f[1], a['y0'])
    for a, b in itertools.combinations(ms, 2):
        ka, kb = a['name'].split('#')[0], b['name'].split('#')[0]
        if ka.startswith('wheels-') or kb.startswith('wheels-'):
            continue  # wheels sit inside the body box by construction
        r = overlap(a, b)
        if r: dyn.setdefault(('moving', ka, kb), []).append((si, a['name'], b['name'], *r))
    for a in ms:
        for s in statics:
            r = overlap(a, s)
            if r: dyn.setdefault(('static', a['name'].split('#')[0], s['name']), []).append((si, a['name'], s['name'], *r))
lines += ['## Moving vs moving, and moving vs static (30 snapshots, 2.1 s apart)', '']
if not dyn: lines.append('- none found in the snapshots')
for k, v in sorted(dyn.items(), key=lambda kv: -len(kv[1])):
    deepest = max(v, key=lambda x: x[3])
    lines.append(f'- {k[1]} x {k[2]}: {len(v)} case(s) in {len({x[0] for x in v})} snapshot(s); deepest {deepest[3]:.2f} (footprint), overlap height {deepest[4]:.2f}; e.g. {deepest[1]} / {deepest[2]} at snapshot {deepest[0]}')
lines += ['', '## Contact with the ground / deck (lowest point of each moving kind, over all snapshots)', '', '| kind | lowest y (min) | lowest y (max) |', '|---|---:|---:|']
for k, (lo, hi) in sorted(floor.items()):
    lines.append(f'| {k} | {lo:.2f} | {hi:.2f} |')
lines += ['', 'Expected: cars near y = 0.0..0.1 (road at 0.03), trains near y = 14.35 (deck top 14.0, trains lifted 0.35 for the Kenney model).', '']
(out / 'COLLISIONS.md').write_text('\n'.join(lines), encoding='utf8')
print('\n'.join(lines))
