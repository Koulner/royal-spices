# Hero-Video: Datensatz kodieren, aufteilen, tauschen

Der Player braucht keine Codeänderung für neue Daten: Er liest nur `src/data/hero-video.json` und `public/hero/v/<satz>/`. Jede Variante hat genau einen Satz, `desktop` quer und `mobile` hoch.

## 1. Kodieren

Eingabe sind die Einzelbilder der Fahrt. Ausgabe sind drei Dateien je Satz:

| Datei | Format | Inhalt |
|---|---|---|
| `<satz>.bin` | H.264 AVCC | Access Units hintereinander, mit Längenpräfix |
| `<satz>.json` | `rs-video-1` | `frames [{o, n, key}]`, `codec`, `description`, `colorSpace`, `gop`, `displayWidth`, `displayHeight` |
| `<satz>.pos.json` | `rs-pos-1` | Bild k liegt bei Fortschritt `i[k] / (grid - 1)` |

Einstellungen aus T-20261023-04 und B1: H.264 High, GOP 16, QP 27, Hardware. Codec `avc1.640028` für 1920 × 1080, `avc1.640032` für 1080 × 1920.

Der Encoder ist noch nicht im Projekt, sondern liegt im Staging und hat feste Pfade:

- Seite: `_agent/staging/T-20261023-04/tools/enc.html` und `enc.js`, Funktion `encodeSet({ name, ref, grid, from, to, drop, w, h, codec })`
- Host: `_agent/staging/T-20261031-01/b1/enc-server.mjs` (Port 4396, schreibt per PUT nach `F:\royal-spices-staging\T-20261031-01\sets`)
- Lauf: `_agent/staging/T-20261031-01/b1/enc-run.mjs` (Aufträge in `JOBS`, Chrome über `tools/qa/browser.mjs`, eigener CDP-Port, unter `_agent/gpu.lock`)

Für den Vollrender in `enc-server.mjs` die Quellen (`RENDERS`, `SOURCES`) und das Ziel (`SETS`) anpassen, in `enc-run.mjs` die `JOBS`.

## 2. Aufteilen

Ein Aufruf je Satz. Der Name des Zielordners ist der Satzname:

```
node tools/hero-video/split.mjs <satz>.bin <satz>.json <satz>.pos.json public/hero/v/<satz> --variant desktop
node tools/hero-video/split.mjs <satz>.bin <satz>.json <satz>.pos.json public/hero/v/<satz> --variant mobile
```

`split.mjs` schneidet nur an Schlüsselbildern, Vorgabe höchstens 1 MiB je Segment (`--max-bytes`). Es schreibt `index.json` und `00.bin`, `01.bin`, … und gibt auf stdout den Manifest-Eintrag aus: `{ "<satz>": { … } }`.

## 3. Tauschen

1. Server stoppen.
2. Alte Ordner aus `public/hero/v/` entfernen, neue dort ablegen.
3. In `src/data/hero-video.json` unter `sets` die Einträge aus Schritt 2 eintragen. `format` und `base` bleiben.
4. `npm run build`.

Das Manifest wird beim Build in die Seite eingebettet, deshalb reicht ein Neuladen ohne Build nicht.

## 4. Prüfen

- `npm test`, `npx astro check`
- `tools/qa/start-check.mjs`: Start ≤ 1087 / 2444 ms. Gerechnet darf das Startfenster dafür höchstens rund 4,7 MB am Desktop und 2,5 MB am Telefon groß sein.
- `tools/qa/journey.mjs` und `tools/qa/perf.mjs`
- Auf der Seite: `data-journey-frame` zeigt innerhalb der Abdeckung `video`. Bei ganzer Abdeckung lädt die Seite im Normalfall nur wenige WebP-Bilder (Ersatzsatz: 6 bis 8 statt 721 am Desktop).

Solange die Tests nicht umgestellt sind (Vorschlag in `_agent/staging/T-20261031-01/ERGEBNIS.md`, Abschnitt „B2“), schlagen nach einem Tausch 14 Tests fehl, weil sie die Sätze `c1920` und `c1080h` fest erwarten. Das betrifft nur die Tests, nicht die Seite.
