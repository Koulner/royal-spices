// robots.txt is generated so it can follow the launch switch.
// Until SITE_INDEXABLE=1 is set at build time the whole site asks not to be indexed:
// product truth, legal texts and hosting are not signed off yet (docs/QA.md).
import type { APIRoute } from 'astro';
import { indexable } from '@/config/launch';

export const GET: APIRoute = ({ site }) => {
  const lines = indexable
    ? ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /anfrage/', '', `Sitemap: ${new URL('sitemap-index.xml', site).href}`]
    : ['User-agent: *', 'Disallow: /'];
  return new Response(lines.join('\n') + '\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
