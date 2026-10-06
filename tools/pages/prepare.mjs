// Turns a finished production build into a GitHub Pages preview, without touching the build.
//
//   npm run build
//   node tools/pages/prepare.mjs --site https://<user>.github.io --base /<repo>
//
// Reads dist/client (the prerendered pages), writes a rewritten copy to dist-pages.
// The production output and every source file stay as they are.
//
// What changes in the copy, and why:
//   - root-absolute URLs (/produkte/, /hero/…, /_astro/…) get the repository path in front,
//     because a project page lives under https://<user>.github.io/<repo>/
//   - absolute URLs on the build's site (canonical, og:image, JSON-LD, sitemap) likewise
//   - CSP hashes of inline <script>/<style> blocks are recomputed where their content changed
//   - .nojekyll, so GitHub serves the _astro folder as it is
//
// Not available on GitHub Pages: the inquiry endpoint (/api/anfrage/ needs the Node server),
// the security headers and cache rules from server.mjs. The form then shows its error text.
import { createHash } from 'node:crypto';
import { cp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    site: { type: 'string' },
    base: { type: 'string', default: '' },
    from: { type: 'string', default: 'dist/client' },
    out: { type: 'string', default: 'dist-pages' },
  },
});

if (!values.site) {
  console.error('usage: node tools/pages/prepare.mjs --site https://<user>.github.io [--base /<repo>]');
  process.exit(1);
}

const site = values.site.replace(/\/+$/, '');
// "" for a root site (custom domain, <user>.github.io repo), otherwise "/<repo>" without trailing slash.
const base = values.base.replace(/\/+$/, '').replace(/^(?=[^/])/, '/');

const prefix = (url) => (url.startsWith('/') && !url.startsWith('//') ? base + url : url);
const onSite = (text) => text.split(`${site}/`).join(`${site}${base}/`);
const cssUrls = (css) => css.replace(/url\((["']?)(\/(?!\/)[^)"']*)\1\)/g, (_, q, url) => `url(${q}${base}${url}${q})`);

const URL_ATTRS = /(\s(?:href|src|action|poster|data-base))="([^"]*)"/g;
const SRCSET_ATTRS = /(\s(?:srcset|imagesrcset))="([^"]*)"/g;
const INLINE = /<(script|style)(\s[^>]*)?>([\s\S]*?)<\/\1>/g;

const sha = (text) => `sha256-${createHash('sha256').update(text).digest('base64')}`;

function rewriteHtml(html) {
  const hashes = new Map();

  // Inline blocks first: rewrite the content and remember how their CSP hash moves.
  html = html.replace(INLINE, (block, tag, attrs = '', body) => {
    if (/\ssrc=/.test(attrs)) return block;
    const next = tag === 'style' ? cssUrls(onSite(body)) : onSite(body);
    if (next === body) return block;
    hashes.set(sha(body), sha(next));
    return `<${tag}${attrs}>${next}</${tag}>`;
  });

  // Attributes outside the inline blocks (the replacement callbacks above left those as text).
  html = html
    .replace(URL_ATTRS, (_, name, url) => `${name}="${prefix(onSite(url))}"`)
    .replace(SRCSET_ATTRS, (_, name, list) => {
      const rewritten = list
        .split(',')
        .map((candidate) => candidate.replace(/^(\s*)(\S+)/, (__, space, url) => space + prefix(url)))
        .join(',');
      return `${name}="${rewritten}"`;
    })
    .replace(/(\scontent=")(https?:\/\/[^"]*)"/g, (_, start, url) => `${start}${onSite(url)}"`);

  for (const [before, after] of hashes) html = html.split(`'${before}'`).join(`'${after}'`);
  return html;
}

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else yield path;
  }
}

await rm(values.out, { recursive: true, force: true });
await cp(values.from, values.out, { recursive: true });

let changed = 0;
for await (const path of files(values.out)) {
  const ext = extname(path);
  if (!['.html', '.css', '.xml'].includes(ext)) continue;
  const text = await readFile(path, 'utf8');
  const next = ext === '.html' ? rewriteHtml(text) : ext === '.css' ? cssUrls(onSite(text)) : onSite(text);
  if (next !== text) {
    await writeFile(path, next);
    changed++;
  }
}

await writeFile(join(values.out, '.nojekyll'), '');
console.log(`pages: ${values.out} for ${site}${base || ''}/ (${changed} files rewritten)`);
