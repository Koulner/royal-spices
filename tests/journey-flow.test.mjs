// K6 (docs/UEBERGABE-FLUESSIG.md, Teil 2): the pure parts of the player's flow warp
// (src/scripts/journey-flow.ts) against the CPU reference tools/qa/flow-warp.mjs and the real data in
// public/hero/5/flow/. The shader itself is compared on the GPU by tools/qa/flow-gl.mjs --g1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as F from '../src/scripts/journey-flow.ts';
import * as R from '../tools/qa/flow-warp.mjs';
import { decodePNG } from '../tools/qa/png-lite.mjs';

const dir = new URL('../public/hero/5/flow/', import.meta.url);
const flow = Object.fromEntries(['desktop', 'mobile'].map((v) => [v, JSON.parse(readFileSync(new URL(`${v}.json`, dir), 'utf8'))]));
const D = flow.desktop;
const same = (a, b, eps, what) => a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) <= eps, `${what}[${i}]: ${x} vs ${b[i]}`));

test('target camera: on a fine position exactly its camera', () => {
  for (const i of [0, 100, 261, D.count - 1]) {
    const cam = F.targetCam(D.cams, i), ref = R.camFromRow(D.cams[i]);
    assert.deepEqual([cam.loc, cam.quat, cam.lens, cam.shift], [ref.loc, ref.quat, ref.lens, ref.shift]);
  }
  assert.equal(F.targetCam(D.cams, D.count + 3).lens, R.camFromRow(D.cams[D.count - 1]).lens); // clamped at the end
});

test('target camera: between two fine positions equal to interpCam of the reference', () => {
  for (const [i, f] of [[100, 0.5], [261, 0.25], [400, 0.875]]) {
    const cam = F.targetCam(D.cams, i + f), ref = R.interpCam(R.camFromRow(D.cams[i]), R.camFromRow(D.cams[i + 1]), f);
    for (const k of ['loc', 'quat', 'shift']) same(cam[k], ref[k], 1e-12, k);
    assert.ok(Math.abs(cam.lens - ref.lens) < 1e-12);
  }
  const gap = D.cams.slice();
  gap[101] = null;
  assert.equal(F.targetCam(gap, 100.5), null);
});

test('target camera: sign of the quaternion does not matter (shortest path)', () => {
  const flipped = D.cams.slice();
  flipped[301] = [...flipped[301].slice(0, 3), ...flipped[301].slice(3, 7).map((v) => -v), ...flipped[301].slice(7)];
  for (const f of [0.25, 0.5, 0.75]) {
    const a = R.quatToMat(F.targetCam(D.cams, 300 + f).quat), b = R.quatToMat(F.targetCam(flipped, 300 + f).quat);
    same(a, b, 1e-12, 'R');
  }
});

test('uniforms M, tv, K: warpPoint equals project(unproject()) of the reference within 1e-6 px', () => {
  let seed = 7;
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32);
  for (const v of ['desktop', 'mobile']) {
    const m = flow[v], [W, H] = m.res;
    for (const [s, p] of [[150, 150.4], [261, 262], [304, 309.5]]) {
      const row = m.cams[s], src = R.camFromRow(row), dst = F.targetCam(m.cams, p);
      const U = F.uniformsFor(src, dst, m);
      for (let n = 0; n < 100; n++) {
        const x = rnd() * W, y = rnd() * H, w = row[11] + rnd() * (row[10] - row[11]);
        const [u, vv, , wt] = F.warpPoint(U, x, y, w);
        const [ru, rv, rz] = R.project(dst, m, R.unproject(src, m, x, y, w));
        assert.ok(Math.abs(u - ru) <= 1e-6 && Math.abs(vv - rv) <= 1e-6, `${v} ${s}→${p}: (${u}, ${vv}) vs (${ru}, ${rv})`);
        assert.ok(Math.abs(wt * rz - 1) < 1e-9, 'target inverse depth');
      }
      const K = R.intrinsics(src, m);
      same(U.ks, [K.f, K.cx, K.cy], 1e-12, 'K');
    }
  }
});

test('depth sheets: addressing and decoding against the real files (positions 0, 63, 64, last)', () => {
  for (const v of ['desktop', 'mobile']) {
    const m = flow[v], { w: gw, h: gh, cols, rows } = m.depth;
    const sheets = new Map();
    const sheet = (s) => sheets.get(s) ?? sheets.set(s, decodePNG(readFileSync(new URL(m.sheets[s], dir)))).get(s);
    const tile = (i) => {
      const { sheet: s, x, y } = F.tileOf(i, m.depth), png = sheet(s);
      assert.deepEqual([png.width, png.height, png.channels], [cols * gw, rows * gh, 1]);
      const out = new Uint8Array(gw * gh);
      for (let r = 0; r < gh; r++) out.set(png.data.subarray((y + r) * png.width + x, (y + r) * png.width + x + gw), r * gw);
      return out;
    };
    // the layout of build-flow.mjs, written out once more
    for (const i of [0, 63, 64, m.count - 1]) {
      const k = i % 64;
      assert.deepEqual(F.tileOf(i, m.depth), { sheet: Math.floor(i / 64), x: (k % 8) * gw, y: Math.floor(k / 8) * gh });
    }
    // neighbouring positions have nearly the same depth, unrelated ones do not; across a sheet border too
    const diff = (a, b) => a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0) / a.length;
    const last = m.count - 1;
    for (const [i, j] of [[0, 1], [62, 63], [63, 64], [64, 65], [last - 1, last]]) assert.ok(diff(tile(i), tile(j)) < 6, `${v} ${i}/${j}: ${diff(tile(i), tile(j))}`);
    assert.ok(diff(tile(0), tile(last)) > 6, `${v}: start and end differ`);
    // the slot after the last position is empty, the last one is not
    const beyond = tile(last + 1);
    if (F.tileOf(last + 1, m.depth).sheet === F.tileOf(last, m.depth).sheet) assert.ok(beyond.every((x) => x === 0), `${v}: slot after the end`);
    assert.ok(tile(last).some((x) => x > 0));
    for (const i of [0, 63, 64, last]) {
      const [dn, df] = m.cams[i].slice(10), codes = tile(i), ref = R.decodeDepth(codes, dn, df);
      codes.forEach((c, n) => assert.equal(Math.fround(F.decodeW(c, dn, df)), ref[n]));
    }
  }
});

test('constants equal those of the reference', () => {
  for (const k of ['RATIO_LO', 'RATIO_HI', 'STRETCH_LO', 'STRETCH_HI', 'G_MIN', 'MIX_EPS', 'ZC_MIN', 'UV_TOL']) assert.equal(F[k], R[k], k);
});

test('mode: warp only when everything is there (R1–R5, R7, ?flow=off)', () => {
  const ok = { off: false, tier: 'high', gl: true, lost: false, data: 'ready', pair: true, slow: false };
  assert.equal(F.flowMode(ok), 'warp');
  assert.equal(F.flowMode({ ...ok, tier: 'medium' }), 'warp');
  for (const change of [{ off: true }, { tier: 'low' }, { gl: false }, { lost: true }, { data: 'failed' }, { data: 'loading' }, { data: 'idle' }, { pair: false }, { slow: true }])
    assert.equal(F.flowMode({ ...ok, ...change }), 'fade', JSON.stringify(change));
  assert.equal(F.flowWanted(ok), true);
  for (const change of [{ off: true }, { tier: 'low' }, { gl: false }]) assert.equal(F.flowWanted({ ...ok, ...change }), false, JSON.stringify(change));
});

test('flow file: the real ones fit their motion sets, broken ones are refused (R2)', () => {
  assert.ok(F.parseMeta(flow.desktop, 'desktop', 713));
  assert.ok(F.parseMeta(flow.mobile, 'mobile', 505));
  const broken = [
    [flow.desktop, 'mobile', 713], [flow.desktop, 'desktop', 712], [null, 'desktop', 713], ['x', 'desktop', 713],
    [{ ...flow.desktop, sheets: flow.desktop.sheets.slice(1) }, 'desktop', 713],
    [{ ...flow.desktop, cams: [[1, 2, 3], ...flow.desktop.cams.slice(1)] }, 'desktop', 713],
    [{ ...flow.desktop, depth: { ...flow.desktop.depth, perSheet: 32 } }, 'desktop', 713],
  ];
  for (const [json, v, n] of broken) assert.equal(F.parseMeta(json, v, n), null);
});

test('watchdog (R7): 60 fps holds, under 45 fps for 2 s trips, a pause starts over', () => {
  const run = (watch, from, ms, gap) => { let t = from; while (t < from + ms) { if (watch.tick(t)) return t - from; t += gap; } return -1; };
  assert.equal(run(F.createWatch(), 0, 10000, 16.7), -1);
  assert.equal(run(F.createWatch(), 0, 10000, 21.5), -1);
  const at = run(F.createWatch(), 0, 10000, 25);
  assert.ok(at >= 2000 && at < 2100, `tripped after ${at} ms`);
  const w = F.createWatch();
  assert.equal(run(w, 0, 1900, 25), -1);
  w.pause();
  assert.equal(run(w, 5000, 1900, 25), -1); // two short slow spells with a rest between do not add up
  assert.equal(run(w, 6900 + 400, 1900, 25), -1); // a gap over 250 ms starts over as well
  assert.equal(w.tripped, false);
});

// R7 relative to the display's base rate (T-20261019-04, W3/W4)
const feed = (base, gaps, from = 0) => { let t = from, done = base.tick(t); for (const g of gaps) done = base.tick((t += g)); return done; };

test('R7 limit: exactly 22 ms at 60 Hz and faster and without a base, scaled beyond (pure)', () => {
  for (const g of [16.7, 8.3, 6.9, null]) assert.equal(F.slowLimit(g), 22, `g = ${g}`);
  assert.ok(Math.abs(F.slowLimit(33.3) - 43.87) < 0.01, `30 Hz: ${F.slowLimit(33.3)}`);
  assert.ok(F.slowLimit(16.8) > 22 && F.slowLimit(16.8) < 22.2);
  assert.deepEqual([F.slowLimit(33.3), F.slowLimit(16.7), F.slowLimit(33.3)], [F.slowLimit(33.3), 22, F.slowLimit(33.3)]); // no state
  assert.equal(F.BASE_SAMPLES, 30);
});

test('base: the lower quarter of 30 intervals, done after the 30th valid one', () => {
  const base = F.createBase();
  const gaps = Array.from({ length: 30 }, (_, i) => 10 + ((i * 7) % 30)); // 10 … 39, shuffled
  assert.equal(feed(base, gaps.slice(0, 29)), false);
  assert.equal(base.value, null);
  assert.equal(base.tick(gaps.reduce((a, b) => a + b, 0)), true); // the 30th
  assert.equal(base.value, 17); // 8th smallest of 10 … 39
  assert.equal(feed(base, [5, 5, 5], 10000), true); // done: further ticks change nothing
  assert.equal(base.value, 17);
});

test('base: gaps over 250 ms and intervals with a warped frame (and the one after) do not count', () => {
  const base = F.createBase();
  let t = 0;
  base.tick(t);
  for (let i = 0; i < 20; i++) base.tick((t += 20));
  base.tick((t += 300)); // tab in the background
  base.warped();
  base.tick((t += 1)); // interval with a warped frame
  base.tick((t += 1)); // and the next
  for (let i = 0; i < 9; i++) assert.equal(base.tick((t += 20)), false);
  assert.equal(base.value, null); // 29 valid so far
  assert.equal(base.tick((t += 20)), true);
  assert.equal(base.value, 20); // neither the 300 ms gap nor the 1 ms intervals
});

test('base: a 60 Hz run with 30 % outliers at 33 ms gives 16.7 ± 0.1', () => {
  const gaps = Array.from({ length: 30 }, (_, i) => (i % 10 < 3 ? 33 : 16.7));
  const base = F.createBase();
  assert.equal(feed(base, gaps, 123.4), true);
  assert.ok(Math.abs(base.value - 16.7) <= 0.1, `base ${base.value}`);
  assert.equal(F.slowLimit(base.value), 22);
});

test('watchdog (R7) at 30 Hz: 33.3 ms holds for 10 s, 50 ms trips after 2 s', () => {
  const run = (watch, from, ms, gap) => { let t = from; while (t < from + ms) { if (watch.tick(t)) return t - from; t += gap; } return -1; };
  const at30 = () => {
    const base = F.createBase();
    feed(base, Array(30).fill(33.3));
    return F.createWatch(() => F.slowLimit(base.value));
  };
  assert.equal(run(at30(), 0, 10000, 33.3), -1);
  const at = run(at30(), 0, 10000, 50);
  assert.ok(at >= 2000 && at < 2100, `tripped after ${at} ms`);
  // without a base the limit stays at 22 ms, as before
  const none = F.createWatch(() => F.slowLimit(F.createBase().value));
  const early = run(none, 0, 10000, 33.3);
  assert.ok(early >= 2000 && early < 2100, `no base: tripped after ${early} ms`);
});
