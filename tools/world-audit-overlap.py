import json
from pathlib import Path

root = Path('artifacts/evidence/world-audit-015')
lines = []


def corners(obj, bound):
    lo, hi, m = obj['localBounds']['min'], obj['localBounds']['max'], bound['matrix']
    return [(m[0] * x + m[8] * z + m[12], m[2] * x + m[10] * z + m[14])
            for x, z in [(lo[0], lo[2]), (hi[0], lo[2]), (hi[0], hi[2]), (lo[0], hi[2])]]


def intersects(a, ab, b, bb):
    if not (ab['min'][1] < bb['max'][1] and bb['min'][1] < ab['max'][1]):
        return False
    pa, pb = corners(a, ab), corners(b, bb)
    for points in (pa, pb):
        for i in (0, 1):
            dx, dz = points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]
            axis = (-dz, dx)
            aa = [x * axis[0] + z * axis[1] for x, z in pa]
            ba = [x * axis[0] + z * axis[1] for x, z in pb]
            if max(aa) <= min(ba) or max(ba) <= min(aa):
                return False
    return True


for k in range(10):
    data = json.loads((root / f'world-{k}.json').read_text(encoding='utf8'))
    for label, names in [('traffic', ('fleet-',)), ('trains', ('metro-head', 'metro-middle', 'metro-tail'))]:
        entries = [(f"{o['name']}[{i}]", o, b) for o in data['objects'] if o['name'].startswith(names) for i, b in enumerate(o['bounds'])]
        overlaps = []
        for i, (an, ao, a) in enumerate(entries):
            for bn, bo, b in entries[i+1:]:
                if intersects(ao, a, bo, b):
                    overlaps.append((an, bn))
        line = f'stop {k}: {label}, {len(entries)} instances, {len(overlaps)} oriented box intersections {overlaps}'
        print(line)
        lines.append(line)
(root / 'overlap-check.txt').write_text('\n'.join(lines) + '\n', encoding='utf8')
