// Permanent redirects (301) from the paths of the former Shopify storefront on royalspices.de
// (as of 2026-10-15, docs/LIVE-INVENTAR.md rows P1–P3, Q1–Q11, W1) and from retired V1 paths.
// server.mjs looks every GET/HEAD request up here before it serves a static file, so the table
// also wins over pages that still exist in dist/ during the switch-over.
// Plain JavaScript, because server.mjs loads this file directly at runtime. Its only import is
// handles.mjs next to it, plain JavaScript as well (the product handles, in one place).

import { HANDLES, productPath } from './handles.mjs';

/**
 * Old path → current page. Keys are lower case and without a trailing slash; lookups
 * normalise the request path the same way, so `/Pages/Contact/` matches `/pages/contact`.
 * Every target is a V1 page path with a trailing slash and is never itself a key.
 */
export const REDIRECTS = new Map([
  // Shopify collections (P1), the "continue shopping" target of the cart (Q11) and the
  // storefront's default collection frontpage (W1; its product paths already redirect below)
  ['/collections/safran', '/produkte/'],
  ['/collections/all', '/produkte/'],
  ['/collections/frontpage', '/produkte/'],

  // Shopify pages (Q1–Q8)
  ['/pages/herkunft-qualitat', '/herkunft-qualitaet/'],
  ['/pages/catering', '/catering/'],
  ['/pages/b2b-zusammenarbeit', '/b2b/'],
  ['/pages/ueber-uns', '/ueber-uns/'],
  ['/pages/contact', '/kontakt/'],
  ['/pages/faq', '/faq/'],
  ['/pages/versand-lieferung', '/versand-lieferung/'],
  ['/pages/impressum', '/impressum/'],

  // Shopify policies (Q9, Q10). terms-of-service and refund-policy are deliberately missing:
  // V1 has no terms or withdrawal page, so they answer 404 (as they already did on the live shop).
  ['/policies/privacy-policy', '/datenschutz/'],
  ['/policies/legal-notice', '/impressum/'],
  ['/policies/shipping-policy', '/versand-lieferung/'],
  ['/policies/contact-information', '/kontakt/'],

  // cart, search and blog (Q11): the cart lives in a dialog, there is no search (decision O3),
  // the blog was empty
  ['/cart', '/produkte/'],
  ['/search', '/produkte/'],
  ['/blogs/news', '/'],

  // retired V1 paths
  ['/handel', '/b2b/'],
  ['/gastronomie', '/b2b/'],
  ['/produkte/safran-negin-1g', productPath(HANDLES.oneGram)],
]);

// Shopify product URLs (P2, P3), also in their collection-scoped form. The handle is kept:
// V1 product pages use the Shopify handle. Only plain handles match, so `.json`/`.js` endpoints
// and anything unexpected fall through to the 404 page.
const PRODUCT = /^\/(?:collections\/[a-z0-9][a-z0-9-]*\/)?products\/([a-z0-9][a-z0-9-]*)$/;

/** Lower case, trailing slashes removed (the root stays `/`). */
export function normalizePath(pathname) {
  let path = pathname.toLowerCase();
  while (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path;
}

/**
 * The V1 path an old URL path should be redirected to, or null if the path is not an old one.
 * Takes the path only; the caller appends the query string unchanged.
 * @param {string} pathname
 * @returns {string | null}
 */
export function redirectTarget(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return null;
  const path = normalizePath(pathname);
  const fixed = REDIRECTS.get(path);
  if (fixed) return fixed;
  const product = PRODUCT.exec(path);
  if (product) return `/produkte/${product[1]}/`;
  return null;
}
