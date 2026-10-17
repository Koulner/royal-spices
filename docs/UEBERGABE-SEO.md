# Übergabe: SEO-Masterplan Royal Spices (royalspices.de)

Stand 17.10.2026: S0 übernommen, Folgetransaktionen als Entwurf (Abschnitt „Wiedereinstieg (Stand 17.10.2026, nach S0)“). Ursprünglicher Stand 16.10.2026. Der Plan entstand am 15./16.10. in einem eigenen Chat (Kopie von `C:\Users\lukas\.claude\plans\streamed-sniffing-neumann.md`). Er wurde im neuen Chat unverändert übernommen, mit Ausnahme des Abgleichs direkt hier unten und der Abschnitte „Wiedereinstieg“ und „Umsetzung und Budget“, die an den Projektstand angepasst sind.

## Abgleich mit dem Projektstand (16.10.2026, neuer Chat)

Beim Wiedereinstieg mit `_agent/LOG.md` und dem Staging verglichen:

1. **Shopify A–D laufen bereits.** T-20261015-03 bis -07 sind `OFFEN` und laufen in einer anderen Sitzung („Shopify-Übernahme Fortsetzung“). Damit gilt „noch nicht gebaut“ im Kontext unten nicht mehr. Die SEO-Ergänzungen für A–D (Phase 1) können nicht mehr in die Aufträge hinein. Vorschlag: eigene SEO-Folgetransaktionen auf denselben Dateien, jeweils erst nach der Übernahme der zugehörigen Transaktion (offene Entscheidung 4).
2. **Es gibt nur eine Weiterleitungstabelle, `src/config/redirects.mjs` aus T-20261015-06.** Die Datei ist in Arbeit und noch nicht übernommen; T-06 schreibt dazu `server.mjs` und `tests/redirects.test.mjs`. S0 legt deshalb **kein** `src/data/redirects.ts` an und testet die Tabelle nicht doppelt. S0 prüft nur das Verhalten von außen (`seo.mjs --redirects`: 301, ein Sprung, Ziel 200) anhand einer Liste alter URLs.
3. **Abweichungen zwischen der Tabelle von T-06 (Zwischenstand) und dem Plan:**
   - `/policies/terms-of-service` und `/policies/refund-policy` liefern bei T-06 absichtlich 404, weil es in V1 noch keine AGB- und Widerrufsseite gibt. Sobald `/agb/` und `/widerruf/` existieren, kommen beide Einträge dazu.
   - `/blogs/news` geht bei T-06 auf `/`, laut Plan auf `/ratgeber/`. Umstellen, sobald es den Ratgeber gibt.
   - `/cart` geht bei T-06 auf `/produkte/`, laut Plan auf `/`. Beides ist vertretbar; T-06 gilt.
   - Ob T-06 `/collections/frontpage`, `/collections/*/products/…` und `?variant=…` abdeckt, prüft `seo.mjs --redirects`, nicht dieser Abgleich.
4. **T-20261015-02 ist übernommen**, nicht offen. Für S0 ändert das nichts.
5. **Hosting ist schon eingegrenzt.** Nach `docs/ARCHITECTURE.md` braucht der Anfrage-Endpunkt eine Node-22-Laufzeit, also laufen die 301 in `server.mjs`. Offen sind nur der Anbieter (Kunde) und der Rebuild per Webhook.
6. **Der Warenkorb nutzt `localStorage`** (`src/scripts/commerce.ts:28`). Für S7 heißt das: Er ist nach § 25 Abs. 2 Nr. 2 TDDDG zulässig, wenn er unbedingt erforderlich ist und erst nach einer Aktion des Nutzers schreibt. Vorschlag für S7 siehe Musskriterien.
7. **IndexNow-Schlüssel nicht in `public/`.** Ein Schlüssel aus 32 Hex-Zeichen würde die Prüfung M5 („keine Zugangsdaten im Repo“) auslösen. Deshalb kommt der Schlüssel aus der Umgebungsvariable `INDEXNOW_KEY`, und `tools/seo/indexnow.mjs` schreibt die Schlüsseldatei beim Deploy in die Build-Ausgabe.
8. **Nachtrag 16.10.2026 (T-20261016-08): Shopify A–D sind übernommen.** Produktseiten heißen jetzt wie der Shopify-Handle: `/produkte/herat-negin-safran-1-g-grade-a/` und `/produkte/safran-herat-negin-0-5g/`. Die alte 1-g-Seite und die früheren Seiten Handel und Gastronomie leiten per 301 weiter (`src/config/redirects.mjs`). Wo der Plan unten den alten Produktpfad als Ziel nennt (Kontext, S-Kriterien, Weiterleitungstabelle), gilt der Handle-Pfad.

## Kontext

**Ausgangslage live** (Shopify-Theme, `docs/LIVE-INVENTAR.md`): Der Seitentitel lautet „www.Royal-Spices.com“, die Meta-Beschreibung ist leer. Es gibt 2 Produkte (0,5 g für 8,90 €, 1 g für 12,90 €). AGB, Widerruf und Versandrichtlinie liefern 404, der Blog ist leer. In der Suche wirkt die Domain jung und schwach.

**Ausgangslage V1** (Astro, headless): Grundlagen sind vorhanden, Indexierung ist bis `SITE_INDEXABLE=1` bewusst gesperrt (`src/config/launch.ts`, `src/pages/robots.txt.ts`).
- In `src/layouts/Base.astro`: Titel, Beschreibung, Canonical, Open Graph, `noindex`-Schalter, JSON-LD-Slot.
- Sitemap über `@astrojs/sitemap`.
- `Organization` auf der Startseite, `Product` ohne `offers` auf `/produkte/safran-negin-1g/`.
- 301-Weiterleitung auf den Schrägstrich in `server.mjs:146`.

**Anlass:** Mit dem Shopify-Headless-Umbau (Transaktionen A–D in `docs/UEBERGABE-SHOPIFY.md`, noch nicht gebaut) zieht die Domain um. Ohne Plan droht Ranking-Verlust: alte Shopify-URLs laufen ins Leere, myshopify.com erzeugt Duplicate Content, der Merchant-Feed bricht.

**Ziel:** Alle legalen SEO-Möglichkeiten nutzen, konform mit DSGVO, TDDDG, UWG, PAngV, LMIV und HCVO.

**Entscheidungen des Nutzers (15.10.2026):**
- Technik plus Ratgeber-Hub (Texte als Entwurf, der Kunde gibt frei).
- Nur Deutsch.
- „Alle SEO-Möglichkeiten, EU/DE-legal“: Offpage und Local SEO gehören dazu, Messung ohne Einwilligungspflicht.
- SEO wird in die Transaktionen A–D eingewoben.

**Recherche:** drei Agents, Quellen in der Ablage unten.
- Reddit war gesperrt, sowohl für die Agents als auch im eingebauten Browser („not allowed due to safety restrictions“).
- Als Ersatz dienten Shopify-Community-Threads, Googles Doku und Updates bis 06/2026, Studien (SE Ranking, Ahrefs), Googles Autocomplete für DE und Bing-Ergebnisse für DE.

## Leitplanken (gelten für jede Phase)

1. **Produktwahrheit:** Es erscheint nur, was in `docs/PRODUCT-TRUTH.md` als bestätigt steht. Keine Superlative, keine Zertifikate, keine Analysen ohne Dokument.
2. **Keine Gesundheitsaussagen (HCVO 1924/2006):** Das gilt laut EuGH C-386/23 vom 30.04.2025 (ein Safranprodukt) auch für „on hold“-Pflanzenclaims. Deshalb kein Inhalt zu „Safran Wirkung“, obwohl die Suchanfrage groß ist.
3. **Pflichtangaben vor dem Kauf:**
   - LMIV-Angaben als HTML auf der Produktseite.
   - Preis inkl. MwSt. und Versandhinweis.
   - Grundpreis nach PAngV: rechtlich prüfen, Ausnahme für Nenngewicht unter 10 g vermutet. Wird er angezeigt, dann korrekt in €/kg.
   - Vor dem Launch Pflicht: AGB, Widerruf, Versand (Aufgabe des Kunden, O6).
4. **Datenschutz:**
   - Kein Skript, das ohne Einwilligung auf das Endgerät zugreift (§ 25 TDDDG).
   - Search Console und Bing per DNS-Nachweis, ohne Code auf der Seite.
   - Messung **nur** aus Server-Logs bzw. Edge-Statistik des Hosters, ohne Cookies und ohne JS (Entscheidung 16.10.). Keine JS-Analytics, kein GA4, keine Weitergabe oder Verwertung von Besucherdaten.
   - Auch Server-Logs enthalten IP-Adressen. Deshalb: Rohlogs nur kurz aufbewahren (Vorschlag 7 Tage, bei Angriffen länger), die Statistik nur aggregiert und mit gekürzter IP, Rechtsgrundlage berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO), Abschnitt in `datenschutz.astro`. Die genaue Umsetzung hängt vom Hoster ab (V6).
5. **Bewertungen (UWG § 5b Abs. 3):** Nur echte Bewertungen. Auf der Seite steht, ob und wie geprüft wird, dass sie von Käufern stammen. Ein `Review`- oder `AggregateRating`-Schema gibt es nur mit echten Daten.
6. **Kein Spam:** Keine massenhaft erzeugten Seiten. Jeder Ratgebertext wird vom Kunden geprüft und freigegeben (Googles Spam-Richtlinie, AI-Optimization-Guide 2026).
7. **Kein `llms.txt`:** Google ignoriert die Datei, laut Studie bringt sie nichts. Für KI-Suche zählen klassisches Ranking und Erwähnungen der Marke.

## Phase 0: Vorbereitung beim Kunden (kein Code, parallel zu A–D)

| Nr | Aufgabe | Wer |
|---|---|---|
| V1 | Search-Console-Domain-Property per DNS-TXT; vorhandene Daten des Live-Shops sichern (Leistung, indexierte URLs) | Kunde, Anleitung von uns |
| V2 | Bing Webmaster Tools: Import aus Search Console | Kunde |
| V3 | Merchant Center anlegen und Domain beanspruchen; Versand (frei ab 50 € in DE) und Rückgabe hinterlegen | Kunde |
| V4 | Google Business Profile als Servicegebiet-Unternehmen für das Catering (Hamburg und Umgebung). Adresse ausblenden, wenn dort kein Kundenverkehr ist. Danach Apple Business Connect und Bing Places mit identischem NAP | Kunde |
| V5 | Shopify: Checkout-Domain `checkout.royalspices.de` (CNAME `shops.myshopify.com`) als primär; Redirect-Theme für myshopify.com veröffentlichen (kein Passwort, es bricht den Checkout); O6-Korrekturen (Titel Grade 1, Favicon als Produktbild entfernen) | Kunde |
| V6 | Hosting festlegen (O1). Es entscheidet, wo die 301 laufen (Node `server.mjs` oder Hoster-Konfiguration) und wie Shopify-Webhooks einen Rebuild auslösen | Kunde/Technik |

## Phase 1: Technisches SEO, eingewoben in die Transaktionen A–D

Jede Transaktion bekommt zusätzlich die SEO-Abnahmekriterien unten. Gemeinsame Bausteine entstehen zuerst in einer kleinen **Transaktion S0**. Sie läuft vor A–D und hat eine eigene Schreibmenge.

**S0 – Bausteine** (neu, keine Kollision mit A–D; angepasst am 16.10., siehe Abgleich oben):
- `src/lib/seo/schema.ts`: Builder für `Organization`/`OnlineStore`, `WebSite`, `BreadcrumbList`, `Product`+`Offer`, `Article`, `Recipe`, `Service`. Daten aus `src/config/site.ts`, nichts doppelt.
- ~~`src/data/redirects.ts`~~ entfällt. Die einzige Weiterleitungstabelle ist `src/config/redirects.mjs` aus T-20261015-06.
- `tools/qa/seo.mjs`: Crawler über `dist/` oder den laufenden Server, nach dem Muster von `tools/qa/*.mjs` und mit `tools/qa/browser.mjs`. Prüfungen siehe Musskriterien.
- `tools/seo/indexnow.mjs`: meldet geänderte URLs nach dem Deploy an `api.indexnow.org`. Der Schlüssel kommt aus `INDEXNOW_KEY`; die Schlüsseldatei schreibt das Skript beim Deploy in die Build-Ausgabe, nicht nach `public/`.
- `tests/seo.test.mjs`: Schema-Builder (Pflichtfelder) und Prüffunktionen von `seo.mjs` an Beispiel-HTML. Die Weiterleitungstabelle testet T-06 in `tests/redirects.test.mjs`.
- `docs/SEO.md`: Keyword-Karte, Soll-Weiterleitungen mit Abgleich zu `redirects.mjs`, Status, Quellen. Wird lebende Doku.

**Rahmen in `Base.astro`/`astro.config.mjs`** (Teil von D):
- `WebSite`-Schema mit `name: "Royal Spices"`. Das korrigiert den Seitennamen „www.Royal-Spices.com“ in der Google-Suche.
- `robots`-Meta `max-image-preview:large` bei indexierbaren Seiten.
- `og:image` je Seite (mit Breite und Höhe), `og:type=product` auf Produktseiten.
- Favicon-Satz: PNG 48/96/192 und `apple-touch-icon`. Google braucht für das Favicon in den Suchergebnissen ein Vielfaches von 48 px; das SVG allein reicht nicht.
- Sitemap: `serialize()` mit echtem `lastmod` je Seite, ohne `noindex`-Seiten; prüfen, dass jede URL mit `/` endet.
- Header und Footer: interne Links auf Produkte, B2B, Ratgeber; NAP identisch mit Impressum und Unternehmensprofil.

**A – Produkte:**
- Produktseiten per Handle aus der Storefront API: `/produkte/safran-negin-1g/` bleibt, `/produkte/safran-negin-0-5g/` kommt neu.
- Titel bis ca. 60 Zeichen mit „Safran“, „Negin“, Menge und „Herat“; Beschreibung bis ca. 155 Zeichen.
- `Product` mit:
  - `Offer`: Preis aus Shopify, EUR, `availability`, `itemCondition: NewCondition`.
  - `sku` und `mpn`, beide = SKU.
  - `brand`.
  - Bilder mindestens 50.000 px, möglichst 1:1, 4:3 und 16:9.
  - keine GTIN (Eigenmarke).
- Versand und Rückgabe stehen auf Organisationsebene (`hasShippingService` mit Stufe „0 € ab 50 €“, `hasMerchantReturnPolicy`).
- `BreadcrumbList`.
- Preis-Konsistenz: Der Preis in HTML und JSON-LD wird beim Build gesetzt. Ein Shopify-Webhook (`products/update`) löst einen Rebuild aus, Umsetzung je nach Hosting (V6). Der Client-Warenkorb zeigt live.
- `/produkte/` als Kategorieseite mit eigenem Einleitungstext, verlinkt beide Produkte und den Ratgeber.

**B – Startseite:**
- `h1` mit Suchbegriff. Der Live-Text „The Art of Saffron.“ bleibt sichtbar; die `h1` enthält zusätzlich „Safran aus Herat“, etwa als Augenbraue in der `h1`. **Freigabe nötig, weil es D4 (Live-Texte wörtlich) berührt.**
- `Organization`/`OnlineStore` mit `logo`, `contactPoint`, `sameAs` (sobald es Profile gibt), Versand- und Rückgaberegeln.
- Inhalte der Journey stehen weiter als HTML im Dokument, nicht nur im Canvas.

**C – Seiten:**
- Neue Seiten `/b2b/`, `/faq/`, `/versand-lieferung/`, eigene Rechtsseiten `/agb/`, `/widerruf/` (Inhalt vom Kunden).
- `/catering/` mit `Service` und `areaServed: Hamburg`. Inhalt für „afghanisches Catering Hamburg“ nur, wenn das zur Küche passt (Kunde bestätigt).
- FAQ: Inhalt ja, **kein `FAQPage`-Schema**. Google zeigt seit dem 07.05.2026 keine FAQ-Rich-Results mehr.
- **301-Weiterleitungen** serverseitig in `server.mjs` aus `src/config/redirects.mjs` (T-20261015-06), je eine pro alter URL, ein Sprung, mindestens 12 Monate. Astros `redirects` erzeugen bei statischer Ausgabe nur Meta-Refresh, deshalb nicht verwenden. Shopifys eigene Weiterleitungen greifen headless nicht. Vollständig mit Varianten:

  | Alt | Neu |
  |---|---|
  | `/collections/safran`, `/collections/all`, `/collections/frontpage` | `/produkte/` |
  | `/products/herat-negin-safran-1-g-grade-a` (auch `?variant=…` und `/collections/*/products/…`) | `/produkte/safran-negin-1g/` |
  | `/products/safran-herat-negin-0-5g` | `/produkte/safran-negin-0-5g/` |
  | `/pages/herkunft-qualitat` | `/herkunft-qualitaet/` |
  | `/pages/catering` | `/catering/` |
  | `/pages/b2b-zusammenarbeit`, `/handel/`, `/gastronomie/` | `/b2b/` |
  | `/pages/ueber-uns` | `/ueber-uns/` |
  | `/pages/contact` | `/kontakt/` |
  | `/pages/faq` | `/faq/` |
  | `/pages/versand-lieferung`, `/policies/shipping-policy` | `/versand-lieferung/` |
  | `/pages/impressum`, `/policies/legal-notice` | `/impressum/` |
  | `/policies/privacy-policy` | `/datenschutz/` |
  | `/policies/terms-of-service` | `/agb/` |
  | `/policies/refund-policy` | `/widerruf/` |
  | `/blogs/news` | `/ratgeber/` |
  | `/cart` | `/` |
  | `/search` | `/produkte/` |

**D – Rahmen:** wie oben unter „Rahmen“, dazu Brotkrumen als Komponente aus `BreadcrumbList`.

**Performance (Core Web Vitals):** Die Journey ist bildlastig. Messung mit `tools/qa/perf.mjs` auf dem Produktions-Build ohne laufendes Blender. Ziel mobil: LCP unter 2,5 s, CLS unter 0,1, INP unter 200 ms.

## Phase 2: Launch und Migration (Stichtag)

1. Vor der Umstellung:
   - `tools/qa/seo.mjs` und `npm test` sind grün.
   - Redirect-Test über alle URLs aus `.raw/live-20261015/` und der Search-Console-Liste aus V1: 301, ein Sprung, Ziel 200.
   - PRODUCT-TRUTH und Rechtstexte sind freigegeben, dann Build mit `SITE_INDEXABLE=1`.
2. DNS umstellen. Danach:
   - Sitemap in Search Console und Bing einreichen.
   - URL-Prüfung für Start-, Produkt- und B2B-Seite.
   - IndexNow-Ping.
   - Merchant Center liest die Produkte aus dem JSON-LD der Seite („Produkte von Ihrer Website“). Die Google-&-YouTube-App von Shopify ist headless unzuverlässig, weil sie die falsche Domain liefert.
3. Vier Wochen lang wöchentlich prüfen:
   - 404 und Indexierung in Search Console.
   - Diagnose im Merchant Center.
   - Rich-Results-Test für die Produktseiten.
   - Fehlende Weiterleitungen nachtragen.

## Phase 3: Ratgeber-Hub `/ratgeber/` (Content Collection)

Technik:
- Ablage in `src/content/ratgeber/*.md`, Frontmatter mit `title`, `description`, `datePublished`, `dateModified`, `author`.
- Schema `Article` + `BreadcrumbList`; Rezepte mit `Recipe`, das weiter unterstützt wird. Rezepte nur mit echtem Foto und vom Kunden gekocht.
- Autorenseite (Sajad Akrami, auf `/ueber-uns/`) für Erfahrung und Vertrauen (E-E-A-T).

Arbeitsweise:
- Jeder Artikel ist eine Transaktion: Ein Subagent entwirft im Staging, der Kunde gibt frei.
- Rhythmus 2 Artikel pro Monat.
- Jeder Artikel verlinkt Produkt- und B2B-Seite.

Reihenfolge nach Suchnachfrage (Autocomplete) und Lücke bei der Konkurrenz:

1. **Safran echt erkennen:** „echt oder fake“, „Echtheit prüfen“; EU-Kontrollplan: 11 % der Proben mit Verdacht auf Verfälschung.
2. **Wie viel Safran wofür:** Reis, Risotto, Paella, Kuchen; auflösen und einweichen.
3. **Negin, Sargol, Pushal, Konjai:** die Sorten erklärt, mit Verweis auf die B2B-Sorten.
4. **ISO 3632 erklärt** (Ausgabe 2025, Kategorie I, Crocin mindestens 190). Ohne Aussage über das eigene Produkt, solange keine Analyse vorliegt (PRODUCT-TRUTH Nr. 14). Der Spitzenreiter Orient Kontor erwähnt die Norm nicht.
5. **Safran aus Afghanistan / Herat:** Herkunft, Vergleich mit Iran (Studie 2024). Ergänzt `/herkunft-qualitaet/`.
6. **Warum Safran so teuer ist und Preis pro Gramm:** passt zu „safran preis 1g afghanistan“.
7. **Safran richtig lagern:** erst nach Bestätigung des Lagerhinweises (PRODUCT-TRUTH Nr. 5).
8. **Rezepte:** Safranreis, Risotto alla milanese, Paella, afghanische Gerichte mit Safran (z. B. Sholeh-e-Zard), passend zu Catering und Herkunft.

Nicht bespielen:
- „Safran Wirkung/Kapseln“ (HCVO).
- „Safran kaufen dm/Lidl“ (Absicht: Supermarkt).

## Phase 4: Offpage, Local, Shopping

- **Merchant Center, kostenlose Einträge in DE:**
  - Versand und Rückgabe hinterlegen.
  - `identifier_exists: false`.
  - Bilder ohne Text oder Logo-Overlay.
  - Später optional Shopping-Anzeigen.
- **Unternehmensprofil Catering:**
  - Kategorien, Fotos, Leistungen.
  - Kunden nach dem Event um Bewertung bitten, ohne Anreiz (UWG).
- **Produktbewertungen:**
  - Shopify-Bewertungs-App mit API (z. B. Judge.me), echte Käufer, Prüfhinweis nach § 5b UWG.
  - `AggregateRating` erst ab echten Bewertungen.
- **Backlinks und Erwähnungen** (realistisch für eine kleine Marke):
  - Proben an Food-Blogger. Die Beiträge sind als Werbung gekennzeichnet, Links mit `rel="sponsored"`.
  - Lokale Hamburger Verzeichnisse und Catering-Portale.
  - B2B-Plattformen (z. B. wlw.de).
  - Lokale Presse („Safran aus Herat, abgefüllt in Hamburg“).
  - Afghanische Kulturvereine und Restaurants (B2B-Kunden).
- **KI-Sichtbarkeit:**
  - Erwähnungen der Marke zählen mehr als Backlinks; YouTube-Erwähnungen wirken am stärksten (Ahrefs).
  - Kurze Videos zu Echtheitstest und Zubereitung auf YouTube und Shorts, auf der Seite verlinkt; `sameAs` ergänzen.
- **Pinterest:** optional für Rezepte. Ein Nutzen für kleine Marken ist nicht belegt, deshalb niedrige Priorität.

## Phase 5: Messung und Pflege

- **Monatsbericht:**
  - Search Console: Klicks und Impressionen je Keyword-Cluster aus `docs/SEO.md`, Indexierung, Core Web Vitals, Bericht zu generativer KI.
  - Bing.
  - Merchant-Center-Diagnose.
  - Server-Log-Statistik.
- **Vierteljährlich:**
  - Ratgeber aktualisieren; `dateModified` nur bei echten Änderungen.
  - Weiterleitungstabelle und 404-Liste prüfen.
- Optional: ein geplanter Agent, der monatlich `tools/qa/seo.mjs` gegen die Live-Seite laufen lässt und `docs/SEO.md` fortschreibt.

## Musskriterien (vom Nutzer am 16.10.2026 freigegeben, mit Anpassungen an S2, S5, S7, S8)

| Nr | Kriterium | Messung |
|---|---|---|
| S1 | Jede indexierbare Seite hat genau eine `h1`, einen eindeutigen Titel (30–60 Zeichen), eine eindeutige Beschreibung (70–160 Zeichen) und ein absolutes Canonical auf sich selbst mit `/` | `tools/qa/seo.mjs` meldet 0 Fehler |
| S2 | JSON-LD jeder Seite parst. `Product` hat `name`, `image`, `Offer` mit `price` > 0 und `priceCurrency`, `availability`, `sku`, `brand`; der Preis im JSON-LD ist gleich dem sichtbaren Preis. Die Preisprüfung gilt für den Build mit Store; ohne Store hat `Product` kein `Offer`. Die Startseite hat `WebSite` mit `name: "Royal Spices"` und `Organization`/`OnlineStore` mit NAP gleich `site.ts` | `seo.mjs` + `tests/seo.test.mjs`; Rich-Results-Test für beide Produktseiten ohne Fehler (manuell, Screenshot in `docs/SEO.md`) |
| S3 | Kein `FAQPage`/`HowTo`-Schema; `Review`/`AggregateRating` nur mit echten Daten | `seo.mjs` |
| S4 | Alle alten URLs (Tabelle Phase 1 C + Search-Console-Export) liefern 301 → Ziel 200 in genau einem Sprung, Query-Varianten eingeschlossen | `seo.mjs --redirects` gegen den Produktions-Build |
| S5 | Die Sitemap enthält genau die indexierbaren Seiten, alle mit `/`; `lastmod` nur dort, wo ein belegtes Datum vorliegt (Shopify `updatedAt`, Ratgeber `dateModified`), sonst weggelassen; `robots.txt` verweist auf die Sitemap und sperrt `/api/` und `/anfrage/` | `seo.mjs` |
| S6 | Ohne `SITE_INDEXABLE=1` bleibt alles `noindex` (unverändert) | bestehender Test/Build |
| S7 | Kein Skript setzt Cookies oder schreibt Speicher ohne Einwilligung. Einzige Ausnahme ist der Warenkorb (§ 25 Abs. 2 Nr. 2 TDDDG, unbedingt erforderlich): Er schreibt `localStorage` erst nach „In den Warenkorb“. Keine Drittanbieter-Anfrage außer Shopify (CSP unverändert streng, wie M7) | `seo.mjs`/Headless-Chrome: nach dem Laden ohne Interaktion `document.cookie`, `localStorage` und `sessionStorage` leer; Netzwerk nur `self`, Store-Domain und `cdn.shopify.com` |
| S8 | Jedes inhaltliche Bild hat ein `alt` (dekorative Bilder `alt=""`); `og:image` 1200 × 630 je Seite; Favicon-Satz PNG 48/96/192 und `apple-touch-icon` | `seo.mjs` |
| S9 | Core Web Vitals mobil im Labor: LCP < 2,5 s, CLS < 0,1, TBT < 200 ms auf Start- und Produktseite | `tools/qa/perf.mjs` am Build |
| S10 | Kein Text mit Gesundheitsbezug; Ratgeber und Produkttexte nur mit Aussagen aus PRODUCT-TRUTH oder mit Quelle | Wortliste in `seo.mjs` (Wirkung, heilt, gesund, Antioxid…, Stimmung …) + Freigabe des Kunden je Text |
| S11 | `npm test` und `npm run build` grün | wie M4 |

## Entscheidungen (vom Nutzer am 16.10.2026)

| Nr | Frage | Entscheidung |
|---|---|---|
| 1 | `h1` der Startseite um „Safran aus Herat“ ergänzen (Ausnahme zu D4) | **Ja, als Augenbraue in der `h1`**. „The Art of Saffron.“ bleibt wörtlich sichtbar. Umsetzung in der SEO-Folgetransaktion zu B |
| 2 | Messung | **Nur Server-Logs**, keine JS-Analytics. Dem Nutzer ist der Datenschutz für sich und die Kunden seiner Kunden sehr wichtig; keine Verwertung von Besucherdaten. Umgang mit IP-Adressen in den Logs siehe Leitplanke 4 |
| 3 | Hosting (V6) | **Node-Laufzeit mit `server.mjs`, Anbieter offen** (Kunde). Die 301 laufen in `server.mjs` (T-06). Rebuild bei Preisänderung per Webhook-Endpunkt oder nächtlichem Build, sobald der Anbieter feststeht |
| 4 | SEO-Ergänzungen für die laufenden A–D | **Folgetransaktionen**: A–D (T-20261015-03 bis -07) laufen unverändert zu Ende. Danach ergänzt je eine SEO-Transaktion dieselben Dateien, nacheinander, mit den Kriterien S1–S11 |

## S0: zwei Transaktionen (vom Nutzer am 16.10.2026 freigegeben)

Aufgeteilt, damit jeder Agent deutlich unter 150k Tokens bleibt. Die Schreibmengen sind disjunkt, untereinander und zu A–D.

**T-20261016-01 · S0a Schema und Doku**: `src/lib/seo/schema.ts`, `tests/seo-schema.test.mjs`, `docs/SEO.md`

| Nr | Kriterium |
|---|---|
| A1 | Builder als reine Funktionen für `Organization`/`OnlineStore`, `WebSite`, `BreadcrumbList`, `Product`+`Offer`, `Article`, `Recipe`, `Service`. Daten als Parameter, NAP über einen Adapter aus `site.ts`. Keine Builder für `FAQPage`, `HowTo`, `Review` oder `AggregateRating`. Relative `.ts`-Importe wie in `src/lib/commerce` |
| A2 | Tests der Pflichtfelder je Builder. Ein `Offer` nur bei Preis > 0, mit `EUR`, `availability` als schema.org-URL, `itemCondition`, `sku` = `mpn`, `brand`, ohne GTIN. `WebSite.name` = „Royal Spices“. NAP gleich `site.ts`. Breadcrumbs mit Positionen 1…n und absoluten URLs mit `/`. `Service` mit `areaServed` Hamburg |
| A3 | `npm test` grün (bisherige und neue Tests); Typprüfung von `schema.ts` ohne Fehler |
| A4 | `docs/SEO.md`: Keyword-Karte (Cluster → Zielseite), Soll-Weiterleitungen mit Abgleich zum Stand von T-06 (Abweichungen markiert), Status S1–S11, Quellen |

**T-20261016-02 · S0b Prüfwerkzeuge**: `tools/qa/seo.mjs`, `tools/seo/{checks.mjs,indexnow.mjs,legacy-urls.txt}`, `tests/seo-checks.test.mjs`

| Nr | Kriterium |
|---|---|
| B1 | `seo.mjs <url>` prüft S1, S2, S3, S5, S6, S7, S8, S10 und erkennt den Launch-Schalter. Es schreibt einen Bericht als Text und JSON (`--out`) und endet bei Fehlern mit Exit-Code 1. Es läuft gegen den heutigen Build ohne Absturz; die Befunde werden nur gemeldet, nicht behoben |
| B2 | `--redirects`: alle alten URLs aus `legacy-urls.txt` (Live-Abzug, Plantabelle, Varianten) → 301, genau ein Sprung, Ziel 200 |
| B3 | Tests der Prüffunktionen an Beispiel-HTML: Ein gutes Beispiel ergibt 0 Fehler, je Regel ergibt ein schlechtes Beispiel genau den erwarteten Fehler. Weiterleitungslogik gegen einen lokalen Testserver, kein Netz |
| B4 | `indexnow.mjs`: Standard ist ein Probelauf. Gesendet wird nur mit `--send` und `INDEXNOW_KEY`, `--write-key <dir>` schreibt die Schlüsseldatei, nur URLs des eigenen Hosts |

Für beide gilt: keine neuen Abhängigkeiten, die Suche nach Schlüsselmustern (M5) bleibt leer, geschrieben wird nur im Staging. Vor der Übernahme prüft der Hauptchat `npm test` und `npm run build` in einer Kopie des Projekts.

## Wiedereinstieg (Stand 17.10.2026, nach SEO-C)

**Alle SEO-Folgetransaktionen sind übernommen** (mit Go des Nutzers): -03 SEO-R, -04 SEO-D, -05 SEO-A, -06 SEO-B, -07 SEO-C. Danach ebenfalls übernommen: -08 S9 TBT (Hauptchat, siehe Schritt 3). Keine Transaktion ist `OFFEN`. Prüfnotizen: `_agent/staging/T-20261017-0{3..8}/PRUEFUNG.md`.

**Stand im Projekt:** `npm test` 105/105. `seo.mjs --redirects` (ohne Store, vor dem Launch): 13 Seiten, **1 Fehler** (S10 → E6, Kunde), 2 Hinweise (die absichtlichen 404). S1, S2, S3, S8 ohne Befund; Status je Kriterium in `docs/SEO.md`, Abschnitt 4.

Vom Nutzer am 17.10. entschieden: Meta `/produkte/` und alle SEO-C-Titel und -Beschreibungen (E5, jeweils die Vorschläge); die Augenbraue in der `h1` der Startseite darf auf dem Handy zweizeilig umbrechen.

### Nächste Schritte (je eine kleine Transaktion, nach Freigabe)

1. **E6 / S10**, sobald der Kunde über „Kleine Menge. Große Wirkung.“ geurteilt hat: Text in `src/components/home/HomeCollection.astro` ändern oder die Wendung in `HEALTH_ALLOW` in `tools/seo/checks.mjs` aufnehmen, mit Test.
2. **E7**, nach der Bestätigung durch den Kunden (V3: frei ab 50 € in DE, Widerruf): `shipping` und `returnPolicy` an `buildOrganization` in `src/pages/index.astro` übergeben.
3. ~~**S9 TBT**~~ **erledigt 17.10. (T-20261017-08):** `tools/qa/perf.mjs` misst TBT über Long Tasks. Labor mobil 0 ms auf allen drei Seiten, S9 im Labor erfüllt. Beim Launch-Lauf den LCP der Produktseite mobil im Blick behalten (ein Ausreißer mit 3084 ms, sonst ≤ 1,5 s).
4. **Launch-Lauf** mit echtem Store und `SITE_INDEXABLE=1`: `seo.mjs --store --redirects` (braucht Zugangsdaten, läuft beim Launch bzw. durch den Nutzer). Dabei die echten Shopify-Bilder prüfen: Ein 0,5-g-Bild ab 1200 × 630 wird automatisch `og:image`.
5. Optional: `logo` im `OnlineStore`-Schema (z. B. ein quadratisches PNG ≥ 112 px), nicht Teil des freigegebenen Plans.

**Prüfkopie für spätere Messungen:** wie in den Lehren unten (robocopy nach C:, Junction auf `node_modules`, am Ende `cmd /c rmdir`). Für den Server einen Eintrag in `E:\royal-spices\.claude\launch.json` mit `node <copy>/server.mjs`, `env.PORT` 4392 anlegen und mit `preview_start` starten; den Eintrag danach wieder entfernen. Die Prüfkopie dieser Sitzung hat keine Junction mehr.

## Wiedereinstieg (Stand 17.10.2026, nach SEO-B)

> Überholt durch den Abschnitt „Wiedereinstieg (Stand 17.10.2026, nach SEO-C)“ oben; die Lehren unten gelten weiter.

**Übernommen am 17.10. (mit Go des Nutzers):** T-20261017-05 SEO-A und -06 SEO-B. Prüfnotizen: `_agent/staging/T-20261017-0{5,6}/PRUEFUNG.md`. Im Projekt `npm test` 105/105; `seo.mjs --redirects` 13 Seiten, **1 Fehler** (S10 → E6, Kunde), 11 Hinweise (9 × S1 → SEO-C, 2 × absichtliche 404).
- SEO-A: Meta `/produkte/` vom Nutzer freigegeben (134 Zeichen). Nachbesserung im Hauptchat: Das Shopify-CDN skaliert nicht hoch, deshalb `og:image` nur ab Quelle 1200 × 630, sonst `og.jpg` (heute: 1 g Zuschnitt, 0,5 g `og.jpg`).
- SEO-B: Der Nutzer hat entschieden, dass die Augenbraue in der `h1` auf dem Handy zweizeilig umbrechen darf (375 px: +19 px).

**Offen: T-20261017-07 SEO-C** (Subagent, Auftrag `_agent/staging/T-20261017-07/AUFTRAG.md`, am 17.10. gestartet). Weiter so:
1. `ERGEBNIS.md` gegen C1–C5 prüfen, Diff lesen (nur Brotkrumen, Import, `schema`, `title`, `description`).
2. In der Prüfkopie `out/` darüberlegen, `npm run build`, Server, `seo.mjs --redirects` (Ziel: S1 ohne Hinweise, S2/S3 0 Fehler, nur S10 bleibt), Browser 1440/375 auf je einer Seite mit eigenem `.page-head` (Datenschutz, Impressum) und auf `/catering/`.
3. Vorschlagstabelle der Titel und Beschreibungen dem Nutzer zur Freigabe vorlegen (E5), dann Go einholen, Backup, übernehmen, `npm test`.
4. `docs/SEO.md` (Abschnitte 4 und 6), `STATUS.md`, LOG nachziehen.

**Prüfkopie dieser Sitzung:** `C:\Users\lukas\AppData\Local\Temp\claude\E--royal-spices\2ee5ca2f-7695-4a61-bece-a94737703473\scratchpad\SEO-pruef` (Stand Projekt nach SEO-B, Junction auf `node_modules`). Am Ende: `cmd /c rmdir <copy>\node_modules`. Den Server startet `preview_start` mit dem Eintrag `seo-pruef` in `E:\royal-spices\.claude\launch.json` (Port 4392); bei einer neuen Prüfkopie den Pfad dort anpassen.

Lehren aus SEO-A/B:
- Build mit Fixture-Store: `node --import file:///E:/royal-spices/_agent/staging/T-20261016-03/hilfsskripte/fake-storefront.mjs node_modules/astro/bin/astro.mjs build` mit `PUBLIC_SHOPIFY_STORE_DOMAIN=example.myshopify.com`, `PUBLIC_SHOPIFY_STOREFRONT_TOKEN=public-token`, `PUBLIC_SHOPIFY_API_VERSION=2026-07`. Danach `seo.mjs --store --no-browser`; der Fehler „Product ohne sku“ auf `/produkte/unbekannt-test/` ist gewollt (Testprodukt des Preloads).
- Fremde `og:image` misst `seo.mjs` nicht: CDN-URL abrufen und mit sharp die Maße lesen.
- Startseite im Browser: Die Journey springt beim Scrollen zu den Kapiteln. Messen und Screenshots direkt nach `navigate`, nicht nach `scrollTo`.
- Doku-Skripte mit node: Zeilenumbrüche im Skript als `String.fromCharCode(10)` statt Escape in verschachtelten Anführungszeichen.

## Wiedereinstieg (Stand 17.10.2026, nach SEO-D)

> Überholt durch den Abschnitt „Wiedereinstieg (Stand 17.10.2026, nach SEO-B)“ oben.

**Freigegeben und vergeben (17.10.):** Plan SEO-R/D/A/B/C, E5–E7 und der Vorschlag zur `h1`. IDs: -03 SEO-R und -04 SEO-D sind **übernommen**. **-05 SEO-A, -06 SEO-B und -07 SEO-C** stehen im LOG als `OFFEN`. Sie sind reserviert, ihre Staging-Ordner sind leer, gestartet ist noch nichts. Es geht nacheinander weiter, A → B → C (Entscheidung 4). Die Freigabe muss nicht erneut geklärt werden. Vor jedem Kopieren ins Projekt holt der Hauptchat das Go des Nutzers ein.

**Stand im Projekt:**
- `npm test` 100/100.
- `seo.mjs --redirects` meldet 13 Seiten, 2 Fehler (S2 `WebSite` → SEO-B, S10 → E6) und 12 Hinweise (10 × S1 → A/C, 2 × absichtliche 404).
- Einzelheiten stehen in `docs/SEO.md`, Abschnitt 4. Prüfnotizen liegen in `_agent/staging/T-20261017-0{3,4}/PRUEFUNG.md`.

**Was SEO-D bereitstellt** (Einbindung siehe `docs/SEO.md`, Abschnitt 3):
- `Base.astro`: Props `ogType` und `ogImage` (String oder `{ src, width?, height? }`).
- `src/components/Breadcrumbs.astro` mit `items`: Start → … → aktuelle Seite. Die Komponente gibt Navigation und JSON-LD selbst aus.

### Nächste Schritte

1. **SEO-A (T-20261017-05), Subagent schreibt den Code.** Schreibmenge: `src/lib/commerce/catalog.ts`, `src/pages/produkte/{index,[handle]}.astro`, `tests/commerce.test.mjs`.
   - `CatalogProduct.sku` kommt aus `firstVariant.sku`, ohne Store `null`. Storefront-Abfrage, Typen und Fixtures haben die SKU schon (`RS-SAF-HN-1G`, `RS-SAF-HN-05`).
   - `[handle].astro`:
     - `buildProduct` ersetzt `productSchema` und `ld()` (Z. 30–57), dabei Kategorie, Herkunft und Gewicht wie bisher.
     - `<Breadcrumbs>` (Start / Safran / Titel) ersetzt die eigene Navigation (Z. 71–73) und das CSS `.crumbs a` (Z. 129–133).
     - `ogType="product"`.
     - Mit Shopify-Bild ist `ogImage` = `{ src: <url>&width=1200&height=630&crop=center, width: 1200, height: 630 }`. Die URL hat schon `?v=`, also mit `&` anhängen, und in der Prüfung abrufen. Ohne Bild bleibt `og.jpg`.
   - `/produkte/`: Brotkrumen (Start / Safran) und eine Meta-Beschreibung mit höchstens 160 Zeichen als Vorschlag (E5). Der sichtbare Lead bleibt wörtlich.
   - Die Zuordnung Produkt → `ProductInput` am besten als reine Funktion, damit sie mit den Fixtures testbar ist (`sku` = `mpn`, `itemCondition`, Preis mit 2 Nachkommastellen, kein Offer ohne Preis).
   - **Prüfung:** Zusätzlich zum Build ohne Store einen Build mit Fixture-Store, Preload `_agent/staging/T-20261016-03/hilfsskripte/fake-storefront.mjs`, Aufruf im Kopfkommentar. Dort `og:image` 1200 × 630 mit Maßen, `Offer` und `sku` im HTML.
2. **SEO-B (-06), Hauptchat.** Schreibmenge: `src/pages/index.astro`, `src/components/home/HomeJourney.astro`.
   - `buildOrganization({ origin: Astro.site })` (OnlineStore, ohne Versand und Rückgabe, E7) und `buildWebSite` ersetzen das Inline-Schema (Z. ~32–45, Telefon von Hand).
   - `HomeJourney.astro` Z. 74–75: Die Augenbraue `<p class="eyebrow">` wird zu `<span class="eyebrow">ROYAL SPICES · SAFRAN AUS HERAT, AFGHANISTAN</span>` als erstes Kind der `h1`, als Block dargestellt.
   - Die Selektoren `.journey__intro .eyebrow` (Z. ~259, ~387) müssen weiter greifen. Schriftgröße und Abstände des `span` per `getComputedStyle` vorher und nachher vergleichen, bei 375 und 1440 px.
3. **SEO-C (-07), Subagent schreibt den Code.** Schreibmenge: die 9 Seiten.
   - `buildService` auf `/catering/` (`areaServed` Hamburg).
   - `<Breadcrumbs>` (Start / Seite) im `page-head` jeder Seite.
   - Titel und Beschreibungen in S1-Länge als Vorschlagstabelle in `ERGEBNIS.md`, freigegeben vom Nutzer vor dem Go (E5). Die Zielwerte stehen in `docs/SEO.md` S1.
   - Wird es fürs Budget zu groß, in zwei Seitengruppen nacheinander aufteilen.
4. **Nach jeder Übernahme:** `docs/SEO.md` Abschnitt 4 (Nachmessung) und 6, `STATUS.md` und LOG nachziehen.
5. **Später:**
   - E6, sobald der Kunde geurteilt hat: eine kleine Transaktion, entweder Text in `HomeCollection.astro:48` oder `HEALTH_ALLOW` in `tools/seo/checks.mjs` mit Test.
   - E7 nach der Bestätigung durch den Kunden: `shipping`/`returnPolicy` in `buildOrganization`.
   - TBT für S9: `perf.mjs` misst ihn nicht.

### Lehren aus SEO-R und SEO-D

- **Prüfkopie:**
  - Eigene Kopie auf C: anlegen: `robocopy E:\royal-spices\royal-spices-v1 <scratchpad>\SEO-pruef /E /XD node_modules dist dist-pages .raw .astro .data assets-src __pycache__`.
  - Dann `out/` der Transaktion darüberlegen und die Junction setzen: `New-Item -ItemType Junction -Path <copy>\node_modules -Target E:\royal-spices\royal-spices-v1\node_modules`.
  - Am Ende **`cmd /c rmdir <copy>\node_modules`**. Die Kopie vom 17.10. (Sitzung 5e37d1ea…) hat keine Junction mehr.
- **Server stoppen:** `server.mjs` im Hintergrund lässt sich mit `Get-NetTCPConnection -LocalPort 4392 -State Listen` und `Stop-Process` beenden. Die Meldung „exit code 127“ danach ist normal.
- **CRLF:** Einige Doku-Dateien (z. B. `LIVE-INVENTAR.md`) haben CRLF. `sed -i` aus Git Bash macht daraus LF, und der Diff zeigt dann alle Zeilen. Solche Dateien mit node bearbeiten (lesen, `replace`, schreiben) und mit `file` prüfen.
- **Browserbereich:**
  - Ist das App-Fenster verdeckt, liefert er `innerWidth 0`, das Layout bricht um, und Screenshots laufen in einen Timeout. Vor Messungen `resize_window` mit fester Größe setzen und danach auf `desktop` zurückstellen.
  - Optische Vergleiche über `getComputedStyle` und Rechtecke. Für Screenshots den Nutzer bitten, das Fenster nach vorn zu holen.
- **Budget:** Der SEO-D-Subagent brauchte mit einem vollständigen `AUFTRAG.md` (Vorgaben, Eingaben mit Zeilen, ohne Build) 97k Tokens. Aufträge für A und C genauso schneiden.

## Wiedereinstieg (Stand 17.10.2026, nach S0)

> Überholt durch den Abschnitt „Wiedereinstieg (Stand 17.10.2026, nach SEO-D)“ oben; Freigabe und IDs siehe dort.

**S0 ist abgeschlossen.** T-20261017-01 (S0a) und T-20261017-02 (S0b) sind geprüft und mit Go des Nutzers übernommen. Stand im LOG, Prüfnotizen in `_agent/staging/<ID>/PRUEFUNG.md`. Im Projekt läuft `npm test` mit 94/94 grün. Die erste Messung mit `seo.mjs` steht als Status S1–S11 in `docs/SEO.md`, Abschnitt 4. Der Abschnitt vom 16.10. weiter unten ist damit erledigt.

Offen im neuen Chat:
1. Den Entwurf unten prüfen, IDs vergeben und dem Nutzer zur Freigabe vorlegen, zusammen mit den Entscheidungen E5–E7.
2. Nach der Freigabe die Transaktionen nacheinander starten (Entscheidung 4).

Lehren aus S0:
- **Budget:** S0b brauchte 185k Tokens (über der Grenze), S0a 148k. Code, Tests, Lauf gegen den Build und Browser sind zusammen zu viel für einen Subagent. Künftig schreibt der Subagent Code und Tests. Build, `seo.mjs`-Lauf und Browserprüfung macht der Hauptchat bei der PRÜFUNG.
- **Edit/Write-Werkzeug:** Es wandelt die JSON-Escape-Folge für `<` (Backslash, „u003c“) beim Schreiben in `<`. Wer sie in eine Datei schreiben muss, setzt sie per Skript aus Teilen zusammen und prüft danach mit grep.
- **tsc:** Mit Dateiangabe braucht `tsc` unter TypeScript 6 `--ignoreConfig`, sonst bricht es mit TS5112 ab.
- **Messlauf:** Eigene Kopie auf C: (robocopy wie in den S0-Aufträgen, Junction auf `node_modules`, am Ende nur mit `cmd /c rmdir` entfernen). Dort `npm run build`, dann `PORT=4392 node server.mjs` und `node tools/qa/seo.mjs http://127.0.0.1:4392 --cdp-port 9354 [--redirects] --out <dir>`. Danach Server beenden.

## SEO-Folgetransaktionen zu A–D (Entwurf 17.10.2026, freigegeben am 17.10.)

> **Freigabe 17.10.2026:** Plan, E5–E7 und der Vorschlag zur `h1` sind freigegeben, Präzisierungen nach der Codeprüfung siehe `_agent/LOG.md` (Zeilen T-20261017-03 bis -07): SEO-R = **T-20261017-03** (übernommen), SEO-D = **-04**, SEO-A = **-05**, SEO-B = **-06**, SEO-C = **-07**. Präzisiert: `Breadcrumbs.astro` gibt Navigation und JSON-LD selbst aus (keine Base-Prop); SEO-A schreibt nur `catalog.ts`, `produkte/{index,[handle]}.astro`, `tests/commerce.test.mjs` (SKU ist in Storefront und Fixtures schon da); SEO-B zieht die vorhandene Augenbraue als `<span>` in die `h1` („ROYAL SPICES · SAFRAN AUS HERAT, AFGHANISTAN“); S10 steht in `HomeCollection.astro` und folgt nach dem Urteil des Kunden als kleine eigene Transaktion.

Die Reihenfolge folgt Entscheidung 4, also nacheinander. D kommt zuerst, weil A–C die neuen Props und die Brotkrumen-Komponente aus `Base.astro` nutzen. Am 17.10. ist keine Transaktion `OFFEN`, die Schreibmengen kollidieren also nicht.

| Kürzel | Inhalt | Schreibt | Abnahme (Auszug) | Ausführung |
|---|---|---|---|---|
| SEO-R | `/collections/frontpage` → `/produkte/` | `src/config/redirects.mjs`, `tests/redirects.test.mjs`, `tools/seo/legacy-urls.txt` (Kommentar „bekannter Befund“ entfernen) | `seo.mjs --redirects`: 33 von 35 korrekt, nur die 2 absichtlichen 404 als Hinweis; `npm test` grün | Hauptchat (klein) |
| SEO-D | Rahmen: `Base.astro` rendert JSON-LD mit `serializeJsonLd`, Props `ogType` sowie `ogImage` mit Maßen (Breite und Höhe nur, wenn bekannt), `robots` mit `max-image-preview:large` bei indexierbaren Seiten, Favicon-Links. Neue Komponente `Breadcrumbs.astro` (sichtbar und mit `buildBreadcrumbList`). PNG-Favicons aus `favicon.svg` per sharp (vorhanden) | `src/layouts/Base.astro`, `src/components/Breadcrumbs.astro` (neu), `public/{favicon-48.png,favicon-96.png,favicon-192.png,apple-touch-icon.png}` (neu), `pipeline/images/build-favicons.mjs` (neu) | S8-Favicon 0 Fehler; JSON-LD parst wie bisher; Seiten ohne Brotkrumen unverändert; `npm test` und Build grün | Subagent (Code), Hauptchat (Build, `seo.mjs`, danach S9 mit `perf.mjs`) |
| SEO-A | Produkte: SKU (`firstVariant.sku`) in den Katalog. Produktseite mit `buildProduct` (ersetzt das Inline-Schema samt `ld()`), Brotkrumen, `og:type=product`, `og:image` 1200 × 630 (Zuschnitt über das Shopify-CDN oder `og.jpg`). `/produkte/` mit Brotkrumen und Beschreibung ≤ 160 Zeichen | `src/lib/commerce/{storefront,types,catalog}.ts`, `src/pages/produkte/**`, `tests/commerce.test.mjs`, `tests/fixtures/**` | S2 mit Fixtures (`sku` = `mpn`, `itemCondition`, Preis = sichtbarer Preis), S8 `og:image`, S1 für `/produkte/` | Subagent (Code), Hauptchat (Prüfung) |
| SEO-B | Startseite: `buildOrganization` (ersetzt das Inline-Schema mit der Telefonnummer von Hand) und `buildWebSite`. `h1` mit der Augenbraue „Safran aus Herat“, „The Art of Saffron.“ bleibt sichtbar (Entscheidung 1) | `src/pages/index.astro`, `src/components/home/HomeJourney.astro` | S2 auf der Startseite 0 Fehler; genau eine `h1`; Journey optisch unverändert (Screenshots 375 und 1440 px) | Hauptchat oder kleiner Subagent |
| SEO-C | Seiten: `buildService` auf `/catering/` (`areaServed` Hamburg), Brotkrumen auf allen Unterseiten, Titel und Beschreibungen auf S1-Länge (E5) | `src/pages/{b2b,catering,datenschutz,faq,herkunft-qualitaet,impressum,kontakt,ueber-uns,versand-lieferung}.astro` | S1 ohne Hinweise, S2 und S3 0 Fehler | Subagent (Code), Hauptchat (Prüfung) |

Abweichungen vom Hinweis vom 16.10. (Schritt 4 unten):
- Die `h1` der Startseite steht in `HomeJourney.astro`, also in der Schreibmenge von B. Sie kommt deshalb in SEO-B, wie es Entscheidung 1 vorsieht, und nicht in SEO-D.
- Weiterleitungen für `/agb/`, `/widerruf/` und `/ratgeber/` kommen erst, wenn es die Seiten gibt, sonst entstünde 301 → 404.
- `astro.config.mjs` bleibt unverändert. S5 erlaubt eine Sitemap ohne `lastmod`. Ein echtes `lastmod` bräuchte Shopifys `updatedAt` schon in der Konfiguration und kann später folgen.

Entscheidungen für die Freigabe (Vorschläge):
- **E5 Meta-Titel und -Beschreibungen (S1):** Die heutigen Texte stammen teils aus dem Live-Shop (D4). Vorschlag: SEO-A und SEO-C schlagen Texte in S1-Länge vor, der Nutzer gibt sie frei. Der sichtbare Seitentext bleibt wörtlich.
- **E6 S10 „Kleine Menge. Große Wirkung.“ (Startseite, Live-Text):** Darüber urteilt der Kunde. Einschätzung: Im Kontext (Ergiebigkeit, Farbe, Aroma) ist es eher keine Gesundheitsaussage, nach Leitplanke 2 entscheidet aber der Kunde. Danach wird entweder der Text geändert oder die Wendung in `HEALTH_ALLOW` in `tools/seo/checks.mjs` aufgenommen.
- **E7 Versand und Rückgabe im `OnlineStore`-Schema:** Sie kommen erst dazu, wenn der Kunde Versand (V3: frei ab 50 € in DE) und Widerruf bestätigt hat. Bis dahin lässt SEO-B sie weg.
- **Hinweis:** Der Lauf mit Store (`--store`: Preisprüfung S2, S7 mit Shopify-Anfragen) braucht Zugangsdaten. Er läuft erst beim Launch bzw. durch den Nutzer.

## Wiedereinstieg im neuen Chat (Stand 16.10.2026, nach der Freigabe)

Der Chat vom 16.10. wurde wegen des Budgets beendet, während S0a und S0b noch liefen. Die Entscheidungen 1–4, S1–S11 und S0 sind freigegeben, das muss nicht erneut geklärt werden.

> **17.10.2026, Stand beim Chatwechsel:** T-20261016-01 und -02 waren ohne Ergebnis gestoppt (im LOG `VERWORFEN`). S0 läuft neu als **T-20261017-01** (S0a, Kriterien A1–A5) und **T-20261017-02** (S0b, B1–B5). Die Aufträge liegen in `_agent/staging/<ID>/AUFTRAG.md`. A5 und B5 fassen den Absatz „Für beide gilt“ zusammen.
>
> Beide Agents laufen im Hintergrund der alten Sitzung („Projekt-Check, SEO S0 neu gestartet“). **Diese Sitzung nicht stoppen, bevor beide fertig sind:** So ging S0 am 16.10. verloren. Die alte Sitzung meldet dem neuen Chat, wenn die Agents fertig sind.
>
> Im neuen Chat:
> 1. Prüfen, ob `ERGEBNIS.md` beider IDs vorliegt.
>    - Fehlt eine: `STAND.md` ansehen. Läuft die alte Sitzung noch, warten und nichts neu starten.
>    - Läuft sie nicht mehr: den Auftrag unter derselben ID neu starten, mit dem Zusatz „Zwischenstand in `out/` prüfen und fortsetzen“.
> 2. Danach weiter mit Schritt 2 (PRÜFEN) und 3 (COMMIT) unten, mit A1–A5 bzw. B1–B5 aus den Aufträgen.
> 3. Die Arbeitskopien der Agents liegen unter `C:\Users\lukas\AppData\Local\Temp\claude\E--royal-spices\8c6d6e58-e7e7-4d76-adaa-4efe48c3cfff\scratchpad\<ID>-work`. Für die eigene Prüfung eine eigene Kopie anlegen.
>
> Die Doku-Unstimmigkeiten nach Shopify A–D (STATUS, UEBERGABE-SHOPIFY, LOG) sind am 17.10. nachgezogen.

1. **Stand prüfen:** Gibt es `_agent/staging/T-20261016-01/ERGEBNIS.md` und `…-02/ERGEBNIS.md`?
   - Fehlt eine davon, zuerst nachsehen, ob der alte Chat (Sitzung „SEO-Masterplan Wiedereinstieg“) noch arbeitet.
   - Läuft dort nichts mehr: Auftrag neu starten, mit „Zwischenstand in `out/` und `work/` prüfen und fortsetzen“.
   - Den Auftrag rekonstruiert man aus der Tabelle im Abschnitt „S0“ oben und den Details unten.
2. **PRÜFEN** gegen A1–A5 bzw. B1–B5:
   - Dateien in `out/` lesen (ausschnittsweise), dazu die Testausgaben in `ERGEBNIS.md`.
   - Selbst in einer Scratch-Kopie des Projekts (nicht in H:) beide Dateigruppen einsetzen und `npm test` sowie `npm run build` laufen lassen. `npm test` braucht `node_modules`, denn `tests/inquiry.test.mjs` importiert `astro/zod`.
   - Eine Junction auf `node_modules` nur mit `cmd /c rmdir` entfernen, nie rekursiv löschen.
3. **COMMIT:** Alle Zieldateien sind neu, ein Backup ist nicht nötig. Vorher prüfen, dass keine davon im Projekt existiert. Danach den Status in `_agent/LOG.md` auf `ÜBERNOMMEN` setzen, sonst `VERWORFEN` mit Grund.
4. **Danach:**
   - Die Befunde von `seo.mjs` gegen den heutigen Build in den Status S1–S11 in `docs/SEO.md` eintragen.
   - Die SEO-Folgetransaktionen zu A–D planen, sobald T-20261015-03 bis -07 übernommen sind (`_agent/LOG.md`). Die Rahmenänderungen in `Base.astro` und `astro.config.mjs` laufen als eigene Transaktion zu D, weil sie in keiner Schreibmenge von A–D stehen. Dort auch die `h1` der Startseite (Entscheidung 1) und die neuen Weiterleitungen für `/agb/`, `/widerruf/` und `/ratgeber/` umsetzen.

**Auftragsdetails S0** (wie gestartet):
- **Ablage:** Ergebnisdateien unter `staging/<ID>/out/<Pfad relativ zu royal-spices-v1>`, Arbeitskopie `work/` ohne `node_modules` und ohne Verknüpfungen.
- **Typprüfung S0a:** mit dem `tsc` des Projekts per Pfad, mit `--strict --module preserve --moduleResolution bundler --allowImportingTsExtensions --verbatimModuleSyntax --isolatedModules --erasableSyntaxOnly`.
- **Lauf S0b gegen den heutigen Build:** `PORT=4391 node server.mjs` im Projekt, das nur `dist/` vom 07.10. liest. Chrome läuft über CDP-Port 9353. Berichte nach `staging/T-20261016-02/report/`.
- **Schnittstellen S0b:**
  - `seo.mjs <base-url> [--origin] [--store] [--redirects] [--out]`
  - `legacy-urls.txt` im Format `<alter Pfad>[ <Ziel>]`
  - `indexnow.mjs`: Schlüssel nur aus `INDEXNOW_KEY`, Standard ist ein Probelauf.
  - Die Testbeispiele liegen nicht unter `tests/fixtures/`, denn das gehört T-03.

**Parallel:** Die Sitzung „SEO Phase 0: Kundenanleitungen V1–V6“ schreibt nur `docs/SEO-PHASE0-KUNDE.md` und eine Zeile in `_agent/LOG.md`. Ergebnis prüfen und dem Nutzer zeigen.

`H:\royal-spices` ist kein Git-Repo. Isoliert wird über Staging-Transaktionen (`CLAUDE.md`), ein eigener Worktree ist nicht nötig.

## Umsetzung und Budget

- Die Umsetzung läuft im neuen Chat vom 16.10. Dieser Plan liegt als `royal-spices-v1/docs/UEBERGABE-SEO.md` im Projekt, mit je einer Zeile in `_agent/LOG.md` und `STATUS.md`. Dann folgen S0 und die SEO-Ergänzungen zu A–D (offene Entscheidung 4).
- Schreibmenge S0: `src/lib/seo/**`, `tools/qa/seo.mjs`, `tools/seo/**`, `tests/seo.test.mjs`, `docs/SEO.md`. Sie kollidiert nicht mit T-20261015-03 bis -07 (A–D) und nicht mit der Blender-Arbeit in `pipeline/blender/`. `src/config/site.ts` (T-07) und `src/config/redirects.mjs` (T-06) liest S0 nur.
- Wiederverwenden:
  - `tools/qa/browser.mjs` (Headless Chrome) und `tools/qa/perf.mjs`.
  - `Picture.astro` und `src/data/stills.json` für Bilder.
  - Der Schalter `indexable` in `src/config/launch.ts`.
  - `site` in `src/config/site.ts` als einzige Quelle für NAP und Schema.

## Verifikation

1. `npm test` (inkl. neuem `tests/seo.test.mjs`).
2. `npm run build` mit und ohne `SITE_INDEXABLE=1`. `npm start`, dann `node tools/qa/seo.mjs http://127.0.0.1:4322`, inklusive `--redirects`. Erwartung: 0 Fehler.
3. `node tools/qa/perf.mjs http://127.0.0.1:4322 final`, ohne laufendes Blender.
4. Nach dem Launch: Rich-Results-Test und URL-Prüfung in Search Console, Diagnose im Merchant Center. Ergebnisse mit Datum in `docs/SEO.md`.

## Quellen (Auswahl)

- Google, Händlereinträge: https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- Google, Versandrichtlinie (Organisationsebene): https://developers.google.com/search/docs/appearance/structured-data/shipping-policy
- Google, Updates (FAQ-Rich-Results eingestellt 05/2026): https://developers.google.com/search/updates
- Google, Umzug mit URL-Änderungen: https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- Google, AI-Optimierung, `llms.txt` unnötig: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google, Websitenamen: https://developers.google.com/search/docs/appearance/site-names
- Merchant Center, Produkte von der Website: https://support.google.com/merchants/answer/12158480
- Shopify, headless Traffic umleiten: https://shopify.dev/docs/storefronts/headless/hydrogen/migrate/redirect-traffic
- Shopify, URL-Weiterleitungen: https://help.shopify.com/en/manual/online-store/menus-and-links/url-redirect
- Shopify Community, Merchant-Feed-Problem headless: https://community.shopify.com/t/google-merchant-center-feed-issue-with-api-headless-site-and-domain-claim/254401
- EuGH C-386/23 (Safran, HCVO): https://www.otto-schmidt.de/news/wirtschaftsrecht/die-werbung-mit-gesundheitsbezogenen-angaben-uber-pflanzliche-stoffe-ist-derzeit-verboten-2025-05-06.html
- EU-Kontrollplan Safran: https://ec.europa.eu/newsroom/sante/items/727969/en
- Wettbewerb (Orient Kontor): https://orient-kontor.com/wo-safran-kaufen/
- SE Ranking, `llms.txt`: https://www.searchenginejournal.com/llms-txt-shows-no-clear-effect-on-ai-citations-based-on-300k-domains/561542/
- Ahrefs: https://ahrefs.com/blog/how-to-rank-on-chatgpt
