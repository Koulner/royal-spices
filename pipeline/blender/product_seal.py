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
