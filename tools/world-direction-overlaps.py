"""Summarize triangles/overlaps.json (from tools/world-direction-blender-audit.py) by logical object: one board is one object, pairs inside it are ignored."""
import collections, json, sys
D = 'artifacts/evidence/world-direction-016/triangles/'
r = json.load(open(D + 'overlaps.json'))
idx = {m['id']: m for m in json.load(open(D + 'index.json'))}
poses = json.load(open('artifacts/evidence/world-direction-016/world-static.json'))['poses']


def lab(i):
    m = idx[i]
    if m['parent']:
        return m['parent'] + ('(cones)' if 'cones' in m['name'] else '(face)' if 'face' in m['name'] else '')
    return m['name'] if m['name'] != 'unnamed' else f'static#{i}'


def stop(x, z):
    return min(range(len(poses)), key=lambda k: (poses[k]['position'][0] - x) ** 2 + (poses[k]['position'][2] - z) ** 2)


agg = collections.defaultdict(lambda: [0, None])
for o in r:
    a, b = lab(o['a_id']), lab(o['b_id'])
    if a.split('(')[0] == b.split('(')[0]:
        continue
    key = tuple(sorted((a, b)))
    agg[key][0] += o['pairs']
    if agg[key][1] is None or o['pairs'] > agg[key][1][0]:
        agg[key][1] = (o['pairs'], o['at'], stop(o['at'][0], o['at'][2]))
lines = [f"{len(agg)} logical pairs"]
for k, v in sorted(agg.items(), key=lambda kv: -kv[1][0]):
    lines.append(f"{k[0]} x {k[1]}: tri={v[0]} at={v[1][1]} stop~{v[1][2]}")
text = '\n'.join(lines)
open(D + 'OVERLAPS.txt', 'w').write(text)
print(text if len(sys.argv) < 2 else '\n'.join(lines[: int(sys.argv[1])]))
