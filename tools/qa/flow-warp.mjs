// Flow warp reference (B1, docs/UEBERGABE-FLUESSIG.md): motion-compensated in-between of two rendered
// neighbour frames A, B by depth + camera, on the CPU. This file defines the maths the WebGL2 shader
// (T-20261018-07) must reproduce; FORMAT.md in the transaction folder describes it for the shader.
// Used by pipeline/images/build-flow.mjs (depth downscale + u8 coding, camera rows),
// tools/qa/flow-check.mjs (D1, D2, F1) and tests/flow-warp.test.mjs (D3). No packages.
//
// Conventions (raw format of web_depth.py / cams.json):
//   pixel (x, y): x right, y down, pixel centre at (x + 0.5, y + 0.5), in units of the camera
//   resolution res = [W, H] (960 x 540 desktop, 540 x 960 mobile), whatever size an image has.
//   w = inverse planar depth 1/z (z along the camera's view axis), w = 0 background (infinitely far).
//   Camera = Blender camera object: looks along local -Z, +Y up, +X right; quat [w,x,y,z] rotates
//   camera → world. Intrinsics with Lfit = the sensor-fit side (AUTO: the longer side; Blender's
//   viewfac, which scales both focal length and shift): f = lens / sensor · Lfit,
//   cx = W/2 − sx·Lfit, cy = H/2 + sy·Lfit. Projection: c = Rᵀ(X − loc), zc = −c.z,
//   u = cx + f·c.x/zc, v = cy − f·c.y/zc.

/** Fine grid: positions per base frame (pipeline/images/build-hero.mjs FINE). */
export const FINE = 8;
/** Default depth grids, about 1/16 of the largest motion size (1440 x 810, 720 x 1280). */
export const GRID = { desktop: [120, 68], mobile: [90, 160] }; // 1/12 und 1/8, Entscheidung 19.10.

// ---- thresholds of the warp (named so the shader uses the same numbers) ----
/** Depth jump: ratio min(w)/max(w) of a triangle's corners. Neighbouring texels of one smooth surface
 *  differ by a few percent at the 1/16 grid; occlusion edges in the scene (glass, threads, flower against
 *  the far backdrop) differ by factors. Below RATIO_LO a triangle is treated as an edge, above RATIO_HI as
 *  surface; smoothstep between avoids popping. */
export const RATIO_LO = 0.75;
export const RATIO_HI = 0.9;
/** Stretch: area of the triangle in the target / area in the source. Between neighbours (t ≤ 0.5 from the
 *  nearer source) zoom and travel change areas by a few percent; growth by 1.5x or more means the triangle
 *  is being pulled open over a disocclusion. Full weight below STRETCH_LO, minimum from STRETCH_HI. */
export const STRETCH_LO = 1.5;
export const STRETCH_HI = 3.0;
/** Floor of a covered triangle's validity. Not 0: where both sources are weak (both straddle the same
 *  edge) their rubber sheets still blend, and as t → 0 the result still tends to A (continuity). */
export const G_MIN = 0.01;
/** Mixing: below this denominator no source covers the pixel → plain cross-fade (today's behaviour).
 *  A covered pixel carries at least G_MIN · min(t, 1 − t) = 1e-4 for t in [1 %, 99 %]. */
export const MIX_EPS = 1e-4;
/** Corners with homogeneous zc ≤ ZC_MIN lie on or behind the target camera plane: triangle dropped. */
export const ZC_MIN = 1e-6;
/** Fragments whose source UV leaves [0,1] by more than this (rounding) are discarded. */
export const UV_TOL = 1e-4;

export const smoothstep = (e0, e1, x) => {
  const s = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return s * s * (3 - 2 * s);
};

// ---------------------------------------------------------------- camera

/** Rotation matrix (row-major 3x3, world ← camera) of a unit quaternion [w, x, y, z]. */
export function quatToMat([w, x, y, z]) {
  const n = Math.hypot(w, x, y, z) || 1;
  w /= n; x /= n; y /= n; z /= n;
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
    2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
    2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y),
  ];
}

/** Shortest-path spherical interpolation of unit quaternions. */
export function slerp(qa, qb, t) {
  let d = qa[0] * qb[0] + qa[1] * qb[1] + qa[2] * qb[2] + qa[3] * qb[3];
  let b = qb;
  if (d < 0) { d = -d; b = qb.map((v) => -v); }
  let ka, kb;
  if (d > 0.9995) { ka = 1 - t; kb = t; } // nearly equal: lerp + normalise
  else {
    const th = Math.acos(d), s = Math.sin(th);
    ka = Math.sin((1 - t) * th) / s; kb = Math.sin(t * th) / s;
  }
  const q = [0, 1, 2, 3].map((i) => ka * qa[i] + kb * b[i]);
  const n = Math.hypot(...q);
  return q.map((v) => v / n);
}

/** Target camera at t between A and B: loc, lens, shift linear, rotation slerp. */
export function interpCam(a, b, t) {
  const lerp = (x, y) => x + (y - x) * t;
  return {
    loc: [0, 1, 2].map((i) => lerp(a.loc[i], b.loc[i])),
    quat: slerp(a.quat, b.quat, t),
    lens: lerp(a.lens, b.lens),
    shift: [lerp(a.shift[0], b.shift[0]), lerp(a.shift[1], b.shift[1])],
  };
}

/** Pixel intrinsics. meta: { res:[W,H], sensor (mm along the fit side), fit: HORIZONTAL|VERTICAL|AUTO }. */
export function intrinsics(cam, meta) {
  const [W, H] = meta.res;
  const fit = meta.fit ?? 'AUTO';
  const L = fit === 'HORIZONTAL' ? W : fit === 'VERTICAL' ? H : Math.max(W, H);
  return { f: (cam.lens / (meta.sensor ?? 36)) * L, cx: W / 2 - cam.shift[0] * L, cy: H / 2 + cam.shift[1] * L };
}

/** World point → [u, v, zc] (pixels of res; zc planar depth, ≤ 0 behind the camera). */
export function project(cam, meta, X, K = intrinsics(cam, meta), R = quatToMat(cam.quat)) {
  const dx = X[0] - cam.loc[0], dy = X[1] - cam.loc[1], dz = X[2] - cam.loc[2];
  const cx = R[0] * dx + R[3] * dy + R[6] * dz;
  const cy = R[1] * dx + R[4] * dy + R[7] * dz;
  const cz = R[2] * dx + R[5] * dy + R[8] * dz;
  const zc = -cz;
  return [K.cx + (K.f * cx) / zc, K.cy - (K.f * cy) / zc, zc];
}

/** Pixel (u, v) with inverse depth w > 0 → world point. */
export function unproject(cam, meta, u, v, w, K = intrinsics(cam, meta), R = quatToMat(cam.quat)) {
  const d = [(u - K.cx) / K.f, -(v - K.cy) / K.f, -1];
  const z = 1 / w;
  return [0, 1, 2].map((i) => cam.loc[i] + z * (R[3 * i] * d[0] + R[3 * i + 1] * d[1] + R[3 * i + 2] * d[2]));
}

/** cams.json frame entry → camera. */
export const camFromFrame = (fr) => ({ loc: fr.loc.slice(), quat: fr.quat.slice(), lens: fr.lens, shift: fr.shift.slice() });

const fix = (x, d) => { const v = Number(x.toFixed(d)); return Object.is(v, -0) ? 0 : v; };
const sig = (x, d) => { const v = Number(x.toPrecision(d)); return Object.is(v, -0) ? 0 : v; };
/** Round a value to 6 significant digits (dn/df as published). */
export const roundSig6 = (x) => sig(x, 6);

/** Published camera row: [lx,ly,lz, qw,qx,qy,qz, lens, sx,sy, dn,df], rounded as in the web format. */
export function camRow(cam, dn, df) {
  return [
    ...cam.loc.map((v) => fix(v, 5)), ...cam.quat.map((v) => fix(v, 6)), fix(cam.lens, 4),
    fix(cam.shift[0], 6), fix(cam.shift[1], 6), sig(dn, 6), sig(df, 6),
  ];
}
/** Published camera row → camera (+ dn, df). */
export const camFromRow = (r) => ({ loc: r.slice(0, 3), quat: r.slice(3, 7), lens: r[7], shift: [r[8], r[9]], dn: r[10], df: r[11] });

// ---------------------------------------------------------------- depth

/** Raw 16-bit depth PNG values → inverse depth w (Float32Array W*H). */
export function rawToW(data16, wmax) {
  const w = new Float32Array(data16.length);
  for (let i = 0; i < w.length; i++) w[i] = (data16[i] / 65535) * wmax;
  return w;
}

/**
 * Block median of a depth map to a gw x gh grid. Texel (j,k) covers pixel columns
 * [floor(j·W/gw), floor((j+1)·W/gw)) and rows likewise; it stands for the point ((j+0.5)·W/gw, (k+0.5)·H/gh).
 * Background counts as 0: if more than half the block is background → 0, else the upper median
 * (never an average, so no fake depth between foreground and background).
 */
export function downscaleDepth(w, W, H, gw, gh) {
  const out = new Float32Array(gw * gh);
  const buf = new Float64Array(Math.ceil(W / gw + 1) * Math.ceil(H / gh + 1));
  for (let k = 0; k < gh; k++) {
    const y0 = Math.floor((k * H) / gh), y1 = Math.floor(((k + 1) * H) / gh);
    for (let j = 0; j < gw; j++) {
      const x0 = Math.floor((j * W) / gw), x1 = Math.floor(((j + 1) * W) / gw);
      let n = 0, zeros = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const v = w[y * W + x]; buf[n++] = v; if (!(v > 0)) zeros++; }
      if (2 * zeros > n || n === 0) { out[k * gw + j] = 0; continue; }
      const s = buf.subarray(0, n).sort();
      out[k * gw + j] = s[n >> 1];
    }
  }
  return out;
}

/** Grid w → u8 code. dn = max w, df = min w > 0 (rounded to 6 significant digits before coding). */
export function encodeDepth(grid) {
  let dn = 0, df = Infinity;
  for (const v of grid) if (v > 0) { if (v > dn) dn = v; if (v < df) df = v; }
  if (dn === 0) return { u8: new Uint8Array(grid.length), dn: 0, df: 0 };
  dn = roundSig6(dn); df = roundSig6(df);
  const u8 = new Uint8Array(grid.length);
  for (let i = 0; i < grid.length; i++) {
    const v = grid[i];
    if (!(v > 0)) continue;
    u8[i] = dn === df ? 255 : Math.min(255, Math.max(1, 1 + Math.round((254 * (v - df)) / (dn - df))));
  }
  return { u8, dn, df };
}

/** u8 code → w (as the shader decodes it). */
export function decodeDepth(u8, dn, df) {
  const w = new Float32Array(u8.length);
  for (let i = 0; i < u8.length; i++) {
    const v = u8[i];
    w[i] = v === 0 ? 0 : dn === df ? dn : df + ((v - 1) / 254) * (dn - df);
  }
  return w;
}

// ---------------------------------------------------------------- images

/** Decoded 8-bit PNG (png-lite) → { width, height, data: Float32Array RGB 0..1 }. */
export function toRGBf(png) {
  const { width, height, channels, data } = png;
  const out = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    if (channels >= 3) { out[3 * i] = data[channels * i] / 255; out[3 * i + 1] = data[channels * i + 1] / 255; out[3 * i + 2] = data[channels * i + 2] / 255; }
    else out[3 * i] = out[3 * i + 1] = out[3 * i + 2] = data[channels * i] / 255;
  }
  return { width, height, data: out };
}

/** Area (box with fractional coverage) resize of an RGB float image, separable. */
export function resizeArea(img, Wo, Ho) {
  if (img.width === Wo && img.height === Ho) return img;
  const pass = (src, sw, sh, n, horizontal) => {
    // resample along one axis from n_src = horizontal ? sw : sh to n
    const ns = horizontal ? sw : sh, other = horizontal ? sh : sw;
    const dst = new Float32Array((horizontal ? n * sh : sw * n) * 3);
    const scale = ns / n;
    for (let o = 0; o < n; o++) {
      const a = o * scale, b = (o + 1) * scale;
      const i0 = Math.floor(a), i1 = Math.min(ns, Math.ceil(b));
      const wts = [];
      for (let i = i0; i < i1; i++) wts.push([i, Math.min(b, i + 1) - Math.max(a, i)]);
      for (let q = 0; q < other; q++) {
        let r = 0, g = 0, bl = 0;
        for (const [i, wt] of wts) {
          const s = 3 * (horizontal ? q * sw + i : i * sw + q);
          r += src[s] * wt; g += src[s + 1] * wt; bl += src[s + 2] * wt;
        }
        const d = 3 * (horizontal ? q * n + o : o * sw + q);
        dst[d] = r / scale; dst[d + 1] = g / scale; dst[d + 2] = bl / scale;
      }
    }
    return dst;
  };
  const h = pass(img.data, img.width, img.height, Wo, true);
  const v = pass(h, Wo, img.height, Ho, false);
  return { width: Wo, height: Ho, data: v };
}

/** Bilinear sample (GL LINEAR + CLAMP_TO_EDGE) at normalised (u, v) into out[o..o+2]. */
export function sampleBilinear(img, u, v, out, o) {
  const W = img.width, H = img.height, d = img.data;
  const x = Math.min(W - 1, Math.max(0, u * W - 0.5)), y = Math.min(H - 1, Math.max(0, v * H - 0.5));
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
  const fx = x - x0, fy = y - y0;
  const a = 3 * (y0 * W + x0), b = 3 * (y0 * W + x1), c = 3 * (y1 * W + x0), e = 3 * (y1 * W + x1);
  for (let ch = 0; ch < 3; ch++) {
    const top = d[a + ch] + (d[b + ch] - d[a + ch]) * fx, bot = d[c + ch] + (d[e + ch] - d[c + ch]) * fx;
    out[o + ch] = top + (bot - top) * fy;
  }
}

// ---------------------------------------------------------------- warp

/**
 * Warp one source into the target camera.
 * @param {object} p
 *   image  { width, height, data: Float32Array RGB } source picture (any size, sampled by normalised UV)
 *   depth  { w: gw, h: gh, data: Float32Array } inverse depth grid of the source (decoded)
 *   meta   { res:[W,H], sensor, fit }
 *   camSrc, camDst  cameras { loc, quat, lens, shift }
 *   out    [Wo, Ho] output size (target pixels = res pixels · Wo/W)
 *   wantUV also return the source UV per pixel (tests)
 * @returns {{ color: Float32Array, g: Float32Array, depth: Float32Array, uv?: Float32Array }}
 *   g = validity per pixel (0 = not covered), depth = target inverse depth of the winning fragment.
 */
export function warpSource({ image, depth, meta, camSrc, camDst, out, wantUV = false }) {
  const [W, H] = meta.res, [Wo, Ho] = out;
  const gw = depth.w, gh = depth.h, grid = depth.data;
  const Ks = intrinsics(camSrc, meta), Kt = intrinsics(camDst, meta);
  const Rs = quatToMat(camSrc.quat), Rt = quatToMat(camDst.quat);
  // M = Rtᵀ·Rs (source camera → target camera rotation), tv = Rtᵀ·(locS − locT)
  const M = new Array(9), tv = [0, 0, 0];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) M[3 * r + c] = Rt[r] * Rs[c] + Rt[3 + r] * Rs[3 + c] + Rt[6 + r] * Rs[6 + c];
    tv[r] = Rt[r] * (camSrc.loc[0] - camDst.loc[0]) + Rt[3 + r] * (camSrc.loc[1] - camDst.loc[1]) + Rt[6 + r] * (camSrc.loc[2] - camDst.loc[2]);
  }
  // vertices: one per texel plus a ring on the image border (depth of the nearest texel)
  const vw = gw + 2, vh = gh + 2, nv = vw * vh;
  const xs = new Float64Array(nv), ys = new Float64Array(nv), ws = new Float64Array(nv);
  const zc = new Float64Array(nv), ut = new Float64Array(nv), vt = new Float64Array(nv), wt = new Float64Array(nv);
  for (let b = 0; b < vh; b++) {
    const y = b === 0 ? 0 : b === vh - 1 ? H : ((b - 0.5) * H) / gh;
    const kk = Math.min(gh - 1, Math.max(0, b - 1));
    for (let a = 0; a < vw; a++) {
      const i = b * vw + a;
      const x = a === 0 ? 0 : a === vw - 1 ? W : ((a - 0.5) * W) / gw;
      const w = grid[kk * gw + Math.min(gw - 1, Math.max(0, a - 1))];
      // homogeneous back-projection: direction d (camera, z = −1) and weight w; w = 0 → point at infinity
      const dx = (x - Ks.cx) / Ks.f, dy = -(y - Ks.cy) / Ks.f, dz = -1;
      const cx = M[0] * dx + M[1] * dy + M[2] * dz + w * tv[0];
      const cy = M[3] * dx + M[4] * dy + M[5] * dz + w * tv[1];
      const cz = M[6] * dx + M[7] * dy + M[8] * dz + w * tv[2];
      const z = -cz; // homogeneous target depth = clip w
      xs[i] = x; ys[i] = y; ws[i] = w; zc[i] = z;
      ut[i] = Kt.cx + (Kt.f * cx) / z; vt[i] = Kt.cy - (Kt.f * cy) / z; wt[i] = w / z;
    }
  }
  const npx = Wo * Ho;
  const color = new Float32Array(npx * 3), g = new Float32Array(npx), zb = new Float32Array(npx).fill(-1);
  const uvOut = wantUV ? new Float32Array(npx * 2).fill(NaN) : null;
  const sx = Wo / W, sy = Ho / H;
  const tri = (i0, i1, i2) => {
    const z0 = zc[i0], z1 = zc[i1], z2 = zc[i2];
    if (!(z0 > ZC_MIN && z1 > ZC_MIN && z2 > ZC_MIN)) return;
    // validity of the triangle
    const w0 = ws[i0], w1 = ws[i1], w2 = ws[i2];
    const nz = (w0 > 0) + (w1 > 0) + (w2 > 0);
    const gr = nz === 0 ? 1 : nz < 3 ? 0 : smoothstep(RATIO_LO, RATIO_HI, Math.min(w0, w1, w2) / Math.max(w0, w1, w2));
    const as = Math.abs((xs[i1] - xs[i0]) * (ys[i2] - ys[i0]) - (xs[i2] - xs[i0]) * (ys[i1] - ys[i0]));
    const at = Math.abs((ut[i1] - ut[i0]) * (vt[i2] - vt[i0]) - (ut[i2] - ut[i0]) * (vt[i1] - vt[i0]));
    const gt = Math.max(G_MIN, gr * (1 - smoothstep(STRETCH_LO, STRETCH_HI, at / as)));
    // raster in output pixels
    const X0 = ut[i0] * sx, Y0 = vt[i0] * sy, X1 = ut[i1] * sx, Y1 = vt[i1] * sy, X2 = ut[i2] * sx, Y2 = vt[i2] * sy;
    const area = (X1 - X0) * (Y2 - Y0) - (X2 - X0) * (Y1 - Y0);
    if (!(Math.abs(area) > 1e-12)) return;
    const pxa = Math.max(0, Math.ceil(Math.min(X0, X1, X2) - 0.5)), pxb = Math.min(Wo - 1, Math.floor(Math.max(X0, X1, X2) - 0.5));
    const pya = Math.max(0, Math.ceil(Math.min(Y0, Y1, Y2) - 0.5)), pyb = Math.min(Ho - 1, Math.floor(Math.max(Y0, Y1, Y2) - 0.5));
    if (pxa > pxb || pya > pyb) return;
    const u0 = xs[i0] / W, u1 = xs[i1] / W, u2 = xs[i2] / W, v0 = ys[i0] / H, v1 = ys[i1] / H, v2 = ys[i2] / H;
    const iz0 = 1 / z0, iz1 = 1 / z1, iz2 = 1 / z2, d0 = wt[i0], d1 = wt[i1], d2 = wt[i2];
    const inv = 1 / area, TOL = -1e-9;
    for (let py = pya; py <= pyb; py++) {
      const Y = py + 0.5;
      for (let px = pxa; px <= pxb; px++) {
        const X = px + 0.5;
        const l0 = ((X1 - X) * (Y2 - Y) - (X2 - X) * (Y1 - Y)) * inv;
        const l1 = ((X2 - X) * (Y0 - Y) - (X0 - X) * (Y2 - Y)) * inv;
        const l2 = 1 - l0 - l1;
        if (l0 < TOL || l1 < TOL || l2 < TOL) continue;
        const p = py * Wo + px;
        const dep = l0 * d0 + l1 * d1 + l2 * d2; // screen-linear like gl_FragCoord.z
        if (!(dep > zb[p])) continue; // nearer (larger w) wins, first wins on ties
        const q0 = l0 * iz0, q1 = l1 * iz1, q2 = l2 * iz2, qs = q0 + q1 + q2; // perspective-correct
        const u = (q0 * u0 + q1 * u1 + q2 * u2) / qs, v = (q0 * v0 + q1 * v1 + q2 * v2) / qs;
        if (u < -UV_TOL || u > 1 + UV_TOL || v < -UV_TOL || v > 1 + UV_TOL) continue; // outside the source: discard
        zb[p] = dep; g[p] = gt;
        sampleBilinear(image, u, v, color, 3 * p);
        if (uvOut) { uvOut[2 * p] = u; uvOut[2 * p + 1] = v; }
      }
    }
  };
  for (let b = 0; b < vh - 1; b++)
    for (let a = 0; a < vw - 1; a++) {
      const i00 = b * vw + a, i10 = i00 + 1, i01 = i00 + vw, i11 = i01 + 1;
      tri(i00, i10, i11); // fixed diagonal: top-left → bottom-right
      tri(i00, i11, i01);
    }
  for (let p = 0; p < npx; p++) if (zb[p] < 0) zb[p] = 0;
  return { color, g, depth: zb, uv: uvOut };
}

/**
 * Mix two warped sources: (gA(1−t)A + gB·t·B) / (gA(1−t) + gB·t); where the denominator < MIX_EPS
 * plain cross-fade of A and B at the same pixel (unwarped, today's behaviour).
 * @returns {{ rgb: Float32Array, fallback: number }} fallback = share of cross-faded pixels
 */
export function blend({ warpA, warpB, imgA, imgB, t, out }) {
  const [Wo, Ho] = out;
  const rgb = new Float32Array(Wo * Ho * 3), ta = new Float32Array(3), tb = new Float32Array(3);
  let fallback = 0;
  for (let y = 0; y < Ho; y++)
    for (let x = 0; x < Wo; x++) {
      const p = y * Wo + x, o = 3 * p;
      const wa = warpA.g[p] * (1 - t), wb = warpB.g[p] * t, den = wa + wb;
      if (den < MIX_EPS) {
        sampleBilinear(imgA, (x + 0.5) / Wo, (y + 0.5) / Ho, ta, 0);
        sampleBilinear(imgB, (x + 0.5) / Wo, (y + 0.5) / Ho, tb, 0);
        for (let c = 0; c < 3; c++) rgb[o + c] = (1 - t) * ta[c] + t * tb[c];
        fallback++;
      } else for (let c = 0; c < 3; c++) rgb[o + c] = (wa * warpA.color[o + c] + wb * warpB.color[o + c]) / den;
    }
  return { rgb, fallback: fallback / (Wo * Ho) };
}

/** Plain cross-fade (today's player) at output size. */
export function crossfade(imgA, imgB, t, [Wo, Ho]) {
  const rgb = new Float32Array(Wo * Ho * 3), ta = new Float32Array(3), tb = new Float32Array(3);
  for (let y = 0; y < Ho; y++)
    for (let x = 0; x < Wo; x++) {
      const o = 3 * (y * Wo + x);
      sampleBilinear(imgA, (x + 0.5) / Wo, (y + 0.5) / Ho, ta, 0);
      sampleBilinear(imgB, (x + 0.5) / Wo, (y + 0.5) / Ho, tb, 0);
      for (let c = 0; c < 3; c++) rgb[o + c] = (1 - t) * ta[c] + t * tb[c];
    }
  return rgb;
}

/**
 * In-between at t from A (camA, depthA) and B (camB, depthB). camT defaults to interpCam(camA, camB, t).
 * @returns {{ rgb: Float32Array, fallback: number, warpA, warpB, camT }}
 */
export function flowFrame({ imgA, imgB, depthA, depthB, camA, camB, t, meta, out, camT, wantUV = false }) {
  const cam = camT ?? interpCam(camA, camB, t);
  const warpA = warpSource({ image: imgA, depth: depthA, meta, camSrc: camA, camDst: cam, out, wantUV });
  const warpB = warpSource({ image: imgB, depth: depthB, meta, camSrc: camB, camDst: cam, out, wantUV });
  const { rgb, fallback } = blend({ warpA, warpB, imgA, imgB, t, out });
  return { rgb, fallback, warpA, warpB, camT: cam };
}
