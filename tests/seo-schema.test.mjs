// Schema.org builders (src/lib/seo/schema.ts): required fields per builder, criteria A1/A2 of S0a
// (docs/UEBERGABE-SEO.md). Prices and SKUs here are made up; the application contains none.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as schema from '../src/lib/seo/schema.ts';
import { site } from '../src/config/site.ts';

const {
  SCHEMA_CONTEXT,
  pageUrl,
  serializeJsonLd,
  napFromSite,
  buildOrganization,
  buildWebSite,
  buildBreadcrumbList,
  buildProduct,
  buildArticle,
  buildRecipe,
  buildService,
} = schema;

const origin = 'https://example.test';
const author = { name: 'Autor Beispiel', path: '/ueber-uns/' };

/** Every '@type' and every key anywhere in a JSON-LD value. */
function walk(value, types = [], keys = []) {
  if (Array.isArray(value)) value.forEach((v) => walk(v, types, keys));
  else if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      keys.push(key);
      if (key === '@type') types.push(v);
      walk(v, types, keys);
    }
  }
  return { types, keys };
}

const product = (overrides = {}) =>
  buildProduct({
    origin,
    path: '/produkte/beispiel-handle/',
    name: 'Safranfäden Beispiel',
    description: 'Beschreibung',
    images: ['https://cdn.shopify.com/s/files/beispiel.jpg'],
    sku: 'RS-TEST-1',
    offer: { amount: '9.5', currencyCode: 'EUR', available: true },
    ...overrides,
  });

const article = (overrides = {}) =>
  buildArticle({ origin, path: '/ratgeber/beispiel', headline: 'Überschrift', description: 'Kurzbeschreibung', author, datePublished: '2026-10-01', ...overrides });

const recipe = (overrides = {}) =>
  buildRecipe({
    origin,
    path: '/ratgeber/rezept-beispiel/',
    name: 'Safranreis',
    description: 'Ein Beispielrezept',
    images: ['/img/rezept.jpg'],
    author,
    datePublished: '2026-10-01',
    ingredients: ['300 g Reis', '0,1 g Safranfäden'],
    steps: ['Safran einweichen.', 'Reis garen.'],
    prepTime: 'PT10M',
    cookTime: 'PT20M',
    ...overrides,
  });

test('NAP adapter: name, address, e-mail and phone are those of site.ts', () => {
  const nap = napFromSite();
  assert.equal(nap.name, site.name);
  assert.equal(nap.email, site.email);
  assert.equal(nap.telephone, site.phone.href.replace(/^tel:/, ''));
  assert.match(nap.telephone, /^\+49\d+$/);
  assert.deepEqual(nap.address, {
    '@type': 'PostalAddress',
    streetAddress: site.address.street,
    postalCode: site.address.postalCode,
    addressLocality: site.address.city,
    addressCountry: site.address.country,
  });
});

test('schema.ts repeats no value of site.ts (single source)', async () => {
  const source = await readFile(new URL('../src/lib/seo/schema.ts', import.meta.url), 'utf8');
  const digits = site.phone.href.replace(/\D/g, '');
  for (const value of [site.name, site.email, site.address.street, site.address.postalCode, site.phone.display, digits, site.owner]) {
    assert.ok(!source.includes(value), `schema.ts must not contain "${value}"`);
  }
  assert.doesNotMatch(source, /\d+[.,]\d{2}\s*€|€\s*\d/, 'no prices in schema.ts');
});

test('Organization/OnlineStore: NAP from site.ts, url, contact point, optional fields only when given', () => {
  const org = buildOrganization({ origin });
  assert.equal(org['@context'], SCHEMA_CONTEXT);
  assert.equal(org['@type'], 'OnlineStore');
  assert.equal(org['@id'], 'https://example.test/#organization');
  assert.equal(org.url, 'https://example.test/');
  const nap = napFromSite();
  for (const key of ['name', 'email', 'telephone', 'address']) assert.deepEqual(org[key], nap[key]);
  assert.equal(org.contactPoint['@type'], 'ContactPoint');
  assert.equal(org.contactPoint.telephone, nap.telephone);
  assert.equal(org.contactPoint.email, site.email);
  for (const key of ['logo', 'sameAs', 'hasShippingService', 'hasMerchantReturnPolicy']) assert.equal(key in org, false, key);
  assert.equal(buildOrganization({ origin, type: 'Organization' })['@type'], 'Organization');
});

test('Organization: logo absolute, shipping tiers and return policy on organization level', () => {
  const org = buildOrganization({
    origin,
    logo: '/logo.png',
    sameAs: ['https://www.youtube.com/@beispiel'],
    shipping: [
      { country: 'DE', rate: 4.5, maxOrderValue: 49.99 },
      { country: 'DE', rate: 0, minOrderValue: 50 },
    ],
    returnPolicy: { country: 'DE', category: 'finite', days: 14, method: 'mail', fees: 'customer', path: '/widerruf' },
  });
  assert.equal(org.logo, 'https://example.test/logo.png');
  assert.deepEqual(org.sameAs, ['https://www.youtube.com/@beispiel']);
  const [paid, free] = org.hasShippingService.shippingConditions;
  assert.equal(org.hasShippingService['@type'], 'ShippingService');
  assert.deepEqual(free.orderValue, { '@type': 'MonetaryAmount', minValue: 50, currency: 'EUR' });
  assert.deepEqual(free.shippingRate, { '@type': 'MonetaryAmount', value: 0, currency: 'EUR' });
  assert.deepEqual(free.shippingDestination, { '@type': 'DefinedRegion', addressCountry: 'DE' });
  assert.equal(paid.orderValue.maxValue, 49.99);
  assert.deepEqual(org.hasMerchantReturnPolicy, {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'DE',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 14,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
    url: 'https://example.test/widerruf/',
  });
  assert.throws(() => buildOrganization({ origin, returnPolicy: { country: 'DE', category: 'finite' } }), /days/);
  assert.throws(() => buildOrganization({ origin, shipping: [{ country: 'DE', rate: -1 }] }), /rate/);
});

test('WebSite: name "Royal Spices" from site.ts, home URL, no search action', () => {
  const ws = buildWebSite({ origin: new URL('https://example.test/') });
  assert.equal(ws['@context'], SCHEMA_CONTEXT);
  assert.equal(ws['@type'], 'WebSite');
  assert.equal(ws.name, 'Royal Spices');
  assert.equal(ws.name, site.name);
  assert.equal(ws.url, 'https://example.test/');
  assert.equal(ws.inLanguage, site.locale);
  assert.equal(ws.publisher['@id'], 'https://example.test/#organization');
  assert.equal('potentialAction' in ws, false);
  assert.deepEqual(buildWebSite({ origin, alternateName: ['royalspices.de'] }).alternateName, ['royalspices.de']);
});

test('BreadcrumbList: positions 1…n, absolute URLs with trailing slash, own host only', () => {
  const list = buildBreadcrumbList({
    origin,
    items: [
      { name: 'Startseite', path: '/' },
      { name: 'Safran', path: '/produkte' },
      { name: 'Produkt', path: '/produkte/beispiel-handle/?variant=1#x' },
    ],
  });
  assert.equal(list['@type'], 'BreadcrumbList');
  assert.deepEqual(
    list.itemListElement.map((i) => [i['@type'], i.position, i.item]),
    [
      ['ListItem', 1, 'https://example.test/'],
      ['ListItem', 2, 'https://example.test/produkte/'],
      ['ListItem', 3, 'https://example.test/produkte/beispiel-handle/'],
    ],
  );
  for (const item of list.itemListElement) assert.match(item.item, /^https:\/\/example\.test\/(.*\/)?$/);
  assert.throws(() => buildBreadcrumbList({ origin, items: [] }), /at least one/);
  assert.throws(() => buildBreadcrumbList({ origin, items: [{ name: 'Fremd', path: 'https://other.test/x/' }] }), /not on/);
  assert.throws(() => buildBreadcrumbList({ origin, items: [{ name: ' ', path: '/' }] }), /empty/);
});

test('Product + Offer: EUR, schema.org availability, NewCondition, sku = mpn, brand, no GTIN', () => {
  const p = product();
  assert.equal(p['@type'], 'Product');
  assert.equal(p.url, 'https://example.test/produkte/beispiel-handle/');
  assert.deepEqual(p.image, ['https://cdn.shopify.com/s/files/beispiel.jpg']);
  assert.equal(p.sku, 'RS-TEST-1');
  assert.equal(p.mpn, p.sku);
  assert.deepEqual(p.brand, { '@type': 'Brand', name: site.name });
  const o = p.offers;
  assert.equal(o['@type'], 'Offer');
  assert.equal(o.price, '9.50');
  assert.ok(Number(o.price) > 0);
  assert.equal(o.priceCurrency, 'EUR');
  assert.equal(o.availability, 'https://schema.org/InStock');
  assert.equal(o.itemCondition, 'https://schema.org/NewCondition');
  assert.equal(o.url, p.url);
  assert.equal(product({ offer: { amount: 21.5, available: false } }).offers.availability, 'https://schema.org/OutOfStock');
  assert.equal(product({ offer: { amount: 21.5, available: false } }).offers.priceCurrency, 'EUR');
  const { keys } = walk(p);
  assert.deepEqual(keys.filter((k) => /gtin|isbn|identifier_exists/i.test(k)), []);
});

test('Product: Offer only for a price > 0; wrong currency or no number fails', () => {
  assert.equal('offers' in product({ offer: null }), false);
  assert.equal('offers' in product({ offer: { amount: '0.00', currencyCode: 'EUR', available: true } }), false);
  assert.equal('offers' in product({ offer: { amount: -1, available: true } }), false);
  assert.throws(() => product({ offer: { amount: '9.5', currencyCode: 'USD', available: true } }), /EUR/);
  assert.throws(() => product({ offer: { amount: 'abc', available: true } }), /not a number/);
});

test('Product: sku and mpn omitted while unknown; image required; optional facts', () => {
  const p = product({ sku: null, offer: null, category: 'Gewürze', countryOfOrigin: 'Afghanistan', netGrams: 0.5 });
  assert.equal('sku' in p, false);
  assert.equal('mpn' in p, false);
  assert.deepEqual(p.countryOfOrigin, { '@type': 'Country', name: 'Afghanistan' });
  assert.deepEqual(p.weight, { '@type': 'QuantitativeValue', value: 0.5, unitCode: 'GRM' });
  assert.equal(p.category, 'Gewürze');
  assert.equal(product({ brand: 'Andere Marke' }).brand.name, 'Andere Marke');
  assert.equal(product({ images: ['/og.jpg'] }).image[0], 'https://example.test/og.jpg');
  assert.throws(() => product({ images: [] }), /images/);
  assert.throws(() => product({ name: '' }), /name/);
});

test('Article: headline, description, dates, author as Person, publisher from site.ts', () => {
  const a = article({ images: ['/img/a.jpg'] });
  assert.equal(a['@type'], 'Article');
  assert.equal(a.headline, 'Überschrift');
  assert.equal(a.url, 'https://example.test/ratgeber/beispiel/');
  assert.equal(a.mainEntityOfPage, a.url);
  assert.deepEqual(a.image, ['https://example.test/img/a.jpg']);
  assert.equal(a.datePublished, '2026-10-01');
  assert.equal('dateModified' in a, false, 'dateModified only for real changes');
  assert.deepEqual(a.author, { '@type': 'Person', name: 'Autor Beispiel', url: 'https://example.test/ueber-uns/' });
  assert.equal(a.publisher.name, site.name);
  assert.equal(a.inLanguage, site.locale);
  assert.equal(article({ dateModified: '2026-10-05T10:00:00+02:00' }).dateModified, '2026-10-05T10:00:00+02:00');
  assert.throws(() => article({ datePublished: '01.10.2026' }), /ISO 8601/);
  assert.throws(() => article({ dateModified: '2026-09-01' }), /before/);
  assert.throws(() => article({ author: { name: '' } }), /author/);
});

test('Recipe: image, ingredients, steps, durations; no ratings', () => {
  const r = recipe({ keywords: ['Safran', 'Reis'], recipeYield: '4 Portionen' });
  assert.equal(r['@type'], 'Recipe');
  assert.deepEqual(r.image, ['https://example.test/img/rezept.jpg']);
  assert.deepEqual(r.recipeIngredient, ['300 g Reis', '0,1 g Safranfäden']);
  assert.deepEqual(r.recipeInstructions, [
    { '@type': 'HowToStep', text: 'Safran einweichen.' },
    { '@type': 'HowToStep', text: 'Reis garen.' },
  ]);
  assert.equal(r.prepTime, 'PT10M');
  assert.equal(r.cookTime, 'PT20M');
  assert.equal(r.keywords, 'Safran, Reis');
  assert.equal(r.author.name, 'Autor Beispiel');
  assert.equal(r.datePublished, '2026-10-01');
  assert.throws(() => recipe({ images: [] }), /images/);
  assert.throws(() => recipe({ ingredients: [] }), /ingredients/);
  assert.throws(() => recipe({ steps: [] }), /steps/);
  assert.throws(() => recipe({ cookTime: '20 Minuten' }), /duration/);
});

test('Service: areaServed Hamburg from site.ts, provider, URL', () => {
  const s = buildService({ origin, path: '/catering/', name: 'Catering', description: 'Catering für Veranstaltungen', serviceType: 'Catering' });
  assert.equal(s['@type'], 'Service');
  assert.equal(s.url, 'https://example.test/catering/');
  assert.deepEqual(s.areaServed, [{ '@type': 'City', name: 'Hamburg' }]);
  assert.equal(s.areaServed[0].name, site.address.city);
  assert.equal(s.provider['@id'], 'https://example.test/#organization');
  assert.equal(s.provider.name, site.name);
  assert.deepEqual(buildService({ origin, path: '/catering/', name: 'C', description: 'D', areaServed: ['Hamburg', 'Lübeck'] }).areaServed.map((a) => a.name), ['Hamburg', 'Lübeck']);
});

test('No builders and no output for FAQPage, HowTo, Review or AggregateRating', () => {
  const names = Object.keys(schema);
  assert.deepEqual(names.filter((n) => /faq|howto|review|rating/i.test(n)), []);
  const all = [buildOrganization({ origin }), buildWebSite({ origin }), product(), article(), recipe(), buildService({ origin, path: '/catering/', name: 'C', description: 'D' })];
  const { types, keys } = walk(all);
  for (const banned of ['FAQPage', 'HowTo', 'Review', 'AggregateRating']) assert.equal(types.includes(banned), false, banned);
  assert.deepEqual(keys.filter((k) => /^(review|reviews|aggregateRating|nutrition)$/.test(k)), []);
  for (const item of all) assert.equal(item['@context'], 'https://schema.org');
});

test('serializeJsonLd: nothing can close the script element, the value survives', () => {
  const p = product({ name: 'Safran </script><script>alert(1)</script>' });
  const json = serializeJsonLd(p);
  assert.equal(json.includes('<'), false);
  assert.deepEqual(JSON.parse(json), p);
});

test('pageUrl: trailing slash, no query or fragment, own host', () => {
  assert.equal(pageUrl('/b2b', origin), 'https://example.test/b2b/');
  assert.equal(pageUrl('/b2b/?a=1#top', 'https://example.test/'), 'https://example.test/b2b/');
  assert.throws(() => pageUrl('https://other.test/', origin), /not on/);
});
