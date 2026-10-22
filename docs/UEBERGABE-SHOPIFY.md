# Übergabe: Shopify-Übernahme (headless)

Stand 15.10.2026, Hauptchat 1 (Kontext an der 120k-Grenze, daher Übergabe). Nichts im Code geändert; neu sind nur `docs/LIVE-INVENTAR.md`, diese Datei und kurze Statuszeilen in `SHOPIFY.md`, `PRODUCT-TRUTH.md`, `_agent/LOG.md`.

## Auftrag

Der Auftritt von https://royalspices.de/ (Kundenstand 15.10.2026) steht im V1-Frontend so, wie er dort abgebildet ist. Produkte, Preise und Verfügbarkeit kommen aus Shopify (Storefront API). Danach muss sich der Kunde nur noch in Shopify einloggen und Artikel korrigieren. Zugangsdaten gibt Claude nie selbst ein; Login und Storefront-Schlüssel erledigt der Kunde im Browser und trägt den öffentlichen Schlüssel selbst in `.env` ein.

## Entscheidungen des Nutzers (15.10.2026)

| Nr | Frage | Entscheidung |
|---|---|---|
| D1 | Aufbau | **Headless**: V1-Frontend auf royalspices.de, Shopify für Produkte, Preise, Bestand, Checkout, Bestellungen |
| D2 | Preise | **Preise aus Shopify zeigen**, Kauf über Warenkorb und Shopify-Checkout (PRODUCT-TRUTH angepasst) |
| D3 | Qualität | **Grade 1** (Etikett). Kunde korrigiert den Shopify-Titel „Grade A“ |
| D4 | Texte | **Live-Texte wörtlich**, nur Grade A → Grade 1. Abweichungen zu PRODUCT-TRUTH als Prüfliste für den Kunden (unten) |
| D5 | Hero | **V1-Render-Sequenz (Journey) + Live-Text** „The Art of Saffron.“, Kennzahlen, Knöpfe |
| D6 | B2B | **Eine Seite `/b2b/`** wie Live; `/handel/` und `/gastronomie/` per 301 dorthin |
| D7 | Geschenkbox 5 g | **Ohne Preis**, Karte „In Vorbereitung“. Legt der Kunde sie in Shopify an, erscheint sie mit Preis |

## Befund

Vollständig in **`docs/LIVE-INVENTAR.md`**: Abgleichliste (K1–K5 Kopf, S1–S10 Startseite, F1–F2 Fuß, P1–P3 Produkte, Q1–Q11 Seiten, W1 Weiterleitungen), Bilderliste, Produkttabelle, alle Texte wörtlich. Rohdaten: `.raw/live-20261015/`.

Wichtig daraus:

- Store `izt0j1-cw.myshopify.com`. Zwei Produkte, je eine Variante „Default Title“: `safran-herat-negin-0-5g` (RS-SAF-HN-05, 8,90 €) und `herat-negin-safran-1-g-grade-a` (RS-SAF-HN-1G, 12,90 €). Der 1-g-Titel enthält geschützte Leerzeichen.
- **AGB, Widerruf und Versandrichtlinie fehlen in Shopify** (`/policies/…` gibt 404). Vor dem Verkauf Pflicht; Kundenaufgabe.
- Ankündigung wörtlich: „HERAT NEGIN SAFFRON ✧ KOSTENLOSER VERSAND IN DE AB 50 €“ (nicht „Versandkostenfrei in Deutschland …“).
- Kontaktformular Live läuft über Shopify. Headless gibt es dafür keine Storefront-Schnittstelle; das V1-Formular braucht SMTP (PRODUCT-TRUTH Nr. 12).
- Newsletter „The Royal Journal“ ist Shopify-Kundenmarketing; headless braucht er einen eigenen Weg mit Double-Opt-in (O4).
- Bildnachweis „Wakhan“ im Impressum bezieht sich laut Text auf die alte Seite; das Bild wird auf Live nicht mehr verwendet.

## Prüfliste Live-Text gegen PRODUCT-TRUTH (für den Kunden, D4)

Übernommen wie Live, aber nicht durch Unterlagen belegt: „Handverlesen“ (S1, S3, S4, P), „Premium“ (S5, P), „Chargenbezogene Analysen auf Anfrage“ (S3, Q1; PRODUCT-TRUTH Nr. 14), „Mindesthaltbarkeitsdatum und Chargenkennzeichnung stehen auf der Verpackung“ (P; Nr. 4), Lagerhinweis in drei Fassungen (FAQ, Q1, Produkt; Nr. 5), Catering-Preisorientierung (Q2), Versandtarife als fester Text (Q7, müssen zu Shopify passen).

## Musskriterien (vom Nutzer am 15.10.2026 freigegeben, mit Anpassungen)

Anpassungen zur Tabelle: **M3/M4** Build läuft mit und ohne Store. Mit Store kommen Liste und Seiten zur Build-Zeit aus der Storefront API. Ohne Store entstehen die Seiten aus den Handles in `product.ts`, ohne Preis und mit Anfrage-Weg. `product.ts` ordnet die Fakten per Shopify-Handle zu und hat kein `shopifyHandle`-Feld. Bei einem unbekannten Handle zeigt die Seite Titel und Beschreibung aus Shopify. Die Tests nutzen eine aufgezeichnete Antwort, kein Netz. Ausgangslage: 20 Tests (9 Commerce, 11 Anfrage). **M6** 301 über eine Tabelle `src/config/redirects.mjs` in `server.mjs` (Astro-`redirects` erzeugt bei statischer Ausgabe nur Meta-Refresh); `handel.astro` und `gastronomie.astro` entfallen. **M9** Den Testkauf machen Nutzer oder Kunde nach O7. Er ist ein Kriterium für den Livegang, nicht für A–D. **M1** Die Transaktionen melden den Stand je Zeile; `LIVE-INVENTAR.md` pflegt der Hauptchat. Das Abgleich-Skript folgt als eigene Transaktion. Umsetzung: T-20261015-03 bis -07 (A, B, C1, C2, D) in `_agent/LOG.md`.

| Nr | Kriterium | Messung |
|---|---|---|
| M1 | Abgleichliste vollständig | Jede Zeile in `LIVE-INVENTAR.md` hat Stand `geprüft` oder eine vom Nutzer bestätigte Abweichung; Texte per Skript wörtlich gegen `outline.md` verglichen |
| M2 | Produktpreise und Verfügbarkeit nur aus Shopify | Kein Produktpreis als Literal in `src/`; Produktseiten zeigen Storefront-Werte; ohne Store kein Preis |
| M3 | Produkte aus der Storefront API | Produktliste und Produktseiten per Handle aus Shopify beim Build (`getStaticPaths`); `product.ts` hält nur noch beschreibende Fakten, kein `shopifyHandle` |
| M4 | Tests grün | `npm test` (bisher 9 + neue für die Produktliste) und `npm run build` (inkl. `astro check`) ohne Fehler |
| M5 | Keine Zugangsdaten im Repo | Suche nach Schlüsselmustern (`shpat_`, `shpss_`, 32 Hex-Zeichen) leer; `.env` ignoriert; nur `.env.example` mit Platzhaltern |
| M6 | Alte Pfade leiten weiter | 301 für alle Live-Pfade aus W1 und `/handel/`, `/gastronomie/` |
| M7 | Sicherheit wie SHOPIFY.md | CSP nur `self` + Store-Domain + `cdn.shopify.com`; Shopify-Texte per `textContent` |
| M8 | Datenschutz | Abschnitt Shopify als Auftragsverarbeiter in `datenschutz.astro` |
| M9 | Testkauf | Mit Shopify-Testzahlung bis zur Bestellbestätigung, Ergebnis in `SHOPIFY.md` |

## Offene Punkte

| Nr | Punkt | Wer |
|---|---|---|
| O1 | Hosting für das Frontend und Umzug der Domain royalspices.de (Checkout bleibt bei Shopify) | Kunde / Technik |
| O2 | SMTP für das Kontaktformular | Kunde / Technik |
| O3 | Suche im Kopf: **entschieden 15.10.: weglassen**, `/search` per 301 auf `/produkte/` | Nutzer |
| O4 | Newsletter-Dienst mit Double-Opt-in (Shopify Forms, Klaviyo o. ä.) | Kunde |
| O5 | Bilder von `cdn.shopify.com` laden (Logo, Bildbruch S6, Markenzeichen): erst nach Ja des Nutzers; Dateinamen in `LIVE-INVENTAR.md` | Nutzer |
| O6 | Shopify-Korrekturen: Titel 1 g auf Grade 1, Favicon als 2. Produktbild entfernen, Handle `…-grade-a` ggf. umbenennen (Shopify legt Weiterleitung an), Hersteller „www.Royal-Spices.com“, Richtlinien (AGB, Widerruf, Versand) anlegen | Kunde |
| O7 | Headless-Kanal anlegen, beide Produkte dafür veröffentlichen, öffentlichen Storefront-Schlüssel erzeugen (Rechte: Produkte lesen, Carts lesen/schreiben) und selbst in `.env` eintragen | Kunde |

## Wiedereinstieg im neuen Chat (Stand 16.10.2026, Ende Hauptchat 2)

Hauptchat 2: Kriterien freigegeben (oben), Transaktionen A–D gestartet, pausiert, fortgesetzt. **Noch nichts im Projekt übernommen.**

1. Lesen: CLAUDE.md, diesen Abschnitt, `_agent/LOG.md` (Zeilen T-20261015-03 bis -07 und Notizen unten), die vorhandenen `ERGEBNIS.md` in `_agent/staging/T-20261015-0{3,5,6,7}/`. T-20261015-02 (Blender) kollidiert nicht.
2. Stand:

| ID | Teil | Stand | Nächster Schritt |
|---|---|---|---|
| -03 | A Produkte | vom Nutzer gestoppt, kein `ERGEBNIS.md`; `out/` hat alle Zieldateien (catalog.ts, [handle].astro, Tests, Fixture …) und Build-Logs, ungeprüft | als neue Transaktion: Stand in `out/` gegen A1–A7 prüfen, fertigstellen, `ERGEBNIS.md` |
| -04 | B Startseite | VERWORFEN | als neue Transaktion starten (Auftrag unten) |
| -05 | C1 Seiten | FERTIG, ungeprüft | **Nutzerfrage:** V1-Inhalte entfallen (Herkunft: Anatomie, Nachweise; Catering: Katalog, Pakete), weil nicht auf Live. So übernehmen? |
| -06 | C2 Seiten + 301 | FERTIG, ungeprüft | prüfen; Datenschutz-Entwurf (8 PRÜFEN-Marken) dem Nutzer vorlegen |
| -07 | D Rahmen | FERTIG, ungeprüft | Kopf jetzt `sticky` statt `fixed` (ungefragt), im Browser prüfen; nur zusammen mit -05 übernehmen |

3. Technik: **H: ist exFAT**, dort gibt es keine Junction. Arbeitskopien für Prüfungen liegen im Scratchpad auf C:, mit Junction nach `H:\royal-spices\royal-spices-v1\node_modules` (PowerShell `New-Item -ItemType Junction`, entfernen nur mit `cmd /c rmdir`). Der Auto-Modus blockierte Write/Edit einzelner Agents („no verdict“), daher vor dem Start den manuellen Modus mit dem Nutzer klären. Die Agents brauchten 120–146k Tokens, deshalb Aufträge kleiner schneiden (z. B. B ohne Bildarbeit).
4. Abnahme A (Kurzform, voller Auftrag nur im alten Chat): A1 Vertrag unten exakt, Query products(first: 50) mit handle, title, description, Bildern, erster Variante (id, sku, price, availableForSale). A2 mit Store `getStaticPaths` aus dem Katalog, API-Fehler bricht den Build ab; ohne Store Seiten aus den Handles in `product.ts`, ohne Preis, Anfrageweg; unbekannter Handle zeigt Shopify-Titel und -Beschreibung. A3 `product.ts` per Handle, kein `shopifyHandle`, kein Preis. A4 Texte wörtlich, `/produkte/` wie Live-Kollektion ohne Filter. A5 BuyBox/`commerce.ts` mit `variantId`. A6 Tests mit Fixture, `npm test`, `astro check`, Build ohne Store grün. A7 `grep -rnE "12[,.]90|8[,.]90|49[,.]90"` in src leer. Löschen: `src/pages/produkte/safran-negin-1g.astro`.
5. **Auftrag B neu** (Schreibt: `src/pages/index.astro`, `src/components/home/**`). Ziel: Live-Startseite S1–S10 wörtlich (Grade A → Grade 1), Hero = V1-Journey + Live-Text (D5), Geschenkbox „In Vorbereitung“ ohne Preis (D7). Nutzerentscheide 16.10.: Am Ende der Journey bleibt der V1-Text („Safranfäden. Ein Gramm im Glas.“), Link auf `/produkte/herat-negin-safran-1-g-grade-a/`; Meta: V1-Titel, Description = Lead aus dem Live-Hero. Befunde aus T-04: `Journey.astro` hat Hero-Text und Links (`/handel/`, `/produkte/safran-negin-1g/`) fest eingebaut, ohne Props. Daher Kopie als `home/HomeJourney.astro` (Zwischenstand liegt in `staging/T-20261015-04/out/`), Script `@/scripts/journey` und `data-journey-*` unverändert, Intro mit Live-S1 (Eyebrow, H1 „The Art<br>of Saffron.“, Lead, Knöpfe „Safran entdecken“ → 1-g-Seite, „Unsere Herkunft“ → `/herkunft-qualitaet/`, drei Kennzahlen), Skip-Link auf `#warum` (S3). Bilder: S4 `Sprig` und `jars-photo`, S5 Katalogbild, sonst `jar` bzw. `jars-photo`, S6 Still `saffron`, Geschenkbox per CSS, sonst `<!-- O5: … -->`. Live-Pfeile „↗“ als V1-`Arrow`. Abnahme: B1 S1–S10 in Live-Reihenfolge wörtlich; B2 Journey läuft; B3 S5 Preise nur aus dem Katalog; B4 Preis-grep leer; B5 nur erlaubte Links; B6 `astro check` 0 Fehler (mit Stub `catalog.ts`, falls A noch fehlt).
   Vertrag A↔B (`src/lib/commerce/catalog.ts`):
   ```ts
   interface CatalogProduct { handle: string; title: string; description: string /* Klartext */;
     price: { amount: string; currencyCode: string } | null /* null ohne Store */; available: boolean | null;
     variantId: string | null; image: { url: string; altText: string | null; width: number; height: number } | null;
     facts: ProductFacts | null }
   getCatalog(): Promise<CatalogProduct[]>; getProduct(handle): Promise<CatalogProduct | undefined>;
   formatPrice(p): string /* "12,90 €" */
   ```
   Erlaubte Pfade: `/`, `/produkte/`, `/produkte/<handle>/`, `/herkunft-qualitaet/`, `/catering/`, `/b2b/`, `/ueber-uns/`, `/kontakt/`, `/faq/`, `/versand-lieferung/`, `/impressum/`, `/datenschutz/`, `/anfrage/`. Handles: `herat-negin-safran-1-g-grade-a`, `safran-herat-negin-0-5g`.
6. Wenn alle `FERTIG` sind: jede Transaktion gegen ihre Kriterien prüfen, dann COMMIT mit Backup (C1 und D zusammen), Löschungen ausführen. Restverweise auf `/handel/` und `/gastronomie/` laut T-05 in `tools/qa/a11y.mjs`, `docs/ARCHITECTURE.md`, `docs/SHOPIFY.md`, `docs/QA.md`; `BuyBox.astro` (A), `site.ts` (D), `index.astro` und `Journey.astro` (B). Danach `npm test`, `npm run build`, Browserprüfung (Kopf sticky, mobil), Stand in `LIVE-INVENTAR.md` eintragen, M1-Abgleich-Skript als eigene Transaktion, M5-Suche, M7-CSP prüfen. Ungenutzt danach: `categories`/`packages` in `src/data/catering.ts`, `Journey.astro`.

## Stand 16.10.2026, Ende Hauptchat 4: A–D übernommen

**Im Projekt:** A (T-20261016-03), B (-16-04), C1 (-15-05), C2 (-15-06), C3 (-16-05, V1-Inhalte zurück) und D (-15-07) sind gemeinsam übernommen, Backups in `_agent/staging/<ID>/backup/`. Prüfbericht zu C1/C2/D: `_agent/staging/T-20261016-06/PRUEFUNG.md`. Details und Belege: `_agent/LOG.md`, Notiz „COMMIT Shopify A, B, C1, C2, C3, D“. `npm test` 38/38, Build grün, Browserprüfung ohne Befund. `categories`/`packages` in `catering.ts` werden durch C3 wieder genutzt; `Journey.astro` ist gelöscht (T-20261016-08).

**Laufwerk:** Das Projekt liegt jetzt auf `E:` (dasselbe exFAT-Volume wie früher `H:`). Die Allow-Regeln in `.claude/settings.local.json` nennen nur `//h/`; eine Änderung dort lehnt der Auto-Modus als Selbständerung ab, das muss der Nutzer selbst eintragen. Write/Edit im Staging, in `LOG.md` und im Projekt gingen trotzdem.

**Nutzerentscheide 16.10. (Hauptchat 4):** Geschenkbox zeigt automatisch Preis und Link, sobald ein Shopify-Produkt „Geschenkbox“ im Titel oder Handle trägt, sonst „In Vorbereitung“ ohne Preis. Anrede später einheitlich auf du wie Live (Formulare, Warenkorb, BuyBox, Anfrage-Seiten, `product.ts`, `versand-lieferung`); Datenschutz und Impressum bleiben in Sie-Form.

**Nächste Schritte (je eine kleine Transaktion oder im Hauptchat):**
1. Restverweise auf `/handel/`, `/gastronomie/`: `tools/qa/a11y.mjs:9`, `docs/ARCHITECTURE.md:51–52`, `docs/SHOPIFY.md:79`, `docs/QA.md:200`, `docs/LIVE-INVENTAR.md:35`; `src/components/Journey.astro` löschen (ungenutzt, enthält `/handel/` und `safran-negin-1g`). **Erledigt 16.10. in T-20261016-08** (dazu `tools/qa/perf.mjs`, Stand der Abgleichliste in `LIVE-INVENTAR.md`, Hinweis 8 in `UEBERGABE-SEO.md`).
2. Anrede auf du (siehe oben, rund 25 Stellen außerhalb der Rechtstexte; `grep -rnwE "Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer" src`). **Erledigt 16.10. in T-20261016-07** (Sie-Formen nur noch in Datenschutz, Impressum und einem Kommentar).
3. `/kontakt/`: Telefon und E-Mail stehen im HTML noch im per CSS ausgeblendeten „Direkt“-Block von `InquiryForm.astro`. Sauber mit einem Prop, das den Block abschaltet. **Erledigt 16.10. in T-20261016-07** (Prop `direct`; auf `/kontakt/` steht im `<main>` je ein `mailto:` und `tel:`).
4. Für den Kunden: Grundpreis für 0,5 g (Live zeigt ihn; `unitPrice` fehlt in der Query, rechtlich klären lassen), PRODUCT-TRUTH Nr. 4 und 7, Catering-Katalog aktuell?, 8 PRÜFEN-Marken im Datenschutz.
5. Vor dem Deploy: PRÜFEN-, O4- und O5-Kommentare aus dem ausgelieferten HTML entfernen; mit echtem Store „Einloggen“, Warenkorb-Knopf bei 1024 px und den Klartext von `description` prüfen. `/collections/frontpage` gibt 404 (nicht in der Tabelle).
6. Aus dem Plan oben noch offen: M1-Abgleich-Skript als eigene Transaktion, M5-Suche, M7-CSP prüfen. Den Stand in `LIVE-INVENTAR.md` hat T-20261016-08 eingetragen (alle Zeilen `gebaut`, `geprüft` erst mit dem M1-Skript). Danach die SEO-Folgetransaktionen (`docs/UEBERGABE-SEO.md`); SEO S0 läuft seit 17.10. als T-20261017-01 und -02.
7. Aus T-20261016-08: `tools/qa/axtree.mjs` prüft noch Auftakt und Menü des alten Stands; `LabelSheet.astro` ist ungenutzt.

**Lehre zum Budget:** Alle vier Agents lagen über 150k (179–225k Tokens). Aufträge künftig kleiner schneiden (z. B. A in Katalog/Seiten teilen, Prüfung ohne Browser). Parallele Agents teilen sich ein Scratchpad: Arbeitskopien und Logs immer mit Transaktions-ID benennen (`<ID>-work`).

## Stand 17.10.2026: technische Restpunkte erledigt

Umgesetzt als T-20261017-09 und -10 (Hauptchat, übernommen, Details in `_agent/LOG.md` und `_agent/staging/<ID>/ERGEBNIS.md`). Damit sind aus „Nächste Schritte“ oben erledigt:

- **5 (teilweise):** PRÜFEN-, O4- und O5-Kommentare sind nicht mehr im ausgelieferten HTML (Quelltext-Kommentare `{/* … */}`; die PRÜFEN-Marken stehen weiter in `src/pages/datenschutz.astro`). `/collections/frontpage` leitet seit T-20261017-03. Offen bleibt die Prüfung mit echtem Store („Einloggen“, Warenkorb-Knopf bei 1024 px, Klartext von `description`).
- **6:** M1-Abgleich-Skript `tools/qa/live-text.mjs` mit Regeln und begründeten Ausnahmen in `tools/live/rules.mjs`; Stand je Zeile in `LIVE-INVENTAR.md`. M5 und M7 geprüft, erfüllt.
- **7:** `tools/qa/axtree.mjs` auf den heutigen Stand gebracht, `LabelSheet.astro` entfernt.

Aufruf M1 nach jedem Build (`.raw/live-20261015/outline.md` muss vorhanden sein):

```bash
node tools/qa/live-text.mjs dist/client
node tools/qa/live-text.mjs dist/client --ohne-store
```

Für einen Build mit Fixture-Store ohne Netz: `_agent/staging/T-20261017-10/hilfsskripte/fake-storefront.mjs` per `node --import` vor `node_modules/astro/bin/astro.mjs build`, mit `FAKE_STOREFRONT_EXTRA=0` und Platzhaltern für `PUBLIC_SHOPIFY_*`.

**A1–A4 bestätigt (Nutzer, 17.10.2026):** Die Zeilen K5, F1, P1–P3, Q2, Q3 und Q5 stehen auf `geprüft` (P1 und P3 behalten den Hinweis auf den Grundpreis). M1 ist damit erfüllt bis auf Q9 (Datenschutz-Entwurf, Freigabe durch den Kunden). Neue Abweichungen brauchen weiter eine Bestätigung des Nutzers und einen Eintrag mit Begründung in `tools/live/rules.mjs`.

**Offen beim Kunden (unverändert):** O1, O2, O4, O6, O7, Grundpreis 0,5 g (`unitPrice`), PRÜFEN-Marken im Datenschutz, PRODUCT-TRUTH Nr. 4 und 7, Catering-Katalog. Danach: Build gegen den echten Store, M1 erneut laufen lassen, Testkauf (M9), Launch mit `SITE_INDEXABLE=1`.

## Wiedereinstieg (Stand 18.10.2026): Prüfung von dev, Fixes T-20261018-01/-02

Der Nutzer hat `origin/dev` (`1d7954a`) am 17.10. prüfen lassen. Befund: sauber gebaut, `npm test` 115/115, gegen den echten Store aber noch nie gelaufen. Zwei Fehler sind per Build belegt; der Nutzer hat ihre Behebung freigegeben:

1. **T-20261018-01, ÜBERNOMMEN.** Problem: CSP stimmte nicht, wenn der Schlüssel nur in `.env` stand. `astro.config.mjs` liest die Store-Domain jetzt über `loadEnv`. Neuer Test `tests/build-env.test.mjs`, `npm test` 120/120. Details: `_agent/staging/T-20261018-01/ERGEBNIS.md`.
2. **T-20261018-02, ÜBERNOMMEN** (18.10., Hauptchat 2). Problem: Die Produktbeschreibung zerfiel zu einem verklebten Absatz, sobald der Kunde den Text in Shopify änderte. Jetzt holt die Abfrage `descriptionHtml`, `src/lib/commerce/rich-text.ts` zerlegt es beim Build in reine Textblöcke, und die Seite zeigt sie in der gewohnten Optik. Meta und JSON-LD trennen die Blöcke. Neu sind `tests/rich-text.test.mjs` und die Komponente `DescriptionInline.astro`. `npm test` 132/132, `astro check` 0/0/0. Details: `_agent/staging/T-20261018-02/ERGEBNIS.md`.

Weitere Befunde der Prüfung (noch nicht beauftragt):

- **Kein automatischer Neubau (H8).** Nur die Produktseite aktualisiert Preis und Bestand live. Startseite, `/produkte/` und das JSON-LD-`Offer` bleiben bis zum Neubau alt. Risiko: Abweichungen im Merchant Center.
- **Handles fest im Code**, an 5 Stellen: `HomeCollection`, `HomeJourney` (zweimal), `product.ts`, `redirects.mjs`. Wird ein Handle umbenannt oder ein Produkt entfernt, zeigen Links ins Leere.
- **Nur die erste Variante ist kaufbar** (`variants(first: 1)`). `SHOPIFY.md` beschreibt im Ablauf noch eine Variantenwahl.
- **Grundpreis fehlt:** `unitPrice` wird nicht gelesen.
- **API-Version:** 2026-07 bis etwa Mitte 2027 erneuern.
- **`seo.mjs`** liest die Store-Domain (S7) und `SITE_URL` nur aus der Prozessumgebung.

Abnahme mit echtem Store, sobald der Kunde O7 erledigt hat:

- **Stufe 1, vor dem Umzug:**
  - Build mit echten Werten, danach `live-text.mjs` und `seo.mjs --store`.
  - Im Browser: keine CSP-Fehler, Bilder und Preis stimmen.
  - Warenkorb: hinzufügen, ändern, entfernen, Neuladen.
  - Checkout und Testkauf bis zur Bestellung, danach ist der Warenkorb leer.
  - Preis- und Bestandsänderung in Shopify durchspielen.
  - Token widerrufen: Der Build muss abbrechen.
- **Stufe 2, am Umzugstag** (Teil B in `SEO-PHASE0-KUNDE.md`): erneuter Testkauf; `checkoutUrl` muss auf `checkout.royalspices.de` zeigen.
- **Stufe 3, laufend:** Smoke-Test nach jedem Build: `node tools/qa/freshness.mjs dist/client` (seit T-20261018-13, Exit 1 = neu bauen). Der automatische Neubau (B1b) fehlt noch.

Übertrag nach `dev`:

- Erledigt am 18.10. (T-20261018-04): T-01 und T-02 sind als `5633590` in `dev`, nach Freigabe des Nutzers gepusht; Pages-Deploy 19:18 erfolgreich.
- Vor jedem weiteren Übertrag erst `git fetch` und `git status -sb` im Desktop-Klon, Push nur nach Rückfrage.

## Analyse der offenen Befunde B1–B6 (Stand 18.10.2026, abends, Hauptchat 3)

Schritt 1 des Auftrags: nur gelesen und gemessen, kein Code geändert. Im Projekt `npm test` 132/132. **Vom Nutzer am 18.10. freigegeben (E1–E7 am Ende), umgesetzt als T-20261018-09 bis -13.** Je Bündel eine Transaktion. Für alle gelten die allgemeinen Abnahmekriterien aus dem Auftrag: `npm test` grün mit neuen Tests und roter Gegenprobe, `astro check` 0/0/0, Build ohne Store grün, Build mit Fixture-Store und `live-text.mjs` 0 offen. Außerdem nie HTML aus Shopify, die CSP bleibt unverändert, kein JS-Tracking, und `SHOPIFY.md` sowie diese Datei werden nachgezogen.

**Vorab, für die Planung:**
- **ID doppelt:** `T-20261018-04` steht zweimal in `_agent/LOG.md`, einmal als Flüssig-Reservierung und einmal als Übertrag nach `dev`. Neue IDs deshalb ab `T-20261018-06`.
- **Konflikt in der Schreibmenge:** `T-20261018-05` (Flüssig, `OFFEN`, reserviert) schreibt `src/components/home/HomeJourney.astro` und `docs/STATUS.md`. B2 braucht `HomeJourney.astro`. In `STATUS.md` schreibt keine Shopify-Transaktion, den Eintrag macht der Hauptchat nach Abstimmung.
- **Fixture-Store-Build:** Er geht nur mit `_agent/staging/T-20261018-02/hilfsskripte/fake-sf.mjs` (Aufruf in deren `ERGEBNIS.md`). Das Skript liegt nicht im Projekt.
- **Varianten heute:** Jedes Produkt hat genau eine Variante (Fixture: 12,90 € / RS-SAF-HN-1G, 8,90 € / RS-SAF-HN-05).

### B1 – Kein automatischer Neubau (H8)

**B1a erledigt (T-20261018-13, 18.10.), vorgezogen vor B2 (E6):** `tools/qa/freshness.mjs` ist neu. Es nutzt `storefront.ts` (samt Versions-Wache), `formatMoney` und `unitPriceLabel`, sodass Format und Grundpreis-Zeile genau wie im Build entstehen. Gegen echte Builds: Build und Fixture gleich → „keine Abweichungen“, Exit 0. Geänderte Fixture (1 g 12,90 → 13,90 €, 0,5 g ausverkauft) → 8 Abweichungen auf `/`, `/produkte/` und beiden Produktseiten (sichtbar und `Offer`), Exit 1. In `npm test` laufen beide Fälle sowie Grundpreis, neue und entfernte Produkte und „kein Build → Exit 2“, mit Seiten im Markup des Builds (`tests/freshness.test.mjs`). Ein Test prüft, dass die Komponenten die gelesenen Anker noch haben. Offen aus „Klären wir“: ob `freshness.mjs` den Deploy stoppt oder nur meldet. Das legen wir mit dem Hoster fest (B1b).

- **Ursache:** Preis und Bestand kommen beim Build aus `getCatalog()` (`src/lib/commerce/catalog.ts`) in `HomeCollection.astro` (Z. 75), `product/ProductCard.astro` (Z. 20), `BuyBox.astro` (Z. 34) und ins `Offer` (`catalog.ts` Z. 132 → `src/lib/seo/schema.ts` Z. 308). Live nachgeladen wird nur auf der Produktseite (`src/scripts/commerce.ts` Z. 144–151), und dort nur Preistext und Verfügbarkeit, nicht das JSON-LD.
  - Folge nach einer Preisänderung in Shopify: Die Produktseite zeigt nach dem Laden den neuen Preis, ihr `Offer` den alten. Das ist genau die Preisabweichung, die das Merchant Center bemängelt.
  - Startseite und `/produkte/` zeigen dem Kunden den alten Preis.
- **Vorschlag in zwei Teilen:**
  - **B1a, jetzt und unabhängig vom Hoster:** `tools/qa/freshness.mjs` (neu) vergleicht die gebauten Seiten mit der Storefront API: sichtbaren Preis, Verfügbarkeit, `Offer.price` und `Offer.availability`. Ausgabe je Seite, bei Abweichung Exit 1. Das wird der fehlende Smoke-Test „Stufe 3“ und dient als Wächter für Zeitplan und Hook.
  - **B1b, sobald der Hoster feststeht:** Shopify-Webhook (Produkt angelegt, geändert, gelöscht; Bestand) auf den Deploy-Hook, dazu ein nächtlicher Neubau als Netz. Ein fehlgeschlagener Build lässt den letzten Deploy online.
- **Alternativen:**
  - (i) Nur nächtlicher Neubau: Daten bis zu 24 h alt.
  - (ii) Preise auch auf Start- und Listenseite per JS nachladen: Jede Seite fragt dann bei Shopify an (Datenschutz), das JSON-LD bleibt trotzdem alt. Nicht empfohlen.
  - (iii) Das JSON-LD per JS mitziehen: Ob das Merchant Center das liest, ist unsicher. Nicht empfohlen.
  - (iv) Eigener Hook-Endpunkt in `server.mjs` mit HMAC-Prüfung, der selbst neu baut: nur bei eigenem Server (VPS) sinnvoll und aufwendig.
- **Musskriterien B1a:**
  - Build mit Fixture-Store, dann `freshness.mjs` gegen dieselbe Fixture: 0 Abweichungen, Exit 0.
  - Gegen eine geänderte Fixture (Preis 12,90 → 13,90 €, 0,5 g ausverkauft): Gemeldet werden `/`, `/produkte/` und beide Produktseiten (sichtbar und `Offer`), Exit 1.
  - Beide Fälle laufen in `npm test`.
  - Die Website selbst macht keine neue Anfrage.
- **Musskriterien B1b:** Nach einer Preisänderung in Shopify zeigen alle Seiten und das `Offer` den neuen Preis, mit Hook innerhalb von X Minuten, nachts spätestens nach 24 h. X legen wir mit dem Hoster fest. Danach meldet `freshness.mjs` 0.
- **Klären wir:**
  - Welche Webhook-Themen braucht es? Löst eine reine Bestandsänderung einen Produkt-Webhook aus? Das am Store prüfen.
  - Entprellen: Jede Bestellung ändert den Bestand.
  - Soll `freshness.mjs` den Deploy stoppen oder nur melden?
- **Wartet auf Kunde/Hoster:**
  - Wahl des Hosters (H1, H8): Gibt es Deploy-Hook oder Zeitplan?
  - Wer legt den Webhook im Shopify-Admin an?
  - Nutzt der Kunde das Merchant Center überhaupt?
- **Aufwand:** B1a M (2–4 h), B1b S, sobald der Hoster feststeht.

### B2 – Handles fest im Code

**Erledigt (20.10.2026, T-20261018-12 `ÜBERNOMMEN`, Backup in `_agent/staging/T-20261018-12/backup/`):**
- **Eine Quelle:** Beide Handles stehen nur in `src/config/handles.mjs` (`HANDLES`, `HANDLE_USES`, `productPath`, `missingHandles`). Daraus lesen:
  - `HomeCollection.astro` und `HomeJourney.astro`
  - `product.ts` (Schlüssel und Handelsformat)
  - `redirects.mjs` (alte 1-g-Seite)
  - `tools/qa/{a11y,perf}.mjs`
- **Wache:** Sie steht in `catalog.ts`, im Zweig mit Store, vor den Wachen für Varianten und Grundpreis. Die Meldung nennt den Handle und die Dateien. Kundenregel und Ablauf beim Umbenennen stehen in `SHOPIFY.md`, „Handles“.
- **Geprüft in der Prüfkopie**, Vorher und Nachher aus derselben Kopie:
  - grep findet jeden Handle in `src` nur in `handles.mjs`.
  - Fixture ohne das 1-g-Produkt: Exit 1 mit Handle und 4 Dateien. Ohne das 0,5-g-Produkt: Exit 1 mit 2 Dateien.
  - Vollständige Fixture: Build grün, `live-text.mjs` 0 offen.
  - Ohne Store: `index.html` byte-gleich, 16/16 HTML-Dateien gleich.
  - `npm test` 185/185 (8 neue in `tests/handles.test.mjs`), `astro check` 0/0/0.
  - Rote Gegenprobe: Mit dem alten `catalog.ts` scheitern die Wachentests.
  - Im Projekt nach der Übernahme `npm test` 185/185.
- **Zusätzlich geändert:** `tests/redirects.test.mjs`, eine Zeile. Der Servertest kopiert jetzt `handles.mjs` mit in seinen Temp-Ordner, die Erwartungen sind unverändert.
- **Beim Deploy:** `src/config/handles.mjs` muss mit `redirects.mjs` neben `server.mjs` liegen.
- **Bewusst wörtlich bleiben:** `tools/live/rules.mjs`, `tools/seo/legacy-urls.txt`, Tests und Fixtures.

Die Liste unten ist der Befund vom 18.10. Ihre Zeilennummern gelten nicht mehr.

- **Ursache:** Es sind mehr als 5 Stellen.
  - `HomeCollection.astro` Z. 18/19 und 30/31
  - `HomeJourney.astro` Z. 79 und 132
  - `src/data/product.ts`: Schlüssel Z. 71 und 88, `formats[0].action.href` Z. 147 (Startseite, Handelsformate)
  - `src/config/redirects.mjs` Z. 45
  - QA-Listen in `tools/qa/a11y.mjs` Z. 9 und `perf.mjs` Z. 20
  - `tools/live/rules.mjs` und die Tests beziehen sich auf die Live-Aufnahme und bleiben fest.
  - Die Produktseiten entstehen aus dem Katalog (`produkte/[handle].astro`). Fehlt ein Handle, führen die festen Links in einen 404, und der Build merkt es nicht. Die Karte der Startseite verliert dann still ihren Preis.
  - `/products/<alt>` leitet generisch auf `/produkte/<alt>/` (`redirects.mjs` Z. 52), nach einer Umbenennung also auf einen 404.
- **Konkretes Risiko:** Der Handle `…-1-g-grade-a` widerspricht „Grade 1“ (D3/D4). Korrigiert der Kunde bei O6 auch den Handle, brechen 6 Links.
- **Vorschlag:**
  - Eine Quelle `src/config/handles.mjs` (neu, `.mjs`, damit auch `server.mjs` und `redirects.mjs` sie laden können), von allen Stellen genutzt.
  - Dazu eine Wache im Build mit Store: Jeder dort genannte Handle muss im Katalog stehen, sonst bricht der Build ab, mit Handle und Fundstelle. Das folgt dem Prinzip „API-Fehler bricht den Build ab“, der letzte Deploy bleibt online.
  - In `SHOPIFY.md` eine Regel für den Kunden: Handles nicht ändern. Wenn doch, uns vorher Bescheid geben; dann kommt in `redirects.mjs` eine Zeile alt → neu.
- **Alternativen:**
  - (i) Rückfall statt Abbruch: Die Karte verlinkt `/produkte/` und der Build warnt. Preisaktualisierungen laufen dann weiter, der Fehler fällt aber kaum auf.
  - (ii) Die Startseite wählt die Produkte aus einer Shopify-Kollektion oder einem Metafeld. Die Karten tragen aber eigene Texte und Bilder je Produkt, also lohnt sich das erst mit den Metafeldern (§21).
- **Musskriterien:**
  - `grep -rln '<handle>' src` findet jeden Handle in genau einer Datei.
  - Fixture ohne das 1-g-Produkt: Der Build bricht mit Meldung ab (bzw. fällt zurück, je nach E2). Mit vollständiger Fixture ist er grün.
  - Build ohne Store: `dist/client/index.html` ist byte-gleich zu vorher.
  - `tests/redirects.test.mjs` bleibt grün.
- **Klären wir:** Abbruch oder Rückfall (E2)? Reihenfolge zu T-05 (E6)? Sollen die QA-Listen den Handle aus `handles.mjs` lesen?
- **Wartet auf den Kunden:** Bleiben die Handles, so wie sie sind?
- **Aufwand:** M (2–3 h).

### B3 – Nur die erste Variante kaufbar

**Erledigt (T-20261018-10, 18.10.):** Wache und Doku nach E2/E4. Die Abfrage holt `variants(first: 2)`, und `ListedProduct.variantCount` trägt die Anzahl. `loadCatalog` bricht ab: „Shopify-Produkt mit mehr als einer Variante: <Handle>. … Build abgebrochen.“ Der Build mit Fixture und 2 Varianten bricht ab (Exit 1). Mit einer Variante ist das HTML gleich zu vorher, bis auf die Hash-Namen der Client-Skripte: `storefront.ts` steckt auch im Browser-Bundle. `SHOPIFY.md` hat jetzt den Abschnitt „Varianten“, und der Ablauf beschreibt keine Variantenwahl mehr.

- **Ursache:**
  - Die Build-Abfrage holt `variants(first: 1)` (`storefront.ts` Z. 52). `catalog.ts` Z. 45–57 übernimmt Preis, SKU und `variantId` der ersten Variante, `BuyBox.astro` Z. 29 legt sie in `data-variant-id`.
  - Die Laufzeitabfrage `product` holt zwar `first: 50` (Z. 72), aber `commerce.ts` Z. 148 sucht nur die Build-Variante.
  - `SHOPIFY.md` Z. 23 und 29 beschreibt eine Variantenwahl, die es nicht gibt.
  - Heute ohne Folgen, weil jedes Produkt genau eine Variante hat. Legt der Kunde Varianten an, sind sie unsichtbar und nicht kaufbar, Preis und `Offer` zeigen nur die erste.
- **Vorschlag:**
  - Wache und Doku: Die Abfrage holt `variants(first: 2)`. Hat ein Produkt mehr als eine Variante, bricht der Build ab, mit Handle und Hinweis.
  - `SHOPIFY.md` beschreibt den Ablauf ohne Variantenwahl und nennt den Weg, wenn Varianten kommen.
- **Alternative:** Eine echte Variantenwahl (Auswahl, Preis je Variante, `?variant=`, mehrere `Offer`, Tastatur und Screenreader). Groß, 1–2 Tage. Erst bauen, wenn der Kunde Varianten plant. §20 der Spezifikation sieht sie vor.
- **Musskriterien:**
  - Fixture mit 2 Varianten bricht den Build mit Meldung ab, Test rot/grün.
  - Mit einer Variante sind die Produktseiten byte-gleich zu vorher.
  - In `SHOPIFY.md` steht keine Variantenwahl mehr als vorhanden.
- **Klären wir:** Abbruch oder Warnung (E2)?
- **Wartet auf den Kunden:** Sind Varianten geplant (z. B. 1 g, 2 g, 5 g in einem Produkt)?
- **Aufwand:** S (1–2 h).

### B4 – Grundpreis fehlt

**Erledigt (T-20261018-11, 18.10.):** datengetrieben nach E2/E5. Neues Modul `src/lib/commerce/unit-price.ts` mit Format, Wache, Live-Zeile und den Mengen für das JSON-LD. Format „Grundpreis 17.800,00 €/kg“ (Option 1 der Formatfrage), an allen Preisstellen und in der Live-Aktualisierung. Passt der Live-Wert nicht, wird die Zeile ausgeblendet. Die Wache prüft zusätzlich die Menge gegen das Nettogewicht in `product.ts`. Nur so fällt der Live-Fall auf: Dort steht 1 g statt 0,5 g, und Shopify rechnet daraus stimmig 8.900 €/kg. Beide 8.900-Fälle (1 g und 0,5 g) brechen den Build ab. `Offer.priceSpecification` folgt Googles Muster (Produktpreis, `referenceQuantity` 0,5 GRM, `valueReference` 1 KGM). Mit synthetischer Fixture ist `seo.mjs --store --no-browser` S2 grün, der einzige Fehler ist der bekannte S10-Treffer „Große Wirkung“ (E6, Kunde). Ohne Grundpreis ist das HTML gleich bis auf die Hash-Namen unter `/_astro/` (`commerce.ts` geändert). Dafür steht der Import von `unit-price` in `commerce.ts` hinter dem CSS-Import, sonst verschiebt sich die Reihenfolge des eingebetteten CSS. `tools/live/rules.mjs`: Begründung zu „Grundpreis“ aktualisiert, die Ausnahme bleibt. Nicht im Browser geprüft: die Live-Aktualisierung gegen einen Store (geprüft per Test von `liveUnitPriceLabel`).

- **Ursache:**
  - Weder die Build- noch die Laufzeitabfrage liest `unitPrice` oder `unitPriceMeasurement` (`storefront.ts` Z. 47–76), und die Typen kennen sie nicht (`types.ts`).
  - In `tools/live/rules.mjs` sind Z. 57, 75 und 83 als Ausnahme „OFFEN beim Kunden“ geführt.
- **Neu gemessen:** Der Live-Shop zeigt für das 0,5-g-Glas zu 8,90 € „Grundpreis €8.900,00/kg“ (`LIVE-INVENTAR.md` Z. 355 und 417). Rechnerisch sind es 17.800 €/kg, also Faktor 2. Vermutlich ist in Shopify 1 g statt 0,5 g als Menge eingetragen. Übernehmen wir den Wert ungeprüft, zeigen wir einen falschen Grundpreis.
- **Vorschlag, datengetrieben:**
  - Beide Abfragen lesen `unitPrice` und `unitPriceMeasurement`. Liefert Shopify einen Grundpreis, steht er neben jedem Preis: Startseitenkarte, `/produkte/`, BuyBox, Live-Aktualisierung in `commerce.ts`. Liefert Shopify keinen, bleibt die Seite wie heute.
  - Plausibilitätsprüfung im Build: Grundpreis gleich Preis ÷ Menge × Bezugsmenge, auf 1 Cent genau. Sonst bricht der Build ab, mit den Zahlen.
  - Ob ein Grundpreis überhaupt angezeigt werden muss, entscheidet so der Kunde in Shopify (Rechtsfrage). Der Code rechnet nichts selbst aus.
- **Alternativen:**
  - (i) Den Grundpreis aus dem Gewicht in `product.ts` berechnen: Das verstößt gegen „Preise nur aus Shopify“. Verworfen.
  - (ii) Warten, bis die Rechtsfrage geklärt ist: kein Code, Ausnahme bleibt offen.
  - Optional: `priceSpecification` (`UnitPriceSpecification`) im `Offer`.
- **Musskriterien:**
  - Fixture ohne Grundpreis: HTML byte-gleich zu vorher.
  - Fixture mit 0,5 g, 8,90 € und Bezug 1 kg, 17.800 €/kg: Der Grundpreis steht an allen 3 Preisstellen und in der Live-Aktualisierung.
  - Fixture mit 8.900 €/kg: Der Build bricht ab.
  - Bei gewähltem JSON-LD: `Offer` und Sichtbares stimmen überein, `seo.mjs --store` grün.
  - `live-text.mjs` 0 offen.
  - Die Fixture-Werte für den Grundpreis sind synthetisch: `.raw/live-20261015/products.json` enthält keine. Das wird im Test benannt.
- **Klären wir:** Format („17.800,00 €/kg“ oder „… € / 1 kg“), JSON-LD ja oder nein, Abbruch oder Warnung (E2).
- **Wartet auf den Kunden:**
  - Rechtliche Klärung der Grundpreispflicht. Vermutet ist eine Ausnahme unter 10 g Nenngewicht (`UEBERGABE-SEO.md` Z. 53). Wir beraten nicht rechtlich.
  - Korrektur der Grundpreis-Angabe beim 0,5-g-Produkt in Shopify.
- **Aufwand:** M (3–4 h).

### B5 – API-Version 2026-07

**Erledigt (T-20261018-10, 18.10.):** `checkApiVersion()` in `storefront.ts`, nur in `products()`, also nur beim Build. Gleicher Header ist ok, fehlender ebenso (E5). Ein abweichender Header bricht den Build ab mit „version: API version 2026-07 requested, Shopify answered with 2026-10“. Geprüft per Test und per Build mit Header-Stellvertreter. Der Warenkorb im Browser prüft nicht. Ein Test sichert, dass die Version im Code nur in `config.ts` steht. `SHOPIFY.md` nennt Termin (April 2027) und Ablauf, `.env.example` verweist darauf.

- **Ursache:**
  - Die Version steht an drei Stellen: `config.ts` Z. 12 als Rückfall, `.env.example` und `SHOPIFY.md` Z. 67.
  - Setzt der Hoster `PUBLIC_SHOPIFY_API_VERSION`, gewinnt dessen Wert.
  - Nach Shopify-Doku wird jede Version mindestens 12 Monate unterstützt. Danach leitet Shopify Anfragen still auf die älteste noch unterstützte Version weiter, das Verhalten ändert sich also unbemerkt.
- **Vorschlag:**
  - Der Storefront-Client vergleicht beim Build die angefragte Version mit dem Antwort-Header `X-Shopify-API-Version`. Weichen sie ab, bricht der Build mit beiden Versionen in der Meldung ab. Das ist eine Wache ohne Zeitbombe, sie schlägt erst an, wenn Shopify wirklich umleitet.
  - Dazu ein Termin in `SHOPIFY.md`: Umstellung bis April 2027, mit Schritten (Tests, Testkauf).
- **Alternativen:**
  - (i) Ein Test, der ab einem Datum rot wird: Das macht Builds unreproduzierbar. Nicht empfohlen.
  - (ii) Nur Doku und Kalendereintrag.
  - (iii) Gleich auf die neueste stabile Version stellen. Dann zuerst prüfen, ob 2026-10 schon stabil ist.
- **Musskriterien:**
  - Test mit Stellvertreter: Header gleich → ok, Header abweichend → Fehler, Header fehlt → ok (E5).
  - Die Version steht im Code an genau einer Stelle.
  - `SHOPIFY.md` nennt Termin und Ablauf.
- **Klären wir:** Sendet die Storefront API den Header wirklich? Das prüfen wir in Stufe 1 am echten Store. Bis dahin ist „Header fehlt → ok“ nötig.
- **Wartet auf den Hoster:** Wer pflegt die Version in dessen Umgebungsvariablen?
- **Aufwand:** S (1 h).

### B6 – `seo.mjs` liest nur die Prozessumgebung

**Erledigt (T-20261018-09, 18.10.):** nach (a). `storeDomainFromEnv()` in `tools/qa/seo.mjs` liest über `loadEnv('production', <Projekt>)`, die Prozessumgebung gewinnt. In `.env.example` ist `SITE_URL` auskommentiert, mit dem Hinweis „nur Prozessumgebung“; der Shopify-Block nennt `.env` oder Prozessumgebung. Neuer Test `tests/seo-env.test.mjs` (5 Fälle, Kindprozess): `npm test` 137/137. Gegenprobe mit dem alten Lesen (`process.env`): Der Fall „nur in `.env`“ wird rot. `astro check` 0/0/0, beide Builds HTML-gleich zu vorher, `live-text.mjs` 0 offen.

- **Ursache:**
  - `tools/qa/seo.mjs` Z. 91 liest `PUBLIC_SHOPIFY_STORE_DOMAIN` nur aus `process.env`. Steht die Domain nur in `.env`, wertet S7 (Z. 279) die Anfragen an Store und CDN als fremd: ein falsches Rot.
  - `SITE_URL` (Z. 62) liest die Prozessumgebung wie `astro.config.mjs` Z. 24. Das ist in sich stimmig, aber `.env.example` Z. 2 führt `SITE_URL`, und in `.env` wird sie ignoriert (`tests/build-env.test.mjs` Z. 67). Die Beispieldatei führt also in die Irre.
  - `tools/seo/indexnow.mjs` Z. 86 liest `SITE_URL` genauso.
- **Vorschlag (a):** `seo.mjs` liest die Store-Domain über `loadEnv`, wie `astro.config.mjs`, die Prozessumgebung gewinnt. In `.env.example` steht ein Kommentar: `SITE_URL` wirkt nur aus der Prozessumgebung.
- **Alternative (b):** `SITE_URL` überall über `loadEnv` lesen: `astro.config.mjs` Z. 24, `seo.mjs`, `indexnow.mjs`, Test Z. 67. Das ist einheitlicher, aber die drei Dateien müssen gleich bleiben. Die CI setzt `SITE_URL` als Prozessvariable, Pages bleibt davon unberührt.
- **Musskriterien:**
  - Test per Kindprozess wie `build-env.test.mjs`: Steht die Domain nur in `.env`, gilt sie in S7 als erlaubt. Ohne den Fix ist der Test rot.
  - Die Prozessumgebung gewinnt.
  - `.env.example` beschreibt das Verhalten richtig.
- **Klären wir:** (a) oder (b) (E3).
- **Wartet auf Kunde/Hoster:** nichts.
- **Aufwand:** S (1 h).

### Reihenfolge und Bündel (Vorschlag)

| Nr. | Bündel | Befunde | Schreibmenge (Kern) | Begründung |
| --- | --- | --- | --- | --- |
| 1 | T-06 | B6 | `tools/qa/seo.mjs`, `.env.example`, neuer Test (bei (b) auch `astro.config.mjs`, `tools/seo/indexnow.mjs`, `tests/build-env.test.mjs`) | Klein und unabhängig. Wird für die Abnahme mit echtem Store (Stufe 1, `seo.mjs --store`) gebraucht. |
| 2 | T-07 | B3 + B5 | `src/lib/commerce/{storefront,config,catalog}.ts`, `tests/commerce.test.mjs`, `.env.example` | Beide härten die Storefront-Abfrage und machen stilles Fehlverhalten laut. Dieselben Dateien, also eine Transaktion. |
| 3 | T-08 | B4 | `storefront.ts`, `types.ts`, `catalog.ts`, `BuyBox.astro`, `ProductCard.astro`, `HomeCollection.astro`, `src/scripts/commerce.ts`, ggf. `schema.ts`, Fixture, `tools/live/rules.mjs` | Baut auf der Abfrage aus T-07 auf. Gebaut wird datengetrieben, die Anzeige bleibt aus, bis Shopify liefert. |
| 4 | T-09 | B2 | `src/config/handles.mjs` (neu), `HomeCollection.astro`, `HomeJourney.astro`, `product.ts`, `redirects.mjs`, `catalog.ts`, Tests | Teilt `HomeCollection.astro` und `catalog.ts` mit T-08, also danach. `HomeJourney.astro` ist erst nach T-05 frei (E6). |
| 5 | T-10 | B1a | `tools/qa/freshness.mjs` (neu), Test | Prüft am Ende alles, auch den Grundpreis. Die Schreibmenge ist disjunkt, deshalb könnte das Bündel auch früher oder parallel laufen. |
| – | später | B1b | Hoster-Konfiguration, Doku | Wartet auf den Hoster. |

Die Doku (`SHOPIFY.md`, diese Datei) zieht der Hauptchat je Transaktion beim COMMIT nach. Deshalb laufen die Transaktionen nacheinander. Subagents lohnen sich höchstens für T-08 und T-10, den Rest erledigt der Hauptchat.

### Entscheidungen für die Freigabe

- **E1:** Reihenfolge und Bündel wie oben?
- **E2:** Wachen (B2 fehlender Handle, B3 mehrere Varianten, B4 unplausibler Grundpreis): Build abbrechen (Vorschlag) oder Rückfall mit Warnung?
- **E3:** B6 nach (a) (Vorschlag) oder (b)?
- **E4:** B3 nur Wache und Doku, Variantenwahl erst bei Bedarf?
- **E5:** B4 jetzt datengetrieben bauen? Mit `UnitPriceSpecification` im JSON-LD? B5: fehlenden Header dulden?
- **E6:** B2: `HomeJourney.astro` erst nach T-05, oder die Reservierung von T-05 um die zwei Links ergänzen?
- **E7:** Für den Kunden: die Grundpreis-Angabe im Shop (8.900 statt 17.800 €/kg), die Handles nicht ändern, Varianten und Merchant Center. Wer gibt das weiter?

**Freigabe des Nutzers (18.10.2026, alle wie empfohlen):**

- **E1:** Reihenfolge und Bündel wie in der Tabelle.
- **E2:** Die Wachen brechen den Build ab: fehlender Handle (B2), mehr als eine Variante (B3), unplausibler Grundpreis (B4).
- **E3:** B6 nach (a). `seo.mjs` liest die Store-Domain über `loadEnv`, die Prozessumgebung gewinnt. `SITE_URL` bleibt nur Prozessumgebung, mit Kommentar in `.env.example`.
- **E4:** B3 nur Wache und Doku, keine Variantenwahl.
- **E5:** B4 datengetrieben, mit `UnitPriceSpecification` im `Offer`. B5: Fehlt der Header `X-Shopify-API-Version`, gilt das als ok.
- **E6:** `HomeJourney.astro` erst anfassen, wenn die Flüssig-Transaktion mit dieser Datei nicht mehr `OFFEN` ist. Ist sie bei B2 noch offen, kommt B1a vorher, und B2 wartet. Das wird dem Nutzer gemeldet.
- **E7:** Die Kundenpunkte gibt der Nutzer selbst weiter.

**IDs nach der Freigabe:** Die Flüssig-Sitzung hat T-20261018-06 bis -08 inzwischen selbst belegt (Daten, Player, Werkzeuge). Die Bündel laufen deshalb unter neuen Nummern, Inhalt und Reihenfolge bleiben:

| Freigabe | ID | Befunde |
| --- | --- | --- |
| T-06 | T-20261018-09 | B6 |
| T-07 | T-20261018-10 | B3 + B5 |
| T-08 | T-20261018-11 | B4 |
| T-09 | T-20261018-12 | B2 |
| T-10 | T-20261018-13 | B1a |

„T-05“ in E6 und oben unter „Vorab“ heißt jetzt **T-20261018-07** (Flüssig Player, früher als „-05“ reserviert).
