// Inquiry schema: the single definition of what the server accepts.
// The browser checks the same limits for convenience only; this file is the authority.
import { z } from 'astro/zod';

export const TOPICS = {
  produkt: 'Safran im Glas',
  handel: 'Handel / Großhandel',
  gastronomie: 'Gastronomie',
  catering: 'Catering',
  sonstiges: 'Etwas anderes',
} as const;

export const FORMATS = {
  '': 'Noch offen',
  glas: '1-g-Glas',
  display: 'Display, 24 Gläser à 1 g',
  lose: 'Lose Ware ab 10 kg',
} as const;

export type Topic = keyof typeof TOPICS;
export type Format = keyof typeof FORMATS;

/** Single-line text: trimmed, bounded, no control characters (keeps mail headers and logs clean). */
const line = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Bitte höchstens ${max} Zeichen.`)
    .regex(/^[^\u0000-\u001f\u007f]*$/, 'Bitte ohne Steuerzeichen oder Zeilenumbrüche.');

const optionalLine = (max: number) => line(max).optional().default('');

export const inquirySchema = z.object({
  anliegen: z.enum(Object.keys(TOPICS) as [Topic, ...Topic[]], { message: 'Bitte wählen Sie ein Anliegen.' }),
  name: line(100).min(2, 'Bitte nennen Sie Ihren Namen.'),
  unternehmen: optionalLine(160),
  email: line(180).refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), 'Bitte geben Sie eine gültige E-Mail-Adresse an.'),
  telefon: optionalLine(40).refine((v) => /^[0-9+()/\s.-]*$/.test(v), 'Bitte nur Ziffern und die Zeichen + ( ) / - .'),
  land: optionalLine(80),
  format: z.enum(Object.keys(FORMATS) as [Format, ...Format[]]).optional().default(''),
  menge: optionalLine(60),
  unterlagen: z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean()).default(false),
  anlass: optionalLine(120),
  gaeste: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number({ message: 'Bitte eine Zahl angeben.' }).int('Bitte eine ganze Zahl angeben.').min(1, 'Mindestens 1.').max(5000, 'Höchstens 5000.').optional(),
  ),
  termin: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Bitte ein Datum im Format JJJJ-MM-TT.')
    .optional()
    .default(''),
  ort: optionalLine(160),
  nachricht: z
    .string()
    .trim()
    .max(2000, 'Bitte höchstens 2000 Zeichen.')
    .regex(/^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/, 'Bitte ohne Steuerzeichen.')
    .optional()
    .default(''),
});

export type Inquiry = z.infer<typeof inquirySchema>;

/** Field name -> first message, for inline display next to the field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Plain-text mail body. Values are user input: never interpolated into headers or HTML. */
export function composeMail(inquiry: Inquiry): { subject: string; text: string } {
  const rows: [string, string][] = [
    ['Anliegen', TOPICS[inquiry.anliegen]],
    ['Name', inquiry.name],
    ['Unternehmen', inquiry.unternehmen],
    ['E-Mail', inquiry.email],
    ['Telefon', inquiry.telefon],
    ['Land / Markt', inquiry.land],
  ];
  if (inquiry.anliegen === 'catering') {
    rows.push(['Anlass', inquiry.anlass], ['Gäste', inquiry.gaeste ? String(inquiry.gaeste) : ''], ['Wunschtermin', inquiry.termin], ['Ort', inquiry.ort]);
  } else {
    rows.push(['Gebinde', inquiry.format ? FORMATS[inquiry.format] : ''], ['Gewünschte Menge', inquiry.menge]);
    rows.push(['Unterlagen', inquiry.unterlagen ? 'Bitte verfügbare Labor- und Herkunftsunterlagen mitsenden.' : '']);
  }
  const body = rows
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
  return {
    subject: `Anfrage ${TOPICS[inquiry.anliegen]} – ${inquiry.name}`,
    text: `${body}\n\nNachricht:\n${inquiry.nachricht || '–'}\n`,
  };
}
