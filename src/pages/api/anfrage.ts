// POST /api/anfrage/ — the only server-rendered route of the site.
// Security boundary: everything arriving here is untrusted.
//   - same-origin only (Astro security.checkOrigin rejects cross-site form posts)
//   - body size capped before parsing, content type restricted
//   - schema validation with per-field limits (src/lib/inquiry/schema.ts)
//   - rate limit per client address plus a global ceiling
//   - honeypot and minimum fill time against simple bots
//   - errors are generic; nothing internal reaches the client
import type { APIRoute } from 'astro';
import { inquirySchema, fieldErrors } from '@/lib/inquiry/schema';
import { createRateLimiter } from '@/lib/inquiry/rate-limit';
import { deliver, DeliveryUnavailable } from '@/lib/inquiry/deliver';

export const prerender = false;

const MAX_BODY_BYTES = 16 * 1024;
const perClient = createRateLimiter({ limit: 8, windowMs: 10 * 60 * 1000 });
const overall = createRateLimiter({ limit: 120, windowMs: 10 * 60 * 1000 });

type Outcome =
  | { status: 200; body: { ok: true } }
  | { status: number; body: { ok: false; error: string; message: string; fields?: Record<string, string> }; retryAfter?: number };

const MESSAGES = {
  validation: 'Bitte prüfen Sie die markierten Angaben.',
  rate: 'Das waren viele Anfragen in kurzer Zeit. Bitte versuchen Sie es später noch einmal oder rufen Sie uns an.',
  type: 'Die Anfrage konnte so nicht verarbeitet werden.',
  size: 'Die Anfrage ist zu umfangreich. Bitte kürzen Sie Ihre Nachricht.',
  unavailable: 'Die Anfrage konnte gerade nicht zugestellt werden. Bitte schreiben Sie uns direkt oder rufen Sie an.',
};

async function readBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function handle(request: Request, clientAddress: string): Promise<Outcome> {
  const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/x-www-form-urlencoded') {
    return { status: 415, body: { ok: false, error: 'type', message: MESSAGES.type } };
  }

  const global = overall.take('all');
  const client = perClient.take(clientAddress);
  if (!global.allowed || !client.allowed) {
    const retryAfter = Math.max(global.retryAfterSeconds, client.retryAfterSeconds);
    return { status: 429, body: { ok: false, error: 'rate', message: MESSAGES.rate }, retryAfter };
  }

  const raw = await readBody(request);
  if (raw === null) return { status: 413, body: { ok: false, error: 'size', message: MESSAGES.size } };

  const params = new URLSearchParams(raw);
  const data: Record<string, string> = {};
  for (const [key, value] of params) if (!(key in data)) data[key] = value;

  // Bots fill every field and submit at once. Answer as if it worked; deliver nothing.
  const started = Number(data.gestartet ?? '0');
  const tooFast = started > 0 && Date.now() - started < 2500;
  if (data.website || tooFast) return { status: 200, body: { ok: true } };

  const parsed = inquirySchema.safeParse(data);
  if (!parsed.success) {
    return { status: 422, body: { ok: false, error: 'validation', message: MESSAGES.validation, fields: fieldErrors(parsed.error) } };
  }

  try {
    await deliver(parsed.data);
    return { status: 200, body: { ok: true } };
  } catch (error) {
    // Logged for the operator, never echoed to the client.
    console.error('[anfrage] delivery failed:', error instanceof DeliveryUnavailable ? error.message : error);
    return { status: 503, body: { ok: false, error: 'unavailable', message: MESSAGES.unavailable } };
  }
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let outcome: Outcome;
  try {
    outcome = await handle(request, clientAddress);
  } catch (error) {
    console.error('[anfrage] unexpected error:', error);
    outcome = { status: 500, body: { ok: false, error: 'unavailable', message: MESSAGES.unavailable } };
  }

  const headers = new Headers({ 'cache-control': 'no-store' });
  if ('retryAfter' in outcome && outcome.retryAfter) headers.set('retry-after', String(outcome.retryAfter));

  // Scripted submissions get JSON; a plain form post (no JavaScript) is redirected to a result page.
  if ((request.headers.get('accept') ?? '').includes('application/json')) {
    headers.set('content-type', 'application/json; charset=utf-8');
    return new Response(JSON.stringify(outcome.body), { status: outcome.status, headers });
  }
  headers.set('location', outcome.status === 200 ? '/anfrage/gesendet/' : `/anfrage/fehler/?grund=${outcome.body.ok ? '' : outcome.body.error}`);
  return new Response(null, { status: 303, headers });
};

export const ALL: APIRoute = () =>
  new Response(null, { status: 405, headers: { allow: 'POST', 'cache-control': 'no-store' } });
