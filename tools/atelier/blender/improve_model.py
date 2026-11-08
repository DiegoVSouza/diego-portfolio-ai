"""Clean a model for the city scene: one repeatable Blender headless pass from a pack file to a site-ready GLB.

Run:  blender --background --python tools/atelier/blender/improve_model.py -- <in.fbx|in.gltf|in.glb> <out.glb> [options]

Options
  --planar DEG      dissolve coplanar faces first (angle limit in degrees; keeps flat buildings intact)
  --budget N        decimate (collapse) until the model has at most N triangles (default: no decimation)
  --height H        scale so the model is H units tall (default: keep the pack's scale)
  --rotate-y DEG    spin around the vertical axis before export, to make the model face +Z (default 0)
  --keep-textures   export textures (default: no images; the site CSP has no blob: img-src, see docs/atelier/PLAYBOOK.md)
  --origin MODE     base (default): origin at the footprint centre on the ground; none: leave it

What it does, in order: import, drop non-mesh objects, apply transforms, weld duplicate vertices, recalculate normals outward,
join meshes by material, decimate to the budget, scale, place the origin, export glTF Y-up. It prints one JSON line with the
before/after triangle counts and size so the caller can record it.

The cleanup recipe (weld, normals, decimate, origin at the base, axis conversion) follows the survive project's pipeline
(tools/art/*.py and docs/art/INTEGRACAO_RUNTIME.md); the axis rules are re-proved by axis_proof.py.
"""
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(argv) < 2:
    raise SystemExit("usage: improve_model.py -- <in> <out.glb> [--budget N] [--height H] [--rotate-y DEG] [--keep-textures] [--origin base|none]")
source, target = Path(argv[0]).resolve(), Path(argv[1]).resolve()


def option(name, default=None, cast=float):
    if name in argv:
        return cast(argv[argv.index(name) + 1])
    return default


budget = option("--budget", None, int)
height = option("--height")
rotate = option("--rotate-y", 0.0)
keep_textures = "--keep-textures" in argv
origin_mode = option("--origin", "base", str)

bpy.ops.wm.read_factory_settings(use_empty=True)
ext = source.suffix.lower()
if ext in (".glb", ".gltf"):
    bpy.ops.import_scene.gltf(filepath=str(source))
elif ext == ".fbx":
    # Blender 5 moved the FBX importer; keep both names working.
    (bpy.ops.wm.fbx_import if hasattr(bpy.ops.wm, "fbx_import") else bpy.ops.import_scene.fbx)(filepath=str(source))
elif ext == ".obj":
    bpy.ops.wm.obj_import(filepath=str(source))
else:
    raise SystemExit(f"unsupported input: {ext}")


def triangles(objs):
    total = 0
    for o in objs:
        me = o.data
        me.calc_loop_triangles()
        total += len(me.loop_triangles)
    return total


def world_bounds(objs):
    lo, hi = Vector((1e9, 1e9, 1e9)), Vector((-1e9, -1e9, -1e9))
    for o in objs:
        for corner in o.bound_box:
            p = o.matrix_world @ Vector(corner)
            lo = Vector(map(min, lo, p))
            hi = Vector(map(max, hi, p))
    return lo, hi


# Keep meshes only; unparent them so the transforms can be applied.
for o in [o for o in bpy.data.objects if o.type != "MESH"]:
    bpy.data.objects.remove(o, do_unlink=True)
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
if not meshes:
    raise SystemExit("no mesh objects in the input")
for o in meshes:
    mw = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = mw
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

before = {"triangles": triangles(meshes), "size": [round(v, 4) for v in (world_bounds(meshes)[1] - world_bounds(meshes)[0])]}

# Weld duplicate vertices, make normals face outward.
for o in meshes:
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()

# One object per material keeps draw calls low and the export simple.
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
meshes = [o for o in bpy.data.objects if o.type == "MESH"]

planar = option("--planar", None)
if planar:
    # Flat architecture keeps its shape under a planar dissolve (coplanar faces merge, nothing else moves); collapse below does not.
    for o in meshes:
        mod = o.modifiers.new("atelier-planar", "DECIMATE")
        mod.decimate_type = "DISSOLVE"
        mod.angle_limit = math.radians(planar)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=mod.name)

if budget:
    now = triangles(meshes)
    if now > budget:
        for o in meshes:
            mod = o.modifiers.new("atelier-decimate", "DECIMATE")
            mod.ratio = max(0.02, budget / now)
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.modifier_apply(modifier=mod.name)

if rotate:
    for o in meshes:
        o.rotation_euler[2] += math.radians(rotate)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

if height:
    lo, hi = world_bounds(meshes)
    factor = height / max(hi.z - lo.z, 1e-9)
    for o in meshes:
        o.scale *= factor
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)

if origin_mode == "base":
    lo, hi = world_bounds(meshes)
    shift = Vector(((lo.x + hi.x) / -2, (lo.y + hi.y) / -2, -lo.z))
    for o in meshes:
        o.location += shift
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

lo, hi = world_bounds(meshes)
after = {"triangles": triangles(meshes), "size": [round(v, 4) for v in (hi - lo)]}
target.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(target),
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    export_image_format="AUTO" if keep_textures else "NONE",
    export_animations=False,
)
print("ATELIER_IMPROVE " + json.dumps({"in": source.name, "out": target.name, "before": before, "after": after, "blender": bpy.app.version_string}))
