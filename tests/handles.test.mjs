// Shopify handles in one place (B2, T-20261018-12): src/config/handles.mjs is the only file under
// src/ that spells them out, its list of uses matches the code, and a build with a store stops when
// Shopify no longer has one of them (decision E2: stop, no fallback).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { HANDLES, HANDLE_USES, productPath, missingHandles } from '../src/config/handles.mjs';
import { loadCatalog } from '../src/lib/commerce/catalog.ts';
import { productFacts, formats } from '../src/data/product.ts';
import { redirectTarget } from '../src/config/redirects.mjs';

// The live handles, written out on purpose: the tests stay tied to the live recording.
const ONE_G = 'herat-negin-safran-1-g-grade-a';
const HALF_G = 'safran-herat-negin-0-5g';
const SOURCE = 'src/config/handles.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const config = { domain: 'example.myshopify.com', token: 'public-token', apiVersion: '2026-07' };
const fixture = JSON.parse(await readFile(new URL('./fixtures/storefront-products.json', import.meta.url), 'utf8'));

/** Answers the products query with the recorded fixture, optionally changed (as in commerce.test.mjs). */
const fixtureFetch = (change = (data) => data) => async () =>
  new Response(JSON.stringify({ data: change(structuredClone(fixture.data)) }), { status: 200 });
const without = (handle) => (data) => {
  data.products.nodes = data.products.nodes.filter((n) => n.handle !== handle);
  return data;
};

/** All files below a project folder, as project paths with forward slashes, with their text. */
async function files(dir) {
  const names = await readdir(join(root, dir), { recursive: true, withFileTypes: true });
  return Promise.all(
    names
      .filter((d) => d.isFile())
      .map(async (d) => {
        const path = join(d.parentPath ?? d.path, d.name);
        return { file: path.slice(root.length).replaceAll('\\', '/').replace(/^\//, ''), text: await readFile(path, 'utf8') };
      }),
  );
}

test('handles: the live values, frozen, with their page path', () => {
  assert.deepEqual({ ...HANDLES }, { oneGram: ONE_G, halfGram: HALF_G });
  assert.ok(Object.isFrozen(HANDLES) && Object.isFrozen(HANDLE_USES));
  assert.equal(productPath(HANDLES.oneGram), `/produkte/${ONE_G}/`);
  assert.deepEqual(Object.keys(HANDLE_USES).sort(), Object.keys(HANDLES).sort());
});

test('handles: src/ spells each handle out in handles.mjs only, the QA page lists not at all (K1)', async () => {
  const src = await files('src');
  for (const handle of [ONE_G, HALF_G]) {
    assert.deepEqual(src.filter((f) => f.text.includes(handle)).map((f) => f.file), [SOURCE], handle);
  }
  for (const qa of ['tools/qa/a11y.mjs', 'tools/qa/perf.mjs']) {
    const text = await readFile(join(root, qa), 'utf8');
    for (const handle of [ONE_G, HALF_G]) assert.ok(!text.includes(handle), `${qa}: ${handle}`);
    assert.match(text, /from '\.\.\/\.\.\/src\/config\/handles\.mjs'/, qa);
    assert.match(text, /productPath\(HANDLES\.oneGram\)/, qa);
  }
});

test('handles: the list of uses matches the code under src/', async () => {
  const src = (await files('src')).filter((f) => f.file !== SOURCE);
  for (const key of Object.keys(HANDLES)) {
    const used = src.filter((f) => new RegExp(`\\bHANDLES\\.${key}\\b`).test(f.text)).map((f) => f.file).sort();
    assert.deepEqual(used, [...HANDLE_USES[key]].sort(), key);
  }
  // No other way in: every file that names HANDLES at all is listed (catalog.ts imports only the guard).
  for (const f of src.filter((f) => /\bHANDLES\b/.test(f.text))) {
    assert.ok(Object.values(HANDLE_USES).some((uses) => uses.includes(f.file)), f.file);
  }
});

test('handles: product facts, the trade format and the retired 1-g path follow the list', () => {
  assert.deepEqual(Object.keys(productFacts), [HALF_G, ONE_G], 'order of the live collection');
  assert.equal(formats[0].action.href, `/produkte/${ONE_G}/`);
  assert.equal(redirectTarget('/produkte/safran-negin-1g'), `/produkte/${ONE_G}/`);
  assert.equal(redirectTarget('/produkte/safran-negin-1g/'), productPath(HANDLES.oneGram));
});

test('handles: missingHandles names each missing handle with its uses', () => {
  assert.deepEqual(missingHandles([ONE_G, HALF_G, 'geschenkbox-5g']), []);
  assert.deepEqual(missingHandles([HALF_G]), [{ handle: ONE_G, uses: HANDLE_USES.oneGram }]);
  assert.deepEqual(missingHandles([]).map((m) => m.handle), [ONE_G, HALF_G]);
});

test('catalog guard: a store without the 1-g product stops the build, naming handle and uses (E2)', async () => {
  await assert.rejects(loadCatalog({ config, fetchImpl: fixtureFetch(without(ONE_G)) }), (error) => {
    assert.match(error.message, /^Shopify-Handle fehlt im Katalog: herat-negin-safran-1-g-grade-a \(genutzt in /);
    for (const use of HANDLE_USES.oneGram) assert.ok(error.message.includes(use), use);
    assert.ok(error.message.includes('src/components/home/HomeCollection.astro'));
    assert.ok(!error.message.includes(HALF_G), 'only the missing one');
    assert.match(error.message, /Build abgebrochen\. .*docs\/SHOPIFY\.md, „Handles“/);
    return true;
  });
});

test('catalog guard: a store without the 0.5-g product stops the build too, both missing names both', async () => {
  await assert.rejects(
    loadCatalog({ config, fetchImpl: fixtureFetch(without(HALF_G)) }),
    /Shopify-Handle fehlt im Katalog: safran-herat-negin-0-5g \(genutzt in src\/components\/home\/HomeCollection\.astro, src\/data\/product\.ts\)\. .*Build abgebrochen/,
  );
  await assert.rejects(
    loadCatalog({ config, fetchImpl: fixtureFetch(() => ({ products: { nodes: [] } })) }),
    /fehlt im Katalog: herat-negin-safran-1-g-grade-a \(genutzt in .*\); safran-herat-negin-0-5g \(genutzt in /,
  );
});

test('catalog guard: the full store passes, extra products are fine, without a store nothing is checked', async () => {
  const full = await loadCatalog({ config, fetchImpl: fixtureFetch() });
  assert.deepEqual(full.map((p) => p.handle), [HALF_G, ONE_G]);
  const extra = { ...structuredClone(fixture.data.products.nodes[0]), id: 'gid://shopify/Product/9', handle: 'geschenkbox-5g' };
  const more = await loadCatalog({ config, fetchImpl: fixtureFetch((data) => ({ products: { nodes: [...data.products.nodes, extra] } })) });
  assert.equal(more.length, 3);
  let fetched = false;
  const offline = await loadCatalog({ config: null, fetchImpl: async () => { fetched = true; } });
  assert.equal(fetched, false);
  assert.deepEqual(offline.map((p) => p.handle), [HALF_G, ONE_G]);
});
