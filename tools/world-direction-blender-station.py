"""Phase 016 follow-up: mesh-level test of the metro station against the train cars, run inside Blender (MCP execute_code).

Re-creates the transforms of src/scene/world.ts in glTF space (Y up): station scaled 1.15, centred 12 on x, yawed -90 degrees to lie along
the track; each car centred on x/z, standing on y = 0, scaled 5.2, on a lane at +-3.7 beside the station axis, 0.25 higher than the station.
Slides every car along the track and counts triangle-triangle overlap with BVH trees. Leaves the scene as it found it.
"""
import json, math
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = r"C:/estudo/Golpe/lab/projects/p07/assets/game/models/"
KEEP = set(o.name for o in bpy.data.objects)


def load(name):
    before = set(o.name for o in bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=ROOT + name)
    new = [o for o in bpy.data.objects if o.name not in before]
    verts, tris = [], []
    for o in new:
        if o.type != "MESH":
            continue
        me = o.data
        base = len(verts)
        for v in me.vertices:
            w = o.matrix_world @ v.co
            verts.append((w.x, w.z, -w.y))  # Blender Z-up to glTF Y-up
        me.calc_loop_triangles()
        for t in me.loop_triangles:
            tris.append(tuple(base + i for i in t.vertices))
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
    return verts, tris


def tree(verts, tris, f):
    return BVHTree.FromPolygons([f(v) for v in verts], tris)


st_v, st_t = load("metro-station.glb")
xs = [v[0] for v in st_v]; ys = [v[1] for v in st_v]; zs = [v[2] for v in st_v]
station_box = dict(x=(min(xs), max(xs)), y=(min(ys), max(ys)), z=(min(zs), max(zs)), tris=len(st_t))


def station_xf(v):
    x, y, z = (v[0] - 12) * 1.15, v[1] * 1.15, v[2] * 1.15
    return Vector((-z, y + 14.1, x))  # yaw -90: x' = -z, z' = x


st_tree = tree(st_v, st_t, station_xf)
st_world = [station_xf(v) for v in st_v]
out = {"station_local_box": station_box,
       "station_world_box": dict(x=(min(v.x for v in st_world), max(v.x for v in st_world)), y=(min(v.y for v in st_world), max(v.y for v in st_world)),
                                 z=(min(v.z for v in st_world), max(v.z for v in st_world))), "cars": {}}
for name in ("train-subway-a.glb", "train-subway-b.glb", "train-subway-c.glb"):
    cv, ct = load(name)
    cx = (min(v[0] for v in cv) + max(v[0] for v in cv)) / 2
    cz = (min(v[2] for v in cv) + max(v[2] for v in cv)) / 2
    cy = min(v[1] for v in cv)
    box = None
    hits = []
    for lane in (-3.7, 3.7):
        count, first, deepest = 0, None, 0
        for k in range(-200, 201):
            dz = k * 0.5
            f = lambda v, lane=lane, dz=dz: Vector(((v[0] - cx) * 5.2 + lane, (v[1] - cy) * 5.2 + 14.35, (v[2] - cz) * 5.2 + dz))
            pairs = st_tree.overlap(tree(cv, ct, f))
            if pairs:
                count += 1
                first = dz if first is None else first
                deepest = max(deepest, len(pairs))
        w = [Vector(((v[0] - cx) * 5.2, (v[1] - cy) * 5.2, (v[2] - cz) * 5.2)) for v in cv]
        box = dict(x=(min(p.x for p in w), max(p.x for p in w)), y=(min(p.y for p in w), max(p.y for p in w)), z=(min(p.z for p in w), max(p.z for p in w)))
        hits.append(dict(lane=lane, overlapping_positions=count, of=401, first_dz=first, max_triangle_pairs=deepest))
    out["cars"][name] = dict(local_box_scaled=box, lanes=hits)
extra = [o.name for o in bpy.data.objects if o.name not in KEEP]
out["leftover_objects"] = extra
print("RESULT" + json.dumps(out))
