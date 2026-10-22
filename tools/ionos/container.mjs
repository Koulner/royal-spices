// Apache with PHP in Docker, laid out like the IONOS webspace, for checks before an upload.
//   node tools/ionos/container.mjs start [--port 8089] [--out dist-ionos]   then
//   node tools/ionos/check.mjs http://localhost:8089 and node tools/qa/seo.mjs http://localhost:8089 --redirects
//   node tools/ionos/container.mjs stop
// The .htaccess must be generated for that origin: node tools/ionos/prepare.mjs --origin http://localhost:8089
// Mounts <out>/public as webroot, <out>/app beside it and an empty private folder (no SMTP access:
// the endpoint answers 503 to a valid inquiry, which is what it must do without configuration).
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const NAME = 'royal-spices-ionos';
const IMAGE = 'php:8.3-apache';

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const port = option('--port', '8089');
const out = resolve(option('--out', join(ROOT, 'dist-ionos')));

const docker = (...a) => spawnSync('docker', a, { encoding: 'utf8' });

if (args[0] === 'stop') {
  docker('rm', '-f', NAME);
  console.log('stopped');
} else if (args[0] === 'start') {
  docker('rm', '-f', NAME);
  const priv = join(out, 'private-local');
  mkdirSync(priv, { recursive: true });
  const run = docker(
    'run', '-d', '--name', NAME, '-p', `127.0.0.1:${port}:80`,
    '-v', `${join(out, 'public')}:/var/www/royalspices:ro`,
    '-v', `${join(out, 'app')}:/var/www/royalspices-app:ro`,
    '-v', `${priv}:/var/www/royalspices-private`,
    '-v', `${join(ROOT, 'tools', 'ionos', 'apache', 'site.conf')}:/etc/apache2/sites-enabled/000-default.conf:ro`,
    IMAGE, 'sh', '-c', 'chown www-data /var/www/royalspices-private && a2enmod -q rewrite headers >/dev/null && apache2-foreground',
  );
  if (run.status !== 0) {
    console.error(run.stderr.trim());
    process.exit(1);
  }
  for (let i = 0; i < 60; i += 1) {
    const res = await fetch(`http://127.0.0.1:${port}/`).catch(() => null);
    if (res) {
      console.log(`Apache ready on http://localhost:${port}/ (status ${res.status})`);
      process.exit(0);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error(docker('logs', '--tail', '20', NAME).stderr);
  process.exit(1);
} else {
  console.error('Aufruf: node tools/ionos/container.mjs start|stop [--port 8089] [--out dist-ionos]');
  process.exit(2);
}
