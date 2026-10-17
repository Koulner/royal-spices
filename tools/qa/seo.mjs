// SEO check of a running build (docs/UEBERGABE-SEO.md, Musskriterien S1–S10; S4 with --redirects).
//   node tools/qa/seo.mjs <base-url> [--origin <url>] [--store] [--redirects] [--out <dir>]
//                         [--legacy <file>] [--no-browser] [--cdp-port <n>] [--max-pages <n>]
// <base-url> is the server to test, e.g. http://127.0.0.1:4322 after `npm run start`.
// --origin    origin expected in canonical and og:url (default: `site` from astro.config.mjs)
// --store     the build has a store: checks Offer, sku and the visible price (S2)
// --redirects also checks the old URLs from tools/seo/legacy-urls.txt (S4; another list with --legacy)
// --out       writes seo-report[-redirects].txt and .json into this folder
// --no-browser skips S7 (headless Chrome via tools/qa/browser.mjs, CDP port --cdp-port, default 9353)
//
// Launch switch: if every page is noindex (built without SITE_INDEXABLE=1) the run checks S6 and
// reports S1 and S5 for the sitemap pages only as a preview (hints). Otherwise S1 and S5 apply to
// all indexable pages. Findings are reported, never fixed. Exit code 1 if there is any error.
// Only the base URL is requested; URLs on the expected origin are mapped onto it.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as C from '../seo/checks.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const NOT_FOUND_PROBE = '/__seo-check-404__/';
const RULES = {
  S1: 'h1, Titel, Beschreibung, Canonical (indexierbare Seiten)',
  S2: 'JSON-LD: Product/Offer, WebSite, Organization mit NAP',
  S3: 'kein FAQPage/HowTo, Bewertungen nur echt',
  S4: 'alte URLs: 301, ein Sprung, Ziel 200',
  S5: 'Sitemap und robots.txt',
  S6: 'Launch-Schalter: ohne SITE_INDEXABLE=1 alles noindex',
  S7: 'kein Cookie/Speicher ohne Einwilligung, nur self/Store/cdn.shopify.com',
  S8: 'alt, og:image 1200×630, Favicon-Satz',
  S10: 'keine Gesundheitsbegriffe (Wortliste)',
  LINK: 'interne Links',
};

export function parseArgs(argv) {
  const opts = { base: null, origin: null, store: false, redirects: false, out: null, legacy: null, browser: true, cdpPort: 9353, maxPages: 200 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} braucht einen Wert`);
      return argv[++i];
    };
    if (a === '--origin') opts.origin = value().replace(/\/+$/, '');
    else if (a === '--store') opts.store = true;
    else if (a === '--redirects') opts.redirects = true;
    else if (a === '--out') opts.out = value();
    else if (a === '--legacy') opts.legacy = value();
    else if (a === '--no-browser') opts.browser = false;
    else if (a === '--cdp-port') opts.cdpPort = Number(value());
    else if (a === '--max-pages') opts.maxPages = Number(value());
    else if (a.startsWith('--')) throw new Error(`unbekannte Option ${a}`);
    else if (!opts.base) opts.base = a;
    else throw new Error(`überzähliges Argument ${a}`);
  }
  if (!opts.base) throw new Error('Aufruf: node tools/qa/seo.mjs <base-url> [--origin <url>] [--store] [--redirects] [--out <dir>]');
  opts.base = new URL(opts.base).origin;
  return opts;
}

/** `site` of astro.config.mjs: SITE_URL if set, else the literal fallback in the config. */
async function configuredOrigin() {
  if (process.env.SITE_URL) return new URL(process.env.SITE_URL).origin;
  const config = await readFile(join(ROOT, 'astro.config.mjs'), 'utf8');
  const m = /\bsite\s*:\s*(?:process\.env\.SITE_URL\s*\?\?\s*)?['"]([^'"]+)['"]/.exec(config);
  if (!m) throw new Error('site in astro.config.mjs nicht gefunden: --origin angeben');
  return new URL(m[1]).origin;
}

/** NAP from src/config/site.ts (import with type stripping, otherwise read from the source text). */
async function loadNap() {
  const file = join(ROOT, 'src/config/site.ts');
  try {
    const { site } = await import(pathToFileURL(file).href);
    return C.napFromSite(site);
  } catch {
    const src = await readFile(file, 'utf8');
    const get = (key) => new RegExp(`\\b${key}\\s*:\\s*['"]([^'"]+)['"]`).exec(src)?.[1];
    return C.napFromSite({
      name: get('name'),
      email: get('email'),
      phone: { href: get('href') },
      address: { street: get('street'), postalCode: get('postalCode'), city: get('city'), country: get('country') },
    });
  }
}

async function main(argv) {
  const opts = parseArgs(argv);
  const origin = opts.origin ?? (await configuredOrigin());
  const nap = await loadNap();
  const storeDomain = process.env.PUBLIC_SHOPIFY_STORE_DOMAIN || null;
  const base = new URL(opts.base);
  const findings = [];
  const add = (list, extra = {}) => findings.push(...list.map((f) => ({ ...f, ...extra })));
  const preview = (list) => list.map((f) => ({ ...f, level: 'hint', message: `${f.message} (Vorschau, gilt erst mit SITE_INDEXABLE=1)` }));

  /** Absolute URL on the expected origin or the base → URL on the base; anything else → null. */
  const local = (href, from = base) => {
    let url;
    try {
      url = new URL(href, from);
    } catch {
      return null;
    }
    if (url.origin === origin || url.origin === base.origin) return new URL(url.pathname + url.search, base);
    return null;
  };
  const get = async (url) => fetch(url, { redirect: 'manual' });

  // crawl: home page, sitemap pages and every internal link
  const sitemapUrls = [];
  const sitemapQueue = ['/sitemap-index.xml'];
  const sitemapSeen = new Set();
  while (sitemapQueue.length) {
    const path = sitemapQueue.shift();
    if (sitemapSeen.has(path)) continue;
    sitemapSeen.add(path);
    const res = await get(new URL(path, base));
    if (res.status !== 200) {
      await res.body?.cancel();
      continue;
    }
    const parsed = C.parseSitemap(await res.text());
    sitemapUrls.push(...parsed.urls);
    for (const loc of parsed.sitemaps) {
      const url = local(loc);
      if (url) sitemapQueue.push(url.pathname);
    }
  }

  const pages = [];
  const brokenLinks = new Map();
  const queue = ['/', ...sitemapUrls.map((u) => local(u.loc)?.pathname).filter(Boolean)];
  const seen = new Set();
  while (queue.length && pages.length < opts.maxPages) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    const res = await get(new URL(path, base));
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel();
      const next = local(location, new URL(path, base));
      if (next) queue.push(next.pathname);
      continue;
    }
    if (res.status !== 200 || !(res.headers.get('content-type') ?? '').includes('text/html')) {
      if (res.status !== 200) brokenLinks.set(path, res.status);
      await res.body?.cancel();
      continue;
    }
    const page = C.parsePage(await res.text());
    pages.push({ path, status: 200, page, noindex: C.isNoindex(page.robots) || C.isNoindex(res.headers.get('x-robots-tag')) });
    for (const href of page.links) {
      const url = local(href, new URL(path, base));
      if (!url || url.pathname.startsWith('/api/') || /\.(?!html?$)[a-z0-9]{2,5}$/i.test(url.pathname)) continue;
      if (!seen.has(url.pathname)) queue.push(url.pathname);
    }
  }
  if (!pages.length) throw new Error(`keine HTML-Seite unter ${base.href} erreichbar`);

  // the 404 page counts for the launch switch: it must stay noindex
  const probe = await get(new URL(NOT_FOUND_PROBE, base));
  const probePage = (probe.headers.get('content-type') ?? '').includes('text/html') ? C.parsePage(await probe.text()) : (await probe.body?.cancel(), null);
  const notFound = { path: '(404-Seite)', status: probe.status, noindex: probePage ? C.isNoindex(probePage.robots) : true };
  if (probe.status !== 404) add([{ rule: 'LINK', code: 'LINK-404', level: 'error', message: `unbekannter Pfad antwortet ${probe.status} statt 404` }], { path: NOT_FOUND_PROBE });
  for (const [path, status] of brokenLinks) add([{ rule: 'LINK', code: 'LINK-broken', level: 'error', message: `interner Link antwortet ${status}` }], { path });

  // launch switch (S6) and robots.txt (S5/S6)
  const launch = C.detectLaunch(pages);
  const robotsRes = await get(new URL('/robots.txt', base));
  const robotsText = robotsRes.status === 200 ? await robotsRes.text() : (await robotsRes.body?.cancel(), null);
  add(C.checkRobots(robotsText, { launch, origin }), { path: '/robots.txt' });
  if (!launch && !notFound.noindex) add([{ rule: 'S6', code: 'S6-noindex', level: 'error', message: '404-Seite ohne noindex' }], { path: notFound.path });
  if (launch) {
    if (!notFound.noindex) add([{ rule: 'S6', code: 'S6-noindex', level: 'error', message: '404-Seite ist indexierbar' }], { path: notFound.path });
    const excluded = pages.filter((p) => p.noindex).map((p) => p.path);
    if (excluded.length) add([{ rule: 'S6', code: 'S6-noindex-pages', level: 'hint', message: `noindex trotz Launch: ${excluded.join(', ')}` }]);
  }

  // page rules: S1 on indexable pages (launch off: preview on the sitemap pages), S2, S3, S8, S10 everywhere
  const sitemapPaths = new Set(sitemapUrls.filter((u) => u.loc.startsWith(origin + '/')).map((u) => u.loc.slice(origin.length)));
  const s1Pages = launch ? pages.filter((p) => !p.noindex) : pages.filter((p) => sitemapPaths.has(p.path));
  for (const { path, page } of pages) {
    const list = C.checkPage(page, { path, origin, store: opts.store, nap, indexable: false });
    add(list);
  }
  for (const { path, page } of s1Pages) {
    const list = C.checkS1(page, { path, origin }).map((f) => ({ ...f, path }));
    add(launch ? list : preview(list));
  }
  const dup = C.checkDuplicates(s1Pages);
  add(launch ? dup : preview(dup));

  // S5 sitemap
  const sm = C.checkSitemap(sitemapUrls, { origin, launch, indexable: pages.filter((p) => !p.noindex).map((p) => p.path) });
  add(launch ? sm : preview(sm));

  // S8: og:image really 1200×630, favicon files answer 200
  const ogImages = new Map();
  for (const { path, page } of pages) if (page.ogImage) ogImages.set(page.ogImage, [...(ogImages.get(page.ogImage) ?? []), path]);
  for (const [src, paths] of ogImages) {
    const url = local(src);
    if (!url) {
      add([{ rule: 'S8', code: 'S8-og-image', level: 'hint', message: `og:image ${src} liegt nicht auf ${origin}, Größe nicht geprüft` }], { path: paths[0] });
      continue;
    }
    const res = await get(url);
    const size = res.status === 200 ? C.imageSize(Buffer.from(await res.arrayBuffer())) : (await res.body?.cancel(), null);
    if (res.status !== 200) add([{ rule: 'S8', code: 'S8-og-image', level: 'error', message: `og:image ${src} antwortet ${res.status} (${paths.length} Seiten)` }], { path: paths[0] });
    else if (!size || size.width !== C.OG_IMAGE.width || size.height !== C.OG_IMAGE.height)
      add([{ rule: 'S8', code: 'S8-og-image', level: 'error', message: `og:image ${src} ist ${size ? `${size.width}×${size.height}` : 'kein lesbares Bild'} statt 1200×630 (${paths.length} Seiten)` }], { path: paths[0] });
  }
  const home = pages.find((p) => p.path === '/') ?? pages[0];
  for (const icon of home.page.icons) {
    const url = local(icon.href ?? '', new URL(home.path, base));
    if (!url) continue;
    const res = await get(url);
    await res.body?.cancel();
    if (res.status !== 200) add([{ rule: 'S8', code: 'S8-favicon', level: 'error', message: `Favicon ${icon.href} antwortet ${res.status}` }], { path: home.path });
  }

  // S7 in headless Chrome
  let s7 = { summary: 'nicht geprüft (--no-browser)', pages: [] };
  if (opts.browser) {
    s7 = await browserChecks(base, origin, pages.map((p) => p.path), { port: opts.cdpPort, storeDomain }, add);
  } else add([{ rule: 'S7', code: 'S7-skipped', level: 'hint', message: 'S7 übersprungen (--no-browser)' }]);

  // S4 old URLs
  let redirects = null;
  if (opts.redirects) {
    const file = resolve(opts.legacy ?? join(ROOT, 'tools/seo/legacy-urls.txt'));
    const { entries, errors } = C.parseLegacyList(await readFile(file, 'utf8'));
    for (const e of errors) add([{ rule: 'S4', code: 'S4-list', level: 'error', message: `legacy-urls.txt: ${e}` }]);
    redirects = [];
    for (const entry of entries) {
      const r = await C.checkRedirect(base.href, entry, { origin });
      redirects.push(r);
      if (r.finding) add([r.finding]);
    }
  }

  return {
    report: {
      tool: 'tools/qa/seo.mjs',
      date: new Date().toISOString(),
      base: base.origin,
      origin,
      store: opts.store,
      storeDomain,
      launch: { indexable: launch, mode: launch ? 'Launch (indexierbare Seiten vorhanden)' : 'vor dem Launch (alle Seiten noindex)' },
      s7,
      pages: pages.map((p) => ({ path: p.path, noindex: p.noindex, title: p.page.title, inSitemap: sitemapPaths.has(p.path) })),
      sitemap: sitemapUrls,
      counts: { errors: findings.filter((f) => f.level === 'error').length, hints: findings.filter((f) => f.level === 'hint').length },
      findings,
      redirects,
    },
    opts,
  };
}

async function browserChecks(base, origin, paths, { port, storeDomain }, add) {
  const { launch } = await import('./browser.mjs');
  const page = await launch({ port });
  const urls = [];
  const details = [];
  page.on('Network.requestWillBeSent', (p) => urls.push(p.request.url));
  try {
    for (const path of paths) {
      await page.send('Network.clearBrowserCookies');
      await page.send('Storage.clearDataForOrigin', { origin: base.origin, storageTypes: 'all' });
      urls.length = 0;
      await page.goto(new URL(path, base).href, { settle: 1500 });
      const state = await page.eval('({ cookie: document.cookie, localStorage: Object.keys(localStorage), sessionStorage: Object.keys(sessionStorage) })');
      const { cookies } = await page.send('Network.getAllCookies');
      state.cookies = cookies.map((c) => c.name);
      add(C.checkStorage(state), { path });
      add(C.checkRequests([...urls], { self: [base.host, new URL(origin).host], storeDomain }), { path });
      const hosts = [...new Set(urls.map((u) => (/^(?:https?|wss?):/.test(u) ? new URL(u).host : u.split(':')[0] + ':')))];
      details.push({ path, requests: urls.length, hosts, cookies: state.cookies.length, localStorage: state.localStorage.length, sessionStorage: state.sessionStorage.length });
    }
  } finally {
    await page.close();
  }
  const total = details.reduce((n, d) => n + d.requests, 0);
  const hosts = [...new Set(details.flatMap((d) => d.hosts))];
  return { summary: `geprüft auf ${paths.length} Seiten (CDP-Port ${port}), ${total} Anfragen an ${hosts.join(', ')}`, pages: details };
}

/** Plain-text report, grouped by criterion, then by finding. */
export function formatText(report) {
  const lines = [];
  const yes = (b) => (b ? 'ja' : 'nein');
  lines.push(`SEO-Prüfung ${report.date}`);
  lines.push(`Basis ${report.base} · Origin ${report.origin} · Store ${yes(report.store)} · Weiterleitungen ${yes(report.redirects)}`);
  lines.push(`Launch-Schalter: ${report.launch.mode}${report.launch.indexable ? '' : ' → S6 geprüft, S1 und S5 nur als Vorschau'}`);
  lines.push(`S7: ${report.s7.summary}`);
  lines.push(`Seiten: ${report.pages.length} · Fehler: ${report.counts.errors} · Hinweise: ${report.counts.hints}`);
  for (const rule of Object.keys(RULES)) {
    const list = report.findings.filter((f) => f.rule === rule);
    const checked = rule !== 'S4' || report.redirects;
    if (!checked) continue;
    const errors = list.filter((f) => f.level === 'error').length;
    lines.push('', `${rule} – ${RULES[rule]}: ${errors ? `${errors} Fehler` : 'keine Fehler'}${list.length - errors ? `, ${list.length - errors} Hinweise` : ''}`);
    const groups = new Map();
    for (const f of list) {
      const key = `${f.level === 'error' ? 'Fehler ' : 'Hinweis'} ${f.code}: ${f.message}`;
      groups.set(key, [...(groups.get(key) ?? []), f.path].filter(Boolean));
    }
    for (const [key, paths] of groups) lines.push(`  [${key}]${paths.length ? `\n      ${paths.join(', ')}` : ''}`);
  }
  if (report.redirects) {
    lines.push('', 'Weiterleitungen (alte URL → Status → Ziel → Status):');
    for (const r of report.redirects)
      lines.push(`  ${r.finding ? (r.finding.level === 'error' ? '✗' : '·') : '✓'} ${r.path} → ${r.status}${r.location ? ` → ${r.location}` : ''}${r.finalStatus ? ` → ${r.finalStatus}` : ''}`);
  }
  return lines.join('\n') + '\n';
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const { report, opts } = await main(process.argv.slice(2));
    report.redirects = report.redirects ?? null;
    const text = formatText(report);
    process.stdout.write(text);
    if (opts.out) {
      const name = opts.redirects ? 'seo-report-redirects' : 'seo-report';
      await mkdir(opts.out, { recursive: true });
      await writeFile(join(opts.out, `${name}.txt`), text);
      await writeFile(join(opts.out, `${name}.json`), JSON.stringify(report, null, 2) + '\n');
    }
    process.exitCode = report.counts.errors ? 1 : 0;
  } catch (error) {
    console.error(`seo.mjs: ${error.message}`);
    process.exitCode = 2;
  }
}
