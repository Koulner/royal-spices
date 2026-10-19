"""Depth and camera per grid position, for the motion-compensated blend of the scroll sequence.

The scene is built by web_hero.py itself, untouched: it is executed with --mode none --range 0:0, which
runs its seq branch over no frames. Then every requested fine index i gets the camera of
apply_camera(i / (count - 1)) and a 1-sample render of the planar Z pass without depth of field,
denoising or motion blur (the scene is static apart from the camera; the moving reflection strip
is invisible to camera rays).

Output in --out:
  NNNN.png    16-bit grey, inverse planar depth w = v / 65535 * wmax (wmax per frame in cams.json),
              v = 0 for background; top row first
  cams.json   camera per frame (location, rotation of matrix_world as w,x,y,z, lens, shift, wmax)
              and Blender's own projection of three fixed probe points (world_to_camera_view)
Format: docs/UEBERGABE-FLUESSIG.md, "Entwurf Teil 1".

Usage (after "--"):
  --variant desktop|mobile   camera path and aspect
  --count 713                grid positions of the variant (desktop 713, mobile 505)
  --range 0:713              half-open index range, or --list 0,269,270
  --res 960x540              output size (default: motion set size of the variant)
  --threads 4                CPU threads (0 = all); RS_DEVICE as for web_hero.py
  --out DIR                  output directory
  --hero PATH                web_hero.py to build the scene from (default: next to this file)
Existing frames are skipped, so a stopped run can simply be started again.
"""
import bpy, sys, os, json, zlib, struct, time
import numpy as np
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default

VARIANT = arg('--variant', 'desktop')
COUNT = int(arg('--count', '713' if VARIANT == 'desktop' else '505'))
W, H = (int(v) for v in arg('--res', '960x540' if VARIANT == 'desktop' else '540x960').split('x'))
THREADS = arg('--threads', '0')
OUT = os.path.abspath(arg('--out', os.path.join(os.path.dirname(__file__), '..', '..', '.raw', f'{VARIANT}-depth')))
HERO = os.path.abspath(arg('--hero', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web_hero.py')))
if arg('--list'):
    INDICES = [int(v) for v in arg('--list').split(',')]
else:
    lo, hi = (int(v) for v in arg('--range', f'0:{COUNT}').split(':'))
    INDICES = list(range(lo, min(hi, COUNT)))
BACKGROUND = 1e8  # Cycles writes 1e10 where a camera ray hits nothing

# --------------------------------------------------------------------------- scene from web_hero.py
hero_argv = [sys.argv[0], '--', '--variant', VARIANT, '--mode', 'none', '--range', '0:0',
             '--res', f'{W}x{H}', '--threads', THREADS]
saved, sys.argv = sys.argv, hero_argv
hero = {'__name__': '__web_hero__', '__file__': HERO}
with open(HERO, encoding='utf-8') as f:
    exec(compile(f.read(), HERO, 'exec'), hero)
sys.argv = saved

scene = bpy.context.scene
cam = bpy.data.objects['CAMERA']
r = scene.render
r.resolution_x, r.resolution_y, r.resolution_percentage = W, H, 100
r.use_motion_blur = False
c = scene.cycles
c.samples = 1
c.use_adaptive_sampling = False
c.use_denoising = False
c.filter_width = 0.01          # one ray through the pixel centre, no filter spread across edges
c.max_bounces = 0              # the Z pass is written at the first hit
bpy.context.view_layer.use_pass_z = True

# Z pass to a float EXR through the compositor; read back with numpy, then removed
tmp = os.path.join(OUT, '_tmp')
os.makedirs(tmp, exist_ok=True)
scene.use_nodes = True
r.use_compositing = True
tree = scene.node_tree
for n in list(tree.nodes):
    tree.nodes.remove(n)
layers = tree.nodes.new('CompositorNodeRLayers')
sink = tree.nodes.new('CompositorNodeOutputFile')
sink.base_path = tmp
sink.format.file_format = 'OPEN_EXR'
sink.format.color_depth = '32'
sink.format.color_mode = 'BW'
sink.file_slots[0].path = 'z_'
tree.links.new(layers.outputs['Depth'], sink.inputs[0])
composite = tree.nodes.new('CompositorNodeComposite')
tree.links.new(layers.outputs['Image'], composite.inputs[0])
exr = os.path.join(tmp, f'z_{scene.frame_current:04d}.exr')

def probe_points():
    pts = []
    for name in ('PRODUCT | Royal Spices 0.5g', 'FLOWER | Crocus sativus'):
        ob = bpy.data.objects.get(name)
        if ob is not None:
            pts.append((name, ob.matrix_world.translation.copy()))
    pts.append(('world (0.5, -1.5, 1.0)', hero['Vector']((0.5, -1.5, 1.0))))
    return pts

def write_png16(path, v):
    """v: uint16 array (H, W), top row first."""
    rows = np.zeros((v.shape[0], 1 + 2 * v.shape[1]), np.uint8)  # filter byte 0 per row
    rows[:, 1:] = v.astype('>u2').view(np.uint8).reshape(v.shape[0], -1)
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    png = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', v.shape[1], v.shape[0], 16, 0, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(rows.tobytes(), 6)) + chunk(b'IEND', b''))
    with open(path + '.part', 'wb') as f:
        f.write(png)
    os.replace(path + '.part', path)

def read_z():
    img = bpy.data.images.load(exr, check_existing=False)
    img.colorspace_settings.name = 'Non-Color'
    px = np.empty(W * H * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    os.remove(exr)
    return px[0::4].reshape(H, W)[::-1]  # Blender images start at the bottom row

camsfile = os.path.join(OUT, 'cams.json')
cams = json.load(open(camsfile, encoding='utf-8')) if os.path.exists(camsfile) else None
probes = probe_points()
if cams is None:
    cams = {'variant': VARIANT, 'count': COUNT, 'fine': 8, 'res': [W, H], 'sensor': 36,
            'fit': 'HORIZONTAL' if VARIANT == 'desktop' else 'VERTICAL',
            'probes': [{'name': n, 'world': [round(v, 6) for v in p]} for n, p in probes], 'frames': {}}

def save_cams():
    with open(camsfile + '.part', 'w', encoding='utf-8') as f:
        json.dump(cams, f, indent=1)
    os.replace(camsfile + '.part', camsfile)

done = 0
for i in INDICES:
    png = os.path.join(OUT, f'{i:04d}.png')
    if os.path.exists(png) and str(i) in cams['frames']:
        continue
    t = time.time()
    p = i / (COUNT - 1)
    hero['apply_camera'](p)
    cam.data.dof.use_dof = False
    bpy.context.view_layer.update()
    bpy.ops.render.render(write_still=False)
    z = read_z()
    w = np.where(z < BACKGROUND, 1.0 / np.maximum(z, 1e-6), 0.0)
    wmax = float(w.max()) or 1.0
    write_png16(png, np.round(w / wmax * 65535).astype(np.uint16))
    m = cam.matrix_world
    px = []
    for _, pt in probes:
        q = world_to_camera_view(scene, cam, pt)
        px.append([round(q.x * W, 4), round((1 - q.y) * H, 4), round(q.z, 6)])
    cams['frames'][str(i)] = {'p': round(p, 8), 'loc': [round(v, 6) for v in m.translation],
                              'quat': [round(v, 8) for v in m.to_quaternion()], 'lens': round(cam.data.lens, 6),
                              'shift': [round(cam.data.shift_x, 8), round(cam.data.shift_y, 8)],
                              'wmax': round(wmax, 8), 'probes_px': px}
    done += 1
    if done % 10 == 0:
        save_cams()
    print(f'DEPTH {i:04d} in {time.time() - t:.1f}s (z {float(z.min()):.3f}..{float(np.where(z < BACKGROUND, z, 0).max()):.3f}, '
          f'background {float((w == 0).mean()) * 100:.1f} %)', flush=True)
save_cams()
os.rmdir(tmp) if not os.listdir(tmp) else None
print('DONE', flush=True)
