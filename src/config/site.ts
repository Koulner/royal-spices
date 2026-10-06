// Company and navigation facts. Everything here is confirmed (label data confirmed by the
// client on 2026-10-05; contact details as published on royalspices.de, checked 2026-09-28).
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
  },
  email: 'info@royalspices.de',
  phone: { display: '040 59374940', href: 'tel:+494059374940' },
  // Open: WhatsApp / QR target (label field "Nummer offen"). Rendered only when set.
  whatsapp: null as string | null,
  // Open: retail channel until Shopify is live. Rendered only when set.
  retailUrl: null as string | null,
} as const;

export type NavItem = { href: string; label: string };

export const primaryNav: NavItem[] = [
  { href: '/produkte/', label: 'Produkte' },
  { href: '/herkunft-qualitaet/', label: 'Herkunft & Qualität' },
  { href: '/handel/', label: 'Handel' },
  { href: '/gastronomie/', label: 'Gastronomie' },
  { href: '/catering/', label: 'Catering' },
];

export const secondaryNav: NavItem[] = [
  { href: '/ueber-uns/', label: 'Über uns' },
  { href: '/kontakt/', label: 'Kontakt' },
];

export const legalNav: NavItem[] = [
  { href: '/impressum/', label: 'Impressum' },
  { href: '/datenschutz/', label: 'Datenschutz' },
];
