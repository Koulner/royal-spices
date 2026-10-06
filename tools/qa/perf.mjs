// Lab performance run against a production build (node server.mjs).
//   node tools/qa/perf.mjs <base-url> [label]
// Measures per profile: LCP, CLS, interaction latency (Event Timing, the basis of INP), transfer
// sizes by type, and — for the home page — frame pacing while the hero journey is scrolled,
// JS heap after the scroll and the number of frame images requested.
// These are lab values from this machine with emulated CPU/network; they are not field data.
import { launch } from './browser.mjs';
import { writeFile, mkdir } from 'node:fs/promises';

const base = process.argv[2] ?? 'http://127.0.0.1:4322';
const label = process.argv[3] ?? 'run';

const PROFILES = [
  { name: 'desktop', width: 1440, height: 900, dpr: 1, mobile: false, cpu: 1, network: null },
  { name: 'desktop-4xcpu', width: 1440, height: 900, dpr: 1, mobile: false, cpu: 4, network: null },
  // "average phone": 4x CPU slowdown, ~9 Mbit/s down, 170 ms round trip (Lighthouse "slow 4G" class)
  { name: 'mobile-4xcpu-slow4g', width: 390, height: 844, dpr: 3, mobile: true, cpu: 4, network: { latency: 170, down: (9 * 1024 * 1024) / 8, up: (1.5 * 1024 * 1024) / 8 } },
];
const PAGES = ['/', '/produkte/safran-negin-1g/', '/kontakt/'];

const OBSERVERS = `
  window.__vitals = { lcp: 0, lcpEl: '', cls: 0, events: [] };
  // the hero loads several hundred frame files: the default buffer of 250 entries would cut the count short
  performance.setResourceTimingBufferSize(3000);
  new PerformanceObserver((list) => { for (const e of list.getEntries()) { __vitals.lcp = e.startTime; __vitals.lcpEl = (e.element?.tagName || '') + ' ' + (e.url || '').split('/').pop(); } }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) __vitals.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((list) => { for (const e of list.getEntries()) __vitals.events.push({ name: e.name, duration: e.duration }); }).observe({ type: 'event', durationThreshold: 16, buffered: true });
`;

const page = await launch();
const results = [];
try {
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVERS });
  for (const profile of PROFILES) {
    await page.viewport(profile.width, profile.height, { dpr: profile.dpr, mobile: profile.mobile });
    await page.send('Network.clearBrowserCache');
    await page.send('Network.emulateNetworkConditions', profile.network
      ? { offline: false, latency: profile.network.latency, downloadThroughput: profile.network.down, uploadThroughput: profile.network.up }
      : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await page.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });

    for (const path of PAGES) {
      await page.send('Network.clearBrowserCache');
      await page.goto(base + path, { settle: profile.network ? 6000 : 3000 });
      const row = { profile: profile.name, path };

      // ---- interactions (basis of INP): real input events through the browser
      if (path === '/') {
        const box = await page.eval(`(() => { const r = document.querySelector('[data-journey-next]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
        await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
        await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
        await page.wait(1500);
        await page.eval('window.scrollTo(0, 0)');
        await page.wait(500);
      }
      if (profile.mobile) {
        const box = await page.eval(`(() => { const r = document.querySelector('[data-menu-toggle]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
        for (let i = 0; i < 2; i++) {
          await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y }] });
          await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await page.wait(600);
        }
      }
      if (path === '/kontakt/') {
        await page.eval(`document.querySelector('[name=name]').focus()`);
        for (const ch of 'Ada') await page.key(ch);
        await page.eval(`document.querySelector('[data-topic]').value = 'catering'; document.querySelector('[data-topic]').dispatchEvent(new Event('change', { bubbles: true }))`);
        const box = await page.eval(`(() => { const b = document.querySelector('[data-submit]'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
        await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
        await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
        await page.wait(600);
      }

      // ---- hero scroll: frame pacing through the whole journey, forwards then backwards
      if (path === '/') {
        const span = await page.eval(`(() => { const j = document.querySelector('[data-journey]'); return j.offsetHeight - innerHeight; })()`);
        await page.eval(`window.__frames = []; (function tick(t) { __frames.push(t); requestAnimationFrame(tick); })(performance.now())`);
        const gesture = (distance) => page.send('Input.synthesizeScrollGesture', { x: Math.round(profile.width / 2), y: Math.round(profile.height / 2), yDistance: distance, speed: 900, gestureSourceType: profile.mobile ? 'touch' : 'mouse' });
        await gesture(-span);
        await page.wait(800);
        await gesture(span);
        await page.wait(800);
        const pacing = await page.eval(`(() => { const f = __frames; const d = []; for (let i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]); d.sort((a, b) => a - b);
          const pct = (p) => d[Math.min(d.length - 1, Math.floor(d.length * p))];
          return { frames: d.length, median: pct(0.5), p95: pct(0.95), over33: d.filter((x) => x > 33.4).length, over50: d.filter((x) => x > 50).length,
            heapMB: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null, tier: document.querySelector('[data-journey]').dataset.tier,
            heroRequests: performance.getEntriesByType('resource').filter((e) => e.name.includes('/hero/')).length,
            heroSet: document.querySelector('[data-journey]').dataset.set || '' }; })()`);
        Object.assign(row, { scroll: pacing });
      }

      const vitals = await page.eval(`(() => { const r = performance.getEntriesByType('resource'); const sum = (f) => Math.round(r.filter(f).reduce((s, e) => s + (e.transferSize || 0), 0) / 1024);
        const nav = performance.getEntriesByType('navigation')[0];
        return { lcp: Math.round(__vitals.lcp), lcpEl: __vitals.lcpEl, cls: Number(__vitals.cls.toFixed(4)),
          // Only what counts towards INP: presses, taps, clicks and keys. Hover events are excluded;
          // during a synthesized scroll gesture they report durations as long as the gesture itself.
          maxEvent: Math.max(0, ...__vitals.events.filter((e) => /^(pointerdown|pointerup|mousedown|mouseup|click|keydown|keyup)$/.test(e.name)).map((e) => e.duration)), events: __vitals.events.length,
          ttfb: Math.round(nav.responseStart), dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd),
          kb: { html: Math.round((nav.transferSize || 0) / 1024), js: sum((e) => /\\.js/.test(e.name)), css: sum((e) => /\\.css/.test(e.name)), fonts: sum((e) => /\\.woff2/.test(e.name)),
                images: sum((e) => /\\/img\\//.test(e.name)), hero: sum((e) => /\\/hero\\//.test(e.name)) } }; })()`);
      Object.assign(row, vitals);
      results.push(row);
      const s = row.scroll;
      console.log(`${profile.name.padEnd(22)} ${path.padEnd(28)} LCP ${String(row.lcp).padStart(5)} ms (${row.lcpEl.trim()})  CLS ${row.cls}  slowest interaction ${row.maxEvent} ms` +
        `  | kB html ${row.kb.html} js ${row.kb.js} css ${row.kb.css} fonts ${row.kb.fonts} img ${row.kb.images} hero ${row.kb.hero}` +
        (s ? `\n${''.padEnd(22)} hero scroll: ${s.heroSet} tier=${s.tier} frames=${s.frames} median ${s.median.toFixed(1)} ms p95 ${s.p95.toFixed(1)} ms  >33ms: ${s.over33}  >50ms: ${s.over50}  heap ${s.heapMB?.toFixed(1)} MB  frame files ${s.heroRequests}` : ''));
    }
  }
  const problems = page.consoleMessages.filter((m) => ['error', 'exception'].includes(m.type));
  if (problems.length) console.log('console errors:', JSON.stringify(problems.slice(0, 8), null, 1));
  else console.log('no console errors (incl. CSP violations)');
} finally {
  await page.close();
}
await mkdir('.raw/qa', { recursive: true });
await writeFile(`.raw/qa/perf-${label}.json`, JSON.stringify({ at: new Date().toISOString(), base, results }, null, 2));
