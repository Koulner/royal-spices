"""Royal Spices - saffron fill in Blender: builds the packed threads from the cache of saffron_pack.py and gives
the fill and the loose threads in front of the jar one shared material (dried Negin tissue).

Blender (web_hero.py, after setup_scene() and product_jar):
    import saffron_fill
    saffron_fill.build_fill()            # hides the master fill, builds the new one under the product empty
    saffron_fill.retint_loose_threads()  # loose threads from add_threads() get the same material

build_fill() also builds the hidden core (build_core, CORE_ON): a closed deep red body behind the threads, so the fill
reads as an opaque mass; the threads stay the surface and lie in front of it at the glass.
No packing code here: geometry and cache come from saffron_pack.py in the same folder.
"""
import json, os
import numpy as np
import saffron_pack as sp

EMPTY = 'PRODUCT | Royal Spices 0.5g'
OLD_FILL = 'SAFFRON | 1050 dry filaments'
FILL = 'SAFFRON | dried negin threads'
MATERIAL = 'Saffron | dried negin tissue (fill and loose threads)'
LOOSE_PREFIX = 'THREAD | dried stigma'
# translucency (closed band: acts at two surfaces): colour body/edge, share body/edge, rs_edge where the ramp starts
TRANS_BODY, TRANS_EDGE = (0.60, 0.06, 0.02, 1), (0.85, 0.26, 0.05, 1)
TRANS_MIN, TRANS_MAX, TRANS_FROM = 0.22, 0.85, 0.45
# surface: lengthwise ridges per mm, bump strength, roughness floor (+0..0.22 on ridges), specular level (0.5 = 4 % F0)
GROOVE_PER_MM, BUMP, ROUGH_BASE, SPEC = 10.0, 0.6, 0.38, 0.35
_MPB = 11.8637                 # mm per BU of the fill last built (loose threads use the same scale)
# hidden core (T-20261010-01): a closed body behind the packed threads, so the fill reads as one opaque mass.
# The threads stay the visible surface and lie in front of it at the glass; threads may cut it (hidden parts).
CORE = 'SAFFRON | hidden core (dark mass)'
CORE_MATERIAL = 'Saffron | hidden core (dark mass)'
CORE_ON = True                 # False: threads only, as before
CORE_INSET = 0.17              # BU from the inner glass walls (2.0 mm): room for the threads in front of the core
CORE_INSET_EDGE, CORE_RAMP = 0.035, 0.3   # inset at the vertical glass edges, ramp length along the wall (BU)
CORE_FLOOR = 0.03              # BU above the inner floor (the bottom is hardly seen; keeps the floor band closed)
CORE_UNDER = 0.08              # top at least this far below the highest thread point of every 0.1 BU column
CORE_SMOOTH = 0.03             # smoothed top lies this much lower again (clamped by CORE_UNDER where it dips)
CORE_REACH = 0.085             # > plan size of every top face (< 0.1): columns within this distance bound a vertex
CORE_MIN_T = 0.03              # least height of the top over the bottom (deep holes in the thread surface)
CORE_N, CORE_DR = 512, 0.035   # points per ring, ring spacing (BU) on the top and bottom caps
CORE_SPEC, CORE_ROUGH = 0.15, (0.75, 0.55)  # matt, fibres slightly waxy (roughness body, fibre)
# Deep red, not red black (T-20261018-03, glass test c2): it is seen in the gaps between the threads, and the
# black there made the fill read dark through the glass. Was (0.010, ...), (0.035, ...), (0.090, ...) x 3.0 (T-20261015-02).
CORE_DARK, CORE_MID, CORE_LIGHT = (0.20, 0.015, 0.005, 1), (0.40, 0.035, 0.009, 1), (0.60, 0.06, 0.015, 1)
CORE_GAIN = 1.0                # factor on the three core colours


def _gain(c, g):
    return tuple(v * g for v in c[:3]) + (1,)


# --------------------------------------------------------------------------- hidden core (numpy only)
def column_heights(data, sp_=0.008):
    """Highest thread point per 0.1 BU column (grid as saffron_pack.measure / D6); nan where no thread passes."""
    I = data['interior']; a = I['inner_half_width']; m = int(np.ceil(2 * a / sp.COL - 1e-9))
    P = np.concatenate([sp._world_samples(t, I['mm_per_bu'], sp_) for t in data['threads']])
    ci = np.clip(((P[:, :2] + a) / sp.COL).astype(np.int64), 0, m - 1)
    H = np.full((m, m), -np.inf); np.maximum.at(H, (ci[:, 0], ci[:, 1]), P[:, 2])
    H[np.isinf(H)] = np.nan
    return H


def _ring(n, h, r):
    """n points of a rounded square (half width h, corner radius r) on rays from the centre (star parametrisation),
    with the outward normals."""
    phi = (np.arange(n) + 0.5) * 2 * np.pi / n; u = np.stack([np.cos(phi), np.sin(phi)], 1)
    p = u * (h / np.abs(u).max(1))[:, None]                                   # on the square
    nrm = np.where((np.abs(u[:, 0]) >= np.abs(u[:, 1]))[:, None], np.stack([np.sign(u[:, 0]), 0 * u[:, 0]], 1),
                   np.stack([0 * u[:, 1], np.sign(u[:, 1])], 1))
    k = (np.abs(p) > h - r).all(1)                                             # in a corner: on the arc
    if r > 0 and k.any():
        c = np.sign(u[k]) * (h - r); uc = (u[k] * c).sum(1)
        p[k] = u[k] * (uc + np.sqrt(np.maximum(uc * uc - (c * c).sum(1) + r * r, 0)))[:, None]
        nrm[k] = (p[k] - c) / r
    return p, nrm


def core_inset(P, a, rc):
    """Inset of the core wall from the glass at plan points P: CORE_INSET on the flat walls, down to CORE_INSET_EDGE
    at the vertical glass edges (smoothstep over CORE_RAMP), so that grazing rays near an edge meet the core."""
    ax, ay = np.abs(P[:, 0]), np.abs(P[:, 1])
    e = np.clip((a - rc) - np.where(ax >= ay, ay, ax), 0, None)               # distance to the corner arc along the wall
    w = np.clip(e / CORE_RAMP, 0, 1); w = w * w * (3 - 2 * w)
    return CORE_INSET_EDGE + (CORE_INSET - CORE_INSET_EDGE) * w


def core_mesh(data, H=None):
    """Closed core as rings around the jar axis (star parametrisation): flat bottom CORE_FLOOR above the floor, then
    along the floor fillet at the same gap, walls core_inset() from the glass, top = smoothed column heights lowered
    by CORE_UNDER + CORE_SMOOTH, clamped per vertex so that every 0.1 BU column it can touch keeps its highest thread
    point CORE_UNDER above the core. Caps are radially scaled copies of their rim. Returns V (n,3), polygons, H."""
    I = data['interior']; a, rc, zf, rf = (I[k] for k in ('inner_half_width', 'inner_corner_radius', 'inner_floor_z',
                                                          'inner_floor_fillet'))
    H = column_heights(data) if H is None else H
    m = H.shape[0]; col = sp.COL; i_f = CORE_FLOOR
    # bound per column. Empty columns: no core inside the inner columns (those wholly inside the glass, as in D6);
    # edge columns that the glass cuts may stay empty of threads (corners), the core may reach into them there.
    cc = -a + (np.arange(m) + 0.5) * col; inner = sp._sd(cc[:, None] + 0 * cc[None, :], cc[None, :] + 0 * cc[:, None], a, rc) < -col * 0.7072
    lim = np.where(np.isnan(H), np.where(inner, -np.inf, np.inf), H - CORE_UNDER)
    Hf = np.where(np.isnan(H), np.nanmedian(H), H); s = Hf.copy()
    for _ in range(2):                                                         # 2 x box blur 3x3 of the column heights
        q = np.pad(s, 1, mode='edge'); s = np.mean([q[i:i + m, j:j + m] for i in range(3) for j in range(3)], 0)
    s -= CORE_UNDER + CORE_SMOOTH
    zb = zf + i_f; rr = rf - i_f                                               # flat bottom; bottom arc radius

    def zbot(d):                                                               # bottom of the core at inset d
        return np.where(d >= rf, zb, zf + rf - np.sqrt(np.maximum(rr * rr - (rf - d) ** 2, 0)))

    def top(P):
        g = (P + a) / col - 0.5; i0 = np.clip(np.floor(g).astype(int), 0, m - 2); f = np.clip(g - i0, 0, 1)
        sm = (s[i0[:, 0], i0[:, 1]] * (1 - f[:, 0]) * (1 - f[:, 1]) + s[i0[:, 0] + 1, i0[:, 1]] * f[:, 0] * (1 - f[:, 1])
              + s[i0[:, 0], i0[:, 1] + 1] * (1 - f[:, 0]) * f[:, 1] + s[i0[:, 0] + 1, i0[:, 1] + 1] * f[:, 0] * f[:, 1])
        return np.maximum(np.minimum(sm, reach(P)), zbot(-sp._sd(P[:, 0], P[:, 1], a, rc)) + CORE_MIN_T)

    def reach(P):                                                              # bound from all columns within CORE_REACH
        c = np.inf
        for ox in (-CORE_REACH, 0.0, CORE_REACH):
            for oy in (-CORE_REACH, 0.0, CORE_REACH):
                ci = np.clip(((P + (ox, oy) + a) / col).astype(int), 0, m - 1)
                c = np.minimum(c, lim[ci[:, 0], ci[:, 1]])
        return c

    def rings(dw):                                                            # all vertices for wall insets dw
        W = G - dw * N                                                             # wall rim in plan
        te = np.arcsin(np.clip((rf - dw) / rr, -1, 1))                             # fillet angle where the wall starts
        zw = zf + rf - rr * np.cos(te[:, 0])                                       # lower edge of the wall
        V = [np.array([[0.0, 0.0, zb]])]                                           # bottom pole
        B = G - rf * N; kb = int(np.ceil(np.abs(B).max() / CORE_DR / 2))
        for k in range(1, kb + 1):                                                 # bottom cap: scaled copies, centre outwards
            V.append(np.column_stack([B * (k / kb), np.full(CORE_N, zb)]))
        for j in range(1, 9):                                                      # along the floor fillet to the wall
            t = te * j / 8; d = rf - rr * np.sin(t)
            V.append(np.column_stack([G - d * N, zf + rf - rr * np.cos(t[:, 0])]))
        zt = top(W); nw = 24
        for k in range(1, nw + 1):                                                 # wall up to the top rim
            V.append(np.column_stack([W, zw + (zt - zw) * k / nw]))
        kt = int(np.ceil(np.abs(W).max() * 1.42 / CORE_DR))
        for k in range(1, kt):                                                     # top cap: scaled copies, rim inwards
            P = W * (1 - k / kt); V.append(np.column_stack([P, top(P)]))
        V.append(np.array([[0.0, 0.0, top(np.zeros((1, 2)))[0]]]))                # top pole
        V = np.concatenate(V)
        return V

    G, N = _ring(CORE_N, a, rc)                                                # glass contour and normals
    dw = core_inset(G, a, rc)[:, None]                                         # wall inset per ring point
    for it in range(60):        # where an empty or very low column near the glass leaves no room: move the wall in
        V = rings(dw); bad = np.zeros(CORE_N, bool)
        jj = (np.nonzero(V[1:-1, 2] > reach(V[1:-1, :2]) + 1e-9)[0]) % CORE_N
        if not len(jj):
            break
        for o in range(-2, 3):
            bad[(jj + o) % CORE_N] = True
        dw[bad] = np.minimum(dw[bad] + 0.01, rf - 0.005)
    core_mesh.inset = dw[:, 0].copy(); core_mesh.iterations = it                 # for the checks
    return V, _core_polys(len(V)), H


def _core_polys(nv):
    nr = (nv - 2) // CORE_N; pt = nv - 1; j = np.arange(CORE_N); j1 = (j + 1) % CORE_N
    polys = [(0, 1 + int(b), 1 + int(c)) for b, c in zip(j1, j)]               # bottom pole fan
    for k in range(nr - 1):
        A, B2 = 1 + k * CORE_N, 1 + (k + 1) * CORE_N
        polys += [(A + int(x), A + int(y), B2 + int(y), B2 + int(x)) for x, y in zip(j, j1)]
    A = 1 + (nr - 1) * CORE_N
    polys += [(A + int(x), A + int(y), pt) for x, y in zip(j, j1)]              # top pole fan
    return polys


def core_material():
    """Dark red-black, matt to slightly waxy, with a fine tangle of fibres (crossing wavy bands, broken up by noise)
    so the core reads as packed threads in the depth and not as a smooth plastic body."""
    import bpy
    m = bpy.data.materials.get(CORE_MATERIAL)
    if m:
        return m
    m = bpy.data.materials.new(CORE_MATERIAL); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links.new
    p = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord'); fib = None
    for k, (rot, sc, dist) in enumerate((((0.3, 0.2, 0.0), 2.3, 7.0), ((1.2, -0.4, 1.1), 2.0, 6.0),
                                          ((-0.5, 1.4, 2.2), 2.6, 8.0))):
        mp = N.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = rot; L(tc.outputs['Object'], mp.inputs['Vector'])
        w = N.new('ShaderNodeTexWave'); w.wave_type = 'BANDS'; w.bands_direction = 'X'; w.wave_profile = 'SIN'
        for key, v in dict(Scale=sc, Distortion=dist, Detail=3.0, **{'Detail Scale': 2.0, 'Detail Roughness': 0.6}).items():
            w.inputs[key].default_value = v
        w.inputs['Phase Offset'].default_value = 1.7 * k; L(mp.outputs['Vector'], w.inputs['Vector'])
        nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.6 + 0.5 * k; nz.inputs['Detail'].default_value = 1.0
        L(mp.outputs['Vector'], nz.inputs['Vector'])
        r = N.new('ShaderNodeMapRange'); r.inputs['From Min'].default_value = 0.72; r.inputs['From Max'].default_value = 0.95
        L(w.outputs['Fac'], r.inputs['Value'])                                  # thin bright crests = fibres
        g = N.new('ShaderNodeMapRange'); g.inputs['From Min'].default_value = 0.45; g.inputs['From Max'].default_value = 0.6
        L(nz.outputs['Fac'], g.inputs['Value'])                                 # break the fibres into pieces
        mul = N.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; L(r.outputs['Result'], mul.inputs[0]); L(g.outputs['Result'], mul.inputs[1])
        if fib is None:
            fib = mul.outputs[0]
        else:
            mx = N.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'; L(fib, mx.inputs[0]); L(mul.outputs[0], mx.inputs[1]); fib = mx.outputs[0]
    tone = N.new('ShaderNodeTexNoise'); tone.inputs['Scale'].default_value = 0.9; tone.inputs['Detail'].default_value = 2.0
    L(tc.outputs['Object'], tone.inputs['Vector'])
    mix = N.new('ShaderNodeMath'); mix.operation = 'MULTIPLY_ADD'; L(fib, mix.inputs[0])
    mix.inputs[1].default_value = 0.7; L(tone.outputs['Fac'], mix.inputs[2])                  # fac = fibre*0.7 + tone
    ramp = N.new('ShaderNodeValToRGB'); e = ramp.color_ramp.elements
    e[0].position = 0.35; e[0].color = _gain(CORE_DARK, CORE_GAIN)
    e[1].position = 1.0; e[1].color = _gain(CORE_LIGHT, CORE_GAIN)
    e.new(0.7).color = _gain(CORE_MID, CORE_GAIN)
    L(mix.outputs[0], ramp.inputs['Fac']); L(ramp.outputs['Color'], p.inputs['Base Color'])
    rr = N.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = CORE_ROUGH[0]; rr.inputs['To Max'].default_value = CORE_ROUGH[1]
    L(fib, rr.inputs['Value']); L(rr.outputs['Result'], p.inputs['Roughness'])            # fibres a bit glossier
    p.inputs['Specular IOR Level'].default_value = CORE_SPEC   # low: seen at grazing angles through the side glass
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.5; bump.inputs['Distance'].default_value = 0.01
    L(fib, bump.inputs['Height']); L(bump.outputs['Normal'], p.inputs['Normal'])
    return m


def build_core(data, H=None):
    """Hidden core as one closed mesh under the product empty (local BU), material core_material()."""
    import bpy
    V, polys, _ = core_mesh(data, H)
    me = bpy.data.meshes.new(CORE)
    me.vertices.add(len(V)); me.vertices.foreach_set('co', V.astype(np.float32).ravel())
    lens = np.array([len(p) for p in polys]); loops = np.concatenate([np.array(p) for p in polys])
    me.loops.add(len(loops)); me.loops.foreach_set('vertex_index', loops.astype(np.int32))
    me.polygons.add(len(polys)); me.polygons.foreach_set('loop_start', (np.cumsum(lens) - lens).astype(np.int32))
    me.update(calc_edges=True); me.validate(verbose=False)
    me.polygons.foreach_set('use_smooth', np.ones(len(polys), bool))
    if hasattr(me, 'set_sharp_from_angle'):
        me.set_sharp_from_angle(angle=np.radians(60))
    me.materials.append(core_material())
    ob = bpy.data.objects.get(CORE)
    if ob:
        bpy.data.objects.remove(ob)
    ob = bpy.data.objects.new(CORE, me)
    emp = bpy.data.objects[EMPTY]
    (emp.users_collection[0] if emp.users_collection else bpy.context.scene.collection).objects.link(ob)
    ob.parent = emp; ob.matrix_parent_inverse.identity(); ob.matrix_basis.identity()
    print('SAFFRON core: %d vertices, %d faces' % (len(V), len(polys)), flush=True)
    return ob


# --------------------------------------------------------------------------- Blender
def thread_material():
    """Dried Negin tissue, one material for the fill and the loose threads. Reads the point attributes
    rs_fibre (along mm, across mm, per-thread random) and rs_edge (0 middle, 1 thin edge of the band)."""
    import bpy
    m = bpy.data.materials.get(MATERIAL)
    if m:
        return m
    m = bpy.data.materials.new(MATERIAL); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links.new
    p = N['Principled BSDF']

    def node(t, **kw):
        n = N.new(t)
        for k, v in kw.items():
            n.inputs[k].default_value = v
        return n

    def op(o, a, b):
        n = N.new('ShaderNodeMath'); n.operation = o
        for i, v in enumerate((a, b)):
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                L(v, n.inputs[i])
        return n.outputs[0]
    fa = N.new('ShaderNodeAttribute'); fa.attribute_type = 'GEOMETRY'; fa.attribute_name = 'rs_fibre'
    ea = N.new('ShaderNodeAttribute'); ea.attribute_type = 'GEOMETRY'; ea.attribute_name = 'rs_edge'
    sep = N.new('ShaderNodeSeparateXYZ'); L(fa.outputs['Vector'], sep.inputs[0]); rnd = sep.outputs['Z']
    # fine lengthwise grooves: noise stretched along the thread, about 12 per mm across
    gv = N.new('ShaderNodeCombineXYZ')
    L(op('MULTIPLY', sep.outputs['Y'], 12.0), gv.inputs['X'])
    L(op('MULTIPLY', sep.outputs['X'], 0.35), gv.inputs['Y'])
    L(op('MULTIPLY', rnd, 91.0), gv.inputs['Z'])
    groove = node('ShaderNodeTexNoise', Scale=1.0, Detail=4.0, Roughness=0.55); L(gv.outputs[0], groove.inputs['Vector'])
    # parallel lengthwise ridges: sine bands across the band (period about 0.1 mm), wobbling along the thread
    wv = N.new('ShaderNodeCombineXYZ')
    L(op('MULTIPLY', sep.outputs['Y'], GROOVE_PER_MM * 0.314), wv.inputs['X'])
    L(op('MULTIPLY', sep.outputs['X'], 0.06), wv.inputs['Y']); L(op('MULTIPLY', rnd, 37.0), wv.inputs['Z'])
    wave = N.new('ShaderNodeTexWave'); wave.wave_type = 'BANDS'; wave.bands_direction = 'X'
    for k, v in dict(Scale=1.0, Distortion=2.6, Detail=3.0, **{'Detail Scale': 1.5, 'Detail Roughness': 0.6}).items():
        wave.inputs[k].default_value = v
    L(wv.outputs[0], wave.inputs['Vector'])
    gfac = op('ADD', op('MULTIPLY', wave.outputs['Fac'], 0.5), op('MULTIPLY', groove.outputs['Fac'], 0.5))
    # broad tonal drift along each thread, offset per thread
    dv = N.new('ShaderNodeCombineXYZ')
    L(op('MULTIPLY', sep.outputs['X'], 0.12), dv.inputs['X']); L(op('MULTIPLY', rnd, 53.0), dv.inputs['Y'])
    drift = node('ShaderNodeTexNoise', Scale=1.0, Detail=2.0); L(dv.outputs[0], drift.inputs['Vector'])
    tone = op('ADD', op('MULTIPLY', drift.outputs['Fac'], 0.7), op('MULTIPLY', rnd, 0.35))
    tone = op('ADD', tone, op('MULTIPLY', gfac, 0.3))
    ramp = N.new('ShaderNodeValToRGB'); e = ramp.color_ramp.elements
    e[0].position = 0.45; e[0].color = (0.030, 0.0016, 0.0014, 1)       # oxblood, almost black
    e[1].position = 0.95; e[1].color = (0.165, 0.0068, 0.0040, 1)       # deep carmine
    e.new(0.70).color = (0.085, 0.0035, 0.0024, 1)
    L(tone, ramp.inputs['Fac']); L(ramp.outputs['Color'], p.inputs['Base Color'])
    L(op('ADD', op('MULTIPLY', gfac, 0.22), ROUGH_BASE), p.inputs['Roughness'])       # ridges a bit duller
    p.inputs['Specular IOR Level'].default_value = SPEC                   # slightly waxy sheen
    p.inputs['Coat Weight'].default_value = 0.12; p.inputs['Coat Roughness'].default_value = 0.35
    p.inputs['Subsurface Weight'].default_value = 0.25
    p.inputs['Subsurface Radius'].default_value = (0.12, 0.016, 0.007)
    p.inputs['Subsurface Scale'].default_value = 0.08
    bump = node('ShaderNodeBump', Strength=BUMP, Distance=0.004); L(gfac, bump.inputs['Height'])
    L(bump.outputs['Normal'], p.inputs['Normal'])
    # waxy sheen: soft light seam at grazing angles instead of a plastic highlight
    p.inputs['Sheen Weight'].default_value = 0.22; p.inputs['Sheen Roughness'].default_value = 0.45
    p.inputs['Sheen Tint'].default_value = (1.0, 0.55, 0.42, 1)
    # thin band edges glow orange-red against the light. The band is closed, so light crosses two surfaces:
    # the translucent share acts twice and must be high at the edge (smooth ramp, nothing in the body).
    mr = N.new('ShaderNodeMapRange'); mr.interpolation_type = 'SMOOTHSTEP'      # 0 body .. 1 thin edge
    mr.inputs['From Min'].default_value = TRANS_FROM; L(ea.outputs['Fac'], mr.inputs['Value'])
    tc = N.new('ShaderNodeMix'); tc.data_type = 'RGBA'; L(mr.outputs['Result'], tc.inputs['Factor'])
    tc.inputs['A'].default_value = TRANS_BODY; tc.inputs['B'].default_value = TRANS_EDGE   # thick: deeper red
    tr = N.new('ShaderNodeBsdfTranslucent'); L(tc.outputs['Result'], tr.inputs['Color']); L(bump.outputs['Normal'], tr.inputs['Normal'])
    fac = op('ADD', op('MULTIPLY', mr.outputs['Result'], TRANS_MAX - TRANS_MIN), TRANS_MIN)
    mix = N.new('ShaderNodeMixShader'); L(fac, mix.inputs['Fac'])
    L(p.outputs[0], mix.inputs[1]); L(tr.outputs[0], mix.inputs[2]); L(mix.outputs[0], N['Material Output'].inputs['Surface'])
    return m


def _set_attrs(me, fibre, edge):
    a = me.attributes.get('rs_fibre') or me.attributes.new('rs_fibre', 'FLOAT_VECTOR', 'POINT')
    a.data.foreach_set('vector', np.ascontiguousarray(fibre, np.float32).ravel())
    b = me.attributes.get('rs_edge') or me.attributes.new('rs_edge', 'FLOAT', 'POINT')
    b.data.foreach_set('value', np.ascontiguousarray(edge, np.float32).ravel())


def build_fill(interior=None, cache=None):
    """Hide the master fill and build the packed threads as one mesh under the product empty (local BU), plus the
    hidden dark core behind them (CORE_ON).
    interior: path or dict of a jar-interior.json (e.g. the return of product_jar.build_jar()); if it differs from
    the cache, the fill is repacked in memory with saffron_pack.pack(). cache: path, default saffron_pack.CACHE."""
    import bpy
    global _MPB
    cache = cache or sp.CACHE
    data = json.load(open(cache, encoding='utf-8')) if os.path.exists(cache) else None
    if interior is not None:
        I = sp.load_interior(interior)
        if data is None or not sp.same_interior(I, data['interior']):
            print('SAFFRON cache does not match the interior, repacking (minutes)', flush=True)
            data = sp.pack(I)
    if data is None:
        raise FileNotFoundError(cache)
    old = bpy.data.objects.get(OLD_FILL)
    if old:
        old.hide_render = True; old.hide_viewport = True
    V, F, C = sp.assemble(data); _MPB = float(data['interior']['mm_per_bu'])
    me = bpy.data.meshes.new(FILL)
    me.vertices.add(len(V)); me.vertices.foreach_set('co', V.astype(np.float32).ravel())
    me.loops.add(F.size); me.loops.foreach_set('vertex_index', F.astype(np.int32).ravel())
    me.polygons.add(len(F)); me.polygons.foreach_set('loop_start', np.arange(0, F.size, 4, dtype=np.int32))
    me.update(calc_edges=True); me.validate(verbose=False)
    me.polygons.foreach_set('use_smooth', np.ones(len(F), bool))
    _set_attrs(me, C[:, :3], C[:, 3])
    me.materials.append(thread_material())
    ob = bpy.data.objects.get(FILL)
    if ob:
        bpy.data.objects.remove(ob)
    ob = bpy.data.objects.new(FILL, me)
    emp = bpy.data.objects[EMPTY]
    (emp.users_collection[0] if emp.users_collection else bpy.context.scene.collection).objects.link(ob)
    ob.parent = emp; ob.matrix_parent_inverse.identity(); ob.matrix_basis.identity()
    print('SAFFRON fill: %d threads, %d quads' % (data['count'], len(F)), flush=True)
    if CORE_ON:
        build_core(data)
    return ob


def retint_loose_threads(mpb=None):
    """Give the loose threads from add_threads() the fill material, with the attributes it reads."""
    import bpy
    mpb = mpb or _MPB; mat = thread_material(); n = 0
    for o in bpy.data.objects:
        if not o.name.startswith(LOOSE_PREFIX) or o.type != 'MESH':
            continue
        me = o.data; m = len(me.vertices)
        co = np.empty(m * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
        r = (sum(map(ord, o.name)) * 0.618034) % 1.0
        fib = np.stack([co[:, 2] * mpb * o.scale.z, co[:, 0] * mpb * o.scale.x, np.full(m, r)], 1)
        ax = np.abs(co[:, 0]); edge = ax / max(float(ax.max()), 1e-6)
        _set_attrs(me, fib, edge)
        me.materials.clear(); me.materials.append(mat); n += 1
    print('SAFFRON loose threads retinted: %d' % n, flush=True)
    return n


