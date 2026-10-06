# Architektur

Grundsatz: **Content first, Enhancement second.** Jede Seite ist fertiges HTML. JavaScript ergänzt drei Dinge: die Hero-Fahrt, das kompakte Menü, die Formular-Rückmeldung. Fällt eines davon aus, bleibt die Seite vollständig benutzbar.

## Überblick

```
Browser
  │  HTML/CSS (vorgerendert)            ← alle Seiten
  │  nav.ts · journey.ts · forms.ts     ← Enhancement, zusammen < 10 kB
  │  commerce.ts                        ← nur wenn ein Shopify-Store konfiguriert ist
  ▼
server.mjs (Node)
  ├─ Security-Header, Kompression, Caching
  ├─ statische Auslieferung aus dist/client
  └─ /api/anfrage/  → Astro-Handler → Schema → Rate-Limit → Zustellung (SMTP)

Shopify (sobald vorhanden)
  Browser ──Storefront API (öffentlicher Token)──▶ Produkte, Varianten, Preise, Cart
  Browser ──checkoutUrl──▶ Shopify Checkout (Zahlung, Bestellung)
```

Framework: Astro 7, `output: 'static'` mit Node-Adapter im Middleware-Modus. Kein UI-Framework, keine State-Library. Laufzeit-Abhängigkeiten: `astro`, `@astrojs/node`, `@astrojs/sitemap`, `nodemailer` (nur Server).

## Verzeichnisse

| Pfad | Aufgabe |
| --- | --- |
| `src/pages/` | Eine Datei je Seite. `api/anfrage.ts` ist die einzige Server-Route. |
| `src/components/` | `Journey` (Hero), `Header`, `Footer`, `LabelSheet` (Produktdaten als Etikett), `InquiryForm`, `BuyBox`, `Anatomy`, `Picture`, `Sprig`, `Arrow` |
| `src/scripts/` | `journey.ts` (Hero-Fahrt), `nav.ts`, `forms.ts`, `commerce.ts` |
| `src/lib/inquiry/` | Schema, Rate-Limit, Zustellung |
| `src/lib/commerce/` | Storefront-Client, Cart-Store, Typen, Konfiguration |
| `src/data/` | Inhalte: Produktfakten, Catering-Katalog, Hero-Kapitel; generierte Manifeste (`stills.json`, `hero-manifest.json`) |
| `src/config/` | Firmendaten, Navigation, Launch-Schalter |
| `src/styles/global.css` | Design-Tokens und gemeinsame Muster |
| `pipeline/blender/` | Web-Ableitung aus dem Blender-Master |
| `pipeline/images/` | Renderings → WebP/AVIF + Manifeste |
| `tools/qa/` | Screenshots, Accessibility-Lauf, Accessibility-Baum, Hero-Fahrt und Fallback, Performance-Lauf über das Chrome-DevTools-Protokoll; SMTP-Versand gegen einen lokalen Test-Mailserver |
| `tests/` | Unit-Tests |
| `server.mjs` | Produktions-Einstieg |

## Seiten (V1-Informationsarchitektur)

| URL | Aufgabe |
| --- | --- |
| `/` | Hero-Fahrt, Herkunft, Was Safran ist, Produkt, Qualität, Handel, Catering-Hinweis, Abschluss |
| `/produkte/` | Drei Gebinde, redaktionell statt Raster |
| `/produkte/safran-negin-1g/` | Produktdetail: Visual, Kauf-/Anfragemodul, Etikettdaten, Fäden, Verpackung, Dokumente |
| `/herkunft-qualitaet/` | Herkunft, Pflanze (annotiert), frisch vs. getrocknet, Negin, Nachweise, Verpackung |
| `/handel/` | Gebinde-Tabelle, Ablauf Anfrage → Angebot, Formular |
| `/gastronomie/` | Gebinde für Betriebe, Lagerung, eigene Gerichte, Formular |
| `/catering/` | Leistungen, Katalog ohne Preise, Pakete, Formular |
| `/ueber-uns/`, `/kontakt/` | Unternehmen, Haltung, Kontaktdaten, Formular |
| `/impressum/`, `/datenschutz/` | Rechtliches (Datenschutz ist Entwurf) |
| `/anfrage/gesendet/`, `/anfrage/fehler/` | Ergebnisseiten für Formulare ohne JavaScript |

## Hero-Fahrt (`Journey.astro`, `journey.ts`)

Zwei Modi, entschieden vor dem ersten Paint durch ein Inline-Skript im `<head>`:

- **statisch** (Standard: kein JavaScript, `prefers-reduced-motion`, Save-Data): Die Ankunfts-Komposition ist der Hero. Die Reise folgt als vierteiliger Bild-Essay.
- **bewegt** (`html.journey-on`): Die Bühne pinnt per `position: sticky`; das native Scrollen wird nur gelesen, nie abgefangen. Der Fortschritt wird gedämpft nachgeführt (langsames Anfahren und Auslaufen) und als Frame-Position gezeichnet. Gezeichnet wird in zwei Ebenen: in Bewegung eine dichte, kleinere Bildfolge (Überblendung der beiden nächstgelegenen Bilder, bei schnellem Scrollen aus einer ausgedünnten Auswahl), im Stillstand darüber das Bild dieser Position in voller Auflösung.

Die Reihenfolge im Dokument ist Lese- und Tastaturreihenfolge: Auftakt, „weiter / überspringen", die vier Kapitel, Ankunft. Kapitel und Ankunft liegen im bewegten Modus als eigene Ebene über der gepinnten Bühne. Im statischen Modus sind die Kapitel der Bild-Essay unter dem Hero; die Ankunft entfällt, weil sie dort der Hero selbst ist.

Details zur Bilderzeugung und zu den Qualitätsstufen: `docs/ASSETS.md`.

## Anfrage-Endpunkt — Security-Grenze

`POST /api/anfrage/` nimmt Formulardaten entgegen. Alles, was dort ankommt, gilt als nicht vertrauenswürdig.

| Maßnahme | Umsetzung |
| --- | --- |
| Nur Same-Origin | Astro `security.checkOrigin` (403 bei fremdem `Origin`) |
| Inhaltstyp | nur `application/x-www-form-urlencoded` (415) |
| Größe | 16 kB, vor dem Parsen und beim Lesen des Streams begrenzt (413) |
| Schema | `src/lib/inquiry/schema.ts`: Pflichtfelder, Längen, Zeichenklassen, Zahlen- und Datumsformate (422 mit Feldmeldungen) |
| Header-Injection | Einzeilige Felder ohne Steuerzeichen; Antwortadresse als strukturierte Adresse; Mail nur als Text |
| Rate-Limit | 8 Versuche / 10 min je Client, 120 / 10 min gesamt (429 mit `Retry-After`) |
| Bots | Honeypot-Feld und Mindest-Ausfüllzeit; Treffer erhalten eine Scheinbestätigung, zugestellt wird nichts |
| Fehler | Generische Meldungen; Details nur im Server-Log |
| Zustellung | SMTP über `SMTP_URL` + `INQUIRY_TO`. Ohne Konfiguration antwortet Produktion mit 503 und Verweis auf Telefon/E-Mail — keine Anfrage gilt als gesendet, die es nicht ist. In der Entwicklung wird nach `.data/inquiries.jsonl` geschrieben. |

Das Rate-Limit liegt im Arbeitsspeicher eines Prozesses. Bei mehreren Instanzen gehört es an den vorgelagerten Proxy oder in einen gemeinsamen Speicher; die Schnittstelle (`createRateLimiter`) bleibt gleich.

## Browser-Security

- **CSP**: `script-src` und `style-src` je Seite als `<meta>` mit SHA-256-Hashes (Astro `security.csp`), `default-src 'self'`, keine Fremdquellen. `frame-ancestors 'none'` kommt als Header aus `server.mjs`. Keine Inline-`style`-Attribute im Markup.
- **Header** (`server.mjs`): `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, HSTS sobald HTTPS erkannt ist.
- **Cookies**: keine. **Third-Party-Skripte, Tracking, Fonts von Dritten**: keine.
- **Secrets**: `SMTP_URL`, `INQUIRY_TO`, `INQUIRY_FROM` sind über `astro:env` als Server-Secrets deklariert und landen nicht im Client-Bundle. Öffentliche Variablen: nur die Shopify-Storefront-Werte.
- `X-Forwarded-*` wird ohne `TRUST_PROXY=1` verworfen (sonst wäre das Rate-Limit fälschbar).

## Hosting

Die statische GitHub-Pages-Auslieferung reicht für V1 nicht mehr: Der Anfrage-Endpunkt braucht einen Server. Benötigt wird eine Node-22-Laufzeit hinter TLS (VPS, Container-Plattform oder ein vergleichbarer Dienst) und ein SMTP-Zugang. Die Wahl des Anbieters ist offen (`docs/PRODUCT-TRUTH.md`); sie betrifft auch den Datenschutztext.

## Launch-Schalter

`SITE_INDEXABLE=1` beim Build schaltet `robots.txt` und die `robots`-Meta-Angabe von „nicht indexieren" auf den Regelbetrieb.
