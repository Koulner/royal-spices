// Static file delivery for server.mjs: content types, cache policy, compression, and byte ranges for video.
// Split out of server.mjs so it can be tested without a build (tests/server-range.test.mjs).
// Text and images are read whole and answered in one piece. Media (.mp4) is streamed from disk and
// answers Range requests with 206, which Safari needs before it plays a video at all.
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { pipeline } from 'node:stream';
import { brotliCompressSync, gzipSync, constants as zlib } from 'node:zlib';
import { extname } from 'node:path';

export const TYPES = {
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
  '.mp4': 'video/mp4',
};
export const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.svg']);
// Already compressed and large: never read whole, never re-compressed, byte ranges honoured.
export const STREAMED = new Set(['.mp4']);

export function cacheControl(path) {
  // fingerprinted build output never changes under the same name
  if (path.startsWith('/_astro/')) return 'public, max-age=31536000, immutable';
  // videos carry a content hash in the file name (public/video/<name>-<hash>.mp4)
  if (path.startsWith('/video/')) return 'public, max-age=31536000, immutable';
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

// Range header of a file of `size` bytes. Returns
//   null                  header is not for us (other unit, or several ranges): answer 200 with the whole file
//   'unsatisfiable'       malformed or outside the file: answer 416
//   { start, end }        inclusive byte positions: answer 206
export function parseRange(header, size) {
  const unit = /^\s*bytes\s*=(.*)$/i.exec(String(header));
  if (!unit) return null;
  const spec = unit[1].trim();
  if (spec.includes(',')) return null;
  const match = /^(\d*)-(\d*)$/.exec(spec);
  if (!match) return 'unsatisfiable';
  const [, first, last] = match;
  if (first === '' && last === '') return 'unsatisfiable';
  if (size === 0) return 'unsatisfiable';
  if (first === '') {
    // suffix range: the last N bytes
    const count = Number(last);
    if (count === 0) return 'unsatisfiable';
    return { start: Math.max(0, size - count), end: size - 1 };
  }
  const start = Number(first);
  if (start >= size) return 'unsatisfiable';
  if (last === '') return { start, end: size - 1 };
  const end = Number(last);
  if (end < start) return 'unsatisfiable';
  return { start, end: Math.min(end, size - 1) };
}

async function sendStream(req, res, found, status, etag) {
  const size = found.info.size;
  let start = 0;
  let end = size - 1;
  let partial = false;
  // A Range is only honoured on a plain 200, and with If-Range only while the validator still matches.
  const range = req.headers.range;
  if (status === 200 && range !== undefined && (req.headers['if-range'] ?? etag) === etag) {
    const parsed = parseRange(range, size);
    if (parsed === 'unsatisfiable') {
      res.setHeader('cache-control', 'no-store');
      res.writeHead(416, { 'content-range': `bytes */${size}`, 'content-length': 0 }).end();
      return;
    }
    if (parsed) {
      ({ start, end } = parsed);
      partial = true;
      res.setHeader('content-range', `bytes ${start}-${end}/${size}`);
    }
  }
  res.setHeader('content-length', partial ? end - start + 1 : size);
  res.writeHead(partial ? 206 : status);
  if (req.method === 'HEAD' || size === 0) {
    res.end();
    return;
  }
  await new Promise((resolve) => {
    // pipeline also closes the file when the player drops the connection, which Safari does all the time
    pipeline(createReadStream(found.file, { start, end }), res, (error) => {
      if (error && error.code !== 'ERR_STREAM_PREMATURE_CLOSE') console.error('[server]', error);
      resolve();
    });
  });
}

export async function send(req, res, found, pathname, status = 200) {
  const ext = extname(found.file);
  const etag = `W/"${found.info.size.toString(16)}-${Math.round(found.info.mtimeMs).toString(16)}"`;
  res.setHeader('content-type', TYPES[ext] ?? 'application/octet-stream');
  res.setHeader('cache-control', status === 404 ? 'no-store' : cacheControl(pathname));
  res.setHeader('etag', etag);
  if (STREAMED.has(ext)) res.setHeader('accept-ranges', 'bytes');
  if (status === 200 && req.headers['if-none-match'] === etag) {
    res.writeHead(304).end();
    return;
  }
  if (STREAMED.has(ext)) {
    await sendStream(req, res, found, status, etag);
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
