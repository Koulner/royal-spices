"""Refine only the macro mesh, preserving the common jar reconstruction."""
import bpy, math, random, pathlib
from mathutils import Vector
root=pathlib.Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root/'asset-source'/'royal-spices.blend'))
old=bpy.data.objects.get('Hero Stigma')
if old: bpy.data.objects.remove(old,do_unlink=True)
rng=random.Random(905); points=[]; segments=260; sides=12
for j in range(segments+1):
    t=j/segments
    points.append(Vector((4.5*(t-.5),.55*math.sin(t*4.2+.7)*t+.09*math.sin(t*31+.4)*math.sin(t*math.pi)+.024*math.sin(t*91),.30*math.sin(t*5.1)+.045*math.sin(t*36.7))))
verts=[]; faces=[]; colors=[]
for j,p in enumerate(points):
    t=j/segments; tangent=(points[min(segments,j+1)]-points[max(0,j-1)]).normalized(); n=tangent.cross(Vector((0,0,1))).normalized(); b=tangent.cross(n).normalized()
    radius=.031*(.17+.68*t+2.9*t**13)*(1+.17*math.sin(t*112)+.1*math.sin(t*227))
    for k in range(sides):
        angle=k*math.tau/sides; ridge=1+.18*math.cos(k*math.pi)+.08*math.sin(t*173+k)
        edge=t**30*.026*math.sin(k*7.1)
        q=p+n*math.cos(angle)*radius*ridge+b*math.sin(angle)*radius*(.50-.27*t)+tangent*edge
        verts.append(tuple(q)); shade=.72+.16*math.sin(t*56+k*.31)+rng.uniform(-.05,.08);colors.append((shade,shade*.75,shade*.65,1))
    if j:
        for k in range(sides): faces.append(((j-1)*sides+k,(j-1)*sides+(k+1)%sides,j*sides+(k+1)%sides,j*sides+k))
mesh=bpy.data.meshes.new('Ridged dry saffron stigma');mesh.from_pydata(verts,[],faces);mesh.update()
ob=bpy.data.objects.new('Hero Stigma',mesh);bpy.context.collection.objects.link(ob)
col=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
for i,c in enumerate(colors): col.data[i].color=c
mat=bpy.data.materials.get('Saffron 1').copy(); mat.name='Macro saffron with vertex variation';mesh.materials.append(mat)
attribute=mat.node_tree.nodes.new('ShaderNodeVertexColor');attribute.layer_name='Color'
mat.node_tree.links.new(attribute.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
for p in mesh.polygons:p.use_smooth=True
bpy.ops.object.select_all(action='DESELECT');ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(root/'public'/'assets'/'saffron-thread.glb'),export_format='GLB',use_selection=True,export_yup=True)
ob.hide_render=True;ob.hide_set(True)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(root/'asset-source'/'royal-spices.blend'))
print('Macro mesh refined; Blender textures packed')
