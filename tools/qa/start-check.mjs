// Start of the hero journey on a cold cache (T-20261022-52, S1–S3), production build (node server.mjs).
//   node tools/qa/start-check.mjs <base-url> [--profiles P1,P2] [--runs 3] [--swipe-at 2000] [--speed 1500]
//                                 [--no-swipe] [--no-full] [--net <Mbit/s>,<rtt ms>] [--cdp 9336] [--out <file.json>] [--video] [--query <a=b>]
// Every run starts a fresh browser profile (empty cache, no warm connections) with the network throttled
// over CDP (Network.emulateNetworkConditions) and records every request with its CDP timestamps.
//   P1  1707 x 960 @ 1.5, 50 Mbit/s, 20 ms RTT          P2  390 x 844 @ 3, touch, 12 Mbit/s, 70 ms RTT
// S1 "warpable": time from the navigation (the document request) until
//   - the frames of the motion set from position 0 up to the first stop are in, no two more than 2 positions
//     apart (a chain 0 = f0 < f1 < … < fk >= ceil(stop), fi+1 − fi <= 2: what the warp needs, MAX_SPAN 2), and
//   - the flow file of the variant and every depth sheet holding a tile of those positions are in
//     (tileOf from src/scripts/journey-flow.ts, so a new depth format is read the way the player reads it),
//   plus the bytes transferred until then (all requests, and the frames alone). "In" means loadingFinished.
//   Also reported: "coarse", the time the whole move is in on the base grid (every `fine`-th frame).
// S2 swipe: --swipe-at ms after the navigation a mouse gesture scrolls from the top down to the first stop
//   at --speed px/s (default 1500: the slowest flick of flow-gl.mjs --fast, a quick thumb that reaches the
//   first stop in under a second on the phone). Read from [data-journey-canvas] data-journey-frame =
//   "<pos> <a> <b> <mode>" (MutationObserver injected before the page) from the gesture on until 1.5 s after it:
//   no warp/fade pair wider than 2 (N1), and the content no further than 2 positions from the camera
//   (warp/fade: max |a − pos|, |b − pos|; whole: |a − pos|; N2 with the strict P1 value). Whole frames shown
//   because only coarse frames have arrived lie further out and fail it. Info: largest step of the content
//   between two records, count per mode, whether the camera reached the stop.
// S3 (unless --no-full): after the swipe the run waits until no hero request is open or new for 3 s
//   (at most 120 s) and sums the transferred bytes of /hero/ without /hero/*/flow/ (frames and stills),
//   the flow data separately.
// prefers-reduced-motion is forced to no-preference (headless Edge on this PC reports reduce).
// Exit 1 when a run misses data (no motion set, no frames, swipe not through); the criteria are
// relative to a baseline and are judged from the printed medians.
// --video (T-20261031-01, M4/M5/M7): the video path, opened with ?vstats=1. There is no warp any more, so S1 becomes
//   "start": time from the navigation until index.json and all segments of the start window (startWindow of
//   journey-load.ts, the segments segmentOrder puts first) are in, plus, for positions up to the first stop the set
//   does not cover, the WebP chain of S1 (no flow, no depth). windowFirst: no other segment was requested before the
//   start window was in. In the swipe the player shows the exact frame or nothing: on a miss, and before the player has its
//   first frame, the picture holds without a new record. So a rAF sampler logs note, stats().misses and scrollY per
//   animation frame: at least 2 frames with the same note while the page scrolled or draw missed are a hold, and the
//   step of the content across a hold counts as the gap (gap > 2 positions fails, like far). A step without a hold is
//   the camera moving, not a gap. A hold still open when the log ends fails as well.
//   Also reported: requests and bytes per kind (flow, motion WebP, other hero files, video), stats() after loading.
import { launch, scrollToProgress } from './browser.mjs';
import { writeFileSync } from 'node:fs';
import { tileOf } from '../../src/scripts/journey-flow.ts';
import { startWindow } from '../../src/scripts/journey-load.ts';
import { covers, inWindow, parseIndex, pickSet } from '../../src/scripts/journey-video.ts';

const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:\/\//.test(a)) ?? 'http://127.0.0.1:4322').replace(/\/$/, '');
const opt = (flag, fallback) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback);
const has = (flag) => args.includes(flag);
const cdp = Number(opt('--cdp', 9336));
const runs = Number(opt('--runs', 3));
const swipeAt = Number(opt('--swipe-at', 2000));
const speed = Number(opt('--speed', 1500));
const out = opt('--out', null);
const net = opt('--net', null);
const video = has('--video');
const query = opt('--query', '');
const PROFILES = {
  P1: { width: 1707, height: 960, dpr: 1.5, mobile: false, mbit: 50, rtt: 20 },
  P2: { width: 390, height: 844, dpr: 3, mobile: true, mbit: 12, rtt: 70 },
};
const chosen = opt('--profiles', 'P1,P2').split(',');
for (const name of chosen) if (!PROFILES[name]) throw new Error(`unknown profile ${name}`);
if (net) for (const name of chosen) [PROFILES[name].mbit, PROFILES[name].rtt] = net.split(',').map(Number);

const RECORDER = `(() => {
  const log = (window.__frames = []);
  new MutationObserver((list) => {
    for (const m of list) log.push([performance.now(), m.target.getAttribute('data-journey-frame')]);
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-journey-frame'] });
})()`;

const SAMPLER = `(() => {
  const log = (window.__samples = []);
  const tick = () => {
    const note = document.querySelector('[data-journey-canvas]')?.dataset.journeyFrame ?? '';
    log.push([performance.now(), note, window.__rsVideo ? window.__rsVideo().misses : 0, Math.round(scrollY)]);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})()`;

const median = (xs) => {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return NaN;
  return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
};
const metaCache = new Map();
async function metaOf(path) {
  if (!metaCache.has(path)) metaCache.set(path, await (await fetch(base + path)).json());
  return metaCache.get(path);
}

/** Earliest time at which the frames finished so far form a chain from 0 to `end` with gaps <= 2. */
function chainTime(frames, end) {
  const sorted = [...frames].filter((f) => f.pos <= end + 2).sort((a, b) => a.t - b.t);
  const have = new Set();
  for (const f of sorted) {
    have.add(f.pos);
    if (!have.has(0)) continue;
    let at = 0;
    while (at < end) {
      if (have.has(at + 2)) at += 2;
      else if (have.has(at + 1)) at += 1;
      else break;
    }
    if (at >= end) return f.t;
  }
  return NaN;
}

async function run(name, index) {
  const p = PROFILES[name];
  const page = await launch({ port: cdp });
  const reqs = new Map();
  let doc = null;
  page.on('Network.requestWillBeSent', (e) => {
    if (!reqs.has(e.requestId)) reqs.set(e.requestId, { url: e.request.url, start: e.timestamp, type: e.type });
    if (e.type === 'Document' && doc === null) doc = e.timestamp;
  });
  page.on('Network.responseReceived', (e) => {
    const r = reqs.get(e.requestId);
    if (r) r.status = e.response.status;
  });
  page.on('Network.loadingFinished', (e) => {
    const r = reqs.get(e.requestId);
    if (r) Object.assign(r, { end: e.timestamp, bytes: e.encodedDataLength });
  });
  page.on('Network.loadingFailed', (e) => {
    const r = reqs.get(e.requestId);
    if (r) Object.assign(r, { failed: e.errorText, end: e.timestamp });
  });
  try {
    await page.send('Network.clearBrowserCache');
    await page.viewport(p.width, p.height, { dpr: p.dpr, mobile: p.mobile });
    await page.media({ 'prefers-reduced-motion': 'no-preference' });
    const rate = (p.mbit * 1e6) / 8;
    await page.send('Network.emulateNetworkConditions', { offline: false, latency: p.rtt, downloadThroughput: rate, uploadThroughput: rate });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER });
    if (video) await page.send('Page.addScriptToEvaluateOnNewDocument', { source: SAMPLER });
    const navigated = Date.now();
    await page.send('Page.navigate', { url: `${base}/${video ? '?vstats=1' + (query ? '&' + query : '') : ''}` });
    let swipe = null;
    if (!has('--no-swipe')) {
      await page.wait(Math.max(0, navigated + swipeAt - Date.now()));
      const top = await page.eval(scrollToProgress(`JSON.parse(document.querySelector('[data-journey]').dataset.stops)[1]`).replace('scrollTo(0, ', 'return ('));
      const t = await page.eval('performance.now()');
      await page.send('Input.synthesizeScrollGesture', { x: Math.round(p.width / 2), y: Math.round(p.height / 2), yDistance: -Math.round(top), speed, gestureSourceType: 'mouse', preventFling: true });
      const t2 = await page.eval('performance.now()');
      await page.wait(1500);
      swipe = { from: t, to: t2, top: Math.round(top), scrolled: Math.round(await page.eval('scrollY')) };
    } else await page.wait(Math.max(0, navigated + swipeAt - Date.now()));
    const state = await page.eval(`(() => {
      const j = document.querySelector('[data-journey]');
      return { set: j?.dataset.set ?? '', tier: j?.dataset.tier ?? '', detail: j?.dataset.detail ?? '', sets: JSON.parse(j?.dataset.sets || '{}'),
        stops: JSON.parse(j?.dataset.stops || '[]'), base: j?.dataset.base ?? '', fine: j?.dataset.fine ?? '', on: document.documentElement.classList.contains('journey-on'), frames: window.__frames, samples: window.__samples, video: JSON.parse(j?.dataset.video || 'null') };
    })()`);
    if (!has('--no-full')) {
      // wait until the hero has stopped loading: nothing open, nothing finished for 3 s
      const limit = Date.now() + 120000;
      let quietSince = Date.now();
      let seen = -1;
      while (Date.now() < limit) {
        await page.wait(500);
        const hero = [...reqs.values()].filter((r) => r.url.includes('/hero/'));
        const open = hero.some((r) => r.end === undefined);
        const done = hero.filter((r) => r.end !== undefined).length;
        if (open || done !== seen) {
          seen = done;
          quietSince = Date.now();
        } else if (Date.now() - quietSince > 3000) break;
      }
    }
    // the level of detail the move ended up with (the slow-link rule may have stopped it)
    state.detail = await page.eval(`document.querySelector('[data-journey]')?.dataset.detail ?? ''`);
    if (video) state.stats = await page.eval('window.__rsVideo ? window.__rsVideo() : null');
    return evaluate(name, index, p, state, [...reqs.values()], doc, swipe);
  } finally {
    await page.close();
  }
}

async function evaluate(name, index, p, state, reqs, t0, swipe) {
  const r = { profile: name, run: index, set: state.set, tier: state.tier, detail: state.detail, journey: state.on };
  const info = state.sets[state.set];
  if (!info || t0 === null) return { ...r, error: 'no motion set / no document request' };
  if (video) return evaluateVideo(r, info, state, reqs, t0, swipe);
  const last = info.count - 1;
  const stop = state.stops.find((s) => s > 0) * last;
  const end = Math.ceil(stop);
  const ok = (q) => q.end !== undefined && !q.failed && (q.status ?? 200) < 400;
  const ms = (t) => Math.round((t - t0) * 1000);
  const framePath = `${state.base}/${state.set}/`;
  const frames = reqs.filter((q) => ok(q) && q.url.includes(framePath)).map((q) => ({ pos: Number(q.url.slice(q.url.lastIndexOf('/') + 1, -5)), t: q.end }));
  const tFrames = chainTime(frames, end);
  const variant = info.variant;
  const metaPath = `${state.base}/flow/${variant}.json`;
  const metaReq = reqs.find((q) => ok(q) && q.url.endsWith(metaPath));
  let tDepth = NaN;
  let sheetsNeeded = [];
  try {
    const meta = await metaOf(metaPath);
    const sheets = new Set();
    for (let i = 0; i <= Math.min(last, end); i++) sheets.add(tileOf(i, meta.depth).sheet);
    sheetsNeeded = [...sheets].map((s) => `${state.base}/flow/${meta.sheets[s]}`);
    const times = sheetsNeeded.map((u) => reqs.find((q) => ok(q) && q.url.endsWith(u))?.end ?? NaN);
    tDepth = Math.max(metaReq?.end ?? NaN, ...times);
  } catch (e) {
    r.depthError = String(e.message ?? e);
  }
  const fine = Number(state.fine) || 8;
  const coarseWanted = new Set();
  for (let i = 0; i <= last; i += fine) coarseWanted.add(i);
  coarseWanted.add(last);
  const coarseFrames = frames.filter((f) => coarseWanted.has(f.pos));
  const tCoarse = new Set(coarseFrames.map((f) => f.pos)).size === coarseWanted.size ? Math.max(...coarseFrames.map((f) => f.t)) : NaN;
  const tWarp = Math.max(tFrames, tDepth);
  const sumUntil = (list, t) => list.filter((q) => ok(q) && q.end <= t + 1e-6).reduce((s, q) => s + (q.bytes ?? 0), 0);
  Object.assign(r, {
    stop: Number(stop.toFixed(2)),
    warpMs: ms(tWarp),
    framesMs: ms(tFrames),
    depthMs: ms(tDepth),
    coarseMs: ms(tCoarse),
    bytesWarp: sumUntil(reqs, tWarp),
    frameBytesWarp: sumUntil(reqs.filter((q) => q.url.includes(framePath)), tWarp),
    firstFrameMs: ms(Math.min(...reqs.filter((q) => q.url.includes(framePath)).map((q) => q.start))),
    framesTotal: frames.length,
    heroBytes: reqs.filter((q) => ok(q) && q.url.includes('/hero/') && !q.url.includes('/flow/')).reduce((s, q) => s + q.bytes, 0),
    flowBytes: reqs.filter((q) => ok(q) && q.url.includes('/flow/')).reduce((s, q) => s + q.bytes, 0),
    allBytes: reqs.filter(ok).reduce((s, q) => s + (q.bytes ?? 0), 0),
    sheetsNeeded: sheetsNeeded.length,
  });
  if (swipe) {
    const recs = (state.frames ?? [])
      .filter(([t]) => t >= swipe.from)
      .map(([t, v]) => {
        const [pos, a, b] = v.split(' ').slice(0, 3).map(Number);
        const mode = v.split(' ')[3];
        const c = mode === 'whole' ? a : pos;
        const dist = mode === 'whole' ? Math.abs(a - pos) : Math.max(Math.abs(a - pos), Math.abs(b - pos));
        return { t, pos, a, b, mode, c, dist };
      });
    const wide = recs.filter((x) => x.mode !== 'whole' && x.b - x.a > 2).length;
    let maxStep = 0;
    for (let i = 1; i < recs.length; i++) maxStep = Math.max(maxStep, Math.abs(recs[i].c - recs[i - 1].c));
    const modes = {};
    for (const x of recs) modes[x.mode] = (modes[x.mode] ?? 0) + 1;
    const far = recs.filter((x) => x.dist > 2);
    r.swipe = {
      atMs: Math.round(swipe.from),
      durMs: Math.round(swipe.to - swipe.from),
      records: recs.length,
      reached: recs.length ? Number(Math.max(...recs.map((x) => x.pos)).toFixed(1)) : 0,
      wide,
      far: far.length,
      maxDist: Number(Math.max(0, ...recs.map((x) => x.dist)).toFixed(2)),
      maxStep: Number(maxStep.toFixed(2)),
      modes,
      firstFar: far[0] ? `${far[0].pos} ${far[0].a} ${far[0].b} ${far[0].mode}` : '',
    };
    r.swipe.pass = recs.length > 0 && wide === 0 && far.length === 0 && r.swipe.reached >= 0.9 * stop;
  }
  return r;
}

async function evaluateVideo(r, info, state, reqs, t0, swipe) {
  const set = state.video && pickSet(state.video, info.variant);
  if (!set) return { ...r, error: 'no video set' };
  const last = info.count - 1;
  const stop = state.stops.find((s) => s > 0) * last;
  const end = Math.ceil(stop);
  const ok = (q) => q.end !== undefined && !q.failed && (q.status ?? 200) < 400;
  const ms = (t) => Math.round((t - t0) * 1000);
  const sum = (list) => list.reduce((s, q) => s + (q.bytes ?? 0), 0);
  const indexPath = `${state.video.base}/${set.index}`;
  const dir = indexPath.slice(0, indexPath.lastIndexOf('/') + 1);
  const idx = parseIndex(await metaOf(indexPath));
  const [from, to] = startWindow(info.count, state.stops, 0);
  const win = [from / last, to / last];
  const startSegs = idx.segments.filter((s) => inWindow(s, idx.pos, idx.grid, win));
  const fileOf = (q) => q.url.slice(q.url.lastIndexOf('/') + 1).split('?')[0];
  const segReqs = reqs.filter((q) => q.url.includes(dir) && q.url.includes('.bin')).sort((a, b) => a.start - b.start);
  const windowFiles = new Set(startSegs.map((s) => s.file));
  const tSegs = startSegs.map((s) => segReqs.find((q) => ok(q) && fileOf(q) === s.file)?.end ?? NaN);
  const indexReq = reqs.find((q) => ok(q) && q.url.endsWith(indexPath));
  const framePath = `${state.base}/${state.set}/`;
  const frameReqs = reqs.filter((q) => q.url.includes(framePath));
  const frames = frameReqs.filter(ok).map((q) => ({ pos: Number(q.url.slice(q.url.lastIndexOf('/') + 1, -5)), t: q.end }));
  let needFrames = false;
  for (let i = 0; i <= Math.min(end, last); i++) if (!covers(set, i / last)) needFrames = true;
  const parts = [...(needFrames ? [chainTime(frames, end)] : []), ...(startSegs.length ? [indexReq?.end ?? NaN, ...tSegs] : [])];
  const flow = reqs.filter((q) => q.url.includes('/flow/'));
  const others = reqs.filter((q) => q.url.includes('/hero/') && !q.url.includes('/flow/') && !q.url.includes('/hero/v/') && !q.url.includes(framePath));
  Object.assign(r, {
    videoSet: set.name,
    stop: Number(stop.toFixed(2)),
    window: [from, to],
    startMs: parts.length ? ms(Math.max(...parts)) : NaN,
    needFrames,
    windowSegments: startSegs.length,
    windowFirst: startSegs.length ? segReqs.filter((q) => !windowFiles.has(fileOf(q))).every((q) => q.start >= Math.max(...tSegs) - 1e-3) : null,
    firstSegmentMs: segReqs.length ? ms(segReqs[0].start) : NaN,
    firstFrameMs: frameReqs.length ? ms(Math.min(...frameReqs.map((q) => q.start))) : NaN,
    videoFirstMs: Math.round((state.samples ?? []).find(([, v]) => v.endsWith(' video'))?.[0] ?? NaN),
    framesTotal: frames.length,
    flowRequests: flow.length,
    flowBytes: sum(flow),
    motionWebp: frameReqs.length,
    motionBytes: sum(frameReqs),
    otherHero: others.length,
    otherHeroBytes: sum(others),
    videoSegments: segReqs.filter(ok).length,
    videoBytes: sum(reqs.filter((q) => q.url.includes('/hero/v/'))),
    heroBytes: sum(reqs.filter((q) => q.url.includes('/hero/'))),
    allBytes: sum(reqs.filter(ok)),
    failed: reqs.filter((q) => q.failed || (q.status ?? 200) >= 400).length,
    stats: state.stats,
  });
  if (swipe) {
    let prev = { c: 0 }; // the camera starts at the top; no note yet means the poster is showing
    let gap = 0;
    let far = 0;
    let wide = 0;
    let firstFar = '';
    let records = 0;
    let reached = 0;
    let misses = null;
    let lastMisses = 0;
    let lastY = 0;
    let lastValue = '';
    let ticks = 0;
    let longestHold = 0;
    const modes = {};
    for (const [t, value, m, y] of state.samples ?? []) {
      const live = t >= swipe.from && (m > lastMisses || y !== lastY);
      if (misses === null && t >= swipe.from) misses = lastMisses;
      lastMisses = m;
      lastY = y;
      if (value === lastValue) {
        if (live) longestHold = Math.max(longestHold, ++ticks);
        continue;
      }
      lastValue = value;
      const [pos, a, b] = value.split(' ').slice(0, 3).map(Number);
      const mode = value.split(' ')[3];
      const c = mode === 'whole' ? a : pos;
      if (t >= swipe.from) {
        records++;
        const dist = mode === 'video' ? 0 : mode === 'whole' ? Math.abs(a - pos) : Math.max(Math.abs(a - pos), Math.abs(b - pos));
        const held = ticks >= 2 ? Math.abs(c - prev.c) : 0;
        gap = Math.max(gap, dist, held);
        if (mode !== 'video' && mode !== 'whole' && b - a > 2) wide++;
        if (dist > 2 || held > 2) {
          far++;
          firstFar ||= `${value} after ${prev.c.toFixed(2)} held ${ticks} frames, misses ${m}`;
        }
        reached = Math.max(reached, pos);
        modes[mode] = (modes[mode] ?? 0) + 1;
      }
      ticks = 0;
      prev = { c };
    }
    if (ticks >= 2) {
      far++;
      firstFar ||= `hold open at the end of the log after ${prev.c.toFixed(2)}, ${ticks} frames`;
    }
    r.swipe = {
      atMs: Math.round(swipe.from),
      durMs: Math.round(swipe.to - swipe.from),
      records,
      reached: Number(reached.toFixed(1)),
      wide,
      far,
      maxGap: Number(gap.toFixed(2)),
      misses: misses !== null ? lastMisses - misses : 0,
      longestHold,
      modes,
      firstFar,
    };
    r.swipe.pass = records > 0 && wide === 0 && far === 0 && r.swipe.reached >= 0.9 * stop;
  }
  return r;
}

const results = [];
let broken = false;
for (const name of chosen) {
  for (let i = 1; i <= runs; i++) {
    const r = await run(name, i);
    results.push(r);
    if (r.error || (!video && !r.framesTotal) || (r.swipe && r.swipe.reached < 0.9 * r.stop)) broken = true;
    if (video) {
      const v = r.swipe ? ` | swipe@${r.swipe.atMs} ${r.swipe.durMs}ms rec ${r.swipe.records} reached ${r.swipe.reached} wide ${r.swipe.wide} far ${r.swipe.far} maxGap ${r.swipe.maxGap} hold ${r.swipe.longestHold} misses ${r.swipe.misses} ${JSON.stringify(r.swipe.modes)} ${r.swipe.pass ? 'PASS' : 'FAIL'} ${r.swipe.firstFar}` : '';
      console.log(`${name}#${i} ${r.error ?? ''}set ${r.set} video ${r.videoSet} tier ${r.tier} start ${r.startMs} ms (window ${r.window} ${r.windowSegments} seg, first ${r.windowFirst}, frames ${r.needFrames}) seg@${r.firstSegmentMs} video@${r.videoFirstMs} | flow ${r.flowRequests}/${r.flowBytes} webp ${r.motionWebp}/${r.motionBytes} other ${r.otherHero}/${r.otherHeroBytes} video ${r.videoSegments}/${r.videoBytes} hero ${r.heroBytes} all ${r.allBytes} failed ${r.failed} tex ${r.stats?.texBytes}${v}`);
      continue;
    }
    const s = r.swipe ? ` | swipe@${r.swipe.atMs} ${r.swipe.durMs}ms rec ${r.swipe.records} reached ${r.swipe.reached} wide ${r.swipe.wide} far ${r.swipe.far} maxDist ${r.swipe.maxDist} maxStep ${r.swipe.maxStep} ${JSON.stringify(r.swipe.modes)} ${r.swipe.pass ? 'PASS' : 'FAIL'} ${r.swipe.firstFar}` : '';
    console.log(`${name}#${i} ${r.error ?? ''}set ${r.set} tier ${r.tier} detail ${r.detail} warp ${r.warpMs} ms (frames ${r.framesMs}, depth ${r.depthMs}) bytes ${r.bytesWarp} (frames ${r.frameBytesWarp}) coarse ${r.coarseMs} ms first ${r.firstFrameMs} ms | hero ${r.heroBytes} flow ${r.flowBytes} all ${r.allBytes} n ${r.framesTotal}${s}`);
  }
  const mine = results.filter((r) => r.profile === name && !r.error);
  const m = (k) => median(mine.map((r) => r[k]));
  if (video) {
    console.log(`${name} median (n=${mine.length}): start ${m('startMs')} ms, video ${m('videoBytes')}, webp ${m('motionBytes')}, flow ${m('flowBytes')}, hero ${m('heroBytes')}; swipe pass ${mine.filter((r) => r.swipe?.pass).length}/${mine.filter((r) => r.swipe).length}`);
    continue;
  }
  console.log(`${name} median (n=${mine.length}): warp ${m('warpMs')} ms, frames ${m('framesMs')}, depth ${m('depthMs')}, bytes ${m('bytesWarp')}, coarse ${m('coarseMs')} ms, hero ${m('heroBytes')}, flow ${m('flowBytes')}; swipe pass ${mine.filter((r) => r.swipe?.pass).length}/${mine.filter((r) => r.swipe).length}`);
}
if (out) writeFileSync(out, JSON.stringify({ base, swipeAt, speed, profiles: Object.fromEntries(chosen.map((n) => [n, PROFILES[n]])), results }, null, 1));
process.exit(broken ? 1 : 0);
