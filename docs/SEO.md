# SEO – lebende Doku

Stand 17.10.2026 (angelegt in T-20261017-01, SEO S0a). Der Plan steht in `docs/UEBERGABE-SEO.md`. Diese Datei hält fest, was davon gilt, wo es steht und wie weit es umgesetzt ist. Sie wird bei jeder SEO-Transaktion und im Monatsbericht (Plan, Phase 5) fortgeschrieben.

Inhalt: Keyword-Karte · Soll-Weiterleitungen mit Abgleich · Schema-Bausteine · Status S1–S11 · Quellen · Änderungen.

## 1. Keyword-Karte

Jedes Cluster hat genau eine Zielseite, damit sich Seiten nicht gegenseitig Konkurrenz machen. Die Begriffe stammen aus der Recherche des Plans (Google-Autocomplete DE, Bing DE, Wettbewerb). Suchvolumen sind **nicht gemessen**. Ab dem Launch liefert die Search Console Klicks und Impressionen je Cluster (Monatsbericht).

Produktseiten heißen wie der Shopify-Handle (Abgleich Punkt 8 im Plan).

| Nr | Cluster | Typische Suchbegriffe | Zielseite | Stand der Seite |
|---|---|---|---|---|
| K1 | Marke | royal spices, royalspices | `/` | gebaut; `WebSite.name` „Royal Spices“ folgt mit der SEO-Transaktion zu D |
| K2 | Safran kaufen (Kategorie) | safran kaufen, safranfäden kaufen, safran online kaufen | `/produkte/` | gebaut; eigener Einleitungstext laut Plan A offen |
| K3 | Produkt 1 g | safran 1g, negin safran 1g, safran herat 1g, safran preis 1g afghanistan | `/produkte/herat-negin-safran-1-g-grade-a/` | gebaut |
| K4 | Produkt 0,5 g | safran 0,5 g, negin safran 0,5g | `/produkte/safran-herat-negin-0-5g/` | gebaut |
| K5 | Herkunft | safran afghanistan, safran aus herat, afghanischer safran | `/herkunft-qualitaet/` | gebaut; später ergänzt durch Ratgeber R5 |
| K6 | Großhandel und Gastronomie | safran großhandel, safran b2b, safran für gastronomie, safran lose kaufen | `/b2b/` | gebaut |
| K7 | Catering (lokal) | afghanisches catering hamburg, catering hamburg afghanisch | `/catering/` | gebaut; Inhalt nur, wenn die Küche passt (Kunde bestätigt, Plan C) |
| K8 | Versand | royal spices versand, safran versandkostenfrei | `/versand-lieferung/` | gebaut |
| R1 | Echtheit | safran echt erkennen, safran echt oder fake, safran echtheit prüfen | `/ratgeber/<slug>/` | geplant (Ratgeber Nr. 1) |
| R2 | Dosierung | wie viel safran reis, safran risotto menge, safran paella menge, safran einweichen | `/ratgeber/<slug>/` | geplant (Nr. 2) |
| R3 | Sorten | negin safran, safran sorten, sargol, pushal, konjai | `/ratgeber/<slug>/` | geplant (Nr. 3), verweist auf `/b2b/` |
| R4 | Norm | iso 3632 safran, safran kategorie 1 | `/ratgeber/<slug>/` | geplant (Nr. 4), ohne Aussage zum eigenen Produkt (PRODUCT-TRUTH Nr. 14) |
| R5 | Herkunft vertieft | safran afghanistan iran vergleich, safran herat | `/ratgeber/<slug>/` | geplant (Nr. 5), ergänzt `/herkunft-qualitaet/` |
| R6 | Preis | warum ist safran so teuer, safran preis pro gramm | `/ratgeber/<slug>/` | geplant (Nr. 6) |
| R7 | Lagerung | safran lagern, safran haltbarkeit | `/ratgeber/<slug>/` | geplant (Nr. 7), erst nach Bestätigung des Lagerhinweises (PRODUCT-TRUTH Nr. 5) |
| R8 | Rezepte | safranreis, risotto alla milanese, paella safran, sholeh-e-zard | `/ratgeber/<slug>/` | geplant (Nr. 8), nur mit echtem Foto |
| – | Ratgeber-Übersicht | safran ratgeber, safran tipps | `/ratgeber/` | geplant (Phase 3) |

Die Slugs der Ratgeber legt die jeweilige Artikel-Transaktion fest und trägt sie hier ein.

**Nicht bespielen** (Plan Phase 3):
- HCVO-relevante Suchanfragen zu Safran als Nahrungsergänzung (Leitplanke 2, EuGH C-386/23). Dazu entsteht keine Seite, auch kein Ratgeber.
- Supermarkt-Suchen („safran kaufen dm/lidl“): andere Absicht.

## 2. Soll-Weiterleitungen und Abgleich mit `src/config/redirects.mjs`

Soll ist die Tabelle aus Plan Phase 1 C, mit den Handle-Pfaden aus Abgleich Punkt 8. Ist ist `src/config/redirects.mjs` (Stand 17.10.2026). `server.mjs` schlägt jede GET/HEAD-Anfrage dort nach, antwortet mit 301 und hängt die Query unverändert an. Schlüssel werden kleingeschrieben und ohne `/` am Ende verglichen.

Legende: **gleich** = Soll und Ist stimmen überein · **ABWEICHUNG** = bewusst anders, mit Grund · **FEHLT** = im Soll, aber nicht in der Tabelle.

| Alt | Soll | Ist (`redirects.mjs`) | Abgleich |
|---|---|---|---|
| `/collections/safran` | `/produkte/` | `/produkte/` | gleich |
| `/collections/all` | `/produkte/` | `/produkte/` | gleich |
| `/collections/frontpage` | `/produkte/` | `/produkte/` | erledigt 17.10.2026 (T-20261017-03, SEO-R) |
| `/products/herat-negin-safran-1-g-grade-a` (auch `?variant=…` und `/collections/*/products/…`) | `/produkte/herat-negin-safran-1-g-grade-a/` | Muster `PRODUCT` → `/produkte/<handle>/` | gleich; Query bleibt erhalten |
| `/products/safran-herat-negin-0-5g` | `/produkte/safran-herat-negin-0-5g/` | Muster `PRODUCT` → `/produkte/<handle>/` | gleich |
| `/pages/herkunft-qualitat` | `/herkunft-qualitaet/` | `/herkunft-qualitaet/` | gleich |
| `/pages/catering` | `/catering/` | `/catering/` | gleich |
| `/pages/b2b-zusammenarbeit` | `/b2b/` | `/b2b/` | gleich |
| `/handel/`, `/gastronomie/` (frühere V1-Seiten) | `/b2b/` | `/b2b/` | gleich |
| `/pages/ueber-uns` | `/ueber-uns/` | `/ueber-uns/` | gleich |
| `/pages/contact` | `/kontakt/` | `/kontakt/` | gleich |
| `/pages/faq` | `/faq/` | `/faq/` | gleich |
| `/pages/versand-lieferung` | `/versand-lieferung/` | `/versand-lieferung/` | gleich |
| `/policies/shipping-policy` | `/versand-lieferung/` | `/versand-lieferung/` | gleich |
| `/pages/impressum` | `/impressum/` | `/impressum/` | gleich |
| `/policies/legal-notice` | `/impressum/` | `/impressum/` | gleich |
| `/policies/privacy-policy` | `/datenschutz/` | `/datenschutz/` | gleich |
| `/policies/terms-of-service` | `/agb/` | – (404) | **ABWEICHUNG** – `/agb/` gibt es noch nicht (Kunde, O6). Eintrag kommt mit der Seite |
| `/policies/refund-policy` | `/widerruf/` | – (404) | **ABWEICHUNG** – `/widerruf/` gibt es noch nicht (Kunde, O6). Eintrag kommt mit der Seite |
| `/blogs/news` | `/ratgeber/` | `/` | **ABWEICHUNG** – umstellen, sobald `/ratgeber/` existiert |
| `/cart` | `/` | `/produkte/` | **ABWEICHUNG** – vertretbar, T-06 gilt (Abgleich Punkt 3) |
| `/search` | `/produkte/` | `/produkte/` | gleich |

Zusätzlich in `redirects.mjs`, nicht im Plan:

| Alt | Ist | Bemerkung |
|---|---|---|
| `/policies/contact-information` | `/kontakt/` | in T-06 ergänzt (Shopify-Standardseite), passt |
| `/produkte/safran-negin-1g` | `/produkte/herat-negin-safran-1-g-grade-a/` | alte V1-Produktseite (Abgleich Punkt 8) |

Hinweise für die Messung (S4, `seo.mjs --redirects` aus S0b):
- Das Muster `PRODUCT` leitet **jeden** Handle unter `/products/` weiter, auch unbekannte. Deren Ziel antwortet 404. Für S4 zählen nur die bekannten Handles; ein unbekannter Handle mit 301 → 404 ist kein Fehler der Tabelle, aber kein sauberes Ergebnis für Crawler.
- Die Search-Console-Liste alter URLs (Phase 0, V1) fehlt noch. Sobald sie da ist, gegen diese Tabelle prüfen und Lücken eintragen.
- Offen nach dieser Tabelle: `/agb/`, `/widerruf/`, `/ratgeber/` (ABWEICHUNG bis die Seiten existieren).

## 3. Schema-Bausteine (`src/lib/seo/schema.ts`)

Reine Funktionen, Daten als Parameter. Name, Anschrift, E-Mail und Telefon kommen nur über `napFromSite()` aus `src/config/site.ts`. Ein Test stellt sicher, dass `schema.ts` keinen dieser Werte wiederholt. Preise, SKU und Verfügbarkeit liefert der Aufrufer aus Shopify.

| Builder | Typ | Seite | Einsatz in |
|---|---|---|---|
| `buildOrganization` | `OnlineStore` (oder `Organization`), mit `contactPoint`, optional `logo`, `sameAs`, `hasShippingService`, `hasMerchantReturnPolicy` | `/` | SEO-Transaktion zu B |
| `buildWebSite` | `WebSite`, `name` aus `site.ts` („Royal Spices“), ohne `SearchAction` (keine Suche, O3) | `/` | SEO-Transaktion zu B/D |
| `buildBreadcrumbList` | `BreadcrumbList`, Positionen 1…n, absolute URLs mit `/` | alle Unterseiten | SEO-Transaktion zu D (Komponente) |
| `buildProduct` | `Product` + `Offer` (nur bei Preis > 0, EUR, `availability` und `itemCondition` als schema.org-URL, `sku` = `mpn`, `brand`, nie GTIN) | `/produkte/<handle>/` | SEO-Transaktion zu A |
| `buildArticle` | `Article`, `dateModified` nur bei echter Änderung | `/ratgeber/<slug>/` | Phase 3 |
| `buildRecipe` | `Recipe` mit `HowToStep` als Schritten, ohne Nährwerte und Bewertungen | `/ratgeber/<slug>/` | Phase 3 |
| `buildService` | `Service`, `areaServed` Hamburg (Stadt aus `site.ts`), `provider` | `/catering/` | SEO-Transaktion zu C |
| `serializeJsonLd` | schreibt `<` als `\u003c`, damit kein Text das Script-Element schließt | `Base.astro` | SEO-Transaktion zu D |

Bewusst nicht vorhanden: `FAQPage`, `HowTo`, `Review`, `AggregateRating` (S3, Leitplanke 5). `HowToStep` innerhalb von `Recipe` ist erlaubt und von Google empfohlen; die S3-Prüfung meint eigenständige `HowTo`-Objekte.

Hinweise für die Einbindung (Folgetransaktionen, nicht Teil von S0a):
- ~~`Base.astro` rendert JSON-LD mit `JSON.stringify`~~ – erledigt 17.10. (T-20261017-04): `Base.astro` nutzt `serializeJsonLd`. Die Produktseite entfernt `<`/`>` noch selbst (`ld()`), das fällt mit SEO-A weg.
- **Einbindung seit T-20261017-04:** `Base.astro` hat die Props `ogType` (`website` | `product` | `article`) und `ogImage` (String oder `{ src, width?, height? }`; Maße nur, wenn beide bekannt; Standard `/og.jpg` 1200 × 630). Brotkrumen: `<Breadcrumbs items={[{ name: 'Start', path: '/' }, …, aktuelle Seite]} />` aus `src/components/Breadcrumbs.astro` gibt die sichtbare Navigation und das `BreadcrumbList`-JSON-LD aus (Namen = sichtbarer Text); die Seite setzt sie an die passende Stelle, `Base.astro` braucht keine Prop.
- `src/pages/index.astro` schreibt die Telefonnummer im `Organization`-Schema von Hand. Das ist eine Doppelung zu `site.ts`; `buildOrganization` ersetzt sie.
- `CatalogProduct` (`src/lib/commerce/catalog.ts`) enthält keine SKU. Für `sku`/`mpn` muss die SEO-Transaktion zu A sie aus `firstVariant.sku` übernehmen (PRODUCT-TRUTH Nr. 4: SKU noch offen).
- Versandstufen und Rückgaberegel sind Parameter. Die Werte (frei ab 50 € in DE laut V3; Widerrufsfrist) setzt die Transaktion zu B, sobald Versandseite und Widerruf freigegeben sind.

## 4. Status S1–S11

**Gemessen am 17.10.2026** mit `tools/qa/seo.mjs` (S0b) gegen einen frischen Build des aktuellen Quellstands, dazu `--redirects` mit `tools/seo/legacy-urls.txt` (35 alte URLs). Der Build lief ohne Store und ohne `SITE_INDEXABLE=1`, gemessen wurde also der Stand vor dem Launch (alles `noindex`). Lauf in einer Scratch-Kopie mit `server.mjs` und Headless-Chrome für S7.

- Ergebnis: 13 Seiten, 15 Fehler, 10 Hinweise; mit `--redirects` 16 Fehler.
- Der Lauf des Agents gegen `dist/` vom 16.10. ergab dieselben Befunde. Berichte: `_agent/staging/T-20261017-02/report/`.
- **Nachmessung 17.10.2026 nach T-20261017-03 (SEO-R)**, gleicher Aufbau: 13 Seiten, 15 Fehler, 12 Hinweise mit `--redirects` (S4 jetzt 0 Fehler, die übrigen Befunde unverändert). Bericht: `_agent/staging/T-20261017-03/report/`.
- **Nachmessung 17.10.2026 nach T-20261017-04 (SEO-D)**: 13 Seiten, **2 Fehler** (S2 `WebSite`, S10), 12 Hinweise mit `--redirects`; S8 jetzt 0 Fehler. Zusätzlich ein Build mit `SITE_INDEXABLE=1`: indexierbare Seiten tragen `robots` = `max-image-preview:large`, `noindex`-Seiten unverändert. Berichte: `_agent/staging/T-20261017-04/report/`.
- **Nachmessung 17.10.2026 nach T-20261017-05 (SEO-A)**: 13 Seiten, **2 Fehler** (S2 `WebSite`, S10), **11 Hinweise** mit `--redirects`; der S1-Hinweis zu `/produkte/` ist erledigt. Zusätzlich ein Build mit Fixture-Store (Preload `_agent/staging/T-20261016-03/hilfsskripte/fake-storefront.mjs`) und `seo.mjs --store --no-browser`: Produkte mit `sku` = `mpn`, Offer mit `itemCondition`, Preis = sichtbarer Preis (S2-price 0), `og:image` mit Maßen. Einziger zusätzlicher Fehler: `S2-product` „ohne sku“ auf dem künstlichen Testprodukt des Preloads (SKU absichtlich leer). Berichte: `_agent/staging/T-20261017-05/report/`.
- **Nachmessung 17.10.2026 nach T-20261017-06 (SEO-B)**: 13 Seiten, **1 Fehler** (nur noch S10), 11 Hinweise mit `--redirects`; S2 jetzt 0 Fehler (Startseite mit `OnlineStore` und `WebSite` aus den Buildern). Bericht: `_agent/staging/T-20261017-06/report/`.
- **Nachmessung 17.10.2026 nach T-20261017-07 (SEO-C)**: 13 Seiten, **1 Fehler** (nur S10), **2 Hinweise** (die absichtlichen 404) mit `--redirects`; S1 jetzt ohne Hinweise. Bericht: `_agent/staging/T-20261017-07/report/`.
- Die Kürzel in der letzten Spalte verweisen auf die geplanten Folgetransaktionen in `docs/UEBERGABE-SEO.md`, Abschnitt „SEO-Folgetransaktionen zu A–D“.

Legende: **erfüllt** = gemessen ohne Fehler · **erfüllt vor Launch** = ohne Fehler im heutigen Build, die Launch-Fassung (Store, indexierbar) ist noch nicht gemessen · **Lücke** = gemessener Fehler · **offen** = nicht gemessen oder Entscheidung ausstehend.

| Nr | Kriterium (kurz) | Messung 17.10.2026 | Status | Behebung |
|---|---|---|---|---|
| S1 | genau eine `h1`, Titel 30–60, Beschreibung 70–160, Canonical absolut mit `/` | 0 Fehler: `h1`, Canonical, `og:url` und Eindeutigkeit in Ordnung. 9 Hinweise (nach SEO-A), die erst mit `SITE_INDEXABLE=1` zählen. Beschreibung zu lang: `/b2b/` 181, `/catering/` 283, `/herkunft-qualitaet/` 183, `/ueber-uns/` 190, `/versand-lieferung/` 164 Zeichen. Titel zu kurz: `/datenschutz/` 26, `/faq/` 29, `/impressum/` 24, `/ueber-uns/` 17 Zeichen. **Nach SEO-A:** `/produkte/` mit freigegebener Beschreibung (134 Zeichen). **Nach SEO-C:** 0 Hinweise; Titel von Datenschutz, FAQ, Impressum, Über uns und Beschreibungen von B2B, Catering, Herkunft, Über uns, Versand neu (vom Nutzer am 17.10. freigegeben, E5) | erfüllt vor Launch | Launch-Lauf mit `SITE_INDEXABLE=1` |
| S2 | JSON-LD parst; `Product` mit `Offer` (Preis > 0, Währung, `availability`, `sku`, `brand`); Startseite mit `WebSite` und `Organization`/`OnlineStore`, NAP = `site.ts` | 1 Fehler: Startseite ohne `WebSite`. JSON-LD parst überall, Organization-NAP = `site.ts`, Produkte ohne Store ohne `Offer` (richtig). Nicht gemessen: Build mit Store (`--store`, Preisprüfung). **Nach SEO-B:** 0 Fehler. Startseite mit `buildOrganization` (`OnlineStore`, NAP aus `site.ts`, ohne Versand und Rückgabe bis zur Bestätigung durch den Kunden, E7) und `buildWebSite`; die Telefonnummer von Hand ist weg. **Nach SEO-A:** Produktseiten über `buildProduct` mit `sku` = `mpn` und `itemCondition`; im Build mit Fixture-Store `--store` ohne Produktfehler (außer dem künstlichen Testprodukt ohne SKU), Preis = sichtbarer Preis | erfüllt vor Launch | Launch-Lauf mit Store (`--store`); E7: Versand und Rückgabe nach Bestätigung |
| S3 | kein `FAQPage`/`HowTo`; `Review`/`AggregateRating` nur mit echten Daten | 0 Fehler | erfüllt | – |
| S4 | alte URLs → 301 → 200, ein Sprung, Query-Varianten | **Nachmessung 17.10. nach SEO-R:** 33 von 35 korrekt (301, ein Sprung, Ziel 200, auch `?variant=`, `/collections/*/products/` und jetzt `/collections/frontpage`), 0 Fehler. 2 Hinweise: `/policies/terms-of-service` und `/policies/refund-policy` absichtlich 404. Der Search-Console-Export (V1) fehlt noch | erfüllt vor Launch | AGB, Widerruf und Ratgeber, sobald es die Seiten gibt; Search-Console-Export |
| S5 | Sitemap = indexierbare Seiten mit `/`, `lastmod` nur belegt; `robots.txt` mit Sitemap, sperrt `/api/` und `/anfrage/` | 0 Fehler. Sitemap mit 13 URLs, alle mit `/`, ohne `lastmod` (zulässig). Die robots-Regeln für den Launch sind nur im Code geprüft | erfüllt vor Launch | Launch-Lauf |
| S6 | ohne `SITE_INDEXABLE=1` alles `noindex` | 0 Fehler: alle 13 Seiten und die 404-Seite `noindex`, robots.txt mit `Disallow: /` | erfüllt | – |
| S7 | keine Cookies/kein Speicher ohne Einwilligung; Netzwerk nur `self`, Store, `cdn.shopify.com` | 0 Fehler auf 13 Seiten: nach dem Laden kein Cookie, `localStorage` und `sessionStorage` leer, Anfragen nur an self und `data:`. Ohne Store gemessen | erfüllt vor Launch | Launch-Lauf mit Store |
| S8 | `alt` je Inhaltsbild; `og:image` 1200 × 630; Favicon-Satz PNG 48/96/192 + `apple-touch-icon` | **Nachmessung 17.10. nach SEO-D:** 0 Fehler. PNG 48/96/192 und `apple-touch-icon` (180, opak) verlinkt und ausgeliefert; `alt` in Ordnung; `og.jpg` 1200 × 630. **Nach SEO-A:** Produktseiten mit `og:type=product` und `og:image` mit Maßen: das Shopify-Bild als CDN-Zuschnitt 1200 × 630, wenn die Quelle mindestens so groß ist (1 g: Quelle 1254 × 1254, abgerufen 1200 × 630), sonst `og.jpg` (0,5 g: Quelle 1024 × 1536, das CDN skaliert nicht hoch und hätte 420 × 630 geliefert). `seo.mjs` prüft die Größe fremder Bilder nicht (Hinweis), daher von Hand geprüft | erfüllt vor Launch | Launch-Lauf; ein Shopify-Bild ≥ 1200 × 630 für 0,5 g wird automatisch genommen |
| S9 | LCP < 2,5 s, CLS < 0,1, TBT < 200 ms mobil | **17.10. nach SEO-D** mit `tools/qa/perf.mjs` (Labor, dieser Rechner, `server.mjs`): mobil (4× CPU, langsames 4G) LCP `/` 1124 ms, Produktseite 1208 ms, `/kontakt/` 1392 ms; CLS ≤ 0,0002; langsamste Interaktion ≤ 160 ms. Desktop LCP ≤ 540 ms. **17.10. nach T-20261017-08** misst `perf.mjs` auch TBT (Long Tasks ab FCP bis zu einem Ruhefenster von 5 s, wie Lighthouse ohne Netzwerkbedingung; Gegenprobe 300-ms-Aufgabe → 250 ms): mobil TBT 0 ms auf `/`, Produktseite und `/kontakt/`, höchstens 25 ms (Desktop 4× CPU, `/`); LCP mobil `/` 1016 ms, Produktseite 1292 ms, `/kontakt/` 1128 ms (ein Ausreißer der Produktseite mit 3084 ms im ersten Lauf, Probe danach 924/1504 ms) | erfüllt (Labor, vor dem Launch) | Drosselung über DevTools, nicht simuliert wie bei Lighthouse; LCP der Produktseite beim Launch-Lauf im Blick behalten; Feldwerte erst nach dem Launch |
| S10 | keine HCVO-Aussagen (Leitplanke 2) | 1 Fehler auf `/`: „Kleine Menge. Große Wirkung.“ (Treffer der Wortliste, Live-Text) | offen (Kunde) | Urteil des Kunden; danach Text ändern oder Wendung in `HEALTH_ALLOW` aufnehmen |
| S11 | `npm test` und `npm run build` grün | `npm test` im Projekt 105/105 (nach SEO-C); `npm run build` inkl. `astro check` in der Scratch-Kopie mit demselben Quellstand grün | erfüllt | – |

Nächste Messungen: nach jeder SEO-Folgetransaktion, und vor dem Launch mit Store und `SITE_INDEXABLE=1` (`--store --redirects`), jeweils mit Datum hier.

## 5. Quellen

Aus dem Plan (`docs/UEBERGABE-SEO.md`, Quellen):
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

Ergänzt in S0a für die einzelnen Schema-Typen (Google-Doku; in S0a nicht abgerufen, weil ohne Netz gearbeitet wurde; vor der Einbindung prüfen):
- Organisation: https://developers.google.com/search/docs/appearance/structured-data/organization
- Brotkrumen: https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- Artikel: https://developers.google.com/search/docs/appearance/structured-data/article
- Rezepte: https://developers.google.com/search/docs/appearance/structured-data/recipe
- Rückgaberichtlinie (Organisationsebene): https://developers.google.com/search/docs/appearance/structured-data/return-policy
- schema.org-Vokabular: https://schema.org/

Rich-Results-Test und Search-Console-Prüfung kommen nach dem Launch mit Datum und Screenshot hierher (S2, Plan Verifikation Punkt 4).

## 6. Änderungen

| Datum | Transaktion | Änderung |
|---|---|---|
| 17.10.2026 | T-20261017-01 (S0a) | Datei angelegt: Keyword-Karte, Abgleich der Weiterleitungen, Schema-Bausteine, Status S1–S11 nach Code-Lesung |
| 17.10.2026 | Hauptchat nach T-20261017-02 (S0b) | Abschnitt 4: Status S1–S11 aus der ersten Messung mit `seo.mjs` (Build vom 17.10., vor dem Launch), mit Verweis auf die geplanten Folgetransaktionen |
| 17.10.2026 | T-20261017-03 (SEO-R) | Abschnitt 2: `/collections/frontpage` erledigt; Abschnitt 4: Nachmessung, S4 erfüllt vor Launch |
| 17.10.2026 | T-20261017-04 (SEO-D) | Abschnitt 3: Einbindung `Base.astro`-Props und `Breadcrumbs.astro`; Abschnitt 4: Nachmessung, S8 erfüllt vor Launch, S9 erstmals gemessen (ohne TBT) |
| 17.10.2026 | T-20261017-05 (SEO-A) | Abschnitt 4: Nachmessung ohne und mit Fixture-Store; S1 `/produkte/` erledigt, S2 Produkt erledigt, S8 Produkt-`og:image` mit Maßen; S11 105/105 |
| 17.10.2026 | T-20261017-06 (SEO-B) | Abschnitt 4: Nachmessung, S2 erfüllt vor Launch (`OnlineStore` + `WebSite` auf der Startseite); Augenbraue als `span` in der `h1` (Entscheidung 1) |
| 17.10.2026 | T-20261017-07 (SEO-C) | Abschnitt 4: Nachmessung, S1 erfüllt vor Launch; Brotkrumen auf 9 Unterseiten, `Service` auf `/catering/` |
| 17.10.2026 | T-20261017-08 (S9 TBT) | Abschnitt 4: `perf.mjs` misst TBT; S9 im Labor erfüllt vor Launch |
