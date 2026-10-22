// Turns the static build into the upload for the IONOS webspace (docs/HOSTING-IONOS.md).
//   npm run build && node tools/ionos/prepare.mjs [--client dist/client] [--out dist-ionos]
//        [--origin https://royalspices.de] [--app-dir royalspices-app] [--private-dir royalspices-private]
// Writes
//   <out>/public/   the webroot: dist/client, the generated .htaccess, api/anfrage/index.php
//   <out>/app/      the PHP code of the inquiry endpoint with its vendor/ (outside the webroot)
// The PHP dependencies must be installed first (composer install in php/). The private folder
// (SMTP access, rate limit) is never written here; it is set up once by hand.
// Every file's modification time is derived from its content, so the SFTP mirror (deploy.sh) only
// transfers what really changed although the build rewrites every file.
// dist/client stays as it is: the Node path (server.mjs) keeps working from the same build.
import { cp, mkdir, readdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHtaccess } from './htaccess.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const FOLDER = /^[A-Za-z0-9._-]+$/;

export function parseArgs(argv) {
  const opts = {
    client: join(ROOT, 'dist', 'client'),
    out: join(ROOT, 'dist-ionos'),
    php: join(ROOT, 'php'),
    origin: process.env.SITE_URL ?? 'https://royalspices.de',
    appDir: 'royalspices-app',
    privateDir: 'royalspices-private',
  };
  const names = { '--client': 'client', '--out': 'out', '--php': 'php', '--origin': 'origin', '--app-dir': 'appDir', '--private-dir': 'privateDir' };
  for (let i = 0; i < argv.length; i += 1) {
    const key = names[argv[i]];
    if (!key || argv[i + 1] === undefined) throw new Error(`unknown or incomplete option: ${argv[i]}`);
    opts[key] = argv[++i];
  }
  for (const key of ['appDir', 'privateDir']) if (!FOLDER.test(opts[key])) throw new Error(`folder name expected for ${key}: ${opts[key]}`);
  return opts;
}

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (entry.isFile()) yield path;
  }
}

/** A fixed time per content: same bytes, same mtime, on every build (2001 plus up to 2^30 s). */
export function contentTime(buffer) {
  const n = createHash('sha256').update(buffer).digest().readUInt32BE(0) >>> 2;
  return new Date(Date.UTC(2001, 0, 1) + n * 1000);
}

async function exists(path) {
  return stat(path).then(() => true, () => false);
}

export async function prepare(opts) {
  const { client, out, php } = opts;
  if (!(await exists(join(client, 'index.html')))) throw new Error(`no build in ${client} (npm run build first)`);
  if (await exists(join(client, 'api'))) throw new Error(`${client}/api exists: the PHP endpoint would collide with it`);
  for (const need of ['public/index.php', 'src', 'vendor/autoload.php']) {
    if (!(await exists(join(php, need)))) throw new Error(`missing ${join(php, need)} (composer install in php/?)`);
  }

  await rm(out, { recursive: true, force: true });
  const pub = join(out, 'public');
  const app = join(out, 'app');
  await cp(client, pub, { recursive: true });

  const produkte = join(client, 'produkte');
  const handles = [];
  for (const entry of await readdir(produkte, { withFileTypes: true })) {
    if (entry.isDirectory() && (await exists(join(produkte, entry.name, 'index.html')))) handles.push(entry.name);
  }
  await writeFile(join(pub, '.htaccess'), buildHtaccess({ origin: opts.origin, productHandles: handles.sort() }));

  const entry = (await readFile(join(php, 'public', 'index.php'), 'utf8'))
    .replaceAll("'/../../../royalspices-app'", `'/../../../${opts.appDir}'`)
    .replaceAll("'/../../../royalspices-private'", `'/../../../${opts.privateDir}'`);
  await mkdir(join(pub, 'api', 'anfrage'), { recursive: true });
  await writeFile(join(pub, 'api', 'anfrage', 'index.php'), entry);

  for (const part of ['src', 'vendor', 'composer.json', 'composer.lock', 'anfrage.config.example.php']) {
    if (await exists(join(php, part))) await cp(join(php, part), join(app, part), { recursive: true });
  }

  let count = 0;
  for (const dir of [pub, app]) {
    for await (const file of files(dir)) {
      const time = contentTime(await readFile(file));
      await utimes(file, time, time);
      count += 1;
    }
  }
  return { files: count, handles, out: relative(ROOT, out) || out };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const result = await prepare(parseArgs(process.argv.slice(2)));
    console.log(`IONOS upload ready in ${result.out}: ${result.files} files, products ${result.handles.join(', ')}`);
  } catch (error) {
    console.error(`[ionos] ${error.message}`);
    process.exit(1);
  }
}
