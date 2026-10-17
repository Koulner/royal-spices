// Checks behind tools/qa/seo.mjs (tools/seo/checks.mjs), the old-URL list and the IndexNow tool.
// Example HTML is inline: a good page yields no error, each bad variant exactly the expected one.
// The redirect check runs against a local node:http server on port 0, IndexNow against a fake
// fetch; nothing here touches the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as C from '../tools/seo/checks.mjs';
import * as indexnow from '../tools/seo/indexnow.mjs';
import { REDIRECTS, redirectTarget } from '../src/config/redirects.mjs';

const ORIGIN = 'https://royalspices.de';
const NAP = { name: 'Royal Spices', streetAddress: 'Hammerdeich 10', postalCode: '20537', addressLocality: 'Hamburg', addressCountry: 'DE', telephone: '+494059374940', email: 'info@royalspices.de' };
const PRODUCT = '/produkte/herat-negin-safran-1-g-grade-a/';

const productLd = (over = {}) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Herat Negin Safran – 1 g',
  image: `${ORIGIN}/og.jpg`,
  sku: 'RS-NEGIN-1G',
  brand: { '@type': 'Brand', name: 'Royal Spices' },
  offers: { '@type': 'Offer', price: '12.90', priceCurrency: 'EUR', availability: 'https://schema.org/InStock' },
  ...over,
});
const HOME_LD = [
  { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Royal Spices', url: `${ORIGIN}/` },
  {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'OnlineStore'],
    name: 'Royal Spices',
    email: 'info@royalspices.de',
    telephone: '+49 40 59374940',
    address: { '@type': 'PostalAddress', streetAddress: 'Hammerdeich 10', postalCode: '20537', addressLocality: 'Hamburg', addressCountry: 'DE' },
  },
];
const ICONS = `<link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png">
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png">
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">`;
const BODY = `<h1>Herat Negin Safran</h1>
  <img src="/img/negin.jpg" alt="Negin-Safranfäden in der Schale">
  <img src="/img/ornament.svg" alt="">
  <p>Ganze Negin-Fäden aus Herat, von Hand verlesen &amp; luftdicht verpackt.</p>
  <p class="buybox__price"><span data-buybox-price>12,90&nbsp;€</span></p>`;

/** A complete page; every part can be replaced. ld: array of JSON-LD values or raw strings. */
function page({
  path = PRODUCT,
  title = 'Herat Negin Safran 1 g, Grade 1 · Royal Spices',
  description = 'Ganze Negin-Safranfäden aus Herat, Afghanistan: von Hand verlesen, intensiv in Farbe und Duft. 1 g im Glas.',
  canonical = ORIGIN + path,
  ogUrl = ORIGIN + path,
  ogImage = `${ORIGIN}/og.jpg`,
  ogSize = ['1200', '630'],
  icons = ICONS,
  ld = [productLd()],
  body = BODY,
} = {}) {
  const scripts = ld.map((v) => `<script type="application/ld+json">${typeof v === 'string' ? v : JSON.stringify(v)}</script>`).join('');
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
  <title>${title}</title><meta name="description" content="${description}">
  <link rel="canonical" href="${canonical}"><meta name="robots" content="index, follow, max-image-preview:large">
  ${icons}<meta property="og:url" content="${ogUrl}"><meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="${ogSize[0]}"><meta property="og:image:height" content="${ogSize[1]}">
  ${scripts}<script>window.x = '<h1>not a heading</h1>';</script></head>
  <body>${body}<!-- <img src="/commented.jpg"> --></body></html>`;
}

/** Error codes of all page rules for one page (store build, indexable). */
const errors = (html, ctx = {}) =>
  C.checkPage(C.parsePage(html), { path: PRODUCT, origin: ORIGIN, store: true, nap: NAP, ...ctx })
    .filter((f) => f.level === 'error')
    .map((f) => f.code);

test('parsePage reads head, JSON-LD, images and the visible price', () => {
  const p = C.parsePage(page());
  assert.equal(p.title, 'Herat Negin Safran 1 g, Grade 1 · Royal Spices');
  assert.deepEqual(p.canonicals, [ORIGIN + PRODUCT]);
  assert.equal(p.h1Count, 1, 'h1 inside a script or comment does not count');
  assert.equal(p.images.length, 2);
  assert.equal(p.visiblePrice, 12.9);
  assert.equal(p.jsonLd.length, 1);
  assert.equal(C.isNoindex(p.robots), false);
  assert.equal(C.isNoindex('noindex, nofollow'), true);
  assert.match(p.text, /von Hand verlesen & luftdicht/);
});

test('good pages yield no error (product with store, home page, page without store)', () => {
  assert.deepEqual(errors(page()), []);
  assert.deepEqual(errors(page({ path: '/', ld: HOME_LD, body: '<h1>The Art of Saffron.</h1>' }), { path: '/' }), []);
  assert.deepEqual(errors(page({ ld: [productLd({ offers: undefined, sku: undefined })] }), { store: false }), []);
});

const BAD = [
  ['S1-h1', page({ body: BODY + '<h1>Zweite</h1>' })],
  ['S1-h1', page({ body: BODY.replace(/<\/?h1>/g, '') })],
  ['S1-title', page({ title: 'Safran' })],
  ['S1-description', page({ description: 'Zu kurz.' })],
  ['S1-canonical', page({ canonical: PRODUCT })],
  ['S1-canonical', page({ canonical: `${ORIGIN}/produkte/` })],
  ['S1-canonical', page({ canonical: ORIGIN + PRODUCT.slice(0, -1) })],
  ['S1-og-url', page({ ogUrl: `${ORIGIN}/` })],
  ['S2-jsonld', page({ ld: [productLd(), '{"@type": "Product",'] })],
  ['S2-product', page({ ld: [productLd({ brand: undefined })] })],
  ['S2-product', page({ ld: [productLd({ sku: undefined })] })],
  ['S2-offer', page({ ld: [productLd({ offers: { ...productLd().offers, price: '0.00' } })] })],
  ['S2-offer', page({ ld: [productLd({ offers: undefined })] })],
  ['S2-price', page({ ld: [productLd({ offers: { ...productLd().offers, price: '14.90' } })] })],
  ['S3-forbidden', page({ ld: [productLd(), { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [] }] })],
  ['S3-forbidden', page({ ld: [{ '@context': 'https://schema.org', '@graph': [productLd(), { '@type': 'HowTo', name: 'Safran einweichen' }] }] })],
  ['S3-review', page({ ld: [productLd({ aggregateRating: { '@type': 'AggregateRating', ratingValue: 5, reviewCount: 12 } })] })],
  ['S8-alt', page({ body: BODY + '<img src="/img/glas.jpg">' })],
  ['S8-og-image', page({ ogSize: ['1200', '1200'] })],
  ['S8-og-image', page({ ogImage: '/og.jpg' })],
  ['S8-favicon', page({ icons: ICONS.replace(/.*sizes="96x96".*\n/, '') })],
  ['S8-favicon', page({ icons: ICONS.replace(/.*apple-touch-icon.*/, '') })],
  ['S10-health', page({ body: BODY + '<p>Safran wirkt stimmungsaufhellend.</p>' })],
  ['S10-health', page({ description: 'Ganze Negin-Safranfäden aus Herat: reich an Antioxidantien, intensiv in Farbe und Duft, 1 g im Glas.' })],
];
for (const [code, html] of BAD) {
  test(`bad example yields exactly ${code}`, () => assert.deepEqual(errors(html), [code]));
}

test('home page: WebSite, Organization and NAP from site.ts', () => {
  const home = (ld) => errors(page({ path: '/', ld, body: '<h1>The Art of Saffron.</h1>' }), { path: '/' });
  assert.deepEqual(home([HOME_LD[1]]), ['S2-website']);
  assert.deepEqual(home([{ ...HOME_LD[0], name: 'www.Royal-Spices.com' }, HOME_LD[1]]), ['S2-website']);
  assert.deepEqual(home([HOME_LD[0]]), ['S2-organization']);
  assert.deepEqual(home([HOME_LD[0], { ...HOME_LD[1], address: { ...HOME_LD[1].address, postalCode: '20095' } }]), ['S2-nap']);
  assert.deepEqual(home([HOME_LD[0], { ...HOME_LD[1], telephone: '+49 40 1234567' }]), ['S2-nap']);
});

test('S3 allows Recipe with HowToStep instructions (only the types HowTo and FAQPage are banned)', () => {
  const recipe = { '@context': 'https://schema.org', '@type': 'Recipe', name: 'Safranreis', recipeInstructions: [{ '@type': 'HowToStep', text: 'Fäden einweichen.' }] };
  assert.deepEqual(errors(page({ ld: [productLd(), recipe] })), []);
});

test('without store a Product must not carry an Offer', () => {
  assert.deepEqual(errors(page(), { store: false }), ['S2-offer']);
});

test('S1 is skipped for pages that are not indexable', () => {
  assert.deepEqual(errors(page({ title: 'x', canonical: '/' }), { indexable: false }), []);
});

test('S10 spares legal pages and the legal phrase "mit Wirkung für die Zukunft"', () => {
  const consent = BODY + '<p>Sie können die Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.</p>';
  assert.deepEqual(errors(page({ body: consent })), []);
  const legal = page({ path: '/datenschutz/', ld: [], body: '<h1>Datenschutz</h1><p>Gesundheitsdaten verarbeiten wir nicht.</p>' });
  assert.deepEqual(errors(legal, { path: '/datenschutz/' }), []);
  assert.deepEqual(errors(page({ body: BODY + '<p>Ein Potenzial für jede Küche; der Duft wirkt edel.</p>' })), []);
});

test('duplicate titles and descriptions are reported on every page that shares them', () => {
  const a = { path: '/a/', page: C.parsePage(page({ path: '/a/' })) };
  const b = { path: '/b/', page: C.parsePage(page({ path: '/b/', description: 'Eine andere Beschreibung mit genug Zeichen, damit sie in den Bereich von 70 bis 160 passt.' })) };
  const found = C.checkDuplicates([a, b]);
  assert.deepEqual(found.map((f) => [f.code, f.path]), [['S1-title-duplicate', '/a/'], ['S1-title-duplicate', '/b/']]);
});

test('S6: launch switch and robots.txt', () => {
  assert.equal(C.detectLaunch([{ status: 200, noindex: true }, { status: 404, noindex: false }]), false);
  assert.equal(C.detectLaunch([{ status: 200, noindex: true }, { status: 200, noindex: false }]), true);
  const codes = (text, launch) => C.checkRobots(text, { launch, origin: ORIGIN }).map((f) => f.code);
  assert.deepEqual(codes('User-agent: *\nDisallow: /\n', false), []);
  assert.deepEqual(codes('User-agent: *\nAllow: /\n', false), ['S6-robots']);
  assert.deepEqual(codes(`User-agent: *\nDisallow: /\nDisallow: /api/\nDisallow: /anfrage/\nSitemap: ${ORIGIN}/sitemap-index.xml\n`, true), ['S6-robots']);
});

test('S5: robots.txt after the launch', () => {
  const codes = (text) => C.checkRobots(text, { launch: true, origin: ORIGIN }).map((f) => f.code);
  const good = `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /anfrage/\n\nSitemap: ${ORIGIN}/sitemap-index.xml\n`;
  assert.deepEqual(codes(good), []);
  assert.deepEqual(codes(good.replace('Disallow: /anfrage/\n', '')), ['S5-robots']);
  assert.deepEqual(codes(good.replace(/Sitemap.*\n/, '')), ['S5-robots']);
});

test('S5: the sitemap lists exactly the indexable pages, with slash and lastmod only where documented', () => {
  const xml = (urls) => `<?xml version="1.0"?><urlset>${urls.map(([loc, lastmod]) => `<url><loc>${ORIGIN}${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('')}</urlset>`;
  const indexable = ['/', '/produkte/', PRODUCT];
  const codes = (urls) => C.checkSitemap(C.parseSitemap(xml(urls)).urls, { origin: ORIGIN, launch: true, indexable }).map((f) => f.code);
  const good = [['/'], ['/produkte/'], [PRODUCT, '2026-10-15T09:00:00Z']];
  assert.deepEqual(codes(good), []);
  assert.deepEqual(codes([...good, ['/anfrage/gesendet/']]), ['S5-sitemap']);
  assert.deepEqual(codes(good.slice(0, 2)), ['S5-sitemap']);
  assert.deepEqual(codes([['/'], ['/produkte/', '2026-10-16'], good[2]]), ['S5-lastmod']);
  assert.deepEqual(C.checkSitemap([{ loc: `${ORIGIN}/kontakt`, lastmod: null }], { origin: ORIGIN, launch: false }).map((f) => f.code), ['S5-sitemap']);
  const index = C.parseSitemap(`<sitemapindex><sitemap><loc>${ORIGIN}/sitemap-0.xml</loc></sitemap></sitemapindex>`);
  assert.deepEqual(index.sitemaps, [`${ORIGIN}/sitemap-0.xml`]);
});

test('S7: no cookie or storage after loading, requests only to self, store and cdn.shopify.com', () => {
  const codes = (list) => list.map((f) => f.code);
  assert.deepEqual(C.checkStorage({ cookie: '', cookies: [], localStorage: [], sessionStorage: [] }), []);
  assert.deepEqual(codes(C.checkStorage({ cookie: '_ga=1', localStorage: [], sessionStorage: [] })), ['S7-cookie']);
  assert.deepEqual(codes(C.checkStorage({ cookie: '', cookies: ['session'], localStorage: [], sessionStorage: [] })), ['S7-cookie']);
  assert.deepEqual(codes(C.checkStorage({ cookie: '', localStorage: ['rs-cart'], sessionStorage: [] })), ['S7-local-storage']);
  assert.deepEqual(codes(C.checkStorage({ cookie: '', localStorage: [], sessionStorage: ['x'] })), ['S7-session-storage']);
  const ctx = { self: ['127.0.0.1:4391', 'royalspices.de'], storeDomain: 'shop.example.myshopify.com' };
  const ok = ['http://127.0.0.1:4391/_astro/a.js', 'https://royalspices.de/og.jpg', 'https://cdn.shopify.com/s/files/x.jpg', 'https://shop.example.myshopify.com/api/graphql', 'data:image/png;base64,AA', 'blob:http://127.0.0.1:4391/1'];
  assert.deepEqual(C.checkRequests(ok, ctx), []);
  assert.deepEqual(codes(C.checkRequests([...ok, 'https://www.googletagmanager.com/gtag/js'], ctx)), ['S7-third-party']);
  assert.deepEqual(codes(C.checkRequests(['https://shop.example.myshopify.com/api/graphql'], { self: ctx.self })), ['S7-third-party']);
});

test('imageSize reads PNG and JPEG headers', () => {
  const png = Buffer.alloc(24);
  png.writeUInt32BE(0x89504e47, 0);
  png.writeUInt32BE(1200, 16);
  png.writeUInt32BE(630, 20);
  assert.deepEqual(C.imageSize(png), { type: 'png', width: 1200, height: 630 });
  // SOI, APP0 (length 4), SOF0 with height 630 and width 1200
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x76, 0x04, 0xb0, 0x03, 0x01, 0x22, 0x00]);
  assert.deepEqual(C.imageSize(jpeg), { type: 'jpeg', width: 1200, height: 630 });
  assert.equal(C.imageSize(Buffer.from('not an image')), null);
});

test('legacy-urls.txt parses, covers the redirect table and agrees with it', async () => {
  const { entries, errors: bad } = C.parseLegacyList(await readFile(new URL('../tools/seo/legacy-urls.txt', import.meta.url), 'utf8'));
  assert.deepEqual(bad, []);
  const paths = entries.map((e) => e.path.toLowerCase().replace(/\/+$/, ''));
  assert.equal(new Set(entries.map((e) => e.path)).size, entries.length, 'no duplicates');
  for (const key of REDIRECTS.keys()) assert.ok(paths.includes(key), `${key} fehlt in legacy-urls.txt`);
  for (const p of ['/policies/terms-of-service', '/policies/refund-policy']) assert.equal(entries.find((e) => e.path === p)?.target, '404');
  assert.ok(entries.some((e) => e.path.includes('?variant=')) && entries.some((e) => /^\/collections\/[^/]+\/products\//.test(e.path)));
  for (const e of entries) {
    const [path, query = ''] = e.path.split('?');
    const target = redirectTarget(path);
    if (target && e.target) assert.equal(e.target, target + (query ? `?${query}` : ''), e.path);
  }
  assert.deepEqual(C.parseLegacyList('/a /b/\nkein-pfad\n/c /d/ /e/\n# Kommentar\n/x 404').errors, ['Zeile 2: kein-pfad', 'Zeile 3: /c /d/ /e/']);
});

test('redirect check against a local server: one 301 to a 200 passes, each fault yields its code', async (t) => {
  const routes = {
    '/new/': [200],
    '/old': [301, '/new/'],
    '/old-query': [301, '/new/', true],
    '/absolute': [301, `${ORIGIN}/new/`],
    '/found': [302, '/new/'],
    '/plain': [200],
    '/chain': [301, '/hop/'],
    '/hop/': [301, '/new/'],
    '/dead': [301, '/gone/'],
    '/wrong': [301, '/other/'],
    '/other/': [200],
    '/away': [301, 'https://example.invalid/new/'],
    '/now-redirects': [301, '/new/'],
  };
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const [status = 404, location, keepQuery] = routes[url.pathname] ?? [];
    res.writeHead(status, location ? { location: location + (keepQuery ? url.search : '') } : {}).end('x');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const requested = [];
  const fetchImpl = (url, init) => {
    requested.push(String(url));
    assert.ok(String(url).startsWith(base), `no request outside the test server: ${url}`);
    return fetch(url, init);
  };
  const check = async (path, target = null) => {
    const r = await C.checkRedirect(base, { path, target }, { origin: ORIGIN, fetchImpl });
    return r.finding ? `${r.finding.level}:${r.finding.code}` : 'ok';
  };
  assert.equal(await check('/old', '/new/'), 'ok');
  assert.equal(await check('/old'), 'ok');
  assert.equal(await check('/old-query?variant=7', '/new/?variant=7'), 'ok');
  assert.equal(await check('/absolute', '/new/'), 'ok');
  assert.equal(await check('/found', '/new/'), 'error:S4-status');
  assert.equal(await check('/plain', '/new/'), 'error:S4-status');
  assert.equal(await check('/chain', '/hop/'), 'error:S4-hops');
  assert.equal(await check('/dead', '/gone/'), 'error:S4-final');
  assert.equal(await check('/wrong', '/new/'), 'error:S4-target');
  assert.equal(await check('/old-query?variant=7', '/new/?variant=8'), 'error:S4-target');
  assert.equal(await check('/away'), 'error:S4-offsite');
  assert.equal(await check('/missing', '404'), 'hint:S4-deliberate-404');
  assert.equal(await check('/now-redirects', '404'), 'hint:S4-deliberate-404');
  assert.ok(!requested.some((u) => u.includes('example.invalid')));
});

test('indexnow: dry run by default, sends only with --send and INDEXNOW_KEY, own host only', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'rs-indexnow-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const KEY = 'royal-spices-test-key';
  const urls = [`${ORIGIN}/`, `${ORIGIN}${PRODUCT}`, 'https://example.org/fremd/'];
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { status: 202 };
  };
  const logs = [];
  const opts = (env = {}) => ({ env, fetchImpl, log: (m) => logs.push(m), root: dir });

  assert.equal(await indexnow.run(['--host', ORIGIN, ...urls], opts({ INDEXNOW_KEY: KEY })), 0);
  assert.equal(calls.length, 0, 'dry run sends nothing');
  assert.ok(!logs.join('\n').includes(KEY), 'the dry run does not print the key');

  assert.equal(await indexnow.run(['--host', ORIGIN, '--send', ...urls], opts({})), 2);
  assert.equal(calls.length, 0, 'no key, no request');

  assert.equal(await indexnow.run(['--host', ORIGIN, '--send', ...urls], opts({ INDEXNOW_KEY: KEY })), 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, indexnow.ENDPOINT);
  assert.deepEqual(calls[0].body, { host: 'royalspices.de', key: KEY, keyLocation: `${ORIGIN}/${KEY}.txt`, urlList: [`${ORIGIN}/`, `${ORIGIN}${PRODUCT}`] });

  assert.equal(await indexnow.run(['--host', ORIGIN, '--send', 'https://example.org/'], opts({ INDEXNOW_KEY: KEY })), 2);
  assert.equal(calls.length, 1, 'only foreign URLs: nothing sent');

  const out = join(dir, 'dist', 'client');
  assert.equal(await indexnow.run(['--host', ORIGIN, '--write-key', out], opts({ INDEXNOW_KEY: KEY })), 0);
  assert.equal(await readFile(join(out, `${KEY}.txt`), 'utf8'), KEY);
  assert.equal(await indexnow.run(['--host', ORIGIN, '--write-key', join(dir, 'public')], opts({ INDEXNOW_KEY: KEY })), 2);
  await assert.rejects(readFile(join(dir, 'public', `${KEY}.txt`)));
  assert.equal(await indexnow.run(['--host', ORIGIN, '--write-key', out], opts({ INDEXNOW_KEY: 'kurz' })), 2);
});

test('indexnow reads the URLs from a local sitemap index', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'rs-indexnow-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const { writeFile } = await import('node:fs/promises');
  await writeFile(join(dir, 'sitemap-index.xml'), `<sitemapindex><sitemap><loc>${ORIGIN}/sitemap-0.xml</loc></sitemap></sitemapindex>`);
  await writeFile(join(dir, 'sitemap-0.xml'), `<urlset><url><loc>${ORIGIN}/</loc></url><url><loc>${ORIGIN}/b2b/</loc></url></urlset>`);
  assert.deepEqual(await indexnow.readSitemapUrls(join(dir, 'sitemap-index.xml')), [`${ORIGIN}/`, `${ORIGIN}/b2b/`]);
  const logs = [];
  const fetchImpl = () => assert.fail('dry run must not send');
  assert.equal(await indexnow.run(['--host', ORIGIN, '--sitemap', join(dir, 'sitemap-index.xml')], { env: {}, fetchImpl, log: (m) => logs.push(m), root: dir }), 0);
  assert.match(logs.join('\n'), /2 URLs/);
});
