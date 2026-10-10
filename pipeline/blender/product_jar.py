"""Royal Spices V1 - glass jar and cork rebuilt after the real photo (transaction T-20261007-01).

Replaces the master's glass, cork and old fill at render time. The master file is never saved.

Shape: camera match against assets-src/photos/safran-glaeser-real.jpg (jar 2 of the front row).
The pose was solved from the front label (44 mm wide, assumption of the client; f = 1154 px, a
26 mm-equivalent phone lens). All measured sizes are kept in mm below; the body width stays
4.44 BU, which fixes MM_PER_BU. See ERGEBNIS.md of T-20261007-01 for the derivation.

Usage (inside a script that loaded the master, after setup_scene()):
    import product_jar
    interior = product_jar.build_jar()
    product_jar.tune_render_for_glass(bpy.context.scene)

All coordinates are local to the empty PRODUCT_EMPTY, in BU. Profile heights are measured from the
bottom of the glass and shifted by BASE_Z (the empty sits at world z = -BASE_Z).
"""
import bpy, bmesh
from math import sin, cos, sqrt, radians, exp
from mathutils import Vector
from mathutils.bvhtree import BVHTree

# =========================================================================== constants
PRODUCT_EMPTY = 'PRODUCT | Royal Spices 0.5g'
OLD_OBJECTS = ['JAR | solid glass wall / open neck / thick base', 'CORK | natural stopper',
               'SAFFRON | 1050 dry filaments']
GLASS_NAME = 'JAR | pressed soda-lime glass after photo'
CORK_NAME = 'CORK | tapered stopper after photo'
SEAL_NAME = 'SEAL | fitted charcoal strip'
BASE_Z = 0.07               # glass bottom in empty-local z (BU); the empty sits at world z -0.07

# --- scale. Photo: the right body silhouette lies 24.3 mm from the label centre on the label plane.
# With a vertical edge radius r seen at 49.9 deg the true half width is 24.3 + 0.635 r.
BODY_W_BU = 4.44
OUT_CORNER_MM = 2.5         # vertical edges outside (pressed glass; label ends ~1.1 mm before the round)
OUT_HALF_MM = 24.75 + 0.635 * OUT_CORNER_MM          # = 26.34 mm -> body 52.7 mm
MM_PER_BU = 2 * OUT_HALF_MM / BODY_W_BU              # = 11.864 mm per BU

def bu(mm):
    return mm / MM_PER_BU

# --- outer body (rounded square, flat faces), mm
OUT_HALF_Y_MM = OUT_HALF_MM - 0.12   # front/back faces a little thinner than the side walls (uneven pressing)
OUT_DRAFT_MM = 0.045        # half width +draft at the bottom, -draft at the top (mould draft)
BASE_EDGE_R_MM = 1.3        # bottom edge round; the standing ring sits where it meets the underside
PUSHUP_MM = 0.55            # shallow push-up in the middle of the underside
TOP_DZ_MM = 1.55            # height correction of everything above the wall (axis depth / label height refit)
OUT_WALL_TOP_MM = 44.33 + TOP_DZ_MM   # straight outer wall ends here
OUT_SHOULDER_R_MM = 3.28    # shoulder round
SHOULDER_TOP_MM = 48.11 + TOP_DZ_MM   # nearly flat shoulder rises to the neck foot
LEAN_MM = (0.066, -0.044)   # outer surface drifts by this towards the lip (minimal asymmetry)
LIP_OFFSET_MM = (0.11, -0.066)
LIP_ELLIPSE = 0.006         # lip 0.6 % wider in x than in y
WAVE_MM = (0.038, 0.027)    # low-frequency waviness of the outer wall
SEAM_H_MM, SEAM_W_MM = 0.066, 0.20   # mould seam ridge on both side faces (height, gauss width)

# --- neck, lip, bore, cork: (radius, height) in mm, read from the photo at the solved pose
NECK_DR_MM = -1.20          # radius correction for the deeper axis (body half width 25.89 instead of 24.30)
NECK_OUT = [(15.98, 48.33), (15.21, 48.60), (14.72, 49.04), (14.45, 49.59), (14.34, 50.35), (14.39, 51.01),
            (14.78, 51.45), (15.32, 51.83), (15.65, 52.16), (15.76, 52.54), (15.65, 52.98), (15.32, 53.36),
            (14.78, 53.64), (14.12, 53.85), (13.35, 53.94)]     # thick rounded lip, widest at 52.54
BORE = [(12.81, 53.88), (12.48, 53.69), (12.31, 53.42), (12.26, 53.09), (12.26, 51.67), (12.26, 50.35),
        (12.31, 49.26), (12.37, 48.38), (12.59, 47.51), (13.14, 46.85), (14.01, 46.36), (15.32, 46.03)]
NECK_IN_MM = 12.26          # straight bore = cork contact radius
CORK_TOP_DZ_MM = 1.35       # cork top raised after the first match (photo: cork top 4 px higher)
CORK = [(9.85, 48.49), (11.60, 48.56), (12.04, 48.71), (12.20, 48.98), (None, 49.26), (None, 51.45),
        (None, 53.20), (12.24, 53.96), (12.42, 55.28), (12.81, 58.01), (13.19, 60.75), (13.57, 63.49),
        (13.88, 66.22), (14.01, 67.54), (13.97, 68.08), (13.79, 68.47), (13.46, 68.74), (12.81, 68.91),
        (8.76, 68.96)]      # None = bore radius minus CORK_GAP (contact)
CORK_GAP_MM = 0.03          # radial gap to the bore: reads as contact, never intersects

# --- inner cavity (exact rounded square, written to jar-interior.json)
IN_HALF = 2.01              # BU (23.44 mm: side walls 2.45 mm, front/back 2.33 mm)
IN_CORNER_R = 0.50          # BU (5.8 mm, larger than outside: thick pressed corners)
IN_FLOOR_MM = 5.50          # thick base
IN_FLOOR_FILLET = 0.28      # BU
IN_SHOULDER_MM = 42.91 + TOP_DZ_MM   # straight inner wall ends here
IN_SHOULDER_R_MM = 2.74

# --- label / fill (photo: label 44 x 38.2 mm at the solved pose; bottom 2.25 mm above the glass bottom)
LABEL_BOTTOM_MM = 3.60
LABEL_H_MM = 38.22

# --- cork material (photo: pressed agglomerated cork, fine granules 0.5-1.5 mm, grey-brown, many small dark
#     pores and gaps, matte; side of the cork in the photo 60/44/22 sRGB = 0.26 x label paper luminance)
CORK_DARK = (0.015, 0.0086, 0.0029)    # linear albedo of dark granules
CORK_LIGHT = (0.088, 0.0500, 0.0163)    # light granules
CORK_PORE = (0.004, 0.003, 0.002)      # pores and gaps between the granules
CORK_GRAIN_MM = 0.8                    # granule size (a second, finer set at 0.42 x)
CORK_PORE_SHARE = 0.06                 # approximate area share of dark pores on the side
CORK_EDGE_MM = 0.35                    # shading radius of the slightly broken top edge

# --- glass material
GLASS_IOR = 1.52
ABSORB_COLOR = (0.925, 0.965, 0.945)   # 0.075/0.035/0.055 per BU: thin wall clear, edges and base green-grey
ABSORB_DENSITY = 1.0

# --- derived BU values (used by the scripts)
OUT_HALF_X = bu(OUT_HALF_MM)
OUT_HALF_Y = bu(OUT_HALF_Y_MM)
OUT_CORNER_R = bu(OUT_CORNER_MM)
NECK_IN_R = bu(NECK_IN_MM + NECK_DR_MM)
IN_FLOOR = bu(IN_FLOOR_MM)
IN_SHOULDER = bu(IN_SHOULDER_MM)
IN_SHOULDER_R = bu(IN_SHOULDER_R_MM)
LABEL_BOTTOM = bu(LABEL_BOTTOM_MM)
LABEL_TOP = bu(LABEL_BOTTOM_MM + LABEL_H_MM)
CORK_TOP = bu(CORK[-1][1] + TOP_DZ_MM + CORK_TOP_DZ_MM)
LIP_TOP = bu(NECK_OUT[-1][1] + TOP_DZ_MM)

D = bpy.data

# =========================================================================== geometry helpers
def _theta_list():
    octant = [0, .25, .5, .8, 1.2, 2, 3.2, 5, 8, 11.5, 15, 18.5, 22, 25.5, 28.5, 31, 33, 34.5, 35.5,
              36.3, 36.9, 37.5, 38.2, 38.9, 39.6, 40.3, 41, 41.6, 42.1, 42.45, 42.8, 43.3, 43.8,
              44.2, 44.6, 45]
    quad = sorted(set(octant + [90 - t for t in octant]))
    full = set()
    for t in quad:
        for v in (t, 180 - t, 180 + t, 360 - t):
            full.add(round(v % 360, 4))
    return [radians(t) for t in sorted(full)]

THETAS = _theta_list()

def rs_point(ax, ay, rc, th):
    """Point of the rounded square (half-widths ax, ay, corner radius rc) on the ray at angle th."""
    c, s = cos(th), sin(th)
    C, S = abs(c), abs(s)
    rc = min(rc, ax, ay)
    if C > 1e-12 and ax * S / C <= ay - rc + 1e-12:
        X, Y = ax, ax * S / C
    elif S > 1e-12 and ay * C / S <= ax - rc + 1e-12:
        X, Y = ay * C / S, ay
    else:
        cx, cy = ax - rc, ay - rc
        b = C * cx + S * cy
        t = b + sqrt(max(b * b - (cx * cx + cy * cy - rc * rc), 0.0))
        X, Y = t * C, t * S
    return (X if c >= -1e-12 else -X), (Y if s >= -1e-12 else -Y)

def rs_sdf(x, y, h, r):
    qx, qy = abs(x) - (h - r), abs(y) - (h - r)
    return sqrt(max(qx, 0) ** 2 + max(qy, 0) ** 2) + min(max(qx, qy), 0) - r

def _smooth(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)

def _outer_profile():
    """(ax, ay, rc, z, tag) in BU from the bottom centre over the outside, lip and bore to the inner floor."""
    P = []
    hx, hy, rc0, dr = OUT_HALF_MM + OUT_DRAFT_MM, OUT_HALF_Y_MM + OUT_DRAFT_MM, OUT_CORNER_MM, NECK_DR_MM
    rb = BASE_EDGE_R_MM
    # underside: shallow push-up, standing ring at the inset rb, then the bottom edge round
    for k, z in [(0.25, PUSHUP_MM * .93), (0.5, PUSHUP_MM * .75), (0.7, PUSHUP_MM * .48), (0.85, PUSHUP_MM * .2)]:
        P.append((bu(hx * k), bu(hy * k), bu(rc0 * k), bu(z), 'base'))
    for d, z in [(rb + 1.2, .03), (rb, 0.0)]:
        P.append((bu(hx - d), bu(hy - d), bu(max(rc0 - d, 0.4)), bu(z), 'base'))
    for a in (-70, -50, -30, -12):
        d = rb - rb * cos(radians(a))
        P.append((bu(hx - d), bu(hy - d), bu(max(rc0 - d, 0.4 + (rc0 - 0.4) * (1 - d / rb))), bu(rb + rb * sin(radians(a))), 'base'))
    # straight wall
    for z in [rb, 2.4, 5, 8, 12, 16, 20, 24, 28, 32, 36, 40, 42.5, OUT_WALL_TOP_MM]:
        d = OUT_DRAFT_MM * (1 - 2 * _smooth(rb, OUT_WALL_TOP_MM, z))
        P.append((bu(OUT_HALF_MM + d), bu(OUT_HALF_Y_MM + d), bu(rc0), bu(z), 'wall'))
    # shoulder round, then the nearly flat shoulder turns from the rounded square into the round neck
    ax0, ay0 = OUT_HALF_MM - OUT_DRAFT_MM, OUT_HALF_Y_MM - OUT_DRAFT_MM
    R = OUT_SHOULDER_R_MM
    for a in (15, 30, 45, 60, 75, 90):
        d = R * (1 - cos(radians(a)))
        P.append((bu(ax0 - d), bu(ay0 - d), bu(rc0 + d), bu(OUT_WALL_TOP_MM + R * sin(radians(a))), 'shoulder'))
    a1, b1, r1 = ax0 - R, ay0 - R, rc0 + R
    neck_r, neck_z = NECK_OUT[0][0] + dr, NECK_OUT[0][1] + TOP_DZ_MM
    z1 = OUT_WALL_TOP_MM + R
    for t in (0.3, 0.6, 0.85):
        r = neck_r * 1.02
        ax, ay = a1 + (r - a1) * t, b1 + (r - b1) * t
        rc = r1 + (min(ax, ay) - r1) * t ** 0.7
        z = z1 + (SHOULDER_TOP_MM - z1) * t
        P.append((bu(ax), bu(ay), bu(rc), bu(z), 'shoulder'))
    for r, z in NECK_OUT:
        r = bu(r + dr)
        P.append((r * (1 + LIP_ELLIPSE / 2), r * (1 - LIP_ELLIPSE / 2), r, bu(z + TOP_DZ_MM), 'neck'))
    # lip top inner edge and bore (centred: the cork sits on this axis)
    for r, z in BORE:
        r = bu(r + dr)
        P.append((r, r, r, bu(z + TOP_DZ_MM), 'bore'))
    # shoulder underside into the inner wall
    rbore, zb = bu(BORE[-1][0] + dr), bu(BORE[-1][1] + TOP_DZ_MM)
    a0, rcs = IN_HALF - IN_SHOULDER_R, IN_CORNER_R + IN_SHOULDER_R
    ztop = IN_SHOULDER + IN_SHOULDER_R
    for t in (0.35, 0.7):
        a = rbore + (a0 - rbore) * t
        P.append((a, a, rbore + (rcs - rbore) * t ** 0.6, zb + (ztop - zb) * t, 'in'))
    for ang in (90, 70, 50, 30, 15):
        a = a0 + IN_SHOULDER_R * cos(radians(ang))
        P.append((a, a, IN_CORNER_R + (IN_HALF - a), IN_SHOULDER + IN_SHOULDER_R * sin(radians(ang)), 'in'))
    for z in [IN_SHOULDER, 3.4, 3.0, 2.6, 2.2, 1.8, 1.4, 1.0, IN_FLOOR + IN_FLOOR_FILLET]:
        if z <= IN_SHOULDER + 1e-9:
            P.append((IN_HALF, IN_HALF, IN_CORNER_R, z, 'inwall'))
    fx, fz = IN_HALF - IN_FLOOR_FILLET, IN_FLOOR + IN_FLOOR_FILLET
    for ang in (-20, -40, -60, -75, -90):
        a = fx + IN_FLOOR_FILLET * cos(radians(ang))
        P.append((a, a, max(IN_CORNER_R - (IN_HALF - a), 0.05), fz + IN_FLOOR_FILLET * sin(radians(ang)), 'fillet'))
    rc_floor = IN_CORNER_R - IN_FLOOR_FILLET
    for a in (1.3, 0.9, 0.45):
        P.append((a, a, rc_floor * a / fx, IN_FLOOR, 'floor'))
    return P

def _ring(ax, ay, rc, z, tag):
    pts = []
    zmm = z * MM_PER_BU
    lean = _smooth(0.0, LIP_TOP * MM_PER_BU, zmm)
    for th in THETAS:
        x, y = rs_point(ax, ay, rc, th)
        if tag in ('base', 'wall', 'shoulder', 'neck'):
            if tag == 'wall':   # waviness: only a few microns of slope, visible in reflections
                w = (WAVE_MM[0] * sin(0.27 * zmm + 2 * th + 0.7) + WAVE_MM[1] * sin(0.45 * zmm - 3 * th + 2.1)) \
                    * _smooth(3, 7, zmm) * (1 - _smooth(41, 44, zmm))
                n = sqrt(x * x + y * y) or 1
                x += bu(w) * x / n; y += bu(w) * y / n
            if tag != 'base' or zmm > 0.8:   # mould seam on both side faces
                c = cos(th)
                if abs(c) > 0.9:
                    b = bu(SEAM_H_MM) * exp(-(y / bu(SEAM_W_MM)) ** 2)
                    x += b if c > 0 else -b
            if tag == 'neck':
                k = _smooth(48.5, 51.5, zmm)
                x += bu(LIP_OFFSET_MM[0]) * k; y += bu(LIP_OFFSET_MM[1]) * k
            else:
                x += bu(LEAN_MM[0]) * lean; y += bu(LEAN_MM[1]) * lean
        pts.append((x, y, z + BASE_Z))
    return pts

def _loft(name, rings, z_first, z_last, material, parent):
    verts = [(0.0, 0.0, z_first + BASE_Z)]
    for r in rings:
        verts.extend(r)
    verts.append((0.0, 0.0, z_last + BASE_Z))
    n = len(THETAS)
    faces = []
    for i in range(n):
        faces.append((0, 1 + (i + 1) % n, 1 + i))
    for j in range(len(rings) - 1):
        a, b = 1 + j * n, 1 + (j + 1) * n
        for i in range(n):
            faces.append((a + i, a + (i + 1) % n, b + (i + 1) % n, b + i))
    last = 1 + (len(rings) - 1) * n
    pole = len(verts) - 1
    for i in range(n):
        faces.append((last + i, last + (i + 1) % n, pole))
    me = D.meshes.new(name)
    me.from_pydata(verts, [], faces)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    if bm.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = D.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = parent
    ob.matrix_parent_inverse.identity()
    ob.location = (0, 0, 0); ob.rotation_euler = (0, 0, 0); ob.scale = (1, 1, 1)
    me.materials.append(material)
    return ob

# =========================================================================== materials
def glass_material():
    m = D.materials.new('Glass | soda-lime IOR 1.52 / tint in volume only')
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); L = nt.links.new
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    p = nt.nodes.new('ShaderNodeBsdfPrincipled')
    p.inputs['Base Color'].default_value = (1, 1, 1, 1)       # no surface tint (C2)
    p.inputs['Transmission Weight'].default_value = 1.0
    p.inputs['IOR'].default_value = GLASS_IOR                  # C1
    p.inputs['Roughness'].default_value = 0.0                  # C3
    tc = nt.nodes.new('ShaderNodeTexCoord')
    # polished surface; faint handling marks only change the roughness in small patches (C4)
    smudge = nt.nodes.new('ShaderNodeTexNoise')
    smudge.inputs['Scale'].default_value = 2.6; smudge.inputs['Detail'].default_value = 6; smudge.inputs['Roughness'].default_value = 0.6
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.64; ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
    ramp.color_ramp.elements[1].position = 0.80; ramp.color_ramp.elements[1].color = (0.035, 0.035, 0.035, 1)
    L(tc.outputs['Object'], smudge.inputs['Vector']); L(smudge.outputs['Fac'], ramp.inputs['Fac'])
    L(ramp.outputs['Color'], p.inputs['Roughness'])
    # pressed-glass waviness: low-frequency slope noise, only seen in reflections and refraction (B5)
    wave = nt.nodes.new('ShaderNodeTexNoise')
    wave.inputs['Scale'].default_value = 0.85; wave.inputs['Detail'].default_value = 2.5; wave.inputs['Roughness'].default_value = 0.45
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.06; bump.inputs['Distance'].default_value = 0.004
    L(tc.outputs['Object'], wave.inputs['Vector']); L(wave.outputs['Fac'], bump.inputs['Height'])
    L(bump.outputs['Normal'], p.inputs['Normal'])
    L(p.outputs['BSDF'], out.inputs['Surface'])
    vol = nt.nodes.new('ShaderNodeVolumeAbsorption')            # tint only from the volume (C2)
    vol.inputs['Color'].default_value = (*ABSORB_COLOR, 1)
    vol.inputs['Density'].default_value = ABSORB_DENSITY
    L(vol.outputs['Volume'], out.inputs['Volume'])
    try:
        m.cycles.homogeneous_volume = True
    except AttributeError:
        pass
    return m

def cork_material():
    """Pressed agglomerated cork: fine irregular granules in two sizes, dark pores in the gaps between
    granules and as small pits, low saturation, matte. The top cut face uses the same granules with more
    open pores. The top edge is rounded and made uneven in shading only (bevel + noise), geometry is untouched."""
    m = D.materials.new('Cork | agglomerate after photo')
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); L = nt.links.new
    N = nt.nodes.new
    def math(op, a, b=None, clamp=False):
        n = N('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                L(v, n.inputs[i])
        return n.outputs[0]
    out = N('ShaderNodeOutputMaterial')
    p = N('ShaderNodeBsdfPrincipled')
    p.inputs['Roughness'].default_value = 0.92
    p.inputs['Specular IOR Level'].default_value = 0.22
    tc = N('ShaderNodeTexCoord')
    # slight warp so the granule cells are irregular, not a cell pattern
    warp = N('ShaderNodeTexNoise'); warp.inputs['Scale'].default_value = MM_PER_BU / 0.8; warp.inputs['Detail'].default_value = 1
    L(tc.outputs['Object'], warp.inputs['Vector'])
    wsub = N('ShaderNodeVectorMath'); wsub.operation = 'SUBTRACT'; wsub.inputs[1].default_value = (0.5, 0.5, 0.5)
    L(warp.outputs['Color'], wsub.inputs[0])
    wsc = N('ShaderNodeVectorMath'); wsc.operation = 'SCALE'; wsc.inputs['Scale'].default_value = bu(CORK_GRAIN_MM) * 0.6
    L(wsub.outputs['Vector'], wsc.inputs[0])
    co = N('ShaderNodeVectorMath'); co.operation = 'ADD'
    L(tc.outputs['Object'], co.inputs[0]); L(wsc.outputs['Vector'], co.inputs[1])
    def voronoi(size, feature='F1'):
        v = N('ShaderNodeTexVoronoi'); v.feature = feature; v.inputs['Scale'].default_value = MM_PER_BU / size
        v.inputs['Randomness'].default_value = 1.0
        L(co.outputs['Vector'], v.inputs['Vector'])
        return v
    va = voronoi(CORK_GRAIN_MM); vb = voronoi(CORK_GRAIN_MM * 0.42)
    def rnd(v):                                      # uniform 0..1 per cell (one channel of the cell colour)
        s = N('ShaderNodeSeparateColor'); L(v.outputs['Color'], s.inputs['Color'])
        return s.outputs['Red']
    ga = rnd(va); gb = rnd(vb)
    shade = math('ADD', math('MULTIPLY', ga, 0.55), math('MULTIPLY', gb, 0.45))
    tone = N('ShaderNodeValToRGB')
    tone.color_ramp.elements[0].color = (*CORK_DARK, 1); tone.color_ramp.elements[1].color = (*CORK_LIGHT, 1)
    tone.color_ramp.elements[0].position = 0.2; tone.color_ramp.elements[1].position = 0.8
    # fine speckle inside the granules (cork cell structure)
    spk = N('ShaderNodeTexNoise'); spk.inputs['Scale'].default_value = MM_PER_BU / 0.2; spk.inputs['Detail'].default_value = 2
    L(co.outputs['Vector'], spk.inputs['Vector'])
    shade = math('ADD', shade, math('MULTIPLY', math('SUBTRACT', spk.outputs['Fac'], 0.5), 0.9))
    L(shade, tone.inputs['Fac'])
    # pores: gaps along the granule borders (broken up by noise) plus small round pits
    edge = voronoi(CORK_GRAIN_MM, 'DISTANCE_TO_EDGE')
    brk = N('ShaderNodeTexNoise'); brk.inputs['Scale'].default_value = MM_PER_BU / 1.2; brk.inputs['Detail'].default_value = 2
    L(tc.outputs['Object'], brk.inputs['Vector'])
    # the cut top face shows the pores more openly: widen the gaps where the normal points up
    geo = N('ShaderNodeNewGeometry')
    sep = N('ShaderNodeSeparateXYZ')
    vt = N('ShaderNodeVectorTransform'); vt.vector_type = 'NORMAL'; vt.convert_from = 'WORLD'; vt.convert_to = 'OBJECT'
    L(geo.outputs['Normal'], vt.inputs['Vector']); L(vt.outputs['Vector'], sep.inputs['Vector'])
    top = math('MULTIPLY', math('SUBTRACT', sep.outputs['Z'], 0.6, clamp=True), 2.5)   # 0 side .. 1 top
    gap_w = math('MULTIPLY', math('ADD', math('MULTIPLY', top, 0.6), 1.0),
                 math('MULTIPLY', math('SUBTRACT', brk.outputs['Fac'], 0.45, clamp=True), 0.7))
    gap = math('LESS_THAN', edge.outputs['Distance'], gap_w)
    pit = N('ShaderNodeTexVoronoi'); pit.inputs['Scale'].default_value = MM_PER_BU / 0.9
    L(co.outputs['Vector'], pit.inputs['Vector'])
    pit_on = math('GREATER_THAN', rnd(pit), math('SUBTRACT', 0.80, math('MULTIPLY', top, 0.12)))
    pit_in = math('LESS_THAN', pit.outputs['Distance'], 0.38)
    pore = math('MAXIMUM', gap, math('MULTIPLY', pit_on, pit_in))
    mc = N('ShaderNodeMix'); mc.data_type = 'RGBA'; mc.inputs['B'].default_value = (*CORK_PORE, 1)
    L(pore, mc.inputs['Factor']); L(tone.outputs['Color'], mc.inputs['A'])
    L(mc.outputs['Result'], p.inputs['Base Color'])
    # relief: granules stand at slightly different heights, pores sink in
    hgt = math('SUBTRACT', math('MULTIPLY', ga, 0.5), pore)
    bump = N('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.5; bump.inputs['Distance'].default_value = bu(0.12)
    L(hgt, bump.inputs['Height'])
    # broken, uneven top edge: bevelled shading normal with a coarse noise wobble
    bev = N('ShaderNodeBevel'); bev.samples = 8
    rad = math('MULTIPLY', math('ADD', brk.outputs['Fac'], 0.5), bu(CORK_EDGE_MM))
    L(rad, bev.inputs['Radius'])
    L(bev.outputs['Normal'], bump.inputs['Normal'])
    L(bump.outputs['Normal'], p.inputs['Normal'])
    L(p.outputs['BSDF'], out.inputs['Surface'])
    return m

# =========================================================================== build
def _hide(ob):
    ob.hide_render = True; ob.hide_viewport = True

def _fit_seal(empty, targets, clear=0.03):
    """Lift the seal over the new cork and push it out of the new glass. Keeps its topology.
    Placeholder until T-20261007-03 rebuilds label and seal."""
    lift = (CORK_TOP + BASE_Z) - 6.04 + 0.01
    seal = D.objects.get(SEAL_NAME)
    if seal:
        for v in seal.data.vertices:
            v.co.z += lift * _smooth(4.9, 6.0, v.co.z)
        trees = []
        for t in targets:
            bm = bmesh.new(); bm.from_mesh(t.data); trees.append(BVHTree.FromBMesh(bm)); bm.free()
        for _ in range(3):
            for v in seal.data.vertices:
                for tr in trees:
                    loc, nor, idx, dist = tr.find_nearest(v.co)
                    if loc is None:
                        continue
                    if (v.co - loc).dot(nor) < clear:
                        v.co = loc + nor * clear
        seal.data.update()
    for ob in empty.children:
        if ob.name.startswith('Seal print'):
            ob.location.z += lift
        elif ob.name.startswith('Botanical mark') and ob.type == 'CURVE':
            pts = [p for s in ob.data.splines for p in (list(s.points) + list(s.bezier_points))]
            if pts and max(abs(p.co[1]) for p in pts) < 2.2:   # the ivory mark on the seal, not on the label
                for p in pts:
                    dz = lift * _smooth(4.9, 6.0, p.co[2]); p.co[2] += dz
                    if hasattr(p, 'handle_left'):
                        p.handle_left[2] += dz; p.handle_right[2] += dz

def _seat_labels(empty, glue=0.013):
    """The master's front and back label sat on the old face (|y| 2.235). Move them onto the new faces,
    a glue line of `glue` BU in front of the glass. Placeholder until T-20261007-03."""
    from mathutils import Matrix
    dy = 2.235 - (OUT_HALF_Y + glue)
    for ob in empty.children:
        if ob.type not in ('MESH', 'CURVE', 'FONT') or ob.name.startswith(('JAR |', 'CORK |', 'SAFFRON |', 'SEAL |', 'Seal print')):
            continue
        ys = [(ob.matrix_parent_inverse @ ob.matrix_basis @ Vector(c)).y for c in ob.bound_box]
        if min(ys) > 2.2:      # back label
            ob.matrix_parent_inverse = Matrix.Translation((0, -dy, 0)) @ ob.matrix_parent_inverse
        elif max(ys) < -2.2:   # front label, print, flag, label mark
            ob.matrix_parent_inverse = Matrix.Translation((0, dy, 0)) @ ob.matrix_parent_inverse

def _cork_rings():
    rings = []
    zl = NECK_OUT[-1][1]
    for r, z in CORK:
        r = NECK_IN_MM + NECK_DR_MM - CORK_GAP_MM if r is None else r + NECK_DR_MM
        zz = z + TOP_DZ_MM + CORK_TOP_DZ_MM * _smooth(zl, CORK[-1][1], z)
        r, zz = bu(r), bu(zz)
        ring = []
        for th in THETAS:
            x, y = rs_point(r * 1.004, r * 0.996, r, th) if zz > LIP_TOP + 0.05 else rs_point(r, r, r, th)
            zt = zz + (0.012 * x / bu(14.0)) * _smooth(CORK_TOP - 0.2, CORK_TOP - 0.05, zz)   # top cut a little out of square
            ring.append((x, y, zt + BASE_Z))
        rings.append(ring)
    return rings

def build_jar():
    """Hide the master's glass, cork and fill; build glass and cork after the photo. Returns the interior."""
    empty = D.objects[PRODUCT_EMPTY]
    for name in OLD_OBJECTS:
        if name in D.objects:
            _hide(D.objects[name])
    rings = [_ring(*p) for p in _outer_profile()]
    glass = _loft(GLASS_NAME, rings, bu(PUSHUP_MM), IN_FLOOR, glass_material(), empty)
    cork = _loft(CORK_NAME, _cork_rings(), bu(CORK[0][1] + TOP_DZ_MM), CORK_TOP + 0.0002,
                 cork_material(), empty)
    bpy.context.view_layer.update()
    _seat_labels(empty)
    _fit_seal(empty, [glass, cork])
    bpy.context.view_layer.update()
    for k, v in check_jar(glass, cork).items():
        print('JARCHECK', k, v, flush=True)
    return interior()

def interior():
    r4 = lambda v: round(v, 4)
    return {
        'mm_per_bu': r4(MM_PER_BU),
        'inner_half_width': IN_HALF,
        'inner_corner_radius': IN_CORNER_R,
        'inner_floor_z': r4(IN_FLOOR + BASE_Z),
        'inner_floor_fillet': IN_FLOOR_FILLET,
        'inner_shoulder_z': r4(IN_SHOULDER + BASE_Z),
        'neck_inner_radius': r4(NECK_IN_R),
        'label_bottom_z': r4(LABEL_BOTTOM + BASE_Z),
        'label_top_z': r4(LABEL_TOP + BASE_Z),
        'fill_top_z': r4(LABEL_TOP + BASE_Z),
    }

# =========================================================================== checks
def _bvh_world(ob, deps):
    ev = ob.evaluated_get(deps)
    me = ev.to_mesh()
    bm = bmesh.new(); bm.from_mesh(me); bm.transform(ob.matrix_world)
    tree = BVHTree.FromBMesh(bm); bm.free(); ev.to_mesh_clear()
    return tree

def _self_intersections(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.faces.ensure_lookup_table()
    tree = BVHTree.FromBMesh(bm)
    fv = [set(v.index for v in f.verts) for f in bm.faces]
    n = sum(1 for a, b in tree.overlap(tree) if a < b and not (fv[a] & fv[b]))
    bm.free()
    return n

def check_jar(glass, cork):
    deps = bpy.context.evaluated_depsgraph_get()
    rep = {}
    for ob in (glass, cork):
        bm = bmesh.new(); bm.from_mesh(ob.data)
        bad = sum(1 for e in bm.edges if not e.is_manifold)
        vol = bm.calc_volume(signed=True)
        rep[ob.name.split(' |')[0] + '_closed'] = 'non-manifold edges %d, signed volume %.3f BU3 (%s), self-intersections %d' % (
            bad, vol, 'normals out' if vol > 0 else 'NORMALS IN', _self_intersections(ob))
        bm.free()
    # inner surface against the exact rounded square of jar-interior.json
    dev = 0.0; n = 0
    zlo, zhi = IN_FLOOR + IN_FLOOR_FILLET + BASE_Z - 1e-6, IN_SHOULDER + BASE_Z + 1e-6
    me = glass.data
    for v in me.vertices:
        x, y, z = v.co
        if zlo <= z <= zhi and rs_sdf(x, y, IN_HALF, 1) > -0.4 and abs(rs_sdf(x, y, IN_HALF, IN_CORNER_R)) < 0.1:
            dev = max(dev, abs(rs_sdf(x, y, IN_HALF, IN_CORNER_R))); n += 1
    sag = 0.0       # chord sag between neighbouring inner vertices (the surface between vertices is flat)
    ring = [rs_point(IN_HALF, IN_HALF, IN_CORNER_R, t) for t in THETAS]
    for i in range(len(ring)):
        a, b = ring[i], ring[(i + 1) % len(ring)]
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        sag = max(sag, abs(rs_sdf(m[0], m[1], IN_HALF, IN_CORNER_R)))
    floor = [v.co.z for v in me.vertices if abs(v.co.z - (IN_FLOOR + BASE_Z)) < 0.02 and abs(v.co.x) < 1.6 and abs(v.co.y) < 1.6]
    rep['inner_wall'] = 'max vertex deviation %.5f BU over %d vertices, max chord sag %.5f BU' % (dev, n, sag)
    rep['inner_floor'] = 'z %.4f..%.4f (target %.4f)' % (min(floor), max(floor), IN_FLOOR + BASE_Z)
    floor_ob = D.objects.get('Studio floor')
    zmin = min((glass.matrix_world @ v.co).z for v in me.vertices)
    fz = floor_ob.matrix_world.translation.z if floor_ob else 0.0
    rep['ground'] = 'lowest glass point world z %.5f, floor z %.5f, gap %.5f BU' % (zmin, fz, zmin - fz)
    tg = _bvh_world(glass, deps); tc = _bvh_world(cork, deps)
    rep['glass_x_cork'] = len(tg.overlap(tc))
    zl, zh = bu(49.5 + TOP_DZ_MM) + BASE_Z, bu(53.0 + TOP_DZ_MM) + BASE_Z   # straight bore
    gap = min(tg.find_nearest(cork.matrix_world @ v.co)[3] for v in cork.data.vertices if zl < v.co.z < zh)
    rep['cork_contact_gap'] = '%.4f BU (%.3f mm)' % (gap, gap * MM_PER_BU)
    hits = {}
    for ob in D.objects[PRODUCT_EMPTY].children_recursive:
        if ob in (glass, cork) or ob.hide_render or ob.type not in ('MESH', 'CURVE', 'FONT'):
            continue
        try:
            t = _bvh_world(ob, deps)
        except Exception:
            continue
        k = len(t.overlap(tg)) + len(t.overlap(tc))
        if k:
            hits[ob.name] = k
    rep['other_intersections'] = hits or 'none'
    for ob in D.objects[PRODUCT_EMPTY].children:
        if ob.type == 'MESH' and 'LABEL |' in ob.name and not ob.hide_render:
            ev = ob.evaluated_get(deps); me2 = ev.to_mesh()
            d = [tg.find_nearest(ob.matrix_world @ v.co)[3] for v in me2.vertices]
            ev.to_mesh_clear()
            rep['gap ' + ob.name[:20]] = 'label to glass %.4f..%.4f BU' % (min(d), max(d))
    return rep

# =========================================================================== render
def tune_render_for_glass(scene, bounce_scale=1.0, world_glossy=0.35):
    """Light paths for thick glass. Cameras, paths and lights stay as they are."""
    c = scene.cycles
    s = bounce_scale
    c.max_bounces = int(max(c.max_bounces, 48) * s)
    c.transmission_bounces = int(max(c.transmission_bounces, 48) * s)
    c.glossy_bounces = int(max(c.glossy_bounces, 48) * s)
    c.transparent_max_bounces = int(max(c.transparent_max_bounces, 16) * s)
    c.diffuse_bounces = int(max(c.diffuse_bounces, 4) * s)
    c.volume_bounces = max(c.volume_bounces, 0)
    c.caustics_refractive = True      # the glass throws a lighter, focused shadow (E4)
    c.caustics_reflective = True
    c.blur_glossy = 0.5               # keeps the caustic paths from turning into fireflies
    if c.sample_clamp_indirect == 0 or c.sample_clamp_indirect > 12:
        c.sample_clamp_indirect = 12
    # The uniform bright world was mirrored as a milky veil over the glass. Glossy rays see it dimmed;
    # camera, diffuse and transmission rays see it as before, so the set lighting does not change.
    w = scene.world
    if w and w.use_nodes and world_glossy < 1.0 and 'RS glossy veil' not in w.node_tree.nodes:
        nt = w.node_tree
        outn = next(n for n in nt.nodes if n.type == 'OUTPUT_WORLD')
        src = outn.inputs['Surface'].links[0].from_socket if outn.inputs['Surface'].links else None
        if src is not None:
            lp = nt.nodes.new('ShaderNodeLightPath')
            dim = nt.nodes.new('ShaderNodeBackground'); dim.name = 'RS glossy veil'
            bg = next((n for n in nt.nodes if n.type == 'BACKGROUND' and n != dim), None)
            if bg:
                if bg.inputs['Color'].links:
                    nt.links.new(bg.inputs['Color'].links[0].from_socket, dim.inputs['Color'])
                dim.inputs['Color'].default_value = bg.inputs['Color'].default_value
                dim.inputs['Strength'].default_value = bg.inputs['Strength'].default_value * world_glossy
            mix = nt.nodes.new('ShaderNodeMixShader')
            nt.links.new(lp.outputs['Is Glossy Ray'], mix.inputs['Fac'])
            nt.links.new(src, mix.inputs[1]); nt.links.new(dim.outputs['Background'], mix.inputs[2])
            nt.links.new(mix.outputs['Shader'], outn.inputs['Surface'])
