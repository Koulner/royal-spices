// .htaccess generator for IONOS (tools/ionos/htaccess.mjs): the rules it writes must answer like
// server.mjs. The redirect rules are replayed here in JavaScript against redirectTarget(); the real
// Apache check is tools/ionos/check.mjs plus `seo.mjs --redirects` against a container (docs/HOSTING-IONOS.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildHtaccess, SECURITY_HEADERS, HSTS } from '../tools/ionos/htaccess.mjs';
import { REDIRECTS, redirectTarget } from '../src/config/redirects.mjs';
import { HANDLES } from '../src/config/handles.mjs';
import { TYPES, cacheControl } from '../server-static.mjs';

const ORIGIN = 'https://royalspices.de';
const HANDLE_LIST = Object.values(HANDLES);
const htaccess = buildHtaccess({ origin: ORIGIN, productHandles: HANDLE_LIST });

/** Rewrite rules as Apache reads them, in order, each with the conditions written above it. */
function parseRules(text) {
  const rules = [];
  let conds = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('RewriteCond ')) {
      const [, subject, pattern] = line.split(/\s+/);
      conds.push({ subject, pattern });
    } else if (line.startsWith('RewriteRule ')) {
      const [, pattern, target, flags = ''] = line.split(/\s+/);
      rules.push({ pattern, target, flags: flags.replace(/^\[|\]$/g, '').split(','), conds });
      conds = [];
    }
  }
  return rules;
}

/**
 * Replays the rules for a GET of `path` on the canonical host over HTTPS, for a path that is not a
 * folder on disk. Returns the redirect target, `404`, or null when Apache would serve the path as is.
 */
function replay(rules, path) {
  const local = path.slice(1);
  for (const rule of rules) {
    const negate = rule.pattern.startsWith('!');
    const regex = new RegExp(negate ? rule.pattern.slice(1) : rule.pattern, rule.flags.includes('NC') ? 'i' : '');
    const match = regex.exec(local);
    if (negate ? match : !match) continue;
    let applies = true;
    for (const cond of rule.conds) {
      if (cond.subject === '$1') applies &&= new RegExp(cond.pattern).test(match[1]);
      else if (cond.subject === '%{REQUEST_URI}') {
        const neg = cond.pattern.startsWith('!');
        applies &&= new RegExp(neg ? cond.pattern.slice(1) : cond.pattern).test(path) !== neg;
      }
      // server variables: true only for conditions that a canonical HTTPS GET of a file fails
      else applies = false;
    }
    if (!applies) continue;
    if (rule.flags.includes('R=404')) return 404;
    if (rule.flags.includes('R=301')) return rule.target.replace('$1', match[1] ?? '');
  }
  return null;
}

const rules = parseRules(htaccess);

function corpus() {
  const paths = new Set(['/', '/kontakt/', '/produkte/', '/produkte/unbekannt/', '/products/', '/products/foo.json', '/products/foo.js',
    '/policies/refund-policy', '/policies/terms-of-service', '/collections/', '/collections/safran/products/', '/products/a/b']);
  for (const key of REDIRECTS.keys()) {
    for (const p of [key, key + '/', key + '//', key.toUpperCase(), key.toUpperCase() + '/']) paths.add(p);
  }
  for (const handle of [...HANDLE_LIST, 'neu-im-shop-2']) {
    for (const prefix of ['/products/', '/collections/safran/products/', '/Collections/All/Products/', '/COLLECTIONS/frontpage/products/']) {
      paths.add(prefix + handle);
      paths.add(prefix + handle + '/');
      if (HANDLE_LIST.includes(handle)) paths.add(prefix + handle.toUpperCase());
    }
  }
  return [...paths];
}

test('every redirect of redirects.mjs has exactly one rule', () => {
  for (const [from, to] of REDIRECTS) {
    const hits = rules.filter((r) => r.target === ORIGIN + to && new RegExp(r.pattern, 'i').test(from.slice(1)));
    assert.equal(hits.length, 1, from);
  }
});

test('replayed rules answer like redirectTarget() (one hop, absolute target on the canonical origin)', () => {
  for (const path of corpus()) {
    const expected = redirectTarget(path);
    const got = replay(rules, path);
    assert.equal(got, expected === null ? null : ORIGIN + expected, path);
  }
});

test('known deviation: an unknown product handle in upper case is not redirected (404 instead of a hop to 404)', () => {
  assert.equal(replay(rules, '/products/Neu-Im-Shop'), null);
  assert.equal(redirectTarget('/products/Neu-Im-Shop'), '/produkte/neu-im-shop/');
});

test('every line of tools/seo/legacy-urls.txt is covered', async () => {
  const list = await readFile(new URL('../tools/seo/legacy-urls.txt', import.meta.url), 'utf8');
  let count = 0;
  for (const line of list.split('\n')) {
    const entry = line.trim();
    if (!entry || entry.startsWith('#')) continue;
    count += 1;
    const [old, target] = entry.split(/\s+/);
    const [path, query] = old.split('?');
    const got = replay(rules, path);
    if (target === '404') assert.equal(got, null, old);
    else if (target) assert.equal(got && got + (query ? `?${query}` : ''), ORIGIN + target, old);
    else assert.ok(got, old);
  }
  assert.ok(count >= 35, `only ${count} entries`);
});

test('hidden files and stray PHP answer 404, the inquiry endpoint does not', () => {
  assert.equal(replay(rules, '/.env'), 404);
  assert.equal(replay(rules, '/img/.git/config'), 404);
  assert.equal(replay(rules, '/shell.php'), 404);
  assert.equal(replay(rules, '/api/anfrage/x.PHP'), 404);
  assert.equal(replay(rules, '/.well-known/security.txt'), null);
});

test('security headers are the ones of server.mjs', async () => {
  const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');
  const block = server.slice(server.indexOf('const SECURITY_HEADERS'), server.indexOf('};', server.indexOf('const SECURITY_HEADERS')));
  const fromServer = Object.fromEntries([...block.matchAll(/'([a-z-]+)': (['"])(.*)\2,/g)].map((m) => [m[1], m[3]]));
  const ours = Object.fromEntries(Object.entries(SECURITY_HEADERS).map(([k, v]) => [k.toLowerCase(), v]));
  assert.deepEqual(ours, fromServer);
  assert.ok(server.includes(`'${HSTS}'`), 'HSTS value as in server.mjs');
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) assert.ok(htaccess.includes(`Header always set ${name} "${value}"`), name);
});

test('content types and cache policy follow server-static.mjs', () => {
  for (const [ext, type] of Object.entries(TYPES)) assert.ok(htaccess.includes(`AddType "${type}" ${ext}`), ext);
  for (const path of ['/_astro/a.js', '/video/a.mp4', '/hero/a.webp', '/img/a.avif', '/kontakt/', '/robots.txt']) {
    assert.ok(htaccess.includes(`Header set Cache-Control "${cacheControl(path)}"`), path);
  }
});

test('only modules and directives a shared Apache allows', () => {
  assert.doesNotMatch(htaccess, /RewriteMap|<Directory|<VirtualHost|LoadModule|php_value|php_flag/);
  assert.equal(buildHtaccess({ origin: ORIGIN, productHandles: HANDLE_LIST }), htaccess, 'deterministic');
  assert.throws(() => buildHtaccess({ origin: 'https://royalspices.de/sub/' }));
  assert.throws(() => buildHtaccess({ origin: ORIGIN, productHandles: ['Bad Handle'] }));
});

test('http origin (local container) skips the HTTPS rule but keeps the host rule', () => {
  const local = buildHtaccess({ origin: 'http://localhost:8089' });
  assert.doesNotMatch(local, /%\{HTTPS\} !=on/);
  assert.match(local, /RewriteCond %\{HTTP_HOST\} !=localhost:8089/);
  assert.match(htaccess, /RewriteCond %\{HTTPS\} !=on/);
});
