// Product truth for the content layer. Descriptive facts only.
// Price, availability and variants are NOT kept here: they come from the Storefront API
// (src/lib/commerce/catalog.ts). Without a configured store the site states no prices.

import { HANDLES, productPath } from '../config/handles.mjs';

export type Fact = { label: string; value: string; note?: string };

/** One section of the product description as the live shop shows it. "\n" inside a paragraph is a line break. */
export type DescriptionSection = { heading: string; rows?: Fact[]; paragraphs?: string[] };

/**
 * A V1 fact the live description does not carry (V1/Live rule, 16.10.2026): kept because it adds a fact
 * or search term, or leads the visitor on. Wording as on the V1 product page.
 */
export type MoreFact = { heading: string; text: string; link?: { label: string; href: string } };

/**
 * Descriptive facts of one Shopify product, keyed by its Shopify handle.
 * Texts are the live product description (docs/LIVE-INVENTAR.md), only "Grade A" -> "Grade 1".
 * With a store, title and description come from Shopify. These texts serve the build without a store,
 * and they give the Shopify text its structure as long as both say the same (catalog.ts, structuredDescription).
 */
export interface ProductFacts {
  /** Product title as in Shopify. Shown only without a store. */
  title: string;
  /** Opening of the description: heading and first paragraph. */
  intro: { heading: string; text: string };
  /** Further sections of the description, in live order. */
  sections: DescriptionSection[];
  /** Net quantity in grams, for structured data. */
  netGrams: number;
  /** Existing V1 still (src/data/stills.json) for when Shopify delivers no image, i.e. always without a store. */
  picture: { name: string; alt: string };
  /** V1 facts shown below the description, in V1 order. They never repeat or contradict the live text. */
  more: MoreFact[];
}

// V1 product page (the former 1-g page, replaced by produkte/[handle].astro), section "Die Fäden", wording unchanged.
// Sources: docs/PRODUCT-TRUTH.md – Verpackung "sichtbar belegt" (product sheet and the client's photo of the
// 0.5-g jars), Abfüllung "bestätigt" for the 1-g jar, documents on request (open point 14).
// Left out because the live text already says it: V1 "Anwendung" and "Lagerung" (live wording wins).
const threads: MoreFact = {
  heading: 'Charakter',
  text: 'Negin steht für ganze, rote Fäden. Getrocknet sind sie dunkelrot, leicht gedreht und an der Spitze trichterförmig geweitet.',
};
const packaging: MoreFact = {
  heading: 'Verpackung',
  text: 'Glas, Naturkork, Siegelstreifen, Papieretikett. Das Glas ist klein und dickwandig, der Siegelstreifen läuft über den Korken.',
};
const packedIn: MoreFact = { heading: 'Abfüllung', text: 'In Deutschland abgefüllt.' };
const documents: MoreFact = {
  heading: 'Dokumente',
  text: 'Verfügbare Labor- und Herkunftsunterlagen zur angebotenen Lieferung erhältst du auf Anfrage.',
  link: { label: 'Unterlagen anfragen', href: '/kontakt/?anliegen=produkt&format=glas#anfrage' },
};

const operator: DescriptionSection = {
  heading: 'Verantwortlicher Lebensmittelunternehmer',
  paragraphs: ['Royal Spices · Sajad Akrami\nHammerdeich 10\n20537 Hamburg, Deutschland'],
};

const details = (quantity: string): Fact[] => [
  { label: 'Produkt', value: 'Safranfäden (Crocus sativus L.)' },
  { label: 'Zutaten', value: '100 % Safran' },
  { label: 'Nettofüllmenge', value: quantity },
  { label: 'Herkunft', value: 'Herat, Afghanistan' },
  { label: 'Qualität', value: 'Negin, Grade 1' },
];

/** Keyed by Shopify handle, in the order of the live collection "Safran". */
export const productFacts: Record<string, ProductFacts> = {
  [HANDLES.halfGram]: {
    title: 'Safran – Herat Negin Grade 1, 0,5 g',
    intro: {
      heading: 'Die Kunst des Safrans – im kleinen Glas',
      text: 'Herat Negin Safran von Royal Spices bringt den Charakter Afghanistans in deine Küche. Ganze rote Safranfäden für fein abgestimmte Gerichte, von traditionellem Reis bis zur modernen Patisserie.',
    },
    sections: [
      { heading: 'Produktdetails', rows: details('0,5 g') },
      { heading: 'Verwendung', paragraphs: ['Wenige Fäden vor der Verwendung in warmem Wasser ziehen lassen und den Aufguss zusammen mit den Fäden zum Gericht geben.'] },
      { heading: 'Lagerung', paragraphs: ['Trocken, gut verschlossen und lichtgeschützt lagern. Das Mindesthaltbarkeitsdatum ist auf der Verpackung angegeben.'] },
      operator,
    ],
    netGrams: 0.5,
    // The client's photo shows the 0.5-g jars (PRODUCT-TRUTH, open point 2).
    picture: { name: 'jars-photo', alt: 'Reihen abgefüllter Royal-Spices-Gläser mit Korken, Siegelstreifen und Etikett auf einem Tisch.' },
    more: [threads, packaging, documents],
  },
  [HANDLES.oneGram]: {
    // As in Shopify, with its non-breaking spaces; Grade A -> Grade 1.
    title: 'Herat Negin Safran – 1\u00a0g (Grade\u00a01)',
    intro: {
      heading: 'Herat Negin – Safran mit Charakter',
      text: 'Ein außergewöhnliches Gewürz für die Momente, in denen jedes Detail zählt. Royal Spices präsentiert ganze Negin-Safranfäden aus Herat, Afghanistan: sorgfältig ausgewählt, intensiv in Farbe und unverwechselbar im Duft.',
    },
    sections: [
      { heading: 'Das Produkt', rows: details('1 g') },
      { heading: 'So genießt du ihn', paragraphs: ['Einige Fäden in wenig warmem Wasser ziehen lassen. Den Safranaufguss anschließend zu Reis, Risotto, Saucen, Suppen oder Desserts geben und nach Geschmack dosieren.'] },
      {
        heading: 'Lagerung',
        paragraphs: [
          'Trocken, gut verschlossen und vor Licht sowie Wärme geschützt lagern. Das Mindesthaltbarkeitsdatum und die Chargenkennzeichnung stehen auf der Verpackung.',
          'Royal Spices – The Art of Saffron.',
        ],
      },
      operator,
    ],
    netGrams: 1,
    picture: {
      name: 'live-jar-1g',
      alt: 'Royal-Spices-Glas 1 g mit Korken und dunklem Siegelstreifen, cremefarbenes Etikett „Royal Spices, Saffron, Herat Negin, Grade 1, 1 g, Packed in Germany“, ringsum getrocknete Safranfäden.',
    },
    more: [threads, packaging, packedIn, documents],
  },
};

/** The description as one plain text: the same content the Storefront field `description` carries. */
export function factsToText(facts: ProductFacts): string {
  const parts = [facts.intro.heading, facts.intro.text];
  for (const section of facts.sections) {
    parts.push(section.heading);
    for (const row of section.rows ?? []) parts.push(`${row.label}: ${row.value}`);
    for (const paragraph of section.paragraphs ?? []) parts.push(paragraph);
  }
  return parts.join('\n');
}

// ------------------------------------------------------------------------------------------
// V1 content outside the catalog: the trade formats (glass, display, loose goods).
// Kept for the pages that still use it; none of it is a Shopify product.

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
    action: { label: 'Produkt ansehen', href: productPath(HANDLES.oneGram) },
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
