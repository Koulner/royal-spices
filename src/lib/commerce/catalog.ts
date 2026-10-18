// Product catalog for the build: /produkte/ and /produkte/<handle>/ are generated from it.
// With a store, title, description, image, price, availability and SKU come from the Storefront API,
// loaded once per build. Without a store, the catalog is made of the handles in src/data/product.ts,
// without price and availability (the pages then lead to the inquiry).
import { createStorefront } from './storefront.ts';
import { formatMoney } from './cart.ts';
import { CommerceError, type CommerceConfig, type ListedProduct } from './types.ts';
import { productFacts, factsToText, type ProductFacts } from '../../data/product.ts';
import { htmlToBlocks, textToBlocks, blocksToText, mapText, type Block } from './rich-text.ts';
import type { Origin, ProductInput } from '../seo/schema.ts';

export interface CatalogProduct {
  handle: string;
  title: string; // mit Store Shopify-Titel, ohne Store aus product.ts
  description: string; // Klartext (Storefront `description`), nie HTML
  body: Block[]; // Beschreibung als Textblöcke (aus `descriptionHtml`, sonst aus dem Klartext), nie HTML
  price: { amount: string; currencyCode: string } | null; // null ohne Store
  available: boolean | null; // null ohne Store
  variantId: string | null; // erste Variante
  sku: string | null; // SKU der ersten Variante; null ohne Store oder wenn Shopify keine hat
  image: { url: string; altText: string | null; width: number; height: number } | null;
  facts: ProductFacts | null; // aus src/data/product.ts per Handle
}

export type CatalogSource = {
  /** null when no store is configured. */
  config: CommerceConfig | null;
  fetchImpl?: typeof fetch;
  facts?: Record<string, ProductFacts>;
};

const factsFor = (facts: Record<string, ProductFacts>, handle: string) => (Object.hasOwn(facts, handle) ? facts[handle] : null);

/**
 * Shopify texts are shown word for word with one exception (decision D3/D4): the quality is "Grade 1",
 * as on the label. The store still says "Grade A" in places until the customer corrects it (O6).
 * The whitespace inside (Shopify uses non-breaking spaces) is kept.
 */
export function toGrade1(text: string): string {
  // No lower-case letter may follow "A": the plain Storefront text glues blocks together ("Grade ASo genießt").
  return text.replace(/\bGrade(\s+)A(?![a-zäöüß0-9])/g, (_, space: string) => `Grade${space}1`);
}

function fromShopify(p: ListedProduct, facts: ProductFacts | null): CatalogProduct {
  const v = p.firstVariant;
  const image = p.images[0] ?? null;
  const description = toGrade1(p.description);
  // The structure comes from the editor HTML; without it (or with an empty one) one paragraph per line of text.
  const body = mapText(htmlToBlocks(p.descriptionHtml), toGrade1);
  return {
    handle: p.handle,
    title: toGrade1(p.title),
    description,
    body: body.length ? body : textToBlocks(description),
    price: v ? { amount: v.price.amount, currencyCode: v.price.currencyCode } : null,
    available: v ? v.availableForSale : false,
    variantId: v ? v.id : null,
    sku: v?.sku?.trim() || null,
    image: image && { ...image, altText: image.altText === null ? null : toGrade1(image.altText) },
    facts,
  };
}

/** Builds the catalog from a store (or from product.ts without one). Pages use getCatalog(); tests call this. */
export async function loadCatalog({ config, fetchImpl = fetch, facts = productFacts }: CatalogSource): Promise<CatalogProduct[]> {
  if (!config) {
    return Object.entries(facts).map(([handle, f]) => ({
      handle,
      title: f.title,
      description: factsToText(f),
      body: textToBlocks(factsToText(f)),
      price: null,
      available: null,
      variantId: null,
      sku: null,
      image: null,
      facts: f,
    }));
  }
  let listed: ListedProduct[];
  try {
    listed = await createStorefront(config, fetchImpl).products();
  } catch (error) {
    const reason = error instanceof CommerceError ? `${error.kind}: ${error.message}` : String(error);
    throw new Error(
      `Shopify-Katalog konnte nicht geladen werden (${reason}). Build abgebrochen. Bitte PUBLIC_SHOPIFY_STORE_DOMAIN, PUBLIC_SHOPIFY_STOREFRONT_TOKEN und PUBLIC_SHOPIFY_API_VERSION prüfen.`,
      { cause: error },
    );
  }
  // Order: products known in product.ts in their order (= live collection), then the rest in API order.
  const order = Object.keys(facts);
  const rank = (handle: string) => (order.includes(handle) ? order.indexOf(handle) : order.length);
  return listed.map((p) => fromShopify(p, factsFor(facts, p.handle))).sort((a, b) => rank(a.handle) - rank(b.handle));
}

const compact = (text: string) => text.replace(/\s+/g, '');

/**
 * The structured form (headings, rows, line breaks) of a product description.
 * Storefront `description` is plain text without the HTML structure. When it says word for word what
 * product.ts says (whitespace aside), the page may render the structure from product.ts and still show
 * exactly the Shopify text. When the customer changes the text in Shopify, this returns null and the
 * page shows the Shopify text as it is.
 */
export function structuredDescription(product: CatalogProduct): ProductFacts | null {
  const facts = product.facts;
  return facts && compact(factsToText(facts)) === compact(product.description) ? facts : null;
}

/**
 * Plain text of a product for the meta description and the Product schema, so both say the same:
 * the opening paragraph when the structure is known, otherwise the description blocks joined with
 * spaces (the plain Shopify text glues them together); whitespace collapsed.
 */
export function productPlainText(product: CatalogProduct): string {
  return (structuredDescription(product)?.intro.text ?? blocksToText(product.body)).replace(/\s+/g, ' ').trim();
}

/**
 * Input for buildProduct (src/lib/seo/schema.ts) of a product page. Offer only with a price from
 * Shopify; category, origin and weight only with facts from product.ts. Without a Shopify image the
 * site's /og.jpg, made absolute by buildProduct.
 */
export function productSchemaInput(product: CatalogProduct, origin: Origin): ProductInput {
  return {
    origin,
    path: `/produkte/${product.handle}/`,
    name: product.title,
    description: productPlainText(product),
    images: [product.image ? product.image.url : '/og.jpg'],
    sku: product.sku,
    offer: product.price ? { amount: product.price.amount, currencyCode: product.price.currencyCode, available: product.available === true } : null,
    ...(product.facts ? { category: 'Gewürze', countryOfOrigin: 'Afghanistan', netGrams: product.facts.netGrams } : {}),
  };
}

/** Open Graph size of a product page: 1200 × 630, as /og.jpg. */
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/**
 * Open Graph image of a product page: the Shopify image, cut to 1200 × 630 by the Shopify CDN
 * (width, height, crop=center; existing parameters such as v are kept). null without a Shopify image
 * or with one smaller than 1200 × 630, then Base.astro uses /og.jpg: the CDN does not upscale, so a
 * smaller image would arrive smaller than the declared size (1024 × 1536 comes back as 420 × 630).
 */
export function productOgImage(product: CatalogProduct): { src: string; width: number; height: number } | null {
  if (!product.image || product.image.width < OG_WIDTH || product.image.height < OG_HEIGHT) return null;
  const url = new URL(product.image.url);
  url.searchParams.set('width', String(OG_WIDTH));
  url.searchParams.set('height', String(OG_HEIGHT));
  url.searchParams.set('crop', 'center');
  return { src: url.href, width: OG_WIDTH, height: OG_HEIGHT };
}

let catalog: Promise<CatalogProduct[]> | undefined;

/** Build time only. Loaded once per build; an API error rejects and so stops the build. */
export function getCatalog(): Promise<CatalogProduct[]> {
  // config.ts reads astro:env; imported lazily so that this module also loads in plain Node (tests).
  catalog ??= import('./config.ts').then(({ commerceEnabled, commerceConfig }) => loadCatalog({ config: commerceEnabled ? commerceConfig : null }));
  return catalog;
}

export async function getProduct(handle: string): Promise<CatalogProduct | undefined> {
  return (await getCatalog()).find((p) => p.handle === handle);
}

/** German format (de-DE), e.g. "3,50 €". The amount is taken as Shopify sends it, e.g. "3.5". */
export function formatPrice(p: { amount: string; currencyCode: string }): string {
  return formatMoney(p, 'de-DE');
}
