// Which live page is compared with which V1 page, and the lines that differ on purpose.
// Rows are those of the comparison list in docs/LIVE-INVENTAR.md. Every exception names the
// decision behind it (docs/UEBERGABE-SHOPIFY.md D1–D7, O1–O7; transactions in _agent/LOG.md).
// A new exception needs the user's confirmation (M1); the runner reports exceptions that are
// no longer needed.

/** live page (outline.md) → V1 page in dist/client; `anchors` split one page into rows. */
export const PAGES = [
  {
    page: 'index',
    v1: 'index.html',
    anchors: [
      ['K1', '[Direkt zum Inhalt]'],
      ['K2', '[Startseite](/)'],
      ['K3', '[Einloggen]('],
      ['K2', '[Startseite](/)'], // the theme repeats the menu in its drawer
      ['K4', '[Feld search'],
      ['K3', '[Einloggen]('],
      ['K5', '[Warenkorb]('],
      ['S1', '<!-- section.'],
      ['S2', '<!-- div.rs-trust'],
      ['S3', '<!-- div.rs-benefits'],
      ['S4', '<!-- div.rs-brand-story'],
      ['S5', '<!-- div.rs-collection'],
      ['S6', '<!-- div.rs-origin -->'],
      ['S7', '<!-- div.rs-origin-copy'],
      ['S8', '<!-- div.rs-ritual'],
      ['S9', '<!-- div.rs-professional -->'],
      ['S10', '<!-- div.rs-lastline'],
      ['F1', '<!-- footer.'],
      ['F2', '<!-- div.rs-newsletter'],
      ['F1', '<!-- div.rs-footer-bottom'],
    ],
  },
  { page: 'collections_safran', row: 'P1', v1: 'produkte/index.html' },
  { page: 'products_herat-negin-safran-1-g-grade-a', row: 'P2', v1: 'produkte/herat-negin-safran-1-g-grade-a/index.html' },
  { page: 'products_safran-herat-negin-0-5g', row: 'P3', v1: 'produkte/safran-herat-negin-0-5g/index.html' },
  { page: 'pages_herkunft-qualitat', row: 'Q1', v1: 'herkunft-qualitaet/index.html' },
  { page: 'pages_catering', row: 'Q2', v1: 'catering/index.html' },
  { page: 'pages_b2b-zusammenarbeit', row: 'Q3', v1: 'b2b/index.html' },
  { page: 'pages_ueber-uns', row: 'Q4', v1: 'ueber-uns/index.html' },
  { page: 'pages_contact', row: 'Q5', v1: 'kontakt/index.html' },
  { page: 'pages_faq', row: 'Q6', v1: 'faq/index.html' },
  { page: 'pages_versand-lieferung', row: 'Q7', v1: 'versand-lieferung/index.html' },
  { page: 'pages_impressum', row: 'Q8', v1: 'impressum/index.html' },
];

/** Rows that are not compared as text, and why. */
export const NOT_TEXT = {
  Q9: 'Live ist der Shopify-Standardtext; V1 hat einen eigenen Entwurf nach der Datenschutzerklärung des Kunden (T-20261015-06, M8), Freigabe durch den Kunden',
  Q10: 'Weiterleitung bzw. 404 (tests/redirects.test.mjs, tools/qa/seo.mjs --redirects); AGB und Widerruf fehlen auch Live (O6)',
  Q11: 'Weiterleitung (tests/redirects.test.mjs); Warenkorb als Dialog, keine Suche (O3), Blog leer',
  W1: 'Weiterleitungstabelle src/config/redirects.mjs (tests/redirects.test.mjs, tools/qa/seo.mjs --redirects)',
};

const THEME_PRICE = 'Shopify-Theme: Preisbeschriftung für Screenreader („Normaler Preis“, „Verkaufspreis“, „EUR“); V1 zeigt den Preis aus dem Katalog als „12,90 €“ (A, M2)';
const UNIT_PRICE = 'Grundpreis kommt aus Shopify, sobald der Kunde ihn pflegt (`unitPrice`, T-20261018-11); Live 8.900 €/kg für 0,5 g ist um Faktor 2 falsch (richtig 17.800 €/kg, der Build bricht damit ab), die Live-Aufnahme in der Fixture hat keinen Grundpreis; Pflicht rechtlich klären (Kunde)';
const PRODUCT_FORM = 'Shopify-Theme: Produktformular mit Galerie-Dialog, Bildzähler, Mengenwähler, Badges und Teilen; V1 hat dafür die BuyBox (A5, commerce.ts) und das Shopify-Produktbild';
const SAME_PAGE_FORM = 'V1 hat das Anfrageformular auf der Seite selbst (`#anfrage`, InquiryForm); Live verlinkt das Kontaktformular';
const FORM = 'V1-Anfrageformular (InquiryForm) mit eigenen Feldern „Telefon“, „Nachricht“ und Knopf „Anfrage senden“, Versand per SMTP (D1, O2)';

/** { page, match: exact live line or RegExp, reason }. Applies only to lines not found word for word. */
export const EXCEPTIONS = [
  // Kopf
  { page: 'index', match: 'Suchen', reason: 'O3 (15.10.): keine Suche im Kopf, /search leitet auf /produkte/' },
  { page: 'index', match: /^(\[Warenkorb\]\(\/cart\)|#### Artikel wurde in den Warenkorb gelegt|\[Warenkorb ansehen\]\(\/cart\)|\[Knopf: (Auschecken|Weiter shoppen)\])$/, reason: 'K5: Warenkorb als Dialog aus V1 (commerce.ts) statt Seite /cart und Theme-Hinweis' },
  // Startseite
  { page: 'index', match: 'ROYAL SPICES · HERAT, AFGHANISTAN', reason: 'SEO-B, Entscheidung 1 (16.10.): Augenbraue „ROYAL SPICES · SAFRAN AUS HERAT, AFGHANISTAN“ als erste Zeile der h1' },
  { page: 'index', match: /^(THE ART OF SAFFRON 01 \/ ROYAL SPICES|ORIGINHERATAFGHANISTAN|Abbildung: 0,5-g-Glas)$/, reason: 'D5: Hero ist die V1-Journey (1 g); Beschriftungen des Live-Fotos (0,5-g-Glas) entfallen' },
  { page: 'index', match: '49,90 €geplanter Preis', reason: 'D7: Geschenkbox ohne Preis, bis es das Shopify-Produkt gibt' },
  // Fußzeile
  { page: 'index', match: /^(Wenn du dich für eine Auswahl entscheidest, wird die Seite komplett aktualisiert\.|Wird in einem neuen Fenster geöffnet\.)$/, reason: 'Shopify-Theme: versteckte Screenreader-Hinweise zu Theme-Funktionen, die V1 nicht hat' },
  { page: 'index', match: /^(Deine E-Mail-Adresse|\[Knopf: Anmelden ↗\]|Mit deiner Anmeldung möchtest du Marketing-E-Mails erhalten\. Hinweise:)$/, reason: 'O4: Newsletter-Formular erst mit einem Dienst mit Double-Opt-in' },
  // Produkte
  { page: 'collections_safran', match: /^(#### Filter:?|Verfügbarkeit|0 ausgewählt|\[(Zurücksetzen|Alle entfernen|Löschen)\]\(.*\)|Auf Lager \(.*|Nicht vorrätig \(.*|Preis|Der höchste Preis ist .*|Von|Bis|Sortieren nach:|Ausgewählt Am relevantesten .*|Filtern und sortieren( Filter)?|#### Filtern und sortieren|\[Knopf: (Verfügbarkeit|Preis|Anwenden)\])$/, reason: 'A4 (T-20261016-03): /produkte/ wie die Live-Kollektion, ohne Filter und Sortierung' },
  { page: 'collections_safran', match: /^Normaler Preis/, reason: THEME_PRICE },
  { page: 'collections_safran', match: /^Grundpreis /, reason: UNIT_PRICE },
  ...['products_herat-negin-safran-1-g-grade-a', 'products_safran-herat-negin-0-5g'].flatMap((page) => [
    { page, match: /^Normaler Preis/, reason: THEME_PRICE },
    { page, match: /^(\[Zu Produktinformationen springen\]\(.*\)|\[Knopf: Medien \d in Modal öffnen\]|1 \/ von 2|Sale Ausverkauft|\(0 im Warenkorb\)|\[Knopf: (Verringere|Erhöhe) die Menge für .*\]|\[Knopf: (Share|Teilen schließen|Link kopieren)\]|Share|Link|\[Vollständige Details anzeigen\]\(.*\))$/, reason: PRODUCT_FORM },
    { page, match: 'www.Royal-Spices.com', reason: 'Shopify-Hersteller (Vendor); V1 zeigt ihn nicht, der Kunde korrigiert ihn in Shopify (O6)' },
  ]),
  { page: 'products_safran-herat-negin-0-5g', match: /^Grundpreis /, reason: UNIT_PRICE },
  // Seiten
  { page: 'pages_catering', match: '[CATERING ANFRAGEN →](/pages/contact)', reason: SAME_PAGE_FORM },
  { page: 'pages_b2b-zusammenarbeit', match: '[B2B-Anfrage senden →](/pages/contact)', reason: SAME_PAGE_FORM },
  { page: 'pages_contact', match: /^Du hast Fragen zu unserem Safran, .* deine Nachricht erreicht uns direkt über Shopify\.$/, reason: 'D1 headless: das Formular läuft nicht über Shopify; V1 sagt „… erreicht uns direkt.“' },
  { page: 'pages_contact', match: /^(Telefonnummer|Kommentar|\[Knopf: Senden\])$/, reason: FORM },
];

/** Lines that only a build with the store shows (A2: without the store no price, inquiry instead). */
export const STORE_ONLY = [
  { page: 'index', match: /^(€12,90|8,90 €)inkl\. MwSt\.$/, reason: 'nur mit Store: Preis aus dem Katalog' },
  ...['products_herat-negin-safran-1-g-grade-a', 'products_safran-herat-negin-0-5g'].map((page) => ({
    page,
    match: /^(Inkl\. Steuern\.|Anzahl|\[Knopf: In den Warenkorb legen\])$/,
    reason: 'nur mit Store: BuyBox mit Preis und Warenkorb',
  })),
];
