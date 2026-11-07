"""Phase 016: region map and annotated captures for docs/world/SURROUNDINGS-PLAN.pt-BR.md.

Uses world-static.json (recorded boxes, camera poses) and the rail formula (stop centres at x = 26 sin(0.85 k), z = -85 k + 26, uniform
Catmull-Rom) for the avenue's centre line: a schematic, not a survey.
"""
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ev = Path('artifacts/evidence/world-direction-016')
S = json.loads((ev / 'world-static.json').read_text(encoding='utf8'))
out = Path('docs/world/img')
out.mkdir(parents=True, exist_ok=True)
INK, PAPER, RED, DRED, GREY = (10, 10, 10), (242, 237, 228), (226, 24, 38), (110, 14, 24), (70, 70, 70)
try:
    F = ImageFont.truetype('arial.ttf', 15)
    FB = ImageFont.truetype('arialbd.ttf', 17)
    FS = ImageFont.truetype('arial.ttf', 12)
except OSError:
    F = FB = FS = ImageFont.load_default()

N = 13
pts = [(26 * math.sin(k * 0.85), -85 * k + 26) for k in range(N + 1)]


def cr(p0, p1, p2, p3, t):
    return tuple(
        0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t ** 2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t ** 3)
        for i in range(2)
    )


line = []
for k in range(N):
    p0 = pts[k - 1] if k else (2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1])
    p3 = pts[k + 2] if k + 2 <= N else (2 * pts[N][0] - pts[N - 1][0], 2 * pts[N][1] - pts[N - 1][1])
    for s in range(24):
        line.append(cr(p0, pts[k], pts[k + 1], p3, s / 24))
line.append(pts[N])


def normal(i):
    a = line[max(0, i - 1)]
    b = line[min(len(line) - 1, i + 1)]
    dx, dz = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dz)
    return (-dz / n, dx / n)


def offset(lat):
    res = []
    for i, p in enumerate(line):
        nx, nz = normal(i)
        res.append((p[0] + nx * lat, p[1] + nz * lat))
    return res


SC = 0.62


def px(x, z):
    return (60 + (x + 420) * SC, 40 + (160 - z) * SC)


W = int(60 + 840 * SC + 330)
H = int(40 + (160 + 1600) * SC + 40)
im = Image.new('RGB', (W, H), INK)
d = ImageDraw.Draw(im)
d.rectangle([*px(-500, 160), *px(500, -1091)], fill=(20, 20, 20), outline=GREY)
d.rectangle([*px(-500, -1091), *px(500, -1571)], fill=(40, 12, 18))
d.text(px(-380, -1300), 'harbour water', fill=DRED, font=F)


def box(b, fill, outline=None):
    c, s = math.cos(b['ry']), math.sin(b['ry'])
    poly = []
    for dx, dz in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        x, z = dx * b['w'] / 2, dz * b['d'] / 2
        poly.append(px(b['x'] + x * c + z * s, b['z'] - x * s + z * c))
    d.polygon(poly, fill=fill, outline=outline)


for b in S['boxes']:
    if b['kind'] == 'skyline-far':
        box(b, (52, 14, 22))
    elif b['kind'] == 'skyline-near':
        box(b, (95, 20, 32))
for b in S['boxes']:
    k = b['kind']
    if k == 'generated-building':
        box(b, (140, 30, 40))
    elif k.startswith('board-building'):
        box(b, RED, PAPER)
    elif k.startswith('landmark'):
        box(b, (180, 60, 70))
    elif k.startswith('viaduct'):
        box(b, PAPER)
for lat, col in ((150, GREY), (-150, GREY), (110, (90, 90, 90)), (-110, (90, 90, 90))):
    d.line([px(*q) for q in offset(lat)], fill=col, width=1)
d.line([px(*q) for q in line], fill=PAPER, width=3)
for k in range(N - 1):
    i = min(len(line) - 1, int((k + 0.62) / N * (len(line) - 1)))
    for lat in (-150, 150):
        nx, nz = normal(i)
        d.line([px(line[i][0], line[i][1]), px(line[i][0] + nx * lat, line[i][1] + nz * lat)], fill=(60, 60, 60), width=1)
for o in S['other']:
    if o['name'] == 'harbour-quay' and o.get('bounds'):
        b = o['bounds'][0]
        (xa, ya), (xb, yb) = px(b['min'][0], b['min'][2]), px(b['max'][0], b['max'][2])
        d.rectangle([min(xa, xb), min(ya, yb), max(xa, xb), max(ya, yb)], fill=(120, 120, 120))
d.line([px(p['position'][0], p['position'][2]) for p in S['path']], fill=(255, 200, 0), width=2)
for p in S['poses']:
    x, z = px(p['position'][0], p['position'][2])
    lx, lz = px(p['look'][0], p['look'][2])
    d.line([x, z, x + (lx - x) * 0.6, z + (lz - z) * 0.6], fill=(255, 200, 0), width=1)
    d.ellipse([x - 7, z - 7, x + 7, z + 7], fill=(255, 200, 0))
    d.text((x - 4, z - 8), str(p['stop']), fill=INK, font=FS)
cx, cz = S['poses'][9]['position'][0], S['poses'][9]['position'][2]
for r, col, label in ((300, (255, 255, 255), 'fog end 300'), (405, (255, 140, 140), 'far-ring fade end 405')):
    x, z = px(cx, cz)
    d.ellipse([x - r * SC, z - r * SC, x + r * SC, z + r * SC], outline=col)
    d.text((x + r * SC * 0.72, z - r * SC * 0.72 - 6), f'stop 9: {label}', fill=col, font=FS)


def tag(x, z, letter, text):
    a, b = px(x, z)
    d.ellipse([a - 11, b - 11, a + 11, b + 11], fill=PAPER)
    d.text((a - 5, b - 9), letter, fill=INK, font=FB)
    d.text((a + 15, b - 8), text, fill=PAPER, font=F)


tag(-405, -120, 'A', 'far ring (new)')
tag(-215, -250, 'B', 'near ring (new)')
tag(-95, -330, 'C', 'town + viaduct')
tag(14, -30, 'D', 'avenue')
tag(190, -620, 'E', 'side streets to 150')
tag(-40, -1180, 'F', 'harbour (not visible)')
tag(0, 150, 'G', 'before stop 0')
tag(400, -700, 'H', 'ground edge x=500')
x = int(60 + 840 * SC + 20)
y = 50
d.text((x, y), 'Regions and range', fill=PAPER, font=FB)
y += 26
for text in [
    'A far ring: lat 318-372, fades 330-405', 'B near ring: lat 172-232, inside fog', 'C town lat 12-100 + metro viaduct lat 42',
    'D avenue (road lat 8, kerb 12)', 'E side streets reach lat 150', 'F harbour: 327 from stop 9, beyond fog',
    'G ground behind the start (z>26)', 'H ground plane edge (x=+-500)', '', 'yellow = camera path, 0-9 = stops',
    'white line = rail centre', 'red = board buildings', 'dim red = tower / ring blocks', 'paper = viaduct decks', '',
    'schematic: centre line rebuilt from', 'the rail formula; boxes are recorded', 'in world-static.json',
]:
    d.text((x, y), text, fill=PAPER, font=F)
    y += 20
im.save(out / 'region-map.png')
print('region-map', im.size)


def pair(a, b, name, title):
    A = Image.open(ev / 'views-2' / a).convert('RGB')
    B = Image.open(ev / 'views-3' / b).convert('RGB')
    w, h = A.size
    canvas = Image.new('RGB', (w * 2 + 30, h + 60), INK)
    c = ImageDraw.Draw(canvas)
    canvas.paste(A, (10, 50))
    canvas.paste(B, (w + 20, 50))
    c.text((10, 12), f'{title}: before (no surroundings)', fill=PAPER, font=FB)
    c.text((w + 20, 12), 'after (near + far silhouette rings)', fill=PAPER, font=FB)
    canvas.resize((canvas.width * 2 // 3, canvas.height * 2 // 3)).save(out / name)
    print(name)


pair('horizon-left.png', 'horizon-left.png', 'horizon-left-before-after.png', 'Horizon left of the avenue (free camera 0,40,-400)')
pair('skyline-wide-aerial.png', 'skyline-wide-aerial.png', 'aerial-before-after.png', 'Aerial (free camera 250,160,-100)')
