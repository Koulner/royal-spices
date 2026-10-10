"""Royal Spices - saffron fill in Blender: builds the packed threads from the cache of saffron_pack.py and gives
the fill and the loose threads in front of the jar one shared material (dried Negin tissue).

Blender (web_hero.py, after setup_scene() and product_jar):
    import saffron_fill
    saffron_fill.build_fill()            # hides the master fill, builds the new one under the product empty
    saffron_fill.retint_loose_threads()  # loose threads from add_threads() get the same material

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
    """Hide the master fill and build the packed threads as one mesh under the product empty (local BU).
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


