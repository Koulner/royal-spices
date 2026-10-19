# Shopify: Status und Anschluss

**Stand 16.10.2026:** Der Store existiert (`izt0j1-cw.myshopify.com`, bisher mit Shopify-Theme auf royalspices.de). Entscheidung des Nutzers: headless, Preise aus Shopify, Grade 1. Umgesetzt mit Shopify A (T-20261016-03): `src/lib/commerce/catalog.ts` lädt beim Build die Produkte aus der Storefront API, daraus entstehen `/produkte/` und je Handle `/produkte/<handle>/` (heute `herat-negin-safran-1-g-grade-a` und `safran-herat-negin-0-5g`). Ein API-Fehler bricht den Build ab. Ohne Store entstehen die Seiten aus den Handles in `src/data/product.ts`, ohne Preis und mit Anfrageweg. Gegen den echten Store ist noch nicht gebaut worden (kein Token), nur gegen eine Fixture. Der Abschnitt „Status (06.10.2026)“ unten beschreibt die Lage vor dem Store. Entscheidungen und offene Punkte: `docs/UEBERGABE-SHOPIFY.md`; Live-Inventar mit Abgleichliste: `docs/LIVE-INVENTAR.md`.

**Stand 17.10.2026:** Die technischen Shopify-Punkte aus `docs/UEBERGABE-SHOPIFY.md` sind erledigt (T-20261017-09, -10). M1: `tools/qa/live-text.mjs` vergleicht den Live-Text wörtlich mit dem Build, mit Fixture-Store 0 offene Abweichungen; vier begründete Abweichungen (A1–A4 in `docs/LIVE-INVENTAR.md`) warten auf die Bestätigung des Nutzers. M5: keine Schlüssel im Projekt, nur `.env.example` mit Platzhaltern. M7: CSP wie unten unter „Security“, Shopify-Texte per `textContent`. Interne Hinweise (O4, O5, PRÜFEN) stehen nur noch im Quelltext, nicht im ausgelieferten HTML. Offen bleibt nur, was der Kunde in Shopify erledigt (O1, O2, O4, O6, O7) und der Testkauf (M9) mit echtem Store.

**Stand 18.10.2026:** Die Shopify-Werte dürfen jetzt auch in `.env` stehen (T-20261018-01). Bis dahin las `astro.config.mjs` nur die Prozessumgebung: Mit Werten aus `.env` war der Shop zwar aktiv, die CSP ließ aber weder die Storefront API noch `cdn.shopify.com` zu (keine Produktbilder, kein Warenkorb). Jetzt liest die Konfiguration beide Quellen über Vites `loadEnv`, wie `astro:env`; die Prozessumgebung gewinnt. Test: `tests/build-env.test.mjs`. `SITE_URL` kommt weiter nur aus der Prozessumgebung, weil `tools/qa/seo.mjs` und `tools/seo/indexnow.mjs` die Zeile `site:` lesen; `.env.example` sagt das jetzt (die Zeile ist dort auskommentiert). Seit T-20261018-09 liest `seo.mjs` die Store-Domain für S7 ebenfalls über `loadEnv` (`.env` und Prozessumgebung, die gewinnt). Steht die Domain nur in `.env`, gelten Anfragen an Store und `cdn.shopify.com` also nicht mehr fälschlich als fremd. Test: `tests/seo-env.test.mjs`.

**Stand 18.10.2026, Produktbeschreibung (T-20261018-02):** Die Storefront-Abfrage holt neben `description` auch `descriptionHtml`. Grund: `description` ist Klartext ohne Umbrüche. Änderte der Kunde den Text in Shopify, sodass er nicht mehr wörtlich zu `src/data/product.ts` passte, zeigte die Produktseite einen einzigen verklebten Absatz („…im kleinen Glas.Herat Negin…ProduktdetailsProdukt: …“), Meta-Beschreibung und JSON-LD ebenso. Jetzt liest `src/lib/commerce/rich-text.ts` das HTML beim Build in Blöcke aus reinem Text: Überschriften (h1/h2 → h2, h3–h6 → h3, nie h1), Absätze, Listen, fett, kursiv, Zeilenumbrüche. Skripte, Styles, Einbettungen, Bilder, Links und Attribute fallen weg, Linktexte bleiben. In die Seite kommt nie HTML aus Shopify, Astro escapt alles. Stimmt der Text mit `product.ts` überein, bleibt die Darstellung wie bisher. Sonst zeigt die Seite die Blöcke in derselben Optik (h2 mit Vorspann, h3-Abschnitte, Zeilen), und Meta und JSON-LD trennen die Blöcke mit Leerzeichen. Ohne `descriptionHtml` gilt eine Zeile je Absatz. Tests: `tests/rich-text.test.mjs`, `tests/commerce.test.mjs`. Die Fixture trägt `descriptionHtml` aus derselben Live-Aufnahme vom 15.10.

**Stand 18.10.2026, Wachen für Varianten und API-Version (T-20261018-10):** Die Build-Abfrage holt jetzt zwei Varianten statt einer. Hat ein Produkt mehr als eine, bricht der Build mit dem Handle ab (siehe „Varianten“). Außerdem vergleicht der Build die angefragte API-Version mit dem Antwort-Header `X-Shopify-API-Version`. Weicht sie ab, bricht der Build mit beiden Versionen ab, ein fehlender Header gilt als ok (siehe „API-Version“). Beides läuft nur beim Build, nicht im Warenkorb des Browsers. Tests: `tests/commerce.test.mjs`.

**Stand 18.10.2026, Grundpreis (T-20261018-11):** Beide Abfragen lesen jetzt `unitPrice` und `unitPriceMeasurement`. Liefert Shopify einen Grundpreis, steht er unter jedem Preis: Startseitenkarte, `/produkte/` und Produktseite, dazu in der Live-Aktualisierung. Im `Offer` steht dann eine `UnitPriceSpecification`. Ein unplausibler Grundpreis bricht den Build ab. Liefert Shopify keinen, bleibt die Seite wie bisher. Details unter „Grundpreis“.

**Stand 18.10.2026, Aktualitätsprüfung (T-20261018-13):** Preise, Grundpreis und Bestand kommen beim Build ins HTML. Nur die Produktseite lädt Preis und Bestand im Browser nach, ihr JSON-LD-`Offer` nie. Ändert der Kunde einen Preis in Shopify, bleiben Startseite, `/produkte/` und `Offer` also bis zum nächsten Build alt. Das prüft jetzt `tools/qa/freshness.mjs`: Es vergleicht den Build mit der Storefront API und listet jede Abweichung. Exit 1 heißt „neu bauen“, Exit 2 heißt Aufruf- oder API-Fehler. Geprüft werden Startseite, `/produkte/` und jede Produktseite: Preis, Grundpreis, „Ausverkauft“, `data-available`, `Offer.price` und `Offer.availability`. Dazu kommen neue Produkte ohne Seite und Seiten von Produkten, die es nicht mehr gibt. Aufruf nach dem Build mit Store:

```
node tools/qa/freshness.mjs dist/client
```

Die Shop-Werte liest es wie `astro.config.mjs` (`.env` oder Prozessumgebung). Mit `--fixture <datei.json>` nimmt es eine aufgenommene Antwort statt Shopify. Die Website selbst stellt dafür keine Anfrage. Es braucht Node mit Type-Stripping (22.18+), weil es den Code der Website nutzt (`storefront.ts`, `unit-price.ts`). Der automatische Neubau per Webhook und nächtlichem Lauf (B1b) wartet auf die Wahl des Hosters. Bis dahin ist dieses Werkzeug der Smoke-Test „Stufe 3“. Tests: `tests/freshness.test.mjs`.

**Status (06.10.2026): vorbereitet, nicht aktiv.** Es gibt noch keinen Store und keine Zugangsdaten. Die Website enthält deshalb keine Preise, keinen Warenkorb und keine simulierten Commerce-Daten. Das Produkt führt in die Anfrage.

Grundsatz der Spezifikation (§19–§21): Shopify ist die Commerce-Infrastruktur, die Website bleibt das Royal-Spices-Frontend. Produkte, Varianten, Preise, Verfügbarkeit, Warenkorb, Checkout und Bestellungen liegen in Shopify. Nichts davon wird im Frontend dupliziert.

## Was gebaut ist

| Teil | Datei | Aufgabe |
| --- | --- | --- |
| Storefront-Client | `src/lib/commerce/storefront.ts` | Storefront API (GraphQL): Produkt mit Varianten, Cart anlegen, Zeilen hinzufügen, ändern, entfernen. Ohne Abhängigkeiten. |
| Beschreibung | `src/lib/commerce/rich-text.ts` | Liest `descriptionHtml` beim Build in Blöcke aus reinem Text (Überschriften, Absätze, Listen). Nie HTML in die Seite. |
| Cart-Store | `src/lib/commerce/cart.ts` | Hält den Stand, den Shopify zurückgibt. Auf dem Gerät wird nur die Cart-ID gemerkt (`localStorage`), keine Preise und keine Bestände. |
| Konfiguration | `src/lib/commerce/config.ts` | Schaltet Commerce beim Build ein, sobald Domain und Token gesetzt sind. |
| Oberfläche | `src/scripts/commerce.ts`, `src/styles/commerce.css` | Kaufmodul auf der Produktseite (Menge, „In den Warenkorb"; je Produkt genau eine Variante, keine Auswahl) und Warenkorb als Dialog mit „Sicher bezahlen". Wird nur geladen, wenn die Seite mit Store gebaut wurde. |
| Einbindung | `src/components/BuyBox.astro`, `Header.astro` | Mit Store: Kaufmodul und Warenkorb-Knopf in der Navigation. Ohne Store: Anfrageweg. |

Ablauf, sobald aktiv (Spezifikation §20, vorerst ohne Variantenwahl, siehe „Varianten“):

```
Produktseite → Menge → „In den Warenkorb" → Warenkorb (Royal-Spices-Oberfläche)
            → „Sicher bezahlen" → checkoutUrl → Shopify Checkout (Zahlung, Bestellung)
```

Zahlung und Bestellabwicklung werden nicht selbst entwickelt. Die Website übergibt an die `checkoutUrl`, die Shopify für den Cart liefert.

## Varianten

Die Website verkauft je Produkt **genau eine Variante**. Preis, SKU, Verfügbarkeit und die ID für den Warenkorb kommen von dieser einen Variante, eine Auswahl gibt es auf der Produktseite nicht (Entscheidung E4 vom 18.10.2026). Gebinde sind heute eigene Produkte: 1 g und 0,5 g.

- **Wache:** Die Build-Abfrage holt zwei Varianten. Liefert Shopify für ein Produkt eine zweite, bricht der Build ab, mit dem Handle in der Meldung (`src/lib/commerce/catalog.ts`). Der letzte Deploy bleibt online. Ohne die Wache wäre die zweite Variante unsichtbar und nicht kaufbar gewesen, und Preis und `Offer` hätten nur die erste gezeigt.
- **Für den Kunden:** In Shopify keine zweite Variante anlegen. Ein neues Gebinde wird ein eigenes Produkt (dann auch Texte und Bild in `src/data/product.ts`).
- **Wenn Varianten gewünscht sind:** Die Variantenwahl nach §20 bauen: Auswahl, Preis je Variante, `?variant=`, je Variante ein `Offer`, bedienbar per Tastatur und Screenreader. Aufwand etwa 1–2 Tage, erst auf Auftrag.

## API-Version

Die Storefront-API-Version ist **2026-07**. Im Code steht sie nur in `src/lib/commerce/config.ts` als Rückfall. Setzt der Hoster `PUBLIC_SHOPIFY_API_VERSION`, gewinnt dessen Wert. Ein Test prüft, dass die Version im Code nur an dieser einen Stelle steht.

- **Wache:** Shopify unterstützt jede Version mindestens 12 Monate. Danach beantwortet es Anfragen still mit der ältesten noch unterstützten Version und nennt diese im Header `X-Shopify-API-Version`. Der Build vergleicht den Header mit der angefragten Version. Weichen sie ab, bricht er mit beiden Versionen ab. Fehlt der Header, gilt das als ok (Entscheidung E5). Ob die Storefront API ihn sendet, prüfen wir in Stufe 1 am echten Store.
- **Termin:** Umstellung auf eine neuere Version bis **April 2027**.
- **Ablauf:**
  1. Neue Version in `config.ts` eintragen, beim Hoster ebenso.
  2. Die Änderungsnotizen von Shopify für die Felder dieser Abfragen lesen (`src/lib/commerce/storefront.ts`).
  3. `npm test` und `astro check` laufen lassen, dann einen Build mit Store bauen.
  4. Einen Testkauf bis zur Bestellung durchspielen.

## Grundpreis

Der Grundpreis kommt **nur aus Shopify** (Variante: `unitPrice`, `unitPriceMeasurement`). Die Website rechnet keinen eigenen aus. Ob einer gezeigt wird, entscheidet der Kunde in Shopify. Ob er Pflicht ist, klärt der Kunde rechtlich, wir beraten dazu nicht (Entscheidung E5 vom 18.10.2026).

- **Anzeige:** „Grundpreis 17.800,00 €/kg“, bei einer Bezugsmenge ungleich 1 zum Beispiel „1.780,00 €/100 g“. Er steht unter dem Preis auf der Startseitenkarte (auch auf der Geschenkbox, sobald es sie gibt), auf `/produkte/` und in der BuyBox der Produktseite. Lädt die Produktseite den Preis live nach, zieht die Grundpreis-Zeile mit. Passt der neue Grundpreis nicht zum neuen Preis, wird sie ausgeblendet statt veraltet gezeigt. Code: `src/lib/commerce/unit-price.ts`.
- **Wache beim Build (E2):** Der Build bricht ab, wenn der Grundpreis nicht passt. Die Meldung nennt Handle und Zahlen. Geprüft wird:
  - Die Einheiten werden unterstützt (mg, g, kg, ml, cl, l, mm, cm, m, m²), Menge und Bezugsmenge haben dieselbe Dimension.
  - Die Währung ist dieselbe wie beim Preis.
  - Grundpreis = Preis ÷ Menge × Bezugsmenge, auf 1 Cent genau.
  - Bei Gewicht ist die Menge gleich dem Nettogewicht in `src/data/product.ts` (Etikett).
- **Warum die letzte Regel:** Live zeigte das 0,5-g-Glas am 15.10. „Grundpreis €8.900,00/kg“. Richtig sind 17.800 €/kg. Vermutlich ist in Shopify 1 g als Menge eingetragen. Shopify rechnet daraus einen in sich stimmigen, aber falschen Grundpreis. Diesen Fehler fängt nur der Vergleich mit dem Etikett. Mit dieser Angabe bricht der Build also ab, bis der Kunde die Menge in Shopify auf 0,5 g korrigiert hat.
- **JSON-LD:** Mit Grundpreis trägt das `Offer` eine `UnitPriceSpecification`, so wie Google sie liest: `price` ist der Produktpreis, `referenceQuantity` die verkaufte Menge (0,5 `GRM`), `valueReference` die Bezugsmenge (1 `KGM`). Daraus ergibt sich derselbe Grundpreis wie auf der Seite. `Offer.price` bleibt unverändert.
- **Tests:** `tests/unit-price.test.mjs`. Die Grundpreis-Werte dort sind synthetisch, denn die Live-Aufnahme in `tests/fixtures/` enthält keinen.

## Security

- Im Browser liegt ausschließlich der **öffentliche Storefront-Token**. Er ist dafür gedacht. Ein Admin-API-Token gehört nicht in dieses Projekt, auch nicht in eine `PUBLIC_`-Variable.
- Die Content-Security-Policy bleibt ohne Store bei `connect-src 'self'`. Mit Store kommen genau zwei Quellen hinzu: `https://<store-domain>` (API) und `https://cdn.shopify.com` (Produktbilder). Siehe `astro.config.mjs`; die Store-Domain kommt dort aus `.env` oder der Prozessumgebung (`loadEnv`, `tests/build-env.test.mjs`).
- Texte aus Shopify werden per `textContent` gesetzt, nie als HTML.
- Die Store-Domain wird geprüft (nur ein Hostname), bevor eine Anfrage gebaut wird.
- Mengen sind auf 1–99 begrenzt; Preise und Summen werden nie im Browser berechnet, sondern von Shopify übernommen.

## Geprüft

`npm test` (9 Tests in `tests/commerce.test.mjs`) gegen einen Stellvertreter der Storefront API:

- versionierter Endpunkt und Token-Header
- unbekanntes Produkt ergibt „nicht gefunden" statt eines Fehlers
- ungültige Store-Domain wird abgelehnt
- Transport-, HTTP-, GraphQL- und Benutzerfehler (z. B. ausverkauft) werden unterschieden
- Cart: anlegen, erweitern, Menge ändern, entfernen, Mengenbegrenzung
- Cart wiederherstellen; ein Cart, den Shopify nicht mehr kennt, wird vergessen
- Cart funktioniert auch ohne Gerätespeicher
- Geldbeträge im deutschen Format
- Wachen beim Build: mehr als eine Variante je Produkt, abweichende API-Version im Header (fehlt der Header, ist das ok); der Warenkorb im Browser prüft die Version nicht

**Nicht geprüft:** Kaufmodul und Warenkorb im Browser gegen einen echten Store, der Übergang in den Checkout, Tastatur- und Screenreader-Bedienung des Warenkorbs, Verhalten bei abgelaufenem Token. Das ist erst mit einem Store möglich und Voraussetzung für die Abnahme „Shopify: Cart/Checkout geprüft".

## Anschluss in fünf Schritten

1. **Store prüfen.** Die Produkte existieren (Handles `herat-negin-safran-1-g-grade-a` und `safran-herat-negin-0-5g`). Jedes Produkt des Kanals bekommt eine Seite. `src/data/product.ts` ergänzt per Handle die V1-Fakten und liefert die Handles für den Build ohne Store. Ein Produkt ohne Eintrag dort zeigt nur Titel und Beschreibung aus Shopify. Preis, Bestand, SKU und Versandprofil in Shopify pflegen.
2. **Vertriebskanal „Headless" hinzufügen**, das Produkt für diesen Kanal veröffentlichen und einen öffentlichen Storefront-API-Token erzeugen. Benötigte Rechte: Produkte lesen, Carts schreiben und lesen.
3. **Umgebungsvariablen beim Build setzen** (`.env.example`), entweder in `.env` oder als Umgebungsvariablen beim Hoster (die gewinnen):

   ```
   PUBLIC_SHOPIFY_STORE_DOMAIN=<name>.myshopify.com
   PUBLIC_SHOPIFY_STOREFRONT_TOKEN=<öffentlicher Token>
   PUBLIC_SHOPIFY_API_VERSION=2026-07
   ```

   Die API-Version ist bewusst fest eingetragen. Shopify veröffentlicht vierteljährlich neue Versionen. Termin und Ablauf der Umstellung stehen oben unter „API-Version“.
4. **Bauen und prüfen:** `npm run build`, `npm start`. Auf der Produktseite erscheinen Preis und Verfügbarkeit aus Shopify, in der Navigation der Warenkorb. Einen Testkauf mit Shopifys Testzahlung bis zur Bestellbestätigung durchführen.
5. **Rechtliches im Checkout:** AGB, Widerruf, Datenschutz, Versand- und Zahlungsinformationen in Shopify hinterlegen. Den Datenschutztext der Website um Shopify als Auftragsverarbeiter ergänzen (`src/pages/datenschutz.astro` ist bis dahin ein Entwurf).

## Offen, vor der Aktivierung zu klären

| Punkt | Warum |
| --- | --- |
| Grundpreis, Versandkosten, Lieferländer | Preise und SKUs stehen in Shopify (Stand 15.10.: 8,90 € / RS-SAF-HN-05, 12,90 € / RS-SAF-HN-1G) und kommen von dort. Grundpreis: Die Website zeigt ihn, sobald Shopify ihn liefert (siehe „Grundpreis“). Offen beim Kunden: die Pflicht rechtlich klären und beim 0,5-g-Glas die Menge korrigieren (live 8.900 statt 17.800 €/kg). Offen außerdem: Versandtarife in Shopify und auf `/versand-lieferung/` gleich halten |
| Welche Gebinde direkt kaufbar sind | Vorgesehen: das 1-g-Glas. Display und lose Ware bleiben beim Anfrageweg (Spezifikation §22) |
| Shopify-Plan | Erst nach den realen Anforderungen entscheiden: Preisgruppen, Märkte, Firmenkonditionen (Spezifikation §23) |
| Produktdaten als Metafelder | Herkunft, Region, Grade, Gebinde, MOQ sollen in Shopify gepflegt werden (§21). Das Frontend liest bisher Titel, Varianten, Preis und Verfügbarkeit; die beschreibenden Fakten stehen noch in `src/data/product.ts` und ziehen um, sobald die Metafelder existieren |
| Strukturierte Daten | Erledigt mit SEO-A (T-20261017-05): `Product` mit `Offer` aus dem Katalog, nur im Build mit Store und Preis > 0 |

## Später möglich, nicht Teil von V1

- **B2B:** Kataloge, Mengenregeln und Firmenpreise über Shopify B2B. Der Anfrageweg auf `/b2b/` bleibt bis dahin der Handelseinstieg.
- **Kundenkonten:** über Shopifys Customer Account API; kein eigenes Login-System (Spezifikation §24).
