# Inventar der Live-Seite royalspices.de

Stand der Live-Seite: 15.10.2026 (Shopify-Theme „Royal Spices — Premium Atelier“, Basis Dawn 15.5.0). Abgerufen am 15.10.2026 per `curl`, Rohdaten in `.raw/live-20261015/` (HTML je Seite, `products.json`, `collections.json`, `meta.json`, `outline.md`). Texte unten wörtlich aus dem HTML extrahiert; `<br>` steht für einen Zeilenumbruch, `<!-- … -->` für den Container im Theme.

Shop: `izt0j1-cw.myshopify.com`, Name „www.Royal-Spices.com“, Hamburg, EUR. Liefert in viele Länder (`meta.json`, `ships_to_countries`).

## Abgleichliste Live → V1-Frontend

Spalte „V1“: Zielseite im Frontend. „Stand“ wird beim Bau gepflegt: `offen` → `gebaut` → `geprüft` (Text wörtlich verglichen, Links geprüft). Bewusste Abweichungen stehen mit Begründung in `tools/live/rules.mjs`; die Gruppen A1–A4 unten hat der Nutzer am 17.10.2026 bestätigt.

**Stand 17.10.2026 (T-20261017-10, M1):** `tools/qa/live-text.mjs` vergleicht jede Textzeile und jeden Link aus `.raw/live-20261015/outline.md` mit dem gebauten HTML (Links über die 301-Tabelle auf das V1-Ziel abgebildet). Gemessen am Build mit Fixture-Store (zwei Produkte wie Live): 28 Zeilen, 0 offene Abweichungen, 9 Live-Zeilen nur mit anderem Leerraum (Markup). Ohne Store kommen 8 Zeilen hinzu, die nur mit Store erscheinen (Preise, BuyBox; Schalter `--ohne-store`). Jede bewusste Abweichung steht mit Begründung in `tools/live/rules.mjs`; eine neue braucht die Bestätigung des Nutzers. Aufruf nach jedem Build:

```bash
node tools/qa/live-text.mjs dist/client            # Build mit Store
node tools/qa/live-text.mjs dist/client --ohne-store
```

Vom Nutzer am 17.10.2026 bestätigte Abweichungen (M1):

| Nr | Abweichung | Zeilen |
|---|---|---|
| A1 | Bedienelemente des Shopify-Themes entfallen headless: Filter und Sortierung der Kollektion, Produktgalerie mit Dialog und Bildzähler, Mengenwähler, Badges, Teilen, Preis-Beschriftungen für Screenreader, Warenkorb-Seite und -Hinweis, versteckte Theme-Hinweise im Fuß | K5, F1, P1–P3 |
| A2 | Hersteller „www.Royal-Spices.com“ steht nicht auf den Produktseiten (Kunde korrigiert ihn in Shopify, O6) | P2, P3 |
| A3 | „CATERING ANFRAGEN“ und „B2B-Anfrage senden“ springen zum Anfrageformular auf derselben Seite (`#anfrage`) statt zur Kontaktseite | Q2, Q3 |
| A4 | Kontakt: „… deine Nachricht erreicht uns direkt.“ statt „… direkt über Shopify.“; V1-Formular mit „Telefon“, „Nachricht“, „Anfrage senden“ statt „Telefonnummer“, „Kommentar“, „Senden“ | Q5 |

| Nr | Live | V1 | Stand | Bemerkung |
|---|---|---|---|---|
| K1 | Ankündigung „HERAT NEGIN SAFFRON ✧ KOSTENLOSER VERSAND IN DE AB 50 €“ | `Header.astro` | geprüft | Text in `site.ts` (`announcement`); Sprunglink „Direkt zum Inhalt“ wie Live (T-20261017-10) |
| K2 | Navigation: Startseite, Safran, Herkunft, Catering, B2B, Über uns, Kontakt | `Header.astro` | geprüft | eine Seite `/b2b/` statt Handel und Gastronomie (D6); `site.ts` |
| K3 | Einloggen (Shopify-Kundenkonto) | `Header.astro` | geprüft | Link auf Shopify Customer Account, auch ohne Store; nach dem Deploy einmal klicken |
| K4 | Suche | – | entfällt | keine Suche im Kopf (O3); `/search` leitet auf `/produkte/` |
| K5 | Warenkorb | `Header.astro` + Cart-Dialog | geprüft | unverändert aus V1 (`commerce.ts`), nur mit Store sichtbar; Dialog statt Seite `/cart` (A1) |
| S1 | Hero „The Art of Saffron.“ mit Kennzahlen, Bild 0,5-g-Glas | `home/HomeJourney.astro` | geprüft | V1-Journey-Sequenz (1 g) mit dem Live-Text (D5); Augenbraue „… SAFRAN AUS HERAT …“ (SEO-B), Beschriftungen des Live-Fotos entfallen (D5) |
| S2 | Ticker „Sorgfältig ausgewählt ✧ Herkunft Herat …“ | `index.astro` | geprüft | |
| S3 | „Warum Royal Spices?“ vier Karten | `index.astro` | geprüft | Karte „Qualität“: „Chargenbezogene Analysen auf Anfrage“ (PRODUCT-TRUTH Nr. 14) |
| S4 | Markengeschichte „Reine Zutaten. Echter Geschmack.“ | `index.astro` | geprüft | |
| S5 | Kollektion „Kleine Menge. Große Wirkung.“, 2 Produkte + Geschenkbox | `home/HomeCollection.astro` | geprüft | Preise aus dem Katalog; Geschenkbox „In Vorbereitung“ ohne Preis, mit Preis, sobald es ein Shopify-Produkt „Geschenkbox“ gibt (D7, Nutzerentscheid 16.10.) |
| S6 | Bildbruch „HERAT · 34°20' N“ (Safranfäden-Foto) | `index.astro` | geprüft | Live-Foto eingebaut (T-20261019-07), erscheint erst mit `LIVE_THREADS_LICENSED=1`; bis zur Lizenzklärung V1-Still |
| S7 | „Die Geschichte hinter jedem Faden“ / „Unsere Wurzeln. Dein Genuss.“ | `index.astro` | geprüft | |
| S8 | Safran-Ritual, drei Schritte | `index.astro` | geprüft | |
| S9 | B2B „Für Küchen, die mehr erwarten.“ | `index.astro` | geprüft | |
| S10 | Schlusszeile „ROYAL SPICES — FROM HERAT WITH CHARACTER — THE ART OF SAFFRON“ | `index.astro` | geprüft | |
| F1 | Fußzeile: Marke, Entdecken, Informationen, Kontakt | `Footer.astro` | geprüft | Spalten in `site.ts`; versteckte Theme-Hinweise entfallen (A1) |
| F2 | Newsletter „The Royal Journal“ | `Footer.astro` | geprüft, ohne Formular | Überschrift und Text wie Live; Formular erst mit einem Dienst mit Double-Opt-in (O4) |
| P1 | /collections/safran | `/produkte/` | geprüft | aus dem Katalog; Filter, Sortierung und Theme-Preisbeschriftung entfallen (A1); Grundpreis 0,5 g fehlt (Kunde, siehe P3) |
| P2 | /products/herat-negin-safran-1-g-grade-a | `/produkte/<handle>/` | geprüft | Titel „Grade A“ → Grade 1 (Kunde); 2. Bild ist Favicon; Theme-Produktformular (A1) und Hersteller (A2) entfallen |
| P3 | /products/safran-herat-negin-0-5g | `/produkte/<handle>/` | geprüft | neu in V1; Grundpreis fehlt (`unitPrice`, Kunde klärt rechtlich); Theme-Produktformular (A1) und Hersteller (A2) entfallen |
| Q1 | /pages/herkunft-qualitat | `/herkunft-qualitaet/` | geprüft | Live-Text plus V1-Blöcke (C3) |
| Q2 | /pages/catering | `/catering/` | geprüft | Live nennt Preisorientierung (Canapés ab 3,90 € …); Katalog und Pakete aus V1 (C3); Anfrageknopf auf `#anfrage` (A3) |
| Q3 | /pages/b2b-zusammenarbeit | `/b2b/` | geprüft | ersetzt die früheren V1-Seiten Handel und Gastronomie, die per 301 hierher leiten (D6); Anfrageknopf auf `#anfrage` (A3) |
| Q4 | /pages/ueber-uns | `/ueber-uns/` | geprüft | Live-Text plus V1-Blöcke (C3) |
| Q5 | /pages/contact | `/kontakt/` | geprüft | Live: Formular „über Shopify“; V1: eigenes Formular (SMTP offen); Anschrift aus V1 (C3); Einleitung ohne „über Shopify“, Feldnamen des V1-Formulars (A4) |
| Q6 | /pages/faq | `/faq/` | geprüft | neu in V1 |
| Q7 | /pages/versand-lieferung | `/versand-lieferung/` | geprüft | neu in V1; Versandtarife als Text, bei Tarifänderung in Shopify mit anpassen |
| Q8 | /pages/impressum | `/impressum/` | geprüft | Bildnachweis Wakhan wörtlich übernommen, V1 zeigt kein Wakhan-Bild |
| Q9 | /policies/privacy-policy | `/datenschutz/` | gebaut, Entwurf | Shopify-Abschnitt nur im Build mit Store; 8 PRÜFEN-Marken gibt der Kunde frei; nicht als Text verglichen (eigener Entwurf statt Shopify-Standardtext) |
| Q10 | /policies/terms-of-service, refund-policy, shipping-policy, legal-notice | 301 / 404 | geprüft (301/404) | legal-notice → `/impressum/`, shipping-policy → `/versand-lieferung/`; **AGB und Widerruf fehlen** (auch auf Live 404), terms-of-service und refund-policy liefern 404 |
| Q11 | /cart, /search, /blogs/news | Cart-Dialog / – / – | geprüft (301) | 301: `/cart` und `/search` → `/produkte/`, `/blogs/news` → `/` (Blog leer) |
| W1 | Alte Shopify-Pfade (/pages/…, /collections/…, /products/…, /policies/…) | 301 auf V1-Pfade | geprüft (301) | `src/config/redirects.mjs`, Tests `tests/redirects.test.mjs`; `/collections/frontpage` seit 17.10.2026 in der Tabelle (T-20261017-03); `tools/qa/seo.mjs --redirects` |

## Bilder der Live-Seite

Alle auf `cdn.shopify.com/s/files/1/0969/5628/5315/files/` (bzw. `royalspices.de/cdn/shop/files/`). Am 19.10.2026 mit Freigabe des Nutzers in Originalauflösung nach `assets-src/photos/live-royalspices/` geladen (README dort). In V1 seit T-20261019-07: Logo quer in Kopf und Fuß, goldene Blüte (Favicon-Datei) als Markenzeichen S4, 1-g-Foto als Ersatzbild ohne Store, Safranfäden S6 hinter Schalter. Nicht verwendet: `logo-square`, `05-collection`, `05-story` (Plakate mit eingebranntem englischem Text), `05g-kollektion-neu` (Badge „KLASSIKER“ eingebrannt). Produktbilder kommen mit Store ohnehin über die Storefront API.

| Datei | Verwendung |
|---|---|
| `royal-spices-atelier-logo-wide.png` | Logo Kopf |
| `royal-spices-atelier-logo-square.png` | Markenzeichen in S4 |
| `royal-spices-atelier-favicon.png` | Favicon; fälschlich 2. Produktbild 1 g |
| `royal-spices-safran-herat-05-collection.png` | Hero S1; 2. Produktbild 0,5 g |
| `royal-spices-safran-herat-05-story.png` | Foto S4; 1. Produktbild 0,5 g |
| `royal-spices-herat-negin-1g-premium_….png` | Kollektion S5; Produktbild 1 g |
| `royal-spices-05g-kollektion-neu.png` | Kollektion S5 (0,5 g) |
| `saffron_threads_….jpg` | Bildbruch S6 |

## Produkte in Shopify (products.json, 15.10.)

| Handle | Titel | SKU | Preis | Verfügbar | grams | Bilder |
|---|---|---|---|---|---|---|
| `safran-herat-negin-0-5g` | Safran – Herat Negin Grade 1, 0,5 g | RS-SAF-HN-05 | 8,90 | ja | 50 | story, collection |
| `herat-negin-safran-1-g-grade-a` | Herat Negin Safran – 1 g (Grade A) | RS-SAF-HN-1G | 12,90 | ja | 50 | 1g-premium, favicon |

Beide: eine Variante „Default Title“, Hersteller „www.Royal-Spices.com“, kein Produkttyp. Kollektionen: `safran` (2), `frontpage` (1), `food-and-beverage-example-products` (Shopify-Beispiel, nicht übernehmen). Geschenkbox 5 g („In Vorbereitung“, „49,90 € geplanter Preis“) steht nur im Theme-Text.

# Texte, wörtlich

## Startseite (Kopf, 10 Abschnitte, Fußzeile)

Live: `https://royalspices.de/`

### Kopf (Ankündigung, Navigation)

```
Title: www.Royal-Spices.com
Description: 
[Direkt zum Inhalt](#MainContent)
HERAT NEGIN SAFFRON ✧ KOSTENLOSER VERSAND IN DE AB 50 €
[Startseite](/)
[Safran](/collections/safran)
[Herkunft](/pages/herkunft-qualitat)
[Catering](/pages/catering)
[B2B](/pages/b2b-zusammenarbeit)
[Über uns](/pages/ueber-uns)
[Kontakt](/pages/contact)
[Einloggen](https://royalspices.de/customer_authentication/redirect?locale=de®ion_country=DE)
![Royal Spices Logo in Dunkelgrün und Gold, The Art of Saffron](//royalspices.de/cdn/shop/files/royal-spices-atelier-logo-wide.png)
```

### Hauptteil

```
<!-- section.shopify-section-template--29668634460547__royal_atelier -->
<!-- section.rs-ateliers -->
<!-- div.rs-hero -->
<!-- div.rs-hero-glow -->
<!-- div.rs-hero-copy -->
ROYAL SPICES · HERAT, AFGHANISTAN
### The Art <br> of Saffron.
Ein kostbares Gewürz. Eine außergewöhnliche Herkunft. Handverlesene Safranfäden aus Herat – für Momente, die in Erinnerung bleiben.
<!-- div.rs-actions -->
[Safran entdecken ↗](/products/herat-negin-safran-1-g-grade-a)
[Unsere Herkunft](/pages/herkunft-qualitat)
<!-- div.rs-hero-marks -->
HERATAfghanistan
NEGINGanze Fäden
0,5 & 1 GSafran im Glas
<!-- div.rs-hero-art -->
<!-- div.rs-orbit -->
<!-- div.rs-art-caption -->
THE ART OF SAFFRON 01 / ROYAL SPICES
![Royal Spices Herat Negin Safran im 0,5-Gramm-Glas](https://cdn.shopify.com/s/files/1/0969/5628/5315/files/royal-spices-safran-herat-05-collection.png)
<!-- div.rs-hero-seal -->
ORIGINHERATAFGHANISTAN
<!-- div.rs-photo-note -->
Abbildung: 0,5-g-Glas
<!-- div.rs-trust -->
✧ Sorgfältig ausgewählt✧ Herkunft Herat✧ Ganze Safranfäden✧ Genuss mit Charakter
<!-- div.rs-benefits -->
<!-- div.rs-benefits-title -->
DAS MACHT UNS AUS
#### Warum Royal Spices?
<!-- div.rs-benefits-grid -->
✧
##### Reiner Safran
100 % Safranfäden, ohne Zusätze und Füllstoffe.
❀
##### Handverlesen
Sorgfältig ausgewählte ganze Negin-Fäden.
⌁
##### Aus Herat
Verbunden mit der Tradition Afghanistans.
◇
##### Qualität
Chargenbezogene Analysen auf Anfrage.
<!-- div.rs-brand-story -->
<!-- div.rs-brand-copy -->
WARUM ROYAL SPICES
#### Reine Zutaten. <br> Echter Geschmack.
Von Herat direkt in deine kulinarische Welt: handverlesene Safranfäden, charaktervoll und sorgfältig ausgewählt. Unsere Liebe zur Gastronomie und unsere Verbindung zur Herkunft prägen Royal Spices.
[Entdecke unsere Geschichte ↗](/pages/herkunft-qualitat)
<!-- div.rs-brandmark -->
![Royal Spices Markenzeichen](https://cdn.shopify.com/s/files/1/0969/5628/5315/files/royal-spices-atelier-logo-square.png)
<!-- div.rs-brand-photo -->
![Royal Spices 0,5-g-Glas mit Informationen zu Herat und Safran](https://cdn.shopify.com/s/files/1/0969/5628/5315/files/royal-spices-safran-herat-05-story.png)
Abbildung zeigt die 0,5-g-Ausführung.
<!-- div.rs-collection -->
<!-- div.rs-section-head -->
DIE KOLLEKTION
#### Kleine Menge. <br> Große Wirkung.
Entdecke die Welt von Royal Spices – von der täglichen Genussküche bis zum besonderen Geschenk.
<!-- div.rs-products -->
<!-- div.rs-product-visual -->
![Ganze Premium-Safranfäden aus Herat – 1-g-Produkt](https://cdn.shopify.com/s/files/1/0969/5628/5315/files/royal-spices-herat-negin-1g-premium_6c44d347-07dd-4963-a59a-680f23466abf.png)
UNSER ORIGINAL
<!-- div.rs-product-info -->
HERAT NEGIN · GRADE A
##### Premium Safran – 1 g
Ganze, handverlesene Fäden.
<!-- div.rs-price -->
€12,90inkl. MwSt.
[Produkt ansehen ↗](/products/herat-negin-safran-1-g-grade-a)
<!-- div.rs-product-visual -->
![Royal Spices Safran im 0,5-g-Glas](https://cdn.shopify.com/s/files/1/0969/5628/5315/files/royal-spices-05g-kollektion-neu.png)
KLASSIKER
<!-- div.rs-product-info -->
HERAT NEGIN · GRADE 1
##### Premium Safran – 0,5 g
Das Original im kleinen Glas.
<!-- div.rs-price -->
8,90 €inkl. MwSt.
[Produkt ansehen ↗](/products/safran-herat-negin-0-5g)
<!-- div.rs-product-card -->
<!-- div.rs-product-visual -->
COMING SOON
<!-- div.rs-gift-box -->
<!-- div.rs-gift-wordmark -->
ROYAL <br> SPICES
THE SAFFRON COLLECTION
<!-- div.rs-gift-reflection -->
<!-- div.rs-product-info -->
THE ROYAL GIFT
##### Safran Geschenkbox – 5 g
Ein besonderes Geschenk in Vorbereitung.
<!-- div.rs-price -->
49,90 €geplanter Preis
In Vorbereitung
<!-- div.rs-origin -->
<!-- div.rs-origin-image -->
![Rot leuchtende Safranfäden – Royal Spices](//royalspices.de/cdn/shop/files/saffron_threads_0084332b-c9de-435e-867e-5d01121b876c.jpg)
HERAT · 34°20' N
<!-- div.rs-origin-copy -->
DIE GESCHICHTE HINTER JEDEM FADEN
#### Unsere Wurzeln. <br> Dein Genuss.
In der Region Herat hat Safran Tradition. Hier beginnt unsere Geschichte – mit Sorgfalt, Handarbeit und dem Respekt vor einer außergewöhnlichen Zutat.
Wir bringen den Charakter dieser Herkunft in deine Küche. Für Risotto, Reisgerichte, Desserts und die ganz besonderen Augenblicke.
[Mehr über Herkunft & Qualität ↗](/pages/herkunft-qualitat)
<!-- div.rs-ritual -->
DAS SAFRAN-RITUAL
#### Entfalte das Aroma.
<!-- div.rs-steps -->
01
##### Fäden dosieren
Einige Fäden genügen, um deinen Kreationen Farbe und Charakter zu verleihen.
02
##### Sanft ziehen lassen
Die Fäden in etwas warmem Wasser ziehen lassen – so lösen sich Farbe und Aroma.
03
##### Gerichte veredeln
Den Aufguss zu Reis, Saucen oder Desserts geben und bewusst genießen.
<!-- div.rs-professional -->
ROYAL SPICES BUSINESS
#### Für Küchen, die <br> mehr erwarten.
Safran für Gastronomie und Handel. Exklusive kulinarische Erlebnisse und Catering für Unternehmen und Veranstaltungen.
<!-- div.rs-professional-actions -->
[B2B kennenlernen ↗](/pages/b2b-zusammenarbeit)
[Catering entdecken](/pages/catering)
<!-- div.rs-lastline -->
ROYAL SPICES — FROM HERAT WITH CHARACTER — THE ART OF SAFFRON
```

### Fußzeile

```
<!-- footer.shopify-section-group-footer-group -->
<!-- div.rs-custom-footer -->
<!-- div.rs-footer-columns -->
<!-- div.rs-foot-brand -->
✧
#### ROYAL <br> SPICES
THE ART OF SAFFRON
Edler Safran aus Herat. Genuss für besondere Momente.
##### Entdecken
[Unsere Safran-Kollektion](/collections/safran)
[Herkunft & Qualität](/pages/herkunft-qualitat)
[Unsere Geschichte](/pages/ueber-uns)
[B2B & Großhandel](/pages/b2b-zusammenarbeit)
[Catering & Events](/pages/catering)
##### Informationen
[Kontakt](/pages/contact)
[Häufige Fragen](/pages/faq)
[Versand & Lieferung](/pages/versand-lieferung)
[Impressum](/pages/impressum)
[Datenschutz](/policies/privacy-policy)
<!-- div.rs-foot-contact -->
##### Kontaktiere uns
Royal Spices <br> Sajad Akrami <br> Hammerdeich 10 <br> 20537 Hamburg <br> Deutschland
[040 59374940](tel:+494059374940)
[info@royalspices.de](mailto:info@royalspices.de)
<!-- div.rs-newsletter -->
THE ROYAL JOURNAL
##### Genuss beginnt mit Inspiration.
Safran-Rezepte und ausgewählte Neuigkeiten von Royal Spices.
Deine E-Mail-Adresse
<!-- div.rs-nl-field -->
[Feld email: E-Mail-Adresse]
[Knopf: Anmelden ↗]
Mit deiner Anmeldung möchtest du Marketing-E-Mails erhalten. Hinweise:
[Datenschutz](/policies/privacy-policy)
.
<!-- div.rs-footer-bottom -->
© 2026 Royal Spices · Alle Rechte vorbehaltenHERAT · HAMBURG · THE ART OF SAFFRON
```

## Kollektion Safran

Live: `https://royalspices.de/collections/safran`

```
Title: Herat Negin Safran &ndash; www.Royal-Spices.com


Title: Herat Negin Safran &ndash; www.Royal-Spices.com

Description: Royal Spices – Safran aus HeratEntdecke ganze Negin-Safranfäden aus Herat in Afghanistan. Sorgfältig ausgewählt für feine Reisgerichte, Saucen, Desserts und besondere Genussmomente. Erhältlich in ausgewählten Glasgrößen.

### Kategorie: Herat Negin Safran
#### Royal Spices – Safran aus Herat
Entdecke ganze Negin-Safranfäden aus Herat in Afghanistan. Sorgfältig ausgewählt für feine Reisgerichte, Saucen, Desserts und besondere Genussmomente. Erhältlich in ausgewählten Glasgrößen.
#### Filter:
Verfügbarkeit
0 ausgewählt
[Zurücksetzen](/collections/safran)
Verfügbarkeit
[Feld checkbox: filter.v.availability]
Auf Lager (2) Auf Lager (2 Produkte)
[Feld checkbox: filter.v.availability]
Nicht vorrätig (0) Nicht vorrätig (0 Produkte)
Preis
Der höchste Preis ist €12,90
[Zurücksetzen](/collections/safran)
€
[Feld text: 0]
Von
€
[Feld text: 12,90]
Bis
[Alle entfernen](/collections/safran)
Sortieren nach:
Ausgewählt Am relevantesten meistverkauft Alphabetisch, A-Z Alphabetisch, Z-A Preis, niedrig nach hoch Preis, hoch nach niedrig Datum, alt zu neu Datum, neu zu alt
#### 2 Produkte
Filtern und sortieren Filter
#### Filtern und sortieren
#### Filter
2 Produkte
Verfügbarkeit
[Knopf: Verfügbarkeit]
[Feld checkbox: filter.v.availability]
Auf Lager (2) Auf Lager (2 Produkte)
[Feld checkbox: filter.v.availability]
Nicht vorrätig (0) Nicht vorrätig (0 Produkte)
[Löschen](/collections/safran)
[Knopf: Anwenden]
Preis
[Knopf: Preis]
Der höchste Preis ist €12,90
€
[Feld text: 0]
Von
€
[Feld text: 12,90]
Bis
[Löschen](/collections/safran)
[Knopf: Anwenden]
Sortieren nach:
Ausgewählt Am relevantesten meistverkauft Alphabetisch, A-Z Alphabetisch, Z-A Preis, niedrig nach hoch Preis, hoch nach niedrig Datum, alt zu neu Datum, neu zu alt
[Alle entfernen](/collections/safran)
[Knopf: Anwenden]
[Alle entfernen](/collections/safran)
#### 2 Produkte
![Royal Spices Herat Negin 0,5-g-Glas mit Herkunfts- und Qualitätsinformationen](//royalspices.de/cdn/shop/files/royal-spices-safran-herat-05-story_78ec6798-4218-47b3-9d69-1292c6fad6ed.png)
[Safran – Herat Negin Grade 1, 0,5 g](/products/safran-herat-negin-0-5g)
Normaler Preis €8,90 EUR
Normaler Preis Verkaufspreis €8,90 EUR
Grundpreis €8.900,00/kg
![Royal Spices 1 g Herat Negin Safran im Glas, Premium Produktfoto](//royalspices.de/cdn/shop/files/royal-spices-herat-negin-1g-premium_6c44d347-07dd-4963-a59a-680f23466abf.png)
[Herat Negin Safran – 1 g (Grade A)](/products/herat-negin-safran-1-g-grade-a)
Normaler Preis €12,90 EUR
Normaler Preis Verkaufspreis €12,90 EUR
```

## Produkt 1 g

Live: `https://royalspices.de/products/herat-negin-safran-1-g-grade-a`

```
Title: Herat Negin Safran – 1 g (Grade A &ndash; www.Royal-Spices.com

<!-- section.shopify-section-template--29668634591619__main -->
![Royal Spices 1 g Herat Negin Safran im Glas, Premium Produktfoto](//royalspices.de/cdn/shop/files/royal-spices-herat-negin-1g-premium_6c44d347-07dd-4963-a59a-680f23466abf.png)
![Royal Spices goldenes Safranblüten-Symbol](//royalspices.de/cdn/shop/files/royal-spices-atelier-favicon.png)
### Herat Negin Safran – 1 g (Grade A)
#### Herat Negin Safran – 1 g (Grade A)
Normaler Preis €12,90 EUR
Normaler Preis Verkaufspreis €12,90 EUR
Sale Ausverkauft
Inkl. Steuern.
Anzahl
[Feld number: quantity]
[Knopf: In den Warenkorb legen]
#### Herat Negin – Safran mit Charakter
Ein außergewöhnliches Gewürz für die Momente, in denen jedes Detail zählt. Royal Spices präsentiert ganze Negin-Safranfäden aus Herat, Afghanistan: sorgfältig ausgewählt, intensiv in Farbe und unverwechselbar im Duft.
##### Das Produkt
Produkt: Safranfäden (Crocus sativus L.)
Zutaten: 100 % Safran
Nettofüllmenge: 1 g
Herkunft: Herat, Afghanistan
Qualität: Negin, Grade A
##### So genießt du ihn
Einige Fäden in wenig warmem Wasser ziehen lassen. Den Safranaufguss anschließend zu Reis, Risotto, Saucen, Suppen oder Desserts geben und nach Geschmack dosieren.
##### Lagerung
Trocken, gut verschlossen und vor Licht sowie Wärme geschützt lagern. Das Mindesthaltbarkeitsdatum und die Chargenkennzeichnung stehen auf der Verpackung.
Royal Spices – The Art of Saffron.
##### Verantwortlicher Lebensmittelunternehmer
Royal Spices · Sajad Akrami <br> Hammerdeich 10 <br> 20537 Hamburg, Deutschland
[Feld text: Link]
[Vollständige Details anzeigen](/products/herat-negin-safran-1-g-grade-a)
![Royal Spices 1 g Herat Negin Safran im Glas, Premium Produktfoto](//royalspices.de/cdn/shop/files/royal-spices-herat-negin-1g-premium_6c44d347-07dd-4963-a59a-680f23466abf.png)
![Royal Spices goldenes Safranblüten-Symbol](//royalspices.de/cdn/shop/files/royal-spices-atelier-favicon.png)
<!-- section.shopify-section-template--29668634591619__related-products -->
```

## Produkt 0,5 g

Live: `https://royalspices.de/products/safran-herat-negin-0-5g`

```
Title: Premium Safran 0,5 g – Herat Negin Grade 1 | Royal Spices &ndash; www.Royal-Spices.com

<!-- section.shopify-section-template--29668634591619__main -->
![Royal Spices Herat Negin 0,5-g-Glas mit Herkunfts- und Qualitätsinformationen](//royalspices.de/cdn/shop/files/royal-spices-safran-herat-05-story_78ec6798-4218-47b3-9d69-1292c6fad6ed.png)
![Royal Spices 0,5-g-Safrangläser im Premium-Branding](//royalspices.de/cdn/shop/files/royal-spices-safran-herat-05-collection_c33c592c-f93a-42a4-9076-b0cfd1ff2db4.png)
### Safran – Herat Negin Grade 1, 0,5 g
#### Safran – Herat Negin Grade 1, 0,5 g
Normaler Preis €8,90 EUR
Normaler Preis Verkaufspreis €8,90 EUR
Grundpreis €8.900,00/kg
Sale Ausverkauft
Inkl. Steuern.
Anzahl
[Feld number: quantity]
[Knopf: In den Warenkorb legen]
#### Die Kunst des Safrans – im kleinen Glas
Herat Negin Safran von Royal Spices bringt den Charakter Afghanistans in deine Küche. Ganze rote Safranfäden für fein abgestimmte Gerichte, von traditionellem Reis bis zur modernen Patisserie.
##### Produktdetails
Produkt: Safranfäden (Crocus sativus L.)
Zutaten: 100 % Safran
Nettofüllmenge: 0,5 g
Herkunft: Herat, Afghanistan
Qualität: Negin, Grade 1
##### Verwendung
Wenige Fäden vor der Verwendung in warmem Wasser ziehen lassen und den Aufguss zusammen mit den Fäden zum Gericht geben.
##### Lagerung
Trocken, gut verschlossen und lichtgeschützt lagern. Das Mindesthaltbarkeitsdatum ist auf der Verpackung angegeben.
##### Verantwortlicher Lebensmittelunternehmer
Royal Spices · Sajad Akrami <br> Hammerdeich 10 <br> 20537 Hamburg, Deutschland
[Feld text: Link]
[Vollständige Details anzeigen](/products/safran-herat-negin-0-5g)
![Royal Spices Herat Negin 0,5-g-Glas mit Herkunfts- und Qualitätsinformationen](//royalspices.de/cdn/shop/files/royal-spices-safran-herat-05-story_78ec6798-4218-47b3-9d69-1292c6fad6ed.png)
![Royal Spices 0,5-g-Safrangläser im Premium-Branding](//royalspices.de/cdn/shop/files/royal-spices-safran-herat-05-collection_c33c592c-f93a-42a4-9076-b0cfd1ff2db4.png)
<!-- section.shopify-section-template--29668634591619__related-products -->
```

## Herkunft & Qualität

Live: `https://royalspices.de/pages/herkunft-qualitat`

```
Title: Herkunft &amp; Qualität &ndash; www.Royal-Spices.com

<!-- section.shopify-section-template--29668634558851__main -->
### Herkunft & Qualität
HERAT, AFGHANISTAN
#### Wo unsere Geschichte beginnt
Der Safran von Royal Spices hat seinen Ursprung in der Region Herat in Afghanistan. Dort wird Crocus sativus L. angebaut – eine Pflanze, deren Blüten die begehrten Safranfäden tragen.
#### Handverlesene Negin-Fäden
Für unsere Negin-Qualität werden die roten Narben sorgfältig ausgewählt. Das Ergebnis ist Safran in ganzen Fäden mit dem charakteristischen Duft und der intensiven goldgelben Färbekraft, für die dieses Gewürz geschätzt wird.
#### Qualität transparent machen
Bei der Auswahl unserer Ware berücksichtigen wir Herkunft, Sortierung und verfügbare Qualitätsanalysen. Informationen und Laborunterlagen zu konkreten Chargen können auf Anfrage bereitgestellt werden.
#### So bewahrst du das Aroma
Safran trocken, lichtgeschützt und gut verschlossen lagern. Für die Zubereitung einige Fäden kurz in warmem Wasser ziehen lassen und den Aufguss zum Gericht geben.
[Safran entdecken →](/collections/safran)
```

## Catering

Live: `https://royalspices.de/pages/catering`

```
Title: Royal Spices Catering &amp; Live Cooking &ndash; www.Royal-Spices.com

<!-- section.shopify-section-template--29668634558851__main -->
### Royal Spices Catering & Live Cooking
Royal Spices · Culinary Experiences
#### Exklusive Kulinarik für besondere Momente.
Von eleganten Canapés über Flying Buffets bis zu individuell komponierten Menüs: Royal Spices verbindet präzises Handwerk mit modernen europäischen, afghanischen und persischen Aromen. Persönlich konzipiert und auf Wunsch vor Ort vollendet.
#### Unsere Formate
##### Flying Buffet & Canapés
Feine Fingerfood-Kreationen, saisonale Mini-Löffelgerichte und raffinierte Desserts – für Empfänge, Markenveranstaltungen und private Feste.
Beispiele: Tuna Tatar · Avocado · Crispy Chili · Sesam / Burrata · Erbsenpesto · Safran-Zitrone / Geschmorte Rinderschulter · Trüffel-Kartoffelpüree / Rotgarnele · Basilikum-Hummus · Safran-Aioli.
##### Business Lunch & Office Catering
Frühstück, Tagungsversorgung, individuell abgestimmte Lunchmenüs und kleine wie große Firmenveranstaltungen.
##### Live Cooking by Chef Sajad
Persönlich zubereitete Menüs und kulinarisches Erlebnis vor Ort – klassisches Handwerk trifft auf kreative Neuinterpretationen.
#### Preisorientierung
Canapés ab 3,90 € · Mini-Löffelgerichte ab 4,20 € · Mini-Desserts ab 4,20 €, jeweils inklusive gesetzlicher Mehrwertsteuer. Verfügbarkeit, Mindestmengen, Personalkosten, Transport und Aufbau werden individuell angeboten.
#### Für Hamburg und Umgebung
Du planst ein Event, einen Empfang oder eine Firmenveranstaltung? Wir freuen uns über eine unverbindliche Anfrage mit Datum, Veranstaltungsort, Gästezahl und deinen Wünschen.
[CATERING ANFRAGEN →](/pages/contact)
```

## B2B & Großhandel

Live: `https://royalspices.de/pages/b2b-zusammenarbeit`

```
Title: B2B &amp; Großhandel &ndash; www.Royal-Spices.com

<!-- section.shopify-section-template--29668634558851__main -->
### B2B & Großhandel
ROYAL SPICES BUSINESS
#### Premium-Safran für anspruchsvolle Partner.
Du führst einen Feinkostladen, Supermarkt, ein Restaurant oder einen Großhandel? Royal Spices bietet Negin-Safran aus Herat für den professionellen Einsatz und den Wiederverkauf an.
#### Für Einzelhandel & Feinkost
Unsere 1-g-Safrangläser eignen sich für hochwertige Sortimente. Theken-Displays und individuelle Abnahmemengen können angefragt werden.
#### Für Gastronomie & Profiküchen
Für Restaurants, Cateringunternehmen und professionelle Küchen bieten wir Safran in passenden Verpackungsgrößen und individuelle Angebote je nach Menge und Bedarf.
#### Zusammenarbeit
Teile uns deinen Bedarf und die geplante Menge mit.
Wir besprechen verfügbare Ware, Verpackungen und Konditionen.
Du erhältst ein individuelles Angebot mit allen relevanten Angaben.
[B2B-Anfrage senden →](/pages/contact)
```

## Über uns

Live: `https://royalspices.de/pages/ueber-uns`

```
Title: Über Royal Spices &ndash; www.Royal-Spices.com

<!-- section.shopify-section-template--29668634558851__main -->
### Über Royal Spices
THE ART OF SAFFRON
#### Eine Herkunft. Eine Leidenschaft.
Royal Spices steht für außergewöhnliche Gewürze und bewussten Genuss. Im Mittelpunkt: Negin-Safran aus Herat in Afghanistan – sorgfältig ausgewählte ganze Fäden für die anspruchsvolle Küche.
Die Idee hinter unserer Marke ist einfach: Ein besonderes Produkt verdient eine ebenso besondere Präsentation. Deshalb verbinden wir die kulinarische Tradition unserer Herkunft mit einem modernen Anspruch an Ästhetik, Qualität und Genuss.
#### Von der Herkunft bis zum Teller
Als Marke mit gastronomischer Erfahrung verstehen wir, welche Rolle gute Zutaten spielen. Ob Safranreis, feine Saucen, Patisserie oder zeitgenössische Interpretationen afghanischer und persischer Küche: Safran macht aus wenigen Handgriffen etwas Besonderes.
#### Unsere Philosophie
Wir lieben klare Zutaten, ehrliche Herkunftsinformation und die Kunst, besondere Momente am Tisch zu schaffen. Royal Spices entwickelt sich mit diesem Anspruch weiter – von ausgewählten Produkten bis zu kulinarischen Erlebnissen.
[Unsere Safran-Kollektion entdecken →](/collections/safran)
```

## Kontakt

Live: `https://royalspices.de/pages/contact`

```
Title: Kontakt &amp; Anfragen &ndash; www.Royal-Spices.com

<!-- section.shopify-section-template--29668634657155__main -->
### Kontakt & Anfragen
#### Wir freuen uns auf deine Nachricht.
Du hast Fragen zu unserem Safran, möchtest ein B2B-Angebot anfordern oder planst ein Catering in Hamburg? Verwende dafür das Kontaktformular auf dieser Seite – deine Nachricht erreicht uns direkt über Shopify.
Royal Spices <br> Sajad Akrami · Inhaber und Koch <br>
[040 59374940](tel:+494059374940)
<br>
[info@royalspices.de](mailto:info@royalspices.de)
Für ein Cateringangebot teile uns möglichst Datum, Ort, Anlass und Gästezahl mit. Für Handelsanfragen hilft die gewünschte Menge.
<!-- section.shopify-section-template--29668634657155__form -->
#### Kontaktformular
[Feld text: Name]
Name
[Feld email: E-Mail]
E-Mail *
[Feld tel: Telefonnummer]
Telefonnummer
[Feld textarea: Kommentar]
Kommentar
[Knopf: Senden]
```

## Häufige Fragen

Live: `https://royalspices.de/pages/faq`

```
Title: Häufige Fragen &ndash; www.Royal-Spices.com

<!-- section.shopify-section-template--29668634558851__main -->
### Häufige Fragen
#### Was ist Herat Negin Safran?
Negin bezeichnet besonders sorgfältig sortierte Safranfäden. Unser Safran stammt aus der Region Herat in Afghanistan.
#### Wie verwende ich Safran?
Einige Fäden in wenig warmem Wasser ziehen lassen und die Flüssigkeit samt Fäden zu Reis, Saucen, Suppen oder Desserts geben. Die genaue Dosierung richtet sich nach Rezept und gewünschter Intensität.
#### Wie lagere ich Safran?
Trocken, gut verschlossen und vor Licht und Wärme geschützt lagern. Das Mindesthaltbarkeitsdatum findest du auf deiner Verpackung.
#### Kann ich Safran verschenken?
Unsere Geschenkbox mit 5 g befindet sich aktuell in Vorbereitung. Im Sortiment findest du bereits Safran im Glas.
#### Ist ein B2B-Angebot möglich?
Ja. Wir beraten Gastronomie, Feinkostgeschäfte und Handel gerne zu Mengen, Verpackungen und Konditionen.
[Mehr erfahren](/pages/b2b-zusammenarbeit)
.
#### Wo finde ich Angaben zum Versand?
Informationen findest du auf unserer
[Versandseite](/pages/versand-lieferung)
sowie vor Abschluss deiner Bestellung im Checkout.
```

## Versand & Lieferung

Live: `https://royalspices.de/pages/versand-lieferung`

```
Title: Versand &amp; Lieferung &ndash; www.Royal-Spices.com

<!-- section.shopify-section-template--29668634558851__main -->
### Versand & Lieferung
#### Versand & Lieferung
Wir möchten, dass dein Royal-Spices-Paket sicher bei dir ankommt. Die aktuell im Shop hinterlegten Versandtarife lauten:
##### Deutschland
Standardversand: 4,99 €. Ab einem Warenwert von 50,00 € wird innerhalb Deutschlands eine kostenlose Standardversandoption angeboten.
##### Europäische Union
Standardversand in die im Checkout angebotenen EU-Länder: 13,99 €.
##### Weitere internationale Lieferziele
Für weitere im Checkout angebotene Lieferländer ist ein Standardtarif von 19,99 € hinterlegt. Ob wir deine Adresse beliefern, wird im Checkout angezeigt.
##### Lieferzeiten
Die Bearbeitungs- und Transportzeit hängt von Verfügbarkeit, Lieferland und Versanddienstleister ab. Weitere Versandinformationen erhältst du im Bestellprozess. Bei Fragen zur Lieferung nutze bitte unser
[Kontaktformular](/pages/contact)
.
Maßgeblich sind die im Checkout für die konkrete Bestellung angezeigten Lieferoptionen und Kosten.
```

## Impressum

Live: `https://royalspices.de/pages/impressum`

```
Title: Impressum &ndash; www.Royal-Spices.com

<!-- section.shopify-section-template--29668634558851__main -->
### Impressum
<!-- div.rs-legal -->
Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)
#### Betreiber
Sajad Akrami <br> Royal Spices <br> Hammerdeich 10 <br> 20537 Hamburg <br> Deutschland
#### Kontakt
Telefon:
[040 59374940](tel:+494059374940)
<br> E-Mail:
[info@royalspices.de](mailto:info@royalspices.de)
#### Umsatzsteuer-ID
Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: <br> DE459334343
#### Bildnachweis
Für die auf royalspices.de verwendete Bergfotografie: „Wakhan, Tajikistan“ von Ninara, lizenziert unter
[Creative Commons CC BY 2.0](https://creativecommons.org/licenses/by/2.0/deed.de)
; Darstellung als Bildausschnitt mit Farbüberlagerung. Dieser Nachweis bezieht sich auf die Originalwebsite. Die hier verwendeten Produkt- und Markenbilder können abweichen.
```

## Datenschutz (Shopify-Standardtext, nur Überschriften)

Live: `https://royalspices.de/policies/privacy-policy`

Vollständiger Text: `.raw/live-20261015/outline.md`. Überschriften:

```
### Datenschutzerklärung
#### Welche personenbezogenen Daten erfassen oder verarbeiten wir?
#### Quellen von personenbezogenen Daten
#### Wie verwenden wir Ihre personenbezogene Daten?
#### Wie geben wir personenbezogene Daten weiter?
#### Beziehung mit Shopify
#### Websites und Links von Drittanbietern
#### Daten von Kindern
#### Sicherheit und Aufbewahrung Ihrer Daten
#### Ihre Rechte und Möglichkeiten
#### Beschwerden
#### Internationale Übertragungen
#### Änderungen an dieser Datenschutzerklärung
#### Kontakt
```

## Warenkorb

Live: `https://royalspices.de/cart`

```
Title: Dein Warenkorb &ndash; www.Royal-Spices.com


Title: Dein Warenkorb &ndash; www.Royal-Spices.com

Description: 

### Dein Warenkorb
[Weiter shoppen](/collections/all)
### Dein Warenkorb ist leer
[Weiter shoppen](/collections/all)
#### Hast du ein Konto?
[Logge dich ein](https://royalspices.de/customer_authentication/redirect?locale=de®ion_country=DE)
, damit es beim Checkout schneller geht.
Wird geladen ...
#### Geschätzte Gesamtkosten
€0,00 EUR
Inkl. Steuern. Rabatte und Versand werden beim Checkout berechnet.
[Knopf: Auschecken]
```

## Suche

Live: `https://royalspices.de/search`

```
Title: Suchen &ndash; www.Royal-Spices.com

<!-- section.shopify-section-template--29668634624387__main -->
### Suchen
[Feld search: Suchen]
Suchen
```

## Blog

Live: `https://royalspices.de/blogs/news`

```
Title: News &ndash; www.Royal-Spices.com

<!-- section.shopify-section-template--29668634493315__main -->
### News
```
