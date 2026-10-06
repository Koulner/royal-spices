// Production entry. One small Node server:
//   1. sets the security headers on every response,
//   2. serves the prerendered site from dist/client (with caching and compression),
//   3. hands everything else (the inquiry endpoint) to the Astro request handler.
// Put a TLS-terminating proxy or platform in front of it; HSTS is sent once HTTPS is detected.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { brotliCompressSync, gzipSync, constants as zlib } from 'node:zlib';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'dist', 'client');
const { handler } = await import('./dist/server/entry.mjs');

const HOST = process.env.HOST ?? '127.0.0.1';
const PORT = Number(process.env.PORT ?? 4322);
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.svg']);

// script-src and style-src are delivered per page as a <meta> policy with hashes (astro.config.mjs).
// The directives below cannot be expressed in <meta> and apply to every response.
const SECURITY_HEADERS = {
  'content-security-policy': "frame-ancestors 'none'",
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
};

function cacheControl(path) {
  // fingerprinted build output never changes under the same name
  if (path.startsWith('/_astro/')) return 'public, max-age=31536000, immutable';
  // hero frames and stills are replaced by re-running the asset pipeline, not on every deploy
  if (path.startsWith('/hero/') || path.startsWith('/img/')) return 'public, max-age=604800, stale-while-revalidate=86400';
  if (path.endsWith('.html') || path.endsWith('/')) return 'public, max-age=0, must-revalidate';
  return 'public, max-age=3600';
}

const compressed = new Map();
function compress(key, buffer, encoding) {
  const id = `${encoding}:${key}`;
  if (!compressed.has(id)) {
    compressed.set(
      id,
      encoding === 'br'
        ? brotliCompressSync(buffer, { params: { [zlib.BROTLI_PARAM_QUALITY]: 9 } })
        : gzipSync(buffer, { level: 8 }),
    );
  }
  return compressed.get(id);
}

async function resolveFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const file = normalize(join(root, decoded));
  // never leave dist/client, whatever the URL says
  if (file !== root && !file.startsWith(root + sep)) return null;
  try {
    const info = await stat(file);
    if (info.isFile()) return { file, info };
    if (info.isDirectory()) {
      const index = join(file, 'index.html');
      const indexInfo = await stat(index);
      return { file: index, info: indexInfo, directory: true };
    }
  } catch {
    return null;
  }
  return null;
}

async function send(req, res, found, pathname, status = 200) {
  const ext = extname(found.file);
  const etag = `W/"${found.info.size.toString(16)}-${Math.round(found.info.mtimeMs).toString(16)}"`;
  res.setHeader('content-type', TYPES[ext] ?? 'application/octet-stream');
  res.setHeader('cache-control', status === 404 ? 'no-store' : cacheControl(pathname));
  res.setHeader('etag', etag);
  if (status === 200 && req.headers['if-none-match'] === etag) {
    res.writeHead(304).end();
    return;
  }
  let body = await readFile(found.file);
  if (COMPRESSIBLE.has(ext) && body.length > 1024) {
    const accepts = String(req.headers['accept-encoding'] ?? '');
    const encoding = /\bbr\b/.test(accepts) ? 'br' : /\bgzip\b/.test(accepts) ? 'gzip' : null;
    res.setHeader('vary', 'accept-encoding');
    if (encoding) {
      body = compress(found.file, body, encoding);
      res.setHeader('content-encoding', encoding);
    }
  }
  res.setHeader('content-length', body.length);
  res.writeHead(status);
  res.end(req.method === 'HEAD' ? undefined : body);
}

const server = createServer(async (req, res) => {
  try {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
    const secure = TRUST_PROXY ? req.headers['x-forwarded-proto'] === 'https' : Boolean(req.socket.encrypted);
    if (secure) res.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains');
    // Without a trusted proxy the forwarding headers are client input: drop them before the app sees them.
    if (!TRUST_PROXY) {
      delete req.headers['x-forwarded-for'];
      delete req.headers['x-forwarded-proto'];
      delete req.headers['x-forwarded-host'];
    }

    const url = new URL(req.url ?? '/', 'http://localhost');
    const pathname = url.pathname;

    if (!pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { allow: 'GET, HEAD' }).end();
        return;
      }
      const found = await resolveFile(pathname);
      if (found) {
        // pages live at /path/ — keep one canonical URL
        if (found.directory && !pathname.endsWith('/')) {
          res.writeHead(301, { location: pathname + '/' + url.search }).end();
          return;
        }
        await send(req, res, found, pathname);
        return;
      }
      const missing = await resolveFile('/404.html');
      if (missing) {
        await send(req, res, missing, '/404.html', 404);
        return;
      }
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }

    handler(req, res, () => {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
    });
  } catch (error) {
    console.error('[server]', error);
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Internal error');
  }
});

server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(PORT, HOST, () => console.log(`Royal Spices listening on http://${HOST}:${PORT}`));
