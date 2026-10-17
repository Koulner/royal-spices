// M1: the text of the former storefront (royalspices.de, 15.10.2026) word for word against the build.
//   node tools/qa/live-text.mjs [dist/client] [--outline .raw/live-20261015/outline.md] [--ohne-store] [--all]
// One line per row of the comparison list (docs/LIVE-INVENTAR.md), then every live line that is
// missing, not a link, links elsewhere, or is found only up to case or spacing (--all also lists
// the explained deviations). Exit code 1 if a line is missing or links elsewhere and no exception
// in tools/live/rules.mjs explains it, if an anchor of the rules is not found, or a page is missing.
// M1 is measured on the build with the store (prices and product text come from Shopify);
// --ohne-store also accepts the lines that only a build with the store can show.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseOutline, comparePage, assignRows, exceptionFor } from '../live/compare.mjs';
import { PAGES, NOT_TEXT, EXCEPTIONS, STORE_ONLY } from '../live/rules.mjs';
import { redirectTarget } from '../../src/config/redirects.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const dist = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--outline') ?? 'dist/client';
const outlinePath = option('--outline', '.raw/live-20261015/outline.md');
const all = args.includes('--all');
const exceptions = args.includes('--ohne-store') ? [...EXCEPTIONS, ...STORE_ONLY] : EXCEPTIONS;

const LABEL = { ok: 'wörtlich', case: 'Schreibweise', spacing: 'Leerraum', missing: 'fehlt', 'no-link': 'kein Link', target: 'Linkziel', exception: 'Ausnahme' };
const outline = parseOutline(await readFile(outlinePath, 'utf8'));
const rows = new Map();
const details = [];
const used = new Set();
let errors = 0;
const fail = (message) => {
  errors++;
  console.log(`FEHLER ${message}`);
};

for (const spec of PAGES) {
  const lines = outline.get(spec.page);
  if (!lines) {
    fail(`${spec.page}: nicht in ${outlinePath}`);
    continue;
  }
  let html;
  try {
    html = await readFile(join(dist, spec.v1), 'utf8');
  } catch {
    fail(`${spec.page}: ${join(dist, spec.v1)} fehlt`);
    continue;
  }
  const lineRows = spec.anchors ? assignRows(lines, spec.anchors) : lines.map(() => spec.row);
  if (!lineRows) {
    fail(`${spec.page}: ein Anker aus tools/live/rules.mjs fehlt im Outline`);
    continue;
  }
  for (const r of comparePage(lines, html, { redirectTarget })) {
    const row = lineRows[r.index];
    if (!rows.has(row)) rows.set(row, { ok: 0, case: 0, spacing: 0, exception: 0, missing: 0, 'no-link': 0, target: 0 });
    const exception = r.status === 'ok' ? null : exceptionFor(exceptions, spec.page, r.line);
    if (r.status === 'ok') {
      rows.get(row).ok++;
    } else if (exception) {
      used.add(exception);
      rows.get(row).exception++;
      if (all) details.push({ row, ...r, status: 'exception', detail: `${LABEL[r.status]}; ${exception.reason}` });
    } else {
      rows.get(row)[r.status]++;
      details.push({ row, ...r });
    }
  }
}

const order = (id) => ['K', 'S', 'F', 'P', 'Q', 'W'].indexOf(id[0]) * 100 + Number(id.slice(1));
console.log('Zeile  Live-Zeilen  ' + ['ok', 'case', 'spacing', 'exception', 'missing', 'no-link', 'target'].map((k) => LABEL[k]).join(' / '));
for (const [row, c] of [...rows].sort((a, b) => order(a[0]) - order(b[0]))) {
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  const open = c.missing + c['no-link'] + c.target;
  if (open) errors += open;
  console.log(`${open ? '!!' : 'ok'} ${row.padEnd(4)} ${String(total).padStart(4)}        ${[c.ok, c.case, c.spacing, c.exception, c.missing, c['no-link'], c.target].join(' / ')}`);
}
for (const [row, reason] of Object.entries(NOT_TEXT)) console.log(`-- ${row.padEnd(4)}    nicht als Text verglichen: ${reason}`);

if (details.length) console.log('');
for (const d of details.sort((a, b) => order(a.row) - order(b.row))) {
  console.log(`${LABEL[d.status].padEnd(12)} ${d.row.padEnd(4)} ${d.line}${d.detail ? `  [${d.detail}]` : ''}`);
}
// an exception no line needs any more is stale: the page now shows the live text, or the outline changed
for (const e of exceptions) if (!used.has(e)) console.log(`Hinweis      Ausnahme nicht gebraucht: ${e.page} ${e.match}`);

console.log(errors ? `\n${errors} offene Abweichung(en)` : '\nkeine offenen Abweichungen');
process.exit(errors ? 1 : 0);
