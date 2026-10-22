// Flow warp in the browser (B1 Teil 2, docs/UEBERGABE-FLUESSIG.md, K1–K5).
//   node tools/qa/flow-gl.mjs <base-url> --g1        K1: shader vs CPU reference (dev server: imports the modules)
//   node tools/qa/flow-gl.mjs <base-url> --rest      K2: settled picture with and without ?flow=off pixel-equal
//   node tools/qa/flow-gl.mjs <base-url> --fallback  K3: R1–R6 play through without errors
//   node tools/qa/flow-gl.mjs <base-url> --f2 [P1,P2] K4: frame pacing at 300 px/s (production build, real GPU)
//   node tools/qa/flow-gl.mjs <base-url> --load      K5: flow requests after the first loading stage, transfer per variant
//   node tools/qa/flow-gl.mjs <base-url> --idle      W7: no rAF call 3 s after the journey came to rest (T-20261019-04)
//   node tools/qa/flow-gl.mjs <base-url> --fast [P1,P2,P2m] [--no-timing] [--out <file.json>]
//                                                    N1–N3 fast scrolling (T-20261020-02), production build. Reads what the
//     player drew per frame from [data-journey-canvas] data-journey-frame = "<pos> <a> <b> <mode>" (MutationObserver,
//     injected before the page). Profiles: P1 1707x960@1.5; P2 390x844@3, touch emulated, CPU 4x; P2m = P2 with
//     deviceMemory 4 (data-tier must read medium). Gestures go in as mouse (a synthetic touch gesture does not scroll
//     headless). Each profile warm (fresh load, one sweep down and up at 300 px/s) and cold (0.3 s after the load
//     event), each gesture on a fresh load: flick 1500 / 4000 / 10000 px/s down and up, mouse wheel 120 px every
//     16 ms for 3 s. prefers-reduced-motion is forced to no-preference.
//     N1 every run, cold included: no warp/fade frame with b − a > 2.
//     N2 warm (cold only reported): shown content at most 4 positions from the camera (P1, flicks up to 4000 px/s: 2);
//        content c = pos for warp/fade (distance max |a − pos|, |b − pos|), c = a for whole (distance |a − pos|); no
//        jump of c by more than 0.5 against the camera's direction of travel.
//     N3 warm, every run: mean ≥ 55 fps and no interval over 33.4 ms. Window: the rAF intervals from the first to the
//        last drawn frame in which the camera position changed, i.e. the time the picture is visibly moving; the
//        idle frames before the first input event and after the camera came to rest do not show motion and are left
//        out. --no-timing leaves N3 out (remote desktop: 30 Hz, no statement on the frame rate).
//     Also checks that every run scrolled through the journey (≥ 90 % of its span) and that frames were recorded.
// --cdp <port>   DevTools port of the headless browser (default 9336), for every mode.
// R7 relative to the base rate (T-20261019-04, W1/W2), both with --f2:
//   --hz30            a 30 Hz display: rAF callbacks run together on a 33.3 ms timetable, at the first real tick
//                     no more than 8.3 ms before the due time, with its timestamp; checks W1 instead of F2
//   --slow-warp <ms>  that much CPU load on every warped frame (the mixing pass only); checks that R7 trips (W2)
// Exit 1 when a check fails. Headless Chrome with the machine's GPU (browser.mjs); SwiftShader does not count for --f2.
// On another machine (F2 on the laptop, E2): node tools/qa/flow-gl.mjs http://127.0.0.1:4322 --f2
import { launch, scrollToProgress } from './browser.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePNG } from './png-lite.mjs';

const args = process.argv.slice(2);
const base = args.find((a) => /^https?:\/\//.test(a)) ?? 'http://127.0.0.1:4321';
const has = (flag) => args.includes(flag);
const slowWarp = has('--slow-warp') ? Number(args[args.indexOf('--slow-warp') + 1]) : 0;
if (has('--slow-warp') && !(slowWarp > 0)) throw new Error('--slow-warp needs a number of ms');
const cdp = has('--cdp') ? Number(args[args.indexOf('--cdp') + 1]) : 9336;
if (!(cdp > 0)) throw new Error('--cdp needs a port');

// a 30 Hz display stand-in for every rAF user on the page (journey, base run, F2 recording).
// Each 30 Hz frame has a due time; the callbacks run at the first real tick no more than TOL before it.
// A tick within TOL of the due time keeps the timetable (due += PERIOD), so the spacing of the real ticks
// does not add up: under CPU 4x they do not come on a fixed grid. A later tick (load, a pause) starts the
// timetable anew one period after itself, without catching up. __hz30.real: the real tick spacing.
const HZ30 = `(() => {
  const real = requestAnimationFrame.bind(window), PERIOD = 1000 / 30, TOL = PERIOD / 4;
  let queue = new Map(), id = 0, pending = 0, due = -Infinity, prev = -1;
  const log = (window.__hz30 = { real: [] });
  // pending stays set while the callbacks run, so that their own requests do not ask for a second real tick
  const tick = (now) => {
    if (prev >= 0 && log.real.length < 20000) log.real.push(now - prev);
    prev = now;
    if (now >= due - TOL) {
      due = now - due <= TOL ? due + PERIOD : now + PERIOD;
      const run = queue;
      queue = new Map();
      for (const cb of run.values()) try { cb(now); } catch (e) { setTimeout(() => { throw e; }); }
    }
    pending = queue.size ? real(tick) : 0;
    if (!pending) prev = -1;
  };
  window.requestAnimationFrame = (cb) => { queue.set(++id, cb); if (!pending) pending = real(tick); return id; };
  window.cancelAnimationFrame = (n) => { queue.delete(n); };
})();`;
// CPU load in the mixing pass (one triangle onto the canvas), i.e. on warped frames only
const SLOW = (ms) => `(() => {
  const draw = WebGL2RenderingContext.prototype.drawArrays;
  WebGL2RenderingContext.prototype.drawArrays = function (mode, first, count) {
    const out = draw.call(this, mode, first, count);
    if (count === 3) { const end = performance.now() + ${ms}; while (performance.now() < end); }
    return out;
  };
})();`;
const manifest = JSON.parse(readFileSync(new URL('../../src/data/hero-manifest.json', import.meta.url), 'utf8'));
const flowDir = new URL(`../../public${manifest.base}/flow/`, import.meta.url);

let failed = 0;
const check = (ok, text) => {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const fnv = (bytes) => { let h = 2166136261; for (const b of bytes) h = Math.imul(h ^ b, 16777619) >>> 0; return h; };

const RENDERER = `(() => { const gl = document.createElement('canvas').getContext('webgl2'); if (!gl) return 'none';
  const e = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : gl.RENDERER); })()`;
// what the stage shows: warp canvas state and opacity, frame layers reduced to a hash
const STAGE = `(() => {
  const j = document.querySelector('[data-journey]'), c = document.querySelector('[data-journey-flow]');
  const t = document.createElement('canvas'); t.width = 16; t.height = 16; const x = t.getContext('2d');
  for (const l of document.querySelectorAll('[data-journey-layer]')) { x.globalAlpha = Number(getComputedStyle(l).opacity); x.drawImage(l, 0, 0, 16, 16); }
  const d = x.getImageData(0, 0, 16, 16).data; let hash = 0, lo = 255, hi = 0;
  for (let i = 0; i < d.length; i += 4) { hash = (Math.imul(hash, 31) + d[i] * 65536 + d[i + 1] * 256 + d[i + 2]) >>> 0; lo = Math.min(lo, d[i + 1]); hi = Math.max(hi, d[i + 1]); }
  return { on: document.documentElement.classList.contains('journey-on'), tier: j?.dataset.tier, set: j?.dataset.set, flow: c ? c.dataset.journeyFlow || '' : null,
    glVisible: c ? getComputedStyle(c).opacity === '1' : false, hash, spread: hi - lo };
})()`;

const page = await launch({ port: cdp });
const urls = [];
page.on('Network.requestWillBeSent', (p) => urls.push(p.request.url));
const flowUrls = () => urls.filter((u) => u.includes(`${manifest.base}/flow/`));
const problems = () => page.consoleMessages.filter((m) => ['error', 'exception'].includes(m.type) && !/ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(m.text));
const screenshot = async () => (await page.send('Page.captureScreenshot', { format: 'png' })).data;
const journeyTop = `(() => { const j = document.querySelector('[data-journey]'); return { top: j.getBoundingClientRect().top + scrollY, span: j.offsetHeight - innerHeight }; })()`;

try {
  const gpu = await page.eval(RENDERER);
  console.log(`renderer: ${gpu}`);
  const software = /swiftshader|llvmpipe|software|basic render/i.test(gpu);

  // ------------------------------------------------------------ K1
  if (has('--g1')) {
    const PAIRS = {
      // adjacent pairs (level 0): stigma dwell, glass, fast stretch, the F1 rest place; then four at stride 8
      desktop: { set: 'd-1440m', pairs: [[330, 331], [360, 361], [650, 651], [690, 691], [140, 141], [200, 201], [260, 261], [261, 262], [304, 312], [648, 656], [144, 152], [256, 264]] },
      mobile: { set: 'm-720m', pairs: [[230, 231], [260, 261], [440, 441], [470, 471], [90, 91], [130, 131], [184, 185], [185, 186], [232, 240], [448, 456], [96, 104], [184, 192]] },
    };
    await page.goto(base + '/kontakt/', { settle: 500 });
    for (const [variant, { set, pairs }] of Object.entries(PAIRS)) {
      console.log(`\nK1 ${variant} (${set})`);
      const meta = JSON.parse(readFileSync(new URL(`${variant}.json`, flowDir), 'utf8'));
      const sheets = [...new Set(pairs.flat().map((i) => Math.floor(i / meta.depth.perSheet)))];
      const expected = Object.fromEntries(sheets.map((s) => [s, fnv(decodePNG(readFileSync(new URL(meta.sheets[s], flowDir))).data)]));
      const result = await page.eval(`(${g1.toString()})(${JSON.stringify({ variant, set, pairs, base: manifest.base, sheets })})`);
      console.log(`  renderer ${result.renderer}, pass-1 targets ${result.half ? 'RGBA16F' : 'RGBA8'}`);
      check(sheets.every((s) => result.sheetHash[s] === expected[s]), `depth sheets ${sheets.join(', ')} read back from the GPU equal png-lite`);
      for (const r of result.rows) console.log(`    ${String(r.a).padStart(3)}→${String(r.b).padEnd(3)} t=${r.t}  mean ${r.mean.toFixed(3)}  p99 ${r.p99}  max ${r.max}  dissolved ${(r.fallback * 100).toFixed(2)} %  t=0 max ${r.zero}`);
      const worst = (k) => Math.max(...result.rows.map((r) => r[k]));
      check(result.rows.length === 36, `${result.rows.length} comparisons (12 pairs × t = 0.25, 0.5, 0.75)`);
      check(worst('mean') <= 1, `mean per channel ≤ 1/255 (worst ${worst('mean').toFixed(3)}/255)`);
      check(worst('p99') <= 4, `p99 per channel ≤ 4/255 (worst ${worst('p99')}/255)`);
      check(worst('zero') <= 1, `t = 0 shows frame A within 1/255 (worst ${worst('zero')}/255)`);
    }
  }

  // ------------------------------------------------------------ K2
  if (has('--rest')) {
    const STOPS = [0.1, 0.22, 0.4, 0.56, 0.76];
    for (const vp of [{ name: 'desktop 1707x960@1.5', w: 1707, h: 960, dpr: 1.5 }, { name: 'phone 390x844@3', w: 390, h: 844, dpr: 3, mobile: true }]) {
      console.log(`\nK2 ${vp.name}`);
      await page.viewport(vp.w, vp.h, { dpr: vp.dpr, mobile: vp.mobile });
      const shots = {};
      for (const query of ['', '?flow=off']) {
        await page.goto(base + '/' + query, { settle: 2500 });
        const seen = new Set();
        for (const pass of ['warm', 'shot'])
          for (const p of STOPS) {
            await page.eval(scrollToProgress(p));
            for (let i = 0; i < 12; i++) { await page.wait(100); seen.add((await page.eval(STAGE)).flow); }
            await page.wait(3000);
            if (pass === 'shot') shots[query + p] = await screenshot();
          }
        if (!query) check(seen.has('warp'), `warp in use on the way (states seen: ${[...seen].join(', ')})`);
      }
      const equal = STOPS.filter((p) => shots[String(p)] === shots['?flow=off' + p]);
      check(equal.length === STOPS.length, `screenshots at rest pixel-equal with and without ?flow=off: ${equal.length}/${STOPS.length}`);
    }
  }

  // ------------------------------------------------------------ K3
  if (has('--fallback')) {
    await page.viewport(1440, 900);
    const CASES = [
      { name: 'R1 no WebGL2', script: `HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, { apply: (f, self, a) => (a[0] === 'webgl2' ? null : Reflect.apply(f, self, a)) });`, json: false, sheets: false },
      { name: 'R1 shader error', script: `WebGL2RenderingContext.prototype.getShaderParameter = new Proxy(WebGL2RenderingContext.prototype.getShaderParameter, { apply: (f, self, a) => (a[1] === 0x8b81 ? false : Reflect.apply(f, self, a)) });`, json: false, sheets: false },
      { name: 'R2 flow/ blocked', block: [`*${manifest.base}/flow/*`], json: true, sheets: false },
      { name: 'R3 one sheet blocked', block: [`*${manifest.base}/flow/desktop-depth-05.png`], json: true, sheets: true, fadeAt: 0.5 },
      { name: 'R4 context lost', lose: true, json: true, sheets: true },
      { name: 'R5 low tier', script: `Object.defineProperty(Navigator.prototype, 'deviceMemory', { get: () => 2 }); Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { get: () => 2 });`, json: false, sheets: false },
      { name: 'R6 Save-Data', script: `Object.defineProperty(NetworkInformation.prototype, 'saveData', { get: () => true });`, json: false, sheets: false },
    ];
    for (const c of CASES) {
      console.log(`\nK3 ${c.name}`);
      const injected = c.script ? (await page.send('Page.addScriptToEvaluateOnNewDocument', { source: c.script })).identifier : null;
      await page.send('Network.setBlockedURLs', { urls: c.block ?? [] });
      page.consoleMessages.length = 0;
      urls.length = 0;
      await page.goto(base + '/', { settle: 4000 });
      const shots = [];
      const states = new Set();
      let afterLoss = null;
      for (const p of [0.2, 0.5, 0.7]) {
        await page.eval(scrollToProgress(p));
        for (let i = 0; i < 25; i++) {
          await page.wait(100);
          const s = await page.eval(STAGE);
          states.add(s.flow);
          if (c.lose && p === 0.5 && i === 3) {
            await page.eval(`document.querySelector('[data-journey-flow]').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`);
            afterLoss = await page.eval(STAGE);
            afterLoss.png = decodePNG(Buffer.from(await screenshot(), 'base64'));
          }
        }
        shots.push(await screenshot());
      }
      const first = await page.eval(STAGE);
      const json = flowUrls().filter((u) => u.endsWith('.json')).length, sheets = flowUrls().filter((u) => u.endsWith('.png')).length;
      check(problems().length === 0, `no exception, no console error besides the blocked request${problems().length ? ': ' + problems()[0].text : ''}`);
      check(new Set(shots).size === shots.length, 'the picture changes between the stops');
      check((json > 0) === c.json && (sheets > 0) === c.sheets, `flow requests: ${json} json, ${sheets} sheets (expected ${c.json ? 'json' : 'no json'}, ${c.sheets ? 'sheets' : 'no sheets'})`);
      if (c.name.startsWith('R5')) check(first.tier === 'low' && first.flow === null, `low tier without a warp canvas (tier ${first.tier})`);
      if (c.name.startsWith('R6')) check(!first.on, 'Save-Data: static hero, journey not started');
      if (c.name.startsWith('R1')) check(first.flow === null, 'no warp canvas in the stage');
      if (c.fadeAt) check(states.has('fade') && states.has('warp'), `warp elsewhere, dissolve on the blocked sheet (states: ${[...states].join(', ')})`);
      if (c.lose) {
        const { png } = afterLoss;
        let lo = 255, hi = 0;
        for (let i = 1; i < png.data.length; i += png.channels * 97) { lo = Math.min(lo, png.data[i]); hi = Math.max(hi, png.data[i]); }
        check(!afterLoss.glVisible && afterLoss.flow === 'fade', `after loseContext the warp canvas is out of the picture at once (state ${afterLoss.flow})`);
        check(afterLoss.spread > 8 && hi - lo > 40, `next picture not empty (layer spread ${afterLoss.spread}, screenshot spread ${hi - lo})`);
        check([...states].includes('warp'), 'warp was in use before the loss');
      }
      if (injected) await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injected });
    }
    await page.send('Network.setBlockedURLs', { urls: [] });
  }

  // ------------------------------------------------------------ K4
  if (has('--f2')) {
    if (software) console.log('  note: software renderer, F2 does not count here');
    check(!software, `real GPU: ${gpu}`);
    const which = (args.find((a) => /^P\d/.test(a)) ?? 'P1,P2').split(',');
    const PROFILES = [
      { id: 'P1', name: 'P1 desktop 1707x960@1.5, mouse', w: 1707, h: 960, dpr: 1.5, source: 'mouse', cpu: 1 },
      // touch is emulated, but the gesture goes in as mouse: a synthetic touch gesture does not scroll in headless Edge
      { id: 'P2', name: 'P2 phone stand-in 390x844@3, touch emulated, CPU 4x', w: 390, h: 844, dpr: 3, mobile: true, source: 'mouse', cpu: 4 },
    ].filter((p) => which.includes(p.id));
    const RECORD = `window.__f2 = { on: false, t: [], s: [], y: [] };
      (function loop(time) { const r = window.__f2; if (r.on) { r.t.push(time); r.y.push(Math.round(scrollY)); const c = document.querySelector('[data-journey-flow]'); r.s.push(c ? c.dataset.journeyFlow || '' : '-'); } requestAnimationFrame(loop); })(0);`;
    // the 30 Hz clock goes in first, so that the recording runs on it as well
    const hz30 = has('--hz30');
    const injected = [];
    for (const source of [hz30 && HZ30, slowWarp && SLOW(slowWarp), RECORD].filter(Boolean)) injected.push((await page.send('Page.addScriptToEvaluateOnNewDocument', { source })).identifier);
    const title = slowWarp ? `W2 --slow-warp ${slowWarp}${hz30 ? ' --hz30' : ''}` : hz30 ? 'W1 --hz30' : 'K4';
    const start = `(window.__hz30 && (window.__hz30.real = []), window.__f2.t = [], window.__f2.s = [], window.__f2.y = [], window.__f2.on = true)`;
    // the real ticks under the stand-in: median and 10th/90th percentile of their spacing
    const REAL = `(() => { const r = [...window.__hz30.real].sort((a, b) => a - b), q = (f) => r[Math.floor(f * (r.length - 1))].toFixed(1);
      return r.length ? \`\${r.length} real ticks, spacing p10 \${q(0.1)} / median \${q(0.5)} / p90 \${q(0.9)} ms\` : 'no real ticks'; })()`;
    const moving = (rec) => rec.s.filter((s) => s === 'warp' || s === 'fade').length;
    const warped = (rec) => rec.s.filter((s) => s === 'warp').length;
    for (const p of PROFILES) {
      console.log(`\n${title} ${p.name}`);
      await page.viewport(p.w, p.h, { dpr: p.dpr, mobile: p.mobile });
      const out = {};
      for (const query of slowWarp ? [''] : ['', '?flow=off']) {
        await page.throttle({ cpu: 1 });
        await page.goto(base + '/' + query, { settle: 3000 });
        await page.throttle({ cpu: p.cpu });
        const { top, span } = await page.eval(journeyTop);
        const sweep = async () => {
          for (const dir of [-1, 1])
            await page.send('Input.synthesizeScrollGesture', { x: Math.round(p.w / 2), y: Math.round(p.h / 2), yDistance: dir * span, speed: 300, gestureSourceType: p.source, preventFling: true });
        };
        await page.eval(`scrollTo(0, ${top})`);
        await page.wait(1500);
        await page.eval(start);
        await sweep(); // warm-up: frames and flow data in, decoder warm; recorded for the warp share (W1, W2)
        const warm = await page.eval(`(window.__f2.on = false, window.__f2)`);
        await page.eval(`scrollTo(0, ${top})`);
        await page.wait(2500);
        await page.eval(start);
        await sweep();
        const rec = await page.eval(`(window.__f2.on = false, window.__f2)`);
        const gaps = rec.t.slice(1).map((t, i) => t - rec.t[i]);
        const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        const drawn = moving(rec);
        // where the slowest interval fell, against the turn between the two gestures (deepest scroll)
        const at = (i) => ((rec.t[i] - rec.t[0]) / 1000).toFixed(1);
        const slowest = gaps.indexOf(Math.max(...gaps));
        const turn = rec.y.indexOf(Math.max(...rec.y));
        out[query] = { fps: 1000 / mean, mean, max: Math.max(...gaps), over: gaps.filter((g) => g > 33.4).length, frames: gaps.length, warp: drawn ? warped(rec) / drawn : 0, set: (await page.eval(STAGE)).set, moved: Math.max(...rec.y) - Math.min(...rec.y), warm, rec };
        const r = out[query];
        console.log(`  ${query || 'warp     '}  ${r.set}  ${r.frames} intervals, ${r.fps.toFixed(1)} fps mean (${mean.toFixed(1)} ms), max ${r.max.toFixed(1)} ms at ${at(slowest + 1)} s (turn at ${at(turn)} s), ${r.over} over 33.4 ms${query ? '' : `, warped ${(r.warp * 100).toFixed(1)} % of the moving frames`}`);
        if (hz30) console.log(`             stand-in: ${await page.eval(REAL)}`);
        check(r.moved >= 0.9 * span, `${query || 'warp'}: the page scrolled through the journey (${r.moved} of ${span} px)`);
      }
      await page.throttle({ cpu: 1 });
      const [w, f] = [out[''], out['?flow=off']];
      if (slowWarp) {
        // W2: R7 trips within 3 s of warped time in the warm-up sweep and stays off after a rest
        const { t, s } = w.warm;
        const last = s.lastIndexOf('warp');
        let warpTime = 0;
        for (let i = 1; i <= last; i++) if (s[i] === 'warp') warpTime += t[i] - t[i - 1];
        const after = s.slice(last + 1).filter((x) => x === 'fade').length;
        console.log(`  warm-up: ${warped(w.warm)} warped frames over ${(warpTime / 1000).toFixed(2)} s (mean ${(warpTime / Math.max(1, warped(w.warm))).toFixed(1)} ms), then ${after} dissolved; measured sweep: ${warped(w.rec)} warped of ${moving(w.rec)} moving`);
        check(last > 0 && after >= 30, `R7 trips: warp first, then ${after} dissolved moving frames in the same sweep`);
        check(warpTime <= 3000, `tripped after ${(warpTime / 1000).toFixed(2)} s of warped frames (≤ 3 s)`);
        check(warped(w.rec) === 0 && moving(w.rec) > 100, `stays off after a rest, until reload (${warped(w.rec)} warped of ${moving(w.rec)} moving frames in the next sweep)`);
      } else if (hz30) {
        // W1: the stand-in holds 30 Hz, the warp stays on, and costs at most 10 % of the interval
        const share = (warped(w.warm) + warped(w.rec)) / Math.max(1, moving(w.warm) + moving(w.rec));
        check(Math.abs(f.mean - 33.3) <= 2, `30 Hz stand-in: rAF mean without warp ${f.mean.toFixed(1)} ms (33.3 ± 2)`);
        check(share >= 0.95, `≥ 95 % of the moving frames warped over the whole run, warm-up included (${(share * 100).toFixed(1)} %)`);
        check(w.mean <= 1.1 * f.mean, `mean interval with warp ${w.mean.toFixed(1)} ms ≤ 1.1 × without (${(1.1 * f.mean).toFixed(1)} ms)`);
      } else {
        const pass = (r) => r.fps >= 55 && r.max <= 33.4;
        if (!pass(f)) console.log('  note: the dissolve alone misses F2 here (old finding, report and ask)');
        check(pass(w), `F2 with warp: ${w.fps.toFixed(1)} fps ≥ 55, max ${w.max.toFixed(1)} ms ≤ 33.4`);
        check(w.warp >= 0.95, `≥ 95 % of the moving frames warped (${(w.warp * 100).toFixed(1)} %)`);
      }
    }
    for (const identifier of injected) await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  }

  // ------------------------------------------------------------ N1–N3 fast scrolling (T-20261020-02)
  if (has('--fast')) {
    const timing = !has('--no-timing');
    if (timing && software) console.log('  note: software renderer, N3 does not count here');
    const which = (args.find((a) => /^P\d/.test(a)) ?? 'P1,P2,P2m').split(',');
    const PROFILES = [
      { id: 'P1', name: 'P1 desktop 1707x960@1.5, mouse', w: 1707, h: 960, dpr: 1.5, cpu: 1 },
      { id: 'P2', name: 'P2 phone stand-in 390x844@3, touch emulated, CPU 4x', w: 390, h: 844, dpr: 3, mobile: true, cpu: 4 },
      { id: 'P2m', name: 'P2m = P2 with deviceMemory 4 (tier medium)', w: 390, h: 844, dpr: 3, mobile: true, cpu: 4, memory: 4, tier: 'medium' },
    ].filter((p) => which.includes(p.id));
    // per drawn frame: [rAF time of the frame, value of data-journey-frame]. The own rAF loop is requested before the
    // player's in every frame, so r.raf is the time of the frame in which the player set the attribute.
    const FRAMES = `(() => {
      const r = (window.__fast = { on: false, t: [], y: [], m: [], raf: 0 });
      (function loop(time) { r.raf = time; if (r.on) { r.t.push(time); r.y.push(Math.round(scrollY)); } requestAnimationFrame(loop); })(0);
      const watch = () => {
        const el = document.querySelector('[data-journey-canvas]');
        if (!el) return;
        new MutationObserver((list) => {
          for (let k = 0; k < list.length; k++) if (r.on) r.m.push([r.raf, k + 1 < list.length ? list[k + 1].oldValue : el.getAttribute('data-journey-frame')]);
        }).observe(el, { attributes: true, attributeFilter: ['data-journey-frame'], attributeOldValue: true });
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch, { once: true }); else watch();
    })();`;
    const MEMORY = (gb) => `Object.defineProperty(Navigator.prototype, 'deviceMemory', { get: () => ${gb} });`;
    const START = `(() => { const r = window.__fast; r.t = []; r.y = []; r.m = []; r.on = true; })()`;
    const STOP = `(() => { const r = window.__fast; r.on = false; return { t: r.t, y: r.y, m: r.m }; })()`;
    const at = (p) => ({ x: Math.round(p.w / 2), y: Math.round(p.h / 2) });
    const flick = (speed) => ({ name: `flick ${speed}`, speed, run: async (p, span) => {
      for (const dir of [1, -1]) await page.send('Input.synthesizeScrollGesture', { ...at(p), yDistance: -dir * span, speed, gestureSourceType: 'mouse', preventFling: true });
    } });
    const wheel = { name: 'wheel 120/16ms 3s', speed: Infinity, run: async (p) => {
      for (let t = 0; t < 3000; t += 16) {
        await page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', ...at(p), deltaX: 0, deltaY: 120 });
        await page.wait(16);
      }
    } };
    const GESTURES = [flick(1500), flick(4000), flick(10000), wheel];
    await page.media({ 'prefers-reduced-motion': 'no-preference' });
    const injected = [(await page.send('Page.addScriptToEvaluateOnNewDocument', { source: FRAMES })).identifier];
    const runs = [];
    const f1 = (x) => (x == null ? '-' : x.toFixed(1));
    console.log(`\nN1–N3 fast scrolling${timing ? '' : ' (--no-timing: N3 left out)'}`);
    console.log('  profile state gesture            frames  warp/fade/whole  N1 b−a>2  max b−a  d max (limit)  d over  back>0.5 (max)  scrolled' + (timing ? '  fps   max ms' : ''));
    for (const p of PROFILES) {
      await page.viewport(p.w, p.h, { dpr: p.dpr, mobile: p.mobile });
      await page.send('Emulation.setTouchEmulationEnabled', { enabled: Boolean(p.mobile), maxTouchPoints: p.mobile ? 5 : 1 });
      const memory = p.memory ? (await page.send('Page.addScriptToEvaluateOnNewDocument', { source: MEMORY(p.memory) })).identifier : null;
      for (const state of ['warm', 'cold'])
        for (const g of GESTURES) {
          await page.throttle({ cpu: 1 });
          await page.goto(base + '/', { settle: state === 'cold' ? 300 : 3000 });
          await page.throttle({ cpu: p.cpu });
          const { top, span } = await page.eval(journeyTop);
          await page.eval(`scrollTo(0, ${top})`);
          if (state === 'warm') {
            await page.wait(1500);
            for (const dir of [1, -1]) await page.send('Input.synthesizeScrollGesture', { ...at(p), yDistance: -dir * span, speed: 300, gestureSourceType: 'mouse', preventFling: true });
            await page.eval(`scrollTo(0, ${top})`);
            await page.wait(2000);
          }
          await page.eval(START);
          await g.run(p, span);
          await page.wait(800);
          const rec = await page.eval(STOP);
          const stage = await page.eval(STAGE);
          const count = manifest.sets[stage.set]?.count ?? null;
          await page.throttle({ cpu: 1 });
          const limit = p.id === 'P1' && g.speed <= 4000 ? 2 : 4;
          // scroll travel inside the journey (the wheel also runs on into the page below)
          const through = rec.y.length ? Math.max(0, Math.min(Math.max(...rec.y), top + span) - Math.max(Math.min(...rec.y), top)) : 0;
          const r = { profile: p.id, state, gesture: g.name, tier: stage.tier, set: stage.set, journeyOn: stage.on, span, through, count, ...analyseFast(rec, { limit, timing }) };
          runs.push(r);
          const modes = `${r.modes.warp ?? 0}/${r.modes.fade ?? 0}/${r.modes.whole ?? 0}`;
          console.log(`  ${p.id.padEnd(7)} ${state.padEnd(5)} ${g.name.padEnd(18)} ${String(r.frames).padStart(6)}  ${modes.padStart(15)}  ${String(r.n1.count).padStart(8)}  ${String(r.maxGap).padStart(7)}  ${f1(r.n2.dMax).padStart(5)} (${limit})     ${String(r.n2.over).padStart(6)}  ${String(r.n2.back).padStart(8)} (${f1(r.n2.backMax)})  ${String(r.through).padStart(5)}/${span}` + (timing && r.n3 ? `  ${f1(r.n3.fps).padStart(5)}  ${f1(r.n3.max).padStart(6)}` : ''));
          const tag = `${p.id} ${state} ${g.name}`;
          check(stage.on && r.frames > 0, `${tag}: journey on and frames recorded from data-journey-frame (${r.frames}${stage.on ? '' : ', journey not on'})`);
          if (p.tier && g === GESTURES[0]) check(stage.tier === p.tier, `${p.id}: data-tier ${stage.tier} (expected ${p.tier})`);
          check(r.through >= 0.9 * span, `${tag}: the page scrolled through the journey (${r.through} of ${span} px inside it)`);
          check(r.n1.count === 0, `${tag}: N1 no warp/fade frame with b − a > 2 (${r.n1.count}${r.n1.count ? `, e.g. ${r.n1.examples.join('; ')}` : ''})`);
          if (state === 'warm') {
            check(r.n2.over === 0, `${tag}: N2 content within ${limit} positions of the camera (max ${f1(r.n2.dMax)}, ${r.n2.over} frames over)`);
            check(r.n2.back === 0, `${tag}: N2 no jump back over 0.5 positions (${r.n2.back}${r.n2.back ? `, max ${f1(r.n2.backMax)}, e.g. ${r.n2.backExamples.join('; ')}` : ''})`);
            if (timing) check(r.n3 && r.n3.fps >= 55 && r.n3.max <= 33.4, `${tag}: N3 ${f1(r.n3?.fps)} fps ≥ 55, max ${f1(r.n3?.max)} ms ≤ 33.4 over ${r.n3?.intervals ?? 0} intervals`);
          }
        }
      if (memory) await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: memory });
    }
    for (const identifier of injected) await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
    await page.media({});
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    const summary = {
      check: 'fast', base, renderer: gpu, timing, profiles: PROFILES.map((p) => p.id),
      n1: runs.reduce((s, r) => s + r.n1.count, 0), n2WarmOver: runs.filter((r) => r.state === 'warm').reduce((s, r) => s + r.n2.over, 0),
      n2WarmBack: runs.filter((r) => r.state === 'warm').reduce((s, r) => s + r.n2.back, 0), failedChecks: failed, runs,
    };
    console.log(JSON.stringify(summary));
    const out = has('--out') ? args[args.indexOf('--out') + 1] : null;
    if (out) writeFileSync(out, JSON.stringify(summary, null, 1) + '\n');
  }

  // ------------------------------------------------------------ W7 (T-20261019-04)
  if (has('--idle')) {
    // counts the page's rAF requests; no F2 recording here, it would keep a loop of its own running
    const COUNT = `window.__raf = 0; { const real = requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => (window.__raf++, real(cb)); }`;
    const { identifier } = await page.send('Page.addScriptToEvaluateOnNewDocument', { source: COUNT });
    const quiet = async () => {
      await page.eval('window.__raf = 0');
      await page.wait(2000);
      return page.eval('window.__raf');
    };
    for (const vp of [{ name: 'desktop 1707x960@1.5', w: 1707, h: 960, dpr: 1.5 }, { name: 'phone 390x844@3', w: 390, h: 844, dpr: 3, mobile: true }]) {
      console.log(`\nW7 ${vp.name}`);
      await page.viewport(vp.w, vp.h, { dpr: vp.dpr, mobile: vp.mobile });
      await page.goto(base + '/', { settle: 3000 });
      const early = await page.eval('window.__raf');
      const loaded = await quiet();
      console.log(`  first 3 s after load: ${early} rAF requests (journey and base run)`);
      check(early >= 30 && loaded === 0, `after load the base run ended by itself: ${loaded} rAF requests in 2 s, 3 s after load`);
      for (const p of [0.3, 0.6]) {
        await page.eval(scrollToProgress(p));
        let s = null;
        for (let i = 0; i < 100 && (s = await page.eval(STAGE)).flow !== 'rest'; i++) await page.wait(100);
        await page.wait(3000);
        const n = await quiet();
        check(s.flow === 'rest' && n === 0, `p ${p}: 3 s after coming to rest ${n} rAF requests in 2 s (state ${s.flow})`);
      }
    }
    await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  }

  // ------------------------------------------------------------ K5 (network part)
  if (has('--load')) {
    for (const vp of [{ name: 'desktop 1440x900', w: 1440, h: 900, dpr: 1, variant: 'desktop', small: 'd-960' }, { name: 'phone 390x844@3', w: 390, h: 844, dpr: 3, mobile: true, variant: 'mobile', small: 'm-540' }]) {
      console.log(`\nK5 ${vp.name}`);
      await page.viewport(vp.w, vp.h, { dpr: vp.dpr, mobile: vp.mobile });
      await page.send('Network.clearBrowserCache');
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: 'performance.setResourceTimingBufferSize(3000);' });
      await page.goto(base + '/', { settle: 1000 });
      const meta = JSON.parse(readFileSync(new URL(`${vp.variant}.json`, flowDir), 'utf8'));
      let entries = [];
      for (let i = 0; i < 120; i++) {
        entries = await page.eval(`performance.getEntriesByType('resource').filter((e) => e.name.includes('/hero/')).map((e) => ({ name: e.name, start: e.startTime, end: e.responseEnd, body: e.encodedBodySize, transfer: e.transferSize }))`);
        if (entries.filter((e) => e.name.includes('/flow/')).length >= 1 + meta.sheets.length) break;
        await page.wait(500);
      }
      const set = (await page.eval(STAGE)).set;
      const flow = entries.filter((e) => e.name.includes('/flow/'));
      const stride = 16 * manifest.fine, last = manifest.sets[set].count - 1;
      const coarse = entries.filter((e) => e.name.includes(`/${set}/`)).filter((e) => { const i = Number(e.name.match(/(\d{4})\.webp/)[1]); return i % stride === 0 || i === last; });
      const firstFlow = Math.min(...flow.map((e) => e.start)), coarseEnd = Math.max(...coarse.map((e) => e.end));
      const body = flow.reduce((s, e) => s + e.body, 0), transfer = flow.reduce((s, e) => s + e.transfer, 0);
      const f3 = readFileSync(new URL(`${vp.variant}.json`, flowDir)).length + meta.sheets.reduce((s, n) => s + readFileSync(new URL(n, flowDir)).length, 0);
      const share = (n) => ((100 * n) / manifest.sets[vp.small].bytes).toFixed(1);
      check(flow.length === 1 + meta.sheets.length && flow.every((e) => e.name.includes(`/flow/${vp.variant}`)), `${flow.length} flow requests, all of variant ${vp.variant}`);
      check(coarse.length >= 2 && firstFlow >= coarseEnd, `first flow request at ${firstFlow.toFixed(0)} ms, after the first loading stage of ${set} (${coarse.length} frames, done ${coarseEnd.toFixed(0)} ms)`);
      check(body <= f3, `flow transfer ${body} B body (${share(body)} % of ${vp.small}), ${transfer} B with headers; F3 ${f3} B (${share(f3)} %)`);
    }
  }
} finally {
  await page.close();
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);

// ------------------------------------------------------------ --fast analysis
/** One recorded run: N1 (b − a of warp/fade), N2 (distance of the shown content, jumps back), N3 (rAF intervals while the
 *  camera moves), scroll travel. rec.m: [rAF time, "<pos> <a> <b> <mode>"] per change; rec.t / rec.y: every rAF frame. */
function analyseFast(rec, { limit, timing }) {
  const f = rec.m.filter((x) => typeof x[1] === 'string').map(([time, v]) => {
    const [pos, a, b, mode] = v.trim().split(/\s+/);
    return { time, pos: Number(pos), a: Number(a), b: Number(b), mode };
  });
  const modes = {}, gaps = {}, n1 = [], back = [];
  let dMax = 0, over = 0, backMax = 0;
  const moving = [];
  const show = (x) => `${x.pos.toFixed(2)} ${x.a}-${x.b} ${x.mode}`;
  f.forEach((x, k) => {
    modes[x.mode] = (modes[x.mode] ?? 0) + 1;
    const blend = x.mode === 'warp' || x.mode === 'fade';
    if (blend) gaps[x.b - x.a] = (gaps[x.b - x.a] ?? 0) + 1;
    if (blend && x.b - x.a > 2) n1.push(show(x));
    x.c = blend ? x.pos : x.a;
    x.d = blend ? Math.max(Math.abs(x.a - x.pos), Math.abs(x.b - x.pos)) : Math.abs(x.a - x.pos);
    dMax = Math.max(dMax, x.d);
    if (x.d > limit) over++;
    const prev = f[k - 1];
    if (!prev || x.pos !== prev.pos) moving.push(x.time);
    if (!prev) return;
    const travel = x.pos - prev.pos, step = x.c - prev.c;
    if (travel !== 0 && Math.sign(step) === -Math.sign(travel) && Math.abs(step) > 0.5) {
      back.push(`${show(prev)} → ${show(x)}`);
      backMax = Math.max(backMax, Math.abs(step));
    }
  });
  let n3 = null;
  if (timing && moving.length > 1) {
    const [from, to] = [moving[0], moving.at(-1)], iv = [];
    for (let k = 1; k < rec.t.length; k++) if (rec.t[k - 1] >= from && rec.t[k] <= to) iv.push(rec.t[k] - rec.t[k - 1]);
    const mean = iv.reduce((s, x) => s + x, 0) / Math.max(1, iv.length);
    n3 = { window: [from, to].map((x) => Math.round(x)), intervals: iv.length, fps: iv.length ? 1000 / mean : 0, max: Math.max(0, ...iv), over: iv.filter((x) => x > 33.4).length };
  }
  const pos = f.map((x) => x.pos);
  return {
    frames: f.length, modes, gaps, maxGap: Math.max(0, ...Object.keys(gaps).map(Number)),
    camera: pos.length ? [Math.min(...pos), Math.max(...pos)] : null,
    moved: rec.y.length ? Math.max(...rec.y) - Math.min(...rec.y) : 0,
    n1: { count: n1.length, examples: n1.slice(0, 5) },
    n2: { limit, dMax, over, back: back.length, backMax, backExamples: back.slice(0, 5) },
    n3,
  };
}

// ------------------------------------------------------------ in the page (K1)
/** Runs in the browser at the dev server: the player's renderer against flowFrame of the reference. */
async function g1({ variant, set, pairs, base, sheets }) {
  const F = await import('/src/scripts/journey-flow.ts');
  const R = await import('/tools/qa/flow-warp.mjs');
  const json = await (await fetch(`${base}/flow/${variant}.json`)).json();
  const meta = F.parseMeta(json, variant, json.count);
  const canvas = document.createElement('canvas');
  const r = await F.createRenderer(canvas);
  if (!meta || !r) throw new Error('flow data or renderer missing');
  const gl = r.gl;
  const { w: gw, h: gh } = meta.depth;
  const tex = {}, bytes = {}, sheetHash = {};
  const fbo = gl.createFramebuffer();
  for (const s of sheets) {
    const bitmap = await createImageBitmap(await (await fetch(`${base}/flow/${meta.sheets[s]}`)).blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const { width, height } = bitmap;
    tex[s] = r.sheet(bitmap);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex[s], 0);
    const rgba = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    bytes[s] = { width, data: rgba.filter((_, i) => i % 4 === 0) };
    let h = 2166136261;
    for (const b of bytes[s].data) h = Math.imul(h ^ b, 16777619) >>> 0;
    sheetHash[s] = h;
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const frames = {};
  const frame = async (i) => {
    if (frames[i]) return frames[i];
    const bitmap = await createImageBitmap(await (await fetch(`${base}/${set}/${String(i).padStart(4, '0')}.webp`)).blob());
    const c = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d');
    c.drawImage(bitmap, 0, 0);
    const d = c.getImageData(0, 0, bitmap.width, bitmap.height);
    return (frames[i] = { bitmap, rgb8: d.data, img: R.toRGBf({ width: d.width, height: d.height, channels: 4, data: d.data }) });
  };
  const depth = (i) => {
    const { sheet, x, y } = F.tileOf(i, meta.depth), src = bytes[sheet], out = new Uint8Array(gw * gh);
    for (let row = 0; row < gh; row++) out.set(src.data.subarray((y + row) * src.width + x, (y + row) * src.width + x + gw), row * gw);
    const [dn, df] = meta.cams[i].slice(10);
    return { w: gw, h: gh, data: R.decodeDepth(out, dn, df) };
  };
  const source = async (i) => ({ image: (await frame(i)).bitmap, row: meta.cams[i], sheet: tex[F.tileOf(i, meta.depth).sheet], tile: F.tileOf(i, meta.depth) });
  const read = (w, h) => {
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  };
  const rows = [];
  for (const [a, b] of pairs) {
    const A = await frame(a), B = await frame(b), W = Math.max(A.img.width, B.img.width), H = Math.max(A.img.height, B.img.height);
    const sa = await source(a), sb = await source(b);
    // t = 0 on frame A's own camera: the canvas must show A itself
    r.render(meta, sa, sb, F.targetCam(meta.cams, a), 0, W, H);
    const px0 = read(W, H);
    let zero = 0;
    if (A.img.width === W)
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) zero = Math.max(zero, Math.abs(px0[4 * ((H - 1 - y) * W + x) + c] - A.rgb8[4 * (y * W + x) + c]));
    for (const t of [0.25, 0.5, 0.75]) {
      const position = a + t * (b - a), i = Math.floor(position), f = position - i;
      const camT = f ? R.interpCam(R.camFromRow(meta.cams[i]), R.camFromRow(meta.cams[i + 1]), f) : R.camFromRow(meta.cams[i]);
      if (!r.render(meta, sa, sb, F.targetCam(meta.cams, position), t, W, H)) throw new Error('render failed');
      const px = read(W, H);
      const ref = R.flowFrame({ imgA: A.img, imgB: B.img, depthA: depth(a), depthB: depth(b), camA: R.camFromRow(meta.cams[a]), camB: R.camFromRow(meta.cams[b]), t, meta, out: [W, H], camT });
      const hist = new Float64Array(256);
      let sum = 0;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          for (let c = 0; c < 3; c++) {
            const cpu = Math.round(Math.min(1, Math.max(0, ref.rgb[3 * (y * W + x) + c])) * 255);
            const d = Math.abs(px[4 * ((H - 1 - y) * W + x) + c] - cpu);
            hist[d]++;
            sum += d;
          }
      const n = W * H * 3;
      let p99 = 0;
      for (let acc = 0; p99 < 255 && (acc += hist[p99]) < 0.99 * n; ) p99++;
      let max = 255;
      while (max > 0 && !hist[max]) max--;
      rows.push({ a, b, t, mean: sum / n, p99, max, fallback: ref.fallback, zero });
    }
  }
  return { renderer: gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER), half: r.half, sheetHash, rows };
}
