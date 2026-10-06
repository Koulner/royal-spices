// Product truth for the content layer. Descriptive facts only.
// Price, availability and variant data are NOT kept here: once Shopify is connected they are
// read from the Storefront API (src/lib/commerce). Until then the site states no prices.

export type Fact = { label: string; value: string; note?: string };

export const saffronJar = {
  slug: 'safran-negin-1g',
  // Handle the Shopify product is expected to use. Open until the store exists.
  shopifyHandle: 'safran-negin-1g',
  name: 'Safranfäden',
  grade: 'Negin · Grade 1',
  quantity: '1 g',
  origin: 'Herat, Afghanistan',
  packedIn: 'In Deutschland abgefüllt',
  ingredients: '100 % Safran',
  storage: 'Trocken, kühl und vor Licht geschützt lagern.',
  packaging: ['Glas', 'Naturkork', 'Siegelstreifen', 'Papieretikett'],
} as const;

/** Rows as they stand on the label, in label order. */
export const labelFacts: Fact[] = [
  { label: 'Bezeichnung', value: 'Safranfäden' },
  { label: 'Sorte', value: 'Negin · Grade 1' },
  { label: 'Füllmenge', value: '1 g' },
  { label: 'Zutaten', value: '100 % Safran' },
  { label: 'Herkunft', value: 'Herat, Afghanistan' },
  { label: 'Abfüllung', value: 'In Deutschland' },
  { label: 'Lagerung', value: 'Trocken, kühl und vor Licht geschützt' },
];

/** Fields that are filled per batch on the jar, not on the website. */
export const batchFields: Fact[] = [
  { label: 'Mindestens haltbar bis', value: '', note: 'steht auf dem Glas' },
  { label: 'Los / Charge', value: '', note: 'steht auf dem Glas' },
];

export type Format = {
  id: 'glas' | 'display' | 'lose';
  title: string;
  spec: string;
  body: string;
  audience: string;
  action: { label: string; href: string };
};

export const formats: Format[] = [
  {
    id: 'glas',
    title: 'Safranfäden im Glas',
    spec: '1 g · Negin · Grade 1',
    body: 'Ganze Fäden aus Herat, in Deutschland abgefüllt. Glas mit Naturkork und Siegelstreifen.',
    audience: 'Für die Küche zu Hause, für Bar und Pass, für das Regal.',
    action: { label: 'Produkt ansehen', href: '/produkte/safran-negin-1g/' },
  },
  {
    id: 'display',
    title: 'Display für den Verkauf',
    spec: '24 Gläser à 1 g',
    body: 'Die Gläser als Verkaufseinheit für Theke und Regal.',
    audience: 'Für Feinkost, Einzelhandel, Cafés und Bars mit Verkauf.',
    action: { label: 'Display anfragen', href: '/kontakt/?anliegen=handel&format=display#anfrage' },
  },
  {
    id: 'lose',
    title: 'Lose Ware',
    spec: 'ab 10 kg · Negin, Pushal, Konjai',
    body: 'Safran in Handelsmengen. Sorte, Menge und Lieferkonditionen stimmen wir im Angebot ab.',
    audience: 'Für Großhandel, Import, Distribution und Lebensmittelproduktion.',
    action: { label: 'Handelsanfrage senden', href: '/kontakt/?anliegen=handel&format=lose#anfrage' },
  },
];

export const looseVarieties = ['Negin', 'Pushal', 'Konjai'] as const;
export const looseMinimumKg = 10;
