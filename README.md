# Royal Spices V1

Marken- und Vertriebsauftritt für Royal Spices. Signature Moment: **Crocus → Narbe → Safran → Royal Spices** als vorgerenderte Kamerafahrt, die mit dem Scrollen läuft. Inhalte, Navigation und Handlungen sind HTML und funktionieren ohne die Fahrt.

## Starten

Voraussetzung: Node.js ≥ 22.12.

```bash
npm install
```

```bash
npm run dev
```

Vorschau unter http://127.0.0.1:4321/

Produktionsstand bauen und ausliefern (mit Security-Headern, Kompression und dem Anfrage-Endpunkt):

```bash
npm run build
```

```bash
npm start
```

Standard: http://127.0.0.1:4322/ (`HOST`, `PORT` per Umgebungsvariable).

## GitHub-Pages-Vorschau

Parallel zum Produktionsbetrieb, ohne ihn zu verändern: `.github/workflows/static.yml` baut bei jedem Push auf `prod` oder `dev` ganz normal mit `npm run build` und schreibt danach eine Kopie der statischen Seiten für die Pages-Adresse um (`tools/pages/prepare.mjs`: Repository-Pfad vor alle Links, CSP-Hashes neu berechnet). `dist/` und der Quellcode bleiben unberührt. Auf Pages fehlen der Anfrage-Endpunkt (das Formular zeigt dann seinen Fehlerhinweis) und die Security-Header aus `server.mjs`.

Lokal unter dem Repository-Pfad ansehen:

```bash
node tools/pages/prepare.mjs --site https://<user>.github.io --base /<repo>
```

```bash
node tools/pages/serve.mjs dist-pages /<repo> 4330
```

## Prüfen

```bash
npm test
```

Unit-Tests für Anfrage-Regeln (Schema, Limits, Rate-Limit, Mailtext) und die Shopify-Schicht (gegen einen Test-Stellvertreter der Storefront API).

Die QA-Läufe steuern das lokal installierte Chrome headless (keine zusätzlichen Pakete):

```bash
node tools/qa/a11y.mjs http://127.0.0.1:4321
```

```bash
node tools/qa/perf.mjs http://127.0.0.1:4322 final
```

```bash
node tools/qa/shots.mjs http://127.0.0.1:4321 .raw/shots "hero-ende|1440x900|/|p=1"
```

Hero-Fahrt vorwärts und rückwärts sowie der Ausfall der Bilddateien, an vier Viewports:

```bash
node tools/qa/journey.mjs http://127.0.0.1:4321
```

Accessibility-Baum der Startseite (Lesereihenfolge, Namen, Menü):

```bash
node tools/qa/axtree.mjs http://127.0.0.1:4321
```

Anfrage-Versand über SMTP gegen einen lokalen Test-Mailserver (braucht einen Build):

```bash
node tools/qa/smtp.mjs
```

Wie stark sich das Bild von einem Hero-Frame zum nächsten ändert:

```bash
node tools/qa/frame-steps.mjs
```

## Assets neu erzeugen

Die Bilder entstehen aus dem Blender-Master (`../Projektübergabe/royal-spices/blender/royal-spices-master.blend`, Blender 4.5 LTS). Der Master wird nie überschrieben; alle Web-Anpassungen stehen in `pipeline/blender/web_hero.py`.

```bash
bash pipeline/blender/queue-all.sh
```

rendert Standbilder und beide Basis-Fahrten (auf dieser Maschine rund sechs Stunden, fortsetzbar).

```bash
bash pipeline/blender/queue-inbetweens.sh
```

rendert die Zwischenbilder für die schnellen Abschnitte der Fahrt (rund sechs Stunden, fortsetzbar). Danach bzw. zwischendurch:

```bash
npm run assets:stills
```

```bash
npm run assets:hero
```

## Vor dem Launch

Die Seite ist bewusst **nicht zur Indexierung freigegeben** (`robots.txt: Disallow`, `noindex`). Freigabe erst mit `SITE_INDEXABLE=1` beim Build, wenn die offenen Punkte in `docs/PRODUCT-TRUTH.md` und `docs/QA.md` geklärt sind.

## Dokumentation

| Datei | Inhalt |
| --- | --- |
| `docs/ARCHITECTURE.md` | Aufbau, Datenflüsse, Security-Grenzen, Hosting |
| `docs/ASSETS.md` | Asset-Strategie, 3D-/Fallback-Strategie, Änderungen gegenüber dem Blender-Master |
| `docs/PRODUCT-TRUTH.md` | Bestätigte Produktdaten und offene Punkte |
| `docs/SHOPIFY.md` | Commerce-Status und Anschluss des Stores |
| `docs/QA.md` | Prüfprotokoll: Breakpoints, Performance, Accessibility, Definition of Done, Einschränkungen |
| `docs/STATUS.md` | Aktueller Arbeitsstand: was läuft, was geprüft ist, was fehlt |
