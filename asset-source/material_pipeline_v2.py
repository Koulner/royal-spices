"""Royal Spices v2: reference-guided materials, Cycles texture bakes, HDR studio and GLBs.
The supplied board guides appearance; no unseen dimensions are asserted as measurements.
Run with Blender 4.5 --background --python asset-source/material_pipeline_v2.py
"""
import bpy, math, pathlib, json, random
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
ASSETS=ROOT/'public'/'assets'; MAPS=ASSETS/'materials'; RENDERS=ROOT/'renders'
MAPS.mkdir(exist_ok=True); RENDERS.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'asset-source'/'royal-spices.blend'))
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=24; scene.cycles.use_denoising=True
scene.render.bake.margin=12; scene.render.bake.use_clear=True
scene.render.bake.use_pass_direct=False; scene.render.bake.use_pass_indirect=False; scene.render.bake.use_pass_color=True
scene.cycles.max_bounces=12; scene.cycles.transmission_bounces=10
bpy.context.preferences.filepaths.save_version=0
random.seed(53)
def node(mat,typ,**kwargs):
    n=mat.node_tree.nodes.new(typ)
    for k,v in kwargs.items(): setattr(n,k,v)
    return n
def link(mat,a,b): mat.node_tree.links.new(a,b)
def principled(name):
    m=bpy.data.materials.new(name);m.use_nodes=True
    return m,m.node_tree.nodes.get('Principled BSDF')
def ramp(mat,values):
    n=node(mat,'ShaderNodeValToRGB')
    while len(n.color_ramp.elements)>2:n.color_ramp.elements.remove(n.color_ramp.elements[-1])
    for i,(position,color) in enumerate(values):
        e=n.color_ramp.elements[i] if i<2 else n.color_ramp.elements.new(position)
        e.position=position;e.color=(*color,1)
    return n
def noise(mat,coord,scale,detail=3,rough=.65):
    n=node(mat,'ShaderNodeTexNoise'); n.inputs['Scale'].default_value=scale;n.inputs['Detail'].default_value=detail;n.inputs['Roughness'].default_value=rough
    link(mat,coord,n.inputs['Vector']);return n
def assign(ob,mat):
    ob.data.materials.clear();ob.data.materials.append(mat)
def uv_auto(ob):
    bpy.ops.object.select_all(action='DESELECT'); ob.hide_set(False);ob.select_set(True);bpy.context.view_layer.objects.active=ob
    if not ob.data.uv_layers:
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=1.1519,island_margin=.018)
        bpy.ops.object.mode_set(mode='OBJECT')
def bake(ob,mat,stem,width,height,passes=('color','normal','roughness')):
    uv_auto(ob);assign(ob,mat)
    active=node(mat,'ShaderNodeTexImage')
    result={}
    for kind in passes:
        image=bpy.data.images.new(stem+'_'+kind,width=width,height=height,alpha=False)
        image.colorspace_settings.name='sRGB' if kind=='color' else 'Non-Color'
        active.image=image;mat.node_tree.nodes.active=active
        bpy.ops.object.bake(type={'color':'DIFFUSE','normal':'NORMAL','roughness':'ROUGHNESS'}[kind],save_mode='INTERNAL')
        image.filepath_raw=str(MAPS/(stem+'-'+kind+'.png'));image.file_format='PNG';image.save()
        result[kind]=image;print('BAKED '+stem+' '+kind,flush=True)
    return result
def baked_material(name,maps,base=None,rough=.7):
    m,p=principled(name);p.inputs['Roughness'].default_value=rough
    if base:p.inputs['Base Color'].default_value=(*base,1)
    for kind,image in maps.items():
        t=node(m,'ShaderNodeTexImage');t.image=image
        if kind=='color':link(m,t.outputs['Color'],p.inputs['Base Color'])
        elif kind=='roughness':link(m,t.outputs['Color'],p.inputs['Roughness'])
        elif kind=='normal':
            n=node(m,'ShaderNodeNormalMap');link(m,t.outputs['Color'],n.inputs['Color']);link(m,n.outputs['Normal'],p.inputs['Normal'])
    return m,p
# A natural cork aggregate: cellular pores with fine grain, not stretched horizontal streaks.
cork=bpy.data.objects['Cork Closure']
m,p=principled('Cork procedural bake source'); uv=node(m,'ShaderNodeTexCoord')
n=noise(m,uv.outputs['Generated'],38,5);v=node(m,'ShaderNodeTexVoronoi');v.inputs['Scale'].default_value=25;link(m,uv.outputs['Generated'],v.inputs['Vector'])
mix=node(m,'ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.58;link(m,n.outputs['Fac'],mix.inputs[1]);link(m,v.outputs['Distance'],mix.inputs[2])
colors=ramp(m,[(.05,(.023,.010,.004)),(.20,(.12,.057,.018)),(.30,(.34,.19,.073)),(.44,(.52,.33,.14)),(.65,(.68,.49,.27))])
link(m,mix.outputs[0],colors.inputs[0]);link(m,colors.outputs[0],p.inputs['Base Color'])
fine=noise(m,uv.outputs['Generated'],190,2);b=node(m,'ShaderNodeBump');b.inputs['Strength'].default_value=.45;b.inputs['Distance'].default_value=.022
link(m,mix.outputs[0],b.inputs['Height']);b2=node(m,'ShaderNodeBump');b2.inputs['Strength'].default_value=.20;b2.inputs['Distance'].default_value=.004
link(m,fine.outputs['Fac'],b2.inputs['Height']);link(m,b.outputs['Normal'],b2.inputs['Normal']);link(m,b2.outputs['Normal'],p.inputs['Normal'])
p.inputs['Roughness'].default_value=.84
cork_maps=bake(cork,m,'cork',1024,1024)
cm,_=baked_material('Cork | baked color normal roughness',cork_maps);assign(cork,cm)
# Paper texture is baked separately from the precise printed label.
label=bpy.data.objects['Front Label']
paper,p=principled('Paper fibre bake source');tc=node(paper,'ShaderNodeTexCoord');n=noise(paper,tc.outputs['Generated'],240,2)
b=node(paper,'ShaderNodeBump');b.inputs['Strength'].default_value=.19;b.inputs['Distance'].default_value=.003
link(paper,n.outputs['Fac'],b.inputs['Height']);link(paper,b.outputs['Normal'],p.inputs['Normal'])
r=ramp(paper,[(0,(.63,.63,.63)),(1,(.86,.86,.86))]);link(paper,n.outputs['Fac'],r.inputs[0]);link(paper,r.outputs[0],p.inputs['Roughness'])
paper_maps=bake(label,paper,'paper',1024,1024,('normal','roughness'))
paper_maps['color']=bpy.data.images.load(str(ASSETS/'label.png'),check_existing=True)
lm,_=baked_material('Ivory printed paper | baked microstructure',paper_maps);assign(label,lm)
# Correct the security band to the charcoal-blue tone visible in the genuine photo.
seal=bpy.data.objects['Tamper Seal']
sm,p=principled('Seal procedural bake source')
tex=node(sm,'ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ASSETS/'seal.png'),check_existing=True)
gray=node(sm,'ShaderNodeRGBToBW');link(sm,tex.outputs['Color'],gray.inputs[0])
r=ramp(sm,[(.02,(.018,.024,.032)),(.18,(.025,.033,.043)),(.45,(.54,.49,.36)),(.85,(.77,.70,.52))])
link(sm,gray.outputs[0],r.inputs[0]);link(sm,r.outputs[0],p.inputs['Base Color'])
p.inputs['Roughness'].default_value=.79
seal_maps=bake(seal,sm,'seal',512,1024,('color',))
seal_maps['normal']=paper_maps['normal'];seal_maps['roughness']=paper_maps['roughness']
sm,_=baked_material('Charcoal security seal | baked',seal_maps);assign(seal,sm)
# Fine transparent glass variation. Refraction is kept physical, never baked into base colour.
glass=bpy.data.objects['Glass Vessel']; gm,p=principled('Glass polish bake source');tc=node(gm,'ShaderNodeTexCoord')
n=noise(gm,tc.outputs['Generated'],100,2);r=ramp(gm,[(0,(.035,.035,.035)),(1,(.067,.067,.067))])
link(gm,n.outputs['Fac'],r.inputs[0]);link(gm,r.outputs[0],p.inputs['Roughness'])
b=node(gm,'ShaderNodeBump');b.inputs['Strength'].default_value=.055;b.inputs['Distance'].default_value=.001
link(gm,n.outputs['Fac'],b.inputs['Height']);link(gm,b.outputs['Normal'],p.inputs['Normal'])
glass_maps=bake(glass,gm,'glass',512,512,('normal','roughness'))
gm,p=baked_material('Clear glass | IOR 1.46 | baked polish',glass_maps,base=(.985,.992,.982),rough=.05)
p.inputs['Transmission Weight'].default_value=1;p.inputs['IOR'].default_value=1.46;assign(glass,gm)
# One unique macro stigma: wrinkled walls, narrow stem, open flared mouth.
old=bpy.data.objects.get('Hero Stigma')
if old:bpy.data.objects.remove(old,do_unlink=True)
segments=220;sides=24;verts=[];faces=[]
centres=[]
for j in range(segments+1):
    t=j/segments
    centres.append(Vector((4.7*(t-.5),.27*math.sin(t*6.0-.6)+.055*math.sin(t*19.0)+.010*math.sin(t*107),.11*math.sin(t*7.5)+.022*math.sin(t*33))))
for j,c in enumerate(centres):
    t=j/segments;tangent=(centres[min(j+1,segments)]-centres[max(j-1,0)]).normalized();n=tangent.cross(Vector((0,0,1))).normalized();b=tangent.cross(n).normalized()
    flare=max(0,(t-.75)/.25)
    radius=(.010+.018*t+.20*flare**2.6)*(1+.065*math.sin(t*139)+.04*math.sin(t*241))
    for k in range(sides):
        angle=k*math.tau/sides
        fold=1+.12*math.sin(angle*7+t*8)+.055*math.sin(angle*11-t*19)
        tip_edge=flare**9*(.015*math.sin(k*3.2)+.018*math.sin(k*1.6))
        q=c+n*math.cos(angle)*radius*fold+b*math.sin(angle)*radius*(.44+.22*flare)*fold+tangent*tip_edge
        verts.append(tuple(q))
    if j:
        for k in range(sides):faces.append(((j-1)*sides+k,(j-1)*sides+(k+1)%sides,j*sides+(k+1)%sides,j*sides+k))
mesh=bpy.data.meshes.new('Macro stigma flared thin tissue');mesh.from_pydata(verts,[],faces);mesh.update()
hero=bpy.data.objects.new('Hero Stigma',mesh);bpy.context.collection.objects.link(hero)
uv=mesh.uv_layers.new()
for poly in mesh.polygons:
    ids=[mesh.loops[i].vertex_index%sides for i in poly.loop_indices];seam=0 in ids and sides-1 in ids
    for li in poly.loop_indices:
        idx=mesh.loops[li].vertex_index;k=idx%sides
        uv.data[li].uv=(1 if seam and k==0 else k/sides,(idx//sides)/segments)
    poly.use_smooth=True
# The material uses elongated noise to produce longitudinal grooves and dry tissue.
m,p=principled('Saffron longitudinal tissue source');tc=node(m,'ShaderNodeTexCoord');scale=node(m,'ShaderNodeVectorMath');scale.operation='MULTIPLY';scale.inputs[1].default_value=(26,2.2,1);link(m,tc.outputs['UV'],scale.inputs[0])
n=noise(m,scale.outputs['Vector'],4,5,.7);fine=noise(m,tc.outputs['UV'],230,3)
colors=ramp(m,[(.12,(.045,.002,.001)),(.32,(.14,.006,.002)),(.51,(.30,.019,.006)),(.72,(.47,.049,.012)),(.90,(.56,.085,.022))])
link(m,n.outputs['Fac'],colors.inputs[0]);link(m,colors.outputs[0],p.inputs['Base Color'])
b=node(m,'ShaderNodeBump');b.inputs['Strength'].default_value=.42;b.inputs['Distance'].default_value=.009
link(m,n.outputs['Fac'],b.inputs['Height']);b2=node(m,'ShaderNodeBump');b2.inputs['Strength'].default_value=.12;b2.inputs['Distance'].default_value=.002
link(m,fine.outputs['Fac'],b2.inputs['Height']);link(m,b.outputs['Normal'],b2.inputs['Normal']);link(m,b2.outputs['Normal'],p.inputs['Normal'])
r=ramp(m,[(0,(.53,.53,.53)),(1,(.86,.86,.86))]);link(m,fine.outputs['Fac'],r.inputs[0]);link(m,r.outputs[0],p.inputs['Roughness'])
saffron_maps=bake(hero,m,'saffron',1024,2048)
sf,p=baked_material('Dried saffron | baked tissue',saffron_maps);p.inputs['Subsurface Weight'].default_value=.035;assign(hero,sf)
solid=hero.modifiers.new('Thin folded tissue','SOLIDIFY');solid.thickness=.003;solid.offset=-1
# Map the same baked material onto each small strand, preserving four merged draw calls.
for idx in range(4):
    ob=bpy.data.objects['Contained Saffron '+str(idx)]
    uvs=ob.data.uv_layers.new(name='Saffron UV') if not ob.data.uv_layers else ob.data.uv_layers.active
    for poly in ob.data.polygons:
        ids=[ob.data.loops[i].vertex_index%6 for i in poly.loop_indices];seam=0 in ids and 5 in ids
        for li in poly.loop_indices:
            vi=ob.data.loops[li].vertex_index%114;k=vi%6
            uvs.data[li].uv=(1 if seam and k==0 else k/6,(vi//6)/18)
    assign(ob,sf)
product=[bpy.data.objects[n] for n in ['Glass Vessel','Cork Closure','Front Label','Tamper Seal']]+[bpy.data.objects['Contained Saffron '+str(i)] for i in range(4)]
def export_selected(objs,path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:o.hide_set(False);o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ASSETS/path),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_image_format='AUTO')
export_selected(product,'royal-jar-v2.glb');export_selected([hero],'saffron-thread-v2.glb')
hero.hide_render=True;hero.hide_set(True)
# Render the same reflection environment that will be loaded by the browser.
oldcamera=scene.camera
env_collection=bpy.data.collections.new('Shared studio reflectors');scene.collection.children.link(env_collection)
def card(name,pos,target,size,power,color):
    bpy.ops.mesh.primitive_plane_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.scale=(size[0],size[1],1);o.rotation_euler=(Vector(target)-o.location).to_track_quat('Z','Y').to_euler()
    for c in list(o.users_collection):c.objects.unlink(o)
    env_collection.objects.link(o)
    mat=bpy.data.materials.new(name);mat.use_nodes=True;mat.node_tree.nodes.clear()
    out=node(mat,'ShaderNodeOutputMaterial');em=node(mat,'ShaderNodeEmission');em.inputs['Color'].default_value=(*color,1);em.inputs['Strength'].default_value=power;link(mat,em.outputs[0],out.inputs['Surface']);o.data.materials.append(mat);return o
cards=[
card('Tall ivory softbox',(-4,-3,3),(0,0,1.7),(2.5,5.5),4.5,(1,.91,.77)),
card('Right narrow edge',(4,1,2.8),(0,0,1.7),(.85,5.3),7,(.89,.94,1)),
card('Back warm edge',(-2,3,2.5),(0,0,1.7),(1.3,4.3),4,(1,.76,.47)),
card('Overhead broad card',(0,0,6),(0,0,1.7),(3.5,3.5),2.5,(1,.95,.86)),
card('Front gentle fill',(1,-5,2),(0,0,1.7),(3.5,3.5),.8,(1,.98,.93))]
for o in product:o.hide_render=True
scene.world.use_nodes=True;world=scene.world.node_tree.nodes.get('Background');world.inputs['Color'].default_value=(.1,.105,.098,1);world.inputs['Strength'].default_value=.35
bpy.ops.object.camera_add(location=(0,0,1.7));envcam=bpy.context.object;envcam.data.type='PANO';envcam.data.panorama_type='EQUIRECTANGULAR';scene.camera=envcam
envcam.rotation_euler=(math.pi/2,0,0)
scene.render.resolution_x=1024;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=False
scene.render.image_settings.file_format='OPEN_EXR';scene.render.image_settings.color_depth='16';scene.render.filepath=str(ASSETS/'royal-studio.exr');scene.cycles.samples=24
bpy.ops.render.render(write_still=True)
for o in cards:o.hide_render=True
for o in product:o.hide_render=False
scene.camera=oldcamera
# Use the baked studio map in the offline reference too.
env=node(scene.world,'ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(ASSETS/'royal-studio.exr'));link(scene.world,env.outputs['Color'],world.inputs['Color']);world.inputs['Strength'].default_value=.65
scene.view_settings.view_transform='AgX';scene.cycles.samples=96
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.image_settings.color_depth='8'
scene.render.resolution_x=1600;scene.render.resolution_y=1600;scene.render.film_transparent=True
oldcamera.location=(3.6,-9.8,4.5);oldcamera.data.lens=72;oldcamera.rotation_euler=(Vector((0,0,1.72))-oldcamera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(RENDERS/'hero-reference-v2.png');bpy.ops.render.render(write_still=True)
# A dedicated close-up tests the fine tissue texture before its use in realtime.
for o in product:o.hide_render=True
hero.hide_render=False;hero.hide_set(False)
oldcamera.location=(.3,-3.5,3.3);oldcamera.data.lens=57;oldcamera.rotation_euler=(Vector((.30,0,0))-oldcamera.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1800;scene.render.resolution_y=1000;scene.render.filepath=str(RENDERS/'saffron-macro-v2.png');bpy.ops.render.render(write_still=True)
hero.hide_render=True;hero.hide_set(True)
for o in product:o.hide_render=False
oldcamera.location=(3.6,-9.8,4.5);oldcamera.data.lens=72;oldcamera.rotation_euler=(Vector((0,0,1.72))-oldcamera.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'asset-source'/'royal-spices-v2.blend'))
manifest={'generator':'Blender 4.5 Cycles','reference':'Royal-Spices-3D-Referenztafel.png and original photograph','maps':[p.name for p in MAPS.glob('*.png')],'bakes':['base color without lighting','tangent-space normal','roughness'],'unverified':'Physical dimensions and hidden surfaces are reconstructed, not measured.'}
(ROOT/'references'/'material-manifest-v2.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('V2_PIPELINE_COMPLETE',flush=True)

