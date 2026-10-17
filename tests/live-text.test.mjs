// Comparison behind tools/qa/live-text.mjs (M1): outline lines against built HTML.
// Example HTML is inline; nothing here reads the outline or a build.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../tools/live/compare.mjs';
import { PAGES, EXCEPTIONS, STORE_ONLY } from '../tools/live/rules.mjs';
import { redirectTarget } from '../src/config/redirects.mjs';

const page = (main) => `<!doctype html><html><head><title>Kopf</title><script>var x = "Safran";</script></head>
  <body><a class="skip-link" href="#inhalt">Direkt zum Inhalt</a><main id="inhalt">${main}</main></body></html>`;

test('normalize: entities, line breaks, no-break spaces and link arrows', () => {
  assert.equal(L.normalize('The Art <br> of&nbsp;Saffron.'), 'The Art of Saffron.');
  assert.equal(L.normalize('Safran entdecken ↗'), 'Safran entdecken');
  assert.equal(L.normalize('Mehr&#8203; erfahren →'), 'Mehr erfahren');
  assert.equal(L.normalize('Versand &amp; Lieferung &ndash; 4,99&#x20AC;'), 'Versand & Lieferung – 4,99€');
});

test('liveWording applies Grade 1 (D3) and the V1 price format', () => {
  assert.equal(L.liveWording('Herat Negin Safran – 1 g (Grade A)'), 'Herat Negin Safran – 1 g (Grade 1)');
  assert.equal(L.liveWording('HERAT NEGIN · GRADE A'), 'HERAT NEGIN · GRADE 1');
  assert.equal(L.liveWording('€12,90inkl. MwSt.'), '12,90 €inkl. MwSt.');
  assert.equal(L.liveWording('Gradea bleibt'), 'Gradea bleibt');
});

test('parseOutline splits pages and drops blank lines', () => {
  const pages = L.parseOutline('\n# index\n\nTitle: X\n### Hallo\n\n# pages_faq\n#### Frage?\nAntwort.\n');
  assert.deepEqual([...pages.keys()], ['index', 'pages_faq']);
  assert.deepEqual(pages.get('pages_faq'), ['#### Frage?', 'Antwort.']);
});

test('classify: containers, meta, images and fields are not compared', () => {
  assert.equal(L.classify('<!-- div.rs-hero -->').kind, 'container');
  assert.equal(L.classify('Description: Text').kind, 'meta');
  assert.equal(L.classify('![Alt](//cdn/x.png)').kind, 'image');
  assert.equal(L.classify('[Feld email: E-Mail-Adresse]').kind, 'field');
  assert.deepEqual(L.classify('[Knopf: Senden]'), { kind: 'button', text: 'Senden' });
  assert.deepEqual(L.classify('[Mehr erfahren ↗](/pages/b2b-zusammenarbeit)'), { kind: 'link', text: 'Mehr erfahren', href: '/pages/b2b-zusammenarbeit' });
  assert.deepEqual(L.classify('#### Reine Zutaten. <br> Echter Geschmack.'), { kind: 'text', text: 'Reine Zutaten. Echter Geschmack.' });
});

test('pageText leaves out head, scripts and inline SVG', () => {
  const text = L.pageText(page('<h1>Safran<svg><title>Pfeil</title></svg></h1>'));
  assert.equal(text, 'Direkt zum Inhalt Safran');
});

test('findText: word for word, then case, then spacing', () => {
  assert.equal(L.findText('Kleine Menge.', 'Die Kleine Menge. Große'), 'ok');
  assert.equal(L.findText('DIE KOLLEKTION', 'Die Kollektion'), 'case');
  assert.equal(L.findText('HERATAfghanistan', 'HERAT Afghanistan'), 'spacing');
  assert.equal(L.findText('Grade A', 'Grade 1'), null);
});

test('link targets: old paths through the 301 table, sign-in, anchors', () => {
  assert.equal(L.expectedTarget('/pages/b2b-zusammenarbeit', redirectTarget), '/b2b/');
  assert.equal(L.expectedTarget('/products/safran-herat-negin-0-5g', redirectTarget), '/produkte/safran-herat-negin-0-5g/');
  assert.equal(L.expectedTarget('/', redirectTarget), '/');
  assert.equal(L.expectedTarget('#MainContent', redirectTarget), '#');
  assert.equal(L.expectedTarget('https://royalspices.de/customer_authentication/redirect?locale=de', redirectTarget), 'account');
  assert.equal(L.actualTarget('https://shopify.com/96956285315/account'), 'account');
  assert.equal(L.actualTarget('/kontakt/?anliegen=handel#anfrage'), '/kontakt/');
});

test('comparePage: found, missing, not a link, other destination', () => {
  const html = page(`<p>Unsere Wurzeln.<br>Dein Genuss.</p>
    <a href="/b2b/">B2B kennenlernen <svg aria-hidden="true"></svg></a>
    <a href="/kontakt/">Catering entdecken</a> <span>Versandseite</span>
    <a href="https://shopify.com/1/account">Einloggen</a>`);
  const lines = [
    '<!-- div.rs-origin -->',
    '#### Unsere Wurzeln. <br> Dein Genuss.',
    '[B2B kennenlernen ↗](/pages/b2b-zusammenarbeit)',
    '[Catering entdecken](/pages/catering)',
    '[Versandseite](/pages/versand-lieferung)',
    '[Einloggen](https://royalspices.de/customer_authentication/redirect)',
    'Ein Satz, den es nicht gibt.',
  ];
  const got = L.comparePage(lines, html, { redirectTarget }).map((r) => [r.index, r.status]);
  assert.deepEqual(got, [[1, 'ok'], [2, 'ok'], [3, 'target'], [4, 'no-link'], [5, 'ok'], [6, 'missing']]);
});

test('assignRows follows the anchors in order and reports a missing one', () => {
  const lines = ['skip', 'nav', 'nav', '<!-- section.a -->', 'text', '<!-- footer.b -->', 'foot'];
  assert.deepEqual(L.assignRows(lines, [['K1', 'skip'], ['S1', '<!-- section.'], ['F1', '<!-- footer.']]), ['K1', 'K1', 'K1', 'S1', 'S1', 'F1', 'F1']);
  assert.equal(L.assignRows(lines, [['K1', 'skip'], ['S1', '<!-- nirgends']]), null);
});

test('rules: every exception names its page and a reason', () => {
  const pages = new Set(PAGES.map((p) => p.page));
  for (const e of [...EXCEPTIONS, ...STORE_ONLY]) {
    assert.ok(pages.has(e.page), `unknown page ${e.page}`);
    assert.ok(typeof e.match === 'string' || e.match instanceof RegExp);
    assert.ok(e.reason && e.reason.length > 10, `reason for ${e.match}`);
  }
  assert.ok(L.exceptionFor(EXCEPTIONS, 'index', 'Suchen'));
  assert.equal(L.exceptionFor(EXCEPTIONS, 'pages_faq', 'Suchen'), undefined);
});
