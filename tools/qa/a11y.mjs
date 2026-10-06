// Accessibility walk: structure checks on every page plus real keyboard runs.
//   node tools/qa/a11y.mjs <base-url>
// Checks: one h1 and no skipped heading levels, landmarks, image alternatives, form labels,
// accessible names of links and buttons, touch target sizes (mobile viewport), text contrast of
// the palette, keyboard order with visible focus on the home page, the compact menu, the form.
import { launch } from './browser.mjs';

const base = process.argv[2] ?? 'http://127.0.0.1:4321';
const PAGES = ['/', '/produkte/', '/produkte/safran-negin-1g/', '/herkunft-qualitaet/', '/handel/', '/gastronomie/', '/catering/', '/ueber-uns/', '/kontakt/', '/impressum/', '/datenschutz/', '/anfrage/gesendet/', '/anfrage/fehler/'];

const structure = `(() => {
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const name = (el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim().replace(/\\s+/g, ' ');
  const headings = [...document.querySelectorAll('h1,h2,h3,h4')].filter(visible).map((h) => ({ level: Number(h.tagName[1]), text: h.textContent.trim().replace(/\\s+/g, ' ').slice(0, 60) }));
  const skips = []; let prev = 0;
  for (const h of headings) { if (prev && h.level > prev + 1) skips.push(prev + '->' + h.level + ' "' + h.text + '"'); prev = h.level; }
  const imgs = [...document.querySelectorAll('img')];
  const controls = [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter((c) => !c.closest('.form__trap'));
  const unlabeled = controls.filter((c) => !(c.id && document.querySelector('label[for="' + c.id + '"]')) && !c.getAttribute('aria-label') && !c.closest('label')).map((c) => c.name || c.id);
  const interactive = [...document.querySelectorAll('a[href],button,summary')].filter(visible);
  const unnamed = interactive.filter((el) => !name(el)).map((el) => el.outerHTML.slice(0, 80));
  const small = interactive.map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ el, r }) => (r.height < 43.5 || r.width < 43.5) && !(el.tagName === 'A' && getComputedStyle(el).display === 'inline'))
    .map(({ el, r }) => name(el).slice(0, 30) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  const inlineSmall = interactive.filter((el) => el.tagName === 'A' && getComputedStyle(el).display === 'inline').length;
  return {
    lang: document.documentElement.lang,
    title: document.title,
    h1: headings.filter((h) => h.level === 1).length,
    headingSkips: skips,
    landmarks: { header: !!document.querySelector('header'), nav: [...document.querySelectorAll('nav')].map((n) => n.getAttribute('aria-label')), main: document.querySelectorAll('main').length, footer: !!document.querySelector('footer') },
    imgsWithoutAlt: imgs.filter((i) => !i.hasAttribute('alt')).length,
    imgs: imgs.length,
    unlabeled, unnamed, smallTargets: small, inlineTextLinks: inlineSmall,
    overflowX: document.documentElement.scrollWidth > innerWidth + 1,
  };
})()`;

const focusInfo = `(() => {
  const el = document.activeElement; if (!el || el === document.body) return null;
  const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
  const onScreen = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  let shown = Number(s.opacity); for (let p = el.parentElement; p; p = p.parentElement) shown = Math.min(shown, Number(getComputedStyle(p).opacity));
  return { tag: el.tagName.toLowerCase(), text: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 34),
    onScreen, opacity: shown, ring: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2 || /rgb/.test(s.boxShadow) && s.boxShadow !== 'none' || s.transform === 'none' && el.classList.contains('skip-link') };
})()`;

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const page = await launch();
const report = { pages: {}, keyboard: {}, contrast: {} };
let failures = 0;
const fail = (message) => { failures++; console.log('  FAIL', message); };

try {
  // ---- palette contrast (WCAG 2.x AA: 4.5 for text, 3 for large text and UI)
  // tokens are read from the running page, so this check cannot drift from the stylesheet
  await page.goto(base + '/impressum/', { settle: 400 });
  const t = await page.eval(`(() => { const s = getComputedStyle(document.documentElement); const o = {}; for (const k of ['paper','paper-soft','paper-deep','ink','ink-2','ink-3','bronze','saffron','saffron-deep','slate']) o[k] = s.getPropertyValue('--' + k).trim(); return o; })()`);
  const pairs = [
    ['ink on paper', t.ink, t.paper, 4.5], ['ink-2 on paper', t['ink-2'], t.paper, 4.5], ['ink-3 on paper', t['ink-3'], t.paper, 4.5],
    ['bronze on paper', t.bronze, t.paper, 4.5], ['bronze on label', t.bronze, t['paper-deep'], 4.5], ['ink-2 on label', t['ink-2'], t['paper-deep'], 4.5], ['ink-3 on label', t['ink-3'], t['paper-deep'], 4.5],
    ['saffron-deep on paper', t['saffron-deep'], t.paper, 4.5], ['saffron-deep on label', t['saffron-deep'], t['paper-deep'], 4.5], ['paper on ink (button)', t['paper-soft'], t.ink, 4.5],
    ['paper on slate', t['paper-soft'], t.slate, 4.5], ['eyebrow on slate', '#c9bd9c', t.slate, 4.5], ['saffron line on paper (UI)', t.saffron, t.paper, 3],
  ];
  console.log('Contrast');
  for (const [label, fg, bg, min] of pairs) {
    const ratio = contrast(fg, bg);
    report.contrast[label] = Number(ratio.toFixed(2));
    console.log(`  ${ratio >= min ? 'ok  ' : 'FAIL'} ${label}: ${ratio.toFixed(2)} (min ${min})`);
    if (ratio < min) failures++;
  }

  // ---- structure, desktop and mobile
  for (const [label, width, height, mobile] of [['desktop', 1440, 900, false], ['mobile', 390, 844, true]]) {
    console.log(`Structure (${label})`);
    await page.viewport(width, height, { mobile, dpr: mobile ? 2 : 1 });
    await page.media({ 'prefers-reduced-motion': 'reduce' });
    for (const path of PAGES) {
      await page.goto(base + path, { settle: 500 });
      const result = await page.eval(structure);
      report.pages[`${label} ${path}`] = result;
      const issues = [];
      if (result.lang !== 'de') issues.push('lang');
      if (result.h1 !== 1) issues.push(`h1 count ${result.h1}`);
      if (result.headingSkips.length) issues.push('heading skips: ' + result.headingSkips.join('; '));
      if (!result.landmarks.header || result.landmarks.main !== 1 || !result.landmarks.footer) issues.push('landmarks');
      if (result.landmarks.nav.some((n) => !n)) issues.push('unnamed nav');
      if (result.imgsWithoutAlt) issues.push(`${result.imgsWithoutAlt} img without alt`);
      if (result.unlabeled.length) issues.push('unlabeled: ' + result.unlabeled.join(','));
      if (result.unnamed.length) issues.push('unnamed: ' + result.unnamed.join(' | '));
      if (result.overflowX) issues.push('horizontal overflow');
      if (mobile && result.smallTargets.length) issues.push('small targets: ' + result.smallTargets.join(' | '));
      if (issues.length) fail(`${path}: ${issues.join(' · ')}`);
      else console.log(`  ok   ${path}`);
    }
  }

  // ---- keyboard: home page in motion mode, desktop
  console.log('Keyboard (home, motion, desktop)');
  await page.viewport(1440, 900);
  await page.media({});
  await page.goto(base + '/', { settle: 1800 });
  const order = [];
  for (let i = 0; i < 16; i++) {
    await page.key('Tab');
    await page.wait(750);
    order.push(await page.eval(focusInfo));
  }
  report.keyboard.home = order;
  for (const [i, f] of order.entries()) {
    const ok = f && f.onScreen && f.opacity > 0.5 && f.ring;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${String(i + 1).padStart(2)} ${f ? `${f.tag} "${f.text}" onScreen=${f.onScreen} opacity=${f.opacity} ring=${f.ring}` : 'nothing focused'}`);
    if (!ok) failures++;
  }
  const afterWalk = await page.eval(`getComputedStyle(document.querySelector('[data-journey-thread]')).getPropertyValue('--journey-p')`);
  console.log('  journey progress after reaching the arrival links:', afterWalk);

  // ---- keyboard: compact menu
  console.log('Keyboard (menu, mobile)');
  await page.viewport(390, 844, { mobile: true, dpr: 2 });
  await page.goto(base + '/produkte/', { settle: 800 });
  const closedReach = await page.eval(`document.querySelector('[data-menu]').hasAttribute('inert')`);
  await page.eval(`document.querySelector('[data-menu-toggle]').focus()`);
  await page.key('Enter');
  await page.wait(400);
  const open = await page.eval(`({ expanded: document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded'), label: document.querySelector('[data-menu-label]').textContent, mainInert: document.querySelector('main').hasAttribute('inert'), menuInert: document.querySelector('[data-menu]').hasAttribute('inert'), visible: getComputedStyle(document.querySelector('[data-menu]')).visibility })`);
  await page.key('Tab');
  const firstLink = await page.eval(focusInfo);
  await page.screenshot('.raw/shots/m-menu-open.png');
  await page.key('Escape');
  await page.wait(300);
  const closed = await page.eval(`({ expanded: document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded'), focusBack: document.activeElement === document.querySelector('[data-menu-toggle]'), mainInert: document.querySelector('main').hasAttribute('inert') })`);
  report.keyboard.menu = { closedReach, open, firstLink, closed };
  const menuOk = closedReach && open.expanded === 'true' && open.mainInert && !open.menuInert && open.visible === 'visible' && firstLink?.tag === 'a' && closed.expanded === 'false' && closed.focusBack && !closed.mainInert;
  console.log(`  ${menuOk ? 'ok  ' : 'FAIL'} ${JSON.stringify({ closedReach, open, firstLink: firstLink?.text, closed })}`);
  if (!menuOk) failures++;

  // ---- form: errors announced and focus moved, on desktop
  console.log('Form (kontakt)');
  await page.viewport(1280, 900);
  await page.goto(base + '/kontakt/?anliegen=handel&format=lose', { settle: 900 });
  const preset = await page.eval(`({ topic: document.querySelector('[data-topic]').value, format: document.querySelector('[name=format]').value, cateringHidden: document.querySelector('[data-group=catering]').hidden })`);
  await page.eval(`document.querySelector('[data-submit]').click()`);
  await page.wait(300);
  const invalid = await page.eval(`({ focused: document.activeElement.name, invalid: [...document.querySelectorAll('[aria-invalid=true]')].map((e) => e.name), message: document.querySelector('[data-error-for=name]').textContent, described: document.querySelector('[name=name]').getAttribute('aria-describedby') })`);
  await page.screenshot('.raw/shots/d-form-errors.png');
  report.keyboard.form = { preset, invalid };
  const formOk = preset.topic === 'handel' && preset.format === 'lose' && preset.cateringHidden && invalid.focused === 'name' && invalid.invalid.includes('email') && invalid.message && invalid.described === 'e-name';
  console.log(`  ${formOk ? 'ok  ' : 'FAIL'} ${JSON.stringify({ preset, invalid })}`);
  if (!formOk) failures++;

  const problems = page.consoleMessages.filter((m) => ['error', 'exception'].includes(m.type));
  if (problems.length) { console.log('Console errors:', JSON.stringify(problems.slice(0, 8), null, 1)); failures += problems.length; }
} finally {
  await page.close();
}
const { writeFile, mkdir } = await import('node:fs/promises');
await mkdir('.raw/qa', { recursive: true });
await writeFile('.raw/qa/a11y.json', JSON.stringify(report, null, 2));
console.log(failures ? `\n${failures} finding(s)` : '\nAll checks passed');
process.exitCode = failures ? 1 : 0;
