// SEO checks behind tools/qa/seo.mjs (docs/UEBERGABE-SEO.md, Musskriterien S1–S10).
// Pure functions over HTML strings and plain data, no dependencies. The only function with I/O is
// checkRedirect(), and it takes the fetch implementation as a parameter so the tests can run it
// against a local server. tests/seo-checks.test.mjs covers every rule with a good and a bad example.
//
// A finding is { rule: 'S1', code: 'S1-title', level: 'error' | 'hint', message }.
// 'error' fails the run (exit code 1), 'hint' is reported only.

export const LIMITS = { title: [30, 60], description: [70, 160] };
export const OG_IMAGE = { width: 1200, height: 630 };
export const FAVICON_SIZES = [48, 96, 192];
/** Hosts a page may contact besides itself and the store domain (S7, CSP img-src). */
export const SHOPIFY_CDN = 'cdn.shopify.com';
/** Paths whose sitemap entry may carry lastmod: product detail pages (Shopify updatedAt), guide articles (dateModified). */
export const LASTMOD_PATHS = /^\/(?:produkte|ratgeber)\/[^/]+\/$/;
/** Legal texts quote data-protection law ("Gesundheitsdaten", "mit Wirkung für die Zukunft"); S10 is about product and guide texts. */
export const S10_EXEMPT = /^\/(?:datenschutz|impressum|agb|widerruf)\//;

// Word list for S10 (HCVO 1924/2006). Word starts, case-insensitive; deliberately broad, every hit is
// read by a person. Not on the list: "wirkt" (style copy: "wirkt edel"), "Potenzial".
export const HEALTH_TERMS =
  /(?<![\p{L}\p{N}])(?:wirkung|wirksam|heil(?:t|en|end|ung|kraft|mittel|wirk|pflanz|kund)|gesund|antioxid|stimmung|krank|therap|medizin|arznei|entzünd|immun|depress|krebs|blutdruck|cholesterin|verdauung|aphrodis|libido|potenz(?!ial)|abnehm|detox|superfood|wohlbefinden|vitalität|menstrua|alzheimer|demenz)[\p{L}]*/giu;
/** Phrases that contain a listed word without a health claim. */
export const HEALTH_ALLOW = [/mit wirkung (?:für die zukunft|ab|zum)/giu];

const finding = (rule, code, message, level = 'error') => ({ rule, code, level, message });

// ---------------------------------------------------------------------------------------------
// HTML parsing (regular expressions are enough for the generated Astro output)

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '', ndash: '–', mdash: '—', hellip: '…', euro: '€', middot: '·', szlig: 'ß', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', copy: '©', reg: '®', times: '×' };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    }
    return NAMED[e] ?? NAMED[e.toLowerCase()] ?? m;
  });
}

const tagPattern = (name) => new RegExp(`<${name}\\b(?:[^>"']|"[^"]*"|'[^']*')*>`, 'gi');
const squash = (s) => s.replace(/\s+/g, ' ').trim();

/** Attributes of one start tag, names lower case, values decoded. A missing value is ''. */
export function parseAttrs(tag) {
  const out = {};
  const body = tag.replace(/^<[^\s>/]+/, '').replace(/\/?>$/, '');
  for (const m of body.matchAll(/([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    const name = m[1].toLowerCase();
    if (!(name in out)) out[name] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

const relTokens = (a) => (a.rel ?? '').toLowerCase().split(/\s+/).filter(Boolean);

/** Parses German or plain money text ("1.234,56 €", "12.90") into a number, or null. */
export function parseMoney(text) {
  let s = String(text ?? '').replace(/[^\d,.-]/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Everything the checks need from one HTML document.
 * @param {string} html
 */
export function parsePage(html) {
  const doc = html.replace(/<!--[\s\S]*?-->/g, '');
  const jsonLd = [];
  for (const m of doc.matchAll(/<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script\s*>/gi)) {
    const type = (parseAttrs(`<script${m[1]}>`).type ?? '').trim().toLowerCase();
    if (type !== 'application/ld+json') continue;
    try {
      jsonLd.push({ data: JSON.parse(m[2]) });
    } catch (error) {
      jsonLd.push({ error: error.message });
    }
  }
  const clean = doc.replace(/<(script|style|template)\b[\s\S]*?<\/\1\s*>/gi, ' ');
  const headEnd = clean.search(/<\/head\s*>/i);
  const head = headEnd >= 0 ? clean.slice(0, headEnd) : clean;
  const metas = [...head.matchAll(tagPattern('meta'))].map((m) => parseAttrs(m[0]));
  const links = [...head.matchAll(tagPattern('link'))].map((m) => parseAttrs(m[0]));
  const meta = (key) => metas.find((a) => (a.name ?? a.property ?? '').toLowerCase() === key)?.content ?? null;
  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(head);

  const bodyStart = clean.search(/<body\b/i);
  const body = bodyStart >= 0 ? clean.slice(bodyStart) : clean;
  const images = [...body.matchAll(tagPattern('img'))].map((m) => parseAttrs(m[0]));
  const anchors = [...body.matchAll(tagPattern('a'))].map((m) => parseAttrs(m[0]).href).filter(Boolean);
  const priceMatch = /<[a-z][^>]*\sdata-buybox-price(?:[\s=][^>]*)?>([\s\S]*?)<\//i.exec(body);
  const bodyText = decodeEntities(body.replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, ' '));

  const title = titleMatch ? squash(decodeEntities(titleMatch[1])) : null;
  const description = meta('description');
  const alts = images.map((a) => a.alt ?? '').filter(Boolean);
  return {
    title,
    description,
    robots: meta('robots'),
    canonicals: links.filter((a) => relTokens(a).includes('canonical')).map((a) => a.href ?? ''),
    h1Count: (body.match(/<h1\b/gi) ?? []).length,
    ogUrl: meta('og:url'),
    ogImage: meta('og:image'),
    ogImageWidth: meta('og:image:width'),
    ogImageHeight: meta('og:image:height'),
    icons: links.filter((a) => relTokens(a).some((r) => r === 'icon' || r === 'apple-touch-icon')),
    jsonLd,
    images,
    links: anchors,
    visiblePrice: priceMatch ? parseMoney(decodeEntities(priceMatch[1].replace(/<[^>]*>/g, ''))) : null,
    text: squash([title ?? '', description ?? '', bodyText, ...alts].join(' ')),
  };
}

/** True if a robots meta value (or X-Robots-Tag header) keeps the page out of the index. */
export const isNoindex = (robots) => /\b(?:noindex|none)\b/i.test(robots ?? '');

// ---------------------------------------------------------------------------------------------
// JSON-LD helpers

/** Every object with an @type in a JSON-LD value, including @graph members and nested nodes. */
export function collectNodes(value, out = []) {
  if (Array.isArray(value)) for (const v of value) collectNodes(v, out);
  else if (value && typeof value === 'object') {
    if (value['@type']) out.push(value);
    for (const [k, v] of Object.entries(value)) if (k !== '@context' && v && typeof v === 'object') collectNodes(v, out);
  }
  return out;
}
const typesOf = (node) => [node['@type']].flat().map(String);
const hasType = (node, ...types) => typesOf(node).some((t) => types.includes(t));
const empty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
const nodesOf = (page) => page.jsonLd.flatMap((b) => ('data' in b ? collectNodes(b.data) : []));

/** NAP of src/config/site.ts in schema.org terms. */
export function napFromSite(site) {
  return {
    name: site.name,
    streetAddress: site.address.street,
    postalCode: site.address.postalCode,
    addressLocality: site.address.city,
    addressCountry: site.address.country,
    telephone: String(site.phone.href).replace(/^tel:/, ''),
    email: site.email,
  };
}

const digits = (s) => String(s ?? '').replace(/\D/g, '');
function napDiff(org, nap) {
  const address = [org.address].flat()[0] ?? {};
  const pairs = [
    ['name', org.name, nap.name],
    ['streetAddress', address.streetAddress, nap.streetAddress],
    ['postalCode', address.postalCode, nap.postalCode],
    ['addressLocality', address.addressLocality, nap.addressLocality],
    ['addressCountry', address.addressCountry?.name ?? address.addressCountry, nap.addressCountry],
  ];
  const diff = pairs.filter(([, a, b]) => String(a ?? '').trim() !== String(b ?? '').trim()).map(([k, a, b]) => `${k} „${a ?? '–'}“ statt „${b}“`);
  if (digits(org.telephone) !== digits(nap.telephone)) diff.push(`telephone „${org.telephone ?? '–'}“ statt „${nap.telephone}“`);
  if (String(org.email ?? '').replace(/^mailto:/i, '').toLowerCase() !== String(nap.email).toLowerCase()) diff.push(`email „${org.email ?? '–'}“ statt „${nap.email}“`);
  return diff;
}

// ---------------------------------------------------------------------------------------------
// Page rules

const chars = (s) => [...s].length;

/** S1: one h1, title 30–60, description 70–160, absolute self-canonical with trailing slash, og:url = canonical. */
export function checkS1(page, { path, origin }) {
  const out = [];
  const f = (code, message) => out.push(finding('S1', code, message));
  if (page.h1Count !== 1) f('S1-h1', `${page.h1Count} h1 statt genau einer`);
  for (const [key, label] of [['title', 'Titel'], ['description', 'Beschreibung']]) {
    const value = page[key];
    const [min, max] = LIMITS[key];
    if (!value) f(`S1-${key}`, `${label} fehlt`);
    else if (chars(value) < min || chars(value) > max) f(`S1-${key}`, `${label} hat ${chars(value)} Zeichen (Soll ${min}–${max}): „${value}“`);
  }
  const self = origin + path;
  if (page.canonicals.length !== 1) f('S1-canonical', page.canonicals.length ? `${page.canonicals.length} Canonicals` : 'Canonical fehlt');
  else {
    const c = page.canonicals[0];
    if (!/^https?:\/\//i.test(c)) f('S1-canonical', `Canonical nicht absolut: ${c}`);
    else if (!c.endsWith('/')) f('S1-canonical', `Canonical ohne abschließenden /: ${c}`);
    else if (c !== self) f('S1-canonical', `Canonical ${c} statt ${self}`);
  }
  if (page.ogUrl !== self) f('S1-og-url', `og:url ${page.ogUrl ?? 'fehlt'} statt ${self}`);
  return out;
}

/** S1 across pages: titles and descriptions are unique. Takes [{ path, page }]. */
export function checkDuplicates(entries) {
  const out = [];
  for (const [key, label] of [['title', 'Titel'], ['description', 'Beschreibung']]) {
    const byValue = new Map();
    for (const { path, page } of entries) if (page[key]) byValue.set(page[key], [...(byValue.get(page[key]) ?? []), path]);
    for (const [value, paths] of byValue) {
      if (paths.length < 2) continue;
      for (const path of paths) out.push({ ...finding('S1', `S1-${key}-duplicate`, `${label} auch auf ${paths.filter((p) => p !== path).join(', ')}: „${value}“`), path });
    }
  }
  return out;
}

/**
 * S2: JSON-LD parses; Product has name, image, brand; with store an Offer with price > 0,
 * priceCurrency, availability, sku and the visible price; without store no Offer. The home page
 * has WebSite (name = site name) and Organization/OnlineStore with the NAP of site.ts.
 */
export function checkS2(page, { store = false, home = false, nap }) {
  const out = [];
  const f = (code, message) => out.push(finding('S2', code, message));
  page.jsonLd.forEach((b, i) => b.error && f('S2-jsonld', `JSON-LD-Block ${i + 1} parst nicht: ${b.error}`));
  const nodes = nodesOf(page);
  for (const p of nodes.filter((n) => hasType(n, 'Product'))) {
    const missing = ['name', 'image', 'brand', ...(store ? ['sku'] : [])].filter((k) => empty(p[k]));
    if (missing.length) f('S2-product', `Product ohne ${missing.join(', ')}`);
    const offers = [p.offers].flat().filter(Boolean);
    if (!store) {
      if (offers.length) f('S2-offer', 'Product hat ein Offer, der Build ist ohne Store geprüft (mit Store: --store)');
      continue;
    }
    if (!offers.length) {
      f('S2-offer', 'Product ohne Offer');
      continue;
    }
    for (const o of offers) {
      const bad = [!(Number(o.price) > 0) && 'price > 0', empty(o.priceCurrency) && 'priceCurrency', empty(o.availability) && 'availability'].filter(Boolean);
      if (bad.length) f('S2-offer', `Offer ohne ${bad.join(', ')}`);
      else if (page.visiblePrice === null) f('S2-price', 'kein sichtbarer Preis ([data-buybox-price])');
      else if (Math.abs(Number(o.price) - page.visiblePrice) > 0.005) f('S2-price', `Preis im JSON-LD ${o.price} ≠ sichtbarer Preis ${page.visiblePrice}`);
    }
  }
  if (home) {
    const website = nodes.find((n) => hasType(n, 'WebSite'));
    if (!website) f('S2-website', 'Startseite ohne WebSite-Schema');
    else if (website.name !== nap.name) f('S2-website', `WebSite.name „${website.name}“ statt „${nap.name}“`);
    const org = nodes.find((n) => hasType(n, 'Organization', 'OnlineStore', 'OnlineBusiness', 'Store', 'LocalBusiness'));
    if (!org) f('S2-organization', 'Startseite ohne Organization/OnlineStore');
    else {
      const diff = napDiff(org, nap);
      if (diff.length) f('S2-nap', `NAP weicht von site.ts ab: ${diff.join('; ')}`);
    }
  }
  return out;
}

/** S3: no FAQPage/HowTo; Review/AggregateRating only with real data, which a person confirms. */
export function checkS3(page) {
  const out = [];
  const found = new Set();
  for (const n of nodesOf(page)) {
    for (const t of typesOf(n)) if (t === 'FAQPage' || t === 'HowTo') found.add(t);
    if (hasType(n, 'Review', 'AggregateRating') || n.review || n.aggregateRating) found.add('Review');
  }
  for (const t of ['FAQPage', 'HowTo']) if (found.has(t)) out.push(finding('S3', 'S3-forbidden', `${t}-Schema (nicht erlaubt)`));
  if (found.has('Review')) out.push(finding('S3', 'S3-review', 'Review/AggregateRating: nur mit echten Bewertungen zulässig (UWG § 5b), manuell bestätigen'));
  return out;
}

/** S8: alt on every img (decorative alt=""), og:image absolute with 1200×630, favicon set PNG 48/96/192 + apple-touch-icon. */
export function checkS8(page) {
  const out = [];
  const f = (code, message) => out.push(finding('S8', code, message));
  const noAlt = page.images.filter((a) => !('alt' in a));
  if (noAlt.length) f('S8-alt', `${noAlt.length} Bild(er) ohne alt: ${noAlt.slice(0, 3).map((a) => a.src ?? '?').join(', ')}`);
  if (!page.ogImage) f('S8-og-image', 'og:image fehlt');
  else if (!/^https?:\/\//i.test(page.ogImage)) f('S8-og-image', `og:image nicht absolut: ${page.ogImage}`);
  else if (Number(page.ogImageWidth) !== OG_IMAGE.width || Number(page.ogImageHeight) !== OG_IMAGE.height)
    f('S8-og-image', `og:image:width/height ${page.ogImageWidth ?? '–'}×${page.ogImageHeight ?? '–'} statt ${OG_IMAGE.width}×${OG_IMAGE.height}`);
  const png = page.icons
    .filter((a) => relTokens(a).includes('icon') && ((a.type ?? '').toLowerCase() === 'image/png' || /\.png(?:$|\?)/i.test(a.href ?? '')))
    .flatMap((a) => (a.sizes ?? '').toLowerCase().split(/\s+/));
  const missing = FAVICON_SIZES.filter((s) => !png.includes(`${s}x${s}`)).map((s) => `PNG ${s}×${s}`);
  if (!page.icons.some((a) => relTokens(a).includes('apple-touch-icon'))) missing.push('apple-touch-icon');
  if (missing.length) f('S8-favicon', `Favicon-Satz unvollständig, fehlt: ${missing.join(', ')}`);
  return out;
}

/** S10: no word with a health reference in the page text (title, description, body, alt texts). */
export function checkS10(page, { path }) {
  if (S10_EXEMPT.test(path)) return [];
  let text = page.text;
  for (const allow of HEALTH_ALLOW) text = text.replace(allow, ' ');
  const hits = [...text.matchAll(HEALTH_TERMS)].map((m) => `„…${text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).trim()}…“`);
  return hits.length ? [finding('S10', 'S10-health', `${hits.length} Treffer der Wortliste: ${hits.slice(0, 4).join(' ')}`)] : [];
}

/** All page rules for one page. ctx: { path, origin, store, nap, indexable }. S1 only for indexable pages. */
export function checkPage(page, ctx) {
  const home = ctx.path === '/';
  return [
    ...(ctx.indexable === false ? [] : checkS1(page, ctx)),
    ...checkS2(page, { ...ctx, home }),
    ...checkS3(page),
    ...checkS8(page),
    ...checkS10(page, ctx),
  ].map((f) => ({ ...f, path: ctx.path }));
}

// ---------------------------------------------------------------------------------------------
// Site rules: launch switch (S6), robots.txt and sitemap (S5)

/** Launch switch: on if at least one page answering 200 is indexable. Takes [{ path, status, noindex }]. */
export const detectLaunch = (pages) => pages.some((p) => p.status === 200 && !p.noindex);

export function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'sitemap') sitemaps.push(value);
    else if (key === 'user-agent') {
      if (!lastWasAgent || !current) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
    } else if ((key === 'allow' || key === 'disallow') && current) current.rules.push({ type: key, path: value });
    lastWasAgent = key === 'user-agent';
  }
  return { groups, sitemaps };
}

/**
 * robots.txt for both switch positions. Launch off (S6): `Disallow: /` for all agents.
 * Launch on: not everything blocked (S6), Sitemap line on the origin, /api/ and /anfrage/ blocked (S5).
 */
export function checkRobots(text, { launch, origin }) {
  const out = [];
  const { groups, sitemaps } = parseRobots(text ?? '');
  const rules = groups.find((g) => g.agents.includes('*'))?.rules ?? [];
  const blocks = (p) => rules.some((r) => r.type === 'disallow' && r.path === p);
  if (text == null) return [finding(launch ? 'S5' : 'S6', launch ? 'S5-robots' : 'S6-robots', 'robots.txt fehlt')];
  if (!launch) {
    if (!blocks('/')) out.push(finding('S6', 'S6-robots', 'Launch-Schalter aus, aber robots.txt sperrt nicht alles (Disallow: /)'));
    return out;
  }
  if (blocks('/')) out.push(finding('S6', 'S6-robots', 'Seiten sind indexierbar, robots.txt sperrt aber alles (Disallow: /)'));
  if (!sitemaps.some((s) => s.startsWith(origin + '/'))) out.push(finding('S5', 'S5-robots', `kein Sitemap-Verweis auf ${origin}/`));
  for (const p of ['/api/', '/anfrage/']) if (!blocks(p)) out.push(finding('S5', 'S5-robots', `robots.txt sperrt ${p} nicht`));
  return out;
}

/** Sitemap XML (index or urlset): { sitemaps: [loc], urls: [{ loc, lastmod }] }. */
export function parseSitemap(xml) {
  const text = String(xml ?? '');
  const value = (block, tag) => {
    const m = new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`, 'i').exec(block);
    return m ? decodeEntities(m[1]) : null;
  };
  return {
    sitemaps: [...text.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/gi)].map((m) => value(m[1], 'loc')).filter(Boolean),
    urls: [...text.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map((m) => ({ loc: value(m[1], 'loc'), lastmod: value(m[1], 'lastmod') })).filter((u) => u.loc),
  };
}

/**
 * S5: the sitemap lists exactly the indexable pages, every URL on the origin with a trailing slash,
 * lastmod only on pages with a documented date (and then a valid date). With launch off only the
 * per-URL rules apply (the caller reports them as a preview).
 * @param {{ loc: string, lastmod: string | null }[]} urls
 * @param {{ origin: string, launch: boolean, indexable: string[] }} ctx indexable: paths of indexable pages
 */
export function checkSitemap(urls, { origin, launch, indexable = [] }) {
  const out = [];
  const f = (code, message, path) => out.push({ ...finding('S5', code, message), ...(path && { path }) });
  if (!urls.length) return [finding('S5', 'S5-sitemap', 'Sitemap fehlt oder ist leer')];
  const listed = new Set();
  for (const { loc, lastmod } of urls) {
    if (!loc.startsWith(origin + '/')) {
      f('S5-sitemap', `URL nicht auf ${origin}: ${loc}`);
      continue;
    }
    const path = loc.slice(origin.length);
    listed.add(path);
    if (!path.endsWith('/')) f('S5-sitemap', `URL ohne abschließenden /: ${loc}`, path);
    if (lastmod !== null) {
      if (Number.isNaN(Date.parse(lastmod))) f('S5-lastmod', `lastmod ungültig: ${lastmod}`, path);
      else if (!LASTMOD_PATHS.test(path)) f('S5-lastmod', `lastmod ${lastmod} ohne belegtes Datum (nur Produkt- und Ratgeberseiten)`, path);
    }
  }
  if (launch) {
    const wanted = new Set(indexable);
    for (const path of listed) if (!wanted.has(path)) f('S5-sitemap', 'in der Sitemap, aber nicht indexierbar oder nicht erreichbar', path);
    for (const path of wanted) if (!listed.has(path)) f('S5-sitemap', 'indexierbar, fehlt aber in der Sitemap', path);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// S7: storage and requests after loading a page without interaction (data from headless Chrome)

/** state: { cookie: document.cookie, cookies: [names from CDP], localStorage: [keys], sessionStorage: [keys] } */
export function checkStorage(state) {
  const out = [];
  const cookies = [...new Set([...(state.cookie ? state.cookie.split(';').map((c) => c.split('=')[0].trim()) : []), ...(state.cookies ?? [])])].filter(Boolean);
  if (cookies.length) out.push(finding('S7', 'S7-cookie', `Cookies ohne Interaktion: ${cookies.join(', ')}`));
  if (state.localStorage?.length) out.push(finding('S7', 'S7-local-storage', `localStorage ohne Interaktion: ${state.localStorage.join(', ')}`));
  if (state.sessionStorage?.length) out.push(finding('S7', 'S7-session-storage', `sessionStorage ohne Interaktion: ${state.sessionStorage.join(', ')}`));
  return out;
}

/** Requests only to the page's own host(s), the store domain and cdn.shopify.com. self: hosts counted as own. */
export function checkRequests(urls, { self = [], storeDomain = null } = {}) {
  const allowed = new Set([...self, storeDomain, SHOPIFY_CDN].filter(Boolean).map((h) => h.toLowerCase()));
  const foreign = new Set();
  for (const u of urls) {
    let url;
    try {
      url = new URL(u);
    } catch {
      continue;
    }
    if (!/^(?:https?|wss?):$/.test(url.protocol)) continue; // data:, blob:, about:
    if (!allowed.has(url.host.toLowerCase())) foreign.add(url.host);
  }
  return foreign.size ? [finding('S7', 'S7-third-party', `Anfragen an fremde Hosts: ${[...foreign].join(', ')}`)] : [];
}

// ---------------------------------------------------------------------------------------------
// S4: old URLs (tools/seo/legacy-urls.txt) answer 301, one hop, target 200

/** Lines `<old path>[ <target>]`, `#` starts a comment. Target `404` marks a deliberately missing page. */
export function parseLegacyList(text) {
  const entries = [];
  const errors = [];
  String(text).split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/(^|\s)#.*$/, '').trim();
    if (!line) return;
    const [path, target = null, ...rest] = line.split(/\s+/);
    if (!path.startsWith('/') || rest.length || (target !== null && target !== '404' && !target.startsWith('/'))) errors.push(`Zeile ${i + 1}: ${raw.trim()}`);
    else entries.push({ path, target, line: i + 1 });
  });
  return { entries, errors };
}

/**
 * Requests one old URL and its redirect target (never following further) and returns
 * { path, target, status, location, finalStatus, finding|null }.
 * Locations on the expected origin are checked against the base URL; any other host is not requested.
 */
export async function checkRedirect(base, entry, { origin = null, fetchImpl = fetch } = {}) {
  const result = { path: entry.path, target: entry.target, status: null, location: null, finalStatus: null, finding: null };
  const fail = (code, message, level = 'error') => ({ ...result, finding: { ...finding('S4', code, message, level), path: entry.path } });
  const get = async (url) => {
    const res = await fetchImpl(url, { redirect: 'manual' });
    await res.body?.cancel().catch(() => {});
    return res;
  };
  const baseUrl = new URL(base);
  const first = await get(new URL(entry.path, baseUrl));
  result.status = first.status;
  result.location = first.headers.get('location');
  if (entry.target === '404') {
    const message = first.status === 404 ? 'absichtlich 404 (Abgleich Punkt 3)' : `als absichtlich 404 geführt, antwortet aber ${first.status}${result.location ? ' → ' + result.location : ''}: Liste prüfen`;
    return fail('S4-deliberate-404', message, 'hint');
  }
  if (first.status !== 301) return fail('S4-status', `${first.status} statt 301`);
  if (!result.location) return fail('S4-status', '301 ohne Location');
  let next = new URL(result.location, new URL(entry.path, baseUrl));
  if (origin && next.origin === new URL(origin).origin) next = new URL(next.pathname + next.search, baseUrl);
  else if (next.origin !== baseUrl.origin) return fail('S4-offsite', `Ziel auf fremdem Host: ${result.location}`);
  if (entry.target) {
    const want = new URL(entry.target, baseUrl);
    const queryMatters = entry.target.includes('?');
    if (next.pathname !== want.pathname || (queryMatters && next.search !== want.search)) return fail('S4-target', `Ziel ${next.pathname}${next.search} statt ${entry.target}`);
  }
  const second = await get(next);
  result.finalStatus = second.status;
  if (second.status >= 300 && second.status < 400) return fail('S4-hops', `mehr als ein Sprung: ${next.pathname}${next.search} → ${second.status} ${second.headers.get('location') ?? ''}`);
  if (second.status !== 200) return fail('S4-final', `Ziel ${next.pathname}${next.search} antwortet ${second.status}`);
  return result;
}

// ---------------------------------------------------------------------------------------------
// Image size (og:image), PNG / JPEG / GIF / WebP headers

/** { type, width, height } from the first bytes of an image, or null. */
export function imageSize(bytes) {
  const b = Buffer.from(bytes);
  if (b.length >= 24 && b.readUInt32BE(0) === 0x89504e47) return { type: 'png', width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.length >= 10 && b.toString('latin1', 0, 3) === 'GIF') return { type: 'gif', width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      if (marker === 0xff) {
        i++;
        continue;
      }
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
        i += 2;
        continue;
      }
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc)
        return { type: 'jpeg', width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
      i += 2 + b.readUInt16BE(i + 2);
    }
    return null;
  }
  if (b.length >= 30 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') {
    const chunk = b.toString('latin1', 12, 16);
    if (chunk === 'VP8X') return { type: 'webp', width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    if (chunk === 'VP8 ') return { type: 'webp', width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return { type: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}
