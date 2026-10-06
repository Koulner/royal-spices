# Shopify: Status und Anschluss

**Status (06.10.2026): vorbereitet, nicht aktiv.** Es gibt noch keinen Store und keine Zugangsdaten. Die Website enthält deshalb keine Preise, keinen Warenkorb und keine simulierten Commerce-Daten. Das Produkt führt in die Anfrage.

Grundsatz der Spezifikation (§19–§21): Shopify ist die Commerce-Infrastruktur, die Website bleibt das Royal-Spices-Frontend. Produkte, Varianten, Preise, Verfügbarkeit, Warenkorb, Checkout und Bestellungen liegen in Shopify. Nichts davon wird im Frontend dupliziert.

## Was gebaut ist

| Teil | Datei | Aufgabe |
| --- | --- | --- |
| Storefront-Client | `src/lib/commerce/storefront.ts` | Storefront API (GraphQL): Produkt mit Varianten, Cart anlegen, Zeilen hinzufügen, ändern, entfernen. Ohne Abhängigkeiten. |
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
- Die Content-Security-Policy bleibt ohne Store bei `connect-src 'self'`. Mit Store kommen genau zwei Quellen hinzu: `https://<store-domain>` (API) und `https://cdn.shopify.com` (Produktbilder). Siehe `astro.config.mjs`.
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

1. **Store einrichten.** Produkt „Safranfäden" mit dem Handle `safran-negin-1g` anlegen (so erwartet es `src/data/product.ts`, Feld `shopifyHandle`). Variante(n) über die Option „Gebinde", z. B. „1 g". Preis, Bestand, SKU und Versandprofil in Shopify pflegen.
2. **Vertriebskanal „Headless" hinzufügen**, das Produkt für diesen Kanal veröffentlichen und einen öffentlichen Storefront-API-Token erzeugen. Benötigte Rechte: Produkte lesen, Carts schreiben und lesen.
3. **Umgebungsvariablen beim Build setzen** (`.env.example`):

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
| Preis, SKU, Versandkosten, Lieferländer | Pflichtangaben für den Verkauf; stehen noch nicht fest (`docs/PRODUCT-TRUTH.md`) |
| Welche Gebinde direkt kaufbar sind | Vorgesehen: das 1-g-Glas. Display und lose Ware bleiben beim Anfrageweg (Spezifikation §22) |
| Shopify-Plan | Erst nach den realen Anforderungen entscheiden: Preisgruppen, Märkte, Firmenkonditionen (Spezifikation §23) |
| Produktdaten als Metafelder | Herkunft, Region, Grade, Gebinde, MOQ sollen in Shopify gepflegt werden (§21). Das Frontend liest bisher Titel, Varianten, Preis und Verfügbarkeit; die beschreibenden Fakten stehen noch in `src/data/product.ts` und ziehen um, sobald die Metafelder existieren |
| Strukturierte Daten | Das `Product`-JSON-LD enthält bewusst kein Angebot (`offers`). Es wird ergänzt, sobald Preis und Verfügbarkeit aus Shopify kommen |

## Später möglich, nicht Teil von V1

- **B2B:** Kataloge, Mengenregeln und Firmenpreise über Shopify B2B. Der Anfrageweg auf `/handel/` bleibt bis dahin der Handelseinstieg.
- **Kundenkonten:** über Shopifys Customer Account API; kein eigenes Login-System (Spezifikation §24).
