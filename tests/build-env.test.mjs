// astro.config.mjs reads the Shopify store domain with Vite's loadEnv (T-20261018-01): a domain from
// .env reaches the CSP (connect-src, img-src) just like one from the process environment, and the
// process environment wins. Each case loads the real config in a child process whose working
// directory holds only the .env of that case.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const configUrl = new URL('../astro.config.mjs', import.meta.url).href;
const PRINT = `const { default: c } = await import(${JSON.stringify(configUrl)});
console.log(JSON.stringify({ site: c.site, directives: c.security.csp.directives }));`;

// Removed from the inherited environment, so that only the case decides.
const OWN = ['PUBLIC_SHOPIFY_STORE_DOMAIN', 'PUBLIC_SHOPIFY_STOREFRONT_TOKEN', 'PUBLIC_SHOPIFY_API_VERSION', 'SITE_URL'];

async function loadConfig({ dotenv, env = {} } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'rs-build-env-'));
  try {
    if (dotenv !== undefined) await writeFile(join(dir, '.env'), dotenv);
    const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => !OWN.includes(key)));
    const { stdout } = await run(process.execPath, ['--input-type=module', '-e', PRINT], {
      cwd: dir,
      env: { ...inherited, NODE_ENV: 'production', ...env },
    });
    const { site, directives } = JSON.parse(stdout.trim().split('\n').at(-1));
    const directive = (name) => directives.find((d) => d.startsWith(`${name} `));
    return { site, connect: directive('connect-src'), img: directive('img-src') };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const STORE = 'beispiel-test.myshopify.com';
const CDN = "img-src 'self' data: blob: https://cdn.shopify.com";

test('without a store the policy stays same-origin', async () => {
  const config = await loadConfig();
  assert.equal(config.connect, "connect-src 'self'");
  assert.equal(config.img, "img-src 'self' data: blob:");
  assert.equal(config.site, 'https://royalspices.de');
});

test('a store domain from .env reaches connect-src and img-src', async () => {
  const config = await loadConfig({ dotenv: `PUBLIC_SHOPIFY_STORE_DOMAIN=${STORE}\nPUBLIC_SHOPIFY_STOREFRONT_TOKEN=platzhalter\n` });
  assert.equal(config.connect, `connect-src 'self' https://${STORE}`);
  assert.equal(config.img, CDN);
});

test('a store domain from the process environment works as before', async () => {
  const config = await loadConfig({ env: { PUBLIC_SHOPIFY_STORE_DOMAIN: STORE, PUBLIC_SHOPIFY_STOREFRONT_TOKEN: 'platzhalter' } });
  assert.equal(config.connect, `connect-src 'self' https://${STORE}`);
  assert.equal(config.img, CDN);
});

test('the process environment wins over .env', async () => {
  const config = await loadConfig({ dotenv: 'PUBLIC_SHOPIFY_STORE_DOMAIN=alt.myshopify.com\n', env: { PUBLIC_SHOPIFY_STORE_DOMAIN: STORE } });
  assert.equal(config.connect, `connect-src 'self' https://${STORE}`);
});

test('site still comes from the process environment only (the SEO tools parse that line)', async () => {
  assert.equal((await loadConfig({ env: { SITE_URL: 'https://vorschau.example' } })).site, 'https://vorschau.example');
  assert.equal((await loadConfig({ dotenv: 'SITE_URL=https://vorschau.example\n' })).site, 'https://royalspices.de');
});
