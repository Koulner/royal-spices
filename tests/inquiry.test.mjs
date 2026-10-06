// Server-side inquiry rules: what is accepted, what is refused, how mail is composed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { inquirySchema, fieldErrors, composeMail } from '../src/lib/inquiry/schema.ts';
import { createRateLimiter } from '../src/lib/inquiry/rate-limit.ts';

const valid = { anliegen: 'handel', name: 'Ada Beispiel', email: 'ada@example.com' };

test('accepts a minimal valid inquiry and fills defaults', () => {
  const result = inquirySchema.safeParse(valid);
  assert.equal(result.success, true);
  assert.equal(result.data.unterlagen, false);
  assert.equal(result.data.format, '');
  assert.equal(result.data.nachricht, '');
});

test('trims input and keeps optional trade fields', () => {
  const result = inquirySchema.parse({ ...valid, name: '  Ada Beispiel  ', format: 'lose', menge: '15 kg', land: 'Österreich', unterlagen: 'on' });
  assert.equal(result.name, 'Ada Beispiel');
  assert.equal(result.format, 'lose');
  assert.equal(result.unterlagen, true);
});

test('rejects missing name, bad e-mail and unknown topic with German field messages', () => {
  const result = inquirySchema.safeParse({ anliegen: 'gratis', name: 'A', email: 'nope' });
  assert.equal(result.success, false);
  const errors = fieldErrors(result.error);
  assert.deepEqual(Object.keys(errors).sort(), ['anliegen', 'email', 'name']);
  assert.match(errors.email, /E-Mail/);
});

test('enforces length limits', () => {
  const long = inquirySchema.safeParse({ ...valid, nachricht: 'x'.repeat(2001) });
  assert.equal(long.success, false);
  assert.ok(fieldErrors(long.error).nachricht);
  assert.equal(inquirySchema.safeParse({ ...valid, name: 'x'.repeat(101) }).success, false);
  assert.equal(inquirySchema.safeParse({ ...valid, nachricht: 'x'.repeat(2000) }).success, true);
});

test('refuses line breaks and control characters in single-line fields (mail header safety)', () => {
  for (const name of ['Ada\r\nBcc: x@example.com', 'Ada\nB', 'Ada\u0000']) {
    assert.equal(inquirySchema.safeParse({ ...valid, name }).success, false, JSON.stringify(name));
  }
  assert.equal(inquirySchema.safeParse({ ...valid, email: 'ada@example.com\r\nBcc: x@example.com' }).success, false);
  // a message may contain line breaks
  assert.equal(inquirySchema.safeParse({ ...valid, nachricht: 'Zeile 1\nZeile 2' }).success, true);
});

test('validates catering numbers and dates', () => {
  const base = { ...valid, anliegen: 'catering' };
  assert.equal(inquirySchema.parse({ ...base, gaeste: '40', termin: '2026-12-01' }).gaeste, 40);
  assert.equal(inquirySchema.parse({ ...base, gaeste: '' }).gaeste, undefined);
  assert.equal(inquirySchema.safeParse({ ...base, gaeste: '0' }).success, false);
  assert.equal(inquirySchema.safeParse({ ...base, gaeste: '2.5' }).success, false);
  assert.equal(inquirySchema.safeParse({ ...base, gaeste: '99999' }).success, false);
  assert.equal(inquirySchema.safeParse({ ...base, termin: '1.12.2026' }).success, false);
});

test('restricts phone numbers to dialling characters', () => {
  assert.equal(inquirySchema.safeParse({ ...valid, telefon: '+49 (0)40 5937-4940' }).success, true);
  assert.equal(inquirySchema.safeParse({ ...valid, telefon: '<script>' }).success, false);
});

test('composes a plain-text mail from validated data only', () => {
  const inquiry = inquirySchema.parse({ ...valid, unternehmen: 'Feinkost GmbH', format: 'display', menge: '4 Displays', unterlagen: 'on', nachricht: 'Bitte um Angebot.' });
  const mail = composeMail(inquiry);
  assert.equal(mail.subject, 'Anfrage Handel / Großhandel – Ada Beispiel');
  assert.match(mail.text, /Gebinde: Display, 24 Gläser à 1 g/);
  assert.match(mail.text, /Gewünschte Menge: 4 Displays/);
  assert.match(mail.text, /Unterlagen: Bitte verfügbare Labor- und Herkunftsunterlagen mitsenden\./);
  assert.match(mail.text, /Nachricht:\nBitte um Angebot\./);
  assert.doesNotMatch(mail.text, /Anlass|Gäste/);
});

test('catering mail carries the event details instead of trade fields', () => {
  const mail = composeMail(inquirySchema.parse({ ...valid, anliegen: 'catering', anlass: 'Firmenempfang', gaeste: '60', termin: '2026-11-20', ort: 'Hamburg' }));
  assert.match(mail.text, /Anlass: Firmenempfang/);
  assert.match(mail.text, /Gäste: 60/);
  assert.doesNotMatch(mail.text, /Gebinde/);
});

test('rate limiter allows the budget, then refuses, then recovers after the window', () => {
  const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });
  const t0 = 1_000_000;
  assert.equal(limiter.take('a', t0).allowed, true);
  assert.equal(limiter.take('a', t0 + 10).allowed, true);
  assert.equal(limiter.take('a', t0 + 20).allowed, true);
  const refused = limiter.take('a', t0 + 30);
  assert.equal(refused.allowed, false);
  assert.equal(refused.retryAfterSeconds, 1);
  // another client is unaffected
  assert.equal(limiter.take('b', t0 + 30).allowed, true);
  // window has passed for the first attempts
  assert.equal(limiter.take('a', t0 + 1001).allowed, true);
});

test('rate limiter forgets idle clients', () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 100 });
  limiter.take('a', 0);
  limiter.take('b', 50);
  assert.equal(limiter.size(), 2);
  limiter.take('c', 1000);
  assert.equal(limiter.size(), 1);
});
