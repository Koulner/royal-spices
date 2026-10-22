// The Shopify handles the website names in its code, in one place (decision B2, T-20261018-12).
// Links, product facts, the redirect table and the QA page lists read them from here; no other file
// under src/ spells them out. A handle is the product's address in Shopify and its page path here:
// /produkte/<handle>/. A build with a store stops if one of them is missing from the Shopify catalog
// (src/lib/commerce/catalog.ts, docs/SHOPIFY.md "Handles"). Without a store nothing is checked.
// Plain JavaScript with JSDoc and without imports: server.mjs loads it at runtime via redirects.mjs.

/** The products the site links to by name. Keys are names in the code, values the Shopify handles. */
export const HANDLES = Object.freeze({
  /** Safranfäden im Glas, 1 g. */
  oneGram: 'herat-negin-safran-1-g-grade-a',
  /** Safranfäden im Glas, 0,5 g. */
  halfGram: 'safran-herat-negin-0-5g',
});

/** @typedef {keyof typeof HANDLES} HandleKey */

/**
 * Website files that use each handle (paths from the project root), so the build guard can say
 * what breaks when Shopify no longer has it. tests/handles.test.mjs checks this list against src/.
 * @type {Readonly<Record<HandleKey, readonly string[]>>}
 */
export const HANDLE_USES = Object.freeze({
  oneGram: Object.freeze([
    'src/components/home/HomeCollection.astro',
    'src/components/home/HomeJourney.astro',
    'src/config/redirects.mjs',
    'src/data/product.ts',
  ]),
  halfGram: Object.freeze(['src/components/home/HomeCollection.astro', 'src/data/product.ts']),
});

/**
 * Path of a product page.
 * @param {string} handle
 * @returns {string} `/produkte/<handle>/`
 */
export function productPath(handle) {
  return `/produkte/${handle}/`;
}

/**
 * The named handles that are not in the given list of catalog handles, each with its uses.
 * @param {Iterable<string>} available handles of the Shopify catalog
 * @returns {{ handle: string, uses: readonly string[] }[]}
 */
export function missingHandles(available) {
  const present = new Set(available);
  return /** @type {HandleKey[]} */ (Object.keys(HANDLES))
    .filter((key) => !present.has(HANDLES[key]))
    .map((key) => ({ handle: HANDLES[key], uses: HANDLE_USES[key] }));
}
