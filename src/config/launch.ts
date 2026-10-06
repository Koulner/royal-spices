// Launch switch. The site asks search engines to stay away until it is explicitly released:
// set SITE_INDEXABLE=1 at build time once product truth, legal texts and hosting are signed off.
export const indexable = (process.env.SITE_INDEXABLE ?? import.meta.env.SITE_INDEXABLE) === '1';
