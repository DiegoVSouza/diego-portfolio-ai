"""Prove the Blender to glTF axis mapping by exporting empties and reading the nodes back from the exported GLB.

Adapted from the sibling project `survive` (tools/art/blender-axis-proof.py, 2026-11-06); reused here because every model
and every camera authored in Blender depends on this mapping, and it is cheap to re-prove after a Blender update.

Run:  blender --background --python tools/atelier/blender/axis_proof.py -- <output dir>
Mapping proved: Blender (x, y, z) -> glTF/world (x, z, -y); Blender +Z is up, Blender -Y is the camera side, front +Y -> world -Z.
"""
import json
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
out = Path(argv[0] if argv else "artifacts/evidence/atelier/axis-proof").resolve()
out.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
points = {"origin": (0, 0, 0), "up": (0, 0, 1), "front": (0, 1, 0), "right": (1, 0, 0), "probe": (0.3, -0.7, 1.9)}
for name, pos in points.items():
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = pos
bpy.ops.wm.save_as_mainfile(filepath=str(out / "axis-proof.blend"))
bpy.ops.export_scene.gltf(filepath=str(out / "axis-proof.glb"), export_format="GLB", export_yup=True)

# Read the real exported nodes, not a formula.
raw = (out / "axis-proof.glb").read_bytes()
size, _kind = struct.unpack_from("<II", raw, 12)
gltf = json.loads(raw[20 : 20 + size])
actual = {n["name"]: n.get("translation", [0, 0, 0]) for n in gltf["nodes"]}
expected = {name: [p[0], p[2], -p[1]] for name, p in points.items()}
for name, target in expected.items():
    assert (Vector(actual[name]) - Vector(target)).length < 1e-5, (name, actual[name], target)
(out / "result.json").write_text(
    json.dumps(
        {"passed": True, "blenderVersion": bpy.app.version_string, "mapping": "(x,y,z) Blender -> (x,z,-y) glTF", "nodes": actual, "expected": expected},
        indent=2,
    ),
    encoding="utf-8",
)
print("ATELIER_AXIS_PROOF_PASSED", bpy.app.version_string)
