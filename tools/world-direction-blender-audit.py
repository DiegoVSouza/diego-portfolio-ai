"""Phase 016 follow-up: mesh-level overlap audit of the whole scene, run inside Blender (MCP execute_code).

Reads the world-space triangles dumped by tools/world-direction-triangles.cjs, builds one BVH tree per mesh and reports every pair of
different meshes whose triangles intersect: how many triangle pairs, where (median point), and the vertical span. Imports nothing into the
Blender scene. Merged district meshes are one object each, so overlaps *inside* one of them are not seen here.
"""
import json, os, statistics
from mathutils import Vector
from mathutils.bvhtree import BVHTree

DIR = r"C:/estudo/Golpe/lab/projects/p07/artifacts/evidence/world-direction-016/triangles/"
index = json.load(open(DIR + "index.json"))
trees, boxes = {}, {}
for m in index:
    d = json.load(open(DIR + f"{m['id']}.json"))
    p = d["positions"]
    verts = [(p[i], p[i + 1], p[i + 2]) for i in range(0, len(p), 3)]
    if d["index"]:
        idx = d["index"]
        tris = [(idx[i], idx[i + 1], idx[i + 2]) for i in range(0, len(idx), 3)]
    else:
        tris = [(i, i + 1, i + 2) for i in range(0, len(verts), 3)]
    tris = [t for t in tris if t[0] != t[1] and t[1] != t[2] and t[0] != t[2]]
    if not tris:
        continue
    trees[m["id"]] = (BVHTree.FromPolygons(verts, tris), verts, tris)
    boxes[m["id"]] = tuple((min(v[a] for v in verts), max(v[a] for v in verts)) for a in range(3))

names = {m["id"]: (m["name"] if m["name"] != "unnamed" else f"unnamed#{m['id']}") for m in index}
ids = sorted(trees)
result = []
for ai, a in enumerate(ids):
    for b in ids[ai + 1:]:
        A, B = boxes[a], boxes[b]
        if any(A[k][1] < B[k][0] or B[k][1] < A[k][0] for k in range(3)):
            continue
        pairs = trees[a][0].overlap(trees[b][0])
        if not pairs:
            continue
        pts = []
        for ta, tb in pairs:
            va = [Vector(trees[a][1][i]) for i in trees[a][2][ta]]
            pts.append(sum(va, Vector()) / 3)
        xs = sorted(p.x for p in pts); ys = sorted(p.y for p in pts); zs = sorted(p.z for p in pts)
        mid = lambda s: s[len(s) // 2]
        result.append(dict(a=names[a], b=names[b], a_id=a, b_id=b, pairs=len(pairs), at=[round(mid(xs), 1), round(mid(ys), 1), round(mid(zs), 1)],
                           y=[round(ys[0], 1), round(ys[-1], 1)]))
result.sort(key=lambda r: -r["pairs"])
open(DIR + "overlaps.json", "w").write(json.dumps(result))
print("RESULT" + json.dumps(dict(meshes=len(trees), overlapping_mesh_pairs=len(result), top=result[:60])))
