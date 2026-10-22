// 301 table for the old Shopify shop and retired V1 paths (src/config/redirects.mjs), and the way
// server.mjs answers them. The server test runs server.mjs against a stub build, so no build is needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REDIRECTS, redirectTarget, normalizePath } from '../src/config/redirects.mjs';

// Expected table, written out independently of the module (docs/LIVE-INVENTAR.md, Abgleichliste).
const EXPECTED = {
  '/collections/safran': '/produkte/', // P1
  '/collections/all': '/produkte/', // Q11, target of "Weiter shoppen"
  '/collections/frontpage': '/produkte/', // W1, Shopify default collection
  '/pages/herkunft-qualitat': '/herkunft-qualitaet/', // Q1
  '/pages/catering': '/catering/', // Q2
  '/pages/b2b-zusammenarbeit': '/b2b/', // Q3
  '/pages/ueber-uns': '/ueber-uns/', // Q4
  '/pages/contact': '/kontakt/', // Q5
  '/pages/faq': '/faq/', // Q6
  '/pages/versand-lieferung': '/versand-lieferung/', // Q7
  '/pages/impressum': '/impressum/', // Q8
  '/policies/privacy-policy': '/datenschutz/', // Q9
  '/policies/legal-notice': '/impressum/', // Q10
  '/policies/shipping-policy': '/versand-lieferung/', // Q10
  '/policies/contact-information': '/kontakt/', // Shopify policy path, 404 on live
  '/cart': '/produkte/', // Q11
  '/search': '/produkte/', // Q11, decision O3: no search
  '/blogs/news': '/', // Q11, blog was empty
  '/handel': '/b2b/', // retired V1
  '/gastronomie': '/b2b/', // retired V1
  '/produkte/safran-negin-1g': '/produkte/herat-negin-safran-1-g-grade-a/', // retired V1
};

const LIVE_HANDLES = ['herat-negin-safran-1-g-grade-a', 'safran-herat-negin-0-5g']; // P2, P3

const V1_PAGES = new Set([
  '/', '/produkte/', '/herkunft-qualitaet/', '/catering/', '/b2b/', '/ueber-uns/', '/kontakt/',
  '/faq/', '/versand-lieferung/', '/impressum/', '/datenschutz/', '/anfrage/',
]);
const isV1Target = (path) => V1_PAGES.has(path) || /^\/produkte\/[a-z0-9][a-z0-9-]*\/$/.test(path);

test('the table holds exactly the expected rows', () => {
  assert.deepEqual([...REDIRECTS.keys()].sort(), Object.keys(EXPECTED).sort());
});

test('every table row redirects, tolerant of case and trailing slash', () => {
  for (const [from, to] of Object.entries(EXPECTED)) {
    assert.equal(redirectTarget(from), to, from);
    assert.equal(redirectTarget(`${from}/`), to, `${from}/`);
    assert.equal(redirectTarget(`${from}//`), to, `${from}//`);
    assert.equal(redirectTarget(from.toUpperCase()), to, from.toUpperCase());
  }
});

test('every target is a V1 page and is not redirected again', () => {
  for (const to of REDIRECTS.values()) {
    assert.ok(isV1Target(to), to);
    assert.equal(redirectTarget(to), null, to);
  }
});

test('Shopify product URLs map to /produkte/<handle>/', () => {
  for (const handle of LIVE_HANDLES) {
    assert.equal(redirectTarget(`/products/${handle}`), `/produkte/${handle}/`);
    assert.equal(redirectTarget(`/products/${handle}/`), `/produkte/${handle}/`);
    assert.equal(redirectTarget(`/Products/${handle.toUpperCase()}`), `/produkte/${handle}/`);
    assert.equal(redirectTarget(`/collections/safran/products/${handle}`), `/produkte/${handle}/`);
    assert.equal(redirectTarget(`/collections/all/products/${handle}/`), `/produkte/${handle}/`);
  }
  assert.equal(redirectTarget('/products/geschenkbox-5g'), '/produkte/geschenkbox-5g/');
  assert.ok(isV1Target(redirectTarget('/products/any-handle-1')));
});

test('anything that is not a plain product handle is left alone', () => {
  for (const path of [
    '/products', '/products/', '/products/a/b', '/products/x.json', '/products/x.js',
    '/products/-x', '/products/%2e%2e', '/collections/safran/products/', '/collections//products/x',
  ]) {
    assert.equal(redirectTarget(path), null, path);
  }
});

test('unknown and current paths are not redirected', () => {
  for (const path of [
    '/', '/produkte/', '/kontakt/', '/datenschutz/', '/b2b/', '/anfrage/', '/api/anfrage/',
    '/policies/terms-of-service', '/policies/refund-policy', // no terms or withdrawal page in V1: 404
    '/pages/unknown', '/collections/other', '/cart/123:1', '/blogs/news/post', '/handel/extra',
  ]) {
    assert.equal(redirectTarget(path), null, path);
  }
  assert.equal(redirectTarget(''), null);
  assert.equal(redirectTarget('pages/contact'), null);
  assert.equal(redirectTarget(undefined), null);
});

test('normalizePath lower-cases and drops trailing slashes, keeps the root', () => {
  assert.equal(normalizePath('/Pages/Contact///'), '/pages/contact');
  assert.equal(normalizePath('/'), '/');
  assert.equal(normalizePath('//'), '/');
});

// ---------------------------------------------------------------- server.mjs against a stub build

async function freePort() {
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

function fetchRaw(port, method, path) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, method, path }, (res) => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode, location: res.headers.location }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('server.mjs answers old paths with 301 before serving files and keeps the query string', async (t) => {
  const project = fileURLToPath(new URL('..', import.meta.url));
  const dir = await mkdtemp(join(tmpdir(), 'rs-redirects-'));
  let child = null;
  t.after(async () => {
    // Windows keeps the folder locked while the server runs: stop it first, then clean up
    if (child && child.exitCode === null) {
      const exited = new Promise((resolve) => child.once('exit', resolve));
      child.kill();
      await exited;
    }
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  await cp(join(project, 'server.mjs'), join(dir, 'server.mjs'));
  await cp(join(project, 'server-static.mjs'), join(dir, 'server-static.mjs')); // server.mjs imports it
  await mkdir(join(dir, 'src', 'config'), { recursive: true });
  await cp(join(project, 'src', 'config', 'redirects.mjs'), join(dir, 'src', 'config', 'redirects.mjs'));
  await cp(join(project, 'src', 'config', 'handles.mjs'), join(dir, 'src', 'config', 'handles.mjs')); // its only import
  await mkdir(join(dir, 'dist', 'server'), { recursive: true });
  await writeFile(join(dir, 'dist', 'server', 'entry.mjs'), 'export const handler = (req, res, next) => next();');
  for (const page of ['', 'produkte', 'kontakt', 'handel']) {
    await mkdir(join(dir, 'dist', 'client', page), { recursive: true });
    await writeFile(join(dir, 'dist', 'client', page, 'index.html'), `<p>${page || 'home'}</p>`);
  }
  await writeFile(join(dir, 'dist', 'client', '404.html'), '<p>404</p>');

  const port = await freePort();
  // server.mjs finds dist/ next to itself, so the stub folder needs to be neither cwd nor installed
  child = spawn(process.execPath, [join(dir, 'server.mjs')], {
    cwd: tmpdir(),
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start')), 10000);
    child.stdout.on('data', (chunk) => {
      if (String(chunk).includes('listening')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once('exit', (code) => reject(new Error(`server exited with ${code}`)));
  });

  const cases = [
    ['GET', '/pages/contact?utm_source=news&x=1', 301, '/kontakt/?utm_source=news&x=1'],
    ['GET', '/Pages/Contact/', 301, '/kontakt/'],
    ['HEAD', '/cart', 301, '/produkte/'],
    ['GET', '/handel/', 301, '/b2b/'], // a stale page in dist/ does not win over the table
    ['GET', '/products/herat-negin-safran-1-g-grade-a?variant=1', 301, '/produkte/herat-negin-safran-1-g-grade-a/?variant=1'],
    ['GET', '/policies/terms-of-service', 404, undefined],
    ['GET', '/produkte/', 200, undefined],
    ['GET', '/produkte?a=1', 301, '/produkte/?a=1'], // existing trailing-slash redirect unchanged
    ['GET', '/nicht-vorhanden', 404, undefined],
    ['POST', '/pages/contact', 405, undefined],
  ];
  for (const [method, path, status, location] of cases) {
    const res = await fetchRaw(port, method, path);
    assert.equal(res.status, status, `${method} ${path}`);
    assert.equal(res.location, location, `${method} ${path}`);
  }
});
