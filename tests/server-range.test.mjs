// Static delivery in server-static.mjs: byte ranges for self-hosted video (/video/*.mp4, Safari needs 206),
// and the guarantee that every other file type is answered exactly as before. send() runs here behind a
// plain http server, so no build is needed; one test runs the real server.mjs against a stub build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { COMPRESSIBLE, STREAMED, TYPES, cacheControl, parseRange, send } from '../server-static.mjs';

const project = fileURLToPath(new URL('..', import.meta.url));
const SIZE = 65536; // the test video: 64 kB of random bytes
const VIDEO = '/video/clip-3f9a1c.mp4';

// ---------------------------------------------------------------- helpers

function get(port, method, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers, agent: false }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, rawHeaders: res.rawHeaders, body: Buffer.concat(chunks) }));
    });
    req.setTimeout(10000, () => req.destroy(new Error(`timeout: ${method} ${path}`)));
    req.on('error', reject);
    req.end();
  });
}

async function freePort() {
  const probe = createNetServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

// A folder of files plus an http server that hands each of them to send(), the way server.mjs does.
async function staticServer(t, files) {
  const dir = await mkdtemp(join(tmpdir(), 'rs-range-'));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(dir, path, '..'), { recursive: true });
    await writeFile(join(dir, path), content);
  }
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const file = join(dir, decodeURIComponent(pathname));
      await send(req, res, { file, info: await stat(file) }, pathname);
    } catch (error) {
      res.writeHead(500).end(String(error));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });
  return { port: server.address().port, dir };
}

const video = randomBytes(SIZE);
const etagOf = async (file) => {
  const info = await stat(file);
  return `W/"${info.size.toString(16)}-${Math.round(info.mtimeMs).toString(16)}"`;
};

// ---------------------------------------------------------------- tables

test('mp4 is known as video/mp4, streamed, and never compressible', () => {
  assert.equal(TYPES['.mp4'], 'video/mp4');
  assert.ok(STREAMED.has('.mp4'));
  assert.ok(!COMPRESSIBLE.has('.mp4'));
  // the existing types are untouched
  assert.equal(TYPES['.html'], 'text/html; charset=utf-8');
  assert.equal(TYPES['.avif'], 'image/avif');
  assert.equal(TYPES['.woff2'], 'font/woff2');
});

test('cacheControl: /video/ is immutable, every other path keeps its policy', () => {
  const IMMUTABLE = 'public, max-age=31536000, immutable';
  assert.equal(cacheControl('/video/clip-3f9a1c.mp4'), IMMUTABLE);
  assert.equal(cacheControl('/video/poster-1a2b3c.avif'), IMMUTABLE);
  assert.equal(cacheControl('/_astro/index.4f2a.css'), IMMUTABLE);
  const WEEK = 'public, max-age=604800, stale-while-revalidate=86400';
  assert.equal(cacheControl('/hero/5/frame-001.avif'), WEEK);
  assert.equal(cacheControl('/img/stills/a.webp'), WEEK);
  assert.equal(cacheControl('/produkte/'), 'public, max-age=0, must-revalidate');
  assert.equal(cacheControl('/404.html'), 'public, max-age=0, must-revalidate');
  assert.equal(cacheControl('/'), 'public, max-age=0, must-revalidate');
  assert.equal(cacheControl('/favicon.svg'), 'public, max-age=3600');
  assert.equal(cacheControl('/robots.txt'), 'public, max-age=3600');
  assert.equal(cacheControl('/videos/clip.mp4'), 'public, max-age=3600'); // only the /video/ folder
  assert.equal(cacheControl('/media/video/clip.mp4'), 'public, max-age=3600');
});

test('parseRange: single byte ranges, clamped to the file; the rest is ignored or refused', () => {
  const n = 1000;
  const ok = (header, start, end) => assert.deepEqual(parseRange(header, n), { start, end }, header);
  ok('bytes=0-1023', 0, 999); // end past the file is clamped
  ok('bytes=0-499', 0, 499);
  ok('bytes=500-999', 500, 999);
  ok('bytes=500-', 500, 999);
  ok('bytes=-100', 900, 999);
  ok('bytes=-5000', 0, 999); // suffix longer than the file is the whole file
  ok('bytes=0-0', 0, 0);
  ok('bytes=999-999', 999, 999);
  ok('BYTES=10-19', 10, 19); // the unit is case-insensitive
  ok('bytes= 10-19 ', 10, 19);
  ok('bytes=0-99999999999999999999999', 0, 999);
  for (const header of ['bytes=1000-', 'bytes=1000-1005', 'bytes=2000-', 'bytes=-0', 'bytes=-', 'bytes=', 'bytes=5-2', 'bytes=abc', 'bytes=1-2-3', 'bytes=--5', 'bytes=-5-', 'bytes=0x10-20']) {
    assert.equal(parseRange(header, n), 'unsatisfiable', header);
  }
  assert.equal(parseRange('bytes=0-0', 0), 'unsatisfiable'); // empty file
  assert.equal(parseRange('bytes=-1', 0), 'unsatisfiable');
  // several ranges and foreign units are answered with the whole file
  assert.equal(parseRange('bytes=0-10,20-30', n), null);
  assert.equal(parseRange('bytes=0-10, 20-30', n), null);
  assert.equal(parseRange('items=0-10', n), null);
  assert.equal(parseRange('garbage', n), null);
});

// ---------------------------------------------------------------- video over http

test('mp4 without Range: 200, the whole file, Accept-Ranges, no compression', async (t) => {
  const { port } = await staticServer(t, { [VIDEO]: video });
  const res = await get(port, 'GET', VIDEO, { 'accept-encoding': 'br, gzip' });
  assert.equal(res.status, 200);
  assert.equal(res.headers['content-type'], 'video/mp4');
  assert.equal(res.headers['accept-ranges'], 'bytes');
  assert.equal(res.headers['content-length'], String(SIZE));
  assert.equal(res.headers['cache-control'], 'public, max-age=31536000, immutable');
  assert.match(res.headers.etag, /^W\/"10000-[0-9a-f]+"$/);
  assert.equal(res.headers['content-encoding'], undefined);
  assert.equal(res.headers.vary, undefined);
  assert.equal(res.headers['content-range'], undefined);
  assert.ok(res.body.equals(video));
});

test('mp4 with Range: 206, Content-Range, Content-Length and exactly the requested bytes', async (t) => {
  const { port } = await staticServer(t, { [VIDEO]: video });
  const cases = [
    ['bytes=0-1023', 0, 1023],
    ['bytes=0-1', 0, 1], // the probe Safari sends first
    ['bytes=0-0', 0, 0],
    ['bytes=20000-20999', 20000, 20999], // a range in the middle
    ['bytes=1000-', 1000, SIZE - 1], // to the end
    ['bytes=-500', SIZE - 500, SIZE - 1], // the last 500 bytes
    ['bytes=65000-70000', 65000, SIZE - 1], // end beyond the file is clamped
    ['bytes=0-65535', 0, SIZE - 1], // the whole file asked for as a range stays a 206
    ['Bytes=5-9', 5, 9],
  ];
  for (const [header, a, b] of cases) {
    const res = await get(port, 'GET', VIDEO, { range: header, 'accept-encoding': 'br, gzip' });
    assert.equal(res.status, 206, header);
    assert.equal(res.headers['content-range'], `bytes ${a}-${b}/${SIZE}`, header);
    assert.equal(res.headers['content-length'], String(b - a + 1), header);
    assert.equal(res.headers['content-type'], 'video/mp4', header);
    assert.equal(res.headers['accept-ranges'], 'bytes', header);
    assert.equal(res.headers['cache-control'], 'public, max-age=31536000, immutable', header);
    assert.equal(res.headers['content-encoding'], undefined, header);
    assert.equal(res.headers.vary, undefined, header);
    assert.ok(res.body.equals(video.subarray(a, b + 1)), `${header}: body`);
  }
});

test('mp4 with an invalid or unsatisfiable Range: 416 with Content-Range bytes */size', async (t) => {
  const { port } = await staticServer(t, { [VIDEO]: video });
  for (const header of ['bytes=65536-', 'bytes=65536-65540', 'bytes=70000-', 'bytes=-0', 'bytes=-', 'bytes=', 'bytes=5-2', 'bytes=abc', 'bytes=1-2-3']) {
    for (const method of ['GET', 'HEAD']) {
      const res = await get(port, method, VIDEO, { range: header });
      assert.equal(res.status, 416, `${method} ${header}`);
      assert.equal(res.headers['content-range'], `bytes */${SIZE}`, `${method} ${header}`);
      assert.equal(res.headers['content-length'], '0', `${method} ${header}`);
      assert.equal(res.headers['cache-control'], 'no-store', `${method} ${header}`);
      assert.equal(res.body.length, 0, `${method} ${header}`);
    }
  }
});

test('mp4 with several ranges or a foreign unit: 200 with the whole file', async (t) => {
  const { port } = await staticServer(t, { [VIDEO]: video });
  for (const header of ['bytes=0-99,200-299', 'bytes=0-99, 200-', 'items=0-5']) {
    const res = await get(port, 'GET', VIDEO, { range: header });
    assert.equal(res.status, 200, header);
    assert.equal(res.headers['content-range'], undefined, header);
    assert.equal(res.headers['content-length'], String(SIZE), header);
    assert.ok(res.body.equals(video), header);
  }
});

test('mp4 over HEAD: headers only, with and without Range', async (t) => {
  const { port } = await staticServer(t, { [VIDEO]: video });
  const whole = await get(port, 'HEAD', VIDEO);
  assert.equal(whole.status, 200);
  assert.equal(whole.headers['content-length'], String(SIZE));
  assert.equal(whole.headers['accept-ranges'], 'bytes');
  assert.equal(whole.body.length, 0);
  const part = await get(port, 'HEAD', VIDEO, { range: 'bytes=100-199' });
  assert.equal(part.status, 206);
  assert.equal(part.headers['content-range'], `bytes 100-199/${SIZE}`);
  assert.equal(part.headers['content-length'], '100');
  assert.equal(part.body.length, 0);
});

test('mp4: ETag and 304 as for every file; If-Range with another validator gives the whole file', async (t) => {
  const { port, dir } = await staticServer(t, { [VIDEO]: video });
  const etag = await etagOf(join(dir, VIDEO));
  const first = await get(port, 'GET', VIDEO);
  assert.equal(first.headers.etag, etag);

  for (const range of [undefined, 'bytes=0-99']) {
    const headers = { 'if-none-match': etag, ...(range ? { range } : {}) };
    const res = await get(port, 'GET', VIDEO, headers);
    assert.equal(res.status, 304, `If-None-Match ${range ?? ''}`);
    assert.equal(res.body.length, 0);
    assert.equal(res.headers.etag, etag);
    assert.equal(res.headers['cache-control'], 'public, max-age=31536000, immutable');
  }
  const stale = await get(port, 'GET', VIDEO, { 'if-none-match': 'W/"1-1"' });
  assert.equal(stale.status, 200);
  assert.ok(stale.body.equals(video));

  // If-Range: the range only counts while the validator is the current ETag
  const same = await get(port, 'GET', VIDEO, { range: 'bytes=10-19', 'if-range': etag });
  assert.equal(same.status, 206);
  assert.ok(same.body.equals(video.subarray(10, 20)));
  for (const ifRange of ['W/"1-1"', '"abc"', 'Wed, 21 Oct 2015 07:28:00 GMT']) {
    const res = await get(port, 'GET', VIDEO, { range: 'bytes=10-19', 'if-range': ifRange });
    assert.equal(res.status, 200, ifRange);
    assert.equal(res.headers['content-range'], undefined, ifRange);
    assert.equal(res.headers['content-length'], String(SIZE), ifRange);
    assert.ok(res.body.equals(video), ifRange);
  }
  // a stale If-Range also turns a hopeless range into the whole file instead of a 416
  const outside = await get(port, 'GET', VIDEO, { range: 'bytes=999999-', 'if-range': 'W/"1-1"' });
  assert.equal(outside.status, 200);
});

test('mp4: an empty file answers 200 and refuses every range', async (t) => {
  const { port } = await staticServer(t, { '/video/empty-000000.mp4': Buffer.alloc(0) });
  const whole = await get(port, 'GET', '/video/empty-000000.mp4');
  assert.equal(whole.status, 200);
  assert.equal(whole.headers['content-length'], '0');
  const ranged = await get(port, 'GET', '/video/empty-000000.mp4', { range: 'bytes=0-' });
  assert.equal(ranged.status, 416);
  assert.equal(ranged.headers['content-range'], 'bytes */0');
});

test('mp4 is streamed from disk with createReadStream, never read whole', async (t) => {
  // source check: the media path uses createReadStream and not readFile
  const source = await readFile(join(project, 'server-static.mjs'), 'utf8');
  const media = source.slice(source.indexOf('async function sendStream'), source.indexOf('export async function send('));
  assert.match(media, /createReadStream\(/);
  assert.doesNotMatch(media, /readFile/);
  assert.match(source.slice(source.indexOf('export async function send(')), /if \(STREAMED\.has\(ext\)\)[\s\S]*?return;[\s\S]*?await readFile/);

  // behaviour: a client that drops the connection mid-file costs nothing; the next request is served
  const big = randomBytes(8 * 1024 * 1024);
  const { port } = await staticServer(t, { '/video/big-7d7d7d.mp4': big, [VIDEO]: video });
  const errors = t.mock.method(console, 'error', () => {});
  await new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: '/video/big-7d7d7d.mp4', headers: { range: 'bytes=0-' }, agent: false }, (res) => {
      assert.equal(res.statusCode, 206);
      res.once('data', () => {
        req.destroy();
        resolve();
      });
    });
    req.on('error', () => {}); // destroyed on purpose
    req.on('close', resolve);
    req.end();
    setTimeout(() => reject(new Error('no data')), 5000).unref();
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  const after = await get(port, 'GET', VIDEO, { range: 'bytes=0-9' });
  assert.equal(after.status, 206);
  assert.ok(after.body.equals(video.subarray(0, 10)));
  assert.equal(errors.mock.callCount(), 0);

  // a large range arrives complete and in order
  const tail = await get(port, 'GET', '/video/big-7d7d7d.mp4', { range: `bytes=${big.length - 3_000_000}-` });
  assert.equal(tail.status, 206);
  assert.ok(tail.body.equals(big.subarray(big.length - 3_000_000)));
});

// ---------------------------------------------------------------- everything else stays as it was

test('html, css, js, svg, avif, png: status, headers and body as before the video change', async (t) => {
  const text = (word, copies) => Buffer.from(`${word} `.repeat(copies));
  const files = {
    '/index.html': text('<p>Royal Spices</p>', 300), // > 1 kB: compressed
    '/small.html': text('<p>x</p>', 10), // <= 1 kB: sent as is, no vary
    '/_astro/site.4f2a.css': text('a{color:red}', 400),
    '/_astro/site.9c1d.js': text('console.log(1);', 300),
    '/favicon.svg': text('<g/>', 600),
    '/hero/a.avif': randomBytes(3000),
    '/img/b.png': randomBytes(3000),
  };
  const { port, dir } = await staticServer(t, files);
  const TYPE = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', svg: 'image/svg+xml', avif: 'image/avif', png: 'image/png' };
  const cc = {
    '/index.html': 'public, max-age=0, must-revalidate',
    '/small.html': 'public, max-age=0, must-revalidate',
    '/_astro/site.4f2a.css': 'public, max-age=31536000, immutable',
    '/_astro/site.9c1d.js': 'public, max-age=31536000, immutable',
    '/favicon.svg': 'public, max-age=3600',
    '/hero/a.avif': 'public, max-age=604800, stale-while-revalidate=86400',
    '/img/b.png': 'public, max-age=604800, stale-while-revalidate=86400',
  };
  for (const [path, content] of Object.entries(files)) {
    const type = TYPE[path.split('.').pop()];
    const compressible = /\.(html|css|js|svg)$/.test(path) && content.length > 1024;
    const etag = await etagOf(join(dir, path));
    let gzipped;
    for (const [acceptEncoding, encoding, unpack] of [
      [undefined, undefined, (b) => b],
      ['gzip', 'gzip', gunzipSync],
      ['gzip, deflate, br', 'br', brotliDecompressSync],
    ]) {
      const res = await get(port, 'GET', path, acceptEncoding ? { 'accept-encoding': acceptEncoding } : {});
      const label = `${path} (${acceptEncoding ?? 'identity'})`;
      if (encoding === 'gzip') gzipped = res;
      assert.equal(res.status, 200, label);
      assert.equal(res.headers['content-type'], type, label);
      assert.equal(res.headers['cache-control'], cc[path], label);
      assert.equal(res.headers.etag, etag, label);
      assert.equal(res.headers['accept-ranges'], undefined, label);
      assert.equal(res.headers['content-range'], undefined, label);
      if (compressible) {
        assert.equal(res.headers.vary, 'accept-encoding', label);
        assert.equal(res.headers['content-encoding'], encoding, label);
        assert.ok(unpack(res.body).equals(content), label);
      } else {
        assert.equal(res.headers.vary, undefined, label);
        assert.equal(res.headers['content-encoding'], undefined, label);
        assert.ok(res.body.equals(content), label);
      }
      assert.equal(res.headers['content-length'], String(res.body.length), label);

      // a Range header means nothing for these types: still the whole file
      const ranged = await get(port, 'GET', path, { range: 'bytes=0-9', ...(acceptEncoding ? { 'accept-encoding': acceptEncoding } : {}) });
      assert.equal(ranged.status, 200, `${label} + Range`);
      assert.equal(ranged.headers['content-range'], undefined, `${label} + Range`);
      assert.ok(ranged.body.equals(res.body), `${label} + Range`);
    }
    const head = await get(port, 'HEAD', path, { 'accept-encoding': 'gzip' });
    assert.equal(head.status, 200, `HEAD ${path}`);
    assert.equal(head.body.length, 0, `HEAD ${path}`);
    assert.equal(head.headers['content-length'], gzipped.headers['content-length'], `HEAD ${path}`);
    assert.equal(head.headers['content-encoding'], gzipped.headers['content-encoding'], `HEAD ${path}`);
    const cached = await get(port, 'GET', path, { 'if-none-match': etag });
    assert.equal(cached.status, 304, `304 ${path}`);
    assert.equal(cached.body.length, 0, `304 ${path}`);
  }
});

// ---------------------------------------------------------------- server.mjs against a stub build

test('server.mjs serves /video/*.mp4 with ranges, security headers and the redirect/405 rules intact', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'rs-range-server-'));
  let child = null;
  t.after(async () => {
    if (child && child.exitCode === null) {
      const exited = new Promise((resolve) => child.once('exit', resolve));
      child.kill();
      await exited;
    }
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  await cp(join(project, 'server.mjs'), join(dir, 'server.mjs'));
  await cp(join(project, 'server-static.mjs'), join(dir, 'server-static.mjs'));
  await mkdir(join(dir, 'src', 'config'), { recursive: true });
  await cp(join(project, 'src', 'config', 'redirects.mjs'), join(dir, 'src', 'config', 'redirects.mjs'));
  await cp(join(project, 'src', 'config', 'handles.mjs'), join(dir, 'src', 'config', 'handles.mjs'));
  await mkdir(join(dir, 'dist', 'server'), { recursive: true });
  await writeFile(join(dir, 'dist', 'server', 'entry.mjs'), 'export const handler = (req, res, next) => next();');
  await mkdir(join(dir, 'dist', 'client', 'video'), { recursive: true });
  await writeFile(join(dir, 'dist', 'client', 'video', 'clip-3f9a1c.mp4'), video);
  await writeFile(join(dir, 'dist', 'client', 'index.html'), '<p>home</p>');
  await writeFile(join(dir, 'dist', 'client', '404.html'), '<p>404</p>');

  const port = await freePort();
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

  const part = await get(port, 'GET', VIDEO, { range: 'bytes=100-299' });
  assert.equal(part.status, 206);
  assert.equal(part.headers['content-range'], `bytes 100-299/${SIZE}`);
  assert.equal(part.headers['content-type'], 'video/mp4');
  assert.equal(part.headers['cache-control'], 'public, max-age=31536000, immutable');
  assert.equal(part.headers['x-content-type-options'], 'nosniff');
  assert.equal(part.headers['cross-origin-resource-policy'], 'same-origin');
  assert.equal(part.headers['content-security-policy'], "frame-ancestors 'none'");
  assert.ok(part.body.equals(video.subarray(100, 300)));

  assert.equal((await get(port, 'GET', VIDEO, { range: 'bytes=-500' })).headers['content-range'], `bytes ${SIZE - 500}-${SIZE - 1}/${SIZE}`);
  assert.equal((await get(port, 'GET', VIDEO, { range: 'bytes=99999-' })).status, 416);
  const whole = await get(port, 'GET', VIDEO, { 'accept-encoding': 'br' });
  assert.equal(whole.status, 200);
  assert.ok(whole.body.equals(video));
  assert.equal((await get(port, 'POST', VIDEO)).status, 405);
  assert.equal((await get(port, 'GET', '/video/missing-000000.mp4')).status, 404);
  const home = await get(port, 'GET', '/');
  assert.equal(home.status, 200);
  assert.equal(home.headers['cache-control'], 'public, max-age=0, must-revalidate');
});
