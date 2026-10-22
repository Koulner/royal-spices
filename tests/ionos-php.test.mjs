// PHP inquiry endpoint for IONOS webhosting (php/): parity with the Node schema and end to end.
//   (a) parity: every case in tests/fixtures/inquiry-parity.json goes through inquirySchema/fieldErrors/
//       composeMail (TypeScript) and through php/tests/parity.php; field errors and mail must match exactly.
//   (b) end to end: `php -S` serves php/public/index.php with a temporary configuration and private
//       directory and delivers over SMTP to a local sink; status codes, headers, envelope and text are checked.
// PHP comes from `php` on PATH or from RS_PHP (path to php.exe or a command line).
// Without PHP (or without php/vendor for (b)) the PHP tests are skipped, never failed.
import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inquirySchema, fieldErrors, composeMail } from '../src/lib/inquiry/schema.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const phpDir = join(root, 'php');
// RS_PHP: a path to php(.exe) (spaces allowed, e.g. C:\Program Files\php\php.exe) or a command line.
const rsPhp = (process.env.RS_PHP || 'php').trim();
const [phpBin, ...phpPre] = existsSync(rsPhp) ? [rsPhp] : rsPhp.split(/\s+/);

function phpVersion() {
  const r = spawnSync(phpBin, [...phpPre, '-r', 'echo PHP_VERSION;'], { cwd: root, encoding: 'utf8', timeout: 300_000 });
  return r.status === 0 && /^\d+\.\d+/.test(r.stdout.trim()) ? r.stdout.trim() : null;
}
const version = phpVersion();
const noPhp = version ? false : `PHP nicht gefunden: "${phpBin}" läuft nicht. php auf PATH legen oder RS_PHP setzen, z. B. RS_PHP=C:\\php\\php.exe`;
const noVendor = existsSync(join(phpDir, 'vendor', 'autoload.php')) ? false : 'php/vendor fehlt: im Ordner php/ "composer install" ausführen';
if (version) console.log(`# PHP ${version} via ${process.env.RS_PHP ? `RS_PHP (${process.env.RS_PHP})` : 'PATH'}`);

// ------------------------------------------------------------------ (a) parity

const cases = JSON.parse(readFileSync(join(root, 'tests', 'fixtures', 'inquiry-parity.json'), 'utf8')).map((c) => ({
  id: c.id,
  body: c.body ?? new URLSearchParams(c.pairs).toString(),
}));

/** What anfrage.ts does with a body, up to the mail text. */
function nodeResult(body) {
  const params = new URLSearchParams(new TextDecoder().decode(Buffer.from(body, 'utf8')));
  const data = {};
  for (const [key, value] of params) if (!(key in data)) data[key] = value;
  const parsed = inquirySchema.safeParse(data);
  return parsed.success ? { ok: true, ...composeMail(parsed.data) } : { ok: false, fields: fieldErrors(parsed.error) };
}

test('parity fixture: at least 40 distinct cases, valid and invalid ones', () => {
  assert.ok(cases.length >= 40, `${cases.length} cases`);
  assert.equal(new Set(cases.map((c) => c.id)).size, cases.length, 'ids are unique');
  const results = cases.map((c) => nodeResult(c.body));
  assert.ok(results.filter((r) => r.ok).length >= 15 && results.filter((r) => !r.ok).length >= 15);
});

test('parity: PHP gives the same field errors and a byte-identical mail as schema.ts', { skip: noPhp }, () => {
  const r = spawnSync(phpBin, [...phpPre, join(phpDir, 'tests', 'parity.php')], {
    cwd: root, input: JSON.stringify(cases), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300_000,
  });
  assert.equal(r.status, 0, r.stderr);
  const php = JSON.parse(r.stdout);
  assert.equal(php.length, cases.length);
  const mismatches = [];
  for (const [i, c] of cases.entries()) {
    const { id, ...got } = php[i];
    assert.equal(id, c.id);
    const expected = nodeResult(c.body);
    try {
      assert.deepStrictEqual(got, expected);
      if (expected.ok) {
        assert.ok(Buffer.from(got.subject).equals(Buffer.from(expected.subject)));
        assert.ok(Buffer.from(got.text).equals(Buffer.from(expected.text)));
      }
    } catch {
      mismatches.push(`${c.id}\n  node: ${JSON.stringify(expected)}\n  php:  ${JSON.stringify(got)}`);
    }
  }
  assert.equal(mismatches.length, 0, `${mismatches.length} of ${cases.length} cases differ:\n${mismatches.join('\n')}`);
});

// ------------------------------------------------------------------ (b) end to end

const TO = 'inbox@royalspices.test';
const FROM = 'website@royalspices.test';
const SMTP_USER = 'website@royalspices.test';
const SMTP_PASS = 'sink-secret-4711';

/** SMTP sink after tools/qa/smtp.mjs, plus AUTH PLAIN and a switch to refuse mail. */
function startSink() {
  const sink = { mails: [], auth: [], refuse: false };
  sink.server = createServer((socket) => {
    socket.setEncoding('utf8');
    let buffer = '';
    let inData = false;
    let mail = { from: '', to: [], data: '' };
    let awaitingAuth = false;
    const recordAuth = (b64) => sink.auth.push(Buffer.from(b64, 'base64').toString('utf8').split('\0'));
    socket.write('220 sink ESMTP\r\n');
    socket.on('data', (chunk) => {
      buffer += chunk;
      for (;;) {
        if (inData) {
          const end = buffer.indexOf('\r\n.\r\n');
          if (end < 0) return;
          mail.data = buffer.slice(0, end).replace(/\r\n\.\./g, '\r\n.');
          buffer = buffer.slice(end + 5);
          inData = false;
          sink.mails.push(mail);
          mail = { from: '', to: [], data: '' };
          socket.write('250 queued\r\n');
          continue;
        }
        const eol = buffer.indexOf('\r\n');
        if (eol < 0) return;
        const line = buffer.slice(0, eol);
        buffer = buffer.slice(eol + 2);
        const verb = line.slice(0, 4).toUpperCase();
        if (verb === 'EHLO' || verb === 'HELO') socket.write('250-sink\r\n250-AUTH PLAIN\r\n250 8BITMIME\r\n');
        else if (awaitingAuth) (awaitingAuth = false), recordAuth(line), socket.write('235 ok\r\n');
        else if (verb === 'AUTH' && line.split(' ')[2]) recordAuth(line.split(' ')[2]), socket.write('235 ok\r\n');
        else if (verb === 'AUTH') (awaitingAuth = true), socket.write('334 \r\n');
        else if (verb === 'MAIL') (mail.from = /<([^>]*)>/.exec(line)?.[1] ?? ''), socket.write('250 ok\r\n');
        else if (verb === 'RCPT') mail.to.push(/<([^>]*)>/.exec(line)?.[1] ?? ''), socket.write('250 ok\r\n');
        else if (verb === 'DATA') socket.write(sink.refuse ? '554 refused by test\r\n' : ((inData = true), '354 go ahead\r\n'));
        else if (verb === 'QUIT') socket.end('221 bye\r\n');
        else socket.write('250 ok\r\n');
      }
    });
    socket.on('error', () => {});
  });
  return new Promise((ok) => sink.server.listen(0, '127.0.0.1', () => ok(sink)));
}

const freePort = () => new Promise((ok) => {
  const s = createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); });
});

function qpBytes(text) {
  const bytes = [];
  const s = text.replace(/=\r?\n/g, '');
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '=' && /^[0-9A-F]{2}$/i.test(s.slice(i + 1, i + 3))) bytes.push(parseInt(s.slice(i + 1, i + 3), 16)), (i += 2);
    else bytes.push(...Buffer.from(s[i], 'utf8'));
  }
  return Buffer.from(bytes);
}
const decodeQP = (text) => qpBytes(text).toString('utf8');
/** RFC 2047: a run of encoded words is joined as bytes first (a character may span two words). */
const decodeWords = (value) => value.replace(/=\?utf-8\?[QB]\?[^?]*\?=(?:\s+=\?utf-8\?[QB]\?[^?]*\?=)*/gi, (run) =>
  Buffer.concat([...run.matchAll(/=\?utf-8\?([QB])\?([^?]*)\?=/gi)].map(([, enc, data]) =>
    enc.toUpperCase() === 'B' ? Buffer.from(data, 'base64') : qpBytes(data.replace(/_/g, ' ')))).toString('utf8'));

/** Raw message -> { headers: [[name, value]], header(name), text } */
function parseMail(raw) {
  const split = raw.indexOf('\r\n\r\n');
  const head = raw.slice(0, split).replace(/\r\n[ \t]+/g, ' ');
  const headers = head.split('\r\n').map((l) => [l.slice(0, l.indexOf(':')).toLowerCase(), l.slice(l.indexOf(':') + 1).trim()]);
  const header = (name) => headers.find(([n]) => n === name.toLowerCase())?.[1];
  let body = raw.slice(split + 4);
  const cte = (header('content-transfer-encoding') ?? '').toLowerCase();
  if (cte === 'quoted-printable') body = decodeQP(body);
  else if (cte === 'base64') body = Buffer.from(body, 'base64').toString('utf8');
  return { headers, header, text: body.replace(/\r\n/g, '\n') };
}

describe('PHP endpoint end to end (php -S + SMTP sink)', { skip: noPhp || noVendor }, () => {
  let sink, server, base, origin, work, priv, log = '';
  const configFile = () => join(priv, 'anfrage.config.php');
  const rateFile = () => join(priv, 'anfrage-ratelimit.json');

  before(async () => {
    sink = await startSink();
    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    origin = base;
    work = mkdtempSync(join(tmpdir(), 'rs-ionos-php-'));
    const docroot = join(work, 'royalspices');
    priv = join(work, 'royalspices-private');
    mkdirSync(join(docroot, 'api', 'anfrage'), { recursive: true });
    mkdirSync(priv);
    copyFileSync(join(phpDir, 'public', 'index.php'), join(docroot, 'api', 'anfrage', 'index.php'));
    const config = {
      smtp: { host: '127.0.0.1', port: sink.server.address().port, secure: 'none', user: SMTP_USER, pass: SMTP_PASS },
      from: FROM, to: TO, origin, hmac_key: 'e2e-hmac-key-0123456789abcdef0123456789',
    };
    writeFileSync(configFile(), `<?php return json_decode('${JSON.stringify(config)}', true);\n`);
    server = spawn(phpBin, [...phpPre, '-S', `127.0.0.1:${port}`, '-t', docroot], {
      cwd: root,
      env: { ...process.env, RS_APP_DIR: phpDir, RS_PRIVATE_DIR: priv },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    server.stdout.on('data', (d) => (log += d));
    server.stderr.on('data', (d) => (log += d));
    const deadline = Date.now() + 90_000;
    for (;;) {
      try {
        if ((await fetch(`${base}/api/anfrage/`)).status === 405) break;
      } catch {}
      if (Date.now() > deadline) throw new Error(`php -S did not start:\n${log}`);
      await new Promise((r) => setTimeout(r, 300));
    }
  });

  after(async () => {
    if (server) {
      server.stdin.end();
      const exited = new Promise((r) => server.once('exit', r));
      const timer = setTimeout(() => server.kill(), 10_000);
      await exited;
      clearTimeout(timer);
    }
    sink?.server.close();
    if (work) rmSync(work, { recursive: true, force: true });
  });

  beforeEach(() => {
    rmSync(rateFile(), { recursive: true, force: true });
    sink.mails.length = 0;
    sink.auth.length = 0;
    sink.refuse = false;
  });

  const valid = {
    anliegen: 'handel', name: 'Ada Ende-zu-Ende', email: 'ada.e2e@example.com', unternehmen: 'Feinkost Prüfstand',
    format: 'display', menge: '3 Displays', unterlagen: 'on', nachricht: 'Grüße aus dem Test.\nZweite Zeile 😀',
  };
  const form = (fields) => new URLSearchParams({ gestartet: String(Date.now() - 60_000), website: '', ...fields }).toString();
  const post = (body, { json = true, type = 'application/x-www-form-urlencoded', from = origin, method = 'POST' } = {}) => {
    const headers = {};
    if (type) headers['content-type'] = type;
    if (from) headers.origin = from;
    if (json) headers.accept = 'application/json';
    return fetch(`${base}/api/anfrage/`, { method, headers, body, redirect: 'manual' });
  };

  test('valid inquiry: 200 JSON, mail over SMTP with config envelope, structured Reply-To and the composed text', async () => {
    const res = await post(form(valid));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.match(res.headers.get('content-type'), /^application\/json/);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(sink.mails.length, 1);
    const [mail] = sink.mails;
    assert.equal(mail.from, FROM);
    assert.deepEqual(mail.to, [TO]);
    assert.deepEqual(sink.auth, [['', SMTP_USER, SMTP_PASS]]);
    const parsed = parseMail(mail.data);
    const expected = composeMail(inquirySchema.parse(valid));
    assert.match(parsed.header('from'), new RegExp(`<?${FROM}>?$`));
    assert.equal(parsed.header('to'), TO);
    assert.equal(decodeWords(parsed.header('reply-to')), 'Ada Ende-zu-Ende <ada.e2e@example.com>');
    assert.equal(decodeWords(parsed.header('subject')), expected.subject);
    assert.match(parsed.header('content-type'), /text\/plain; charset=utf-8/i);
    // Same text; only the final line break belongs to the SMTP framing (byte equality: see the parity test).
    assert.equal(parsed.text.replace(/\n+$/, ''), expected.text.replace(/\n+$/, ''));
    assert.equal(parsed.headers.filter(([n]) => n === 'bcc' || n === 'cc').length, 0);
  });

  test('without JavaScript: 303 to the result pages', async () => {
    let res = await post(form(valid), { json: false });
    assert.equal(res.status, 303);
    assert.equal(res.headers.get('location'), '/anfrage/gesendet/');
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(sink.mails.length, 1);
    res = await post(form({ ...valid, email: 'kaputt' }), { json: false });
    assert.equal(res.status, 303);
    assert.equal(res.headers.get('location'), '/anfrage/fehler/?grund=validation');
  });

  test('invalid input: 422 with the field messages of schema.ts, nothing sent', async () => {
    const bad = { anliegen: 'catering', name: 'A', email: 'nope', gaeste: '2.5', termin: '1.12.2026' };
    const res = await post(form(bad));
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error, 'validation');
    assert.equal(body.message, 'Bitte prüfe die markierten Angaben.');
    assert.deepEqual(body.fields, fieldErrors(inquirySchema.safeParse(bad).error));
    assert.equal(sink.mails.length, 0);
  });

  test('header injection: CRLF in the name is refused; a tricky display name stays inside Reply-To', async () => {
    const res = await post(form({ ...valid, name: 'Ada\r\nBcc: evil@example.com' }));
    assert.equal(res.status, 422);
    assert.ok((await res.json()).fields.name);
    assert.equal(sink.mails.length, 0);

    const tricky = 'Eve <evil@example.com>, "Mallory" =?utf-8?Q?x?=';
    assert.equal((await post(form({ ...valid, name: tricky }))).status, 200);
    const [mail] = sink.mails;
    assert.deepEqual(mail.to, [TO]);
    const parsed = parseMail(mail.data);
    assert.match(parsed.header('reply-to'), /<ada\.e2e@example\.com>$/);
    assert.equal(parsed.headers.filter(([n]) => n === 'bcc' || n === 'cc').length, 0);
    assert.equal(parsed.headers.filter(([n]) => n === 'reply-to').length, 1);
  });

  test('wrong content type: 415; oversized body: 413', async () => {
    let res = await post(JSON.stringify(valid), { type: 'application/json' });
    assert.equal(res.status, 415);
    assert.equal((await res.json()).error, 'type');
    res = await post('x', { type: 'text/plain' });
    assert.equal(res.status, 415);
    res = await post(form({ ...valid, nachricht: 'x'.repeat(17 * 1024) }));
    assert.equal(res.status, 413);
    assert.equal((await res.json()).error, 'size');
    assert.equal(sink.mails.length, 0);
  });

  test('origin check like Astro: foreign or missing Origin on a form post is 403', async () => {
    for (const from of ['https://evil.example', null, 'null', `${origin}/`]) {
      const res = await post(form(valid), { from });
      assert.equal(res.status, 403, String(from));
    }
    assert.equal((await post(undefined, { type: null, from: null })).status, 403);
    assert.equal((await post(form(valid), { type: 'multipart/form-data; boundary=x', from: 'https://evil.example' })).status, 403);
    assert.equal(sink.mails.length, 0);
  });

  test('other methods: 405 with Allow: POST', async () => {
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const res = await post(method === 'GET' ? undefined : form(valid), { method, type: method === 'GET' ? null : undefined });
      assert.equal(res.status, 405, method);
      assert.equal(res.headers.get('allow'), 'POST');
      assert.equal(res.headers.get('cache-control'), 'no-store');
    }
  });

  test('honeypot and minimum fill time: answer ok, deliver nothing', async () => {
    let res = await post(form({ ...valid, website: 'https://spam.example' }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    res = await post(form({ ...valid, gestartet: String(Date.now()) }));
    assert.deepEqual(await res.json(), { ok: true });
    res = await post(form({ ...valid, website: 'x' }), { json: false });
    assert.equal(res.headers.get('location'), '/anfrage/gesendet/');
    assert.equal(sink.mails.length, 0);
  });

  test('rate limit: 8 per address, then 429 with Retry-After; the file holds no plain address', async () => {
    for (let i = 0; i < 8; i++) assert.equal((await post(form({ name: 'x' }))).status, 422, `attempt ${i + 1}`);
    let res = await post(form(valid));
    assert.equal(res.status, 429);
    const retry = Number(res.headers.get('retry-after'));
    assert.ok(retry >= 1 && retry <= 600, `retry-after ${retry}`);
    assert.equal((await res.json()).error, 'rate');
    res = await post(form(valid), { json: false });
    assert.equal(res.headers.get('location'), '/anfrage/fehler/?grund=rate');
    assert.ok(res.headers.get('retry-after'));
    assert.equal(sink.mails.length, 0);
    const stored = readFileSync(rateFile(), 'utf8');
    assert.doesNotMatch(stored, /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|::1/);
    const keys = Object.keys(JSON.parse(stored));
    assert.deepEqual(keys.sort(), ['all', keys.find((k) => k !== 'all')].sort());
    assert.match(keys.find((k) => k !== 'all'), /^c:[0-9a-f]{64}$/);
  });

  test('global ceiling: 120 attempts in 10 minutes across all addresses', async () => {
    const now = Date.now();
    writeFileSync(rateFile(), JSON.stringify({ all: Array.from({ length: 120 }, (_, i) => now - 1000 * i) }));
    const res = await post(form(valid));
    assert.equal(res.status, 429);
    assert.ok(Number(res.headers.get('retry-after')) >= 1);
    // entries older than the window are dropped
    writeFileSync(rateFile(), JSON.stringify({ all: Array.from({ length: 120 }, () => now - 601_000) }));
    assert.equal((await post(form(valid))).status, 200);
    assert.equal(JSON.parse(readFileSync(rateFile(), 'utf8')).all.length, 1);
  });

  test('delivery refused or configuration missing: 503, never 200', async () => {
    sink.refuse = true;
    let res = await post(form(valid));
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'unavailable');
    res = await post(form(valid), { json: false });
    assert.equal(res.headers.get('location'), '/anfrage/fehler/?grund=unavailable');
    sink.refuse = false;

    renameSync(configFile(), configFile() + '.off');
    try {
      res = await post(form(valid));
      assert.equal(res.status, 503);
      assert.equal(res.headers.get('cache-control'), 'no-store');
    } finally {
      renameSync(configFile() + '.off', configFile());
    }
    assert.equal(sink.mails.length, 0);
  });

  test('unexpected error (rate-limit store unusable): 500 with the generic message', async () => {
    mkdirSync(rateFile());
    const res = await post(form(valid));
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), {
      ok: false, error: 'unavailable', message: 'Die Anfrage konnte gerade nicht zugestellt werden. Bitte schreib uns direkt oder ruf an.',
    });
  });

  test('error log: causes only, no form contents, no credentials', () => {
    assert.match(log, /\[anfrage\] delivery failed/);
    assert.match(log, /\[anfrage\] configuration missing/);
    assert.match(log, /\[anfrage\] unexpected error/);
    for (const secret of [SMTP_PASS, 'ada.e2e@example.com', 'Ende-zu-Ende', 'Feinkost', 'Grüße', 'evil@example.com']) {
      assert.ok(!log.includes(secret), `log contains ${secret}`);
    }
  });
});
