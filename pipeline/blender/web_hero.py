"""Royal Spices V1 — web hero delivery from the Blender master.

Loads the untouched production master (royal-spices-master.blend) and derives the
web hero in memory. The master file is never saved from here.

What this script changes relative to the master (documented in docs/ASSETS.md):
  * Front label quantity "0,5 g" -> "1 g" (confirmed V1 product, 2026-10-05).
  * Back label hidden: the supplied artwork is the 0.5 g draft; no 1 g artwork exists yet.
  * A small pinch of dried threads is laid on the set between flower and jar, built from
    the master's own dry-stigma study mesh. Nothing moves during the shot.
  * Ground, world and light balance are re-set for a warm paper-toned set.
  * The ends of the three fresh stigma branches are opened into flared funnels with an uneven,
    papillose margin, and the stigma tissue is made translucent (refine_stigma_ends, 2026-10-06).
  * The single 85 mm motion-control path is replaced by two authored paths
    (desktop 16:9, mobile 9:16) that pass through the V1 storyboard:
    ORIGIN -> CROCUS -> STIGMA -> SAFFRON -> PRODUCT -> ROYAL SPICES -> HERO STATE.

Usage (after "--"):
  --variant desktop|mobile     camera path and aspect
  --mode still|seq|plan|anatomy
                               still: render the given --p values; seq: render --frames frames
                               plan: orthographic top view of the set for layout checks
                               anatomy: the upright flower centre (reference view E) in the web set,
                                        fully sharp, for the annotated figure
  --p 0,0.5,1                  progress values for still mode
  --frames 96                  number of frames for seq mode (progress i/(frames-1))
  --range 0:96                 optional half-open index range for seq mode (resumable chunks)
  --blur 1 --blur-step 2       optional, seq mode: camera motion blur. The exposure covers the travel
                               between the neighbouring frames, which are --blur-step indices away;
                               --blur scales it (1 = no gap between neighbours, 0 = off)
  --blur-fade 16               optional: the blur grows from nothing over this many indices at both
                               ends of --range, so a blurred stretch joins sharp frames without a seam
  --mod 8 --rem 2,4,6          optional: only indices with (index % mod) in rem. Used for in-between
                               frames on a finer grid: 713 frames = 8 x 89 + 1 pass through the same
                               positions as the 90-frame move at every eighth index
  --res 1600x900               output resolution
  --spp 64                     Cycles samples (adaptive)
  --noise 0.03                 adaptive threshold
  --threads 10                 CPU threads (0 = all)
  --out DIR                    output directory
  --tag NAME                   filename prefix for still mode

Environment: RS_DEVICE=HIP (AMD), OPTIX or CUDA (NVIDIA), ONEAPI (Intel) renders on the graphics
card; unset or CPU renders on the processor as before. A requested card that Blender cannot use
stops the render with an error instead of falling back to the processor.
"""
import bpy, sys, os, math, time
from math import radians
from mathutils import Vector, Euler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import product_jar, product_label, product_seal
try:   # needs saffron_pack.py + saffron-fill.json (T-20261008-01); until then the master fill stays
    import saffron_fill
except ImportError as e:
    saffron_fill = None
    print('SAFFRON fill not available:', e, flush=True)

# --------------------------------------------------------------------------- args
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default

VARIANT = arg('--variant', 'desktop')
MODE = arg('--mode', 'still')
RES = tuple(int(v) for v in arg('--res', '960x540' if VARIANT == 'desktop' else '540x960').split('x'))
SPP = int(arg('--spp', '48'))
NOISE = float(arg('--noise', '0.04'))
THREADS_CPU = int(arg('--threads', '0'))
OUT = arg('--out', os.path.join(os.path.dirname(__file__), '..', '..', '.raw', 'tests'))
TAG = arg('--tag', VARIANT)
PS = [float(v) for v in arg('--p', '1').split(',')]
FRAMES = int(arg('--frames', '96'))
RANGE = arg('--range')
MOD = int(arg('--mod', '1'))
REM = [int(v) for v in arg('--rem', '0').split(',')]
# Motion blur for seq mode: the shutter stays open while the camera travels from half a step before
# the frame to half a step after it, a step being BLUR_STEP indices. Neighbouring frames then cover
# the move without gaps: where the camera is fast the frames smear into each other like film,
# where it is slow they stay sharp.
BLUR = float(arg('--blur', '0'))
BLUR_STEP = float(arg('--blur-step', '1'))
BLUR_FADE = float(arg('--blur-fade', '0'))
OUT = os.path.abspath(OUT)  # Blender resolves relative render paths against its own base, not the shell cwd
os.makedirs(OUT, exist_ok=True)

scene = bpy.context.scene
D = bpy.data

# --------------------------------------------------------------------------- set
def principled(mat):
    return next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')

def setup_label():
    """V1 product is the 1 g jar. Only the quantity line changes."""
    qty = D.objects['Print | 0,5 g']
    qty.data.body = '1 g'
    qty.name = 'Print | 1 g'
    D.objects['BACK LABEL | original artwork / 44 x 49 mm aspect'].hide_render = True

def setup_ground():
    mat = D.materials['Backdrop | warm neutral mineral']
    nt = mat.node_tree
    p = principled(mat)
    p.inputs['Roughness'].default_value = 0.9
    p.inputs['Specular IOR Level'].default_value = 0.25
    # Barely-there paper mottling: tone only, no relief that could read as a texture preset.
    tc = nt.nodes.new('ShaderNodeTexCoord')
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 0.35; noise.inputs['Detail'].default_value = 5; noise.inputs['Roughness'].default_value = 0.55
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.25; ramp.color_ramp.elements[0].color = (0.93, 0.93, 0.93, 1)
    ramp.color_ramp.elements[1].position = 0.8; ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    mix.inputs[0].default_value = 1.0
    mix.inputs[6].default_value = (0.70, 0.635, 0.52, 1)
    nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
    nt.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], mix.inputs[7])
    nt.links.new(mix.outputs[2], p.inputs['Base Color'])

def setup_world_and_lights():
    bg = scene.world.node_tree.nodes['Background']
    bg.inputs[0].default_value = (1.0, 0.96, 0.9, 1)
    bg.inputs[1].default_value = 0.62
    key = D.objects['KEY | large diffusion']
    key.data.energy = 2600; key.data.color = (1.0, 0.975, 0.94)
    rim = D.objects['RIM | soft side window']
    rim.data.energy = 1500; rim.data.color = (1.0, 0.98, 0.96)
    D.objects['FILL | soft front'].data.energy = 260
    strip = D.objects['GLASS | controlled soft reflection']
    strip.animation_data_clear()
    strip.data.energy = 900
    # Low kicker behind the jar: lets the dried threads read as crimson through the glass.
    kd = D.lights.new('KICKER | saffron back light', 'AREA')
    kd.shape = 'RECTANGLE'; kd.size = 3.2; kd.size_y = 2.4; kd.energy = 520; kd.color = (1.0, 0.95, 0.88)
    ko = D.objects.new('KICKER | saffron back light', kd); scene.collection.objects.link(ko)
    ko.location = (6.2, 6.4, 2.4)
    ko.rotation_euler = (Vector((2.3, 0.5, 1.5)) - ko.location).to_track_quat('-Z', 'Y').to_euler()
    ko.visible_camera = False

def add_flags():
    """Black cards just outside frame: they give the glass its dark edge on a light ground."""
    mat = D.materials.new('Flag | black card')
    mat.use_nodes = True
    principled(mat).inputs['Base Color'].default_value = (0.004, 0.004, 0.004, 1)
    principled(mat).inputs['Roughness'].default_value = 1.0
    for name, loc, rot, size in [
        ('FLAG | left card', (-1.9, 1.6, 3.2), (radians(90), 0, radians(62)), (4.6, 7.0)),
        ('FLAG | right card', (9.6, -1.2, 3.2), (radians(90), 0, radians(-72)), (2.4, 7.0)),
    ]:
        bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
        o = bpy.context.object
        o.name = name
        o.scale = (size[0], size[1], 1)
        o.data.materials.append(mat)
        o.visible_camera = False
        o.visible_shadow = False
        o.visible_diffuse = False

# Hand-placed pinch of dried threads.
# (x, y, yaw deg, length scale, curl deg, twist deg, kink A deg, kink B deg, lift)
THREADS = [
    ( 0.45, -3.70,   22, 0.60,  16,  30,  34, -22, 0.000),
    ( 0.95, -3.35,  -28, 0.56, -14, -38, -30,  26, 0.000),
    ( 0.05, -3.95,   58, 0.52,  20,  18,  28,  18, 0.000),
    ( 1.30, -3.85,   -6, 0.58,  10,  44, -36, -14, 0.000),
    ( 0.60, -4.15,   84, 0.48, -18, -24,  22,  30, 0.000),
    ( 0.25, -3.40,  -54, 0.54,  12,  36, -26,  20, 0.060),
    ( 1.55, -3.45,   40, 0.50, -16,  14,  38, -28, 0.000),
    ( 0.95, -4.30,  -42, 0.46,  22, -40, -20,  34, 0.000),
    (-0.35, -3.60,   10, 0.50, -10,  28,  30, -18, 0.000),
    ( 0.70, -3.75,  -70, 0.54,  14, -32, -34,  24, 0.090),
    ( 1.85, -3.95,   66, 0.44,  12,  40,  24, -30, 0.000),
    ( 0.80, -3.60,   44, 0.56, -12,  22, -28,  16, 0.150),
    ( 0.40, -3.95,  -16, 0.50,  18, -16,  32, -24, 0.075),
    ( 1.10, -3.55,  -60, 0.48, -14,  34, -22,  28, 0.120),
    ( 0.10, -4.30,   26, 0.42,  14, -26,  26,  20, 0.000),
    ( 1.40, -4.15,   12, 0.44, -10,  30, -30, -16, 0.050),
    ( 0.65, -3.45,  100, 0.46,  16, -20,  20,  32, 0.185),
    ( 0.95, -3.90,  -98, 0.50, -12,  26, -24, -20, 0.170),
]

def dry_thread_material():
    """Dried stigma tissue: matte, lengthwise-fibred, uneven crimson. One material, per-object variation."""
    m = D.materials.new('Dried stigma | collapsed fibrous tissue')
    m.use_nodes = True
    nt = m.node_tree
    L = nt.links.new
    p = principled(m)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    info = nt.nodes.new('ShaderNodeObjectInfo')

    def math_node(op, a=None, b=None, c=None):
        n = nt.nodes.new('ShaderNodeMath'); n.operation = op
        for i, v in enumerate((a, b, c)):
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            elif v is not None:
                L(v, n.inputs[i])
        return n.outputs[0]

    # lengthwise fibres (object Z is the thread axis)
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (46, 46, 2.6)
    fib = nt.nodes.new('ShaderNodeTexNoise')
    fib.inputs['Scale'].default_value = 1.0; fib.inputs['Detail'].default_value = 6; fib.inputs['Roughness'].default_value = 0.62
    L(tc.outputs['Object'], mp.inputs['Vector']); L(mp.outputs['Vector'], fib.inputs['Vector'])
    # broad tonal drift along and across the thread, offset per thread
    mp2 = nt.nodes.new('ShaderNodeMapping'); mp2.inputs['Scale'].default_value = (3.0, 3.0, 1.1)
    off = nt.nodes.new('ShaderNodeCombineXYZ')
    L(math_node('MULTIPLY', info.outputs['Random'], 37.0), off.inputs['X'])
    L(off.outputs['Vector'], mp2.inputs['Location'])
    drift = nt.nodes.new('ShaderNodeTexNoise'); drift.inputs['Detail'].default_value = 3; drift.inputs['Roughness'].default_value = 0.5
    L(tc.outputs['Object'], mp2.inputs['Vector']); L(mp2.outputs['Vector'], drift.inputs['Vector'])

    per_thread = math_node('MULTIPLY_ADD', info.outputs['Random'], 0.30, -0.15)
    tone = math_node('MULTIPLY', math_node('ADD', drift.outputs['Fac'], per_thread), 0.75)
    tone = math_node('ADD', tone, math_node('MULTIPLY', fib.outputs['Fac'], 0.35))
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    e = ramp.color_ramp.elements
    e[0].position = 0.28; e[0].color = (0.034, 0.0022, 0.0016, 1)
    e[1].position = 0.78; e[1].color = (0.150, 0.0075, 0.0036, 1)
    mid = e.new(0.52); mid.color = (0.082, 0.0040, 0.0022, 1)
    L(tone, ramp.inputs['Fac'])
    L(ramp.outputs['Color'], p.inputs['Base Color'])

    # relief: fibres dominate, fine grain underneath
    grain = nt.nodes.new('ShaderNodeTexNoise'); grain.inputs['Scale'].default_value = 140; grain.inputs['Detail'].default_value = 2
    L(tc.outputs['Object'], grain.inputs['Vector'])
    b1 = nt.nodes.new('ShaderNodeBump'); b1.inputs['Strength'].default_value = 0.55; b1.inputs['Distance'].default_value = 0.012
    b2 = nt.nodes.new('ShaderNodeBump'); b2.inputs['Strength'].default_value = 0.25; b2.inputs['Distance'].default_value = 0.004
    L(fib.outputs['Fac'], b1.inputs['Height']); L(grain.outputs['Fac'], b2.inputs['Height'])
    L(b1.outputs['Normal'], b2.inputs['Normal']); L(b2.outputs['Normal'], p.inputs['Normal'])
    L(math_node('MULTIPLY_ADD', fib.outputs['Fac'], 0.22, 0.68), p.inputs['Roughness'])
    p.inputs['Specular IOR Level'].default_value = 0.2
    p.inputs['Subsurface Weight'].default_value = 0.12
    p.inputs['Subsurface Radius'].default_value = (0.10, 0.014, 0.006)
    p.inputs['Subsurface Scale'].default_value = 0.22
    return m

def add_threads():
    src = D.objects['DRY STUDY | individual stigma']
    mat = dry_thread_material()
    lump = D.textures.new('Dry tissue | uneven collapse', 'CLOUDS'); lump.noise_scale = 0.42; lump.noise_depth = 2
    crease = D.textures.new('Dry tissue | creases', 'CLOUDS'); crease.noise_scale = 0.085; crease.noise_depth = 3
    made = []
    for i, (x, y, yaw, sc, curl, twist, kink_a, kink_b, lift) in enumerate(THREADS):
        o = src.copy()
        o.data = src.data.copy()
        o.name = f'THREAD | dried stigma {i:02d}'
        o.hide_render = False
        scene.collection.objects.link(o)
        for v in o.data.vertices:  # centre on length so the deformers act around the middle
            v.co.z -= 2.03
        sub = o.modifiers.new('Density for creases', 'SUBSURF'); sub.levels = 1; sub.render_levels = 1
        t = o.modifiers.new('Twist of drying', 'SIMPLE_DEFORM'); t.deform_method = 'TWIST'; t.deform_axis = 'Z'; t.angle = radians(twist)
        # Dried threads kink rather than arc: two local bends at different stations, one gentle overall curl.
        la = 0.18 + 0.05 * (i % 4)
        ka = o.modifiers.new('Kink A', 'SIMPLE_DEFORM'); ka.deform_method = 'BEND'; ka.deform_axis = 'Y'; ka.angle = radians(kink_a); ka.limits = (la, la + 0.14)
        lb = 0.52 + 0.06 * (i % 3)
        kb = o.modifiers.new('Kink B', 'SIMPLE_DEFORM'); kb.deform_method = 'BEND'; kb.deform_axis = 'Y'; kb.angle = radians(kink_b); kb.limits = (lb, lb + 0.16)
        c = o.modifiers.new('Overall curl', 'SIMPLE_DEFORM'); c.deform_method = 'BEND'; c.deform_axis = 'Y'; c.angle = radians(curl)
        d1 = o.modifiers.new('Uneven collapse', 'DISPLACE'); d1.texture = lump; d1.texture_coords = 'GLOBAL'; d1.strength = 0.075; d1.mid_level = 0.5
        d2 = o.modifiers.new('Creases', 'DISPLACE'); d2.texture = crease; d2.texture_coords = 'GLOBAL'; d2.strength = 0.022; d2.mid_level = 0.5
        o.data.materials.clear(); o.data.materials.append(mat)
        o.scale = (sc * 1.5, sc * 1.25, sc)
        # lay the thread down: local Z (length) -> horizontal, then yaw on the table
        o.rotation_euler = Euler((radians(90), 0, radians(yaw)), 'XYZ')
        o.location = (x, y, 0)
        made.append((o, lift))
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    for o, lift in made:
        ev = o.evaluated_get(deps)
        me = ev.to_mesh()
        zmin = min((ev.matrix_world @ v.co).z for v in me.vertices)
        ev.to_mesh_clear()
        o.location.z += -zmin + 0.002 + lift

def tune_materials():
    fill = D.objects['SAFFRON | 1050 dry filaments']
    fill.data.bevel_depth = 0.03
    p = principled(D.materials['Saffron | dry crimson longitudinal tissue'])
    p.inputs['Base Color'].default_value = (0.27, 0.012, 0.006, 1)
    p.inputs['Subsurface Weight'].default_value = 0.25
    p.inputs['Subsurface Radius'].default_value = (0.09, 0.012, 0.006)
    p.inputs['Subsurface Scale'].default_value = 0.3

def setup_scene():
    setup_label()
    setup_ground()
    setup_world_and_lights()
    add_flags()
    add_threads()
    tune_materials()
    for i in range(1, 7):
        name = f'SHOT_0{i} | storyboard'
        if name in D.objects:
            D.objects[name].hide_render = True

# --------------------------------------------------------------------------- camera
PISTIL = 'PISTIL | continuous style and three stigmas'
# Each key: progress, camera position, aim point, focus point, lens mm, numeric f-stop
# (the scene is a centimetre composition; the numeric stop is scale-compensated as in the master),
# sensor shift (x, y) used to place the subject for the page composition.
# "snap" moves the focus point onto the nearest real surface of the named object.
KEYS = {
    'desktop': [
        dict(p=0.00, cam=( 2.54, -5.96, 3.33), aim=(-1.77, -2.40, 2.19), focus=(-1.77, -2.40, 2.19), snap=PISTIL, lens=85, fstop=2.00, shift=(-0.17, 0.00)),
        dict(p=0.22, cam=( 1.60, -10.4, 5.60), aim=(-2.20, -1.35, 1.95), focus=(-2.35, -1.20, 1.90), lens=85, fstop=0.20, shift=(-0.17, 0.02)),
        dict(p=0.40, cam=( 1.20, -8.05, 2.62), aim=(-1.50, -3.45, 1.20), focus=(-1.68, -3.53, 1.21), snap=PISTIL, lens=85, fstop=0.45, shift=(-0.15, 0.03)),
        dict(p=0.56, cam=( 2.75, -9.20, 3.90), aim=( 0.70, -3.80, 0.15), focus=( 0.70, -3.72, 0.12), lens=85, fstop=0.85, shift=(-0.12, 0.00)),
        dict(p=0.76, cam=(10.20, -26.4, 11.2), aim=( 0.90, -0.80, 2.60), focus=( 3.90, -1.20, 1.60), lens=85, fstop=0.11, shift=(-0.17, 0.05)),
        dict(p=0.90, cam=(14.05, -35.55, 16.00), aim=( 0.42, -0.90, 2.32), focus=( 2.15, -1.64, 2.60), lens=85, fstop=0.10, shift=(-0.16, 0.03)),
        dict(p=1.00, cam=(14.36, -36.26, 16.31), aim=( 0.40, -0.90, 2.30), focus=( 2.15, -1.64, 2.60), lens=85, fstop=0.11, shift=(-0.16, 0.03)),
    ],
    # Portrait: the opening keeps its subject low (headline above), every later key keeps it high
    # (the caption and the arrival sit on a label at the bottom of the screen). The jar is kept inside
    # the middle 82 % of the frame: that is what a 9:19.5 phone shows of a 9:16 picture.
    'mobile': [
        dict(p=0.00, cam=( 3.90, -7.08, 3.69), aim=(-1.77, -2.40, 2.19), focus=(-1.77, -2.40, 2.19), snap=PISTIL, lens=85, fstop=2.20, shift=(0.0, 0.12)),
        dict(p=0.22, cam=( 2.73, -13.73, 7.27), aim=(-2.20, -1.35, 1.95), focus=(-2.35, -1.20, 1.90), lens=85, fstop=0.22, shift=(0.0, -0.09)),
        dict(p=0.40, cam=( 1.20, -8.05, 2.62), aim=(-1.50, -3.45, 1.20), focus=(-1.68, -3.53, 1.21), snap=PISTIL, lens=85, fstop=0.45, shift=(0.0, -0.12)),
        dict(p=0.56, cam=( 2.75, -9.20, 3.90), aim=( 0.70, -3.80, 0.15), focus=( 0.70, -3.72, 0.12), lens=85, fstop=0.85, shift=(0.0, -0.12)),
        # From the product on, the same shots as landscape (client, 2026-10-06 evening: the phone must
        # show the same sequence): the landscape line of sight, pulled back until flower, jar and
        # threads fit the middle 82 % of the width above the caption label, framed by lens shift.
        dict(p=0.76, cam=(14.11, -37.15, 14.81), aim=( 0.90, -0.80, 2.60), focus=( 3.90, -1.20, 1.60), lens=85, fstop=0.11, shift=(-0.029, -0.174)),
        dict(p=0.90, cam=(18.41, -46.64, 20.38), aim=( 0.42, -0.90, 2.32), focus=( 2.15, -1.64, 2.60), lens=85, fstop=0.10, shift=(0.001, -0.166)),
        dict(p=1.00, cam=(18.55, -46.87, 20.51), aim=( 0.40, -0.90, 2.30), focus=( 2.15, -1.64, 2.60), lens=85, fstop=0.11, shift=(0.002, -0.166)),
    ],
}

_kd_cache = {}
def snap_focus(obj_name, point):
    """Nearest evaluated surface vertex of an object, so focus sits on real tissue, not near it."""
    from mathutils import kdtree
    if obj_name not in _kd_cache:
        ev = D.objects[obj_name].evaluated_get(bpy.context.evaluated_depsgraph_get())
        me = ev.to_mesh()
        n = len(me.vertices)
        idx = range(0, n, max(1, n // 200000))
        kd = kdtree.KDTree(len(idx))
        mw = ev.matrix_world.copy()
        for i, vi in enumerate(idx):
            kd.insert(mw @ me.vertices[vi].co, i)
        kd.balance()
        ev.to_mesh_clear()
        _kd_cache[obj_name] = kd
    co, _, _ = _kd_cache[obj_name].find(Vector(point))
    return tuple(co)

def resolve_keys():
    for k in KEYS[VARIANT]:
        if 'snap' in k:
            k['focus'] = snap_focus(k['snap'], k['focus'])

# --------------------------------------------------------------------------- chapter holds
# Where the "weiter" control stops (src/data/journey.ts). The camera is slowest there and people look
# longest, so two things are refined around a hold without touching the authored keys or any frame
# further away:
#   * at the stigma hold the camera leaves the authored path for a macro position in front of the
#     end of the stigma, dwells there with a slow drift and returns (refine_hold);
#   * motion blur fades to nothing (apply_camera_moving).
STOPS = (0.22, 0.40, 0.56, 0.76)

def hold_weight(p, at, core, reach):
    """1 within `core` of a hold, falling smoothly to 0 at `reach`."""
    d = abs(p - at)
    if d >= reach:
        return 0.0
    if d <= core:
        return 1.0
    u = (reach - d) / (reach - core)
    return u * u * (3 - 2 * u)

def stigma_end(obj_name, near, radius=0.6):
    """Flared end of the stigma branch that passes `near`: centre, outward axis, largest radius.

    The branch is a narrow funnel. Its axis is the main direction of the surface points around
    `near`; the flared end is the end with the larger cross-section.
    """
    import numpy as np
    ev = D.objects[obj_name].evaluated_get(bpy.context.evaluated_depsgraph_get())
    me = ev.to_mesh()
    co = np.empty(len(me.vertices) * 3, dtype=np.float32)
    me.vertices.foreach_get('co', co)
    ev.to_mesh_clear()
    mw = np.array(ev.matrix_world, dtype=np.float64)
    pts = co.reshape(-1, 3).astype(np.float64) @ mw[:3, :3].T + mw[:3, 3]
    local = pts[np.linalg.norm(pts - np.array(near), axis=1) < radius]
    centre = local.mean(axis=0)
    axis = np.linalg.svd(local - centre, full_matrices=False)[2][0]
    along = (local - centre) @ axis
    lo, hi = along.min(), along.max()
    ends = []
    for a, b, sign in ((lo, lo + 0.04 * (hi - lo), -1.0), (hi - 0.04 * (hi - lo), hi, 1.0)):
        ring = local[(along >= a) & (along <= b)]
        c = ring.mean(axis=0)
        off = (ring - c) - np.outer((ring - c) @ axis, axis)
        ends.append((np.linalg.norm(off, axis=1).max(), c, sign))
    size, c, sign = max(ends, key=lambda e: e[0])
    return Vector(c), Vector(axis * sign), float(size)

# The stigma hold (client, 2026-10-06: the stigma was sharp too briefly, too small to read, and
# blurred again at once). On the authored path the end of the stigma is about 5 % of the picture
# width, seen from the side: the folded end and its papillose rim, which the master models, cannot
# be read at that size. Around the hold the camera therefore blends from the authored path into a
# macro position in front of the end of the stigma and back:
#   dist    distance from the end of the stigma
#   angle   degrees between the line of sight and the axis of the branch (0 = straight into the end)
#   fstop   numeric stop at the macro position; depth of field shrinks with the square of the
#           distance, so the stop closes far enough to hold the whole flared end
#   drift   the camera never stands still inside the hold: it creeps in by this share of the
#           distance and swings by `swing` degrees across the hold
# Within `core` of the hold the picture is the macro view alone; it is back on the authored path at
# `reach`. No frame outside at +- reach changes.
STIGMA_HOLD = dict(
    at=0.40,
    core=float(arg('--hold-core', '0.025')), reach=float(arg('--hold-reach', '0.075')),
    dist=float(arg('--hold-dist', '1.9')), angle=float(arg('--hold-angle', '50')),
    fstop=float(arg('--hold-fstop', '2.0')), drift=0.06, swing=float(arg('--hold-swing', '7')),
)
_stigma = None

# The master animates the aperture on the camera data (action slot "Motion control | 85 mm"), and
# that animation was never cleared here: every frame of both moves was rendered at the value it has
# on the master's last scene frame, f/0.11, whatever stop its key names (found 2026-10-06; it is
# also why the stigma stayed soft after the first correction). The published moves keep that look:
# outside the stigma hold the stop is pinned to the same value, so no existing frame changes.
# Honouring the authored stops everywhere means rendering both moves again.
RENDERED_FSTOP = 0.11

def aim_for(cam, tip, seen):
    """Point to aim at so that `tip` appears in the camera-space direction `seen` (level horizon)."""
    to_tip = (tip - cam).normalized()
    aim = to_tip.copy()
    for _ in range(40):
        q = aim.to_track_quat('-Z', 'Y')
        now = q.inverted() @ to_tip
        aim = (aim - q @ Vector((seen.x - now.x, seen.y - now.y, 0.0))).normalized()
    return cam + aim * (tip - cam).length

def stigma_macro(s):
    """Macro pose at the stigma hold; s runs from -1 to 1 across the hold for the slow drift."""
    global _stigma
    if _stigma is None:
        key = next(key for key in KEYS[VARIANT] if abs(key['p'] - STIGMA_HOLD['at']) < 1e-6)
        tip, axis, size = stigma_end(PISTIL, key['focus'])
        cam, aim = Vector(key['cam']), Vector(key['aim'])
        # where the end of the stigma sits in the authored composition: it stays there
        seen = (aim - cam).to_track_quat('-Z', 'Y').inverted() @ (tip - cam).normalized()
        # the side of the branch the authored camera is on
        side = (cam - tip) - axis * (cam - tip).dot(axis)
        _stigma = dict(tip=tip, axis=axis, side=side.normalized(), seen=seen, size=size)
        print(f"HOLD stigma end {tuple(round(v, 4) for v in tip)} axis {tuple(round(v, 3) for v in axis)} "
              f"radius {size:.4f} authored distance {(cam - tip).length:.3f} "
              f"authored angle {math.degrees(math.acos((cam - tip).normalized().dot(axis))):.1f}", flush=True)
    m, h = _stigma, STIGMA_HOLD
    angle = radians(h['angle'] + h['swing'] * s)
    dist = h['dist'] * (1.0 - h['drift'] * s)
    cam = m['tip'] + (m['axis'] * math.cos(angle) + m['side'] * math.sin(angle)) * dist
    return cam, aim_for(cam, m['tip'], m['seen']), m['tip']

def refine_hold(p, k):
    h = STIGMA_HOLD
    w = hold_weight(p, h['at'], h['core'], h['reach'])
    if w > 0:
        cam, aim, tip = stigma_macro(min(max((p - h['at']) / h['reach'], -1.0), 1.0))
        k['cam'] = Vector(k['cam']).lerp(cam, w)
        k['aim'] = Vector(k['aim']).lerp(aim, w)
        k['focus'] = Vector(k['focus']).lerp(tip, w)
    k['fstop'] = math.exp(math.log(RENDERED_FSTOP) * (1 - w) + math.log(h['fstop']) * w)
    return k

# How far from each hold the motion blur is gone, and where it is back in full. The stigma hold is
# wide: the whole macro view is free of it.
BLUR_FREE = {0.22: (0.010, 0.035), 0.40: (0.045, 0.075), 0.56: (0.010, 0.035), 0.76: (0.010, 0.035)}

def blur_near_holds(p):
    """Share of the motion blur that remains: none at a hold, all of it a little further on."""
    return min(1.0 - hold_weight(p, at, *BLUR_FREE[at]) for at in STOPS)

def catmull(p0, p1, p2, p3, t):
    """Uniform Catmull-Rom; keys are authored at comparable spacing."""
    t2, t3 = t * t, t * t * t
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)

def ease(u, amount=0.7):
    """Motion-control style: slow out of a key, slow into the next, never a hard stop."""
    s = u * u * (3 - 2 * u)
    return u + (s - u) * amount

def sample(keys, p):
    p = min(max(p, 0.0), 1.0)
    i = 0
    while i < len(keys) - 2 and p > keys[i + 1]['p']:
        i += 1
    a, b = keys[i], keys[i + 1]
    u = ease((p - a['p']) / (b['p'] - a['p']))
    k0, k3 = keys[max(i - 1, 0)], keys[min(i + 2, len(keys) - 1)]
    out = {}
    for name in ('cam', 'aim', 'focus'):
        out[name] = catmull(Vector(k0[name]), Vector(a[name]), Vector(b[name]), Vector(k3[name]), u)
    s = u * u * (3 - 2 * u)
    out['lens'] = a['lens'] + (b['lens'] - a['lens']) * s
    # stops interpolate in log space, like a real iris pull
    out['fstop'] = math.exp(math.log(a['fstop']) + (math.log(b['fstop']) - math.log(a['fstop'])) * s)
    out['shift'] = tuple(a['shift'][j] + (b['shift'][j] - a['shift'][j]) * s for j in range(2))
    return out

# --------------------------------------------------------------------------- stigma ends
# Fresh stigma ends for the macro view (client, 2026-10-06 evening: "absoluter Realismus, darf nicht
# gerendert aussehen"). The master models each end as a closed, folded cross-section: seen close up
# it reads as a cut red profile. A fresh saffron stigma ends in an open, flared funnel with an
# irregularly toothed (crenate to fimbriate) margin covered in papillae [S4: "drei trichterförmige
# Narbenlappen, papillöser Rand"]. In memory only, the master is never saved:
#   * geometry: the end flares like a trumpet, the closed end face becomes a hollow, the margin is
#     uneven with fine teeth (all three branches)
#   * material: translucent living tissue (subsurface), velvet sheen of the papillae, a lighter
#     orange-red margin, fine cell texture instead of a smooth surface
import numpy as np

def _smooth(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)

def _ring_noise(theta, seed, lobes):
    """Smooth periodic noise around the axis: a sum of a few sines with random phases."""
    rng = np.random.default_rng(seed)
    out = np.zeros_like(theta)
    for k, w in lobes:
        out += w * np.sin(k * theta + rng.uniform(0, 2 * np.pi))
    return out

def refine_stigma_ends(flare=0.28, depth=0.85, crenate=0.13, teeth=0.045):
    ob = D.objects[PISTIL]
    me = ob.data
    mw = np.array(ob.matrix_world)
    rot = mw[:3, :3]
    n = len(me.vertices)
    co = np.empty(n * 3, dtype=np.float64); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    nl = np.empty(n * 3, dtype=np.float64); me.vertex_normals.foreach_get('vector', nl); nl = nl.reshape(-1, 3)
    world = co @ rot.T + mw[:3, 3]
    nw = nl @ np.linalg.inv(rot)  # normals transform with the inverse transpose
    nw /= np.linalg.norm(nw, axis=1, keepdims=True) + 1e-12
    # the three branch ends: highest values of the length coordinate, far apart
    uv = np.empty(len(me.loops) * 2, dtype=np.float32); me.uv_layers['AnatomicalUV'].data.foreach_get('uv', uv)
    lv = np.empty(len(me.loops), dtype=np.int32); me.loops.foreach_get('vertex_index', lv)
    vy = np.zeros(n); vy[lv] = uv.reshape(-1, 2)[:, 1]
    hi = np.where(vy > np.quantile(vy, 0.995))[0]
    seeds = [world[hi[0]]]
    for _ in range(2):
        dd = np.min([np.linalg.norm(world[hi] - s, axis=1) for s in seeds], axis=0)
        seeds.append(world[hi[dd.argmax()]])
    rim_attr = np.zeros(n)
    cup_attr = np.zeros(n)
    new = world.copy()
    for e, seed in enumerate(seeds):
        c, a, R = stigma_end(PISTIL, tuple(seed))
        c, a = np.array(c), np.array(a)
        e1 = np.cross(a, [0.0, 0.0, 1.0]); e1 /= np.linalg.norm(e1); e2 = np.cross(a, e1)
        rel = world - c
        along = rel @ a
        radial = rel - np.outer(along, a)
        rr = np.linalg.norm(radial, axis=1)
        sel = np.where((along > -4.0 * R) & (along < 0.4 * R) & (rr < 2.2 * R))[0]
        al, rad, r = along[sel], radial[sel], rr[sel]
        th = np.arctan2(rad @ e2, rad @ e1)
        # outline of the end, per direction around the axis (largest radius near the end)
        bins = 96
        b = ((th + np.pi) / (2 * np.pi) * bins).astype(int) % bins
        near = al > -0.6 * R
        rim_r = np.full(bins, 0.0)
        np.maximum.at(rim_r, b[near], r[near])
        rim_r[rim_r == 0] = R
        k = np.array([1, 2, 3, 2, 1], float); k /= k.sum()
        rim_r = np.convolve(np.r_[rim_r[-2:], rim_r, rim_r[:2]], k, 'valid')
        rho = r / rim_r[b]
        facing = nw[sel] @ a  # +1 on the end face, 0 on the side wall
        cap = _smooth((facing - 0.25) / 0.45) * _smooth((al + 0.6 * R) / (0.4 * R))
        # 1. trumpet: the radius grows faster towards the end
        t = _smooth((al + 3.0 * R) / (3.0 * R))
        grow = 1.0 + flare * t * t
        # 2. margin: uneven height (crenate) and fine teeth, only at the very edge
        edge = _smooth((rho - 0.78) / 0.2) * _smooth((al + 0.45 * R) / (0.35 * R))
        lift = R * (crenate * _ring_noise(th, 11 + e, [(5, 0.5), (8, 0.35), (13, 0.25)])
                    + teeth * _ring_noise(th, 23 + e, [(31, 0.6), (47, 0.4)]))
        # a slight outward roll of the lip
        roll = 1.0 + 0.04 * edge
        # 3. hollow: the closed end face sinks into a funnel
        sink = depth * R * np.clip(1.0 - rho * rho, 0.0, 1.0) ** 0.8 * cap
        moved = c + np.outer(al + lift * edge - sink, a) + rad * (grow * roll)[:, None]
        new[sel] = moved
        margin = _smooth((rho - 0.9) / 0.1) * _smooth((al + 0.2 * R) / (0.2 * R))
        rim_attr[sel] = np.maximum(rim_attr[sel], margin * (1 - cap) + _smooth((rho - 0.75) / 0.25) * cap * 0.7)
        cup_attr[sel] = np.maximum(cup_attr[sel], cap * np.clip(1.0 - rho, 0, 1))
        print(f'TIP end {e}: centre {tuple(np.round(c, 3))} radius {R:.4f} vertices {len(sel)}', flush=True)
    local = (new - mw[:3, 3]) @ np.linalg.inv(rot).T
    me.vertices.foreach_set('co', local.astype(np.float32).ravel())
    me.update()
    for name, data in (('rs_rim', rim_attr), ('rs_cup', cup_attr)):
        at = me.attributes.get(name) or me.attributes.new(name, 'FLOAT', 'POINT')
        at.data.foreach_set('value', data.astype(np.float32))
    # The master's papilla curves (Papilla_<end>_<nn>, 47 per end) ring the closed end it models.
    # They do not follow the opened trumpet and would float inside the hollow as a ring of bright
    # dashes; the papillae of the new margin come from the material (bump), so the curves go.
    for o in D.objects:
        if o.name.startswith('Papilla_'):
            o.hide_render = True
    _stigma_material()

def _stigma_material():
    mat = D.materials['Pistil | continuous ivory to orange to crimson tissue']
    nt = mat.node_tree
    L = nt.links.new
    p = nt.nodes['Principled BSDF']
    # living tissue: light enters and scatters (thin margins glow), soft sheen of the papillae
    p.inputs['Subsurface Weight'].default_value = 0.35
    p.inputs['Subsurface Radius'].default_value = (1.0, 0.12, 0.05)
    p.inputs['Subsurface Scale'].default_value = 0.035
    p.inputs['Roughness'].default_value = 0.58
    p.inputs['Specular IOR Level'].default_value = 0.22
    p.inputs['Sheen Weight'].default_value = 0.08
    p.inputs['Sheen Roughness'].default_value = 0.35
    p.inputs['Sheen Tint'].default_value = (1.0, 0.2, 0.1, 1.0)
    # margin lighter and more orange, the hollow a little deeper in tone
    rim = nt.nodes.new('ShaderNodeAttribute'); rim.attribute_name = 'rs_rim'
    cup = nt.nodes.new('ShaderNodeAttribute'); cup.attribute_name = 'rs_cup'
    base_link = next(l for l in nt.links if l.to_node == p and l.to_socket.name == 'Base Color')
    src = base_link.from_socket
    m1 = nt.nodes.new('ShaderNodeMix'); m1.data_type = 'RGBA'; m1.blend_type = 'MIX'
    m1.inputs[7].default_value = (0.50, 0.040, 0.006, 1.0)
    L(src, m1.inputs[6]); L(rim.outputs['Fac'], m1.inputs[0])
    m2 = nt.nodes.new('ShaderNodeMix'); m2.data_type = 'RGBA'; m2.blend_type = 'MULTIPLY'
    m2.inputs[7].default_value = (0.62, 0.42, 0.4, 1.0)
    L(m1.outputs[2], m2.inputs[6]); L(cup.outputs['Fac'], m2.inputs[0])
    # cell texture: fine, lengthwise stretched cells (the length coordinate is UV y)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1400.0, 220.0, 1.0)
    cells = nt.nodes.new('ShaderNodeTexVoronoi'); cells.feature = 'DISTANCE_TO_EDGE'
    cells.inputs['Scale'].default_value = 1.0
    L(tc.outputs['UV'], mp.inputs['Vector']); L(mp.outputs['Vector'], cells.inputs['Vector'])
    # papillae: small round bumps in object space, strongest at the margin and in the hollow
    pap = nt.nodes.new('ShaderNodeTexVoronoi'); pap.feature = 'F1'
    pap.inputs['Scale'].default_value = 260.0
    L(tc.outputs['Object'], pap.inputs['Vector'])
    pap_h = nt.nodes.new('ShaderNodeMath'); pap_h.operation = 'POWER'; pap_h.inputs[1].default_value = 0.5
    L(pap.outputs['Distance'], pap_h.inputs[0])
    tone = nt.nodes.new('ShaderNodeMix'); tone.data_type = 'RGBA'; tone.blend_type = 'MULTIPLY'
    tone.inputs[0].default_value = 0.10
    cells_c = nt.nodes.new('ShaderNodeMapRange'); cells_c.inputs['From Max'].default_value = 0.12
    cells_c.inputs['To Min'].default_value = 0.72
    L(cells.outputs['Distance'], cells_c.inputs['Value'])
    L(m2.outputs[2], tone.inputs[6]); L(cells_c.outputs['Result'], tone.inputs[7])
    L(tone.outputs[2], p.inputs['Base Color'])
    old_bump = next(l.from_node for l in nt.links if l.to_node == p and l.to_socket.name == 'Normal')
    b1 = nt.nodes.new('ShaderNodeBump'); b1.inputs['Strength'].default_value = 0.25; b1.inputs['Distance'].default_value = 0.002
    L(cells.outputs['Distance'], b1.inputs['Height']); L(old_bump.outputs['Normal'], b1.inputs['Normal'])
    pap_s = nt.nodes.new('ShaderNodeMath'); pap_s.operation = 'MULTIPLY_ADD'
    pap_s.inputs[1].default_value = 0.35; pap_s.inputs[2].default_value = 0.05
    L(rim.outputs['Fac'], pap_s.inputs[0])
    b2 = nt.nodes.new('ShaderNodeBump'); b2.inputs['Distance'].default_value = 0.004
    L(pap_s.outputs[0], b2.inputs['Strength']); L(pap_h.outputs[0], b2.inputs['Height']); L(b1.outputs['Normal'], b2.inputs['Normal'])
    L(b2.outputs['Normal'], p.inputs['Normal'])

# Leaving the stigma hold (client, 2026-10-06 evening: "ein Szenensprung statt der Übergang").
# The authored move from the stigma to the dried threads kept running while the camera dwelt at the
# macro view, so on leaving it the camera had to catch up: stigma, empty floor, threads in about 3 %
# of the journey. Now the authored move waits for the dwell and starts softly after it (EXIT['ease']),
# and halfway it backs off a little (EXIT['pull']), so the end of the stigma and the threads on the
# ground share the picture for a moment: one continuous move instead of a cut.
EXIT = dict(start=0.40, end=0.56, pull=float(arg('--exit-pull', '0.5')))

def leave_hold(p):
    """Authored pose after the stigma hold: delayed start, a short step back halfway."""
    e = EXIT
    if not (e['start'] < p < e['end']):
        return sample(KEYS[VARIANT], p)
    u = (p - e['start']) / (e['end'] - e['start'])
    q = e['start'] + (e['end'] - e['start']) * u * u * (2.0 - u)  # slope 0 at the hold, 1 at the threads
    k = sample(KEYS[VARIANT], q)
    back = 1.0 + e['pull'] * math.sin(math.pi * u) ** 2
    k['cam'] = k['aim'] + (k['cam'] - k['aim']) * back
    return k

def apply_camera(p):
    cam = D.objects['CAMERA']
    cam.animation_data_clear()
    focus = D.objects['FOCUS target']
    focus.animation_data_clear()
    k = refine_hold(p, leave_hold(p))
    cam.location = k['cam']
    cam.rotation_euler = (k['aim'] - k['cam']).to_track_quat('-Z', 'Y').to_euler()
    cd = cam.data
    cd.animation_data_clear()  # the master's aperture animation, see RENDERED_FSTOP
    cd.lens = k['lens']
    # 36 mm along the long side in both orientations: portrait is a rotated sensor, not a crop.
    cd.sensor_fit = 'HORIZONTAL' if VARIANT == 'desktop' else 'VERTICAL'
    cd.sensor_width = 36.0
    cd.sensor_height = 36.0
    cd.shift_x, cd.shift_y = k['shift']
    cd.dof.use_dof = True
    cd.dof.focus_object = focus
    cd.dof.aperture_fstop = k['fstop']
    cd.dof.aperture_blades = 9
    focus.location = k['focus']
    # The one authored light move: a soft strip travelling across the glass while the jar is revealed.
    strip = D.objects['GLASS | controlled soft reflection']
    t = min(max((p - 0.60) / 0.34, 0.0), 1.0)
    t = t * t * (3 - 2 * t)
    strip.location = Vector((7.2, -5.6, 8.0)).lerp(Vector((4.0, -4.7, 8.0)), t)
    strip.rotation_euler = (Vector((2.2, 0.0, 3.0)) - strip.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam

# --------------------------------------------------------------------------- render
def use_device(c):
    kind = os.environ.get('RS_DEVICE', 'CPU').upper()
    if kind == 'CPU':
        c.device = 'CPU'
        return
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = kind
    prefs.get_devices()
    cards = [dv for dv in prefs.devices if dv.type == kind]
    if not cards:
        raise RuntimeError('RS_DEVICE=%s: no such device (found %s)' % (kind, [(dv.name, dv.type) for dv in prefs.devices]))
    for dv in prefs.devices:
        dv.use = dv.type == kind
    c.device = 'GPU'
    print('DEVICE', kind, [dv.name for dv in cards], flush=True)

def setup_render():
    r = scene.render
    r.engine = 'CYCLES'
    r.resolution_x, r.resolution_y = RES
    r.resolution_percentage = 100
    r.image_settings.file_format = 'PNG'
    r.image_settings.color_mode = 'RGB'
    r.image_settings.color_depth = '8'
    r.image_settings.compression = 30
    r.use_persistent_data = True
    if THREADS_CPU:
        r.threads_mode = 'FIXED'
        r.threads = THREADS_CPU
    c = scene.cycles
    use_device(c)
    c.samples = SPP
    c.use_adaptive_sampling = True
    c.adaptive_threshold = NOISE
    c.use_denoising = True
    c.denoiser = 'OPENIMAGEDENOISE'
    c.max_bounces = 10
    c.transmission_bounces = 10
    c.glossy_bounces = 6
    c.caustics_reflective = False
    c.caustics_refractive = False

def apply_camera_moving(p, dp, shutter):
    """Camera at progress p, travelling from p - dp to p + dp across the neighbouring scene frames.

    The scene frame itself is not changed, so nothing else in the master moves. Cycles reads the
    camera and focus-target transforms at shutter open and close from these three keys.
    """
    cam = D.objects['CAMERA']
    focus = D.objects['FOCUS target']
    poses = []
    for q in (p - dp, p + dp, p):  # p last: lens, stop, shift and the light stay as at the frame itself
        apply_camera(min(max(q, 0.0), 1.0))
        poses.append((cam.location.copy(), cam.rotation_euler.to_quaternion(), focus.location.copy()))
    here = scene.frame_current
    cam.rotation_mode = 'QUATERNION'
    # straight travel between the three keys: no eased handles inside one exposure
    bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'
    reference = poses[2][1]
    for frame, (location, rotation, target) in zip((here - 1, here + 1, here), poses):
        if rotation.dot(reference) < 0:
            rotation.negate()
        cam.location = location
        cam.rotation_quaternion = rotation
        focus.location = target
        cam.keyframe_insert('location', frame=frame)
        cam.keyframe_insert('rotation_quaternion', frame=frame)
        focus.keyframe_insert('location', frame=frame)
    if not scene.render.use_motion_blur:
        # Only the camera moves. Without this, every object is exported again at shutter open and
        # close to look for motion of its own, which multiplies the render time for nothing.
        for ob in D.objects:
            if hasattr(ob, 'cycles'):
                ob.cycles.use_motion_blur = False
                ob.cycles.use_deform_motion = False
    scene.render.use_motion_blur = True
    scene.render.motion_blur_shutter = max(shutter, 0.01)
    scene.cycles.motion_blur_position = 'CENTER'


def render(path):
    scene.render.filepath = path
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print(f'RENDERED {os.path.basename(path)} in {time.time() - t:.1f}s', flush=True)

setup_scene()
# product after the photo: glass + cork, front label, seal loop, packed fill (one material with the loose threads)
INTERIOR = product_jar.build_jar()
product_label.build_label(INTERIOR)
product_seal.build_seal(INTERIOR)
if saffron_fill is not None and arg('--fill', 'new') == 'new':
    saffron_fill.build_fill(INTERIOR)
    saffron_fill.retint_loose_threads()
setup_render()
product_jar.tune_render_for_glass(scene)
resolve_keys()
# The macro pose of the stigma hold is taken from the untouched end, so the camera paths do not move;
# then the ends are opened up (refine_stigma_ends).
stigma_macro(0.0)
refine_stigma_ends()

if MODE == 'plan':
    cd = D.cameras.new('Plan'); cd.type = 'ORTHO'; cd.ortho_scale = 16
    cam = D.objects.new('PLAN', cd); scene.collection.objects.link(cam)
    cam.location = (0.5, -1.5, 40); cam.rotation_euler = (0, 0, 0)
    scene.camera = cam
    render(os.path.join(OUT, f'{TAG}_plan.png'))
elif MODE == 'anatomy':
    # Same pose and camera as reference render E, so the published annotation points stay valid.
    flower = D.objects['FLOWER | Crocus sativus']
    flower.location = (0, 0, 1.62); flower.rotation_euler = (0, 0, 0); flower.scale = (1, 1, 1)
    for ob in D.objects['PRODUCT | Royal Spices 0.5g'].children_recursive:
        ob.hide_render = True
    for ob in D.objects:
        if ob.name.startswith(('THREAD |', 'FLAG |')):
            ob.hide_render = True
    cam = D.objects['CAMERA']; cam.animation_data_clear()
    cam.location = (2, -5, 13)
    cam.rotation_euler = (Vector((0, 0, 3.05)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = 115; cam.data.sensor_fit = 'HORIZONTAL'; cam.data.sensor_width = 36.0
    cam.data.shift_x = 0; cam.data.shift_y = 0
    cam.data.dof.use_dof = False
    scene.camera = cam
    render(os.path.join(OUT, 'anatomy.png'))
elif MODE == 'still':
    for p in PS:
        apply_camera(p)
        render(os.path.join(OUT, f'{TAG}_p{int(round(p * 1000)):04d}.png'))
else:
    lo, hi = (int(v) for v in RANGE.split(':')) if RANGE else (0, FRAMES)
    for i in range(lo, min(hi, FRAMES)):
        path = os.path.join(OUT, f'{i:04d}.png')
        if i % MOD not in REM or os.path.exists(path):
            continue
        if BLUR > 0:
            edge = min(i - lo, min(hi, FRAMES) - 1 - i) / BLUR_FADE if BLUR_FADE > 0 else 1.0
            edge = min(max(edge, 0.0), 1.0)
            p = i / (FRAMES - 1)
            apply_camera_moving(p, BLUR_STEP / (FRAMES - 1), BLUR * edge * edge * (3 - 2 * edge) * blur_near_holds(p))
        else:
            apply_camera(i / (FRAMES - 1))
        render(path)
print('DONE', flush=True)
