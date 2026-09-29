import bpy,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];A=ROOT/'public/assets';R=ROOT/'renders'
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=True
s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
w=s.world.node_tree.nodes.get('Background');env=s.world.node_tree.nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(A/'royal-studio.exr'));s.world.node_tree.links.new(env.outputs[0],w.inputs[0]);w.inputs[1].default_value=.45
m=bpy.data.materials.new('Crocus violet veined tissue');m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');p.inputs['Roughness'].default_value=.55
tc=n.new('ShaderNodeTexCoord');wave=n.new('ShaderNodeTexWave');wave.bands_direction='X';wave.inputs['Scale'].default_value=2.1;wave.inputs['Distortion'].default_value=1.4;wave.inputs['Detail Scale'].default_value=1.3;l.new(tc.outputs['UV'],wave.inputs['Vector'])
r=n.new('ShaderNodeValToRGB');r.color_ramp.elements[0].color=(.19,.052,.31,1);r.color_ramp.elements[1].color=(.29,.105,.42,1);l.new(wave.outputs['Color'],r.inputs[0]);l.new(r.outputs[0],p.inputs['Base Color'])
b=n.new('ShaderNodeBump');b.inputs['Strength'].default_value=.035;b.inputs['Distance'].default_value=.002;l.new(wave.outputs[0],b.inputs['Height']);l.new(b.outputs[0],p.inputs['Normal'])
petals=[]
for k in range(6):
    verts=[];faces=[];rows=40;cols=20;angle=k*math.tau/6+.16
    for j in range(rows+1):
        t=j/rows;width=.37*math.sin(math.pi*t)**.72+.008
        radius=.05+1.10*t;z=-.72+2.5*t-1.0*t**3
        for i in range(cols+1):
            u=i/cols*2-1
            across=u*width
            zz=z+.19*u*u*math.sin(math.pi*t)+.022*math.sin(u*9+t*17)*math.sin(math.pi*t)
            rr=radius-.055*u*u
            verts.append((rr*math.cos(angle)-across*math.sin(angle),rr*math.sin(angle)+across*math.cos(angle),zz+(k%2)*.08))
            if j and i:
                a=j*(cols+1)+i;faces.append((a-cols-2,a-cols-1,a,a-1))
    mesh=bpy.data.meshes.new('Tepal mesh');mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new('Tepal '+str(k+1),mesh);s.collection.objects.link(o);mesh.materials.append(m)
    uv=mesh.uv_layers.new()
    for poly in mesh.polygons:
        poly.use_smooth=True
        for li in poly.loop_indices:
            idx=mesh.loops[li].vertex_index;uv.data[li].uv=(idx%(cols+1)/cols,idx//(cols+1)/rows)
    solid=o.modifiers.new('Thin petal tissue','SOLIDIFY');solid.thickness=.008
    petals.append(o)
# Bake surface color and normal from Blender's material.
ob=petals[0];bpy.context.view_layer.objects.active=ob;ob.select_set(True)
active=n.new('ShaderNodeTexImage');maps={}
s.render.bake.use_pass_direct=False;s.render.bake.use_pass_indirect=False;s.render.bake.use_pass_color=True;s.render.bake.margin=8
for kind in ['color','normal']:
    im=bpy.data.images.new('crocus_'+kind,width=512,height=1024,alpha=False);im.colorspace_settings.name='sRGB' if kind=='color' else 'Non-Color';active.image=im;n.active=active
    bpy.ops.object.bake(type='DIFFUSE' if kind=='color' else 'NORMAL')
    im.filepath_raw=str(A/'materials'/('crocus-'+kind+'.png'));im.file_format='PNG';im.save();maps[kind]=im
m2=bpy.data.materials.new('Crocus | baked violet veins');m2.use_nodes=True;n=m2.node_tree.nodes;l=m2.node_tree.links;p=n.get('Principled BSDF');p.inputs['Roughness'].default_value=.65;p.inputs['Subsurface Weight'].default_value=.07
for kind,im in maps.items():
    t=n.new('ShaderNodeTexImage');t.image=im
    if kind=='color':l.new(t.outputs['Color'],p.inputs['Base Color'])
    else:
        nm=n.new('ShaderNodeNormalMap');l.new(t.outputs['Color'],nm.inputs[1]);l.new(nm.outputs[0],p.inputs['Normal'])
for o in petals:o.data.materials.clear();o.data.materials.append(m2)
def material(name,color):
    mm=bpy.data.materials.new(name);mm.use_nodes=True;pp=mm.node_tree.nodes.get('Principled BSDF');pp.inputs['Base Color'].default_value=(*color,1);pp.inputs['Roughness'].default_value=.62;return mm
red=material('Fresh crimson stigma',(.38,.006,.003));yellow=material('Golden pollen anther',(.70,.32,.008));pale=material('Pale style',(.47,.25,.06))
def curve(name,points,radius,mat):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=18;c.bevel_depth=radius;c.bevel_resolution=3
    sp=c.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
    for b,co in zip(sp.bezier_points,points):b.co=co;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);s.collection.objects.link(o);c.materials.append(mat);return o
curve('Style',[(0,0,-.7),(0,0,-.15),(0,0,.2)],.027,pale)
for k in range(3):
    a=k*math.tau/3+.25;cx=math.cos(a);cy=math.sin(a)
    curve('Stigma '+str(k),[(0,0,.10),(.18*cx,.18*cy,.55),(.48*cx,.48*cy,.87),(.69*cx,.69*cy,.72)],.025,red)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=(.69*cx,.69*cy,.72));o=bpy.context.object;o.name='Stigma flared lip';o.scale=(.044,.035,.060);o.data.materials.append(red)
    a+=.6;cx=math.cos(a);cy=math.sin(a)
    curve('Filament '+str(k),[(.12*cx,.12*cy,-.52),(.25*cx,.25*cy,.08),(.27*cx,.27*cy,.4)],.021,pale)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=(.27*cx,.27*cy,.46));o=bpy.context.object;o.name='Pollen anther '+str(k);o.scale=(.065,.055,.23);o.data.materials.append(yellow)
    for poly in o.data.polygons:poly.use_smooth=True
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.convert(target='MESH')
bpy.ops.export_scene.gltf(filepath=str(A/'crocus-v2.glb'),export_format='GLB',export_apply=True,export_yup=True)
bpy.ops.object.camera_add(location=(3,-6,4));s.camera=bpy.context.object;s.camera.data.type='ORTHO';s.camera.data.ortho_scale=3.5;s.camera.rotation_euler=(Vector((0,0,.10))-s.camera.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='AREA',location=(-3,-4,6));o=bpy.context.object;o.data.energy=250;o.data.shape='DISK';o.data.size=4;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
s.render.resolution_x=1200;s.render.resolution_y=1200;s.render.resolution_percentage=100;s.render.film_transparent=True;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.filepath=str(R/'crocus-reference.png');s.cycles.samples=48
bpy.ops.render.render(write_still=True)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'asset-source/crocus.blend'))
print('FLOWER_AND_REFERENCE_COMPLETE')

