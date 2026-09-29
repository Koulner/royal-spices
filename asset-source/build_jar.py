"""Royal Spices reference reconstruction. Blender 4.5, metres are arbitrary studio units.
Run: blender --background --python asset-source/build_jar.py
Sources/proportional assumptions are documented in references/brand-audit.md.
"""
import bpy, math, random, pathlib, sys
from mathutils import Vector
root=pathlib.Path(__file__).resolve().parents[1]; assets=root/'public'/'assets'; renders=root/'renders'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
random.seed(421)
def material(name,color,rough=.4,metal=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    return m,p
glass,p=material('Optical Glass',(0.98,.99,.97),.06); p.inputs['Transmission Weight'].default_value=1; p.inputs['IOR'].default_value=1.46
def texture_mat(name,filename,rough):
    m,p=material(name,(1,1,1),rough); t=m.node_tree.nodes.new('ShaderNodeTexImage'); t.image=bpy.data.images.load(str(assets/filename)); m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
    return m,p,t
cork,p,t=texture_mat('Natural Cork','cork.jpg',.91)
b=micro=cork.node_tree.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value=.38; b.inputs['Distance'].default_value=.035; cork.node_tree.links.new(t.outputs['Color'],b.inputs['Height']); cork.node_tree.links.new(b.outputs['Normal'],p.inputs['Normal'])
label,_,_=texture_mat('Ivory Paper Label','label.png',.74)
seal,_,_=texture_mat('Olive Paper Seal','seal.png',.75)
reds=[]
for idx,c in enumerate([(.25,.007,.006),(.37,.012,.008),(.47,.024,.009),(.2,.005,.006)]):
    m,p=material('Saffron '+str(idx),c,.6); p.inputs['Subsurface Weight'].default_value=.07; reds.append(m)
def rounded_ring(w,d,r,z):
    points=[]
    for cx,cy,a in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]:
        for k in range(16):
            angle=math.radians(a+k*90/16); points.append((cx+r*math.cos(angle),cy+r*math.sin(angle),z))
    return points
def mesh_obj(name,verts,faces,mat):
    me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update(); ob=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(ob); ob.data.materials.append(mat)
    for poly in me.polygons: poly.use_smooth=True
    return ob
profile=[(.015,.015,.007,.04),(2.12,1.4,.18,.04),(2.34,1.6,.23,.09),(2.4,1.66,.25,.18),(2.4,1.66,.25,.28),(2.4,1.66,.25,2.12),(2.39,1.65,.25,2.22),(2.32,1.61,.28,2.30),(2.12,1.54,.41,2.38),(1.75,1.53,.74,2.46),(1.67,1.53,.765,2.54),(1.67,1.53,.765,2.72),(1.76,1.65,.81,2.78),(1.8,1.69,.835,2.83),(1.8,1.69,.835,2.92),(1.73,1.62,.8,2.97),(1.57,1.46,.725,2.97),(1.5,1.39,.69,2.91),(1.5,1.39,.69,2.79),(1.5,1.39,.69,2.55),(1.57,1.4,.69,2.48),(2.06,1.39,.34,2.25),(2.14,1.39,.20,2.13),(2.14,1.39,.20,.32),(2.07,1.32,.18,.24),(.015,.015,.007,.24)]
v=[p for w,d,r,z in profile for p in rounded_ring(w,d,r,z)]; f=[]
for j in range(len(profile)-1):
    for i in range(64): f.append((j*64+i,j*64+(i+1)%64,(j+1)*64+(i+1)%64,(j+1)*64+i))
jar=mesh_obj('Glass Vessel',v,f,glass)
# Smooth boundaries of the flat faces without faceting the glass.
mod=jar.modifiers.new('Soft glass transitions','SUBSURF'); mod.levels=1; mod.render_levels=2
bpy.ops.mesh.primitive_cone_add(vertices=96,radius1=.718,radius2=.765,depth=.60,location=(0,0,3.06)); corkob=bpy.context.object; corkob.name='Cork Closure'; corkob.data.materials.append(cork)
be=corkob.modifiers.new('Cork edge','BEVEL'); be.width=.035; be.segments=3
bpy.context.view_layer.objects.active=corkob; bpy.ops.object.modifier_apply(modifier=be.name)
for poly in corkob.data.polygons: poly.use_smooth=True
# Label is a rounded, single sheet on the broad front face.
outline=rounded_ring(1.76,1.96,.15,0); verts=[(x,-.844,y+1.21) for x,y,z in outline]
labelob=mesh_obj('Front Label',verts,[tuple(range(64))],label)
uv=labelob.data.uv_layers.new(name='UVMap')
for loop in labelob.data.loops:
    x,y,z=verts[loop.vertex_index]; uv.data[loop.index].uv=((x+.88)/1.76,(z-.23)/1.96)
solid=labelob.modifiers.new('Paper edge','SOLIDIFY'); solid.thickness=.008
# The seal follows the glass front, the cork face and the top, then its rear.
path=[(-.85,2.17),(-.85,2.29),(-.83,2.42),(-.80,2.57),(-.82,2.79),(-.85,2.89),(-.78,3.02),(-.773,3.28),(-.76,3.35),(-.70,3.38),(0,3.386),(.70,3.38),(.76,3.35),(.775,3.17),(.76,2.92)]
sv=[]
for y,z in path: sv.extend([(-.30,y,z),(.30,y,z)])
sf=[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(path)-1)]
sealob=mesh_obj('Tamper Seal',sv,sf,seal); uv=sealob.data.uv_layers.new()
for loop in sealob.data.loops:
    idx=loop.vertex_index; row=idx//2; uv.data[loop.index].uv=(idx%2,min(1,max(0,(sv[idx][2]-2.17)/1.23)))
solid=sealob.modifiers.new('Seal paper thickness','SOLIDIFY'); solid.thickness=.012
# Stigmas taper into a ridged, flattened trumpet. Four merged meshes keep draw calls low.
def strand_mesh(seed,length,segments=25,radius=.014):
    rng=random.Random(seed); phase=rng.random()*6.28; bend=rng.uniform(.12,.28); coords=[]
    for j in range(segments+1):
        t=j/segments
        coords.append(Vector((length*(t-.5),length*bend*math.sin(t*4.3+phase)*t+length*.025*math.sin(t*18+phase),length*.10*math.sin(t*5+phase))))
    verts=[]; faces=[]; sides=6
    for j,c in enumerate(coords):
        t=j/segments; tangent=(coords[min(j+1,segments)]-coords[max(j-1,0)]).normalized(); n=tangent.cross(Vector((0,0,1))).normalized(); b=tangent.cross(n).normalized()
        rr=radius*(.35+.55*t+2.5*t**10)*(1+.15*math.sin(t*39+phase))
        for k in range(sides):
            a=k*math.tau/sides; rip=1+.13*math.sin(t*92+k*3)
            p=c+n*(math.cos(a)*rr*rip)+b*(math.sin(a)*rr*(.62 if t>.8 else .85)); verts.append(tuple(p))
        if j:
            for k in range(sides): faces.append(((j-1)*sides+k,(j-1)*sides+(k+1)%sides,j*sides+(k+1)%sides,j*sides+k))
    return verts,faces
buckets=[([],[]) for _ in range(4)]
for i in range(620):
    vv,ff=strand_mesh(i,random.uniform(.20,.56),18,random.uniform(.006,.011)); rot=__import__('mathutils').Euler((random.uniform(-2,2),random.uniform(-2,2),random.uniform(0,math.tau))).to_matrix()
    z=.38+(random.random()**1.3)*1.05
    pos=Vector((random.uniform(-.86,.86),random.uniform(-.48,.48),z))
    transformed=[rot@Vector(p)+pos for p in vv]
    vv=[(max(-1.0,min(1.0,p.x)),max(-.62,min(.62,p.y)),max(.30,p.z)) for p in transformed]
    dest=buckets[i%4]; offset=len(dest[0]); dest[0].extend(vv); dest[1].extend([tuple(a+offset for a in face) for face in ff])
for i,(vv,ff) in enumerate(buckets): mesh_obj('Contained Saffron '+str(i),vv,ff,reds[i])
# Export a common asset used by both offline reference and realtime rendering.
product=[o for o in bpy.context.scene.objects if o.type=='MESH']
for ob in bpy.context.scene.objects: ob.select_set(False)
for ob in product: ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(assets/'royal-jar.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
# Unique macro strand, separately loadable.
for ob in product: ob.select_set(False)
vv,ff=strand_mesh(309,4.5,160,.04); hero=mesh_obj('Hero Stigma',vv,ff,reds[1]); hero.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(assets/'saffron-thread.glb'),export_format='GLB',use_selection=True,export_yup=True)
hero.hide_render=True; hero.hide_set(True)
# Photographic studio.
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=72; scene.cycles.use_denoising=True
scene.cycles.max_bounces=12; scene.cycles.transmission_bounces=8; scene.cycles.transparent_max_bounces=8
scene.render.resolution_x=1400; scene.render.resolution_y=1400; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=True
scene.world.color=(.03,.03,.03)
scene.view_settings.view_transform='AgX'
def area(name,pos,target,power,color,size,scale=1):
    bpy.ops.object.light_add(type='AREA',location=pos); ob=bpy.context.object; ob.name=name; ob.data.energy=power; ob.data.color=color; ob.data.shape='RECTANGLE'; ob.data.size=size; ob.data.size_y=size*scale; ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler(); return ob
key=area('Ivory softbox',(-3,-4,5),(0,0,1.6),450,(1,.88,.70),3,1.7)
area('Tall edge strip',(3,1,3.0),(0,0,1.8),700,(.87,.92,1),1,4)
area('Warm rear edge',(-2,2,2.7),(0,0,1.6),650,(1,.69,.39),1,3.5)
area('Label fill',(0,-5,2.3),(0,0,1.4),75,(1,.97,.9),2,1.2)
area('Cork top',(0,0,6),(0,0,1.6),130,(1,.94,.81),2)
bpy.ops.object.camera_add(location=(4,-9,4.5)); cam=bpy.context.object; cam.name='Hero Camera'; scene.camera=cam; cam.data.type='PERSP'; cam.data.lens=70
cam.rotation_euler=(Vector((0,0,1.7))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(renders/'hero-reference.png')
bpy.ops.wm.save_as_mainfile(filepath=str(root/'asset-source'/'royal-spices.blend'))
bpy.ops.render.render(write_still=True)
cam.location=(3.4,-6.5,3.1); cam.data.lens=85; cam.rotation_euler=(Vector((.15,0,1.9))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1200; scene.render.resolution_y=1200; scene.render.filepath=str(renders/'glass-detail-reference.png'); bpy.ops.render.render(write_still=True)
print('Model, macro strand, source and reference renders complete')
