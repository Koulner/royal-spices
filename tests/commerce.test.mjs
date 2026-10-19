// Commerce layer against a stand-in for the Storefront API.
// The stand-in lives only in this test: the application itself contains no product or price data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorefront, checkApiVersion } from '../src/lib/commerce/storefront.ts';
import { createCart, formatMoney } from '../src/lib/commerce/cart.ts';
import { CommerceError } from '../src/lib/commerce/types.ts';
import { loadCatalog, formatPrice, structuredDescription, toGrade1, productPlainText, productSchemaInput, productOgImage } from '../src/lib/commerce/catalog.ts';
import { buildProduct } from '../src/lib/seo/schema.ts';
import { productFacts, factsToText } from '../src/data/product.ts';
import { htmlToBlocks, textToBlocks, blocksToText } from '../src/lib/commerce/rich-text.ts';
import { readFile, readdir } from 'node:fs/promises';

const config = { domain: 'example.myshopify.com', token: 'public-token', apiVersion: '2026-07' };
const money = (amount) => ({ amount: amount.toFixed(2), currencyCode: 'EUR' });

/** Minimal in-memory Storefront: one product, carts with lines. Records every request. */
function fakeStorefront({ price = 9.5, available = true } = {}) {
  const calls = [];
  const carts = new Map();
  let nextId = 1;
  const shape = (cart) => ({
    id: cart.id,
    checkoutUrl: `https://example.myshopify.com/cart/c/${cart.id}`,
    totalQuantity: cart.lines.reduce((sum, l) => sum + l.quantity, 0),
    cost: { subtotalAmount: money(cart.lines.reduce((sum, l) => sum + l.quantity * price, 0)) },
    lines: {
      nodes: cart.lines.map((l) => ({
        id: l.id,
        quantity: l.quantity,
        cost: { totalAmount: money(l.quantity * price) },
        merchandise: { id: l.merchandiseId, title: '1 g', product: { title: 'Safranfäden', handle: 'herat-negin-safran-1-g-grade-a' } },
      })),
    },
  });
  const fetchImpl = async (url, init) => {
    const { query, variables } = JSON.parse(init.body);
    calls.push({ url, headers: init.headers, query, variables });
    const ok = (data) => new Response(JSON.stringify({ data }), { status: 200 });
    if (query.includes('query Product')) {
      if (variables.handle !== 'herat-negin-safran-1-g-grade-a') return ok({ product: null });
      return ok({
        product: {
          id: 'gid://shopify/Product/1',
          handle: 'herat-negin-safran-1-g-grade-a',
          title: 'Safranfäden',
          availableForSale: available,
          variants: { nodes: [{ id: 'gid://shopify/ProductVariant/1', title: '1 g', availableForSale: available, price: money(price), selectedOptions: [{ name: 'Gebinde', value: '1 g' }] }] },
        },
      });
    }
    if (query.includes('query Cart')) return ok({ cart: carts.has(variables.id) ? shape(carts.get(variables.id)) : null });
    if (query.includes('cartCreate')) {
      const cart = { id: `gid://shopify/Cart/${nextId++}`, lines: variables.lines.map((l, i) => ({ id: `line-${i + 1}`, ...l })) };
      carts.set(cart.id, cart);
      return ok({ cartCreate: { cart: shape(cart), userErrors: [] } });
    }
    const cart = carts.get(variables.cartId);
    if (query.includes('cartLinesAdd')) {
      if (!available) return ok({ cartLinesAdd: { cart: null, userErrors: [{ message: 'Nicht verfügbar.' }] } });
      for (const l of variables.lines) {
        const existing = cart.lines.find((x) => x.merchandiseId === l.merchandiseId);
        if (existing) existing.quantity += l.quantity;
        else cart.lines.push({ id: `line-${cart.lines.length + 1}`, ...l });
      }
      return ok({ cartLinesAdd: { cart: shape(cart), userErrors: [] } });
    }
    if (query.includes('cartLinesUpdate')) {
      for (const l of variables.lines) cart.lines.find((x) => x.id === l.id).quantity = l.quantity;
      return ok({ cartLinesUpdate: { cart: shape(cart), userErrors: [] } });
    }
    if (query.includes('cartLinesRemove')) {
      cart.lines = cart.lines.filter((x) => !variables.lineIds.includes(x.id));
      return ok({ cartLinesRemove: { cart: shape(cart), userErrors: [] } });
    }
    return new Response('{}', { status: 400 });
  };
  return { fetchImpl, calls, carts };
}

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k), map };
}

test('talks to the versioned Storefront endpoint with the public token header', async () => {
  const fake = fakeStorefront();
  const storefront = createStorefront(config, fake.fetchImpl);
  const product = await storefront.product('herat-negin-safran-1-g-grade-a');
  assert.equal(fake.calls[0].url, 'https://example.myshopify.com/api/2026-07/graphql.json');
  assert.equal(fake.calls[0].headers['x-shopify-storefront-access-token'], 'public-token');
  assert.equal(product.variants[0].price.amount, '9.50');
  assert.deepEqual(product.variants[0].options, [{ name: 'Gebinde', value: '1 g' }]);
});

test('unknown product handle resolves to null instead of throwing', async () => {
  const storefront = createStorefront(config, fakeStorefront().fetchImpl);
  assert.equal(await storefront.product('gibt-es-nicht'), null);
});

test('refuses a store domain that is not a plain host name', () => {
  for (const domain of ['https://evil.example/x', 'example.myshopify.com/path', 'a b.com', '']) {
    assert.throws(() => createStorefront({ ...config, domain }), CommerceError, domain);
  }
});

test('maps transport, HTTP, GraphQL and user errors to CommerceError kinds', async () => {
  const offline = createStorefront(config, async () => { throw new TypeError('network'); });
  await assert.rejects(offline.product('x'), (e) => e instanceof CommerceError && e.kind === 'network');

  const http = createStorefront(config, async () => new Response('nope', { status: 401 }));
  await assert.rejects(http.product('x'), (e) => e.kind === 'http');

  const graphql = createStorefront(config, async () => new Response(JSON.stringify({ errors: [{ message: 'Throttled' }] }), { status: 200 }));
  await assert.rejects(graphql.product('x'), (e) => e.kind === 'graphql' && e.message === 'Throttled');

  const soldOut = fakeStorefront({ available: false });
  const storefront = createStorefront(config, soldOut.fetchImpl);
  const cart = await storefront.cartCreate([]);
  await assert.rejects(storefront.cartLinesAdd(cart.id, [{ merchandiseId: 'v', quantity: 1 }]), (e) => e.kind === 'user' && e.message === 'Nicht verfügbar.');
});

test('cart: add creates the cart, later adds extend it, totals come from the backend', async () => {
  const fake = fakeStorefront({ price: 9.5 });
  const storage = memoryStorage();
  const cart = createCart(createStorefront(config, fake.fetchImpl), storage);
  const seen = [];
  cart.subscribe((c) => seen.push(c?.totalQuantity ?? 0));

  await cart.add('gid://shopify/ProductVariant/1', 2);
  assert.equal(cart.current.totalQuantity, 2);
  assert.equal(cart.current.subtotal.amount, '19.00');
  assert.match(cart.current.checkoutUrl, /^https:\/\/example\.myshopify\.com\/cart\/c\//);
  assert.equal(storage.getItem('royalspices.cart'), cart.current.id);

  await cart.add('gid://shopify/ProductVariant/1', 1);
  assert.equal(cart.current.totalQuantity, 3);
  assert.equal(fake.carts.size, 1, 'second add must reuse the cart');
  assert.deepEqual(seen, [2, 3]);
});

test('cart: quantity changes, removal and quantity clamping', async () => {
  const fake = fakeStorefront();
  const cart = createCart(createStorefront(config, fake.fetchImpl), memoryStorage());
  await cart.add('gid://shopify/ProductVariant/1', 500);
  assert.equal(cart.current.lines[0].quantity, 99, 'quantity is clamped before it is sent');

  const lineId = cart.current.lines[0].id;
  await cart.setQuantity(lineId, 4);
  assert.equal(cart.current.lines[0].quantity, 4);
  assert.equal(cart.current.subtotal.amount, '38.00');

  await cart.setQuantity(lineId, 0);
  assert.equal(cart.current.lines.length, 0, 'quantity 0 removes the line');
});

test('cart: restore finds the saved cart and forgets one Shopify no longer knows', async () => {
  const fake = fakeStorefront();
  const storefront = createStorefront(config, fake.fetchImpl);
  const storage = memoryStorage();
  const first = createCart(storefront, storage);
  await first.add('gid://shopify/ProductVariant/1', 1);

  const second = createCart(storefront, storage);
  assert.equal((await second.restore()).totalQuantity, 1);

  fake.carts.clear(); // checkout completed or cart expired
  const third = createCart(storefront, storage);
  assert.equal(await third.restore(), null);
  assert.equal(storage.getItem('royalspices.cart'), null);
});

test('cart keeps working when device storage is unavailable', async () => {
  const fake = fakeStorefront();
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  const cart = createCart(createStorefront(config, fake.fetchImpl), broken);
  assert.equal(await cart.restore(), null);
  await cart.add('gid://shopify/ProductVariant/1', 1);
  assert.equal(cart.current.totalQuantity, 1);
});

test('formats money for the German locale', () => {
  assert.equal(formatMoney({ amount: '9.5', currencyCode: 'EUR' }).replace(/ /g, ' '), '9,50 €');
});

// ---------------------------------------------------------------- catalog (build time)
// Recorded answer of the products query, converted from the live products.json (15.10.2026). No network.
const fixture = JSON.parse(await readFile(new URL('./fixtures/storefront-products.json', import.meta.url), 'utf8'));
const nbsp = (s) => s.replace(/ /g, ' ');

/** Answers the products query with the fixture (optionally changed); records every request. */
function fixtureFetch(change = (data) => data) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const { query } = JSON.parse(init.body);
    calls.push({ url, query });
    return new Response(JSON.stringify({ data: change(structuredClone(fixture.data)) }), { status: 200 });
  };
  return { fetchImpl, calls };
}

test('catalog query asks for handle, title, description (text and HTML), images and two variants', async () => {
  const fake = fixtureFetch();
  await loadCatalog({ config, fetchImpl: fake.fetchImpl });
  const query = fake.calls[0].query.replace(/\s+/g, ' ');
  assert.equal(fake.calls.length, 1, 'one request per catalog');
  assert.match(query, /products\(first: 50\)/);
  for (const field of ['handle', 'title', 'description', 'descriptionHtml', 'images', 'url altText width height', 'variants(first: 2)', 'sku', 'availableForSale', 'price { amount currencyCode }']) {
    assert.ok(query.includes(field), field);
  }
});

test('catalog maps the recorded Storefront answer, ordered like the live collection', async () => {
  const catalog = await loadCatalog({ config, fetchImpl: fixtureFetch().fetchImpl });
  assert.deepEqual(catalog.map((p) => p.handle), ['safran-herat-negin-0-5g', 'herat-negin-safran-1-g-grade-a']);
  const [small, large] = catalog;
  assert.deepEqual(Object.keys(small).sort(), ['available', 'body', 'description', 'facts', 'handle', 'image', 'price', 'sku', 'title', 'unitPrice', 'variantId']);
  assert.equal(small.unitPrice, null, 'the recorded answer has no unit price (tests/unit-price.test.mjs)');
  assert.equal(small.title, 'Safran – Herat Negin Grade 1, 0,5 g');
  assert.equal(large.title, 'Herat Negin Safran – 1\u00a0g (Grade\u00a01)', 'with a store the title is Shopify’s, Grade 1');
  assert.deepEqual(small.price, { amount: '8.9', currencyCode: 'EUR' });
  assert.deepEqual(large.price, { amount: '12.9', currencyCode: 'EUR' });
  assert.equal(small.available, true);
  assert.equal(large.variantId, 'gid://shopify/ProductVariant/57120616251779');
  assert.equal(large.image.altText, 'Royal Spices 1 g Herat Negin Safran im Glas, Premium Produktfoto');
  assert.equal(large.image.width, 1254);
  assert.match(large.image.url, /^https:\/\/cdn\.shopify\.com\//);
  assert.ok(large.description.startsWith('Herat Negin – Safran mit Charakter'));
  for (const p of catalog) assert.doesNotMatch(p.description, /<|>/, 'description is plain text');
  assert.equal(small.facts, productFacts['safran-herat-negin-0-5g']);
});

test('catalog without a store: pages from product.ts, no price, no availability', async () => {
  let fetched = false;
  const catalog = await loadCatalog({ config: null, fetchImpl: async () => { fetched = true; } });
  assert.equal(fetched, false, 'no request without a store');
  assert.deepEqual(catalog.map((p) => p.handle), Object.keys(productFacts));
  for (const p of catalog) {
    assert.equal(p.price, null);
    assert.equal(p.available, null);
    assert.equal(p.variantId, null);
    assert.equal(p.image, null);
    assert.ok(p.facts);
    assert.doesNotMatch(p.description, /<|>/);
    assert.deepEqual(p.body, textToBlocks(factsToText(p.facts)), 'without a store the blocks are the product.ts text');
  }
  assert.equal(catalog[1].title, 'Herat Negin Safran – 1\u00a0g (Grade\u00a01)');
  for (const p of catalog) assert.equal(structuredDescription(p), p.facts, 'without a store the structure is always known');
});

test('catalog: Shopify texts word for word, only Grade A becomes Grade 1', async () => {
  const catalog = await loadCatalog({ config, fetchImpl: fixtureFetch().fetchImpl });
  const recorded = Object.fromEntries(fixture.data.products.nodes.map((n) => [n.handle, n]));
  assert.match(recorded['herat-negin-safran-1-g-grade-a'].description, /Grade A/, 'the recorded answer still says Grade A');
  for (const p of catalog) {
    const raw = recorded[p.handle];
    const grade1 = (text) => text.replace(/Grade(\s)A/g, (_, space) => `Grade${space}1`);
    assert.equal(p.title, grade1(raw.title));
    assert.equal(p.description, grade1(raw.description));
    assert.doesNotMatch(`${p.title} ${p.description} ${p.image.altText}`, /Grade\sA/);
  }
  assert.equal(toGrade1('Grade A, Grade\u00a0A, Grade ASo, Grade Alpha, Grade 1'), 'Grade 1, Grade\u00a01, Grade 1So, Grade Alpha, Grade 1');
});

test('catalog: the recorded Shopify description says what product.ts says, so the page can show its structure', async () => {
  const catalog = await loadCatalog({ config, fetchImpl: fixtureFetch().fetchImpl });
  for (const p of catalog) assert.equal(structuredDescription(p), productFacts[p.handle], p.handle);
  // The customer edits the text in Shopify: the page shows the Shopify text as it is, not product.ts.
  const edited = await loadCatalog({
    config,
    fetchImpl: fixtureFetch((data) => {
      const p = data.products.nodes[0];
      p.description = p.description.replace('Einige Fäden', 'Ein paar Fäden');
      p.descriptionHtml = p.descriptionHtml.replace('Einige Fäden', 'Ein paar Fäden');
      return data;
    }).fetchImpl,
  });
  const changed = edited.find((p) => p.handle === 'herat-negin-safran-1-g-grade-a');
  assert.equal(structuredDescription(changed), null);
  assert.match(changed.description, /Ein paar Fäden/);
  assert.match(blocksToText(changed.body), /Ein paar Fäden/);
});

const compact = (text) => text.replace(/\s+/g, '');
const shape = (blocks) => blocks.map((b) => (b.kind === 'heading' ? `h${b.level}` : b.kind === 'list' ? `list${b.items.length}` : 'p'));

test('catalog: the description blocks come from descriptionHtml and say what the plain text says, Grade 1', async () => {
  const catalog = await loadCatalog({ config, fetchImpl: fixtureFetch().fetchImpl });
  const recorded = Object.fromEntries(fixture.data.products.nodes.map((n) => [n.handle, n]));
  assert.match(recorded['herat-negin-safran-1-g-grade-a'].descriptionHtml, /Grade(\s|&nbsp;)A/, 'the recorded HTML still says Grade A');
  for (const p of catalog) {
    const raw = recorded[p.handle];
    assert.equal(compact(blocksToText(htmlToBlocks(raw.descriptionHtml))), compact(raw.description), `${p.handle}: HTML and plain text of the recording agree`);
    assert.equal(compact(blocksToText(p.body)), compact(p.description), p.handle);
    assert.deepEqual(shape(p.body).slice(0, 4), ['h2', 'p', 'h3', 'list5'], p.handle);
    const text = blocksToText(p.body);
    assert.doesNotMatch(text, /Grade\sA/, p.handle);
    assert.match(text, /Grade\s1/, p.handle);
  }
});

test('catalog: a description changed in Shopify keeps its structure, its plain text keeps the blocks apart', async () => {
  // As found on 17.10.: one full stop added in Shopify, so the plain text no longer matches product.ts.
  const edited = await loadCatalog({
    config,
    fetchImpl: fixtureFetch((data) => {
      const p = data.products.nodes.find((n) => n.handle === 'safran-herat-negin-0-5g');
      p.description = p.description.replace('im kleinen Glas', 'im kleinen Glas.');
      p.descriptionHtml = p.descriptionHtml.replace('im kleinen Glas</h2>', 'im kleinen Glas.</h2>');
      return data;
    }).fetchImpl,
  });
  const small = edited.find((p) => p.handle === 'safran-herat-negin-0-5g');
  assert.equal(structuredDescription(small), null);
  assert.match(small.description, /Glas\.Herat/, 'the plain Storefront text glues the blocks together');
  const kinds = shape(small.body);
  assert.ok(kinds.includes('h2') && kinds.includes('h3'), kinds.join());
  assert.deepEqual(kinds.filter((k) => k.startsWith('list')), ['list5']);
  assert.match(productPlainText(small), /Glas\. Herat/);
  assert.doesNotMatch(productPlainText(small), /Glas\.Herat|ProduktdetailsProdukt/);
  assert.equal(productPlainText(small), blocksToText(small.body));
});

test('product.ts: V1 facts per handle add to the live text without repeating it', () => {
  for (const [handle, f] of Object.entries(productFacts)) {
    const live = factsToText(f);
    const headings = new Set([f.intro.heading, ...f.sections.map((s) => s.heading)]);
    assert.ok(f.more.length > 0, handle);
    for (const fact of f.more) {
      assert.ok(!headings.has(fact.heading), `${handle}: ${fact.heading} is a live heading`);
      assert.ok(!live.includes(fact.text), `${handle}: ${fact.heading} repeats the live text`);
      assert.doesNotMatch(fact.text, /Grade A|€/);
      if (fact.link) assert.match(fact.link.href, /^\/kontakt\//);
    }
    assert.ok(!f.more.some((m) => /Lagerung|Anwendung|Verwendung/.test(m.heading)), `${handle}: live says how to store and use it`);
  }
  assert.ok(productFacts['herat-negin-safran-1-g-grade-a'].more.some((m) => m.heading === 'Abfüllung'), 'packed in Germany: confirmed for the 1-g jar');
  assert.ok(!productFacts['safran-herat-negin-0-5g'].more.some((m) => m.heading === 'Abfüllung'), 'not confirmed for 0.5 g');
});

test('catalog: a handle unknown to product.ts keeps Shopify title and description, no facts', async () => {
  const extra = {
    id: 'gid://shopify/Product/9', handle: 'geschenkbox-5g', title: 'Geschenkbox', description: 'Text aus Shopify.',
    images: { nodes: [] },
    variants: { nodes: [{ id: 'gid://shopify/ProductVariant/9', sku: null, availableForSale: false, price: { amount: '1.5', currencyCode: 'EUR' } }] },
  };
  const fake = fixtureFetch((data) => ({ products: { nodes: [extra, ...data.products.nodes] } }));
  const catalog = await loadCatalog({ config, fetchImpl: fake.fetchImpl });
  const box = catalog.find((p) => p.handle === 'geschenkbox-5g');
  assert.equal(catalog.at(-1), box, 'unknown products follow the known ones');
  assert.equal(box.title, 'Geschenkbox');
  assert.equal(box.description, 'Text aus Shopify.');
  assert.deepEqual(box.body, textToBlocks('Text aus Shopify.'), 'without descriptionHtml one paragraph per line of text');
  assert.equal(box.facts, null);
  assert.equal(box.image, null);
  assert.equal(box.available, false);
  assert.equal(catalog.find((p) => p.handle === 'gibt-es-nicht'), undefined);
});

test('catalog: an API error stops the build with a clear message', async () => {
  const http = async () => new Response('nope', { status: 401 });
  await assert.rejects(loadCatalog({ config, fetchImpl: http }), /Shopify-Katalog konnte nicht geladen werden \(http: Storefront answered 401\)\. Build abgebrochen/);
  const offline = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(loadCatalog({ config, fetchImpl: offline }), /\(network: Storefront not reachable\)/);
  await assert.rejects(loadCatalog({ config: { ...config, domain: 'https://x' }, fetchImpl: http }), /Invalid store domain/);
});

/** A second variant for the 0.5 g product, as Shopify would list it. */
const withSecondVariant = (data) => {
  const product = data.products.nodes.find((n) => n.handle === 'safran-herat-negin-0-5g');
  product.variants.nodes.push({ ...product.variants.nodes[0], id: 'gid://shopify/ProductVariant/2', sku: 'RS-SAF-HN-1G-B' });
  return data;
};

test('catalog: a product with more than one variant stops the build and names the handle (B3)', async () => {
  await assert.rejects(
    loadCatalog({ config, fetchImpl: fixtureFetch(withSecondVariant).fetchImpl }),
    /Shopify-Produkt mit mehr als einer Variante: safran-herat-negin-0-5g\. .*Build abgebrochen/,
  );
  const catalog = await loadCatalog({ config, fetchImpl: fixtureFetch().fetchImpl });
  const recordedVariant = (handle) => fixture.data.products.nodes.find((n) => n.handle === handle).variants.nodes[0].id;
  for (const p of catalog) assert.equal(p.variantId, recordedVariant(p.handle), p.handle);
});

/** Like fixtureFetch, the answer carrying X-Shopify-API-Version when given. */
const versionFetch = (version) => async () =>
  new Response(JSON.stringify({ data: structuredClone(fixture.data) }), { status: 200, headers: version ? { 'X-Shopify-API-Version': version } : {} });

test('API version: same header passes, a different one stops the build with both versions, a missing one passes (B5)', async () => {
  assert.equal((await loadCatalog({ config, fetchImpl: versionFetch('2026-07') })).length, 2);
  assert.equal((await loadCatalog({ config, fetchImpl: versionFetch(null) })).length, 2);
  await assert.rejects(
    loadCatalog({ config, fetchImpl: versionFetch('2026-10') }),
    /Shopify-Katalog konnte nicht geladen werden \(version: API version 2026-07 requested, Shopify answered with 2026-10\)\. Build abgebrochen/,
  );
  assert.throws(() => checkApiVersion('2026-07', '2027-01'), (e) => e instanceof CommerceError && e.kind === 'version');
  assert.doesNotThrow(() => checkApiVersion('2026-07', null));
});

test('API version: only the build checks it, cart requests in the browser do not', async () => {
  const fake = fakeStorefront();
  const storefront = createStorefront(config, async (url, init) => {
    const response = await fake.fetchImpl(url, init);
    return new Response(await response.text(), { status: response.status, headers: { 'X-Shopify-API-Version': '2026-10' } });
  });
  assert.equal((await storefront.product('herat-negin-safran-1-g-grade-a')).variants.length, 1);
  assert.equal((await storefront.cartCreate([])).totalQuantity, 0);
});

test('API version: written in the code at exactly one place (src/lib/commerce/config.ts)', async () => {
  const root = new URL('../src/', import.meta.url);
  const hits = [];
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.(ts|mjs|js|astro)$/.test(entry.name)) continue;
    const path = `${entry.parentPath}/${entry.name}`.replace(/\\/g, '/');
    // A quoted Shopify version such as '2026-07' (quarters 01, 04, 07, 10).
    if (/['"`]20\d\d-(?:01|04|07|10)['"`]/.test(await readFile(path, 'utf8'))) hits.push(path.slice(path.indexOf('/src/') + 1));
  }
  assert.deepEqual(hits, ['src/lib/commerce/config.ts']);
});

test('formatPrice: German format as Shopify amounts arrive', () => {
  assert.equal(nbsp(formatPrice({ amount: '12.9', currencyCode: 'EUR' })), '12,90 €');
  assert.equal(nbsp(formatPrice({ amount: '8.9', currencyCode: 'EUR' })), '8,90 €');
  assert.equal(nbsp(formatPrice({ amount: '8.90', currencyCode: 'EUR' })), '8,90 €');
});

test('product.ts holds descriptive facts per live handle only: no shopifyHandle, no price', () => {
  assert.deepEqual(Object.keys(productFacts).sort(), ['herat-negin-safran-1-g-grade-a', 'safran-herat-negin-0-5g']);
  const text = JSON.stringify(productFacts);
  assert.doesNotMatch(text, /shopifyHandle|price|preis|€|Grade A/i);
});

// ------------------------------------------------- product pages: SKU, Product schema, og:image

const origin = 'https://example.test';
const ONE_G = 'herat-negin-safran-1-g-grade-a';
const HALF_G = 'safran-herat-negin-0-5g';
const recordedSku = (handle) => fixture.data.products.nodes.find((n) => n.handle === handle).variants.nodes[0].sku;

test('catalog: SKU of the first variant with a store, null without one or when Shopify has none', async () => {
  const catalog = await loadCatalog({ config, fetchImpl: fixtureFetch().fetchImpl });
  assert.deepEqual(Object.fromEntries(catalog.map((p) => [p.handle, p.sku])), { [HALF_G]: 'RS-SAF-HN-05', [ONE_G]: 'RS-SAF-HN-1G' });
  for (const p of catalog) assert.equal(p.sku, recordedSku(p.handle), p.handle);
  for (const p of await loadCatalog({ config: null })) assert.equal(p.sku, null, p.handle);
  for (const empty of ['', '  ', null]) {
    const blank = await loadCatalog({
      config,
      fetchImpl: fixtureFetch((data) => {
        data.products.nodes[0].variants.nodes[0].sku = empty;
        return data;
      }).fetchImpl,
    });
    assert.equal(blank.find((p) => p.handle === ONE_G).sku, null, JSON.stringify(empty));
  }
});

test('product schema with a store: buildProduct gets SKU, offer, image and facts from the catalog', async () => {
  const catalog = await loadCatalog({ config, fetchImpl: fixtureFetch().fetchImpl });
  const large = catalog.find((p) => p.handle === ONE_G);
  const input = productSchemaInput(large, origin);
  assert.equal(input.path, `/produkte/${ONE_G}/`);
  assert.equal(input.name, large.title);
  assert.equal(input.description, productPlainText(large));
  assert.equal(productPlainText(large), productFacts[ONE_G].intro.text.replace(/\s+/g, ' ').trim(), 'structure known: the opening paragraph');
  const ld = buildProduct(input);
  assert.equal(ld['@type'], 'Product');
  assert.equal(ld.url, `${origin}/produkte/${ONE_G}/`);
  assert.equal(ld.name, large.title);
  assert.equal(ld.sku, 'RS-SAF-HN-1G');
  assert.equal(ld.mpn, ld.sku);
  assert.deepEqual(ld.image, [large.image.url]);
  assert.match(ld.image[0], /^https:\/\/cdn\.shopify\.com\/.+\?v=\d+$/, 'absolute Shopify URL');
  assert.equal(ld.offers.price, '12.90', 'two decimals, as Shopify sends 12.9');
  assert.equal(ld.offers.priceCurrency, 'EUR');
  assert.equal(ld.offers.itemCondition, 'https://schema.org/NewCondition');
  assert.equal(ld.offers.availability, 'https://schema.org/InStock');
  assert.equal(ld.offers.url, ld.url);
  assert.equal(ld.category, 'Gewürze');
  assert.deepEqual(ld.countryOfOrigin, { '@type': 'Country', name: 'Afghanistan' });
  assert.deepEqual(ld.weight, { '@type': 'QuantitativeValue', value: 1, unitCode: 'GRM' });
  const small = buildProduct(productSchemaInput(catalog.find((p) => p.handle === HALF_G), origin));
  assert.equal(small.sku, 'RS-SAF-HN-05');
  assert.equal(small.offers.price, '8.90');
  assert.equal(small.weight.value, 0.5);
});

test('product schema: sold out is OutOfStock; a product without facts has no category, origin or weight', async () => {
  const extra = {
    id: 'gid://shopify/Product/9', handle: 'geschenkbox-5g', title: 'Geschenkbox', description: 'Text aus Shopify.',
    images: { nodes: [] },
    variants: { nodes: [{ id: 'gid://shopify/ProductVariant/9', sku: 'RS-BOX-5', availableForSale: false, price: { amount: '1.5', currencyCode: 'EUR' } }] },
  };
  const catalog = await loadCatalog({ config, fetchImpl: fixtureFetch((data) => ({ products: { nodes: [extra, ...data.products.nodes] } })).fetchImpl });
  const box = catalog.find((p) => p.handle === 'geschenkbox-5g');
  const ld = buildProduct(productSchemaInput(box, origin));
  assert.equal(ld.offers.availability, 'https://schema.org/OutOfStock');
  assert.equal(ld.offers.price, '1.50');
  assert.equal(ld.sku, 'RS-BOX-5');
  assert.equal(ld.description, 'Text aus Shopify.', 'structure unknown: the Shopify text');
  assert.deepEqual(ld.image, [`${origin}/og.jpg`], 'no Shopify image: the site image');
  for (const key of ['category', 'countryOfOrigin', 'weight']) assert.equal(key in ld, false, key);
});

test('product schema without a store: no offer, no SKU or MPN, the site image', async () => {
  for (const p of await loadCatalog({ config: null })) {
    const input = productSchemaInput(p, origin);
    assert.equal(input.offer, null, p.handle);
    const ld = buildProduct(input);
    for (const key of ['offers', 'sku', 'mpn']) assert.equal(key in ld, false, `${p.handle}: ${key}`);
    assert.deepEqual(ld.image, [`${origin}/og.jpg`]);
    assert.equal(ld.category, 'Gewürze');
    assert.equal(ld.weight.value, p.facts.netGrams);
    assert.equal(ld.description, productPlainText(p));
  }
});

test('og:image of a product page: the Shopify image cut to 1200 × 630, its v parameter kept', async () => {
  const catalog = await loadCatalog({ config, fetchImpl: fixtureFetch().fetchImpl });
  // The recorded 0.5 g image is 1024 × 1536: the CDN would deliver 420 × 630, so the page keeps og.jpg.
  const half = catalog.find((p) => p.handle === HALF_G);
  assert.equal(half.image.width < 1200, true, 'the recorded 0.5 g image is narrower than 1200');
  assert.equal(productOgImage(half), null, 'smaller than 1200 × 630: no Shopify og:image');
  assert.equal(productOgImage({ ...half, image: { ...half.image, width: 1200, height: 630 } }) === null, false, 'exactly 1200 × 630 is enough');
  const large = catalog.filter((c) => c.image.width >= 1200 && c.image.height >= 630);
  assert.deepEqual(large.map((p) => p.handle), [ONE_G]);
  for (const p of large) {
    const og = productOgImage(p);
    const url = new URL(og.src);
    const original = new URL(p.image.url);
    assert.ok(original.searchParams.get('v'), `${p.handle}: the recorded URL has a v parameter`);
    assert.equal(`${url.origin}${url.pathname}`, `${original.origin}${original.pathname}`);
    assert.equal(url.searchParams.get('v'), original.searchParams.get('v'));
    assert.equal(url.searchParams.get('width'), '1200');
    assert.equal(url.searchParams.get('height'), '630');
    assert.equal(url.searchParams.get('crop'), 'center');
    assert.equal(og.width, 1200);
    assert.equal(og.height, 630);
  }
  // A width already in the URL is replaced, not repeated.
  const sized = productOgImage({ ...large[0], image: { ...large[0].image, url: 'https://cdn.shopify.com/s/files/x.png?v=1&width=300' } });
  assert.deepEqual(new URL(sized.src).searchParams.getAll('width'), ['1200']);
  for (const p of await loadCatalog({ config: null })) assert.equal(productOgImage(p), null, p.handle);
});
