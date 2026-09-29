import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'asset-source/royal-spices-v2.blend'))
ob=bpy.data.objects['Tamper Seal']
path=[(-.85,2.17),(-.85,2.29),(-.83,2.42),(-.80,2.57),(-.82,2.79),(-.85,2.89),(-.78,3.02),(-.773,3.28),(-.76,3.35),(-.70,3.38),(0,3.386),(.70,3.38),(.76,3.35),(.775,3.17),(.76,2.92)]
for v in ob.data.vertices:
    v.co.y,v.co.z=path[v.index//2]
    if v.co.y<-.6 and 2.38<v.co.z<3.12:v.co.y-=.065
    if v.co.y>.6 and v.co.z<3.12:v.co.y=max(v.co.y,.88)
product=[o for o in bpy.context.scene.objects if o.name in ['Glass Vessel','Cork Closure','Front Label','Tamper Seal'] or o.name.startswith('Contained Saffron')]
bpy.ops.object.select_all(action='DESELECT')
for o in product:o.hide_set(False);o.hide_render=False;o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/assets/royal-jar-v2.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
s=bpy.context.scene;s.cycles.samples=64;s.render.filepath=str(ROOT/'renders/hero-reference-v2.png')
bpy.ops.render.render(write_still=True)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'asset-source/royal-spices-v2.blend'))
print('SEAL_FINISH_COMPLETE')

