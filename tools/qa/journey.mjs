// Hero journey behaviour at several viewports.
//   node tools/qa/journey.mjs <base-url> [shot-dir]
// 1. Scrub: steps through the camera move forwards, then backwards. At every stop the copy, the
//    chapter caption and the drawn frame must be the same in both directions, and the picture must
//    actually change between stops.
// 2. Fallback: the frame files are blocked. The stage must fall back to the two stills, keep the
//    story and both calls to action, and throw nothing.
// 3. Tiers: with less memory and fewer cores reported, the page must load fewer frames and still
//    play the whole move and sharpen the settled picture.
import { launch } from './browser.mjs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://127.0.0.1:4321';
const shotDir = process.argv[3];

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024, dpr: 2, mobile: true },
  { name: 'phone-390x844', width: 390, height: 844, dpr: 3, mobile: true },
  { name: 'phone-landscape-844x390', width: 844, height: 390, dpr: 3, mobile: true },
];
const STOPS = [0, 0.1, 0.22, 0.4, 0.56, 0.76, 0.9, 1];
const SETTLE = Number(process.env.RS_SETTLE ?? 2600);

// What the stage shows right now. The canvas is reduced to a 16 x 16 thumbnail and hashed.
const BUFFER = `performance.setResourceTimingBufferSize(3000);`;
const STATE = `(() => {
  const j = document.querySelector('[data-journey]');
  const c = j.querySelector('[data-journey-canvas]');
  const t = document.createElement('canvas'); t.width = 16; t.height = 16;
  const x = t.getContext('2d');
  // the moving picture is two stacked frames; the upper one's opacity is the dissolve
  for (const layer of c.querySelectorAll('[data-journey-layer]')) { x.globalAlpha = Number(getComputedStyle(layer).opacity); x.drawImage(layer, 0, 0, 16, 16); }
  const d = x.getImageData(0, 0, 16, 16).data;
  let hash = 0;
  for (let i = 0; i < d.length; i += 4) hash = (Math.imul(hash, 31) + (d[i] >> 3) * 1024 + (d[i + 1] >> 3) * 32 + (d[i + 2] >> 3)) >>> 0;
  const on = (s) => j.querySelector(s).classList.contains('is-active');
  return {
    tier: j.dataset.tier, live: c.classList.contains('is-live'), hash,
    rest: j.dataset.rest || '', sharp: j.querySelector('[data-journey-sharp]').classList.contains('is-active'),
    intro: on('[data-journey-intro]'), arrival: on('[data-journey-arrival]'), final: on('[data-journey-final]'),
    chapter: [...j.querySelectorAll('[data-chapter].is-active h2')].map((e) => e.textContent.trim()).join(' + '),
    set: j.dataset.set || '',
    frames: performance.getEntriesByType('resource').filter((e) => e.name.includes('/hero/')).length,
    overflow: document.documentElement.scrollWidth > innerWidth,
  };
})()`;
const goTo = (p) => `(() => { const j = document.querySelector('[data-journey]'); scrollTo(0, j.getBoundingClientRect().top + scrollY + (j.offsetHeight - innerHeight) * ${p}); })()`;

let failed = 0;
const check = (ok, text) => {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

const page = await launch();
try {
  // several hundred frame files: the default resource buffer of 250 entries would cut the count short
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: BUFFER });
  for (const vp of VIEWPORTS) {
    console.log(`\n${vp.name}`);
    await page.viewport(vp.width, vp.height, { dpr: vp.dpr ?? 1, mobile: vp.mobile ?? false });

    // ---- 1. scrub forwards and backwards
    await page.send('Network.setBlockedURLs', { urls: [] });
    await page.goto(base + '/', { settle: 2500 });
    const walk = async (stops) => {
      const out = {};
      for (const p of stops) {
        await page.eval(goTo(p));
        await page.wait(SETTLE);
        out[p] = await page.eval(STATE);
      }
      return out;
    };
    const forwards = await walk(STOPS);
    const backwards = await walk([...STOPS].reverse());
    const first = forwards[0];
    const last = forwards[1];
    check(first.tier !== 'fallback', `frames in use: motion set ${first.set || '?'}, rest set ${first.rest || 'none'}, tier ${first.tier}, ${last.frames} frame files loaded`);
    // every viewport here would stretch the small motion set by more than 15 %
    const large = vp.width / vp.height <= 4 / 5 ? 'm-720m' : 'd-1440m';
    if (first.tier === 'high') check(first.set === large, `high tier on this screen draws the large motion set ${large}`);
    if (first.rest) check(STOPS.slice(1, -1).every((p) => forwards[p].sharp) && !first.sharp && !last.sharp, 'the settled picture is sharpened at every stop in between; the two ends use their stills');
    check(first.intro && !first.live && !first.arrival, 'start: opening copy on the origin still');
    check(last.arrival && last.final && !last.intro, 'end: arrival copy on the full-resolution arrival still');
    check(STOPS.slice(1, -1).every((p) => forwards[p].live), 'frames are drawn at every stop in between');
    const captions = STOPS.map((p) => forwards[p].chapter || '–').join(' › ');
    check(new Set(STOPS.map((p) => forwards[p].chapter).filter(Boolean)).size === 4, `four captions in order: ${captions}`);
    check(new Set(STOPS.slice(1).map((p) => forwards[p].hash)).size === STOPS.length - 1, 'the picture changes between all stops');
    const same = STOPS.filter((p) => {
      const a = forwards[p];
      const b = backwards[p];
      return a.hash === b.hash && a.chapter === b.chapter && a.intro === b.intro && a.arrival === b.arrival && a.final === b.final && a.live === b.live;
    });
    check(same.length === STOPS.length, `backwards equals forwards at ${same.length}/${STOPS.length} stops`);
    check(!first.overflow && !last.overflow, 'no horizontal scrolling');

    // ---- 2. frame files unavailable
    await page.send('Network.setBlockedURLs', { urls: ['*/hero/*'] });
    await page.goto(base + '/', { settle: 3500 });
    const blocked = await walk([0, 0.4, 0.8, 1]);
    check(blocked[0].tier === 'fallback' && Object.values(blocked).every((s) => !s.live), 'fallback: canvas stays out of the picture');
    check(blocked[0].intro && !blocked[0].final, 'fallback: opening copy on the origin still');
    check(Boolean(blocked[0.4].chapter) && !blocked[0.4].final, `fallback: caption shown on the way (${blocked[0.4].chapter})`);
    check(blocked[0.8].final && blocked[1].final && blocked[1].arrival, 'fallback: arrival still and arrival copy at the end');
    if (shotDir) {
      for (const p of [0.4, 1]) {
        await page.eval(goTo(p));
        await page.wait(SETTLE);
        await page.screenshot(join(shotDir, `fallback-${vp.name}-${p * 100}.png`));
      }
    }
  }

  // ---- 3. quality tiers on weaker devices. Memory and core count are overridden as the page reads
  // them; this checks the page's own switching, not how a weak device actually performs.
  await page.send('Network.setBlockedURLs', { urls: [] });
  for (const tier of [{ name: 'medium', memory: 4, cores: 4 }, { name: 'low', memory: 2, cores: 2 }]) {
    const { identifier } = await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `Object.defineProperty(Navigator.prototype, 'deviceMemory', { get: () => ${tier.memory} }); Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { get: () => ${tier.cores} });`,
    });
    for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
      console.log(`\n${tier.name} tier, ${vp.name}`);
      await page.viewport(vp.width, vp.height, { dpr: vp.dpr ?? 1, mobile: vp.mobile ?? false });
      await page.goto(base + '/', { settle: 2500 });
      const seen = {};
      for (const p of STOPS) {
        await page.eval(goTo(p));
        await page.wait(SETTLE);
        seen[p] = await page.eval(STATE);
      }
      const expected = vp.mobile ? 'm-540' : 'd-960';
      const rest = vp.mobile ? 'm-720' : 'd-1440';
      check(seen[0].tier === tier.name && seen[0].set === expected && seen[0].rest === rest, `tier ${seen[0].tier}, motion set ${seen[0].set}, rest set ${seen[0].rest || 'none'} (expected ${expected}, ${rest || 'none'}), ${seen[1].frames} frame files loaded`);
      check(STOPS.slice(1, -1).every((p) => seen[p].live) && new Set(STOPS.slice(1).map((p) => seen[p].hash)).size === STOPS.length - 1, 'frames are drawn and the picture changes between all stops');
      check(seen[1].arrival && seen[1].final, 'end: arrival copy on the arrival still');
    }
    await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  }

  // blocked requests are reported as failed loads; anything else is a real problem
  const problems = page.consoleMessages.filter((m) => ['error', 'exception'].includes(m.type) && !/ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(m.text));
  check(problems.length === 0, `no script errors${problems.length ? ': ' + JSON.stringify(problems.slice(0, 5)) : ''}`);
} finally {
  await page.close();
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
