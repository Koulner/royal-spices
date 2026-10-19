// Schema.org builders for JSON-LD (SEO S0a, docs/UEBERGABE-SEO.md Phase 1, docs/SEO.md).
// Pure functions: page data comes in as parameters, company facts (name, address, phone) only
// through napFromSite(), which reads src/config/site.ts. Nothing here repeats a value from there.
// Prices, SKUs and availability come from Shopify via the caller; nothing is hard-coded.
// Deliberately missing (criterion S3): FAQPage (no FAQ rich results since 05/2026), HowTo, and
// Review/AggregateRating (only with real reviews, UWG § 5b, guideline 5 of the plan).
// Only erasable TypeScript syntax: the tests import this file with node --experimental-strip-types.

import { site } from '../../config/site.ts';

export const SCHEMA_CONTEXT = 'https://schema.org';

/** Merchant listings on royalspices.de are in euro only. */
const CURRENCY = 'EUR';

/** One JSON-LD object, ready for the `schema` prop of Base.astro. */
export type JsonLd = { '@context': typeof SCHEMA_CONTEXT; '@type': string } & Record<string, unknown>;

/** The part of `site` (src/config/site.ts) the builders read; `site` itself satisfies it. */
export type SiteFacts = {
  name: string;
  locale: string;
  email: string;
  phone: { href: string };
  address: { street: string; postalCode: string; city: string; country: string };
};

/** Origin of the site, e.g. `Astro.site` or the value of SITE_URL. */
export type Origin = string | URL;

type Common = { origin: Origin; facts?: SiteFacts };

/** An author: name, optionally the path of the page about the person (e.g. on /ueber-uns/). */
export type Person = { name: string; path?: string };

// ------------------------------------------------------------------------------- helpers

/** Absolute URL of a page on this site: trailing slash, no query, no fragment, never another host. */
export function pageUrl(path: string, origin: Origin): string {
  const base = new URL(origin);
  const url = new URL(path, base);
  if (url.origin !== base.origin) throw new Error(`pageUrl: ${path} is not on ${base.origin}`);
  url.search = '';
  url.hash = '';
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}

/** Absolute URL of an asset; takes a path on this site or an absolute URL (e.g. cdn.shopify.com). */
export function assetUrl(pathOrUrl: string, origin: Origin): string {
  return new URL(pathOrUrl, origin).href;
}

/**
 * JSON for a `<script type="application/ld+json">` element. Every "<" is written as \u003c, so no
 * string (e.g. a Shopify title) can close the script element; JSON.parse returns the same value.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

const homeUrl = (origin: Origin) => pageUrl('/', origin);
const nodeId = (origin: Origin, name: string) => `${homeUrl(origin)}#${name}`;
const language = (facts: SiteFacts) => facts.locale.split('-')[0];

function text(value: string, field: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) throw new Error(`${field} must not be empty`);
  return trimmed;
}

function texts(values: readonly string[] | undefined, field: string): string[] {
  if (!values || values.length === 0) throw new Error(`${field} needs at least one entry`);
  return values.map((value, i) => text(value, `${field}[${i}]`));
}

const DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

/** ISO 8601 date or date-time, as schema.org expects it. */
function isoDate(value: string, field: string): string {
  if (!DATE.test(value) || Number.isNaN(Date.parse(value))) throw new Error(`${field} is not an ISO 8601 date: ${value}`);
  return value;
}

/** datePublished and, only if given, dateModified (never before datePublished). */
function dates(published: string, modified: string | undefined) {
  const datePublished = isoDate(published, 'datePublished');
  if (modified === undefined) return { datePublished };
  const dateModified = isoDate(modified, 'dateModified');
  if (Date.parse(dateModified) < Date.parse(datePublished)) throw new Error('dateModified is before datePublished');
  return { datePublished, dateModified };
}

const DURATION = /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?$/;

/** ISO 8601 duration, e.g. "PT20M". */
function duration(value: string, field: string): string {
  if (!DURATION.test(value)) throw new Error(`${field} is not an ISO 8601 duration: ${value}`);
  return value;
}

function amount(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${field} must be a number >= 0`);
  return value;
}

function person(author: Person, origin: Origin) {
  return {
    '@type': 'Person',
    name: text(author.name, 'author.name'),
    ...(author.path ? { url: pageUrl(author.path, origin) } : {}),
  };
}

/** Reference to the organization node of buildOrganization() (same @id). */
function organizationRef(origin: Origin, facts: SiteFacts) {
  return { '@type': 'Organization', '@id': nodeId(origin, 'organization'), name: facts.name, url: homeUrl(origin) };
}

function images(values: readonly string[], origin: Origin, field: string): string[] {
  return texts(values, field).map((value) => assetUrl(value, origin));
}

// ----------------------------------------------------------------------------- NAP adapter

export type Nap = {
  name: string;
  email: string;
  telephone: string;
  address: { '@type': 'PostalAddress'; streetAddress: string; postalCode: string; addressLocality: string; addressCountry: string };
};

/**
 * Name, address and phone in schema.org form, read from src/config/site.ts (the single source, also
 * for the imprint and the business profiles). The phone number comes from the tel: link (E.164).
 */
export function napFromSite(facts: SiteFacts = site): Nap {
  return {
    name: facts.name,
    email: facts.email,
    telephone: facts.phone.href.replace(/^tel:/, ''),
    address: {
      '@type': 'PostalAddress',
      streetAddress: facts.address.street,
      postalCode: facts.address.postalCode,
      addressLocality: facts.address.city,
      addressCountry: facts.address.country,
    },
  };
}

// ---------------------------------------------------------------- Organization / OnlineStore

/** One shipping tier; amounts in EUR. Example: rate 0 from an order value of minOrderValue. */
export type ShippingCondition = {
  /** ISO 3166-1 alpha-2, e.g. "DE". */
  country: string;
  rate: number;
  minOrderValue?: number;
  maxOrderValue?: number;
};

export type ReturnPolicy = {
  /** ISO 3166-1 alpha-2, e.g. "DE". */
  country: string;
  category: 'finite' | 'unlimited' | 'notPermitted';
  /** Required for category "finite". */
  days?: number;
  method?: 'mail' | 'store';
  fees?: 'free' | 'customer';
  /** Page with the policy, e.g. /widerruf/. */
  path?: string;
};

export type OrganizationInput = Common & {
  /** Default OnlineStore (a subtype of Organization, recommended by Google for online shops). */
  type?: 'Organization' | 'OnlineStore';
  logo?: string;
  sameAs?: readonly string[];
  shipping?: readonly ShippingCondition[];
  returnPolicy?: ReturnPolicy;
};

const RETURN_CATEGORY = {
  finite: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  unlimited: 'https://schema.org/MerchantReturnUnlimitedWindow',
  notPermitted: 'https://schema.org/MerchantReturnNotPermitted',
} as const;
const RETURN_METHOD = { mail: 'https://schema.org/ReturnByMail', store: 'https://schema.org/ReturnInStore' } as const;
const RETURN_FEES = { free: 'https://schema.org/FreeReturn', customer: 'https://schema.org/ReturnFeesCustomerResponsibility' } as const;

function shippingService(conditions: readonly ShippingCondition[]) {
  return {
    '@type': 'ShippingService',
    shippingConditions: conditions.map((c, i) => {
      const min = c.minOrderValue === undefined ? {} : { minValue: amount(c.minOrderValue, `shipping[${i}].minOrderValue`) };
      const max = c.maxOrderValue === undefined ? {} : { maxValue: amount(c.maxOrderValue, `shipping[${i}].maxOrderValue`) };
      return {
        '@type': 'ShippingConditions',
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: text(c.country, `shipping[${i}].country`) },
        ...(c.minOrderValue !== undefined || c.maxOrderValue !== undefined ? { orderValue: { '@type': 'MonetaryAmount', ...min, ...max, currency: CURRENCY } } : {}),
        shippingRate: { '@type': 'MonetaryAmount', value: amount(c.rate, `shipping[${i}].rate`), currency: CURRENCY },
      };
    }),
  };
}

function merchantReturnPolicy(policy: ReturnPolicy, origin: Origin) {
  if (policy.category === 'finite' && !(Number.isInteger(policy.days) && (policy.days ?? 0) > 0)) {
    throw new Error('returnPolicy.days must be a positive integer for category "finite"');
  }
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: text(policy.country, 'returnPolicy.country'),
    returnPolicyCategory: RETURN_CATEGORY[policy.category],
    ...(policy.category === 'finite' ? { merchantReturnDays: policy.days } : {}),
    ...(policy.method ? { returnMethod: RETURN_METHOD[policy.method] } : {}),
    ...(policy.fees ? { returnFees: RETURN_FEES[policy.fees] } : {}),
    ...(policy.path ? { url: pageUrl(policy.path, origin) } : {}),
  };
}

/** The company for the home page: NAP from site.ts, shipping and returns on organization level. */
export function buildOrganization(input: OrganizationInput): JsonLd {
  const { origin, facts = site } = input;
  const nap = napFromSite(facts);
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': input.type ?? 'OnlineStore',
    '@id': nodeId(origin, 'organization'),
    ...nap,
    url: homeUrl(origin),
    ...(input.logo ? { logo: assetUrl(input.logo, origin) } : {}),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: nap.email,
      telephone: nap.telephone,
      availableLanguage: language(facts),
    },
    ...(input.sameAs && input.sameAs.length > 0 ? { sameAs: texts(input.sameAs, 'sameAs') } : {}),
    ...(input.shipping && input.shipping.length > 0 ? { hasShippingService: shippingService(input.shipping) } : {}),
    ...(input.returnPolicy ? { hasMerchantReturnPolicy: merchantReturnPolicy(input.returnPolicy, origin) } : {}),
  };
}

// ------------------------------------------------------------------------------- WebSite

export type WebSiteInput = Common & { alternateName?: readonly string[] };

/** Site name for Google: the company name from site.ts, replacing the live title "www.Royal-Spices.com". No SearchAction: there is no site search (O3). */
export function buildWebSite(input: WebSiteInput): JsonLd {
  const { origin, facts = site } = input;
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebSite',
    '@id': nodeId(origin, 'website'),
    name: facts.name,
    ...(input.alternateName && input.alternateName.length > 0 ? { alternateName: texts(input.alternateName, 'alternateName') } : {}),
    url: homeUrl(origin),
    inLanguage: facts.locale,
    publisher: { '@id': nodeId(origin, 'organization') },
  };
}

// ------------------------------------------------------------------------- BreadcrumbList

export type Crumb = { name: string; path: string };

/** Trail from the home page to the current page; positions 1…n, absolute URLs with trailing slash. */
export function buildBreadcrumbList(input: { origin: Origin; items: readonly Crumb[] }): JsonLd {
  if (input.items.length === 0) throw new Error('breadcrumbs need at least one item');
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: input.items.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: text(crumb.name, `items[${i}].name`),
      item: pageUrl(crumb.path, input.origin),
    })),
  };
}

// ------------------------------------------------------------------------- Product + Offer

/** UN/CEFACT quantity, e.g. { value: 0.5, unitCode: 'GRM' }. */
export type UnitQuantity = { value: number; unitCode: string };

/**
 * Price and availability as Shopify delivers them (amount e.g. "9.5"). unitPricing only with a Shopify
 * unit price: the price applies to `quantity` and is priced per `reference` (Google merchant listing).
 */
export type OfferInput = { amount: string | number; currencyCode?: string; available: boolean; unitPricing?: { quantity: UnitQuantity; reference: UnitQuantity } };

export type ProductInput = Common & {
  /** Page path, e.g. `/produkte/${handle}/`. */
  path: string;
  name: string;
  description?: string;
  /** At least one image; Google wants >= 50,000 pixels, ideally 1:1, 4:3 and 16:9. */
  images: readonly string[];
  /** Shopify SKU; written as sku and mpn (own brand, no GTIN). Omitted while unknown. */
  sku: string | null;
  /** Default: the company name from site.ts. */
  brand?: string;
  /** null without a store. An Offer is written only for a price > 0. */
  offer: OfferInput | null;
  category?: string;
  countryOfOrigin?: string;
  netGrams?: number;
};

function offer(input: OfferInput, url: string, origin: Origin, facts: SiteFacts) {
  const currency = input.currencyCode ?? CURRENCY;
  if (currency !== CURRENCY) throw new Error(`offer currency must be ${CURRENCY}, got ${currency}`);
  const value = typeof input.amount === 'number' ? input.amount : Number(input.amount);
  if (!Number.isFinite(value)) throw new Error(`offer amount is not a number: ${input.amount}`);
  if (value <= 0) return null;
  return {
    '@type': 'Offer',
    url,
    price: value.toFixed(2),
    priceCurrency: CURRENCY,
    availability: input.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    ...(input.unitPricing ? { priceSpecification: unitPriceSpecification(value, input.unitPricing) } : {}),
    seller: organizationRef(origin, facts),
  };
}

/**
 * Unit pricing as Google reads it: the active price (the offer price) for the quantity sold
 * (referenceQuantity, e.g. 0.5 GRM), priced per the base quantity (valueReference, e.g. 1 KGM).
 * The unit price itself follows from these numbers; the visible one comes from Shopify (unit-price.ts).
 */
function unitPriceSpecification(price: number, { quantity, reference }: { quantity: UnitQuantity; reference: UnitQuantity }) {
  const qv = (q: UnitQuantity, field: string) => {
    if (!(q.value > 0) || !/^[A-Z0-9]{2,3}$/.test(q.unitCode)) throw new Error(`${field} must be a positive quantity with a UN/CEFACT code`);
    return { '@type': 'QuantitativeValue', value: q.value, unitCode: q.unitCode };
  };
  return {
    '@type': 'UnitPriceSpecification',
    price: price.toFixed(2),
    priceCurrency: CURRENCY,
    referenceQuantity: { ...qv(quantity, 'unitPricing.quantity'), valueReference: qv(reference, 'unitPricing.reference') },
  };
}

/** A product page. Never writes a GTIN; shipping and returns are on organization level. */
export function buildProduct(input: ProductInput): JsonLd {
  const { origin, facts = site } = input;
  const url = pageUrl(input.path, origin);
  const sku = input.sku?.trim();
  const offers = input.offer ? offer(input.offer, url, origin, facts) : null;
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Product',
    '@id': `${url}#product`,
    name: text(input.name, 'name'),
    ...(input.description ? { description: text(input.description, 'description') } : {}),
    url,
    image: images(input.images, origin, 'images'),
    ...(sku ? { sku, mpn: sku } : {}),
    brand: { '@type': 'Brand', name: text(input.brand ?? facts.name, 'brand') },
    ...(input.category ? { category: text(input.category, 'category') } : {}),
    ...(input.countryOfOrigin ? { countryOfOrigin: { '@type': 'Country', name: text(input.countryOfOrigin, 'countryOfOrigin') } } : {}),
    ...(input.netGrams === undefined ? {} : { weight: { '@type': 'QuantitativeValue', value: amount(input.netGrams, 'netGrams'), unitCode: 'GRM' } }),
    ...(offers ? { offers } : {}),
  };
}

// ------------------------------------------------------------------------------- Article

export type ArticleInput = Common & {
  path: string;
  headline: string;
  description: string;
  images?: readonly string[];
  author: Person;
  datePublished: string;
  /** Only for real changes (plan, phase 5). */
  dateModified?: string;
};

/** A guide article (Ratgeber). */
export function buildArticle(input: ArticleInput): JsonLd {
  const { origin, facts = site } = input;
  const url = pageUrl(input.path, origin);
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Article',
    headline: text(input.headline, 'headline'),
    description: text(input.description, 'description'),
    url,
    mainEntityOfPage: url,
    ...(input.images && input.images.length > 0 ? { image: images(input.images, origin, 'images') } : {}),
    ...dates(input.datePublished, input.dateModified),
    author: person(input.author, origin),
    publisher: organizationRef(origin, facts),
    inLanguage: facts.locale,
  };
}

// -------------------------------------------------------------------------------- Recipe

export type RecipeInput = Common & {
  path: string;
  name: string;
  description: string;
  /** Required: real photos of the dish as cooked by the client (plan, phase 3). */
  images: readonly string[];
  author: Person;
  datePublished: string;
  dateModified?: string;
  ingredients: readonly string[];
  /** One entry per step, written as HowToStep inside the recipe (no stand-alone HowTo). */
  steps: readonly string[];
  recipeYield?: string;
  /** ISO 8601 durations, e.g. "PT20M". */
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  category?: string;
  cuisine?: string;
  keywords?: readonly string[];
};

/** A recipe in the guide. No nutrition data and no ratings. */
export function buildRecipe(input: RecipeInput): JsonLd {
  const { origin, facts = site } = input;
  const url = pageUrl(input.path, origin);
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Recipe',
    name: text(input.name, 'name'),
    description: text(input.description, 'description'),
    url,
    mainEntityOfPage: url,
    image: images(input.images, origin, 'images'),
    ...dates(input.datePublished, input.dateModified),
    author: person(input.author, origin),
    publisher: organizationRef(origin, facts),
    inLanguage: facts.locale,
    recipeIngredient: texts(input.ingredients, 'ingredients'),
    recipeInstructions: texts(input.steps, 'steps').map((step) => ({ '@type': 'HowToStep', text: step })),
    ...(input.recipeYield ? { recipeYield: text(input.recipeYield, 'recipeYield') } : {}),
    ...(input.prepTime ? { prepTime: duration(input.prepTime, 'prepTime') } : {}),
    ...(input.cookTime ? { cookTime: duration(input.cookTime, 'cookTime') } : {}),
    ...(input.totalTime ? { totalTime: duration(input.totalTime, 'totalTime') } : {}),
    ...(input.category ? { recipeCategory: text(input.category, 'category') } : {}),
    ...(input.cuisine ? { recipeCuisine: text(input.cuisine, 'cuisine') } : {}),
    ...(input.keywords && input.keywords.length > 0 ? { keywords: texts(input.keywords, 'keywords').join(', ') } : {}),
  };
}

// ------------------------------------------------------------------------------- Service

export type ServiceInput = Common & {
  path: string;
  name: string;
  description: string;
  serviceType?: string;
  /** City names; default the city of the company address in site.ts. */
  areaServed?: readonly string[];
  images?: readonly string[];
};

/** A local service, e.g. the catering on /catering/. */
export function buildService(input: ServiceInput): JsonLd {
  const { origin, facts = site } = input;
  const areas = input.areaServed && input.areaServed.length > 0 ? texts(input.areaServed, 'areaServed') : [facts.address.city];
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Service',
    name: text(input.name, 'name'),
    description: text(input.description, 'description'),
    url: pageUrl(input.path, origin),
    ...(input.serviceType ? { serviceType: text(input.serviceType, 'serviceType') } : {}),
    ...(input.images && input.images.length > 0 ? { image: images(input.images, origin, 'images') } : {}),
    provider: organizationRef(origin, facts),
    areaServed: areas.map((name) => ({ '@type': 'City', name })),
  };
}
