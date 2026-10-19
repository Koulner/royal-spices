// D3 (docs/UEBERGABE-FLUESSIG.md): the flow warp reference (tools/qa/flow-warp.mjs) on a synthetic scene
// with known cameras. A textured backdrop plane and a nearer half-plane in front of it (a depth step),
// both frames rendered analytically. Checks: markers land within 0.5 px of their analytic projection at
// t = 0.5, an unchanged camera returns the input (≤ 1/255), a pure rotation over background is exact,
// plus the depth coding and the cross-fade fallback. No packages, well under a second.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  quatToMat, intrinsics, project, interpCam, flowFrame, warpSource, blend, crossfade,
  downscaleDepth, encodeDepth, decodeDepth, camRow, camFromRow, G_MIN,
} from '../tools/qa/flow-warp.mjs';

const meta = { res: [320, 184], sensor: 36, fit: 'HORIZONTAL' };
const [W, H] = meta.res;
const GW = 40, GH = 23; // 1/8 grid, 8 x 8 pixel blocks

const axis = (ax, deg) => { const h = (deg * Math.PI) / 360, s = Math.sin(h); return [Math.cos(h), ax === 'x' ? s : 0, ax === 'y' ? s : 0, ax === 'z' ? s : 0]; };
const qmul = (a, b) => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];

/** World ray direction through pixel (u, v). */
function ray(cam, u, v) {
  const K = intrinsics(cam, meta), R = quatToMat(cam.quat);
  const d = [(u - K.cx) / K.f, -(v - K.cy) / K.f, -1];
  return [0, 1, 2].map((i) => R[3 * i] * d[0] + R[3 * i + 1] * d[1] + R[3 * i + 2] * d[2]);
}

// ---- scene 1: backdrop z = −6, half-plane z = −3 for x > 0.2 (the step)
const Z_FAR = -6, Z_NEAR = -3, X_STEP = 0.2;
const MARKERS = [
  { p: [-1.2, 0.35, Z_FAR], s: 0.04 }, { p: [-0.5, -0.45, Z_FAR], s: 0.04 }, { p: [-1.6, -0.3, Z_FAR], s: 0.04 },
  { p: [0.7, 0.2, Z_NEAR], s: 0.02 }, { p: [0.95, -0.3, Z_NEAR], s: 0.02 },
];
function hit(cam, u, v) {
  const D = ray(cam, u, v), o = cam.loc;
  // planar depth along the view axis = ray parameter, since the camera-space ray has z = −1
  const sN = (Z_NEAR - o[2]) / D[2];
  if (sN > 0 && o[0] + sN * D[0] > X_STEP) return { s: sN, X: [o[0] + sN * D[0], o[1] + sN * D[1]], z: Z_NEAR };
  const sF = (Z_FAR - o[2]) / D[2];
  return { s: sF, X: [o[0] + sF * D[0], o[1] + sF * D[1]], z: Z_FAR };
}
function shade({ X, z }, out, o) {
  let r = 0;
  for (const m of MARKERS) if (m.p[2] === z) r += Math.exp(-((X[0] - m.p[0]) ** 2 + (X[1] - m.p[1]) ** 2) / (2 * m.s * m.s));
  const k = z === Z_NEAR ? 1.7 : 1;
  out[o] += Math.min(1, r);
  out[o + 1] += 0.5 + 0.3 * Math.sin(X[0] * 9 * k) * Math.sin(X[1] * 11 * k);
  out[o + 2] += 0.5 + 0.3 * Math.sin(X[0] * 6 * k + X[1] * 4 + (z === Z_NEAR ? 1 : 0));
}
/** Analytic render (2 x 2 supersampled) and inverse depth at pixel centres. */
function render(cam) {
  const data = new Float32Array(W * H * 3), w = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const o = 3 * (y * W + x);
      for (const [a, b] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) shade(hit(cam, x + a, y + b), data, o);
      for (let c = 0; c < 3; c++) data[o + c] /= 4;
      w[y * W + x] = 1 / hit(cam, x + 0.5, y + 0.5).s;
    }
  return { img: { width: W, height: H, data }, w };
}
/** Depth grid as delivered: block median, u8 coding, decoded. */
function delivered(w) {
  const { u8, dn, df } = encodeDepth(downscaleDepth(w, W, H, GW, GH));
  return { w: GW, h: GH, data: decodeDepth(u8, dn, df) };
}
/** Centroid of the red channel in a ±7 px window around (u, v). */
function centroid(rgb, u, v) {
  let sx = 0, sy = 0, s = 0;
  for (let y = Math.floor(v) - 7; y <= Math.floor(v) + 7; y++)
    for (let x = Math.floor(u) - 7; x <= Math.floor(u) + 7; x++) {
      const r = rgb[3 * (y * W + x)];
      sx += r * (x + 0.5); sy += r * (y + 0.5); s += r;
    }
  return [sx / s, sy / s];
}

const camA = { loc: [-0.15, 0.02, 0], quat: qmul(axis('y', 2), axis('x', 0.5)), lens: 40, shift: [0.01, -0.004] };
const camB = { loc: [0.15, -0.03, 0.2], quat: axis('y', -2), lens: 43, shift: [-0.006, 0.006] };

test('warp at t = 0.5 puts markers on both depths within 0.5 px of the analytic projection', (t) => {
  const A = render(camA), B = render(camB);
  const r = flowFrame({ imgA: A.img, imgB: B.img, depthA: delivered(A.w), depthB: delivered(B.w), camA, camB, t: 0.5, meta, out: [W, H] });
  const fade = crossfade(A.img, B.img, 0.5, [W, H]);
  let worst = 0;
  for (const m of MARKERS) {
    const [u, v] = project(r.camT, meta, m.p);
    const [pa, pb] = [project(camA, meta, m.p), project(camB, meta, m.p)];
    assert.ok(Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) > 10, 'markers move by more than 10 px between A and B');
    const [cu, cv] = centroid(r.rgb, u, v);
    worst = Math.max(worst, Math.hypot(cu - u, cv - v));
    assert.ok(Math.hypot(cu - u, cv - v) <= 0.5, `marker ${m.p} at ${cu.toFixed(2)},${cv.toFixed(2)}, expected ${u.toFixed(2)},${v.toFixed(2)}`);
  }
  // the in-between is far closer to the true picture at t than the cross-fade
  const truth = render(r.camT).img.data;
  let ew = 0, ef = 0;
  for (let i = 0; i < truth.length; i++) { ew += Math.abs(r.rgb[i] - truth[i]); ef += Math.abs(fade[i] - truth[i]); }
  assert.ok(ew < ef / 3, `warp error ${((ew / truth.length) * 255).toFixed(2)}/255 vs cross-fade ${((ef / truth.length) * 255).toFixed(2)}/255`);
  assert.ok((ew / truth.length) * 255 < 3, 'mean error of the in-between below 3/255');
  t.diagnostic(`max marker error ${worst.toFixed(3)} px, mean error warp ${((ew / truth.length) * 255).toFixed(2)}/255, cross-fade ${((ef / truth.length) * 255).toFixed(2)}/255`);
});

test('unchanged camera returns the input (≤ 1/255)', () => {
  const A = render(camA), depth = delivered(A.w);
  for (const t of [0, 0.25, 0.5]) {
    const r = flowFrame({ imgA: A.img, imgB: A.img, depthA: depth, depthB: depth, camA, camB: camA, t, meta, out: [W, H] });
    let max = 0;
    for (let i = 0; i < r.rgb.length; i++) max = Math.max(max, Math.abs(r.rgb[i] - A.img.data[i]));
    assert.ok(max * 255 <= 1, `t=${t}: max deviation ${(max * 255).toFixed(4)}/255`);
    assert.equal(r.fallback, 0);
  }
});

test('pure rotation over background (w = 0) is exact', () => {
  const loc = [0.1, 0.2, 0.3];
  const ca = { loc, quat: axis('z', 0.5), lens: 40, shift: [0, 0] };
  const cb = { loc, quat: qmul(qmul(axis('y', -3), axis('x', 1)), axis('z', 0.5)), lens: 44, shift: [0.01, -0.01] };
  const sky = { width: W, height: H, data: new Float32Array(W * H * 3) };
  const empty = { w: GW, h: GH, data: new Float32Array(GW * GH) };
  const camT = interpCam(ca, cb, 0.5);
  const r = warpSource({ image: sky, depth: empty, meta, camSrc: ca, camDst: camT, out: [W, H], wantUV: true });
  const Ka = intrinsics(ca, meta), Ra = quatToMat(ca.quat);
  let max = 0, inside = 0, missed = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const D = ray(camT, x + 0.5, y + 0.5);
      const c = [0, 1, 2].map((i) => Ra[i] * D[0] + Ra[3 + i] * D[1] + Ra[6 + i] * D[2]);
      const u = Ka.cx + (Ka.f * c[0]) / -c[2], v = Ka.cy - (Ka.f * c[1]) / -c[2];
      if (u < 1 || u > W - 1 || v < 1 || v > H - 1) continue;
      inside++;
      const p = y * W + x;
      if (Number.isNaN(r.uv[2 * p])) { missed++; continue; }
      max = Math.max(max, Math.abs(r.uv[2 * p] * W - u), Math.abs(r.uv[2 * p + 1] * H - v));
      assert.equal(r.g[p], 1);
    }
  assert.ok(inside > 0.8 * W * H);
  assert.equal(missed, 0, 'every pixel that sees the source is covered');
  assert.ok(max < 1e-3, `max UV deviation ${max} px`); // float32 UV storage: ~1e-5 px
});

test('depth coding: block median, background majority, u8 round trip, camera rows', () => {
  const g = downscaleDepth(new Float32Array([0, 0, 0.5, 0.5, 0, 0.2, 0.5, 0.6]), 4, 2, 2, 1);
  assert.deepEqual([...g], [0, 0.5]); // left block 3 of 4 background → 0; right block upper median
  const grid = new Float32Array([0, 0.1, 0.25, 0.4]);
  const { u8, dn, df } = encodeDepth(grid);
  assert.deepEqual([...u8], [0, 1, 128, 255]);
  const back = decodeDepth(u8, dn, df);
  for (let i = 1; i < 4; i++) assert.ok(Math.abs(back[i] - grid[i]) <= (dn - df) / 508 + 1e-7);
  assert.equal(encodeDepth(new Float32Array([0, 0.3])).u8[1], 255);
  const row = camRow({ loc: [1.234567891, -2, 0.5], quat: [0.70710678, 0, 0.70710678, 0], lens: 50.123456, shift: [0.0012345678, -0.1] }, 0.4123456, 0.0123456789);
  assert.deepEqual(row, [1.23457, -2, 0.5, 0.707107, 0, 0.707107, 0, 50.1235, 0.001235, -0.1, 0.412346, 0.0123457]);
  assert.equal(camFromRow(row).lens, 50.1235);
});

test('no source covers a pixel → plain cross-fade; weak sources keep their share', () => {
  const n = 2, imgA = { width: n, height: 1, data: new Float32Array([1, 1, 1, 1, 1, 1]) };
  const imgB = { width: n, height: 1, data: new Float32Array(6) };
  const warp = (gv, val) => ({ g: new Float32Array([0, gv]), color: new Float32Array(6).fill(val) });
  const r = blend({ warpA: warp(G_MIN, 0.2), warpB: warp(1, 0.6), imgA, imgB, t: 0.25, out: [n, 1] });
  assert.ok(Math.abs(r.rgb[0] - 0.75) < 1e-6, 'pixel 0: cross-fade 0.75·A + 0.25·B');
  const wa = G_MIN * 0.75, wb = 0.25;
  assert.ok(Math.abs(r.rgb[3] - (wa * 0.2 + wb * 0.6) / (wa + wb)) < 1e-6);
  assert.equal(r.fallback, 0.5);
});
