import bpy, sys, math
from mathutils import Vector
src, out = sys.argv[sys.argv.index("--")+1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
objs=[o for o in bpy.context.scene.objects if o.type=="MESH"]
pts=[o.matrix_world@Vector(c) for o in objs for c in o.bound_box]
lo=Vector((min(p.x for p in pts),min(p.y for p in pts),min(p.z for p in pts))); hi=Vector((max(p.x for p in pts),max(p.y for p in pts),max(p.z for p in pts)))
c=(lo+hi)/2; r=max((hi-lo).x,(hi-lo).y,(hi-lo).z)
cam=bpy.data.objects.new("c",bpy.data.cameras.new("c")); bpy.context.scene.collection.objects.link(cam); bpy.context.scene.camera=cam
d=Vector((1.2,-1.6,0.9)).normalized()*r*2.2; cam.location=c+d
cam.rotation_euler=(c-cam.location).to_track_quat("-Z","Y").to_euler()
s=bpy.context.scene; s.render.engine="BLENDER_WORKBENCH"; s.render.resolution_x=900; s.render.resolution_y=700
s.display.shading.light="STUDIO"; s.display.shading.color_type="VERTEX"; s.display.shading.show_backface_culling=False
s.render.filepath=out; bpy.ops.render.render(write_still=True)
