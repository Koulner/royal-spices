// tools/qa/seo.mjs reads the Shopify store domain for S7 with Vite's loadEnv (T-20261018-09), like
// astro.config.mjs does for the CSP: a domain from .env makes the store and CDN requests allowed, and
// the process environment wins. Each case runs in a child process whose working directory holds only
// the .env of that case, and passes that directory to storeDomainFromEnv.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const seoUrl = new URL('../tools/qa/seo.mjs', import.meta.url).href;
const checksUrl = new URL('../tools/seo/checks.mjs', import.meta.url).href;
const STORE = 'beispiel-test.myshopify.com';
// What a page with store sends: own origin, Storefront API, product image.
const REQUESTS = ['http://127.0.0.1:4322/produkte/', `https://${STORE}/api/2026-07/graphql.json`, 'https://cdn.shopify.com/s/files/1/glas.png'];
const PRINT = `const { storeDomainFromEnv } = await import(${JSON.stringify(seoUrl)});
const { checkRequests } = await import(${JSON.stringify(checksUrl)});
const storeDomain = storeDomainFromEnv(process.cwd());
const s7 = checkRequests(${JSON.stringify(REQUESTS)}, { self: ['127.0.0.1:4322', 'royalspices.de'], storeDomain });
console.log(JSON.stringify({ storeDomain, s7 }));`;

// Removed from the inherited environment, so that only the case decides.
const OWN = ['PUBLIC_SHOPIFY_STORE_DOMAIN', 'PUBLIC_SHOPIFY_STOREFRONT_TOKEN', 'PUBLIC_SHOPIFY_API_VERSION', 'SITE_URL'];

async function s7({ dotenv, env = {} } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'rs-seo-env-'));
  try {
    if (dotenv !== undefined) await writeFile(join(dir, '.env'), dotenv);
    const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => !OWN.includes(key)));
    const { stdout } = await run(process.execPath, ['--input-type=module', '-e', PRINT], { cwd: dir, env: { ...inherited, ...env } });
    return JSON.parse(stdout.trim().split('\n').at(-1));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('S7: a store domain only in .env is allowed', async () => {
  const result = await s7({ dotenv: `PUBLIC_SHOPIFY_STORE_DOMAIN=${STORE}\nPUBLIC_SHOPIFY_STOREFRONT_TOKEN=platzhalter\n` });
  assert.equal(result.storeDomain, STORE);
  assert.deepEqual(result.s7, []);
});

test('S7: a store domain from the process environment is allowed', async () => {
  const result = await s7({ env: { PUBLIC_SHOPIFY_STORE_DOMAIN: STORE } });
  assert.equal(result.storeDomain, STORE);
  assert.deepEqual(result.s7, []);
});

test('S7: the process environment wins over .env', async () => {
  const result = await s7({ dotenv: 'PUBLIC_SHOPIFY_STORE_DOMAIN=alt.myshopify.com\n', env: { PUBLIC_SHOPIFY_STORE_DOMAIN: STORE } });
  assert.equal(result.storeDomain, STORE);
  assert.deepEqual(result.s7, []);
});

test('S7: without a store domain the store requests stay third-party', async () => {
  const result = await s7();
  assert.equal(result.storeDomain, null);
  assert.equal(result.s7.length, 1);
  assert.match(result.s7[0].message, new RegExp(STORE.replaceAll('.', '\\.')));
});

test('.env.example: SITE_URL is documented as process environment only, the Shopify values as .env or process', async () => {
  const example = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
  assert.doesNotMatch(example, /^SITE_URL=/m, 'an active SITE_URL line would suggest that .env sets it');
  assert.match(example, /process environment only[^\n]*\.env is ignored[\s\S]*?\n# SITE_URL=/);
  assert.match(example, /PUBLIC_SHOPIFY_STORE_DOMAIN/);
  assert.match(example, /\.env or in the process environment, which wins/);
});
