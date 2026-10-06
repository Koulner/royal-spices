// Inquiry delivery. Server only.
//   production: SMTP (SMTP_URL + INQUIRY_TO). Without both, delivery is refused loudly —
//               an inquiry must never look sent when it was not.
//   development: appended to .data/inquiries.jsonl so the flow can be exercised without a mailbox.
import { SMTP_URL, INQUIRY_TO, INQUIRY_FROM } from 'astro:env/server';
import { composeMail, type Inquiry } from './schema';

export class DeliveryUnavailable extends Error {
  constructor() {
    super('No inquiry transport configured');
    this.name = 'DeliveryUnavailable';
  }
}

export async function deliver(inquiry: Inquiry): Promise<'smtp' | 'file'> {
  const mail = composeMail(inquiry);

  if (SMTP_URL && INQUIRY_TO) {
    const { createTransport } = await import('nodemailer');
    const transport = createTransport(SMTP_URL);
    await transport.sendMail({
      from: INQUIRY_FROM || INQUIRY_TO,
      to: INQUIRY_TO,
      // structured address: the library encodes it, user input cannot add headers
      replyTo: { name: inquiry.name, address: inquiry.email },
      subject: mail.subject,
      text: mail.text,
    });
    return 'smtp';
  }

  if (import.meta.env.DEV) {
    const { mkdir, appendFile } = await import('node:fs/promises');
    await mkdir('.data', { recursive: true });
    await appendFile('.data/inquiries.jsonl', JSON.stringify({ at: new Date().toISOString(), ...mail, inquiry }) + '\n');
    return 'file';
  }

  throw new DeliveryUnavailable();
}
