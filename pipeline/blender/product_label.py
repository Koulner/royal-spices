"""Royal Spices V1 - front label and print after the photo (T-20261007-03).

build_label(interior) hides the master's front label (paper, print, flag, label signet) and builds a
new one on the front face of the glass from product_jar.build_jar():
  * paper: 44 x 38.2 mm, small corner radius, 0.10 mm thick, warm natural paper with fibre relief that
    only shows in raking light; the back is unprinted paper with a glossy glue film (visible through
    the side wall and the base, never mirrored print)
  * print: the photo's layout, line by line (signet, ROYAL / SPICES, rule, SAFFRON, HERAT NEGIN,
    GRADE 1, rule, quantity, PACKED IN GERMANY, flag), as flat curves 0.012 mm in front of the paper
  * glue line: the paper's back sits GLUE_BU in front of the glass face (the seal strip ends there,
    at most 0.010 BU thick), the label is set by hand: a little off-centre and turned by TILT_DEG.

All label geometry lives under one empty that is scaled 1/MM_PER_BU, so every number below is in mm,
measured from the label's top edge (TOP) and from the label's vertical centre line (CX, + = right),
as read from the photo rectified with the label homography (staging T-20261007-03, tools/).
Seal (SEAL | ..., Seal print | ..., curves with 'Seal | ivory botanical mark') is not touched.
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix
import product_jar as PJ

D = bpy.data

# --------------------------------------------------------------------------- format and placement
LABEL_W_MM = 44.0
LABEL_H_MM = 38.2
CORNER_R_MM = 2.5           # photo: top-left 3.15, top-right 1.90 (bottom corners not measurable)
PAPER_T_MM = 0.10           # label stock incl. adhesive
GLUE_BU = 0.013             # back of the paper in front of the glass face (seal strip end lies in between)
LABEL_DX_MM = 0.0           # horizontal offset of the label centre on the face
TILT_DEG = -0.2             # set by hand: turned slightly clockwise (seen from the front)
PRINT_DZ_MM = 0.012         # print layer above the paper surface
ARC_SEGMENTS = 12           # per corner

# --------------------------------------------------------------------------- fonts (C:\Windows\Fonts)
FONT_DIR = 'C:/Windows/Fonts/'
FONT_BRAND = 'PERTIBD.TTF'      # ROYAL / SPICES: Perpetua Titling MT Bold - inscriptional Roman caps like the photo; ink coverage 0.89 x photo (Baskerville Old Face 0.62, Palatino 0.65)
FONT_PRODUCT = 'arialbd.ttf'    # SAFFRON: bold grotesque, flat terminals (Helvetica/Arial bold in the photo)
FONT_SPEC = 'arial.ttf'         # HERAT NEGIN, GRADE 1: regular grotesque
FONT_QTY = 'SCHLBKB.TTF'        # quantity: bold serif with lining figures (Century Schoolbook bold)
FONT_ORIGIN = 'arialbd.ttf'     # PACKED IN GERMANY: small bold grotesque, letter-spaced

# --------------------------------------------------------------------------- colours (linear RGB)
def _lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def srgb(r, g, b):
    return (_lin(r), _lin(g), _lin(b), 1.0)

PAPER_RGB = srgb(168, 151, 92)       # warm natural paper; fitted so the photo camera render matches the photo (sRGB 188/176/143)
PAPER_BACK_RGB = srgb(214, 205, 178) # unprinted back
INK_BRAND = srgb(66, 58, 44)         # grey-brown letterpress
INK_BLACK = srgb(24, 22, 19)
INK_GREY = srgb(72, 68, 62)
FLAG_RGB = (srgb(20, 18, 16), srgb(190, 18, 16), srgb(198, 138, 0))
PAPER_ROUGHNESS = 0.82
PAPER_BUMP = 0.035                   # fibre relief strength (only reads in raking light)
FIBRE_SCALE = 9.0                    # noise scale per mm

# --------------------------------------------------------------------------- layout (mm)
# key: text, font, ink, top (cap top from label top), cap height, centre x, ink width (None = natural),
# fit: 'track' = letter-spacing (the photo's spaced lines), 'stretch' = glyphs set wider/narrower
TEXT_LINES = [
    ('ROYAL',   'ROYAL',             FONT_BRAND,   INK_BRAND, 8.50, 3.70, 0.78, 26.55, 'track'),
    ('SPICES',  'SPICES',            FONT_BRAND,   INK_BRAND, 13.85, 3.70, 0.67, 26.95, 'track'),
    ('SAFFRON', 'SAFFRON',           FONT_PRODUCT, INK_BLACK, 19.65, 2.25, 0.58, 20.25, 'stretch'),
    ('HERAT',   'HERAT NEGIN',       FONT_SPEC,    INK_BLACK, 23.00, 1.60, 0.50, 20.10, 'stretch'),
    ('GRADE',   'GRADE 1',           FONT_SPEC,    INK_BLACK, 25.55, 1.55, 0.25, 12.60, 'stretch'),
    ('QTY',     '1 g',               FONT_QTY,     INK_BLACK, 28.95, 1.85, 0.32, None, None),
    ('ORIGIN',  'PACKED IN GERMANY', FONT_ORIGIN,  INK_GREY,  32.20, 0.90, 0.28, 25.15, 'track'),
]
QTY_PROBE = '1'          # cap height of the quantity line is the figure height
# rules: centre line (from top), thickness, centre x, length
RULES = [('RULE 1', 18.60, 0.24, 0.58, 17.45), ('RULE 2', 27.93, 0.22, 0.45, 10.60)]
# flag: top, height, centre x, width (three equal bands black / red / gold)
FLAG = (34.05, 1.50, 0.30, 6.10)
# signet (the master's label sprig, copied): top, height, centre x, width
SIGNET = (3.20, 4.45, 0.60, 4.80)
SIGNET_STROKE_MM = 0.18      # line width of the sprig (the master's curves are thinner)
SIGNET_PARTS = ['Botanical mark | leaf', 'Botanical mark | leaf.001', 'Botanical mark | leaf.002',
                'Botanical mark | stem', 'Botanical mark | stem.001', 'Botanical mark | stem.002']

# --------------------------------------------------------------------------- master objects to hide
HIDE_NAMES = ['LABEL | cream rounded rectangle', 'German flag band 0', 'German flag band 1', 'German flag band 2']
HIDE_PREFIX = 'Print | '
MARK_PREFIX = 'Botanical mark | '
MARK_MATERIAL = 'Label | umber letterpress'
PREFIX = 'FRONT LABEL | '


# =========================================================================== helpers
def _hide(ob):
    ob.hide_render = True
    ob.hide_viewport = True

def _mat(name, rgb, rough=0.55, spec=0.35):
    m = D.materials.get(name) or D.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = rgb
    p.inputs['Roughness'].default_value = rough
    p.inputs['Specular IOR Level'].default_value = spec
    return m

def _paper_material(name, rgb, back=False):
    m = _mat(name, rgb, PAPER_ROUGHNESS, 0.30)
    nt = m.node_tree; N = nt.nodes; L = nt.links
    p = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord')
    fib = N.new('ShaderNodeTexNoise'); fib.inputs['Scale'].default_value = FIBRE_SCALE
    fib.inputs['Detail'].default_value = 8; fib.inputs['Roughness'].default_value = 0.65
    L.new(tc.outputs['Object'], fib.inputs['Vector'])
    mot = N.new('ShaderNodeTexNoise'); mot.inputs['Scale'].default_value = 0.6; mot.inputs['Detail'].default_value = 3
    L.new(tc.outputs['Object'], mot.inputs['Vector'])
    ramp = N.new('ShaderNodeMapRange'); ramp.inputs['To Min'].default_value = 0.96; ramp.inputs['To Max'].default_value = 1.03
    L.new(mot.outputs['Fac'], ramp.inputs['Value'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs[0].default_value = 1.0
    mix.inputs[6].default_value = rgb
    L.new(ramp.outputs['Result'], mix.inputs[7])
    L.new(mix.outputs[2], p.inputs['Base Color'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = PAPER_BUMP; bump.inputs['Distance'].default_value = 0.02
    L.new(fib.outputs['Fac'], bump.inputs['Height'])
    L.new(bump.outputs['Normal'], p.inputs['Normal'])
    if back:   # glue film: glossy, slightly uneven
        p.inputs['Coat Weight'].default_value = 0.6
        rr = N.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = 0.18; rr.inputs['To Max'].default_value = 0.42
        L.new(fib.outputs['Fac'], rr.inputs['Value']); L.new(rr.outputs['Result'], p.inputs['Coat Roughness'])
    return m

def _outline(w, h, r, n=ARC_SEGMENTS):
    pts = []
    for cx, cy, a0 in ((w/2 - r, h/2 - r, 0), (-w/2 + r, h/2 - r, 90), (-w/2 + r, -h/2 + r, 180), (w/2 - r, -h/2 + r, 270)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def _paper(parent, front_mat, back_mat):
    me = D.meshes.new(PREFIX + 'paper')
    bm = bmesh.new()
    ring0 = [bm.verts.new((x, y, 0.0)) for x, y in _outline(LABEL_W_MM, LABEL_H_MM, CORNER_R_MM)]
    ring1 = [bm.verts.new((v.co.x, v.co.y, PAPER_T_MM)) for v in ring0]
    back = bm.faces.new(list(reversed(ring0))); back.material_index = 1
    front = bm.faces.new(ring1); front.material_index = 0
    n = len(ring0)
    for i in range(n):
        f = bm.faces.new((ring0[i], ring0[(i + 1) % n], ring1[(i + 1) % n], ring1[i])); f.material_index = 0
    bm.normal_update(); bm.to_mesh(me); bm.free()
    ob = D.objects.new(PREFIX + 'paper', me)
    me.materials.append(front_mat); me.materials.append(back_mat)
    _link(ob, parent)
    return ob

def _link(ob, parent):
    (parent.users_collection[0] if parent.users_collection else bpy.context.scene.collection).objects.link(ob)
    ob.parent = parent

def _rect(name, parent, x0, x1, y0, y1, mat):
    me = D.meshes.new(name)
    z = PAPER_T_MM + PRINT_DZ_MM
    me.from_pydata([(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)], [], [(0, 1, 2, 3)])
    me.materials.append(mat)
    ob = D.objects.new(name, me); _link(ob, parent)
    return ob

def _v(top):       # label-top distance -> label y (mm, up from the centre)
    return LABEL_H_MM / 2 - top

def _ink_bbox(ob):
    bpy.context.view_layer.update()
    bb = [Vector(c) for c in ob.bound_box]
    return min(c.x for c in bb), max(c.x for c in bb), min(c.y for c in bb), max(c.y for c in bb)

def _text(parent, key, body, font, ink, top, cap_h, cx, width, fit):
    cu = D.curves.new(PREFIX + key, 'FONT')
    cu.body = QTY_PROBE if key == 'QTY' else body
    cu.font = D.fonts.load(FONT_DIR + font, check_existing=True)
    cu.align_x = 'CENTER'; cu.size = 1.0; cu.resolution_u = 6
    ob = D.objects.new(PREFIX + key, cu); _link(ob, parent)
    ob.data.materials.append(ink)
    x0, x1, y0, y1 = _ink_bbox(ob)
    cu.size = cap_h / (y1 - y0)                       # cap (or figure) height
    cu.body = body
    w1 = (lambda b: b[1] - b[0])(_ink_bbox(ob))
    if fit == 'track':                                # letter-spacing fitted to the photo's ink width
        cu.space_character = 1.5; w2 = (lambda b: b[1] - b[0])(_ink_bbox(ob))
        cu.space_character = max(0.5, min(4.0, 1.0 + 0.5 * (width - w1) / (w2 - w1)))
    elif fit == 'stretch':
        ob.scale.x = width / w1
    x0, x1, y0, y1 = _ink_bbox(ob)
    x0, x1 = x0 * ob.scale.x, x1 * ob.scale.x
    base = 0.0 if key == 'QTY' else y0                # quantity: the 'g' descends, baseline is the origin
    ob.location = (cx - (x0 + x1) / 2, _v(top + cap_h) - base, PAPER_T_MM + PRINT_DZ_MM)
    return ob


# =========================================================================== main
def build_label(interior):
    """Hide the master's front label and build the photo label. Returns a report dict."""
    empty = D.objects[PJ.PRODUCT_EMPTY]
    for ob in empty.children_recursive:
        mats = [s.material.name for s in getattr(ob, 'material_slots', []) if s.material]
        if (ob.name in HIDE_NAMES or ob.name.startswith(HIDE_PREFIX)
                or (ob.name.startswith(MARK_PREFIX) and MARK_MATERIAL in mats)):
            _hide(ob)

    z0, z1 = interior['label_bottom_z'], interior['label_top_z']
    s = 1.0 / PJ.MM_PER_BU
    root = D.objects.new(PREFIX + 'after photo', None)
    _link(root, empty)
    root.matrix_parent_inverse = Matrix.Identity(4)
    # label x right, label y up (= +z), label z toward the viewer (= -y)
    root.matrix_basis = (Matrix.Translation((LABEL_DX_MM * s, -PJ.OUT_HALF_Y - GLUE_BU, (z0 + z1) / 2))
                         @ Matrix.Rotation(math.radians(90), 4, 'X')
                         @ Matrix.Rotation(math.radians(TILT_DEG), 4, 'Z')
                         @ Matrix.Diagonal((s, s, s, 1)))

    front = _paper_material('Label | natural paper after photo', PAPER_RGB)
    back = _paper_material('Label | paper back with glue', PAPER_BACK_RGB, back=True)
    _paper(root, front, back)
    inks = {}
    def ink(rgb, name):
        return inks.setdefault(name, _mat('Label | print ' + name, rgb, 0.5, 0.3))

    names = {id(INK_BRAND): 'umber', id(INK_BLACK): 'black', id(INK_GREY): 'grey'}
    for key, body, font, rgb, top, cap_h, cx, width, fit in TEXT_LINES:
        _text(root, key, body, font, ink(rgb, names[id(rgb)]), top, cap_h, cx, width, fit)
    for key, vc, t, cx, ln in RULES:
        _rect(PREFIX + key, root, cx - ln / 2, cx + ln / 2, _v(vc + t / 2), _v(vc - t / 2), ink(INK_BRAND, 'umber'))
    ftop, fh, fcx, fw = FLAG
    for i, rgb in enumerate(FLAG_RGB):
        _rect(PREFIX + 'flag band %d' % i, root, fcx - fw / 2, fcx + fw / 2,
              _v(ftop + fh * (i + 1) / 3), _v(ftop + fh * i / 3), ink(rgb, 'flag %d' % i))
    _signet(root, ink(INK_BRAND, 'umber'))
    return dict(min_gap_bu=_min_gap(root), texts=check_texts())

def _signet(root, mat):
    """Copy the master's label sprig into the label frame and fit it to the photo's box."""
    stop, sh, scx, sw = SIGNET
    parts = []
    bpy.context.view_layer.update()
    inv = root.matrix_world.inverted()
    for name in SIGNET_PARTS:
        src = D.objects[name]
        ob = src.copy(); ob.data = src.data.copy(); ob.name = PREFIX + 'signet ' + name.split('| ')[1]
        ob.data.materials.clear(); ob.data.materials.append(mat)
        ob.hide_render = ob.hide_viewport = False
        mw = src.matrix_world.copy()
        _link(ob, root); ob.matrix_parent_inverse = Matrix.Identity(4)
        ob.matrix_basis = inv @ mw
        parts.append(ob)
    bpy.context.view_layer.update()
    pts = [ob.matrix_basis @ Vector(c) for ob in parts for c in ob.bound_box]
    x0, x1 = min(p.x for p in pts), max(p.x for p in pts); y0, y1 = min(p.y for p in pts), max(p.y for p in pts)
    k = min(sw / (x1 - x0), sh / (y1 - y0))
    zt = PAPER_T_MM + PRINT_DZ_MM
    for ob in parts:
        m = ob.matrix_basis
        m = Matrix.Translation((-(x0 + x1) / 2, -(y0 + y1) / 2, 0)) @ m
        m = Matrix.Diagonal((k, k, 0.05, 1)) @ m      # flat print
        loc = m.translation.copy()
        ob.matrix_basis = Matrix.Translation((scx, _v(stop + sh / 2), zt - (min((m @ Vector(c)).z for c in ob.bound_box) - loc.z) - loc.z)) @ m
    bpy.context.view_layer.update()
    for ob in parts:
        if ob.data.bevel_depth > 0:
            sc = ob.matrix_world.to_scale().x * PJ.MM_PER_BU
            ob.data.bevel_depth = SIGNET_STROKE_MM / 2 / sc
    return parts

def _min_gap(root):
    """Smallest distance between the paper's back and the glass (BU), over glass vertices in the label footprint."""
    bpy.context.view_layer.update()
    glass = D.objects.get(PJ.GLASS_NAME)
    if glass is None:
        return None
    dg = bpy.context.evaluated_depsgraph_get()
    ev = glass.evaluated_get(dg); me = ev.to_mesh()
    to_label = root.matrix_world.inverted() @ ev.matrix_world
    best = None
    for v in me.vertices:
        p = to_label @ v.co
        if abs(p.x) <= LABEL_W_MM / 2 and abs(p.y) <= LABEL_H_MM / 2 and p.z < 5:   # in front of/behind the label
            d = -p.z                                   # glass behind the paper back (label z < 0)
            best = d if best is None else min(best, d)
    ev.to_mesh_clear()
    return None if best is None else best / PJ.MM_PER_BU

def check_texts():
    """All text bodies in the scene; visible ones must not contain 0,5 / 0.5."""
    out = []
    for ob in D.objects:
        if ob.type == 'FONT':
            vis = not ob.hide_render and all(not c.hide_render for c in ob.users_collection)
            bad = any(t in ob.data.body for t in ('0,5', '0.5'))
            out.append((ob.name, ob.data.body, vis, bad))
    return out
