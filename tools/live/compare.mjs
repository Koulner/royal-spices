// M1 (docs/UEBERGABE-SHOPIFY.md): the text of the former Shopify storefront, word for word,
// against the built V1 pages. Pure functions; the runner is tools/qa/live-text.mjs, the page
// mapping and the explained deviations are in tools/live/rules.mjs.
// The live side is .raw/live-20261015/outline.md: one block per page ("# <name>"), one line per
// text node, "[text](href)" for links, "![alt](src)" for images, "<!-- … -->" for theme
// containers, "[Feld …]" and "[Knopf: …]" for form controls.

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '', ndash: '–', mdash: '—',
  hellip: '…', euro: '€', middot: '·', deg: '°', copy: '©', bdquo: '„', ldquo: '“', rdquo: '”',
  sbquo: '‚', lsquo: '‘', rsquo: '’', laquo: '«', raquo: '»', times: '×', auml: 'ä', ouml: 'ö',
  uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß',
};

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] !== '#') return ENTITIES[e] ?? m;
    return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  });
}

/** Entities decoded, line breaks and no-break spaces as plain spaces, the link arrows "↗" and "→"
 *  dropped (V1 draws them as an icon, components/Arrow.astro). */
export function normalize(text) {
  return decodeEntities(text)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/[   ]/g, ' ')
    .replace(/[­​]/g, '')
    .replace(/[↗→]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The live wording as V1 has to show it, after the decisions that change it on purpose. */
export function liveWording(text) {
  return (
    normalize(text)
      // D3: the label says Grade 1; the Shopify title "Grade A" is the client's to correct
      .replace(/\bGrade A\b/g, 'Grade 1')
      .replace(/\bGRADE A\b/g, 'GRADE 1')
      // the theme writes "€12,90" as well as "8,90 €"; V1 formats every price as "12,90 €"
      .replace(/€\s?(\d+,\d{2})/g, '$1 €')
  );
}

/** outline.md → Map(page name → lines), blank lines dropped. */
export function parseOutline(md) {
  const pages = new Map();
  let lines = null;
  for (const raw of md.split(/\r?\n/)) {
    const page = /^# (\S+)\s*$/.exec(raw);
    if (page) {
      lines = [];
      pages.set(page[1], lines);
    } else if (lines && raw.trim()) {
      lines.push(raw.trim());
    }
  }
  return pages;
}

/**
 * What a live line is. Containers, images, form fields and the meta lines are not compared:
 * V1 has its own markup and pictures (O5), its own forms, and titles and descriptions of its
 * own (SEO, E5).
 */
export function classify(line) {
  if (line.startsWith('<!--')) return { kind: 'container' };
  if (/^(Title|Description):/.test(line)) return { kind: 'meta' };
  if (/^!\[.*\]\(.*\)$/.test(line)) return { kind: 'image' };
  if (/^\[Feld [^\]]*\]$/.test(line)) return { kind: 'field' };
  const button = /^\[Knopf: (.*)\]$/.exec(line);
  if (button) return { kind: 'button', text: liveWording(button[1]) };
  const link = /^\[(.*)\]\(([^)]*)\)$/.exec(line);
  if (link) return { kind: 'link', text: liveWording(link[1]), href: link[2] };
  return { kind: 'text', text: liveWording(line.replace(/^#+\s+/, '')) };
}

export const COMPARED = new Set(['text', 'link', 'button']);

function strip(html) {
  return html
    .replace(/<head\b[\s\S]*?<\/head>/i, ' ')
    .replace(/<(script|style|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

/** Visible text of a built page (head, scripts, styles and inline SVG removed). */
export function pageText(html) {
  return normalize(strip(html).replace(/<[^>]+>/g, ' '));
}

/** Every link of a built page: { href, text } with the aria-label standing in for empty text. */
export function pageLinks(html) {
  const links = [];
  for (const m of strip(html).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attr = (name) => new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(m[1]);
    const value = (a) => (a ? decodeEntities(a[1] ?? a[2] ?? a[3]) : '');
    const text = normalize(m[2].replace(/<[^>]+>/g, ' ')) || normalize(value(attr('aria-label')));
    links.push({ href: value(attr('href')), text });
  }
  return links;
}

const squash = (s) => s.replace(/\s+/g, '').toLowerCase();

/** Where the needle stands in the haystack: 'ok' word for word, 'case' only upper/lower case
 *  differs (CSS text-transform), 'spacing' only white space differs (markup), or null. */
export function findText(needle, haystack) {
  if (haystack.includes(needle)) return 'ok';
  if (haystack.toLowerCase().includes(needle.toLowerCase())) return 'case';
  if (squash(haystack).includes(squash(needle))) return 'spacing';
  return null;
}

function sameText(a, b) {
  if (a === b) return 'ok';
  if (a.toLowerCase() === b.toLowerCase()) return 'case';
  if (squash(a) === squash(b)) return 'spacing';
  return null;
}

const ACCOUNT_LIVE = /^(https?:)?\/\/(www\.)?royalspices\.de\/customer_authentication\//i;
const ACCOUNT_V1 = /^https:\/\/shopify\.com\/\d+\/account/;

/** The V1 target a live link must have: old paths through the 301 table, the Shopify
 *  sign-in as "account", any in-page anchor as "#". */
export function expectedTarget(href, redirectTarget) {
  if (/^(tel|mailto):/i.test(href)) return href.toLowerCase();
  if (href.startsWith('#')) return '#';
  if (ACCOUNT_LIVE.test(href)) return 'account';
  if (href.startsWith('/') && !href.startsWith('//')) {
    const path = href.split(/[?#]/)[0];
    return redirectTarget(path) ?? (path === '/' ? '/' : path.replace(/\/?$/, '/'));
  }
  return href;
}

/** The same reduction for a V1 link: own paths without query and fragment. */
export function actualTarget(href) {
  if (/^(tel|mailto):/i.test(href)) return href.toLowerCase();
  if (href.startsWith('#')) return '#';
  if (ACCOUNT_V1.test(href)) return 'account';
  if (href.startsWith('/') && !href.startsWith('//')) return href.split(/[?#]/)[0];
  return href;
}

/**
 * One result per compared live line: { index, line, kind, text, status, detail }.
 * status: 'ok' | 'case' | 'spacing' (found), 'missing' (text not on the page),
 * 'no-link' (text there, but not as a link), 'target' (link text there, other destination).
 */
export function comparePage(lines, html, { redirectTarget }) {
  const text = pageText(html);
  const links = pageLinks(html);
  const results = [];
  for (const [index, line] of lines.entries()) {
    const c = classify(line);
    if (!COMPARED.has(c.kind)) continue;
    if (!c.text) continue;
    if (c.kind !== 'link') {
      const found = findText(c.text, text);
      results.push({ index, line, kind: c.kind, text: c.text, status: found ?? 'missing' });
      continue;
    }
    const want = expectedTarget(c.href, redirectTarget);
    const named = links.map((l) => ({ ...l, match: sameText(c.text, l.text) })).filter((l) => l.match);
    const hit = named.find((l) => actualTarget(l.href) === want);
    if (hit) {
      results.push({ index, line, kind: 'link', text: c.text, status: hit.match });
    } else if (named.length) {
      results.push({ index, line, kind: 'link', text: c.text, status: 'target', detail: `erwartet ${want}, gefunden ${[...new Set(named.map((l) => l.href))].join(', ')}` });
    } else {
      const found = findText(c.text, text);
      results.push({ index, line, kind: 'link', text: c.text, status: found ? 'no-link' : 'missing', detail: `erwartet ${want}` });
    }
  }
  return results;
}

/** Row of the comparison list for every line: anchors are [row, line prefix] in page order;
 *  lines before the first anchor belong to its row. Returns null if an anchor is not found. */
export function assignRows(lines, anchors) {
  let k = 0;
  let row = anchors[0][0];
  const rows = lines.map((line) => {
    if (k < anchors.length && line.startsWith(anchors[k][1])) row = anchors[k++][0];
    return row;
  });
  return k === anchors.length ? rows : null;
}

export const FOUND = new Set(['ok', 'case', 'spacing']);

/** The explanation for a line that is not found, if there is one. */
export function exceptionFor(exceptions, page, line) {
  return exceptions.find((e) => e.page === page && (e.match instanceof RegExp ? e.match.test(line) : e.match === line));
}
