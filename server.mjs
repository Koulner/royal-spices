// Production entry. One small Node server:
//   1. sets the security headers on every response,
//   2. answers retired paths (old Shopify shop, old V1 pages) with a 301 (src/config/redirects.mjs),
//   3. serves the prerendered site from dist/client (caching, compression, byte ranges for video: server-static.mjs),
//   4. hands everything else (the inquiry endpoint) to the Astro request handler.
// Put a TLS-terminating proxy or platform in front of it; HSTS is sent once HTTPS is detected.
import { createServer } from 'node:http';
import { stat } from 'node:fs/promises';
import { join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { redirectTarget } from './src/config/redirects.mjs';
import { send } from './server-static.mjs';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'dist', 'client');
const { handler } = await import('./dist/server/entry.mjs');

const HOST = process.env.HOST ?? '127.0.0.1';
const PORT = Number(process.env.PORT ?? 4322);
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

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
      // old shop and page URLs: one permanent hop to the current page, query string kept
      const target = redirectTarget(pathname);
      if (target) {
        res.writeHead(301, { location: target + url.search }).end();
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
