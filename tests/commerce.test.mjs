// Commerce layer against a stand-in for the Storefront API.
// The stand-in lives only in this test: the application itself contains no product or price data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorefront } from '../src/lib/commerce/storefront.ts';
import { createCart, formatMoney } from '../src/lib/commerce/cart.ts';
import { CommerceError } from '../src/lib/commerce/types.ts';

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
        merchandise: { id: l.merchandiseId, title: '1 g', product: { title: 'Safranfäden', handle: 'safran-negin-1g' } },
      })),
    },
  });
  const fetchImpl = async (url, init) => {
    const { query, variables } = JSON.parse(init.body);
    calls.push({ url, headers: init.headers, query, variables });
    const ok = (data) => new Response(JSON.stringify({ data }), { status: 200 });
    if (query.includes('query Product')) {
      if (variables.handle !== 'safran-negin-1g') return ok({ product: null });
      return ok({
        product: {
          id: 'gid://shopify/Product/1',
          handle: 'safran-negin-1g',
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
  const product = await storefront.product('safran-negin-1g');
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
