// Checks for the flow data (B1, docs/UEBERGABE-FLUESSIG.md), on the CPU reference tools/qa/flow-warp.mjs.
//
//   --cams <depthdir>         D1: own projection of the probes vs probes_px (Blender world_to_camera_view),
//                             only zc > 0; max deviation, limit 0.1 px. Raw and published (rounded) cameras.
//                             Over the limit: tries the other shift signs / reference sides and names the best.
//   --consistency <depthdir>  D2: raw depth i (every 4th pixel) reprojected with camera i+1 and compared with
//                             depth i+1 where visible (in the picture, not occluded, not background):
//                             median |Δw|/w per pair, limit 1 %. Missing i+1: next present position (gap noted).
//   --f1 --variant V --raw <depthdir> --src <.raw> [--from i --to j] [--grid WxH] [--cam true|interp] --out <dir>
//                             F1: every odd i with i−1, i+1 present (picture and depth): in-between t = 0.5 from
//                             i−1 and i+1 with the depth as shipped (u8) and the published cameras, against
//                             picture i at 960 x 540 / 540 x 960 (area downscale). Error per pixel = mean over
//                             RGB of |Δ|·255; per position mean (limit 2) and p99 (limit 24), the same for
//                             plain cross-fade. Writes f1.csv, summary.json, error maps of the 3 worst positions.
//   [--out <file.json>] for --cams / --consistency writes the result as JSON.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { decodePNG, encodeGray8 } from './png-lite.mjs';
import {
  GRID, intrinsics, quatToMat, project, unproject, interpCam, camFromFrame, camRow, camFromRow,
  rawToW, downscaleDepth, encodeDepth, decodeDepth, toRGBf, resizeArea, flowFrame, crossfade,
} from './flow-warp.mjs';

const D1_LIMIT = 0.1, D2_LIMIT = 0.01, F1_MEAN = 2, F1_P99 = 24;
/** D2: target depth more than 5 % nearer than predicted → the point is hidden there. */
const OCCLUDED = 0.05;
// source frames as in pipeline/images/build-hero.mjs
const BASE = { desktop: 90, mobile: 64 };
const LARGE = { desktop: 1440, mobile: 720 };

const pad = (i) => String(i).padStart(4, '0');
function args(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  return a;
}
const loadCams = async (dir) => JSON.parse(await readFile(join(dir, 'cams.json'), 'utf8'));
const metaOf = (c) => ({ res: c.res, sensor: c.sensor ?? 36, fit: c.fit ?? 'AUTO' });
const frameIds = (c) => Object.keys(c.frames ?? {}).map(Number).sort((a, b) => a - b);
async function rawDepth(dir, i, fr) {
  const png = decodePNG(await readFile(join(dir, `${pad(i)}.png`)));
  if (png.bitDepth !== 16 || png.channels !== 1) throw new Error(`${dir}/${pad(i)}.png: not 16-bit gray`);
  return { W: png.width, H: png.height, w: rawToW(png.data, fr.wmax) };
}
const quantile = (arr, q) => { const s = Float64Array.from(arr).sort(); return s.length ? s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] : NaN; };

// ---------------------------------------------------------------- D1

/** Projection with a chosen convention, for the diagnosis of a failing D1. */
function projectAs(cam, meta, X, { sxs = 1, sys = 1, side = 'fit' }) {
  const [W, H] = meta.res;
  const L = side === 'max' ? Math.max(W, H) : side === 'W' ? W : side === 'H' ? H : null;
  const K = intrinsics(cam, meta);
  const Lf = L ?? (meta.fit === 'HORIZONTAL' ? W : meta.fit === 'VERTICAL' ? H : Math.max(W, H));
  const k = { f: (cam.lens / meta.sensor) * Lf, cx: W / 2 - sxs * cam.shift[0] * Lf, cy: H / 2 + sys * cam.shift[1] * Lf };
  return project(cam, meta, X, L || sxs !== 1 || sys !== 1 ? k : K);
}

export async function checkCams(dir) {
  const c = await loadCams(dir), meta = metaOf(c);
  const variants = [];
  for (const side of ['fit', 'max', 'W', 'H']) for (const sxs of [1, -1]) for (const sys of [1, -1]) variants.push({ side, sxs, sys });
  const worst = variants.map(() => 0);
  let maxRaw = 0, maxRounded = 0, n = 0, frames = 0, at = null;
  for (const i of frameIds(c)) {
    const fr = c.frames[String(i)];
    if (!fr.probes_px) continue;
    frames++;
    const cam = camFromFrame(fr), rounded = camFromRow(camRow(cam, 0, 0));
    fr.probes_px.forEach(([u, v, zc], j) => {
      if (!(zc > 0)) return;
      const X = c.probes[j].world;
      const [pu, pv] = project(cam, meta, X), [ru, rv] = project(rounded, meta, X);
      const d = Math.hypot(pu - u, pv - v);
      if (d > maxRaw) { maxRaw = d; at = { i, probe: c.probes[j].name ?? j }; }
      maxRounded = Math.max(maxRounded, Math.hypot(ru - u, rv - v));
      variants.forEach((vt, k) => { const [qu, qv] = projectAs(cam, meta, X, vt); worst[k] = Math.max(worst[k], Math.hypot(qu - u, qv - v)); });
      n++;
    });
  }
  const best = variants.map((v, k) => ({ ...v, max: worst[k] })).sort((a, b) => a.max - b.max)[0];
  return {
    check: 'D1', variant: c.variant, count: c.count, frames: Object.keys(c.frames ?? {}).length, framesWithProbes: frames, points: n,
    maxRaw, maxRounded, at, limit: D1_LIMIT, pass: n > 0 && maxRaw <= D1_LIMIT && maxRounded <= D1_LIMIT,
    bestConvention: best, // side 'fit' with sxs = sys = 1 is the formula in flow-warp.mjs
  };
}

// ---------------------------------------------------------------- D2

export async function checkConsistency(dir) {
  const c = await loadCams(dir), meta = metaOf(c);
  const ids = frameIds(c).filter((i) => existsSync(join(dir, `${pad(i)}.png`)));
  const pairs = [];
  for (let k = 0; k + 1 < ids.length; k++) {
    const i = ids[k], j = ids[k + 1];
    if (j - i > 8) continue;
    const fa = c.frames[String(i)], fb = c.frames[String(j)];
    const A = await rawDepth(dir, i, fa), B = await rawDepth(dir, j, fb);
    const ca = camFromFrame(fa), cb = camFromFrame(fb);
    const Ka = intrinsics(ca, meta), Ra = quatToMat(ca.quat), Kb = intrinsics(cb, meta), Rb = quatToMat(cb.quat);
    const rel = [];
    let tried = 0, occluded = 0, outside = 0, bg = 0;
    for (let y = 0; y < A.H; y += 4)
      for (let x = 0; x < A.W; x += 4) {
        const w = A.w[y * A.W + x];
        if (!(w > 0)) continue;
        tried++;
        const X = unproject(ca, meta, x + 0.5, y + 0.5, w, Ka, Ra);
        const [u, v, zc] = project(cb, meta, X, Kb, Rb);
        if (!(zc > 0) || u < 0 || v < 0 || u >= B.W || v >= B.H) { outside++; continue; }
        const wo = B.w[Math.floor(v) * B.W + Math.floor(u)], wp = 1 / zc;
        if (!(wo > 0)) { bg++; continue; }
        if (wo > wp * (1 + OCCLUDED)) { occluded++; continue; }
        rel.push(Math.abs(wo - wp) / wp);
      }
    const median = quantile(rel, 0.5);
    pairs.push({ i, j, gap: j - i, samples: rel.length, tried, occluded, outside, bg, median, p90: quantile(rel, 0.9), pass: rel.length > 0 && median <= D2_LIMIT });
  }
  const worst = pairs.reduce((m, p) => (p.median > (m?.median ?? -1) ? p : m), null);
  return { check: 'D2', variant: c.variant, pairs: pairs.length, consecutive: pairs.filter((p) => p.gap === 1).length, limit: D2_LIMIT, pass: pairs.length > 0 && pairs.every((p) => p.pass), worst, list: pairs };
}

// ---------------------------------------------------------------- F1

/** Fine index → source PNG, as build-hero.mjs: large in-between over small, base frame over both; the sharp
 *  hold frames win as in the motion sets. Motion-blur frames are left out (they are not a sharp reference). */
export async function sources(src, variant, count, fine = 8) {
  const numbered = async (d) => (existsSync(d) ? (await readdir(d)).filter((f) => /^\d{4}\.png$/.test(f)).map((f) => Number(f.slice(0, 4))) : []);
  const map = new Map();
  for (const d of [`${variant}-fine`, `${variant}-fine-${LARGE[variant]}`]) for (const i of await numbered(join(src, d))) if (i < count) map.set(i, { file: join(src, d, `${pad(i)}.png`), dir: d });
  for (const b of await numbered(join(src, variant))) if (b < BASE[variant] && b * fine < count) map.set(b * fine, { file: join(src, variant, `${pad(b)}.png`), dir: variant });
  for (const i of await numbered(join(src, `${variant}-hold`))) if (i < count) map.set(i, { file: join(src, `${variant}-hold`, `${pad(i)}.png`), dir: `${variant}-hold` });
  return map;
}

function errorStats(img, ref) {
  const n = ref.length / 3, e = new Float32Array(n);
  let sum = 0;
  for (let p = 0; p < n; p++) {
    const v = ((Math.abs(img[3 * p] - ref[3 * p]) + Math.abs(img[3 * p + 1] - ref[3 * p + 1]) + Math.abs(img[3 * p + 2] - ref[3 * p + 2])) / 3) * 255;
    e[p] = v; sum += v;
  }
  return { e, mean: sum / n, p99: quantile(e, 0.99) };
}

export async function checkF1(a) {
  const variant = a.variant, raw = a.raw, outDir = a.out;
  const c = await loadCams(raw), meta = metaOf(c), [W, H] = meta.res;
  const [gw, gh] = a.grid ? a.grid.split('x').map(Number) : GRID[variant];
  const camMode = a.cam === 'interp' ? 'interp' : 'true';
  const src = await sources(a.src, variant, c.count, c.fine ?? 8);
  const hasDepth = (i) => c.frames?.[String(i)] && existsSync(join(raw, `${pad(i)}.png`));
  const from = Number(a.from ?? 0), to = Number(a.to ?? c.count - 1);
  const shipped = new Map(), pictures = new Map();
  const depthOf = async (i) => {
    if (!shipped.has(i)) {
      const fr = c.frames[String(i)], d = await rawDepth(raw, i, fr);
      const { u8, dn, df } = encodeDepth(downscaleDepth(d.w, d.W, d.H, gw, gh));
      shipped.set(i, { depth: { w: gw, h: gh, data: decodeDepth(u8, dn, df) }, cam: camFromRow(camRow(camFromFrame(fr), dn, df)) });
    }
    return shipped.get(i);
  };
  const picture = async (i) => {
    if (!pictures.has(i)) pictures.set(i, resizeArea(toRGBf(decodePNG(await readFile(src.get(i).file))), W, H));
    for (const k of pictures.keys()) if (k < i - 2) pictures.delete(k);
    return pictures.get(i);
  };
  await mkdir(outDir, { recursive: true });
  const rows = [], worst = [];
  const t0 = Date.now();
  for (let i = Math.max(1, from); i <= to; i++) {
    if (i % 2 !== 1) continue;
    if (!(src.has(i - 1) && src.has(i) && src.has(i + 1) && hasDepth(i - 1) && hasDepth(i + 1))) continue;
    const A = await depthOf(i - 1), B = await depthOf(i + 1);
    const imgA = await picture(i - 1), imgRef = await picture(i), imgB = await picture(i + 1);
    const frT = c.frames?.[String(i)];
    const camTrue = frT ? camFromRow(camRow(camFromFrame(frT), 0, 0)) : null;
    const camInterp = interpCam(A.cam, B.cam, 0.5);
    const camT = camMode === 'true' && camTrue ? camTrue : camInterp;
    // deviation of the interpolated from the true camera, in probe pixels
    let camDev = null;
    if (camTrue && c.probes?.length) {
      camDev = 0;
      for (const pr of c.probes) {
        const [u1, v1, z1] = project(camInterp, meta, pr.world), [u2, v2, z2] = project(camTrue, meta, pr.world);
        if (z1 > 0 && z2 > 0) camDev = Math.max(camDev, Math.hypot(u1 - u2, v1 - v2));
      }
    }
    const r = flowFrame({ imgA, imgB, depthA: A.depth, depthB: B.depth, camA: A.cam, camB: B.cam, t: 0.5, meta, out: [W, H], camT });
    const ew = errorStats(r.rgb, imgRef.data), ef = errorStats(crossfade(imgA, imgB, 0.5, [W, H]), imgRef.data);
    const row = {
      i, srcA: src.get(i - 1).dir, srcRef: src.get(i).dir, srcB: src.get(i + 1).dir, cam: camT === camTrue ? 'true' : 'interp',
      mean: ew.mean, p99: ew.p99, fadeMean: ef.mean, fadeP99: ef.p99, fallback: r.fallback, camDev,
      pass: ew.mean <= F1_MEAN && ew.p99 <= F1_P99, fadePass: ef.mean <= F1_MEAN && ef.p99 <= F1_P99,
    };
    rows.push(row);
    worst.push({ i, mean: ew.mean, e: ew.e });
    worst.sort((x, y) => y.mean - x.mean);
    if (worst.length > 3) worst.pop();
    if (a.verbose) console.log(`F1 ${i}: warp ${row.mean.toFixed(2)} / ${row.p99.toFixed(1)}, fade ${row.fadeMean.toFixed(2)} / ${row.fadeP99.toFixed(1)}`);
  }
  // error maps of the worst positions: error ×4 as gray, half size (≤ 480 px wide)
  for (const w of worst) {
    const ow = Math.round(W / 2), oh = Math.round(H / 2);
    const rgb = new Float32Array(W * H * 3);
    for (let p = 0; p < W * H; p++) rgb[3 * p] = rgb[3 * p + 1] = rgb[3 * p + 2] = w.e[p];
    const small = resizeArea({ width: W, height: H, data: rgb }, ow, oh).data;
    const g = new Uint8Array(ow * oh);
    for (let p = 0; p < g.length; p++) g[p] = Math.min(255, Math.round(small[3 * p] * 4));
    await writeFile(join(outDir, `f1-error-${pad(w.i)}.png`), encodeGray8(ow, oh, g));
  }
  const f = (x, d = 3) => (x == null ? '' : x.toFixed(d));
  const csv = ['i,src_a,src_ref,src_b,cam,mean,p99,fade_mean,fade_p99,fallback,cam_dev_px,pass,fade_pass',
    ...rows.map((r) => [r.i, r.srcA, r.srcRef, r.srcB, r.cam, f(r.mean), f(r.p99), f(r.fadeMean), f(r.fadeP99), f(r.fallback, 5), f(r.camDev, 4), r.pass ? 1 : 0, r.fadePass ? 1 : 0].join(','))];
  await writeFile(join(outDir, 'f1.csv'), csv.join('\n') + '\n');
  const failures = rows.filter((r) => !r.pass).map((r) => r.i);
  const runs = [];
  for (const i of failures) { const last = runs.at(-1); if (last && i - last[1] === 2) last[1] = i; else runs.push([i, i]); }
  const avg = (k) => (rows.length ? rows.reduce((s, r) => s + r[k], 0) / rows.length : null);
  const summary = {
    check: 'F1', variant, grid: [gw, gh], cam: camMode, positions: rows.length, pass: rows.length - failures.length,
    fadePass: rows.filter((r) => r.fadePass).length, limits: { mean: F1_MEAN, p99: F1_P99 },
    avg: { mean: avg('mean'), p99: avg('p99'), fadeMean: avg('fadeMean'), fadeP99: avg('fadeP99') },
    max: { mean: Math.max(...rows.map((r) => r.mean)), p99: Math.max(...rows.map((r) => r.p99)), camDev: Math.max(0, ...rows.map((r) => r.camDev ?? 0)) },
    failures, runs, worst: worst.map((w) => w.i), seconds: (Date.now() - t0) / 1000,
  };
  await writeFile(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  return summary;
}

// ---------------------------------------------------------------- CLI

const isMain = process.argv[1] && /flow-check\.mjs$/i.test(process.argv[1]);
if (isMain) {
  const a = args(process.argv.slice(2));
  let r;
  if (typeof a.cams === 'string') r = await checkCams(a.cams);
  else if (typeof a.consistency === 'string') r = await checkConsistency(a.consistency);
  else if (a.f1 && a.variant && a.raw && a.src && a.out) r = await checkF1(a);
  else {
    console.error('usage: flow-check.mjs --cams <depthdir> | --consistency <depthdir> | --f1 --variant V --raw <depthdir> --src <.raw> --out <dir> [--from i --to j] [--grid WxH] [--cam true|interp]');
    process.exit(2);
  }
  if (a.out && !a.f1) await writeFile(a.out, JSON.stringify(r, null, 2) + '\n');
  const { list, ...short } = r;
  console.log(JSON.stringify(short, null, 1));
  if (r.pass === false && r.check !== 'F1') process.exitCode = 1;
}
