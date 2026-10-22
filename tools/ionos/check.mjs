// Checks a running Apache with the generated .htaccess: a local container before the upload, or the
// live domain after it (docs/HOSTING-IONOS.md, criteria A3–A7 and the smoke test D5).
//   node tools/ionos/check.mjs <base-url> [--dist dist-ionos/public] [--smoke] [--no-php]
// <base-url> is also the canonical origin the .htaccess was generated for.
//   local:  node tools/ionos/check.mjs http://localhost:8089
//   live:   node tools/ionos/check.mjs https://royalspices.de   (adds http:// and www. in one hop)
// --smoke  only the short list after a deploy: home, one old URL, the endpoint, a video range
// --dist   the uploaded webroot, to pick real file names (default dist-ionos/public)
// Exit 1 on any failed check.
import http from 'node:http';
import https from 'node:https';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECURITY_HEADERS, HSTS } from './htaccess.mjs';
import { cacheControl, TYPES } from '../../server-static.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

function parseArgs(argv) {
  const opts = { base: null, dist: join(ROOT, 'dist-ionos', 'public'), smoke: false, php: true };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dist') opts.dist = argv[++i];
    else if (a === '--smoke') opts.smoke = true;
    else if (a === '--no-php') opts.php = false;
    else if (!opts.base && !a.startsWith('--')) opts.base = a.replace(/\/$/, '');
    else throw new Error(`unknown option: ${a}`);
  }
  if (!opts.base) throw new Error('Aufruf: node tools/ionos/check.mjs <base-url> [--dist <dir>] [--smoke] [--no-php]');
  return opts;
}

/** One request, no redirect following. `url` is absolute; `host` overrides the Host header. */
function request(url, { method = 'GET', headers = {}, host, body } = {}) {
  const target = new URL(url);
  const lib = target.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      target,
      { method, headers: { 'user-agent': 'royal-spices-ionos-check', ...headers, ...(host ? { host } : {}) }, servername: host?.split(':')[0] },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      },
    );
    req.setTimeout(20000, () => req.destroy(new Error(`timeout ${url}`)));
    req.on('error', reject);
    req.end(body);
  });
}

/** Site path of the first file below `<dist>/<sub>` with this extension, or null. */
async function firstFile(dist, sub, ext) {
  const dir = join(dist, sub);
  const entries = await readdir(dir, { withFileTypes: true, recursive: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(ext)) {
      return '/' + relative(dist, join(entry.parentPath ?? entry.path, entry.name)).replaceAll('\\', '/');
    }
  }
  return null;
}

export async function run(opts) {
  const { base } = opts;
  const origin = new URL(base);
  const secure = origin.protocol === 'https:';
  const results = [];
  const check = async (name, fn) => {
    try {
      const problem = await fn();
      results.push({ name, ok: !problem, problem });
    } catch (error) {
      results.push({ name, ok: false, problem: error.message });
    }
  };
  const expect = (res, status, extra = () => null) => (res.status !== status ? `status ${res.status}, erwartet ${status}` : extra(res));
  const securityHeaders = (res) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      if (res.headers[name.toLowerCase()] !== value) return `${name}: ${res.headers[name.toLowerCase()] ?? 'fehlt'}`;
    }
    return null;
  };
  const location = (res, want) => (res.headers.location === want ? null : `Location ${res.headers.location ?? 'fehlt'}, erwartet ${want}`);

  const video = await firstFile(opts.dist, 'video', '.mp4');

  await check('/ liefert 200 mit Security-Headern', async () => {
    const res = await request(base + '/', { headers: { 'accept-encoding': 'gzip, br' } });
    return expect(res, 200, () => securityHeaders(res) ?? (res.headers['content-type'] === TYPES['.html'] ? null : `Content-Type ${res.headers['content-type']}`));
  });
  await check('altes Shop-URL: ein 301 mit Abfrage', async () => {
    const res = await request(base + '/pages/faq?utm_source=x');
    return expect(res, 301, () => location(res, `${base}/faq/?utm_source=x`) ?? securityHeaders(res));
  });
  await check('GET /api/anfrage/ → 405 Allow: POST, no-store', async () => {
    if (!opts.php) return null;
    const res = await request(base + '/api/anfrage/');
    return expect(res, 405, () => (/POST/.test(res.headers.allow ?? '') && /no-store/.test(res.headers['cache-control'] ?? '') ? null : `Allow ${res.headers.allow}, Cache-Control ${res.headers['cache-control']}`));
  });
  await check('Video: Range → 206', async () => {
    if (!video) return 'keine .mp4 in --dist';
    const res = await request(base + video, { headers: { range: 'bytes=0-1', 'accept-encoding': 'gzip, br' } });
    const size = (await stat(join(opts.dist, video))).size;
    return expect(res, 206, () =>
      res.headers['content-range'] !== `bytes 0-1/${size}` ? `Content-Range ${res.headers['content-range']}`
      : res.headers['content-type'] !== 'video/mp4' ? `Content-Type ${res.headers['content-type']}`
      : res.headers['content-encoding'] ? `Content-Encoding ${res.headers['content-encoding']}`
      : res.body.length !== 2 ? `Länge ${res.body.length}`
      : res.headers['cache-control'] !== cacheControl(video) ? `Cache-Control ${res.headers['cache-control']}` : null);
  });
  if (opts.smoke) return results;

  // A3: scheme, host and trailing slash in one hop
  const hostWww = 'www.' + origin.host;
  await check('www → Apex, Pfad und Abfrage bleiben', async () => {
    const res = secure ? await request(`https://${hostWww}/kontakt/?a=1`) : await request(base + '/kontakt/?a=1', { host: hostWww });
    return expect(res, 301, () => location(res, `${base}/kontakt/?a=1`));
  });
  await check('www + altes URL → Endziel in einem Sprung', async () => {
    const res = secure ? await request(`http://${hostWww}/pages/faq`) : await request(base + '/pages/faq', { host: hostWww });
    return expect(res, 301, () => location(res, `${base}/faq/`));
  });
  if (secure) {
    await check('http → https in einem Sprung', async () => {
      const res = await request(`http://${origin.host}/kontakt/`);
      return expect(res, 301, () => location(res, `${base}/kontakt/`));
    });
    await check('http + Ordner ohne Schrägstrich → ein Sprung', async () => {
      const res = await request(`http://${origin.host}/kontakt`);
      return expect(res, 301, () => location(res, `${base}/kontakt/`));
    });
  }
  await check('Ordner ohne Schrägstrich → ein 301', async () => {
    const res = await request(base + '/kontakt?a=1');
    return expect(res, 301, () => location(res, `${base}/kontakt/?a=1`));
  });

  // A4: HSTS once HTTPS is detected
  await check('HSTS nur über HTTPS', async () => {
    const res = secure ? await request(base + '/') : await request(base + '/', { headers: { 'x-forwarded-proto': 'https' } });
    if (res.headers['strict-transport-security'] !== HSTS) return `HSTS ${res.headers['strict-transport-security'] ?? 'fehlt'}`;
    if (!secure && (await request(base + '/')).headers['strict-transport-security']) return 'HSTS auch über http';
    return null;
  });

  // A5: cache policy, types, compression
  const samples = [
    await firstFile(opts.dist, '_astro', '.js'),
    await firstFile(opts.dist, '_astro', '.css'),
    await firstFile(opts.dist, 'hero', '.webp'),
    await firstFile(opts.dist, 'img', '.avif'),
    await firstFile(opts.dist, '_astro', '.woff2'),
    '/favicon.svg',
    '/robots.txt',
    '/kontakt/',
  ].filter(Boolean);
  for (const path of samples) {
    await check(`Cache und Typ ${path}`, async () => {
      const res = await request(base + path, { headers: { 'accept-encoding': 'gzip, br' } });
      const ext = path.endsWith('/') ? '.html' : path.slice(path.lastIndexOf('.'));
      const compressible = ['.html', '.css', '.js', '.svg', '.txt'].includes(ext);
      return expect(res, 200, () =>
        res.headers['cache-control'] !== cacheControl(path) ? `Cache-Control ${res.headers['cache-control']}, erwartet ${cacheControl(path)}`
        : res.headers['content-type'] !== TYPES[ext] ? `Content-Type ${res.headers['content-type']}, erwartet ${TYPES[ext]}`
        : compressible && res.body.length > 1024 && !/^(gzip|br)$/.test(res.headers['content-encoding'] ?? '') ? 'nicht komprimiert'
        : !compressible && res.headers['content-encoding'] ? `${ext} komprimiert` : null);
    });
  }

  // A7: 404 page, hidden files, stray PHP, methods
  const notFound = await readFile(join(opts.dist, '404.html'), 'utf8');
  const title = /<title>([^<]*)<\/title>/.exec(notFound)?.[1];
  await check('unbekannter Pfad → 404 mit 404-Seite', async () => {
    const res = await request(base + '/gibt-es-nicht/');
    return expect(res, 404, () => (title && res.body.toString().includes(title) ? securityHeaders(res) : 'Inhalt nicht die 404-Seite'));
  });
  for (const path of ['/.htaccess', '/.env', '/api/anfrage/test.php', '/irgendwas.php']) {
    await check(`${path} nicht abrufbar`, async () => {
      const res = await request(base + path);
      return [403, 404].includes(res.status) ? null : `status ${res.status}`;
    });
  }
  await check('POST auf eine Seite → 405 Allow: GET, HEAD', async () => {
    const res = await request(base + '/kontakt/', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' });
    // Apache may add TRACE (TraceEnable is server config); POST must not be allowed
    return expect(res, 405, () => (/^GET, HEAD(, TRACE)?$/.test(res.headers.allow ?? '') ? null : `Allow ${res.headers.allow}`));
  });
  return results;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const results = await run(parseArgs(process.argv.slice(2)));
    for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.ok ? '' : ` – ${r.problem}`}`);
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed ? `${failed} von ${results.length} Prüfungen fehlgeschlagen` : `alle ${results.length} Prüfungen bestanden`);
    process.exit(failed ? 1 : 0);
  } catch (error) {
    console.error(`[ionos-check] ${error.message}`);
    process.exit(2);
  }
}
