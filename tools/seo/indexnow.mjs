// IndexNow ping after a deploy (docs/UEBERGABE-SEO.md, Phase 2 and Abgleich point 7).
//   node tools/seo/indexnow.mjs [--host <origin>] [--sitemap <file>] [--write-key <dir>] [--send] [url ...]
// Default is a dry run: it prints what it would send and sends nothing. It sends only with --send
// and the key in INDEXNOW_KEY. The key is never part of the repository: at deploy time
// --write-key <dir> writes <key>.txt into the build output (e.g. dist/client), never into public/.
// URLs: the arguments, or else every URL of the sitemap (default dist/client/sitemap-index.xml).
// Only URLs on the own host are sent; others are dropped and listed.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, isAbsolute, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseSitemap } from './checks.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const ENDPOINT = 'https://api.indexnow.org/indexnow';
/** IndexNow key: 8–128 characters a–z, A–Z, 0–9 and '-'. */
export const KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;
const MAX_URLS = 10000;

export function parseArgs(argv) {
  const opts = { host: null, sitemap: null, writeKey: null, send: false, urls: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} braucht einen Wert`);
      return argv[++i];
    };
    if (a === '--host') opts.host = new URL(value()).origin;
    else if (a === '--sitemap') opts.sitemap = value();
    else if (a === '--write-key') opts.writeKey = value();
    else if (a === '--send') opts.send = true;
    else if (a.startsWith('--')) throw new Error(`unbekannte Option ${a}`);
    else opts.urls.push(a);
  }
  return opts;
}

/** Splits URLs into those on `origin` (deduplicated) and the rest. */
export function sameHostUrls(urls, origin) {
  const own = new URL(origin);
  const kept = [];
  const dropped = [];
  for (const u of urls) {
    let url;
    try {
      url = new URL(u);
    } catch {
      dropped.push(u);
      continue;
    }
    if (url.protocol === own.protocol && url.host === own.host) {
      url.hash = '';
      if (!kept.includes(url.href)) kept.push(url.href);
    } else dropped.push(u);
  }
  return { kept, dropped };
}

export function buildPayload({ origin, key, urls }) {
  return { host: new URL(origin).host, key, keyLocation: `${new URL(origin).origin}/${key}.txt`, urlList: urls.slice(0, MAX_URLS) };
}

/** Writes <dir>/<key>.txt containing the key. Refuses public/ of the project (the key stays out of the repo). */
export async function writeKeyFile(dir, key, { root = ROOT } = {}) {
  if (!KEY_PATTERN.test(key ?? '')) throw new Error('INDEXNOW_KEY fehlt oder ist ungültig (8–128 Zeichen a–z, A–Z, 0–9, -)');
  const target = resolve(dir);
  const rel = relative(resolve(root, 'public'), target);
  if (!rel.startsWith('..') && !isAbsolute(rel)) throw new Error('Die Schlüsseldatei gehört nicht nach public/ (Repo), sondern in die Build-Ausgabe');
  await mkdir(target, { recursive: true });
  const file = join(target, `${key}.txt`);
  await writeFile(file, key);
  return file;
}

/** Every <loc> of a local sitemap file; sitemap indexes are followed to files next to the index. */
export async function readSitemapUrls(file, seen = new Set()) {
  const path = resolve(file);
  if (seen.has(path)) return [];
  seen.add(path);
  const { sitemaps, urls } = parseSitemap(await readFile(path, 'utf8'));
  const nested = [];
  for (const loc of sitemaps) nested.push(...(await readSitemapUrls(join(dirname(path), basename(new URL(loc).pathname)), seen)));
  return [...urls.map((u) => u.loc), ...nested];
}

async function configuredOrigin(root) {
  if (process.env.SITE_URL) return new URL(process.env.SITE_URL).origin;
  const config = await readFile(join(root, 'astro.config.mjs'), 'utf8');
  const m = /\bsite\s*:\s*(?:process\.env\.SITE_URL\s*\?\?\s*)?['"]([^'"]+)['"]/.exec(config);
  if (!m) throw new Error('site in astro.config.mjs nicht gefunden: --host angeben');
  return new URL(m[1]).origin;
}

/**
 * Runs the tool and returns the exit code (0 ok, 1 sending failed, 2 usage error).
 * env, fetchImpl, log and root are parameters so the tests run without network and without the project's dist/.
 */
export async function run(argv, { env = process.env, fetchImpl = fetch, log = console.log, root = ROOT } = {}) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (error) {
    log(`indexnow: ${error.message}`);
    return 2;
  }
  const key = env.INDEXNOW_KEY ?? '';
  const origin = opts.host ?? (await configuredOrigin(root));

  if (opts.writeKey) {
    try {
      log(`Schlüsseldatei geschrieben: ${await writeKeyFile(opts.writeKey, key, { root })}`);
    } catch (error) {
      log(`indexnow: ${error.message}`);
      return 2;
    }
  }

  let urls = opts.urls;
  if (!urls.length && (opts.sitemap || !opts.writeKey)) {
    const sitemap = resolve(root, opts.sitemap ?? 'dist/client/sitemap-index.xml');
    try {
      urls = await readSitemapUrls(sitemap);
    } catch (error) {
      log(`indexnow: Sitemap nicht lesbar (${sitemap}): ${error.message}`);
      return 2;
    }
  }
  if (!urls.length) return 0;
  const { kept, dropped } = sameHostUrls(urls, origin);
  if (dropped.length) log(`nicht auf ${origin}, verworfen: ${dropped.join(', ')}`);
  if (!kept.length) {
    log('keine URL auf dem eigenen Host');
    return 2;
  }

  if (!opts.send) {
    const shown = buildPayload({ origin, key: '<INDEXNOW_KEY>', urls: kept });
    log(`Probelauf (nichts gesendet; senden mit --send und INDEXNOW_KEY), ${kept.length} URLs an ${ENDPOINT}:`);
    log(JSON.stringify(shown, null, 2));
    return 0;
  }
  if (!KEY_PATTERN.test(key)) {
    log('indexnow: --send braucht INDEXNOW_KEY (8–128 Zeichen a–z, A–Z, 0–9, -)');
    return 2;
  }
  const res = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(buildPayload({ origin, key, urls: kept })),
  });
  log(`IndexNow antwortet ${res.status} für ${kept.length} URLs`);
  return res.status === 200 || res.status === 202 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = await run(process.argv.slice(2));
}
