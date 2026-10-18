# Shopify: Status und Anschluss

**Stand 16.10.2026:** Der Store existiert (`izt0j1-cw.myshopify.com`, bisher mit Shopify-Theme auf royalspices.de). Entscheidung des Nutzers: headless, Preise aus Shopify, Grade 1. Umgesetzt mit Shopify A (T-20261016-03): `src/lib/commerce/catalog.ts` lädt beim Build die Produkte aus der Storefront API, daraus entstehen `/produkte/` und je Handle `/produkte/<handle>/` (heute `herat-negin-safran-1-g-grade-a` und `safran-herat-negin-0-5g`). Ein API-Fehler bricht den Build ab. Ohne Store entstehen die Seiten aus den Handles in `src/data/product.ts`, ohne Preis und mit Anfrageweg. Gegen den echten Store ist noch nicht gebaut worden (kein Token), nur gegen eine Fixture. Der Abschnitt „Status (06.10.2026)“ unten beschreibt die Lage vor dem Store. Entscheidungen und offene Punkte: `docs/UEBERGABE-SHOPIFY.md`; Live-Inventar mit Abgleichliste: `docs/LIVE-INVENTAR.md`.

**Stand 17.10.2026:** Die technischen Shopify-Punkte aus `docs/UEBERGABE-SHOPIFY.md` sind erledigt (T-20261017-09, -10). M1: `tools/qa/live-text.mjs` vergleicht den Live-Text wörtlich mit dem Build, mit Fixture-Store 0 offene Abweichungen; vier begründete Abweichungen (A1–A4 in `docs/LIVE-INVENTAR.md`) warten auf die Bestätigung des Nutzers. M5: keine Schlüssel im Projekt, nur `.env.example` mit Platzhaltern. M7: CSP wie unten unter „Security“, Shopify-Texte per `textContent`. Interne Hinweise (O4, O5, PRÜFEN) stehen nur noch im Quelltext, nicht im ausgelieferten HTML. Offen bleibt nur, was der Kunde in Shopify erledigt (O1, O2, O4, O6, O7) und der Testkauf (M9) mit echtem Store.

**Stand 18.10.2026:** Die Shopify-Werte dürfen jetzt auch in `.env` stehen (T-20261018-01). Bis dahin las `astro.config.mjs` nur die Prozessumgebung: Mit Werten aus `.env` war der Shop zwar aktiv, die CSP ließ aber weder die Storefront API noch `cdn.shopify.com` zu (keine Produktbilder, kein Warenkorb). Jetzt liest die Konfiguration beide Quellen über Vites `loadEnv`, wie `astro:env`; die Prozessumgebung gewinnt. Test: `tests/build-env.test.mjs`. `SITE_URL` kommt weiter nur aus der Prozessumgebung, weil `tools/qa/seo.mjs` und `tools/seo/indexnow.mjs` die Zeile `site:` lesen. Ebenso liest `seo.mjs` die Store-Domain für S7 nur aus der Prozessumgebung: für den Prüflauf mit Store die Werte dort setzen.

**Stand 18.10.2026, Produktbeschreibung (T-20261018-02):** Die Storefront-Abfrage holt neben `description` auch `descriptionHtml`. Grund: `description` ist Klartext ohne Umbrüche. Änderte der Kunde den Text in Shopify, sodass er nicht mehr wörtlich zu `src/data/product.ts` passte, zeigte die Produktseite einen einzigen verklebten Absatz („…im kleinen Glas.Herat Negin…ProduktdetailsProdukt: …“), Meta-Beschreibung und JSON-LD ebenso. Jetzt liest `src/lib/commerce/rich-text.ts` das HTML beim Build in Blöcke aus reinem Text: Überschriften (h1/h2 → h2, h3–h6 → h3, nie h1), Absätze, Listen, fett, kursiv, Zeilenumbrüche. Skripte, Styles, Einbettungen, Bilder, Links und Attribute fallen weg, Linktexte bleiben. In die Seite kommt nie HTML aus Shopify, Astro escapt alles. Stimmt der Text mit `product.ts` überein, bleibt die Darstellung wie bisher. Sonst zeigt die Seite die Blöcke in derselben Optik (h2 mit Vorspann, h3-Abschnitte, Zeilen), und Meta und JSON-LD trennen die Blöcke mit Leerzeichen. Ohne `descriptionHtml` gilt eine Zeile je Absatz. Tests: `tests/rich-text.test.mjs`, `tests/commerce.test.mjs`. Die Fixture trägt `descriptionHtml` aus derselben Live-Aufnahme vom 15.10.

**Status (06.10.2026): vorbereitet, nicht aktiv.** Es gibt noch keinen Store und keine Zugangsdaten. Die Website enthält deshalb keine Preise, keinen Warenkorb und keine simulierten Commerce-Daten. Das Produkt führt in die Anfrage.

Grundsatz der Spezifikation (§19–§21): Shopify ist die Commerce-Infrastruktur, die Website bleibt das Royal-Spices-Frontend. Produkte, Varianten, Preise, Verfügbarkeit, Warenkorb, Checkout und Bestellungen liegen in Shopify. Nichts davon wird im Frontend dupliziert.

## Was gebaut ist

| Teil | Datei | Aufgabe |
| --- | --- | --- |
| Storefront-Client | `src/lib/commerce/storefront.ts` | Storefront API (GraphQL): Produkt mit Varianten, Cart anlegen, Zeilen hinzufügen, ändern, entfernen. Ohne Abhängigkeiten. |
| Beschreibung | `src/lib/commerce/rich-text.ts` | Liest `descriptionHtml` beim Build in Blöcke aus reinem Text (Überschriften, Absätze, Listen). Nie HTML in die Seite. |
| Cart-Store | `src/lib/commerce/cart.ts` | Hält den Stand, den Shopify zurückgibt. Auf dem Gerät wird nur die Cart-ID gemerkt (`localStorage`), keine Preise und keine Bestände. |
| Konfiguration | `src/lib/commerce/config.ts` | Schaltet Commerce beim Build ein, sobald Domain und Token gesetzt sind. |
| Oberfläche | `src/scripts/commerce.ts`, `src/styles/commerce.css` | Kaufmodul auf der Produktseite (Variante, Menge, „In den Warenkorb") und Warenkorb als Dialog mit „Sicher bezahlen". Wird nur geladen, wenn die Seite mit Store gebaut wurde. |
| Einbindung | `src/components/BuyBox.astro`, `Header.astro` | Mit Store: Kaufmodul und Warenkorb-Knopf in der Navigation. Ohne Store: Anfrageweg. |

Ablauf, sobald aktiv (Spezifikation §20):

```
Produktseite → Variante → Menge → „In den Warenkorb" → Warenkorb (Royal-Spices-Oberfläche)
            → „Sicher bezahlen" → checkoutUrl → Shopify Checkout (Zahlung, Bestellung)
```

Zahlung und Bestellabwicklung werden nicht selbst entwickelt. Die Website übergibt an die `checkoutUrl`, die Shopify für den Cart liefert.

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

   Die API-Version ist bewusst fest eingetragen. Shopify veröffentlicht vierteljährlich neue Versionen; vor jeder Umstellung die Tests laufen lassen und den Kauf einmal durchspielen.
4. **Bauen und prüfen:** `npm run build`, `npm start`. Auf der Produktseite erscheinen Preis und Verfügbarkeit aus Shopify, in der Navigation der Warenkorb. Einen Testkauf mit Shopifys Testzahlung bis zur Bestellbestätigung durchführen.
5. **Rechtliches im Checkout:** AGB, Widerruf, Datenschutz, Versand- und Zahlungsinformationen in Shopify hinterlegen. Den Datenschutztext der Website um Shopify als Auftragsverarbeiter ergänzen (`src/pages/datenschutz.astro` ist bis dahin ein Entwurf).

## Offen, vor der Aktivierung zu klären

| Punkt | Warum |
| --- | --- |
| Grundpreis, Versandkosten, Lieferländer | Preise und SKUs stehen in Shopify (Stand 15.10.: 8,90 € / RS-SAF-HN-05, 12,90 € / RS-SAF-HN-1G) und kommen von dort. Offen: Grundpreis je kg für das 0,5-g-Glas (`unitPrice` fehlt in der Query, rechtlich klären), Versandtarife in Shopify und auf `/versand-lieferung/` gleich halten |
| Welche Gebinde direkt kaufbar sind | Vorgesehen: das 1-g-Glas. Display und lose Ware bleiben beim Anfrageweg (Spezifikation §22) |
| Shopify-Plan | Erst nach den realen Anforderungen entscheiden: Preisgruppen, Märkte, Firmenkonditionen (Spezifikation §23) |
| Produktdaten als Metafelder | Herkunft, Region, Grade, Gebinde, MOQ sollen in Shopify gepflegt werden (§21). Das Frontend liest bisher Titel, Varianten, Preis und Verfügbarkeit; die beschreibenden Fakten stehen noch in `src/data/product.ts` und ziehen um, sobald die Metafelder existieren |
| Strukturierte Daten | Erledigt mit SEO-A (T-20261017-05): `Product` mit `Offer` aus dem Katalog, nur im Build mit Store und Preis > 0 |

## Später möglich, nicht Teil von V1

- **B2B:** Kataloge, Mengenregeln und Firmenpreise über Shopify B2B. Der Anfrageweg auf `/b2b/` bleibt bis dahin der Handelseinstieg.
- **Kundenkonten:** über Shopifys Customer Account API; kein eigenes Login-System (Spezifikation §24).
