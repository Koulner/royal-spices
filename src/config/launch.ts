// Launch switch. The site asks search engines to stay away until it is explicitly released:
// set SITE_INDEXABLE=1 at build time once product truth, legal texts and hosting are signed off.
export const indexable = (process.env.SITE_INDEXABLE ?? import.meta.env.SITE_INDEXABLE) === '1';

// Bildbruch S6 der Startseite: Das Safranfaden-Foto von royalspices.de (vermutlich ein Stockfoto)
// erscheint erst mit LIVE_THREADS_LICENSED=1, also wenn die Lizenz bestätigt ist; bis dahin das V1-Still.
export const liveThreadsLicensed = (process.env.LIVE_THREADS_LICENSED ?? import.meta.env.LIVE_THREADS_LICENSED) === '1';
