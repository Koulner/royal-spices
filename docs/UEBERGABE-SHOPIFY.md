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
- **Stufe 3, laufend:** Smoke-Test nach jedem Build. Den gibt es noch nicht.

Übertrag nach `dev`:

- T-01 und T-02 sind übernommen, liegen aber nur auf H:, noch nicht im Repo.
- Das lokale `dev` unter Desktop steht 3 Commits hinter `origin/dev`. Vor dem Übertrag deshalb erst `git pull`.
- Push nur nach Rückfrage.
