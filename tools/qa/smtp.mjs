// Inquiry delivery over SMTP, end to end, without a real mailbox.
//   npm run build && node tools/qa/smtp.mjs
// Starts a local SMTP sink and the production server (server.mjs) configured to deliver to it,
// posts inquiries to /api/anfrage/ and inspects what arrives on the wire: envelope, headers, body.
// This exercises the real transport code (nodemailer); it does not prove that a particular mail
// provider accepts the configuration — that needs the real credentials once.
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HTTP_PORT = 4399;
const TO = 'inbox@royalspices.test';
const FROM = 'website@royalspices.test';

// ---------------------------------------------------------------- SMTP sink
const mails = [];
const sink = createServer((socket) => {
  socket.setEncoding('utf8');
  let buffer = '';
  let inData = false;
  let mail = { from: '', to: [], data: '' };
  socket.write('220 sink ESMTP\r\n');
  socket.on('data', (chunk) => {
    buffer += chunk;
    for (;;) {
      if (inData) {
        const end = buffer.indexOf('\r\n.\r\n');
        if (end < 0) return;
        // undo dot-stuffing, as a receiving server does
        mail.data = buffer.slice(0, end).replace(/\r\n\.\./g, '\r\n.');
        buffer = buffer.slice(end + 5);
        inData = false;
        mails.push(mail);
        mail = { from: '', to: [], data: '' };
        socket.write('250 queued\r\n');
        continue;
      }
      const eol = buffer.indexOf('\r\n');
      if (eol < 0) return;
      const line = buffer.slice(0, eol);
      buffer = buffer.slice(eol + 2);
      const verb = line.slice(0, 4).toUpperCase();
      if (verb === 'EHLO' || verb === 'HELO') socket.write('250-sink\r\n250 8BITMIME\r\n');
      else if (verb === 'MAIL') (mail.from = /<([^>]*)>/.exec(line)?.[1] ?? ''), socket.write('250 ok\r\n');
      else if (verb === 'RCPT') mail.to.push(/<([^>]*)>/.exec(line)?.[1] ?? ''), socket.write('250 ok\r\n');
      else if (verb === 'DATA') (inData = true), socket.write('354 go ahead\r\n');
      else if (verb === 'QUIT') socket.end('221 bye\r\n');
      else socket.write('250 ok\r\n');
    }
  });
  socket.on('error', () => {});
});
await new Promise((resolve) => sink.listen(0, '127.0.0.1', resolve));
const smtpPort = sink.address().port;

// ---------------------------------------------------------------- message reading
const decodeWords = (value) =>
  value.replace(/=\?utf-8\?([bq])\?([^?]*)\?=(\s+(?==\?))?/gi, (_, kind, text) =>
    kind.toLowerCase() === 'b'
      ? Buffer.from(text, 'base64').toString('utf8')
      : Buffer.from(text.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16))), 'latin1').toString('utf8'),
  );

function read(raw) {
  const split = raw.indexOf('\r\n\r\n');
  const headers = {};
  for (const line of raw.slice(0, split).replace(/\r\n[ \t]+/g, ' ').split('\r\n')) {
    const colon = line.indexOf(':');
    headers[line.slice(0, colon).toLowerCase()] = line.slice(colon + 1).trim();
  }
  let body = raw.slice(split + 4);
  const encoding = (headers['content-transfer-encoding'] ?? '').toLowerCase();
  if (encoding === 'base64') body = Buffer.from(body, 'base64').toString('utf8');
  else if (encoding === 'quoted-printable') {
    body = Buffer.from(body.replace(/=\r\n/g, '').replace(/=([0-9A-F]{2})/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16))), 'latin1').toString('utf8');
  }
  return { headers, names: Object.keys(headers), body: body.replace(/\r\n/g, '\n') };
}

// ---------------------------------------------------------------- server under test
const server = spawn(process.execPath, ['server.mjs'], {
  cwd: root,
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(HTTP_PORT), SMTP_URL: `smtp://127.0.0.1:${smtpPort}`, INQUIRY_TO: TO, INQUIRY_FROM: `Royal Spices Website <${FROM}>` },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', (d) => (log += d));
server.stderr.on('data', (d) => (log += d));
const origin = `http://127.0.0.1:${HTTP_PORT}`;
for (let i = 0; i < 80; i++) {
  try {
    await fetch(origin + '/robots.txt');
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 250));
  }
}

const post = (fields, accept = 'application/json') =>
  fetch(origin + '/api/anfrage/', {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin, accept },
    body: new URLSearchParams(fields).toString(),
  });

let failed = 0;
const check = (ok, text) => {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

try {
  // ---- 1. a valid trade inquiry with awkward but legitimate characters
  console.log('valid inquiry');
  const name = 'Ada "Lovelace", Gräfin';
  let response = await post({ anliegen: 'handel', name, unternehmen: 'Müller & Söhne', email: 'ada@example.com', land: 'Österreich', format: 'lose', menge: '15 kg', unterlagen: 'on', nachricht: 'Guten Tag,\nbitte um ein Angebot.\n\nGrüße' });
  check(response.status === 200 && (await response.json()).ok === true, 'endpoint answers 200 ok');
  check(mails.length === 1, 'exactly one mail on the wire');
  const first = mails[0] ? read(mails[0].data) : { headers: {}, names: [], body: '' };
  check(mails[0]?.from === FROM && mails[0]?.to.join() === TO, `envelope: from ${mails[0]?.from} to ${mails[0]?.to.join()}`);
  check(/inbox@royalspices\.test/.test(first.headers.to ?? '') && !first.names.includes('cc') && !first.names.includes('bcc'), 'headers: one recipient, no Cc/Bcc');
  const replyTo = decodeWords(first.headers['reply-to'] ?? '');
  check(/<ada@example\.com>$/.test(replyTo) && replyTo.includes('Gräfin'), `Reply-To is the sender, name encoded: ${first.headers['reply-to']}`);
  check(decodeWords(first.headers.subject ?? '') === `Anfrage Handel / Großhandel – ${name}`, `subject: ${decodeWords(first.headers.subject ?? '')}`);
  check(/^text\/plain/i.test(first.headers['content-type'] ?? ''), `plain text only: ${first.headers['content-type']}`);
  check(first.body.includes('Unternehmen: Müller & Söhne') && first.body.includes('Land / Markt: Österreich') && first.body.includes('Gewünschte Menge: 15 kg') && first.body.includes('bitte um ein Angebot.'), 'body carries the validated fields, umlauts intact');

  // ---- 2. header injection through single-line fields is refused before any mail is built
  console.log('header injection');
  response = await post({ anliegen: 'handel', name: 'Ada\r\nBcc: evil@example.com', email: 'ada@example.com' });
  check(response.status === 422 && mails.length === 1, 'line break in the name: 422, nothing sent');
  response = await post({ anliegen: 'handel', name: 'Ada Beispiel', email: 'ada@example.com\nBcc: evil@example.com' });
  check(response.status === 422 && mails.length === 1, 'line break in the e-mail address: 422, nothing sent');

  // ---- 3. the message field may contain anything printable; it must stay body text
  console.log('message content');
  const tricky = 'Zeile 1\n.\nMAIL FROM:<evil@example.com>\nBcc: evil@example.com\n\nSubject: anders';
  response = await post({ anliegen: 'produkt', name: 'Ada Beispiel', email: 'ada@example.com', nachricht: tricky });
  const second = mails[1] ? read(mails[1].data) : { headers: {}, names: [], body: '' };
  check(response.status === 200 && mails.length === 2, 'accepted, exactly one more mail');
  check(mails[1]?.to.join() === TO && !second.names.includes('bcc'), 'still one recipient, no Bcc header');
  check(second.body.includes(tricky), 'the text arrives unchanged in the body, including the lone dot');
  check(decodeWords(second.headers.subject ?? '') === 'Anfrage Safran im Glas – Ada Beispiel', 'subject is the composed one, not the one from the message');

  // ---- 4. a form post without JavaScript is redirected to the result page
  console.log('without JavaScript');
  response = await post({ anliegen: 'sonstiges', name: 'Ada Beispiel', email: 'ada@example.com' }, 'text/html');
  check(response.status === 303 && response.headers.get('location') === '/anfrage/gesendet/' && mails.length === 3, `303 to ${response.headers.get('location')}, mail sent`);

  // ---- 5. the mail server is gone: the visitor is told, nothing pretends to be sent
  console.log('mail server unreachable');
  await new Promise((resolve) => sink.close(resolve));
  response = await post({ anliegen: 'sonstiges', name: 'Ada Beispiel', email: 'ada@example.com' });
  const body = await response.text();
  check(response.status === 503 && /nicht zugestellt/.test(body), '503 with the plain "could not be delivered" message');
  check(!/ECONNREFUSED|at |node:|nodemailer/i.test(body), 'no internals in the answer');
  check(/delivery failed/.test(log), 'the failure is in the server log');
} finally {
  server.kill();
  if (sink.listening) sink.close();
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
