// Prüfwerkzeug Redesign „Der rote Faden“ (R3–R7, R9, docs/UEBERGABE-REDESIGN.md), Startseite und Unterseiten.
// Auf Seiten ohne Aufguss (--pfad /produkte/) entfallen die Messungen der Bühne, die Kopfzeile läuft über jede Welt der Seite.
//   node tools/qa/redesign.mjs <base-url> [--port 9401] [--dist dist/client] [--pfad /]
// Misst bewegt (Emulation no-preference) und ruhig (reduce) auf 360, 390, 768, 1440 px:
// Querüberlauf, Faden gegen Textzeilen, Kontrast je Aufguss-Fortschritt (schlechteste Pixelstelle unter
// jedem Textblock), Kopfzeile je Farbwelt, Fokusfarbe je Farbwelt, Medienausfall, Bildanfragen vor Bedarf,
// Vorlagenmuster (R3), neues JavaScript (R4), Inline-style und Fremdhosts (R7). Exit 0 = alles erfüllt.
import { launch } from './browser.mjs';
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const base = args[0] ?? 'http://127.0.0.1:4321';
const path = option('--pfad', '/');
const dist = option('--dist', 'dist/client');
const SIZES = [[360, 740, true], [390, 844, true], [768, 1024, true], [1440, 900, false]];
const page = await launch({ port: Number(option('--port', 9401)) });
const ROOT = path === '/' ? '.home' : 'main';
const hasStage = path === '/';

const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
await page.send('Network.enable');
await page.send('Network.setCacheDisabled', { cacheDisabled: true });
let fails = 0;
const report = (ok, line) => {
  if (!ok) fails++;
  console.log(`${ok ? 'ok    ' : 'FEHLER'} ${line}`);
};
const open = async (w, h, mobile, motion, url = base + path) => {
  await page.viewport(w, h, { mobile });
  await page.media({ 'prefers-reduced-motion': motion });
  await page.goto(url, { settle: 1000 });
};

// schlechteste Pixelstelle der Fläche unter jedem Block; Text über die Klasse ausgeblendet
const blocks = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].map((el) => {
  let o = 1;
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    const c = getComputedStyle(e);
    if (c.visibility === 'hidden' || c.display === 'none') o = 0;
    o *= +c.opacity;
  }
  const r = document.createRange(); r.selectNodeContents(el);
  const q = r.getBoundingClientRect(), c = getComputedStyle(el);
  if (o < 0.99 || !q.width || q.bottom < 0 || q.top > innerHeight) return null;
  const cut = q.height > 60 ? q.height * 0.22 : 0;
  return { t: el.textContent.trim().slice(0, 20), x: q.left, y: q.top + cut, w: q.width, h: q.height - 2 * cut, color: c.color, size: parseFloat(c.fontSize) };
}).filter(Boolean)`;

async function worstContrast(selector, w, h, hideExpr, showExpr) {
  const list = await page.eval(blocks(selector));
  const headerBottom = await page.eval(`Math.max(0, document.querySelector('[data-header]').getBoundingClientRect().bottom)`);
  await page.eval(hideExpr);
  await page.wait(120);
  const { data: png } = await page.send('Page.captureScreenshot', { format: 'png' });
  await page.eval(showExpr);
  const { data, info } = await sharp(Buffer.from(png, 'base64')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const scale = info.width / w;
  let worst = 99;
  let who = '';
  for (const b of list) {
    const fg = lum(rgb(b.color));
    const need = b.size >= 24 ? 3 : 4.5;
    for (let y = Math.max(Math.ceil(headerBottom), Math.floor(b.y)); y < Math.min(h, b.y + b.h); y += 2) {
      for (let x = Math.max(0, Math.floor(b.x)); x < Math.min(w, b.x + b.w); x += 2) {
        const i = (Math.round(y * scale) * info.width + Math.round(x * scale)) * 3;
        const c = ratio(fg, lum([data[i], data[i + 1], data[i + 2]])) / need;
        if (c < worst) {
          worst = c;
          who = `${b.t} ${(c * need).toFixed(1)}:1 (min ${need})`;
        }
      }
    }
  }
  return { worst, who, n: list.length };
}

const STAGE_TEXT = '.stage__text .eyebrow, .stage__text .kapitel, .chapter--aufguss, .schritte h3, .schritte p, .schritte__no';
const HIDE_STAGE = `document.querySelector('.stage__text').style.visibility = 'hidden'`;
const SHOW_STAGE = `document.querySelector('.stage__text').style.visibility = ''`;

try {
  for (const [w, h, mobile] of SIZES) {
    await open(w, h, mobile, 'no-preference');

    // R5: Querüberlauf
    const sw = await page.eval('document.documentElement.scrollWidth');
    report(sw <= w, `${w}px bewegt: Querüberlauf ${sw <= w ? 'keiner' : sw}`);

    // R5: Faden gegen Textzeilen
    const crossings = await page.eval(`(() => {
      const rects = [];
      const walker = document.createTreeWalker(document.querySelector('${ROOT}'), NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim() || n.parentElement.closest('[aria-hidden="true"]')) continue;
        const r = document.createRange(); r.selectNodeContents(n);
        for (const q of r.getClientRects()) rects.push({ l: q.left, r: q.right, t: q.top + scrollY + (q.height > 60 ? q.height * 0.22 : 0), b: q.bottom + scrollY - (q.height > 60 ? q.height * 0.22 : 0), x: n.textContent.trim().slice(0, 24) });
      }
      const hits = {};
      for (const svg of document.querySelectorAll('${ROOT} .thread')) {
        if (getComputedStyle(svg).display === 'none') continue;
        for (const path of svg.querySelectorAll('path')) {
          if (getComputedStyle(path).display === 'none') continue;
          const b = svg.getBoundingClientRect(), L = path.getTotalLength();
          for (let i = 0; i <= 800; i++) {
            const pt = path.getPointAtLength((L * i) / 800);
            const x = b.left + (pt.x / 100) * b.width, y = b.top + scrollY + (pt.y / 100) * b.height;
            for (const q of rects) if (x > q.l - 2 && x < q.r + 2 && y > q.t && y < q.b) hits[q.x] = 1;
          }
        }
      }
      return Object.keys(hits);
    })()`);
    report(crossings.length === 0, `${w}px: Faden kreuzt ${crossings.join(' | ') || 'nichts'}`);

    // R6: keine Bildanfrage vor Bedarf (Masken des Aufgusses erst nahe der Bühne)
    // Auf /catering/ ist das Foto das Kopfbild und darf gleich laden.
    const notYet = path === '/catering/' ? 'infusion\\/|bar-poster' : 'infusion\\/|catering-photo|bar-poster';
    const early = await page.eval(`performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /${notYet}/.test(n))`);
    report(early.length === 0, `${w}px: vor dem Scrollen keine Anfrage für Masken, Catering, Film ${early.length ? early.join(' ') : ''}`);

    if (hasStage) {
    // R4: Kontrast je Fortschritt
    const st = await page.eval(`(() => { const a = document.querySelector('[data-infusion]').getBoundingClientRect(), p = document.querySelector('[data-infusion-pin]'); return { top: a.top + scrollY, run: a.height - p.offsetHeight }; })()`);
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      await page.scrollTo(st.top + st.run * p, 500);
      const c = await worstContrast(STAGE_TEXT, w, h, HIDE_STAGE, SHOW_STAGE);
      report(c.worst >= 1, `${w}px Aufguss p=${p}: ${c.who} (${c.n} Blöcke)`);
    }

    }

    // Kopfzeile je Farbwelt: Text gegen die Leiste
    const bar = await page.eval(`(async () => {
      const out = [];
      const head = document.querySelector('[data-header]');
      const at = async (y) => { scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 450)); };
      const top = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return r.top + scrollY; };
      const stage = document.querySelector('[data-infusion]');
      if (!stage) {
        for (const w of document.querySelectorAll('main [data-world], .site-footer')) {
          const r = w.getBoundingClientRect();
          await at(r.top + scrollY + Math.min(40, r.height / 2));
          const c = getComputedStyle(head), link = head.querySelector('.wordmark');
          out.push({ name: w.className.split(' ')[0], world: head.dataset.world, color: getComputedStyle(head.querySelector('.menu-toggle, .site-nav a')).color, bg: c.backgroundColor, logoLight: 'n/a' });
        }
        return out;
      }
      const run = stage.getBoundingClientRect().height - document.querySelector('[data-infusion-pin]').offsetHeight;
      const spots = [['Faden', top('#geschichte') + 40], ['Glas', top('#kollektion') + 200], ['Aufguss Nacht', top('#ritual') + run * 0.2], ['Aufguss Gold', top('#ritual') + run * 0.9], ['Teller', top('#kueche') + 200], ['Tisch', top('#business') + 200]];
      for (const [name, y] of spots) {
        await at(y);
        const c = getComputedStyle(head), link = head.querySelector('.wordmark');
        out.push({ name, world: head.dataset.world, color: getComputedStyle(head.querySelector('.menu-toggle, .site-nav a')).color, bg: c.backgroundColor, logoLight: getComputedStyle(head.querySelector('.wordmark__logo--light')).display });
      }
      return out;
    })()`);
    for (const b of bar) {
      const r = ratio(lum(rgb(b.color)), lum(rgb(b.bg)));
      report(r >= 4.5, `${w}px Kopfzeile ${b.name} [${b.world}]: ${r.toFixed(1)}:1, helles Logo ${b.logoLight !== 'none' ? 'ja' : 'nein'}`);
    }

    // ruhige Fassung: gefärbter Endzustand
    await open(w, h, mobile, 'reduce');
    const swq = await page.eval('document.documentElement.scrollWidth');
    report(swq <= w, `${w}px ruhig: Querüberlauf ${swq <= w ? 'keiner' : swq}`);
    if (hasStage) {
    const pos = await page.eval(`(() => { const a = document.querySelector('[data-infusion]').getBoundingClientRect(); return { top: a.top + scrollY, h: a.height, sticky: getComputedStyle(document.querySelector('[data-infusion-pin]')).position }; })()`);
    report(pos.sticky !== 'sticky', `${w}px ruhig: keine gepinnte Bühne, Höhe ${Math.round(pos.h)} px`);
    for (let y = pos.top; y < pos.top + pos.h; y += h - 80) {
      await page.scrollTo(y, 350);
      const c = await worstContrast(STAGE_TEXT, w, h, HIDE_STAGE, SHOW_STAGE);
      if (c.n) report(c.worst >= 1, `${w}px ruhig Aufguss: ${c.who}`);
    }

    }

    // R9: Medienausfall
    await page.send('Network.setBlockedURLs', { urls: ['*.avif', '*.webp', '*.jpg', '*.png', '*.mp4', '*.svg', '*.bin'] });
    await open(w, h, mobile, 'no-preference');
    const out = await page.eval(`(() => {
      const empty = [...document.querySelectorAll('${ROOT} h2, ${ROOT} h3, ${ROOT} .lead, ${ROOT} .link, ${ROOT} .btn')].filter((e) => !e.getBoundingClientRect().height && !e.closest('[hidden]')).map((e) => e.textContent.trim().slice(0, 20));
      const collide = [...document.querySelectorAll('${ROOT} h2')].filter((a, i, l) => {
        if (!l[i + 1]) return false;
        const p = a.getBoundingClientRect(), q = l[i + 1].getBoundingClientRect();
        return p.bottom > q.top + 1 && q.bottom > p.top + 1 && p.right > q.left + 1 && q.right > p.left + 1; // Spalten nebeneinander überlappen nicht
      }).map((e) => e.textContent.slice(0, 20));
      return { sw: document.documentElement.scrollWidth, empty, collide };
    })()`);
    report(out.sw <= w && !out.empty.length && !out.collide.length, `${w}px Medienausfall: Überlauf ${out.sw <= w ? 'nein' : out.sw}, leer ${out.empty.join(',') || 'nichts'}, überlappt ${out.collide.join(',') || 'nichts'}`);
    await page.send('Network.setBlockedURLs', { urls: [] });
  }

  // R3 und R7 bei 1440 und 390 px
  for (const [w, h, mobile] of [SIZES[3], SIZES[1]]) {
    await open(w, h, mobile, 'no-preference');
    const pattern = await page.eval(`(() => {
      const hits = [];
      for (const s of document.querySelectorAll('${ROOT} section')) {
        const eye = s.querySelector('.eyebrow'), head = s.querySelector('h2');
        if (!eye || !head) continue;
        const lead = [...s.querySelectorAll('p')].find((p) => !p.classList.contains('eyebrow') && !p.classList.contains('kapitel') && (eye.compareDocumentPosition(p) & 4) && (head.compareDocumentPosition(p) & 4) && p.getBoundingClientRect().height);
        if (!lead) continue;
        const a = eye.getBoundingClientRect(), b = head.getBoundingClientRect(), c = lead.getBoundingClientRect();
        const stacked = b.top >= a.top && c.top >= b.bottom - 4 && c.top - b.bottom < 120 && b.top - a.bottom < 120;
        const sameEdge = Math.abs(a.left - b.left) < 6 && Math.abs(b.left - c.left) < 6;
        if (stacked && sameEdge) hits.push(s.id || s.className.split(' ')[0]);
      }
      return hits;
    })()`);
    report(pattern.length <= 2, `${w}px R3: Muster Zeile + Überschrift + Absatz ${pattern.length}-mal ${pattern.join(', ')}`);
    const shapes = await page.eval(`[...document.querySelectorAll('${ROOT} section')].filter((s) => s.querySelector('h2')).map((s) => {
      const big = s.querySelector('h2');
      const grid = [...s.querySelectorAll('*')].find((e) => /grid/.test(getComputedStyle(e).display) && getComputedStyle(e).gridTemplateColumns.split(' ').length > 1);
      return { id: s.id || s.className.split(' ')[0], sig: [getComputedStyle(s).backgroundColor, Math.round(parseFloat(getComputedStyle(big).fontSize) / 16), grid ? grid.tagName + getComputedStyle(grid).gridTemplateColumns.split(' ').length : 'eine', s.querySelectorAll('img, video').length].join('/') };
    })`);
    const twins = shapes.filter((x, i) => shapes[i + 1] && x.sig === shapes[i + 1].sig).map((x) => x.id);
    report(twins.length === 0, `${w}px R3: gleich gebaute Folgeabschnitte ${twins.join(', ') || 'keine'}  [${shapes.map((x) => x.id + '=' + x.sig.split('/').slice(1).join('/')).join(' ')}]`);
    const r7 = await page.eval(`(() => {
      const inline = [...document.querySelectorAll('body [style]')].filter((e) => !e.closest('[data-journey]') && e.tagName !== 'HTML' && !e.hasAttribute('data-zone') && !e.matches('[data-infusion], [data-vitrine]')).map((e) => e.tagName + '.' + e.className).slice(0, 4);
      const hosts = [...new Set(performance.getEntriesByType('resource').map((e) => new URL(e.name).host))].filter((x) => x !== location.host);
      return { inline, hosts, cookies: document.cookie };
    })()`);
    report(!r7.inline.length && !r7.hosts.length && !r7.cookies, `${w}px R7: style-Attribut ${r7.inline.join(',') || 'nein'}, Fremdhosts ${r7.hosts.join(',') || 'nein'}, Cookies ${r7.cookies || 'nein'}`);
    const worlds = await page.eval(`[...document.querySelectorAll('${ROOT} [data-world], .site-footer')].map((e) => {
      const c = getComputedStyle(e);
      return { n: e.className.split(' ')[0], bg: c.backgroundColor, focus: c.getPropertyValue('--saffron').trim(), focusable: !!e.querySelector('a, button') };
    }).filter((x) => /^rgb/.test(x.bg) && !/, 0\\)$/.test(x.bg) && x.focusable)`);
    for (const x of worlds) {
      const hex = x.focus.startsWith('#') ? [1, 3, 5].map((i) => parseInt(x.focus.slice(i, i + 2), 16)) : null;
      if (hex) report(ratio(lum(hex), lum(rgb(x.bg))) >= 3, `${w}px R5 Fokusfarbe ${x.n}: ${ratio(lum(hex), lum(rgb(x.bg))).toFixed(1)}:1`);
    }
  }

  // R4: neues JavaScript
  const astroDir = join(dist, '_astro');
  const js = readdirSync(astroDir).filter((f) => f.endsWith('.js') && /data-infusion|data-zone/.test(readFileSync(join(astroDir, f), 'latin1')));
  // Astro schreibt kleine Module direkt ins HTML, größere nach _astro/
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const inline = [...html.matchAll(/<script type="module"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((s) => /data-infusion|data-zone/.test(s));
  const gz = [...js.map((f) => readFileSync(join(astroDir, f))), ...inline].reduce((n, b) => n + gzipSync(b).length, 0);
  report(gz > 0 && gz <= 3000, `R4 neues JS (${js.length ? js.join(', ') : 'im HTML'}): ${gz} Byte gzip`);

  const problems = page.consoleMessages.filter((m) => ['error', 'exception'].includes(m.type) && !/ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(m.text ?? ''));
  report(problems.length === 0, `Konsole: ${problems.length ? JSON.stringify(problems.slice(0, 4)).slice(0, 400) : 'keine Fehler, keine CSP-Meldung'}`);
} finally {
  await page.close();
}
console.log(fails ? `\n${fails} Fehler` : '\nalles erfüllt');
process.exit(fails ? 1 : 0);
