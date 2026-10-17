"""Royal Spices - saffron fill of the product jar: individually shaped dry Negin threads, packed under gravity.

Every thread is its own shape (2-3.5 cm, flat band, narrow at the base, open crinkled funnel with a toothed rim
at the end, twisted, kinked, partly folded, some broken). The packing drops the threads one after another into the
jar interior as rigid bodies: each one is lowered onto the bed, then tipped about its first contact until a second
one holds it, then rolled about the line through both contacts until a third one does (quasi-static settling on a
conservative height field of everything below). Lower threads are flatter and settled more thoroughly (weight of
the fill above), upper ones are curlier and looser; the last ones may stick out. About a fifth is placed against
the inner wall, lying flat on the glass.

Blender (web_hero.py, after setup_scene()):
    import saffron_fill
    saffron_fill.build_fill()            # hides the master fill, builds the new one under the product empty
    saffron_fill.retint_loose_threads()  # loose threads in front of the jar get the same material

Repack for another interior (numpy only, no bpy; Blender's bundled python works):
    python saffron_fill.py --interior jar-interior.json [--out saffron-fill.json] [--seed N]
"""
import json, math, os, sys, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'saffron-fill.json')
EMPTY = 'PRODUCT | Royal Spices 0.5g'
OLD_FILL = 'SAFFRON | 1050 dry filaments'
FILL = 'SAFFRON | dried negin threads'
MATERIAL = 'Saffron | dried negin tissue (fill and loose threads)'
LOOSE_PREFIX = 'THREAD | dried stigma'
SEED = 20261007
VERSION = 2

# Interior of the jar in the local frame of the product empty, in BU. Provisional until T-20261007-01 delivers.
PROVISIONAL = {"mm_per_bu": 10.8, "inner_half_width": 2.00, "inner_corner_radius": 0.55, "inner_floor_z": 0.55,
               "inner_floor_fillet": 0.30, "inner_shoulder_z": 5.0, "neck_inner_radius": 1.25,
               "label_bottom_z": 0.45, "label_top_z": 4.6, "fill_top_z": 4.6}
KEYS = tuple(PROVISIONAL)

S_ST, J_CR = 40, 12            # stations along a thread, points across one face of the band
EPS = 0.002                    # vertical clearance at a resting contact (BU)
CLR = 0.002                    # clearance to the glass (BU)
TOL = 0.003                    # gap that still counts as contact (BU)
D_EX = 0.2                     # contacts closer than this to the pivot are the same contact (BU)
VOX = 0.01                     # voxel of the 3D occupancy grid (BU): broad phase only
DMIN = 0.009                   # exact least distance between samples of two threads (BU), <= VOX;
SP = 0.005                     # surface sample spacing (BU); DMIN > 2 * 0.71 * SP keeps the meshes apart
HC = 0.012                     # cell of the sample hash (BU), >= DMIN + TOL
STEP = 0.9 * VOX               # largest move of any sample per step while tipping (< 2 * DMIN: no tunnelling)
DSTEP = 0.004                  # largest sink step close to other threads (BU)
COL = 0.1                      # surface column (BU) for the fill height
Z_UNDER = 0.12                 # mean surface this far below fill_top_z ...
UP_H = 0.2                     # ... so that threads can stick out this far below the shoulder
N_UP = 7                       # threads sticking out at least UP_H above the mean surface
P_WALL = 0.22                  # share of threads placed flat against the glass
P_LOW = 0.85                  # share of bed threads aimed at one of the lowest surface columns (levels the top)
LOW_Q = 0.25                   # ... chosen among this lowest share of the columns
P_LOW_TOP = 0.97               # ... above 80 % of the fill height (smooth top)
NZ_MIN = 0.3                  # least z of the support normal of a thread-on-thread contact
SPAN = 0.5                     # a bed thread may rise at most this much over its length (BU; 0: off)
Z_ABOVE = 0.5                  # a support contact may lie this far above the thread's centre (BU)
TALL = 1.0                      # a bed or wall thread may end at most this far above the mean surface (BU)
WALL_ALIGN = 0.6               # a hollow closer than this to the glass gets a thread laid along the wall (BU)
TILT0 = 15.0                   # tilt spread (deg) of bed threads at the floor, 30 at the top (was 5: flat threads bridged)
K_BOT = 8                      # drop candidates per bed thread at the floor (lowest wins), down to 1 at the top
T_MAX = 1500.0                 # time guard (s): stop packing after this, the 30 min limit holds


def load_interior(src=None):
    if src is None:
        return dict(PROVISIONAL)
    d = src if isinstance(src, dict) else json.load(open(src, encoding='utf-8'))
    if isinstance(d.get('interior'), dict):
        d = d['interior']
    out = dict(PROVISIONAL)
    out.update({k: float(d[k]) for k in KEYS if k in d})
    return out


def same_interior(a, b):
    return all(abs(float(a[k]) - float(b.get(k, 1e9))) < 1e-6 for k in KEYS)


def _round(v):
    if isinstance(v, float):
        return round(v, 6)
    if isinstance(v, (list, tuple)):
        return [_round(x) for x in v]
    if isinstance(v, dict):
        return {k: _round(x) for k, x in v.items()}
    return v


# --------------------------------------------------------------------------- one thread
def thread_params(rng, flat=1.0, broken=None, fold=None):
    """Shape parameters of one dried Negin stigma (mm, rad). flat < 1: pressed flatter by the fill above."""
    r = lambda a, b: float(rng.uniform(a, b))
    if broken is None:
        broken = bool(rng.random() < 0.17)
    if fold is None:
        fold = bool(rng.random() < 0.12)
    kinks = []
    for _ in range(int(rng.integers(1, 4))):
        edge = bool(rng.random() < 0.2)
        ang = float(np.clip(rng.normal(0, 0.55), -1.2, 1.2)) * flat * (0.3 if edge else 1.0)
        kinks.append([r(0.08, 0.92), ang, r(0.35, 1.4), int(edge)])
    p = dict(seed=int(rng.integers(1 << 30)), length=r(20.5, 26.0) if broken else r(21.0, 34.5),
             cut=r(0.62, 0.86) if broken else 1.0,
             w0=r(0.28, 0.48), w1=r(0.85, 1.4), ts=r(0.74, 0.86), d_end=r(1.6, 3.0),
             phi_sh=r(0.5, 1.6), phi_end=r(3.4, 4.9), flatten=r(0.4, 0.95), thick=r(0.13, 0.20),
             tooth=r(0.18, 0.42), ruffle=r(0.06, 0.2), ruffle_k=int(rng.integers(2, 4)), ruffle_ph=r(0, 6.283),
             curl=float(rng.normal(0, 0.03)) * flat, edge_bend=float(rng.normal(0, 0.006)),
             twist=float(rng.normal(0, 1.6)), wobble=r(0, 0.05) * flat, wobble_k=r(0.2, 0.6), wobble_ph=r(0, 6.283),
             kinks=kinks, fold=[r(0.25, 0.7), float(rng.choice([-1.0, 1.0])) * r(1.9, 2.6), r(0.45, 0.8)] if fold else None,
             rand=r(0, 1), flat=flat)
    return _round(p)


def _centerline(p, n_f=240):
    """Integrate the band frame (T along, B across, N through the band) along the kept length."""
    Lk = p['length']; ds = Lk / n_f; sq = math.sqrt(math.pi)
    T = [1.0, 0.0, 0.0]; B = [0.0, 1.0, 0.0]; N = [0.0, 0.0, 1.0]; P = [0.0, 0.0, 0.0]
    Ps, Ts, Ns = [P[:]], [T[:]], [N[:]]
    kinks, fold = p['kinks'], p['fold']
    wt = p['twist'] / Lk
    for k in range(n_f):
        l = (k + 0.5) * ds
        wb = p['curl'] + p['wobble'] * math.sin(p['wobble_k'] * l + p['wobble_ph'])
        wn = p['edge_bend']
        for s0, ang, w, edge in kinks:
            g = ang * math.exp(-((l - s0 * Lk) / w) ** 2) / (w * sq)
            if edge:
                wn += g
            else:
                wb += g
        if fold:
            s0, ang, w = fold
            wb += ang * math.exp(-((l - s0 * Lk) / w) ** 2) / (w * sq)
        o = [wt * T[i] + wb * B[i] + wn * N[i] for i in range(3)]
        om = math.sqrt(o[0] * o[0] + o[1] * o[1] + o[2] * o[2])
        if om > 1e-12:
            u = [x / om for x in o]; c = math.cos(om * ds); s = math.sin(om * ds)

            def rot(v):
                d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2]
                cx = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
                return [v[i] * c + cx[i] * s + u[i] * d * (1 - c) for i in range(3)]
            T, B, N = rot(T), rot(B), rot(N)
        P = [P[i] + T[i] * ds for i in range(3)]
        Ps.append(P[:]); Ts.append(T[:]); Ns.append(N[:])
    return np.linspace(0, Lk, n_f + 1), np.array(Ps), np.array(Ts), np.array(Ns)


def thread_grid(p, mpb):
    """Closed band mesh of one thread as a (S, 2J, 3) grid in BU (thread frame) and the material coords (S, 2J, 3):
    along the thread in mm, across the band in mm, per-thread random."""
    S, J = S_ST, J_CR
    Lk = p['length']; Lf = Lk / p['cut']
    lf, Pa, Ta, Na = _centerline(p)
    u = np.linspace(0, 1, S)
    l = (1 - (1 - u) ** 1.15) * Lk                       # a little denser towards the funnel
    Pi = np.stack([np.interp(l, lf, Pa[:, i]) for i in range(3)], 1)
    Ti = np.stack([np.interp(l, lf, Ta[:, i]) for i in range(3)], 1)
    Ni = np.stack([np.interp(l, lf, Na[:, i]) for i in range(3)], 1)
    Ti /= np.linalg.norm(Ti, axis=1)[:, None]
    Ni -= (Ni * Ti).sum(1)[:, None] * Ti; Ni /= np.linalg.norm(Ni, axis=1)[:, None]
    Bi = np.cross(Ni, Ti)

    sig = l / Lf
    ts = p['ts']
    ttr = np.clip((sig - ts) / (1 - ts), 0, 1)           # progress through the funnel
    sm = ttr * ttr * (3 - 2 * ttr)
    w_sh = (p['w0'] + (p['w1'] - p['w0']) * np.clip(sig / ts, 0, 1) ** 0.7) * (0.65 + 0.35 * np.clip(l / 0.8, 0, 1))
    phi = p['phi_sh'] + (p['phi_end'] - p['phi_sh']) * sm ** 1.2
    R_sh = p['w1'] / p['phi_sh']
    R = np.where(ttr > 0, R_sh + (p['d_end'] / 2 - R_sh) * ttr ** 1.5, w_sh / p['phi_sh'])
    jn = np.linspace(0, 1, J)
    th = phi[:, None] * (jn[None, :] - 0.5)              # angle on the cross-section arc
    Rj = R[:, None] * (1 + p['ruffle'] * ttr[:, None] ** 2 *
                       np.sin(2 * math.pi * p['ruffle_k'] * jn[None, :] + p['ruffle_ph'] + 0.9 * l[:, None]))
    b = Rj * np.sin(th)
    n = Rj * (1 - np.cos(th))
    n -= n.mean(1)[:, None]                              # centre line through the middle of the section
    t = p['thick'] * (0.85 + 0.15 * np.clip(sig / 0.2, 0, 1)) * (1 - 0.45 * ttr)
    t = t[:, None] * (0.55 + 0.45 * np.sin(math.pi * jn[None, :]) ** 0.5)   # thin, translucent edges
    fN = (1 - (1 - p['flatten']) * sm)[:, None]           # funnel squashed by drying
    bo, no = b + t / 2 * np.sin(th), (n - t / 2 * np.cos(th)) * fN
    bi, ni = b - t / 2 * np.sin(th), (n + t / 2 * np.cos(th)) * fN
    # toothed rim on intact threads, ragged break on broken ones: the end is pulled back per point across the band
    rt = np.random.default_rng(p['seed'])
    if p['cut'] >= 1.0:
        tooth = p['tooth']; tp = np.where(np.arange(J) % 2 == 0, 1.0, 0.12) * rt.uniform(0.55, 1.0, J)
    else:
        tooth = 0.35; tp = rt.uniform(0.0, 1.0, J)
    zt = 2.5 * tooth
    ramp = np.clip((l - (Lk - zt)) / zt, 0, 1)
    dl = -tooth * ramp[:, None] * tp[None, :]
    rb = np.concatenate([bo, bi[:, ::-1]], 1)
    rn = np.concatenate([no, ni[:, ::-1]], 1)
    rl = np.concatenate([dl, dl[:, ::-1]], 1)
    V = Pi[:, None, :] + Ti[:, None, :] * rl[..., None] + Bi[:, None, :] * rb[..., None] + Ni[:, None, :] * rn[..., None]
    arc = Rj * th
    edge = np.abs(2 * jn - 1)
    C = np.stack([l[:, None] + rl, np.concatenate([arc, arc[:, ::-1]], 1), np.full(rl.shape, p['rand']),
                  np.broadcast_to(np.concatenate([edge, edge[::-1]]), rl.shape)], -1)
    return V / mpb, C


_FACES = None


def grid_faces():
    """Quads of the closed band (sides plus both end caps), outward facing."""
    global _FACES
    if _FACES is None:
        S, R, J = S_ST, 2 * J_CR, J_CR
        i = np.arange(S - 1)[:, None]; r = np.arange(R)[None, :]
        side = np.stack([i * R + r, i * R + (r + 1) % R, (i + 1) * R + (r + 1) % R, (i + 1) * R + r], -1)
        # inner face: start each quad one corner later, so that its 0-2 diagonal (Blender splits quads 0-1-2 / 0-2-3)
        # runs parallel to the outer face's; crossing diagonals made the thin band intersect itself
        side[:, J:2 * J - 1] = np.roll(side[:, J:2 * J - 1], -1, axis=2); side = side.reshape(-1, 4)
        j = np.arange(J - 1)
        start = np.stack([R - 1 - j, R - 2 - j, j + 1, j], 1)      # edges run opposite to the side quads
        e = (S - 1) * R
        end = np.stack([e + j, e + j + 1, e + R - 2 - j, e + R - 1 - j], 1)
        F = np.concatenate([side, start, end])
        V, _ = thread_grid(thread_params(np.random.default_rng(1)), 10.0)
        if _volume(V.reshape(-1, 3), F) < 0:
            F = F[:, ::-1]
        _FACES = F.copy()
    return _FACES


_TRI = None


def self_intersects(V):
    """True if the closed band mesh (grid V from thread_grid) intersects itself: some triangle edge pierces a
    triangle it shares no vertex with (Moeller-Trumbore). Broad phase per station row (AABB), triangulation as Blender
    splits the quads (0-1-2 / 0-2-3)."""
    global _TRI
    if _TRI is None:
        F = grid_faces(); T = np.concatenate([F[:, [0, 1, 2]], F[:, [0, 2, 3]]]); R = 2 * J_CR; nr = S_ST - 1
        E = np.unique(np.sort(np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]]), 1), axis=0)
        tr = np.minimum(T.min(1) // R, nr - 1); er = np.minimum(E.min(1) // R, nr - 1)
        _TRI = (T, E, [np.where(tr == r)[0] for r in range(nr)], [np.where(er == r)[0] for r in range(nr)])
    T, E, TR, ER = _TRI; P = V.reshape(-1, 3); nr = len(TR)
    A, B, C = P[T[:, 0]], P[T[:, 1]], P[T[:, 2]]; e1, e2 = B - A, C - A
    tlo = np.minimum(np.minimum(A, B), C); thi = np.maximum(np.maximum(A, B), C)
    rlo = np.array([tlo[t].min(0) for t in TR]); rhi = np.array([thi[t].max(0) for t in TR])
    ov = (rlo[:, None] <= rhi[None]).all(2) & (rhi[:, None] >= rlo[None]).all(2)
    ie = []; it = []
    for ra, rb in zip(*np.nonzero(ov)):
        ea, tb = ER[ra], TR[rb]
        ie.append(np.repeat(ea, len(tb))); it.append(np.tile(tb, len(ea)))
    ie = np.concatenate(ie); it = np.concatenate(it)
    O = P[E[ie, 0]]; D = P[E[ie, 1]] - O
    keep = ((np.minimum(O, O + D) <= thi[it]).all(1) & (np.maximum(O, O + D) >= tlo[it]).all(1) &
            (E[ie, 0][:, None] != T[it]).all(1) & (E[ie, 1][:, None] != T[it]).all(1))
    ie, it, O, d = ie[keep], it[keep], O[keep], D[keep]
    if not len(ie):
        return False
    pv = np.cross(d, e2[it]); det = (e1[it] * pv).sum(1); ok = np.abs(det) > 1e-14
    inv = np.where(ok, 1.0 / np.where(ok, det, 1.0), 0.0); tv = O - A[it]
    u = (tv * pv).sum(1) * inv; qv = np.cross(tv, e1[it]); v = (d * qv).sum(1) * inv; s = (e2[it] * qv).sum(1) * inv
    return bool((ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (s >= 0) & (s <= 1)).any())


def _volume(V, F):
    a, b, c, d = (V[F[:, k]] for k in range(4))
    return float((np.einsum('ij,ij->i', a, np.cross(b, c)) + np.einsum('ij,ij->i', a, np.cross(c, d))).sum() / 6)


def proxy_points(V, fa=5, fc=3):
    """Denser samples of the band surface for the collision height field (spacing about 0.02 BU)."""
    S, R, _ = V.shape
    t = np.linspace(0, S - 1, (S - 1) * fa + 1); i0 = np.minimum(np.floor(t).astype(int), S - 2); w = (t - i0)[:, None, None]
    A = V[i0] * (1 - w) + V[i0 + 1] * w
    t = np.arange(R * fc) / fc; j0 = np.floor(t).astype(int); w = (t - j0)[None, :, None]
    return (A[:, j0] * (1 - w) + A[:, (j0 + 1) % R] * w).reshape(-1, 3)


# --------------------------------------------------------------------------- jar interior and settling
def _sd(x, y, a, rc):
    """Signed distance to the inner wall in plan (negative inside), square with round corners."""
    qx = np.abs(x) - (a - rc); qy = np.abs(y) - (a - rc)
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - rc


def _floor(d, zf, rf):
    """Inner floor height at inset d from the wall, with the fillet between floor and wall."""
    d = np.clip(d, 0, rf)
    return zf + rf - np.sqrt(np.maximum(rf * rf - (rf - d) ** 2, 0))


def _rotm(axis, ang):
    x, y, z = np.asarray(axis, float) / np.linalg.norm(axis); c, s = math.cos(ang), math.sin(ang); C = 1 - c
    return np.array([[c + x * x * C, x * y * C - z * s, x * z * C + y * s],
                     [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
                     [z * x * C - y * s, z * y * C + x * s, c + z * z * C]])


class Body:
    """Rigid point set with its accumulated transform (world = A @ p + b for the centred points)."""

    def __init__(self, Q, A, b):
        self.Q, self.A, self.b = Q, A, b

    def trial(self, Rm, o):
        return (self.Q - o) @ Rm.T + o

    def rotate(self, Rm, o, Q=None):
        self.Q = self.trial(Rm, o) if Q is None else Q; self.A = Rm @ self.A; self.b = Rm @ (self.b - o) + o

    def lower(self, dz):
        self.Q = self.Q - np.array([0, 0, dz]); self.b = self.b - np.array([0, 0, dz])


def _bisect(body, k, o, step, gap):
    lo, hi = 0.0, step
    for _ in range(7):
        mid = (lo + hi) / 2
        if (gap(body.trial(_rotm(k, math.radians(mid)), o)) < 0).any():
            hi = mid
        else:
            lo = mid
    if lo > 0:
        body.rotate(_rotm(k, math.radians(lo)), o)
    return gap(body.trial(_rotm(k, math.radians(hi - lo)), o))


def pivot_point(body, c, gap, toward=None, max_deg=85.0, step=None, rng=None):
    """Tip the body about its contact c (rolling on to a neighbouring point if that one would sink in) until a
    second contact at least D_EX away holds it. Returns (c, c2), c2 None if nothing caught it."""
    tot = 0.0; mig = 0
    while tot < max_deg:
        G = body.Q.mean(0); h = np.array(toward if toward is not None else G - body.Q[c], float); h[2] = 0
        if math.hypot(h[0], h[1]) < 1e-4:
            ang = rng.uniform(0, 2 * math.pi) if rng is not None else 0.0
            h = np.array([math.cos(ang), math.sin(ang), 0.0])
        k = np.array([-h[1], h[0], 0.0]); o = body.Q[c].copy()
        dist = np.sqrt(((body.Q - o) ** 2).sum(1)); near = dist < D_EX
        step = math.degrees(STEP / max(float(dist.max()), 1e-3))
        Rm = _rotm(k, math.radians(step)); T = body.trial(Rm, o); g = gap(T)
        far_hit = (g[~near] < 0).any()
        if not far_hit and not (g < 0).any():
            body.rotate(Rm, o, T); tot += step; continue
        if not far_hit:
            mig += 1
            if mig > 150:
                STAB['pp_mig'] += 1; return c, None
            c = int(np.argmin(np.where(near, g, np.inf))); continue
        g = _bisect(body, k, o, step, gap)
        STAB['pp_hit'] += 1; return c, int(np.argmin(np.where(near, np.inf, g)))
    STAB['pp_deg'] += 1; return c, None


def pivot_line(body, c1, c2, gap, max_deg=70.0, step=None):
    """Roll the body about the line through two contacts until a third one holds it."""
    o = body.Q[c1].copy(); u = body.Q[c2] - o; L = np.linalg.norm(u)
    if L < 1e-6:
        return None
    u /= L
    if abs(u[2]) > 0.95:
        return None
    G = body.Q.mean(0); r = (G - o) - ((G - o) @ u) * u
    dz = np.cross(u, r)[2]
    if abs(dz) < 1e-7:
        return None
    k = -u if dz > 0 else u
    rel = body.Q - o; al = rel @ u
    dist = np.linalg.norm(rel - al[:, None] * u, axis=1); near = dist < D_EX * 0.5
    step = step or math.degrees(STEP / max(float(dist.max()), 1e-3))
    tot = 0.0
    while tot < max_deg:
        Rm = _rotm(k, math.radians(step)); T = body.trial(Rm, o); g = gap(T)
        if (g < 0).any():
            if not (g[~near] < 0).any():
                return None
            g = _bisect(body, k, o, step, gap)
            return int(np.argmin(np.where(near, np.inf, g)))
        body.rotate(Rm, o, T); tot += step
    return None


def contact_points(Q, g, sep=D_EX):
    idx = np.where(g <= TOL)[0]
    idx = idx[np.argsort(g[idx])]
    picked = []
    for i in idx:
        if all(np.linalg.norm(Q[i] - Q[j]) > sep for j in picked):
            picked.append(int(i))
    return picked


def _pca_frame(Pc):
    w, E = np.linalg.eigh(np.cov(Pc.T))
    R0 = np.stack([E[:, 2], E[:, 1], E[:, 0]])          # long axis to x, flat normal to z
    if np.linalg.det(R0) < 0:
        R0[1] *= -1
    return R0


# --------------------------------------------------------------------------- 3D occupancy
def surface_samples(V, sp=SP):
    """Samples of the band surface (both faces, every side quad, bilinear) with spacing <= sp, plus the last ring."""
    A = V[:-1]; B = V[1:]; Ar = np.roll(A, -1, 1); Br = np.roll(B, -1, 1)
    la = np.maximum(np.linalg.norm(B - A, axis=2), np.linalg.norm(Br - Ar, axis=2)).ravel()
    lc = np.maximum(np.linalg.norm(Ar - A, axis=2), np.linalg.norm(Br - B, axis=2)).ravel()
    na = np.maximum(np.ceil(la / sp), 1).astype(np.int64); nc = np.maximum(np.ceil(lc / sp), 1).astype(np.int64)
    n = na * nc; q = np.repeat(np.arange(len(n)), n); k = np.arange(int(n.sum())) - np.repeat(np.cumsum(n) - n, n)
    u = ((k // nc[q]) / na[q])[:, None]; v = ((k % nc[q]) / nc[q])[:, None]
    A, B, Ar, Br = (X.reshape(-1, 3)[q] for X in (A, B, Ar, Br))
    return np.concatenate([(A * (1 - v) + Ar * v) * (1 - u) + (B * (1 - v) + Br * v) * u, V[-1]])


class Grid:
    """Blocked voxels (edge VOX): every voxel in the 26-neighbourhood of a voxel holding a committed surface sample,
    value = owner thread + 1. A sample outside all blocked voxels is more than VOX from every committed sample, so with
    sample spacing SP the two meshes keep a gap > VOX - 2 * 0.71 * SP > 0. top: envelope (highest blocked z) per column."""

    def __init__(self, I):
        a, h = I['inner_half_width'], VOX
        self.o = np.array([-a - 2 * h, -a - 2 * h, I['inner_floor_z'] - 2 * h])
        self.n = (np.ceil((np.array([a, a, I['inner_shoulder_z']]) + 2 * h - self.o) / h) + 1).astype(np.int64)
        self.st = np.array([self.n[1] * self.n[2], self.n[2], 1], np.int64)
        self.D = np.zeros(int(np.prod(self.n)), np.int16)
        self.top = np.full(self.n[:2], -1e3)
        d = np.array([(i, j, k) for i in (-1, 0, 1) for j in (-1, 0, 1) for k in (-1, 0, 1)])
        self.off = d @ self.st

    def ijk(self, Q):
        return np.minimum(np.maximum(((Q - self.o) * (1.0 / VOX)).astype(np.int64), 1), self.n - 2)

    def look(self, Q):
        return self.D[self.ijk(Q) @ self.st]

    def add(self, Q, k):
        L = np.unique(self.ijk(Q) @ self.st)
        L = np.unique((L[:, None] + self.off[None]).ravel()); self.D[L] = k + 1
        ix, r = np.divmod(L, self.st[0]); iy, iz = np.divmod(r, self.st[1])
        np.maximum.at(self.top, (ix, iy), self.o[2] + (iz + 1) * VOX)

    def env(self, Q):
        ij = np.clip(((Q[:, :2] - self.o[:2]) * (1.0 / VOX)).astype(np.int64), 0, self.n[:2] - 1)
        return self.top[ij[:, 0], ij[:, 1]]


class Hash:
    """Committed surface samples sorted by hash cell (edge HC), with their owner thread: exact nearest distances."""

    def __init__(self, G):
        self.o = G.o; self.n = (np.ceil(G.n * VOX / HC) + 3).astype(np.int64)
        self.k = np.zeros(0, np.int64); self.P = np.zeros((0, 3), np.float32); self.w = np.zeros(0, np.int16)
        d = np.array([(i, j, k) for i in (-1, 0, 1) for j in (-1, 0, 1) for k in (-1, 0, 1)])
        self.off = (d[:, 0] * self.n[1] + d[:, 1]) * self.n[2] + d[:, 2]

    def key(self, Q):
        c = np.clip(((Q - self.o) * (1.0 / HC)).astype(np.int64), 1, self.n - 2)
        return (c[:, 0] * self.n[1] + c[:, 1]) * self.n[2] + c[:, 2]

    def add(self, Q, k):
        kk = self.key(Q); o = np.argsort(kk, kind='stable'); kk = kk[o]; pos = np.searchsorted(self.k, kk)
        self.k = np.insert(self.k, pos, kk); self.P = np.insert(self.P, pos, Q[o].astype(np.float32), 0)
        self.w = np.insert(self.w, pos, np.full(len(kk), k, np.int16))

    def near(self, Q):
        """Distance to the nearest committed sample within HC and its owner (inf, -1 if none)."""
        m = len(Q); d = np.full(m, np.inf); w = np.full(m, -1, np.int64); self.nearP = np.full((m, 3), np.nan)
        if m == 0 or len(self.k) == 0:
            return d, w
        kk = (self.key(Q)[:, None] + self.off[None]).ravel()
        lo = np.searchsorted(self.k, kk, 'left'); cnt = np.searchsorted(self.k, kk, 'right') - lo
        tot = int(cnt.sum())
        if tot == 0:
            return d, w
        ip = np.repeat(np.repeat(np.arange(m), len(self.off)), cnt)
        js = np.repeat(lo - np.cumsum(cnt) + cnt, cnt) + np.arange(tot)
        d2 = ((self.P[js] - Q[ip]) ** 2).sum(1)
        o = np.lexsort((d2, ip)); first = o[np.r_[True, ip[o][1:] != ip[o][:-1]]]
        d[ip[first]] = np.sqrt(d2[first]); w[ip[first]] = self.w[js[first]]
        self.nearP = np.full((m, 3), np.nan); self.nearP[ip[first]] = self.P[js[first]]   # nearest committed samples
        return d, w


STAB = dict(calls=0, lt2=0, pp_mig=0, pp_deg=0, pp_hit=0, pl_none=0, pl_hit=0, ncont0=0, ncont1=0, sup_above=0)                 # diagnostics of stable()


def _supports(c, gz):
    """A contact carries the thread if it is on the wall, or on the floor or a thread below it: the support normal points
    up (nz > NZ_MIN; the floor always) and the contact lies no higher than Z_ABOVE over the centre (thin, slightly bent
    threads rest on contacts at about the height of their centre). Contacts without nz (old caches): below the centre."""
    if c[3] == 'wall':
        return True
    if len(c) < 6:
        return c[2] < gz
    return c[2] < gz + Z_ABOVE and (c[3] == 'floor' or c[5] > NZ_MIN)


def stable(Q, cs):
    """Support test: >= 2 contacts (floor or thread below the centre, or wall) with the centre's plan position
    between two of them (on both sides), so the thread cannot tip over."""
    G = Q.mean(0)
    S = np.array([c[:2] for c in cs if _supports(c, G[2])]).reshape(-1, 2)
    STAB['calls'] += 1
    if len(S) < 2:
        STAB['lt2'] += 1; STAB['ncont%d' % min(len(cs), 1)] += 1
        if len(cs) >= 2:
            STAB['sup_above'] += 1
            if STAB['sup_above'] % 3 == 0 and os.environ.get('SP_DEBUG'):
                print('DBG G', np.round(G, 3).tolist(), 'zrange', round(float(Q[:, 2].min()), 3), round(float(Q[:, 2].max()), 3),
                      'cs', [(c[3], round(c[2], 3), c[-1]) for c in cs], flush=True)
    for i in range(len(S)):
        for j in range(i + 1, len(S)):
            u = S[j] - S[i]; L2 = float(u @ u)
            if L2 > 1e-8 and 0.05 < float((G[:2] - S[i]) @ u) / L2 < 0.95:
                return True
    return False


# --------------------------------------------------------------------------- packing
def pack(interior=None, seed=SEED, log=print, max_threads=8000):
    t_start = time.time()
    I = load_interior(interior); mpb = I['mm_per_bu']
    a, rc, zf, rf = I['inner_half_width'], I['inner_corner_radius'], I['inner_floor_z'], I['inner_floor_fillet']
    ztop = I['fill_top_z']; ceil_z = I['inner_shoulder_z'] - 0.1 - 0.004
    z_goal = min(ztop - Z_UNDER, ceil_z - UP_H - 0.03)        # mean surface; leaves room for threads sticking out
    G = Grid(I); H = Hash(G); Z = np.array([0.0, 0.0, 1.0]); I3 = np.eye(3)
    m = int(math.ceil(2 * a / COL)); cg = -a + (np.arange(m) + 0.5) * COL
    GX, GY = np.meshgrid(cg, cg, indexing='ij'); inner = _sd(GX, GY, a, rc) < -COL * 0.7072
    topc = np.full((m, m), zf); zmax = []

    def analytic(Q):
        d = -_sd(Q[:, 0], Q[:, 1], a, rc)
        return Q[:, 2] - _floor(d, zf, rf) - EPS, d - CLR

    def gaps(Q):
        gf, gw = analytic(Q)
        g = np.minimum(np.minimum(gf, gw), ceil_z - Q[:, 2])
        b = G.look(Q) != 0                                  # broad phase: only these can be within DMIN
        if b.any():
            g[b] = np.minimum(g[b], H.near(Q[b])[0] - DMIN)
        return g

    def drop(Q):
        """Sink straight down until a sample comes within DMIN of a committed sample or touches the floor: skip free
        space voxel by voxel, then exact steps of at most DSTEP near other threads (no tunnelling)."""
        gf, _ = analytic(Q); lim = max(float(gf.min()), 0.0)
        dz = min(max(float((Q[:, 2] - G.env(Q)).min()) - 1e-6, 0.0), lim)
        for _ in range(4000):
            if dz >= lim:
                break
            b = G.look(Q - [0, 0, dz]) != 0
            if not b.any():                                   # free: next voxel step, back off to the first blocked
                tr = min(dz + VOX, lim)
                if (G.look(Q - [0, 0, tr]) != 0).any():
                    lo, hi = dz, tr
                    for _ in range(5):
                        mid = (lo + hi) / 2
                        if (G.look(Q - [0, 0, mid]) != 0).any():
                            hi = mid
                        else:
                            lo = mid
                    dz = hi                           # <= VOX/32 past free space: still > DMIN away
                    continue
                dz = tr; continue
            gb = H.near(Q[b] - [0, 0, dz])[0] - DMIN
            tr = min(dz + float(np.clip(gb.min(), 0.0005, DSTEP)), lim)
            g = gaps(Q - [0, 0, tr])
            if (g < 0).any():
                lo, hi = dz, tr
                for _ in range(6):
                    mid = (lo + hi) / 2
                    if (gaps(Q - [0, 0, mid]) < 0).any():
                        hi = mid
                    else:
                        lo = mid
                return lo, int(np.argmin(gaps(Q - [0, 0, hi])))
            dz = tr
        return min(dz, lim), int(np.argmin(gaps(Q - [0, 0, min(dz, lim) + 1e-4])))

    def contacts(Q):
        gf, gw = analytic(Q)
        b = G.look(Q) != 0; gt = np.full(len(Q), np.inf); nb = np.full(len(Q), -1, np.int64)
        Pn = np.full((len(Q), 3), np.nan)
        if b.any():
            d, w = H.near(Q[b]); gt[b] = d - DMIN; nb[b] = w; Pn[b] = H.nearP
        g = np.minimum(np.minimum(gf, gw), gt)
        out = []
        for i in contact_points(Q, g):
            kind = 'wall' if gw[i] <= TOL else ('floor' if gf[i] <= TOL else 'thread')
            if kind == 'thread':                               # z of the support normal (from the other thread to this one)
                v = Q[i] - Pn[i]; nz = float(v[2] / max(np.linalg.norm(v), 1e-9))
            else:
                nz = 1.0 if kind == 'floor' else 0.0
            out.append([*Q[i].tolist(), kind, int(nb[i]) if kind == 'thread' else -1, round(nz, 3)])
        return out

    rng = np.random.default_rng(seed)
    threads = []; rejected = 0; n_self = 0; streak = 0; surf = zf; up_tries = 0
    why = dict(noplace=0, unstable=0, tall=0, up=0, ceil=0, wallclr=0)
    while len(threads) < max_threads:
        f = float(np.clip((surf - zf) / (z_goal - zf), 0, 1))
        finish = surf >= z_goal
        if time.time() - t_start > T_MAX:
            log('SAFFRON time guard %.0fs reached at %d threads, stopping' % (T_MAX, len(threads))); break
        if finish:
            n_up = int((np.array(zmax) >= surf + UP_H + 0.01).sum())
            if n_up >= N_UP or up_tries >= 600:
                break
            up_tries += 1
        p = thread_params(rng, flat=round(0.45 + 0.55 * f, 4))
        V, _ = thread_grid(p, mpb)
        if self_intersects(V):                                     # ~1.7 % of the shapes: draw a new one
            n_self += 1; continue
        P = surface_samples(V); c = P.mean(0); Pc = P - c
        R0 = _pca_frame(Pc)
        wall = (not finish) and bool(rng.random() < P_WALL)
        protrude = finish or ((not wall) and f > 0.92 and rng.random() < 0.3)
        K = 1 if (wall or protrude) else max(1, K_BOT - int(round((K_BOT - 1) * f)))
        cands = []; tries = 0
        while len(cands) < K and tries < 60:
            tries += 1
            if wall:
                side = int(rng.integers(4)); nv = np.array([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]][side], float)
                tv = np.array([-nv[1], nv[0], 0.0]); al = math.radians(rng.uniform(-75, 75))
                ua = math.cos(al) * tv + math.sin(al) * Z; wv = nv * (1 if rng.random() < 0.5 else -1)
                Mw = np.stack([ua, np.cross(wv, ua), wv], 1)
                Rt = _rotm(rng.normal(size=3), math.radians(rng.normal(0, 6))) @ Mw @ R0
                Q = Pc @ Rt.T + tv * rng.uniform(-(a - rc), a - rc)
                for _ in range(3):
                    Q = Q - nv * (np.max(_sd(Q[:, 0], Q[:, 1], a, rc)) + CLR + 0.0005)
            else:
                flip = _rotm([1, 0, 0], math.pi) if rng.random() < 0.5 else I3
                tilt = rng.uniform(20, 55) if protrude else abs(rng.normal(0, TILT0 + (30 - TILT0) * f))
                ax = rng.uniform(0, 2 * math.pi)
                Rt = _rotm([math.cos(ax), math.sin(ax), 0], math.radians(tilt)) @ _rotm(Z, rng.uniform(0, 2 * math.pi)) @ flip @ R0
                Q0 = Pc @ Rt.T; lo = Q0.min(0); hi = Q0.max(0)
                xl, xh = -a + CLR - lo[0] + 1e-3, a - CLR - hi[0] - 1e-3
                yl, yh = -a + CLR - lo[1] + 1e-3, a - CLR - hi[1] - 1e-3
                if xl >= xh or yl >= yh:
                    continue
                if f > 0.05 and rng.random() < (P_LOW if f < 0.8 else P_LOW_TOP):                 # into a hollow of the surface
                    tz = topc[inner]; lowc = np.flatnonzero(inner.ravel())[tz <= np.quantile(tz, LOW_Q)]
                    ix, iy = divmod(int(rng.choice(lowc)), m)
                    wd = -float(_sd(cg[ix], cg[iy], a, rc))
                    if wd < WALL_ALIGN:                            # hollow by the glass: lay the thread along the wall
                        e = 1e-3; nx = float(_sd(cg[ix] + e, cg[iy], a, rc) - _sd(cg[ix] - e, cg[iy], a, rc))
                        ny = float(_sd(cg[ix], cg[iy] + e, a, rc) - _sd(cg[ix], cg[iy] - e, a, rc))
                        ev = np.linalg.eigh(np.cov(Q0[:, :2].T))[1][:, -1]
                        ang = math.atan2(nx, -ny) - math.atan2(ev[1], ev[0]) + math.radians(rng.normal(0, 8))
                        Rz = _rotm(Z, ang); Rt = Rz @ Rt; Q0 = Pc @ Rt.T; lo = Q0.min(0); hi = Q0.max(0)
                        xl, xh = -a + CLR - lo[0] + 1e-3, a - CLR - hi[0] - 1e-3
                        yl, yh = -a + CLR - lo[1] + 1e-3, a - CLR - hi[1] - 1e-3
                        if xl >= xh or yl >= yh:
                            continue
                    cx = cg[ix] - Q0[:, 0].mean(); cy = cg[iy] - Q0[:, 1].mean()
                    Q = Q0 + np.array([min(max(cx, xl), xh), min(max(cy, yl), yh), 0.0])
                    if wd < WALL_ALIGN:                            # ... and slide it against the glass (fills corners)
                        nn = np.array([nx, ny, 0.0]) / max(math.hypot(nx, ny), 1e-12)
                        for _ in range(3):
                            Q = Q - nn * (np.max(_sd(Q[:, 0], Q[:, 1], a, rc)) + CLR + 0.0005)
                else:
                    Q = Q0 + np.array([rng.uniform(xl, xh), rng.uniform(yl, yh), 0.0])
            if (-_sd(Q[:, 0], Q[:, 1], a, rc) < CLR).any():
                why['wallclr'] += 1; continue
            Q = Q + [0, 0, max(float((G.env(Q) - Q[:, 2]).max()), float((zf + rf - Q[:, 2]).max())) + 2 * VOX]
            dz, c1 = drop(Q); Q = Q - [0, 0, dz]
            if Q[:, 2].max() > ceil_z:
                why['ceil'] += 1; continue
            cands.append((Q[:, 2].mean(), Q, Rt, c1, nv if wall else None))
        if not cands:
            rejected += 1; streak += 1; why['noplace'] += 1
            if streak > 300:
                log('SAFFRON no place for thread %d, stopping' % len(threads)); break
            continue
        _, Q, Rt, c1, nv = min(cands, key=lambda x: x[0])
        body = Body(Q, Rt.copy(), Q.mean(0) - Pc.mean(0) @ Rt.T)
        for attempt in range(4):
            c1, c2 = pivot_point(body, c1, gaps, toward=nv, rng=rng)
            if c2 is not None and not protrude:
                pivot_line(body, c1, c2, gaps)
            cinfo = contacts(body.Q)
            if stable(body.Q, cinfo):
                break
            dz, c1 = drop(body.Q)                                      # fell off its pivot: drop again
            body.lower(dz)
        else:
            rejected += 1; streak += 1; why['unstable'] += 1
            if streak > 300:
                log('SAFFRON 300 threads in a row found no rest, stopping'); break
            continue
        Qf = body.Q; zt = float(Qf[:, 2].max())
        span = zt - float(Qf[:, 2].min())
        tall = (zt > surf + TALL) if SPAN <= 0 else (span > SPAN or zt > surf + TALL)
        if (not finish) and (not protrude) and f > 0.3 and tall:   # would stand up out of the bed
            rejected += 1; streak += 1; why['tall'] += 1
            if streak > 300:
                log('SAFFRON 300 threads in a row stood too tall, stopping'); break
            continue
        if finish and not (surf + UP_H + 0.01 <= zt <= ceil_z):
            rejected += 1; why['up'] += 1
            continue
        streak = 0
        G.add(Qf, len(threads)); H.add(Qf, len(threads))
        ci = np.clip(((Qf[:, :2] + a) / COL).astype(np.int64), 0, m - 1); np.maximum.at(topc, (ci[:, 0], ci[:, 1]), Qf[:, 2])
        A = body.A; t = body.b - A @ c
        threads.append(dict(p=p, M=_round(A.ravel().tolist()), t=_round(t.tolist()),
                            k='wall' if wall else ('up' if protrude else 'bed'), c=_round(cinfo)))
        zmax.append(zt)
        surf = float(topc[inner].mean())
        if len(threads) % 20 == 0:
            log('SAFFRON packed %d threads, surface %.3f, %.0fs, rejects %s' % (len(threads), surf, time.time() - t_start, dict(why, **STAB)))
    data = dict(version=VERSION, seed=seed, interior=I, count=len(threads), rejected=rejected, self_redrawn=n_self, threads=threads,
                pack_seconds=round(time.time() - t_start, 1))
    data['rejects'] = dict(why, stable_calls=STAB['calls'], stable_lt2=STAB['lt2'])
    log('SAFFRON done: %d threads in %.0fs, surface %.3f, rejects %s' % (len(threads), data['pack_seconds'], surf, why))
    data['stats'] = measure(data)
    return data


def thread_world(th, mpb):
    V, C = thread_grid(th['p'], mpb)
    M = np.array(th['M']).reshape(3, 3)
    return V.reshape(-1, 3) @ M.T + np.array(th['t']), C.reshape(-1, 4)


def _world_samples(th, mpb, sp):
    V, _ = thread_grid(th['p'], mpb)
    return surface_samples(V, sp) @ np.array(th['M']).reshape(3, 3).T + np.array(th['t'])


def measure(data, sp=0.008):
    """Numbers for the acceptance criteria that need no Blender (surface samples with spacing sp)."""
    I = data['interior']; mpb = I['mm_per_bu']; th = data['threads']
    a, rc, zf, rf, ztop, zs = (I[k] for k in ('inner_half_width', 'inner_corner_radius', 'inner_floor_z',
                                               'inner_floor_fillet', 'fill_top_z', 'inner_shoulder_z'))
    Ss = [_world_samples(t, mpb, sp).astype(np.float32) for t in th]
    allp = np.concatenate(Ss); own = np.repeat(np.arange(len(Ss)), [len(s) for s in Ss])
    # D6: highest thread point per 0.1 BU column over the inner cross-section (empty column = floor)
    m = int(math.ceil(2 * a / COL)); cg = -a + (np.arange(m) + 0.5) * COL; GX, GY = np.meshgrid(cg, cg, indexing='ij')
    inner = _sd(GX, GY, a, rc) < -COL * 0.7072
    ci = np.clip(((allp[:, :2] + a) / COL).astype(np.int64), 0, m - 1)
    top = np.full((m, m), zf); np.maximum.at(top, (ci[:, 0], ci[:, 1]), allp[:, 2])
    surf = float(top[inner].mean()); rough = float(top[inner].std())
    zmax = np.array([s[:, 2].max() for s in Ss])
    # D5 density: 5 equal bands from the floor to the mean surface, solid share from the closed meshes
    F = grid_faces(); vol = np.array([_volume(thread_world(t, mpb)[0], F) for t in th])
    area = (2 * a) ** 2 - (4 - math.pi) * rc * rc; hb = (surf - zf) / 5; bands = []
    for b in range(5):
        z0 = zf + b * hb
        frac = np.array([((s[:, 2] >= z0) & (s[:, 2] < z0 + hb)).mean() for s in Ss])
        bands.append([round(z0, 3), round(z0 + hb, 3), round(float((vol * frac).sum() / (area * hb)) * 100, 3)])
    # occupancy of the samples on a 0.01 grid for wall share and front coverage
    h = 0.01; o = np.array([-a - 0.06, -a - 0.06, zf - 0.06]); n = (np.ceil((np.array([a, a, zs]) + 0.06 - o) / h) + 1).astype(int)
    occ = np.zeros(n, bool); ij = ((allp - o) / h).astype(int); occ[ij[:, 0], ij[:, 1], ij[:, 2]] = True
    # wall share: points on the straight side walls and corner arcs from the fillet top to fill_top_z, 0.02 BU apart
    s0 = a - rc; u = np.arange(-s0, s0, 0.02); ang = np.arange(0, math.pi / 2, 0.02 / rc)
    ring = [np.stack([np.full_like(u, a), u], 1), np.stack([-u, np.full_like(u, a)], 1), np.stack([np.full_like(u, -a), -u], 1),
            np.stack([u, np.full_like(u, -a)], 1)]
    for cx, cy, a0 in ((s0, s0, 0), (-s0, s0, math.pi / 2), (-s0, -s0, math.pi), (s0, -s0, 1.5 * math.pi)):
        ring.append(np.stack([cx + rc * np.cos(ang + a0), cy + rc * np.sin(ang + a0)], 1))
    ring = np.concatenate(ring); zz = np.arange(zf + rf, ztop, 0.02)
    W = np.concatenate([np.column_stack([ring, np.full(len(ring), z)]) for z in zz])
    base = ((W - o) / h).astype(int); hit = np.zeros(len(W), bool); r = 5
    for dx in range(-r, r + 1):
        for dy in range(-r, r + 1):
            for dz in range(-r, r + 1):
                if dx * dx + dy * dy + dz * dz <= r * r:
                    b2 = np.clip(base + (dx, dy, dz), 0, n - 1); hit |= occ[b2[:, 0], b2[:, 1], b2[:, 2]]
    # front coverage: rays along +y through the flat front wall (y = -a), 0.05 BU raster
    xs = np.arange(-s0 + 0.025, s0, 0.05); zr = np.arange(zf + rf + 0.025, max(min(ztop, surf) - 0.1, zf + rf + 0.05), 0.05)
    ix = ((xs - o[0]) / h).astype(int); iz = ((zr - o[2]) / h).astype(int); iy05 = int(math.ceil(0.5 / h)) + int((-a - o[1]) / h)
    cov_full = occ[ix][:, :, iz].any(1).mean(); cov_05 = occ[ix][:, :iy05, iz].any(1).mean()
    # wall-placed threads: share of their samples within 0.05 BU of the glass (flat contact)
    wd = [float((-_sd(s[:, 0], s[:, 1], a, rc) <= 0.05).mean()) for s, t in zip(Ss, th) if t['k'] == 'wall']
    lens = np.array([t['p']['length'] for t in th])
    ncont = np.array([sum(cp[3] != 'ceiling' for cp in t['c']) for t in th])
    kinds = {}
    for t in th:
        for cp in t['c']:
            kinds[cp[3]] = kinds.get(cp[3], 0) + 1
    nth = len(th)
    return dict(threads=nth, vertices=int(nth * S_ST * 2 * J_CR), quads=int(len(F) * nth),
                weight_g_at_450_per_g=round(nth / 450, 3),
                surface_mean_z=round(surf, 3), surface_std=round(rough, 3), surface_columns=int(inner.sum()),
                empty_columns=int((top[inner] <= zf).sum()), fill_top_z=ztop,
                protruding_020=int((zmax >= surf + 0.2).sum()), max_z=round(float(zmax.max()), 4),
                max_allowed_z=round(zs - 0.1, 4),
                solid_percent_by_band=bands, density_ratio_bottom_top=round(bands[0][2] / max(bands[-1][2], 1e-9), 2),
                wall_share_005=round(float(hit.mean()), 3), wall_points=int(len(W)),
                front_coverage_full=round(float(cov_full), 4), front_coverage_05=round(float(cov_05), 4),
                front_rays=int(len(xs) * len(zr)), front_z_range=[round(float(zr[0]), 3), round(float(zr[-1]), 3)],
                wall_threads_share_within_005_median=round(float(np.median(wd)), 3) if wd else None,
                length_mm=dict(min=round(float(lens.min()), 2), max=round(float(lens.max()), 2), median=round(float(np.median(lens)), 2)),
                broken_share=round(sum(t['p']['cut'] < 1 for t in th) / nth, 3),
                folded_share=round(sum(t['p']['fold'] is not None for t in th) / nth, 3),
                wall_placed=int(sum(t['k'] == 'wall' for t in th)), sticking_up=int(sum(t['k'] == 'up' for t in th)),
                contacts=dict(min=int(ncont.min()), lt2=int((ncont < 2).sum()), kinds=kinds,
                              unstable=int(sum(not stable(_world_samples(t, mpb, SP), t['c']) for t in th)),
                              # old strict rule (every support contact below the centre); information only
                              strict_below_centre_fail=int(sum(not stable(_world_samples(t, mpb, SP), [c[:5] for c in t['c']])
                                                               for t in th))),
                thread_volume_mm3_median=round(float(np.median(vol)) * mpb ** 3, 3),
                interior=check_interior(data))


def check_interior(data, Vs=None):
    """Analytic test of every mesh vertex against the inner surface (rounded-square prism, floor with fillet,
    shoulder as ceiling). The interior is convex, so vertices inside means triangles inside."""
    I = data['interior']; mpb = I['mm_per_bu']
    a, rc, zf, rf, zs = (I[k] for k in ('inner_half_width', 'inner_corner_radius', 'inner_floor_z',
                                         'inner_floor_fillet', 'inner_shoulder_z'))
    if Vs is None:
        Vs = [thread_world(th, mpb)[0] for th in data['threads']]
    bad_t = 0; worst = 0.0; clear = np.inf
    for V in Vs:
        d = -_sd(V[:, 0], V[:, 1], a, rc)
        pen = np.maximum.reduce([-d, _floor(d, zf, rf) - V[:, 2], V[:, 2] - zs])
        bad_t += int((pen > 0).any()); worst = max(worst, float(pen.max())); clear = min(clear, float(-pen.max()))
    return dict(threads_penetrating=bad_t, max_penetration_bu=round(max(worst, 0.0), 5),
                min_clearance_bu=round(clear, 5))


def contact_gaps(data, Vs=None):
    """Mesh-level distance (BU) from every recorded thread-on-thread contact point to the supporting thread's
    surface samples. Floor and wall contacts are exact by construction (analytic gap <= TOL)."""
    mpb = data['interior']['mm_per_bu']; th = data['threads']; out = []
    for t in th:
        for cp in t['c']:
            if cp[3] != 'thread' or cp[4] < 0:
                continue
            V, _ = thread_grid(th[cp[4]]['p'], mpb)
            M = np.array(th[cp[4]]['M']).reshape(3, 3)
            P = proxy_points(V) @ M.T + np.array(th[cp[4]]['t'])
            out.append(float(np.sqrt(((P - np.array(cp[:3])) ** 2).sum(1)).min()))
    out = np.array(out) if out else np.zeros(1)
    return dict(n=int(len(out)), median_bu=round(float(np.median(out)), 4), p95_bu=round(float(np.percentile(out, 95)), 4),
                max_bu=round(float(out.max()), 4), share_le_003=round(float((out <= 0.03).mean()), 3))


def write_cache(data, path=CACHE):
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(data, fh, separators=(',', ':'))


def assemble(data, select=None):
    mpb = data['interior']['mm_per_bu']; F0 = grid_faces(); nv = S_ST * 2 * J_CR
    Vs, Cs, Fs = [], [], []
    for i, th in enumerate(data['threads']):
        if select is not None and not select(i, th):
            continue
        V, C = thread_world(th, mpb)
        Fs.append(F0 + nv * len(Vs)); Vs.append(V); Cs.append(C)
    return np.concatenate(Vs), np.concatenate(Fs), np.concatenate(Cs)


# --------------------------------------------------------------------------- command line (no bpy needed)
def main(argv):
    import argparse
    ap = argparse.ArgumentParser(description='Pack the saffron fill for a jar interior and write the cache.')
    ap.add_argument('--interior', required=True, help='jar-interior.json')
    ap.add_argument('--out', default=CACHE)
    ap.add_argument('--seed', type=int, default=SEED)
    ap.add_argument('--max-threads', type=int, default=8000)
    a = ap.parse_args(argv)
    src = os.path.abspath(a.interior)
    data = pack(src, seed=a.seed, max_threads=a.max_threads)
    st = os.stat(src)
    data['interior_source'] = dict(path=src.replace(os.sep, '/'), mtime=time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(st.st_mtime)),
                                   bytes=st.st_size)
    write_cache(data, a.out)
    s = data['stats']
    print('SAFFRON cache %s: %d threads, surface %.3f (target %.3f), %.1fs' % (a.out, data['count'], s['surface_mean_z'],
                                                                             data['interior']['fill_top_z'], data['pack_seconds']))


if __name__ == '__main__' and 'bpy' not in sys.modules:
    main(sys.argv[1:])
