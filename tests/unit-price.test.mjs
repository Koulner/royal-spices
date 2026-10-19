// Unit price ("Grundpreis") from Shopify (T-20261018-11, B4): shown as Shopify delivers it, checked at
// build time, a wrong one stops the build (E2), and the Offer carries a UnitPriceSpecification (E5).
// The unit prices below are SYNTHETIC: the recorded Storefront answer (tests/fixtures, from the live
// shop of 15.10.) has none. The live shop showed 8,900 €/kg for the 0.5 g jar; 17,800 €/kg is right.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkUnitPrice, unitPriceText, unitPriceLabel, liveUnitPriceLabel, unitPricing } from '../src/lib/commerce/unit-price.ts';
import { loadCatalog, productSchemaInput } from '../src/lib/commerce/catalog.ts';
import { createStorefront } from '../src/lib/commerce/storefront.ts';
import { buildProduct } from '../src/lib/seo/schema.ts';

const config = { domain: 'example.myshopify.com', token: 'public-token', apiVersion: '2026-07' };
const fixture = JSON.parse(await readFile(new URL('./fixtures/storefront-products.json', import.meta.url), 'utf8'));
const HALF = 'safran-herat-negin-0-5g';
const eur = (amount) => ({ amount, currencyCode: 'EUR' });
const price = eur('8.9');
/** Shopify's measurement as the Storefront API names it. */
const measured = (quantityValue, quantityUnit, referenceValue, referenceUnit) => ({ quantityValue, quantityUnit, referenceValue, referenceUnit });
const unit = (amount, m = measured(0.5, 'G', 1, 'KG')) => ({ price: eur(amount), ...m });

/** The recorded answer, the 0.5 g variant with a (synthetic) unit price. */
function withUnitPrice(amount, m = measured(0.5, 'G', 1, 'KG')) {
  return (data) => {
    const v = data.products.nodes.find((n) => n.handle === HALF).variants.nodes[0];
    v.unitPrice = eur(amount);
    v.unitPriceMeasurement = m;
    return data;
  };
}
function fixtureFetch(change = (data) => data) {
  const calls = [];
  const fetchImpl = async (_url, init) => {
    calls.push(JSON.parse(init.body).query);
    return new Response(JSON.stringify({ data: change(structuredClone(fixture.data)) }), { status: 200 });
  };
  return { fetchImpl, calls };
}
const origin = 'https://royalspices.de';

test('the recorded Storefront answer has no unit price (the values in these tests are synthetic)', () => {
  for (const n of fixture.data.products.nodes) assert.equal(n.variants.nodes[0].unitPrice, undefined, n.handle);
});

test('checkUnitPrice: 0.5 g at 8.90 € and 17,800 €/kg fits, with and without the label weight', () => {
  assert.equal(checkUnitPrice(price, unit('17800.0')), null);
  assert.equal(checkUnitPrice(price, unit('17800.0'), 0.5), null);
  assert.equal(checkUnitPrice(price, unit('1780.0', measured(0.5, 'G', 100, 'G')), 0.5), null);
  assert.equal(checkUnitPrice(eur('12.9'), unit('12900.0', measured(1, 'G', 1, 'KG')), 1), null);
});

test('checkUnitPrice: 8,900 €/kg for the 0.5 g jar is caught, as Shopify would send it (1 g entered) and as a bare number', () => {
  // Live case: quantity 1 g entered in Shopify, so Shopify computes a consistent 8,900 €/kg; the label says 0.5 g.
  assert.match(checkUnitPrice(price, unit('8900.0', measured(1, 'G', 1, 'KG')), 0.5), /Menge in Shopify 1 g, laut Etikett \(src\/data\/product\.ts\) 0,5 g/);
  // Same number with the right quantity: does not follow from price and quantity.
  assert.match(checkUnitPrice(price, unit('8900.0')), /Grundpreis 8\.900,00\s€ je 1 kg, aus Preis 8,90\s€ und Menge 0,5 g folgen 17\.800,00\s€/);
});

test('checkUnitPrice: to the cent, units, dimensions, missing values and currency', () => {
  assert.equal(checkUnitPrice(price, unit('17800.01')), null);
  assert.notEqual(checkUnitPrice(price, unit('17800.02')), null);
  assert.match(checkUnitPrice(price, unit('17800', measured(0.5, 'OZ', 1, 'KG'))), /Einheit nicht unterstützt \(OZ \/ KG\)/);
  assert.match(checkUnitPrice(price, unit('17800', measured(0.5, 'G', 1, 'L'))), /Menge \(Gewicht\) und Bezugsmenge \(Volumen\)/);
  assert.match(checkUnitPrice(price, unit('17800', measured(NaN, 'G', 1, 'KG'))), /fehlt/);
  assert.match(checkUnitPrice(price, unit('17800', measured(0.5, '', NaN, ''))), /Einheit nicht unterstützt/);
  assert.match(checkUnitPrice(price, { ...unit('17800'), price: { amount: '17800', currencyCode: 'USD' } }), /Währung/);
  // Volume needs no label weight: the weight rule applies to weights only.
  assert.equal(checkUnitPrice(eur('5'), unit('50', measured(100, 'ML', 1, 'L')), 0.5), null);
});

// formatMoney puts a no-break space between amount and currency sign.
const nb = (s) => s.replaceAll(' €', ' €');

test('unitPriceText and unitPriceLabel: German format, reference quantity only when it is not 1', () => {
  assert.equal(unitPriceText(unit('17800.0')), nb('17.800,00 €/kg'));
  assert.equal(unitPriceText(unit('1780.0', measured(0.5, 'G', 100, 'G'))), nb('1.780,00 €/100 g'));
  assert.equal(unitPriceLabel(unit('17800.0')), nb('Grundpreis 17.800,00 €/kg'));
});

test('live update: the label while the unit price fits the current price, otherwise null (line hidden)', () => {
  assert.equal(liveUnitPriceLabel(price, unit('17800.0'), 0.5), nb('Grundpreis 17.800,00 €/kg'));
  assert.equal(liveUnitPriceLabel(eur('9.9'), unit('19800.0'), 0.5), nb('Grundpreis 19.800,00 €/kg'));
  assert.equal(liveUnitPriceLabel(eur('9.9'), unit('17800.0'), 0.5), null, 'price changed, unit price did not');
  assert.equal(liveUnitPriceLabel(price, null, 0.5), null);
});

test('both product queries ask for unitPrice and unitPriceMeasurement; the runtime query maps them', async () => {
  const fake = fixtureFetch();
  await loadCatalog({ config, fetchImpl: fake.fetchImpl });
  const fields = ['unitPrice { amount currencyCode }', 'unitPriceMeasurement { quantityValue quantityUnit referenceValue referenceUnit }'];
  for (const f of fields) assert.ok(fake.calls[0].replace(/\s+/g, ' ').includes(f), f);
  const runtime = [];
  const storefront = createStorefront(config, async (_url, init) => {
    runtime.push(JSON.parse(init.body).query.replace(/\s+/g, ' '));
    const variant = { id: 'v1', title: '0,5 g', availableForSale: true, price, unitPrice: eur('17800.0'), unitPriceMeasurement: measured(0.5, 'G', 1, 'KG'), selectedOptions: [] };
    return new Response(JSON.stringify({ data: { product: { id: 'p', handle: HALF, title: 'Safran', availableForSale: true, variants: { nodes: [variant] } } } }), { status: 200 });
  });
  const product = await storefront.product(HALF);
  for (const f of fields) assert.ok(runtime[0].includes(f), f);
  assert.deepEqual(product.variants[0].unitPrice, unit('17800.0'));
});

test('catalog without a Shopify unit price: none in the catalog, no priceSpecification in the Offer', async () => {
  for (const p of await loadCatalog({ config, fetchImpl: fixtureFetch().fetchImpl })) {
    assert.equal(p.unitPrice, null, p.handle);
    assert.equal(buildProduct(productSchemaInput(p, origin)).offers.priceSpecification, undefined, p.handle);
  }
  for (const p of await loadCatalog({ config: null })) assert.equal(p.unitPrice, null, p.handle);
});

test('catalog with 17,800 €/kg: unit price in the catalog, Offer with UnitPriceSpecification that says the same as the page', async () => {
  const catalog = await loadCatalog({ config, fetchImpl: fixtureFetch(withUnitPrice('17800.0')).fetchImpl });
  const half = catalog.find((p) => p.handle === HALF);
  assert.deepEqual(half.unitPrice, unit('17800.0'));
  assert.equal(catalog.find((p) => p.handle !== HALF).unitPrice, null);
  const offer = buildProduct(productSchemaInput(half, origin)).offers;
  assert.deepEqual(offer.priceSpecification, {
    '@type': 'UnitPriceSpecification',
    price: '8.90',
    priceCurrency: 'EUR',
    referenceQuantity: { '@type': 'QuantitativeValue', value: 0.5, unitCode: 'GRM', valueReference: { '@type': 'QuantitativeValue', value: 1, unitCode: 'KGM' } },
  });
  assert.equal(offer.price, offer.priceSpecification.price, 'Offer price and specification price are the visible price');
  // What Google derives (price ÷ 0.5 g × 1 kg) is the unit price the page shows.
  const factor = { GRM: 1, KGM: 1000 };
  const q = offer.priceSpecification.referenceQuantity;
  const derived = (Number(offer.price) / (q.value * factor[q.unitCode])) * (q.valueReference.value * factor[q.valueReference.unitCode]);
  assert.equal(derived.toFixed(2), Number(half.unitPrice.price.amount).toFixed(2));
  assert.deepEqual(unitPricing(half.unitPrice), { quantity: { value: 0.5, unitCode: 'GRM' }, reference: { value: 1, unitCode: 'KGM' } });
});

test('catalog with 8,900 €/kg stops the build with handle and numbers (E2)', async () => {
  await assert.rejects(
    loadCatalog({ config, fetchImpl: fixtureFetch(withUnitPrice('8900.0', measured(1, 'G', 1, 'KG'))).fetchImpl }),
    /^Error: Grundpreis aus Shopify unplausibel \(safran-herat-negin-0-5g: Menge in Shopify 1 g, laut Etikett .* 0,5 g\)\. Build abgebrochen\./,
  );
  await assert.rejects(
    loadCatalog({ config, fetchImpl: fixtureFetch(withUnitPrice('8900.0')).fetchImpl }),
    /Grundpreis aus Shopify unplausibel \(safran-herat-negin-0-5g: Grundpreis 8\.900,00\s€ je 1 kg, .*folgen 17\.800,00\s€\)/,
  );
});

test('buildProduct refuses a unit pricing without positive quantities or UN/CEFACT codes', () => {
  const input = (unitPricing) => ({ origin, path: '/produkte/x/', name: 'X', images: ['/og.jpg'], sku: null, offer: { amount: '8.9', available: true, unitPricing } });
  assert.throws(() => buildProduct(input({ quantity: { value: 0, unitCode: 'GRM' }, reference: { value: 1, unitCode: 'KGM' } })), /unitPricing\.quantity/);
  assert.throws(() => buildProduct(input({ quantity: { value: 0.5, unitCode: 'g' }, reference: { value: 1, unitCode: 'KGM' } })), /unitPricing\.quantity/);
});
