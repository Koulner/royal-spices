"""Royal Spices V1 - paper seal strip after the photo (T-20261008-04).

Replaces the master's seal (strip, "SPICES" print, ivory botanical mark) by a matt paper strip that
stands as a loop over the cork, as in the photo safran-glaeser-real.jpg (measured at the solved pose):
  * glued flat on the front face, the front end 8 mm under the label's top edge (the label lies on it),
  * leaves the glass tangentially at the shoulder round and rises almost upright in front of neck and lip,
  * turns over in a wide rounded loop with a nearly flat roof ~5.4 mm above the cork top,
  * mirrored down the back face (glued there as well).
Print: "SPICES" along the strip on the front loop (read top-down, letter tops towards +x), the outline
twig mark upright on the front leg, "ROYAL" on the back loop. The print is thin geometry lying on the
strip surface, so it follows every bend and stays sharp at any resolution.

Call after product_jar.build_jar():  product_seal.build_seal(interior)
Coordinates below: mm, x to the right, z up from the glass bottom, yb = depth behind the front face.
"""
import bpy, bmesh
from math import sin, cos, pi, radians, sqrt
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.geometry import interpolate_bezier
import product_jar as J

# --------------------------------------------------------------------------- colours
SEAL_COLOR = '#19201b'      # client decision 09.10.: dark green; #3d493c (08.10.) rendered twice as bright as the photo
PRINT_COLOR = '#d4c89f'
SEAL_ROUGHNESS = 0.80       # uncoated paper: no plastic sheen
SEAL_SPECULAR = 0.10        # IOR level: dull paper highlight
SEAL_SHEEN = 0.04           # soft fibre sheen at grazing angles
PRINT_ROUGHNESS = 0.55
FIBRE_BUMP = 0.035          # paper structure (bump strength)

# --------------------------------------------------------------------------- measured in the photo
STRIP_W_MM = 18.1           # edges 498 / 561.5 px on the front face -> 0.411 x label width 44 mm
STRIP_X_MM = -0.25          # centre offset of the strip
STRIP_T = 0.008             # BU (0.095 mm); <= 0.010 under the label (label back at 0.013)
GLUE = 0.0015               # BU, back of the strip to the glass where it is glued
from product_label import GLUE_BU as LABEL_GLUE   # BU, back of the label in front of the nominal face
LABEL_CLEAR = 0.0010        # BU, kept free between strip and label back. The glass front bulges up to
                            # 0.008 BU over the nominal face, so under the label the strip is pressed thinner there
MIN_T = 0.0015              # BU, thinnest strip under the label (where the glass bulges most)
LABEL_TOP_MM = 41.82        # label top edge (local z 3.595)
OVERLAP_MM = 8.0            # strip end under the label (hidden in the photo, chosen)
YC_MM = J.OUT_HALF_Y_MM     # jar centre behind the front face
# free loop, back surface of the strip (yb, z), front half; read from both strip edges at the pose
LOOP_FRONT = [(0.25, 48.0), (0.9, 54.0), (2.3, 61.0), (5.3, 68.0), (9.3, 72.2), (14.4, 76.2), (20.2, 77.15)]
LOOP_APEX_Z = 77.10         # roof at the jar centre (cork top 71.86 -> loop 5.4 mm above the cork)
BACK_SKEW = (0.45, -1.30)   # back half a little wider and its roof lower (photo silhouette; paper is never symmetric)
SHOULDER_LEAVE_DEG = 7.0    # the strip leaves the shoulder round after this angle
# irregular bending of the free paper (mm / degrees)
DRIFT_MM = 0.30             # lateral drift of the free loop
TWIST_DEG = 1.6             # twist about the strip axis
CUP_MM = 0.14               # cupping across the width
# print, positions along the strip from the photo
SPICES_TOP_YB = 17.8        # text starts on the roof here ...
SPICES_END_Z = 63.4         # ... and ends on the front leg at this height
SPICES_TRACK = 0.86         # letter spacing
MARK_Z = (46.8, 60.7)       # outline twig mark: bottom and top on the front leg
MARK_X_MM = 0.0
PRINT_LIFT = 0.0004         # BU, print above the strip surface (no z-fighting, does not float)

SEAL_OBJ = 'SEAL | paper loop after photo'
PRINT_OBJ = 'SEAL PRINT | SPICES, ROYAL and twig mark'
MASTER_HIDE = ('SEAL | fitted charcoal strip', 'Seal print | SPICES')
MASTER_MARK_MAT = 'Seal | ivory botanical mark'
MASTER_FONT_OBJ = 'Seal print | SPICES'

D = bpy.data
MPB = J.MM_PER_BU
NV = 14                     # vertices across the strip
STEP_MM = 0.25              # vertex spacing along the strip


def _lin(hexcol):
    h = hexcol.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)


def _smooth(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def _local(x, yb, z):
    """mm (x, depth, height) -> product-empty local BU."""
    return Vector((x / MPB, -J.OUT_HALF_Y + yb / MPB, z / MPB + J.BASE_Z))


# =========================================================================== centre line
def _profile_points():
    """Control points (yb, z) of the strip back from the front end over the loop to the back end."""
    z0 = LABEL_TOP_MM - OVERLAP_MM
    zw = J.OUT_WALL_TOP_MM
    R = J.OUT_SHOULDER_R_MM
    front = [(0.0, z0 + k * (zw - z0) / 6) for k in range(7)]
    front += [(R * (1 - cos(radians(a))), zw + R * sin(radians(a))) for a in (2.5, 5.0, SHOULDER_LEAVE_DEG)]
    front += LOOP_FRONT
    back = [(2 * YC_MM - yb + BACK_SKEW[0] * _smooth(46, 70, z), z + BACK_SKEW[1] * _smooth(50, 72, z))
            for yb, z in reversed(front)]
    return front + [(YC_MM + 0.6, LOOP_APEX_Z)] + back     # roof apex a hair behind the centre


def _catmull(P, per=12):
    out = []
    for i in range(len(P) - 1):
        p0, p1, p2, p3 = P[max(i - 1, 0)], P[i], P[i + 1], P[min(i + 2, len(P) - 1)]
        for k in range(per):
            t = k / per
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t ** 3) for j in (0, 1)))
    out.append(P[-1])
    return out


def _resample(C, step):
    acc = [0.0]
    for a, b in zip(C, C[1:]):
        acc.append(acc[-1] + sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2))
    L = acc[-1]; n = int(L / step) + 1
    out, j = [], 0
    for i in range(n + 1):
        s = L * i / n
        while j < len(acc) - 2 and acc[j + 1] < s:
            j += 1
        t = (s - acc[j]) / max(acc[j + 1] - acc[j], 1e-12)
        out.append((C[j][0] + (C[j + 1][0] - C[j][0]) * t, C[j][1] + (C[j + 1][1] - C[j][1]) * t, s))
    return out, L


class Strip:
    """Sampled strip: back surface point B(i, v), outward normal N(i); s in mm from the front end."""

    def __init__(self, glass_tree, to_local):
        self.C, self.L = _resample(_catmull(_profile_points()), STEP_MM)
        n = len(self.C)
        self.vs = [STRIP_W_MM * (j / (NV - 1) - 0.5) for j in range(NV)]
        z_free = J.OUT_WALL_TOP_MM + J.OUT_SHOULDER_R_MM * sin(radians(SHOULDER_LEAVE_DEG))
        self.B, self.N, self.glued = [], [], []
        for i, (yb, z, s) in enumerate(self.C):
            a, b = self.C[max(i - 1, 0)], self.C[min(i + 1, n - 1)]
            ty, tz = b[0] - a[0], b[1] - a[1]
            l = sqrt(ty * ty + tz * tz) or 1
            ny, nz = -tz / l, ty / l              # left of the travel direction = away from the jar
            # free part weight: 0 where glued (front and back), 1 in the loop
            yb_far = 2 * YC_MM - yb
            f = _smooth(z_free, z_free + 3.0, z) if s < self.L / 2 else _smooth(z_free, z_free + 3.0, z)
            u = s / self.L
            drift = DRIFT_MM * f * (0.7 * sin(pi * u * 1.3 + 0.4) + 0.3 * sin(pi * u * 3.1))
            tw = radians(TWIST_DEG) * f * sin(pi * u * 2.2 + 0.9)
            row = []
            for v in self.vs:
                cup = CUP_MM * f * (1 - (2 * v / STRIP_W_MM) ** 2) * (0.7 + 0.3 * sin(5 * u))
                off = v * sin(tw) - cup
                p = _local(STRIP_X_MM + drift + v, yb + ny * off, z + nz * off)
                row.append(p)
            self.B.append(row)
            self.N.append(Vector((0, ny, nz)))     # mm and BU share the direction
            self.glued.append(1 - f)
        self._snap(glass_tree, to_local)
        self._outer()

    def _outer(self):
        """Outer surface; under the label clamped behind the flat label back (label plane minus LABEL_CLEAR)."""
        ylim = -J.OUT_HALF_Y - LABEL_GLUE + LABEL_CLEAR
        zlim = J.LABEL_TOP + J.BASE_Z + 0.02
        self.O, self.tmin = [], 1.0
        for i, row in enumerate(self.B):
            orow = []
            for j, b in enumerate(row):
                o = b + self.N[i] * STRIP_T
                if b.z < zlim and self.N[i].y < -0.9:          # front face under / at the label
                    if o.y < ylim:
                        o.y = ylim
                    if b.y - o.y < MIN_T:                      # glass bulges: keep MIN_T, back moves to the glass
                        b.y = o.y + MIN_T
                    self.tmin = min(self.tmin, b.y - o.y)
                orow.append(o)
            self.O.append(orow)

    def _snap(self, tree, to_local):
        """Glued rows: back of the strip exactly GLUE in front of the real glass surface."""
        for i, row in enumerate(self.B):
            w = self.glued[i]
            if w <= 0:
                continue
            for j, p in enumerate(row):
                loc, nor, idx, d = tree.find_nearest(p)
                if loc is None:
                    continue
                q = loc + nor.normalized() * GLUE
                row[j] = p.lerp(q, w)
            if w >= 1:   # normal of the glass under the strip centre
                loc, nor, idx, d = tree.find_nearest(row[NV // 2])
                self.N[i] = nor.normalized()

    def outer(self, i, j, h=0.0):
        return self.O[i][j] + self.N[i] * h

    def at(self, s, v, h=0.0):
        """Point on the outer surface at arc length s (mm) and across-position v (mm from the strip centre)."""
        fi = min(max(s / STEP_MM * (len(self.C) - 1) * STEP_MM / self.L, 0), len(self.C) - 1.000001)
        i = int(fi); ti = fi - i
        fj = min(max((v / STRIP_W_MM + 0.5) * (NV - 1), 0), NV - 1.000001)
        j = int(fj); tj = fj - j
        p = lambda a, b: self.O[a][b] + self.N[a] * h
        top = p(i, j).lerp(p(i, j + 1), tj); bot = p(i + 1, j).lerp(p(i + 1, j + 1), tj)
        return top.lerp(bot, ti)

    def s_where(self, test):
        for yb, z, s in self.C:
            if test(yb, z):
                return s
        raise ValueError('no strip sample matches')

    def mesh(self, name, mat):
        n = len(self.B)
        verts = [p for row in self.B for p in row] + [self.outer(i, j) for i in range(n) for j in range(NV)]
        off = n * NV
        idx = lambda i, j, o=0: o + i * NV + j
        faces = []
        for i in range(n - 1):
            for j in range(NV - 1):
                faces.append((idx(i, j), idx(i + 1, j), idx(i + 1, j + 1), idx(i, j + 1)))          # back
                faces.append((idx(i, j, off), idx(i, j + 1, off), idx(i + 1, j + 1, off), idx(i + 1, j, off)))
            for j, o in ((0, 1), (NV - 1, -1)):      # cut edges
                a, b = (idx(i, j), idx(i + 1, j)) if o > 0 else (idx(i + 1, j), idx(i, j))
                faces.append((a, b, b + off, a + off))
        for i, o in ((0, 1), (n - 1, -1)):           # ends
            for j in range(NV - 1):
                a, b = (idx(i, j + 1), idx(i, j)) if o > 0 else (idx(i, j), idx(i, j + 1))
                faces.append((a, b, b + off, a + off))
        me = D.meshes.new(name)
        me.from_pydata([tuple(v) for v in verts], [], faces)
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me); bm.free()
        for p in me.polygons:
            p.use_smooth = True
        uv = me.uv_layers.new(name='strip')
        for poly in me.polygons:      # u along the strip (mm), v across (generated texture space for the fibres)
            for li in poly.loop_indices:
                vi = me.loops[li].vertex_index % off
                uv.data[li].uv = (self.C[vi // NV][2] / 100.0, (self.vs[vi % NV] / STRIP_W_MM + 0.5) * 0.181)
        me.materials.append(mat)
        return me


# =========================================================================== materials
def _paper_material():
    m = D.materials.new('Seal | green uncoated paper after photo')
    m.use_nodes = True
    nt = m.node_tree; P = nt.nodes['Principled BSDF']
    P.inputs['Base Color'].default_value = _lin(SEAL_COLOR)
    P.inputs['Roughness'].default_value = SEAL_ROUGHNESS
    P.inputs['Specular IOR Level'].default_value = SEAL_SPECULAR
    P.inputs['Sheen Weight'].default_value = SEAL_SHEEN
    P.inputs['Sheen Roughness'].default_value = 0.6
    _fibre_bump(nt, P, FIBRE_BUMP)
    return m


def _print_material():
    m = D.materials.new('Seal | ivory print after photo')
    m.use_nodes = True
    nt = m.node_tree; P = nt.nodes['Principled BSDF']
    P.inputs['Base Color'].default_value = _lin(PRINT_COLOR)
    P.inputs['Roughness'].default_value = PRINT_ROUGHNESS
    P.inputs['Specular IOR Level'].default_value = 0.3
    _fibre_bump(nt, P, FIBRE_BUMP * 0.6)
    return m


def _fibre_bump(nt, P, strength):
    """Fine paper structure: stretched noise (fibres along the strip) plus a finer felt grain. No colour change."""
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (25.0, 80.0, 80.0)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 1.0; n1.inputs['Detail'].default_value = 6
    nt.links.new(mp.outputs['Vector'], n1.inputs['Vector'])
    n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 300.0; n2.inputs['Detail'].default_value = 3
    nt.links.new(tc.outputs['Object'], n2.inputs['Vector'])
    mix = nt.nodes.new('ShaderNodeMath'); mix.operation = 'ADD'
    nt.links.new(n1.outputs['Fac'], mix.inputs[0]); nt.links.new(n2.outputs['Fac'], mix.inputs[1])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = strength
    bump.inputs['Distance'].default_value = 0.002
    nt.links.new(mix.outputs['Value'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], P.inputs['Normal'])


# =========================================================================== print
def _subdivide(bm, max_len):
    for _ in range(6):
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        long = [e for e in bm.edges if e.calc_length() > max_len]
        if not long:
            break
        bmesh.ops.subdivide_edges(bm, edges=long, cuts=1, use_grid_fill=True)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])


def _text_2d(body, font, track):
    """Flat filled text as (bmesh, x-range, cap height) in font units, baseline at y 0, centred in x."""
    cu = D.curves.new('tmp_' + body, 'FONT')
    cu.body = body; cu.font = font; cu.size = 1.0; cu.space_character = track
    cu.align_x = 'CENTER'; cu.fill_mode = 'BOTH'; cu.extrude = 0; cu.bevel_depth = 0
    ob = D.objects.new('tmp_' + body, cu); bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.update()
    me = D.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    D.objects.remove(ob); D.curves.remove(cu)
    bm = bmesh.new(); bm.from_mesh(me); D.meshes.remove(me)
    xs = [v.co.x for v in bm.verts]; ys = [v.co.y for v in bm.verts]
    return bm, (min(xs), max(xs)), (min(ys), max(ys))


def _mark_strokes(empty, lift):
    """Polylines (x, z) in BU of the master's seal twig mark, with the placeholder lift of
    product_jar._fit_seal undone, plus the stroke radius."""
    strokes, radius = [], 0.008
    sm = lambda z: lift * _smooth(4.9, 6.0, z)
    def unlift(z):
        lo, hi = z - abs(lift) - 0.01, z + 0.01
        for _ in range(60):
            mid = (lo + hi) / 2
            if mid + sm(mid) < z: lo = mid
            else: hi = mid
        return lo
    for ob in empty.children:
        if ob.type != 'CURVE' or not ob.name.startswith('Botanical mark'):
            continue
        if not any(m and m.name == MASTER_MARK_MAT for m in ob.data.materials):
            continue
        M = ob.matrix_parent_inverse @ ob.matrix_basis
        radius = ob.data.bevel_depth
        for sp in ob.data.splines:
            if sp.type == 'BEZIER':
                bp = list(sp.bezier_points)
                pairs = list(zip(bp, bp[1:])) + ([(bp[-1], bp[0])] if sp.use_cyclic_u else [])
                pts = []
                for a, b in pairs:
                    seg = interpolate_bezier(a.co, a.handle_right, b.handle_left, b.co, 16)
                    pts.extend(seg[1:] if pts else seg)
            else:
                pts = [Vector(p.co[:3]) for p in sp.points]
                if sp.use_cyclic_u: pts.append(pts[0])
            out = []
            for p in pts:
                q = Vector(p); q.z = unlift(q.z); q = M @ q
                out.append((q.x, q.z))
            strokes.append(out)
    return strokes, radius


def _stroke_bm(strokes, radius):
    """Flat ribbons (round joints and caps) around the polylines in the (x, z) plane."""
    bm = bmesh.new()
    for pl in strokes:
        pts = [Vector((x, z)) for x, z in pl]
        clean = [pts[0]]
        for p in pts[1:]:
            if (p - clean[-1]).length > radius * 0.3:
                clean.append(p)
        pts = clean
        if len(pts) < 2:
            continue
        L, R = [], []
        for k, p in enumerate(pts):
            a, b = pts[max(k - 1, 0)], pts[min(k + 1, len(pts) - 1)]
            t = (b - a).normalized(); nrm = Vector((-t.y, t.x))
            L.append(p + nrm * radius); R.append(p - nrm * radius)
        vl = [bm.verts.new((p.x, p.y, 0)) for p in L]; vr = [bm.verts.new((p.x, p.y, 0)) for p in R]
        for k in range(len(pts) - 1):
            bm.faces.new((vl[k], vr[k], vr[k + 1], vl[k + 1]))
        for p in (pts[0], pts[-1]):     # round caps / joints closing
            c = bm.verts.new((p.x, p.y, 0))
            ring = [bm.verts.new((p.x + radius * cos(a), p.y + radius * sin(a), 0)) for a in [2 * pi * q / 12 for q in range(12)]]
            for q in range(12):
                bm.faces.new((c, ring[q], ring[(q + 1) % 12]))
    return bm


def _wrap(bm, strip, to_sv, h):
    """Map a flat bmesh (x, y) through to_sv(x, y) -> (s, v) onto the strip, h BU above its surface."""
    for v in bm.verts:
        s, w = to_sv(v.co.x, v.co.y)
        v.co = strip.at(s, w, h)


def _build_print(strip, empty, mat):
    font_ob = D.objects.get(MASTER_FONT_OBJ)
    font = font_ob.data.font if font_ob else D.fonts.load('C:/Windows/Fonts/BASKVILL.TTF', check_existing=True)
    bms = []
    # SPICES: from the roof (yb SPICES_TOP_YB) down the front loop to z SPICES_END_Z, tops towards +x
    s_top = strip.s_where(lambda yb, z: yb >= SPICES_TOP_YB)
    s_end = strip.s_where(lambda yb, z: z >= SPICES_END_Z)
    bm, (x0, x1), (y0, y1) = _text_2d('SPICES', font, SPICES_TRACK)
    k = (s_top - s_end) / (x1 - x0); yc = (y0 + y1) / 2; sm = (s_top + s_end) / 2
    _subdivide(bm, 0.05)
    _wrap(bm, strip, lambda x, y: (sm - x * k, (y - yc) * k), PRINT_LIFT)
    bms.append(bm); cap_mm = (y1 - y0) * k
    # ROYAL on the back loop, mirrored position, read top-down from the back
    bm, (x0, x1), (y0, y1) = _text_2d('ROYAL', font, SPICES_TRACK)
    sm2 = strip.L - sm; yc = (y0 + y1) / 2
    _subdivide(bm, 0.05)
    _wrap(bm, strip, lambda x, y: (sm2 + x * k, -(y - yc) * k), PRINT_LIFT)
    bms.append(bm)
    # twig mark, upright on the front leg
    lift = (J.CORK_TOP + J.BASE_Z) - 6.04 + 0.01          # what product_jar._fit_seal added
    strokes, r = _mark_strokes(empty, lift)
    if strokes:
        zs = [z for pl in strokes for x, z in pl]; xs = [x for pl in strokes for x, z in pl]
        zlo, zhi = min(zs), max(zs); xm = (min(xs) + max(xs)) / 2
        sc = (MARK_Z[1] - MARK_Z[0]) / ((zhi - zlo) * MPB)
        s0 = strip.s_where(lambda yb, z: z >= MARK_Z[0] and yb < YC_MM)
        bm = _stroke_bm(strokes, r)
        _subdivide(bm, 0.05)
        _wrap(bm, strip, lambda x, z: (s0 + (z - zlo) * MPB * sc, MARK_X_MM - STRIP_X_MM + (x - xm) * MPB * sc), PRINT_LIFT * 0.8)
        bms.append(bm)
    out = bmesh.new()
    me = D.meshes.new(PRINT_OBJ)
    for b in bms:
        vm = {v: out.verts.new(v.co) for v in b.verts}
        for f in b.faces:
            try:
                out.faces.new([vm[v] for v in f.verts])
            except ValueError:
                pass
        b.free()
    out.normal_update()
    # all print faces look away from the strip
    for f in out.faces:
        c = f.calc_center_median()
        i = min(range(0, len(strip.C), 4), key=lambda q: (strip.B[q][NV // 2] - c).length_squared)
        if f.normal.dot(strip.N[i]) < 0:
            f.normal_flip()
    out.to_mesh(me); out.free()
    me.materials.append(mat)
    return me, {'spices_s': (round(s_end, 2), round(s_top, 2)), 'spices_cap_mm': round(cap_mm, 2),
                'mark_s0': round(s0, 2) if strokes else None, 'mark_scale': round(sc, 3) if strokes else None}


# =========================================================================== build
def _hide(ob):
    ob.hide_render = True; ob.hide_viewport = True


def build_seal(interior=None):
    """Hide the master seal (strip, print, ivory mark) and build the paper loop with its print.
    Returns a small report dict (also printed as SEALCHECK lines)."""
    if J.JAR_SHAPE == 'ref1910':
        return build_seal_1910(interior)
    empty = D.objects[J.PRODUCT_EMPTY]
    glass = D.objects[J.GLASS_NAME]; cork = D.objects[J.CORK_NAME]
    to_local = empty.matrix_world.inverted() @ glass.matrix_world
    bm = bmesh.new(); bm.from_mesh(glass.data); bm.transform(to_local)
    gtree = BVHTree.FromBMesh(bm); bm.free()
    strip = Strip(gtree, to_local)
    seal = D.objects.new(SEAL_OBJ, strip.mesh(SEAL_OBJ, _paper_material()))
    pme, info = _build_print(strip, empty, _print_material())
    prn = D.objects.new(PRINT_OBJ, pme)
    for ob in (seal, prn):
        empty.users_collection[0].objects.link(ob)
        ob.parent = empty
    for name in MASTER_HIDE:
        if name in D.objects:
            _hide(D.objects[name])
    for ob in empty.children:
        if ob.type == 'CURVE' and ob.name.startswith('Botanical mark') and \
                any(m and m.name == MASTER_MARK_MAT for m in ob.data.materials):
            _hide(ob)
    bpy.context.view_layer.update()
    rep = dict(info)
    rep['length_mm'] = round(strip.L, 1)
    rep['thinnest_under_label_BU'] = round(strip.tmin, 5)
    rep.update(check_seal(seal, prn, glass, cork, empty))
    for k, v in rep.items():
        print('SEALCHECK', k, v, flush=True)
    return rep


# =========================================================================== checks
def _tree_local(ob, empty):
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.transform(empty.matrix_world.inverted() @ ob.matrix_world)
    t = BVHTree.FromBMesh(bm); bm.free(); return t


def check_seal(seal, prn, glass, cork, empty):
    rep = {}
    ts, tg, tc, tp = (_tree_local(o, empty) for o in (seal, glass, cork, prn))
    rep['seal_x_glass'] = len(ts.overlap(tg)); rep['seal_x_cork'] = len(ts.overlap(tc))
    rep['print_x_glass_cork'] = len(tp.overlap(tg)) + len(tp.overlap(tc))
    bm = bmesh.new(); bm.from_mesh(seal.data); bm.faces.ensure_lookup_table()
    fv = [set(v.index for v in f.verts) for f in bm.faces]
    rep['seal_self'] = sum(1 for a, b in ts.overlap(ts) if a < b and not (fv[a] & fv[b]))
    rep['seal_manifold'] = all(e.is_manifold for e in bm.edges)
    bm.free()
    M = empty.matrix_world.inverted() @ seal.matrix_world
    me = seal.data
    n = len(me.vertices) // 2
    dg = [tg.find_nearest(M @ me.vertices[i].co)[3] for i in range(n)]
    dc = [tc.find_nearest(M @ me.vertices[i].co)[3] for i in range(len(me.vertices))]
    zs = [(M @ me.vertices[i].co).z for i in range(n)]
    glued = [d for d, z in zip(dg, zs) if z < J.bu(J.OUT_WALL_TOP_MM) + J.BASE_Z]
    rep['min_dist_glass_BU'] = round(min(dg), 5)
    rep['glued_gap_BU'] = '%.5f..%.5f' % (min(glued), max(glued))
    rep['min_dist_cork_BU'] = round(min(dc), 4)
    # loop height: strip back above the cork top, at the roof
    cz = J.CORK_TOP + J.BASE_Z
    roof = max(zs); rep['roof_above_cork_mm'] = round((roof - cz) * MPB, 2)
    # front end under the label
    zend = min(zs)
    rep['front_end_z_local'] = round(zend, 4)
    rep['front_end_under_label_mm'] = round((J.LABEL_TOP + J.BASE_Z - zend) * MPB, 2)
    rep['thickness_BU'] = STRIP_T
    ylab = -J.OUT_HALF_Y - LABEL_GLUE
    under = [M @ v.co for v in me.vertices if (M @ v.co).z < J.LABEL_TOP + J.BASE_Z and (M @ v.co).y < 0]
    rep['under_label_front_min_gap_to_label_plane_BU'] = round(min(p.y - ylab for p in under), 5)
    rep['under_label_back_min_gap_to_glass_BU'] = round(min(tg.find_nearest(M @ me.vertices[i].co)[3]
        for i in range(n) if (M @ me.vertices[i].co).z < J.LABEL_TOP + J.BASE_Z and (M @ me.vertices[i].co).y < 0), 5)
    hits = {}
    for ob in empty.children_recursive:
        if ob in (seal, prn, glass, cork) or ob.hide_render or ob.type not in ('MESH', 'CURVE', 'FONT'):
            continue
        try:
            dg_ = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg_); m2 = ev.to_mesh()
            b2 = bmesh.new(); b2.from_mesh(m2); b2.transform(empty.matrix_world.inverted() @ ob.matrix_world)
            t2 = BVHTree.FromBMesh(b2); b2.free(); ev.to_mesh_clear()
        except Exception:
            continue
        k = len(t2.overlap(ts)) + len(t2.overlap(tp))
        if k:
            hits[ob.name] = k
    rep['other_objects_x_seal'] = hits or 'none'
    pm = prn.data
    Mp = empty.matrix_world.inverted() @ prn.matrix_world
    dp = [ts.find_nearest(Mp @ v.co)[3] for v in pm.vertices]
    rep['print_to_strip_BU'] = '%.5f..%.5f' % (min(dp), max(dp))
    return rep

# =========================================================================== band for JAR_SHAPE 'ref1910' (T-20261022-10)
# ref-glas-1910.webp, G4/G5: glued dark green paper band. Flat on the cork top, taut over cork side, lip and neck (convex
# outline of glass + cork), glued from the shoulder down the front face, semicircular tip in front of the label top edge.
# Print from label-assets: logo-band.png on the front, zeichen-oben.png on the top, gold metallic. build_seal() branches
# here for 'ref1910'; everything above (SEAL_*, STRIP_*, LOOP_*, SPICES_*, MARK_*) is the unchanged 'photo' path.
import os
import numpy as np
from math import hypot

SEAL1910_W_MM = 14.42           # ref edges: neck 196.49 / 319.00 px, glass 194.68 / 318.00 px (448.6 px per B = 52.68 mm)
SEAL1910_X_MM = 0.0             # centre offset (ref centre +0.04 mm)
SEAL1910_TIP_Z_MM = 55.13       # lowest point of the round tip over the glass bottom (ref band_spitze y 357.46)
SEAL1910_BACK_END_MM = 63.3     # back end on the back shoulder (not seen, no print)
SEAL1910_Z0_MM = 50.0           # outline sampling starts here
SEAL1910_GLUE_TOP_MM = 61.7     # below: glued to the glass face vertex by vertex; above: taut convex outline
SEAL1910_TAUT_TOP_MM = 74.8     # 2b1 (T-20261022-14): taut (convex hull) only up to the lip foot (lip face yb 4.05 at z 74.8); above: contour of lip and cork. New; before: hull over everything
SEAL1910_POLAR_C_MM = 70.0      # 2b1: contour read in polar steps around (YC_MM, this z); glass + cork profile is star shaped from here
SEAL1910_POLAR_STEP = 0.03      # 2b1: deg per contour sample (about 0.01-0.05 mm on lip and cork)
SEAL1910_BEND_R_MM = 0.5       # 2b1: paper bending radius, closes the groove between cork side and lip top (new)
SEAL1910_LABEL_TOP_MM = 62.16   # new label top edge 0.117 + 1.063 B (T-20261022-11)
SEAL1910_LABEL_GAP = 0.0245     # BU, band back in front of the glass front up to the label top (label front <= 0.0225 BU)
SEAL1910_LABEL_RAMP_MM = (0.4, 2.4)   # above the label top the gap returns to GLUE over this height
SEAL1910_NV = 25                # vertices across the band
SEAL1910_STEP_MM = 0.10         # row spacing along the band (0.25 cut the corners of the cork profile: 118 overlaps)
SEAL1910_TIP_PHI = 88.0         # deg, outermost column angle on the round tip (keeps the quads non-degenerate)
SEAL1910_COLOR = '#111408'      # 2b2a (T-20261022-14): band/paper 0.138/0.173/0.084 like the ref, AgX-MHC Newton inversion; before '#1a1d0a' (t2214d 0.221/0.266/0.097) after ref band/paper #1f230f/#e0cab2; SEAL_COLOR #19201b rendered grey green #363e36 (t2210a)
SEAL1910_SPECULAR = 0.03        # matt: SEAL_SPECULAR 0.10 plus sheen gave a grey veil (t2210a)
SEAL1910_SHEEN = 0.0
SEAL1910_PRINT_COLOR = '#5a4425'   # gold print fitted to the ref logo #ae884a by inverting AgX (T-20261022-13; '#c19c58'
                                   # rendered #e4cdac in t2210b, '#a17e44' #e1c8a2 in t2212b)
SEAL1910_PRINT_METALLIC = 1.0   # t2210a: 0.75 rendered pale cream #dec5a2
SEAL1910_PRINT_ROUGHNESS = 0.45  # t2210a: 0.35
SEAL1910_PRINT_TINT = SEAL1910_PRINT_COLOR   # F82 edge tint of the metal; default white: t2210b fits render = 0.84 base + 0.33 white (linear)
SEAL1910_MARK_COLOR = '#746444'    # 2b2a2: metal F0 (t2214h '#74643c' rendered #8d7542, B -13 %; t2214g '#715a28' rendered #89672a, B -45 %; AgX inverted), before '#54421d' (dielectric, t2214f #88714c). 2b2a: own setting for the band mark on the top (new; t2214e '#42361c' rendered #75654b; before SEAL1910_PRINT_* like the logo, t2214d
                                   # rendered #525241 against ref #8d754c). Seen ~2 deg over the top plane the metal mirrors the background
                                   # (Fresnel), so diffuse with paper roughness/specular: fit top band L = base * 3.82 + 0.048 (t2214d)
SEAL1910_MARK_METALLIC = 1.0       # 2b2a2: before 0.0 (t2214f); 2b2a: before SEAL1910_PRINT_METALLIC 1.0 (roughness 0.45)
SEAL1910_MARK_ROUGHNESS = 0.80     # 2b2a2 (new; Gm before SEAL_ROUGHNESS 0.80): rough metal catches the lamps over the top, at 0.45 it
                                   # only mirrored the background under the ~2 deg grazing view (t2214d #525241)
SEAL1910_MARK_TINT = SEAL1910_MARK_COLOR   # 2b2a2 (new; Gm before default white): F82 edge tint, keeps the grazing reflex golden
SEAL1910_CAM_B = (20.0, 2.5)    # abgleich camera: distance in front of the front face, height over the glass bottom (B)
SEAL1910_REF = (256.7, 1.84351, 448.6)   # ref px -> projected B: u = (x - 256.7) / 448.6, h = 1.84351 - y / 448.6
SEAL1910_LOGO_PX = (214.61, 301.21, 155.30, 295.09)   # ref gold logo box x0, x1, y0, y1 (logo_* points)
SEAL1910_MARK_PX = (228.7, 284.7)  # 2b2a2: centred on the band (t2214f +10.3 px right) and 56 px wide like the ref after
                                   # zeichenfarbe.cjs (t2214f 70); before (232.0, 302.0) = absolute ref x range. Ref band mark x range (its y 32-49 lies on the top, see SEAL1910_MARK_DEPTH)
SEAL1910_MARK_DEPTH = (0.04, 0.90) # stem / leaf tip on the flat top as fraction of its depth from the front edge
SEAL1910_ASSETS = 'H:/royal-spices/royal-spices-v1/pipeline/blender/label-assets'   # fallback per file
SEAL1910_OBJ = 'SEAL | glued paper band after ref1910'


def _asset1910(name):
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'label-assets', name)
    return p if os.path.exists(p) else os.path.join(SEAL1910_ASSETS, name)


def _alpha_box(img):
    """Normalised box (x0, x1, y0, y1; y from the top) of alpha > 0.5."""
    w, h = img.size
    a = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(a)
    a = a.reshape(h, w, 4)[::-1, :, 3] > 0.5
    ys = np.where(a.any(axis=1))[0]; xs = np.where(a.any(axis=0))[0]
    return xs[0] / w, (xs[-1] + 1) / w, ys[0] / h, (ys[-1] + 1) / h


def _proj1910(x, yb, z):
    """mm (x, depth behind the front face, height) -> projected (u, h) in B on the front plane of the abgleich camera."""
    B = 2 * J.OUT_HALF_MM; D0, Hc = SEAL1910_CAM_B[0] * B, SEAL1910_CAM_B[1] * B
    f = D0 / (D0 + yb)
    return x * f / B, (Hc - (Hc - z) * f) / B


def _px1910(u, h):
    x0, h0, px = SEAL1910_REF
    return x0 + u * px, (h0 - h) * px


def _yb(p):
    return (p.y + J.OUT_HALF_Y) * MPB


def _zm(p):
    return (p.z - J.BASE_Z) * MPB


def _hull_top(pts):
    """Upper convex hull of (yb, z) points, from the front (min yb) over the top to the back."""
    P = sorted(set((round(a, 4), round(b, 4)) for a, b in pts))
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    up = []
    for p in reversed(P):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return up[::-1]


def _outline_1910(tg, tc):
    """Centre line (yb, z in mm, before the glue offset): vertical on the front face from the tip up to
    SEAL1910_GLUE_TOP_MM, then taut (convex hull) up to the lip foot and along the contour of lip and cork above it
    (most outward over the band width) to the back end (2b1; before: taut hull of glass + cork over everything)."""
    hw = SEAL1910_W_MM / 2 + 0.3
    xs = [SEAL1910_X_MM + hw * k / 6.0 for k in range(-6, 7)]

    def cast(o, d):
        best = None
        for t in (tg, tc):
            loc, nor, idx, dist = t.ray_cast(o, d, 10.0)
            if loc is not None and (best is None or dist < best[1]):
                best = (loc, dist)
        return best[0] if best else None
    pts = []
    ytot = 2 * J.OUT_HALF_Y_MM; ztop = J.CORK_TOP * MPB + 1.5
    for k in range(int((ztop - SEAL1910_Z0_MM) / 0.02) + 1):
        z = SEAL1910_Z0_MM + 0.02 * k
        f = [cast(_local(x, -8.0, z), Vector((0, 1, 0))) for x in xs]
        f = [_yb(p) for p in f if p is not None]
        if f:
            pts.append((min(f), z))
        b = [cast(_local(x, ytot + 8.0, z), Vector((0, -1, 0))) for x in xs]
        b = [_yb(p) for p in b if p is not None]
        if b:
            pts.append((max(b), z))
    for k in range(int((ytot + 2.0) / 0.02) + 1):
        yb = -1.0 + 0.02 * k
        t = [cast(_local(x, yb, ztop + 3.0), Vector((0, 0, -1))) for x in xs]
        t = [_zm(p) for p in t if p is not None]
        if t and max(t) >= SEAL1910_Z0_MM:
            pts.append((yb, max(t)))
    # 2b1 (T-20261022-14): until e2c6a62c the whole outline was the convex hull of all samples (H = _hull_top(pts)):
    # one straight run from the shoulder (z 62.4) to the cork top edge (z 89.5), 0.7-0.95 mm in front of the lip and up
    # to 2.8 mm in front of the cork side. Now the hull (taut) only takes the samples up to SEAL1910_TAUT_TOP_MM (lip
    # foot): straight from the shoulder to the lip, no dent towards the neck. Above it the band follows the contour of
    # lip and cork (outermost over the band width), read in polar steps around (YC_MM, SEAL1910_POLAR_C_MM); the outline
    # is the outer of hull and contour in each direction.
    from math import atan2, cos, sin, radians
    Ha = _hull_top([p for p in pts if p[1] <= SEAL1910_TAUT_TOP_MM])
    G, E = SEAL1910_GLUE_TOP_MM, SEAL1910_BACK_END_MM
    itop = max(range(len(Ha)), key=lambda i: Ha[i][1])
    fr = Ha[:itop + 1]
    if fr[0][1] >= G:
        Q = (fr[0][0], G)
    else:
        k = max(i for i in range(len(fr) - 1) if fr[i][1] <= G)
        a, b = fr[k], fr[k + 1]; t = (G - a[1]) / (b[1] - a[1])
        Q = (a[0] + t * (b[0] - a[0]), G)
    cy, cz = YC_MM, SEAL1910_POLAR_C_MM
    A = np.array(Ha[:-1]); Ev = np.array(Ha[1:]) - A; AC = A - np.array([cy, cz])

    def r_hull(dy, dz):                                      # ray from (cy, cz) to the hull polyline
        den = dy * Ev[:, 1] - dz * Ev[:, 0]
        with np.errstate(divide='ignore', invalid='ignore'):
            tt = (AC[:, 0] * Ev[:, 1] - AC[:, 1] * Ev[:, 0]) / den
            uu = (AC[:, 0] * dz - AC[:, 1] * dy) / den
        ok = (np.abs(den) > 1e-12) & (uu >= -1e-9) & (uu <= 1 + 1e-9) & (tt > 0)
        return float(tt[ok].max()) if ok.any() else 0.0

    def r_true(dy, dz):                                      # outermost glass/cork surface over the band width
        best = 0.0
        for x in xs:
            loc = cast(_local(x, cy + 60.0 * dy, cz + 60.0 * dz), Vector((0.0, -dy, -dz)))   # nearest of glass + cork
            if loc is not None:                              # only hits on this side of the centre count
                best = max(best, (_yb(loc) - cy) * dy + (_zm(loc) - cz) * dz)
        return best
    O, th, dth = [], atan2(G - cz, cy - Q[0]), radians(SEAL1910_POLAR_STEP)   # (-cos, sin): 0 front, 90 up, 180 back
    while th < radians(270.0):
        dy, dz = -cos(th), sin(th)
        r = max(r_hull(dy, dz), r_true(dy, dz))
        p = (cy + r * dy, cz + r * dz)
        if th > radians(90.0) and p[1] <= E:
            a = O[-1]; t = (a[1] - E) / (a[1] - p[1])
            O.append((a[0] + t * (p[0] - a[0]), E))
            break
        O.append(p); th += dth
    # 2b1: the paper does not enter the groove between cork side and lip top (0.35-0.6 mm wide; following it put the
    # band into glass and cork, 22/44 overlaps): above the lip foot the outline is closed with SEAL1910_BEND_R_MM
    # (inner envelope of discs of that radius rolled on the outside).
    rho = SEAL1910_BEND_R_MM
    P = np.array(O); V = P - np.array([cy, cz])
    TH = np.unwrap(np.arctan2(V[:, 1], -V[:, 0])); Du = np.stack([-np.cos(TH), np.sin(TH)], 1)
    Rr = V[:, 0] * Du[:, 0] + V[:, 1] * Du[:, 1]
    w = int(np.arcsin(min(rho / Rr.min(), 1.0)) / dth) + 5
    I = np.clip(np.arange(len(P))[:, None] + np.arange(-w, w + 1)[None, :], 0, len(P) - 1)

    def env(Qp, sign):                                       # +1: dilation (max), -1: erosion (min) along each ray
        W = Qp[I] - np.array([cy, cz])
        pr = W[:, :, 0] * Du[:, None, 0] + W[:, :, 1] * Du[:, None, 1]
        pp = np.abs(W[:, :, 0] * Du[:, None, 1] - W[:, :, 1] * Du[:, None, 0])
        val = np.where(pp <= rho, pr + sign * np.sqrt(np.maximum(rho * rho - pp * pp, 0.0)), -sign * np.inf)
        return val.max(1) if sign > 0 else val.min(1)
    Rd = env(P, 1.0)
    Rc = np.maximum(env(np.array([cy, cz]) + Rd[:, None] * Du, -1.0), Rr)
    Rf = np.where(P[:, 1] > SEAL1910_TAUT_TOP_MM - 1.0, Rc, Rr)
    O = [(float(a), float(b)) for a, b in np.array([cy, cz]) + Rf[:, None] * Du]
    chain = [(Q[0], SEAL1910_TIP_Z_MM), Q] + O[1:]
    S = [0.0]
    for a, b in zip(chain, chain[1:]):
        S.append(S[-1] + hypot(b[0] - a[0], b[1] - a[1]))
    n = int(S[-1] / SEAL1910_STEP_MM); step = S[-1] / n
    R = []; j = 0
    for i in range(n + 1):
        s = i * step
        while j < len(S) - 2 and S[j + 1] < s:
            j += 1
        t = min(max((s - S[j]) / max(S[j + 1] - S[j], 1e-9), 0.0), 1.0)
        R.append((chain[j][0] + t * (chain[j + 1][0] - chain[j][0]), chain[j][1] + t * (chain[j + 1][1] - chain[j][1])))
    Nn = []
    for i in range(n + 1):
        a, b = R[max(i - 2, 0)], R[min(i + 2, n)]
        ty, tz = b[0] - a[0], b[1] - a[1]; l = hypot(ty, tz)
        Nn.append((-tz / l, ty / l))
    return R, Nn, step


def _band_mesh_1910(tg, tc):
    R, Nn, step = _outline_1910(tg, tc)
    n = len(R) - 1; NV = SEAL1910_NV; N = n + 1
    half = SEAL1910_W_MM / 2; phim = radians(SEAL1910_TIP_PHI)
    phis = [-phim + 2 * phim * j / (NV - 1) for j in range(NV)]
    xs = [SEAL1910_X_MM + half * sin(p) for p in phis]
    sbot = [half * (1 - cos(p)) for p in phis]          # round tip: bottom edge above the lowest point
    LT, G, T_mm = SEAL1910_LABEL_TOP_MM, SEAL1910_GLUE_TOP_MM, STRIP_T * MPB

    def at(s):
        q = min(max(s / step, 0.0), n - 1e-9); i = int(q); t = q - i
        c = [R[i][k] + t * (R[i + 1][k] - R[i][k]) for k in (0, 1)]
        v = [Nn[i][k] + t * (Nn[i + 1][k] - Nn[i][k]) for k in (0, 1)]
        l = hypot(*v)
        return c, (v[0] / l, v[1] / l)

    def gap_mm(yb, z):
        g = GLUE
        if yb < YC_MM:
            g += (SEAL1910_LABEL_GAP - GLUE) * (1 - _smooth(LT + SEAL1910_LABEL_RAMP_MM[0], LT + SEAL1910_LABEL_RAMP_MM[1], z))
        return g * MPB
    back, front = [], []
    for i in range(N):
        si = i * step
        for j in range(NV):
            s = si if si >= half else sbot[j] + si / half * (half - sbot[j])
            c, nv = at(s)
            g = gap_mm(c[0], c[1])
            yb, z = c[0] + nv[0] * g, c[1] + nv[1] * g
            if c[1] < G and c[0] < YC_MM:                  # glued on the face: follow the glass vertex by vertex
                loc = tg.ray_cast(_local(xs[j], -8.0, c[1]), Vector((0, 1, 0)), 10.0)[0]
                if loc is not None:
                    w = _smooth(G - 0.8, G, c[1])
                    yb = (1 - w) * (_yb(loc) - g) + w * yb
            back.append((xs[j], yb, z)); front.append((xs[j], yb + nv[0] * T_mm, z + nv[1] * T_mm))
    bi = lambda i, j: i * NV + j
    fi = lambda i, j: N * NV + i * NV + j
    F, isfront = [], []
    for i in range(N - 1):
        for j in range(NV - 1):
            F.append((bi(i, j), bi(i, j + 1), bi(i + 1, j + 1), bi(i + 1, j))); isfront.append(False)
            F.append((fi(i, j), fi(i + 1, j), fi(i + 1, j + 1), fi(i, j + 1))); isfront.append(True)
        F.append((bi(i, 0), bi(i + 1, 0), fi(i + 1, 0), fi(i, 0))); isfront.append(False)
        F.append((bi(i, NV - 1), fi(i, NV - 1), fi(i + 1, NV - 1), bi(i + 1, NV - 1))); isfront.append(False)
    for j in range(NV - 1):
        F.append((bi(0, j), fi(0, j), fi(0, j + 1), bi(0, j + 1))); isfront.append(False)
        F.append((bi(N - 1, j), bi(N - 1, j + 1), fi(N - 1, j + 1), fi(N - 1, j))); isfront.append(False)
    return back, front, F, isfront, N


def _band_material_1910(imgs):
    m = D.materials.new('Seal | green paper band with gold print (ref1910)')
    m.use_nodes = True
    nt = m.node_tree; P = nt.nodes['Principled BSDF']; out = nt.nodes['Material Output']
    P.inputs['Base Color'].default_value = _lin(SEAL1910_COLOR)
    P.inputs['Roughness'].default_value = SEAL_ROUGHNESS
    P.inputs['Specular IOR Level'].default_value = SEAL1910_SPECULAR
    P.inputs['Sheen Weight'].default_value = SEAL1910_SHEEN
    P.inputs['Sheen Roughness'].default_value = 0.6
    _fibre_bump(nt, P, FIBRE_BUMP)
    Gd = nt.nodes.new('ShaderNodeBsdfPrincipled')
    Gd.inputs['Base Color'].default_value = _lin(SEAL1910_PRINT_COLOR)
    Gd.inputs['Metallic'].default_value = SEAL1910_PRINT_METALLIC
    Gd.inputs['Roughness'].default_value = SEAL1910_PRINT_ROUGHNESS
    Gd.inputs['Specular Tint'].default_value = _lin(SEAL1910_PRINT_TINT)
    Gm = nt.nodes.new('ShaderNodeBsdfPrincipled')   # 2b2a: band mark with its own gold (before: same Gd as the logo)
    Gm.inputs['Base Color'].default_value = _lin(SEAL1910_MARK_COLOR)
    Gm.inputs['Metallic'].default_value = SEAL1910_MARK_METALLIC
    Gm.inputs['Roughness'].default_value = SEAL1910_MARK_ROUGHNESS   # 2b2a2: before SEAL_ROUGHNESS
    Gm.inputs['Specular Tint'].default_value = _lin(SEAL1910_MARK_TINT)   # 2b2a2: new (before default white)
    Gm.inputs['Specular IOR Level'].default_value = SEAL1910_SPECULAR
    Gm.inputs['Sheen Weight'].default_value = SEAL1910_SHEEN
    if P.inputs['Normal'].is_linked:
        nt.links.new(P.inputs['Normal'].links[0].from_socket, Gm.inputs['Normal'])
    al = []
    for uvname, img in imgs:
        uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = uvname
        tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = img; tx.extension = 'CLIP'; tx.interpolation = 'Cubic'
        nt.links.new(uv.outputs['UV'], tx.inputs['Vector']); al.append(tx.outputs['Alpha'])
    mix = nt.nodes.new('ShaderNodeMixShader')       # logo: paper -> Gd
    nt.links.new(al[0], mix.inputs['Fac'])
    nt.links.new(P.outputs['BSDF'], mix.inputs[1]); nt.links.new(Gd.outputs['BSDF'], mix.inputs[2])
    mk = nt.nodes.new('ShaderNodeMixShader')        # 2b2a mark: (paper | logo) -> Gm; before one MAXIMUM mask of both -> Gd
    nt.links.new(al[1], mk.inputs['Fac'])
    nt.links.new(mix.outputs['Shader'], mk.inputs[1]); nt.links.new(Gm.outputs['BSDF'], mk.inputs[2])
    nt.links.new(mk.outputs['Shader'], out.inputs['Surface'])
    return m


def build_seal_1910(interior=None):
    """'ref1910': hide the master seal and build the glued band with its printed logo and band mark."""
    empty = D.objects[J.PRODUCT_EMPTY]
    glass = D.objects[J.GLASS_NAME]; cork = D.objects[J.CORK_NAME]
    tg, tc = _tree_local(glass, empty), _tree_local(cork, empty)
    back, front, F, isfront, N = _band_mesh_1910(tg, tc)
    me = D.meshes.new(SEAL1910_OBJ)
    me.from_pydata([tuple(_local(*p)) for p in back + front], [], F)
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    imgs = [D.images.load(_asset1910(f), check_existing=True) for f in ('logo-band.png', 'zeichen-oben.png')]
    la, ma = _alpha_box(imgs[0]), _alpha_box(imgs[1])
    x0r, h0r, px = SEAL1910_REF
    lu0, lu1 = (SEAL1910_LOGO_PX[0] - x0r) / px, (SEAL1910_LOGO_PX[1] - x0r) / px
    lh1, lh0 = h0r - SEAL1910_LOGO_PX[2] / px, h0r - SEAL1910_LOGO_PX[3] / px
    mu0, mu1 = (SEAL1910_MARK_PX[0] - x0r) / px, (SEAL1910_MARK_PX[1] - x0r) / px
    ztop = max(p[2] for p in front)
    flat = [p[1] for p in front if p[2] >= ztop - 0.05]
    ybf, ybk = min(flat), max(flat)
    yst, ytp = ybf + SEAL1910_MARK_DEPTH[0] * (ybk - ybf), ybf + SEAL1910_MARK_DEPTH[1] * (ybk - ybf)

    def uv_logo(x, yb, z):                                   # projected like the abgleich camera sees the front
        if yb >= YC_MM:
            return (0.5, 3.0)
        u, h = _proj1910(x, yb, z)
        return (la[0] + (u - lu0) / (lu1 - lu0) * (la[1] - la[0]), 1 - (la[2] + (lh1 - h) / (lh1 - lh0) * (la[3] - la[2])))

    def uv_mark(x, yb, z):                                   # flat on the top, stem to the front
        if z < ztop - 0.25:
            return (0.5, -1.0) if yb < YC_MM else (0.5, 2.0)
        u, h = _proj1910(x, yb, z)
        return (ma[0] + (u - mu0) / (mu1 - mu0) * (ma[1] - ma[0]), 1 - (ma[2] + (ytp - yb) / (ytp - yst) * (ma[3] - ma[2])))
    nb = len(back)
    UL = [uv_logo(*p) for p in front]; UM = [uv_mark(*p) for p in front]
    lay_l = me.uv_layers.new(name='Logo'); lay_m = me.uv_layers.new(name='Mark')
    ll, lm = [], []
    for p in me.polygons:
        for li in p.loop_indices:
            vi = me.loops[li].vertex_index
            if isfront[p.index] and vi >= nb:
                ll += UL[vi - nb]; lm += UM[vi - nb]
            else:
                ll += (-5.0, -5.0); lm += (-5.0, -5.0)
    lay_l.data.foreach_set('uv', ll); lay_m.data.foreach_set('uv', lm)
    me.materials.append(_band_material_1910([('Logo', imgs[0]), ('Mark', imgs[1])]))
    ob = D.objects.new(SEAL1910_OBJ, me)
    empty.users_collection[0].objects.link(ob)
    ob.parent = empty
    for name in MASTER_HIDE:
        if name in D.objects:
            _hide(D.objects[name])
    for o in empty.children:
        if o.type == 'CURVE' and o.name.startswith('Botanical mark') and \
                any(m and m.name == MASTER_MARK_MAT for m in o.data.materials):
            _hide(o)
    bpy.context.view_layer.update()
    rep = {'assets': '%s | %s' % (_asset1910('logo-band.png'), _asset1910('zeichen-oben.png')),
           'alpha_box_logo_mark': '%s | %s' % (tuple(round(float(v), 4) for v in la), tuple(round(float(v), 4) for v in ma)),
           'rows_x_cols': '%d x %d' % (N, SEAL1910_NV), 'thickness_BU': STRIP_T}
    rep.update(check_seal_1910(ob, glass, cork, empty, back, front, N, (yst, ytp, ztop, mu0, mu1)))
    for k, v in rep.items():
        print('SEALCHECK', k, v, flush=True)
    return rep


def check_seal_1910(ob, glass, cork, empty, back, front, N, mark):
    rep = {}
    tb, tg, tc = (_tree_local(o, empty) for o in (ob, glass, cork))
    rep['band_x_glass'] = len(tb.overlap(tg)); rep['band_x_cork'] = len(tb.overlap(tc))
    bm = bmesh.new(); bm.from_mesh(ob.data)
    rep['band_manifold'] = all(e.is_manifold for e in bm.edges); bm.free()
    NV = SEAL1910_NV; nb = len(back)
    Pb = [_local(*p) for p in back]
    dg = [tg.find_nearest(p)[3] for p in Pb]; dc = [tc.find_nearest(p)[3] for p in Pb]
    rep['min_back_to_glass_BU'] = round(min(dg), 5); rep['min_back_to_cork_BU'] = round(min(dc), 5)
    rep['min_front_to_glass_cork_BU'] = round(min(min(tg.find_nearest(_local(*p))[3], tc.find_nearest(_local(*p))[3])
                                                  for p in front), 5)
    LT = SEAL1910_LABEL_TOP_MM
    lab = [(dg[k], back[k][2], back[k][1]) for k in range(nb) if back[k][2] <= LT and back[k][1] < YC_MM]
    rep['label_zone_back_gap_BU'] = '%.5f..%.5f' % (min(q[0] for q in lab), max(q[0] for q in lab))
    rep['label_zone_z_mm'] = '%.2f..%.2f' % (min(q[1] for q in lab), max(q[1] for q in lab))
    rep['label_zone_back_yb_mm'] = '%.3f..%.3f (front = back - %.3f)' % (min(q[2] for q in lab), max(q[2] for q in lab),
                                                                         STRIP_T * MPB)
    jc = NV // 2
    rows = []
    for i in range(N):
        k = i * NV + jc
        rows.append((back[k][1], back[k][2], min(dg[k], dc[k]), 'G' if dg[k] <= dc[k] else 'K'))
    itop = max(range(N), key=lambda i: rows[i][1])
    out = []
    for side, z in [('v', z) for z in (56.0, 60.0, 62.8, 64.5, 67.0, 70.9, 74.0, 76.1, 78.5, 82.0, 86.0)] + \
                   [('oben', None)] + [('h', z) for z in (86.0, 78.5, 76.1, 70.9, 64.5)]:
        if side == 'oben':
            i = min(range(N), key=lambda q: abs(rows[q][0] - YC_MM))
        else:
            rng = range(0, itop + 1) if side == 'v' else range(itop, N)
            i = min(rng, key=lambda q: abs(rows[q][1] - z))
        yb, zz, d, w = rows[i]
        out.append('%s z %.2f yb %.2f d %.4f %s' % (side, zz, yb, d, w))
    rep['centre_back_gap_BU'] = ' | '.join(out)
    PF = [_px1910(*_proj1910(*p)) for p in front]

    def edge_at(ypx):
        res = []
        for j in (0, NV - 1):
            cand = [PF[i * NV + j] for i in range(N) if front[i * NV + j][1] < YC_MM]
            res.append(round(min(cand, key=lambda q: abs(q[1] - ypx))[0], 2))
        return res
    rep['pred_px_band_y223_l_r'] = '%s (ref 196.49, 319.00)' % edge_at(223.0)
    rep['pred_px_band_y280_l_r'] = '%s (ref 194.68, 318.00)' % edge_at(280.0)
    cen = [PF[k] for k in range(len(front)) if abs(front[k][0] - SEAL1910_X_MM) < 0.6]
    rep['pred_px_band_spitze_y'] = '%.2f (ref 357.46)' % max(q[1] for q in cen)
    rep['pred_px_band_o_y'] = '%.2f (ref 30.51)' % min(q[1] for q in cen)
    yst, ytp, ztop, mu0, mu1 = mark
    a, b = _px1910(*_proj1910(0, ytp, ztop)), _px1910(*_proj1910(0, yst, ztop))
    rep['pred_px_mark'] = 'x %.1f..%.1f y %.1f..%.1f (ref x 232..302 y 32..49)' % (_px1910(mu0, 0)[0], _px1910(mu1, 0)[0], a[1], b[1])
    rep['mark_on_top_yb_mm'] = '%.2f..%.2f (top z %.2f)' % (yst, ytp, ztop)
    hits = {}
    for o in empty.children_recursive:
        if o in (ob, glass, cork) or o.hide_render or o.type not in ('MESH', 'CURVE', 'FONT'):
            continue
        try:
            dg_ = bpy.context.evaluated_depsgraph_get(); ev = o.evaluated_get(dg_); m2 = ev.to_mesh()
            b2 = bmesh.new(); b2.from_mesh(m2); b2.transform(empty.matrix_world.inverted() @ o.matrix_world)
            t2 = BVHTree.FromBMesh(b2); b2.free(); ev.to_mesh_clear()
        except Exception:
            continue
        k = len(t2.overlap(tb))
        if k:
            hits[o.name] = k
    rep['other_objects_x_band'] = hits or 'none'
    return rep
