// Serves the GitHub Pages copy locally under its repository path, the way GitHub does:
// static files only, directory → index.html, unknown paths → 404.html, POST → 405.
//
//   node tools/pages/serve.mjs dist-pages /<repo> 4330
//   → http://127.0.0.1:4330/<repo>/
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const [root = 'dist-pages', rawBase = '', port = '4330'] = process.argv.slice(2);
const base = rawBase.replace(/\/+$/, '');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
};

async function file(path) {
  const info = await stat(path).catch(() => null);
  if (info?.isDirectory()) return file(join(path, 'index.html'));
  return info?.isFile() ? path : null;
}

createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    console.log(`405 ${req.method} ${pathname}`);
    res.writeHead(405).end();
    return;
  }
  const inside = pathname === base || pathname.startsWith(`${base}/`);
  const path = inside ? await file(join(root, normalize(pathname.slice(base.length)).replace(/^(\.\.[/\\])+/, ''))) : null;
  if (!path) {
    console.log(`404 ${pathname}`);
    res.writeHead(404, { 'content-type': TYPES['.html'] }).end(await readFile(join(root, '404.html')));
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
  res.end(req.method === 'HEAD' ? undefined : await readFile(path));
}).listen(Number(port), '127.0.0.1', () => console.log(`http://127.0.0.1:${port}${base}/`));
