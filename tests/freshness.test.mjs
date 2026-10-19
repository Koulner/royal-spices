// tools/qa/freshness.mjs (T-20261018-13, B1a): the built pages against the Storefront API.
// The pages here are written in the markup the build produces (copied from a build with the recorded
// store on 18.10.2026); the last test makes sure the components still have the anchors the tool reads.
// The command line runs in a child process with --fixture, so no request leaves the machine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { checkFreshness } from '../tools/qa/freshness.mjs';
import { createStorefront } from '../src/lib/commerce/storefront.ts';

const run = promisify(execFile);
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const TOOL = join(ROOT, 'tools/qa/freshness.mjs');
const RECORDED = join(ROOT, 'tests/fixtures/storefront-products.json');
const fixture = JSON.parse(await readFile(RECORDED, 'utf8'));
const LARGE = 'herat-negin-safran-1-g-grade-a';
const HALF = 'safran-herat-negin-0-5g';
const eur = (n) => `${n.toFixed(2).replace('.', ',')} €`;
const config = { domain: 'example.myshopify.com', token: 'public-token', apiVersion: '2026-07' };

/** Built pages for products given as { handle, price, available, unit } (unit: the label or null). */
async function site(products, { extraPage = null } = {}) {
  const dist = await mkdtemp(join(tmpdir(), 'rs-freshness-'));
  const unitLine = (p) => (p.unit ? `<p class="small" data-astro-cid-x>${p.unit}</p>` : '');
  const home = products
    .map((p) => `<li class="card" data-astro-cid-x> <div class="card__info" data-astro-cid-x> <p class="card__price" data-astro-cid-x> <span class="card__amount" data-astro-cid-x>${eur(p.price)}</span> <span class="small" data-astro-cid-x>inkl. MwSt.</span> </p>${unitLine(p)} <a class="link" href="/produkte/${p.handle}/" data-astro-cid-x>Produkt ansehen</a> </div> </li>`)
    .join(' ');
  const gift = '<li class="card card--gift" data-astro-cid-x> <p class="eyebrow">THE ROYAL GIFT</p> <p>In Vorbereitung</p> </li>';
  const list = products
    .map((p) => `<article class="pcard" data-astro-cid-u> <h3 class="display-m pcard__title" data-astro-cid-u><a href="/produkte/${p.handle}/" data-astro-cid-u>${p.handle}</a></h3> <p class="pcard__price" data-astro-cid-u> <span class="sr-only" data-astro-cid-u>Normaler Preis</span> ${eur(p.price)} </p>${unitLine(p)} ${p.available ? '' : '<p class="small" data-astro-cid-u>Ausverkauft</p>'} </article>`)
    .join(' ');
  await writeFile(join(dist, 'index.html'), `<!DOCTYPE html><html><body><ul>${home} ${gift}</ul></body></html>`);
  await mkdir(join(dist, 'produkte'), { recursive: true });
  await writeFile(join(dist, 'produkte/index.html'), `<!DOCTYPE html><html><body>${list}</body></html>`);
  const page = (p) => {
    const ld = { '@context': 'https://schema.org', '@type': 'Product', name: p.handle, offers: { '@type': 'Offer', price: p.price.toFixed(2), priceCurrency: 'EUR', availability: `https://schema.org/${p.available ? 'InStock' : 'OutOfStock'}` } };
    return `<!DOCTYPE html><html><head><script type="application/ld+json">${JSON.stringify(ld)}</script></head><body><div class="buybox label" data-astro-cid-e> <div class="buybox__body" data-buybox data-commerce data-handle="${p.handle}" data-variant-id="gid://v" data-available="${p.available}" data-astro-cid-e> <p class="buybox__price display-m" data-astro-cid-e> <span class="sr-only" data-astro-cid-e>Normaler Preis</span> <span data-buybox-price data-astro-cid-e>${eur(p.price)}</span> </p>${p.unit ? `<p class="small buybox__unit" data-buybox-unit data-net-grams="0.5" data-astro-cid-e>${p.unit}</p>` : ''} <p class="small buybox__soldout" data-buybox-soldout${p.available ? ' hidden' : ''} data-astro-cid-e>Ausverkauft</p> <p class="small" data-astro-cid-e>Inkl. Steuern.</p> <p class="buybox__feedback" role="status" data-buybox-feedback data-astro-cid-e></p> </div></div></body></html>`;
  };
  for (const p of [...products, ...(extraPage ? [extraPage] : [])]) {
    await mkdir(join(dist, 'produkte', p.handle), { recursive: true });
    await writeFile(join(dist, 'produkte', p.handle, 'index.html'), page(p));
  }
  return dist;
}

/** The recorded store as the build saw it. */
const BUILT = [
  { handle: HALF, price: 8.9, available: true, unit: null },
  { handle: LARGE, price: 12.9, available: true, unit: null },
];

/** The recorded answer after a change in Shopify: 1 g now 13.90 €, 0.5 g sold out. */
function changed() {
  const data = structuredClone(fixture);
  data.data.products.nodes.find((n) => n.handle === LARGE).variants.nodes[0].price.amount = '13.9';
  data.data.products.nodes.find((n) => n.handle === HALF).variants.nodes[0].availableForSale = false;
  return data;
}

async function cli(dist, answer) {
  const dir = await mkdtemp(join(tmpdir(), 'rs-freshness-answer-'));
  const file = join(dir, 'answer.json');
  await writeFile(file, JSON.stringify(answer));
  try {
    const { stdout } = await run(process.execPath, ['--experimental-strip-types', '--no-warnings', TOOL, dist, '--fixture', file], { cwd: ROOT });
    return { code: 0, stdout };
  } catch (error) {
    return { code: error.code, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const listed = (answer) => createStorefront(config, async () => new Response(JSON.stringify({ data: answer.data }), { status: 200 })).products();

test('build and Shopify agree: no deviations, exit 0', async () => {
  const dist = await site(BUILT);
  try {
    const result = await cli(dist, fixture);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /keine Abweichungen \(2 Produkte/);
  } finally {
    await rm(dist, { recursive: true, force: true });
  }
});

test('price 12.90 → 13.90 € and 0.5 g sold out: /, /produkte/ and both product pages (visible and Offer), exit 1', async () => {
  const dist = await site(BUILT);
  try {
    const findings = await checkFreshness(dist, await listed(changed()));
    const got = findings.map((f) => `${f.page} ${f.handle} ${f.field}`).sort();
    assert.deepEqual(got, [
      `/ ${LARGE} Preis`,
      `/produkte/ ${HALF} Ausverkauft`,
      `/produkte/ ${LARGE} Preis`,
      `/produkte/${HALF}/ ${HALF} Ausverkauft`,
      `/produkte/${HALF}/ ${HALF} Offer.availability`,
      `/produkte/${HALF}/ ${HALF} verfügbar`,
      `/produkte/${LARGE}/ ${LARGE} Offer.price`,
      `/produkte/${LARGE}/ ${LARGE} Preis`,
    ].sort());
    assert.deepEqual(findings.find((f) => f.field === 'Offer.price'), { page: `/produkte/${LARGE}/`, handle: LARGE, field: 'Offer.price', built: '12.90', shopify: '13.90' });
    const result = await cli(dist, changed());
    assert.equal(result.code, 1);
    assert.match(result.stdout, /\/ \[herat-negin-safran-1-g-grade-a\]\s+Preis: gebaut 12,90\s€, Shopify 13,90\s€/);
    assert.match(result.stdout, /8 Abweichung\(en\) bei 2 Produkten/);
  } finally {
    await rm(dist, { recursive: true, force: true });
  }
});

test('unit price: a built one Shopify no longer has, and one Shopify has but the build does not, are reported', async () => {
  const label = 'Grundpreis 17.800,00 €/kg';
  const withUnit = await site(BUILT.map((p) => (p.handle === HALF ? { ...p, unit: label } : p)));
  const without = await site(BUILT);
  const answer = structuredClone(fixture);
  const v = answer.data.products.nodes.find((n) => n.handle === HALF).variants.nodes[0];
  v.unitPrice = { amount: '17800.0', currencyCode: 'EUR' }; // synthetic, the recorded answer has none
  v.unitPriceMeasurement = { quantityValue: 0.5, quantityUnit: 'G', referenceValue: 1, referenceUnit: 'KG' };
  try {
    assert.deepEqual(await checkFreshness(withUnit, await listed(answer)), []);
    const gone = await checkFreshness(withUnit, await listed(fixture));
    assert.deepEqual(gone.map((f) => f.page).sort(), ['/', '/produkte/', `/produkte/${HALF}/`]);
    assert.ok(gone.every((f) => f.field === 'Grundpreis' && f.built === label && f.shopify === null));
    const added = await checkFreshness(without, await listed(answer));
    assert.equal(added.length, 3);
    assert.ok(added.every((f) => f.field === 'Grundpreis' && f.built === null && f.shopify === label));
  } finally {
    await rm(withUnit, { recursive: true, force: true });
    await rm(without, { recursive: true, force: true });
  }
});

test('a new product without a page and a page of a product no longer in the shop are reported', async () => {
  const dist = await site(BUILT.filter((p) => p.handle === HALF), { extraPage: { handle: 'alt-entfernt', price: 5, available: true, unit: null } });
  try {
    const findings = await checkFreshness(dist, await listed(fixture));
    const got = findings.map((f) => `${f.page} ${f.field}`).sort();
    assert.deepEqual(got, ['/produkte/ Eintrag', `/produkte/${LARGE}/ Seite`, '/produkte/alt-entfernt/ Produkt'].sort());
  } finally {
    await rm(dist, { recursive: true, force: true });
  }
});

test('a build without store or a missing build is an error (exit 2), not a pass', async () => {
  const empty = await mkdtemp(join(tmpdir(), 'rs-freshness-empty-'));
  try {
    const result = await cli(empty, fixture);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /Kein Build/);
    const noStore = await site([]);
    try {
      const findings = await checkFreshness(noStore, await listed(fixture));
      assert.ok(findings.some((f) => f.field === 'Eintrag'), 'products of the shop missing from /produkte/');
    } finally {
      await rm(noStore, { recursive: true, force: true });
    }
  } finally {
    await rm(empty, { recursive: true, force: true });
  }
});

test('the components still have the anchors the tool reads', async () => {
  const src = async (path) => readFile(join(ROOT, path), 'utf8');
  const home = await src('src/components/home/HomeCollection.astro');
  for (const anchor of ['<li class="card">', 'class="card__amount"', '<li class="card card--gift">', '<p class="small">{unitPriceLabel(']) assert.ok(home.includes(anchor), `HomeCollection: ${anchor}`);
  const card = await src('src/components/product/ProductCard.astro');
  for (const anchor of ['<article class="pcard">', 'const href = `/produkte/${product.handle}/`;', '<p class="pcard__price">', '<span class="sr-only">Normaler Preis</span>', '<p class="small">Ausverkauft</p>', '<p class="small">{unitPriceLabel(']) {
    assert.ok(card.includes(anchor), `ProductCard: ${anchor}`);
  }
  const box = await src('src/components/BuyBox.astro');
  for (const anchor of ['class="buybox__body"', 'data-handle={product.handle}', 'data-available={String(product.available === true)}', '<span data-buybox-price>', 'data-buybox-unit', 'data-buybox-soldout hidden={product.available === true}', '<p class="buybox__feedback"']) {
    assert.ok(box.includes(anchor), `BuyBox: ${anchor}`);
  }
});
