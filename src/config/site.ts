// Company and navigation facts. Everything here is confirmed (label data confirmed by the
// client on 2026-10-05; contact details as published on royalspices.de, checked 2026-09-28).
// Navigation, announcement and footer texts follow the live shop royalspices.de as of
// 2026-10-15, verbatim (docs/LIVE-INVENTAR.md K1–K3, F1).
// Open items live in docs/PRODUCT-TRUTH.md — do not fill gaps here with assumptions.

export const site = {
  name: 'Royal Spices',
  locale: 'de-DE',
  owner: 'Sajad Akrami',
  address: {
    street: 'Hammerdeich 10',
    postalCode: '20537',
    city: 'Hamburg',
    country: 'DE',
    countryName: 'Deutschland',
  },
  email: 'info@royalspices.de',
  phone: { display: '040 59374940', href: 'tel:+494059374940' },
  // Open: WhatsApp / QR target (label field "Nummer offen"). Rendered only when set.
  whatsapp: null as string | null,
  // Open: retail channel until Shopify is live. Rendered only when set.
  retailUrl: null as string | null,
} as const;

// Announcement bar above the header (live K1), verbatim.
export const announcement = 'HERAT NEGIN SAFFRON ✧ KOSTENLOSER VERSAND IN DE AB 50 €';

// "Einloggen" (live K3): the Shopify customer account. The live shop uses Shopify's new customer
// accounts (store ID 96956285315, see .raw/live-20261015/meta.json and "shopId" in the live HTML);
// its link royalspices.de/customer_authentication/redirect only works while royalspices.de is the
// Shopify storefront. Once the domain serves this frontend (O1), the account stays reachable under
// Shopify's own address for the store. Change here if a custom account domain is set up in Shopify.
export const shopifyAccountUrl = 'https://shopify.com/96956285315/account';

export type NavItem = { href: string; label: string };

// Main navigation as on royalspices.de (K2), order and labels verbatim; split in two groups for the
// header layout, rendered one after the other.
export const primaryNav: NavItem[] = [
  { href: '/', label: 'Startseite' },
  { href: '/produkte/', label: 'Safran' },
  { href: '/herkunft-qualitaet/', label: 'Herkunft' },
  { href: '/catering/', label: 'Catering' },
  { href: '/b2b/', label: 'B2B' },
];

export const secondaryNav: NavItem[] = [
  { href: '/ueber-uns/', label: 'Über uns' },
  { href: '/kontakt/', label: 'Kontakt' },
];

export const legalNav: NavItem[] = [
  { href: '/impressum/', label: 'Impressum' },
  { href: '/datenschutz/', label: 'Datenschutz' },
];

// Footer columns as on royalspices.de (F1), order and labels verbatim.
export const footerExploreNav: NavItem[] = [
  { href: '/produkte/', label: 'Unsere Safran-Kollektion' },
  { href: '/herkunft-qualitaet/', label: 'Herkunft & Qualität' },
  { href: '/ueber-uns/', label: 'Unsere Geschichte' },
  { href: '/b2b/', label: 'B2B & Großhandel' },
  { href: '/catering/', label: 'Catering & Events' },
];

export const footerInfoNav: NavItem[] = [
  { href: '/kontakt/', label: 'Kontakt' },
  { href: '/faq/', label: 'Häufige Fragen' },
  { href: '/versand-lieferung/', label: 'Versand & Lieferung' },
  ...legalNav,
];
