# Etikett-Druckbild Royal Spices (Frontetikett, Blattlogo, Bandzeichen)

Druckfertige Vorlagen, nachgebaut nach der Referenz `assets-src/photos/ref-glas-1910.webp`
(Transaktion T-20261019-02). Alles flach: kein Lichtverlauf, keine Schatten aus dem Foto.

## Aufbau

| Datei | Inhalt |
|---|---|
| `etikett.svg` | Papier (Rechteck, Eckradius 0,0406 Lw) + `berge.png` als Bildebene (auf die Etikettform beschnitten) + Vektordruck |
| `druck.svg` | nur der Vektordruck, transparenter Grund, keine `<text>`-Elemente (Schrift als Pfade) |
| `berge.png` | Berglandschaft RGBA 3225 × 4096: Farbe der Bergstriche, Alpha = Deckung; passt deckungsgleich auf `etikett.png` |
| `logo-band.svg`, `zeichen-oben.svg` | Goldlinie ohne Füllung als `stroke` (runde Enden und Ecken, nicht in Pfade umgewandelt); Einheit = Referenzpixel |
| `fonts/` | verwendete Schriften (Cinzel, Cormorant Garamond, Montserrat; variable TTF) mit OFL-Lizenztexten |
| `tools/` | Node-Skripte, die alle Ausgaben neu erzeugen |
| `../../pipeline/blender/label-assets/etikett.png` | Komposit aus `etikett.svg`, 3225 × 4096, 8 bit sRGB, RGBA (Ecken außerhalb des Radius transparent) |
| `../../pipeline/blender/label-assets/etikett-gold.png` | Graustufenmaske der Goldflächen (255 = Gold), gleiche Größe; enthält ROYAL, SPICES, Linie mit Raute, EST./2024 mit Raute und Strichen, HERAT NEGIN; nicht die Flagge |
| `../../pipeline/blender/label-assets/logo-band.png`, `zeichen-oben.png` | Gold auf transparent, 1296 × 2048 bzw. 2112 × 512 |

Koordinaten: viewBox `0 0 787.4 1000`, 1000 = Etiketthöhe Lh, Breite 0,7874 Lh, `preserveAspectRatio="none"`.
Die Angabe `width/height` in mm ist nur nominal; beim Druck auf die reale Etikettgröße skalieren.
`etikett.svg` verweist relativ auf `berge.png` (beide Dateien zusammen halten). `etikett.png` ist genau diese Datei,
gerendert mit librsvg (sharp), wobei der Bildverweis als data-URI eingebettet wird.

## Erzeugung

```
node tools/build.cjs [<pruefordner>]
```

Erzeugt alle Ausgaben neu (Logo und Bandzeichen, berge.png, druck.svg, etikett.svg, etikett.png, etikett-gold.png).
Mit Prüfordner zusätzlich: berge-vergleich.png, berge-entfernt.png, berge-messung.json, ueberlagerung-etikett.png,
ueberlagerung-logo.png, endmessung.json, den Abschnitt „Endmessung“ in messung.md und build-hashes.txt (SHA-256 aller
Ausgaben). Benötigt Node mit `sharp` und `fontkitten` aus `royal-spices-v1/node_modules` und die Referenz
(Pfade in `config.cjs`, mit Fallback). Laufzeit etwa 6 s. Zwei Läufe liefern identische Dateien.

Einmalige Anpassungen (nicht Teil des Builds; ihr Ergebnis steht fest in `satz-werte.json` bzw. `logo-werte.json`):

1. `node tools/anpassen.cjs <pruefordner> <kandidaten-schriftordner>`: misst die Referenz, vergleicht die Schriftkandidaten,
   setzt Rahmen, Buchstabenmitten, Schrift und Gewicht, kalibriert die Farbverhältnisse (Werte danach in `config.cjs` eingetragen).
   Die nicht gewählten Kandidaten liegen im Prüfordner unter `kandidaten-fonts/`.
2. `node tools/linien.cjs`: verschiebt nur die spitzen Enden von „Linie links“ und „Linie rechts“, bis ihre gemessene Lage
   der Referenz entspricht (anpassen.cjs führt Kanten höchstens 2 px nach; die spitzen Enden blieben 2,3 % bzw. 1,1 % Lw zu kurz).
3. `node tools/logo.cjs anpassen`: passt Logo und Bandzeichen an die Referenz an (Kurven, Strichstärke).

| Skript | Aufgabe |
|---|---|
| `config.cjs` | alle Stellschrauben: `PAPIER`, `VERHAELTNIS` (Farbverhältnisse), `FALTUNG` (Unschärfe der Referenz), `FLAGGE`, `FORMAT`, Kantensuchbereiche |
| `lib.cjs` | Laden, Entzerren der Referenz (Homographie), Papierpolynom, Verhältnisbild, Tintenmaße, Schrift → Pfade, Rendern |
| `referenz.cjs` | entzerrte Referenz (369 × 468), Papierlicht, Verhältnisbild |
| `satz.cjs` | Elemente des Etiketts mit Messfenstern, Art, Farbgruppe, Schriftrolle; Zeilengruppen; Schriftkandidaten |
| `satz-werte.json` | feste Rahmen, Mitten, Breiten, Schrift und Gewicht je Element |
| `druck.cjs` | Vektordruck als SVG |
| `messen.cjs` | ein Messverfahren für Referenz und Druckbild (Rahmen, dunkelste 12 %, IoU; Faltung `falte` (Gauß) und `falteI` (Modell (i): Luma-Gauß + WebP 4:2:0) |
| `faltung.cjs` | nicht Teil des Builds: schätzt die Unschärfe der Referenz an Kanten (Flagge, SAFFRON, ROYAL) und prüft das Faltungsmodell → `<pruefordner>/faltung.json` |
| `logo.cjs`, `logo-werte.json` | Logo und Bandzeichen (Kurven, Strichstärke, Farbe), Ausgabe über `schreiben()` |
| `berge.cjs` | Berge aus der Referenz: Lichtverlauf entfernt, Text und Flagge per Diffusion gefüllt, verdeckte Ecke gespiegelt ergänzt, Mitchell-Hochrechnung |
| `build.cjs` | Einstieg, Zusammenbau, Goldmaske, Endmessung, Prüfbilder, Hashes |

## Parameter

- `PAPIER` = `#f0ddc9` (Referenzpapier × 1,043). Alle Druckfarben sind `PAPIER × VERHAELTNIS` je Kanal; wer nur `PAPIER`
  ändert, behält die Farbverhältnisse der Referenz.
- `VERHAELTNIS` (aus der Referenz, dunkelste 12 % je Element bzw. Papiermittel, im Referenzmaßstab kalibriert):
  gold (ROYAL, SPICES, Linie mit Raute) → `#835e19`, goldKlein (EST., 2024, Raute, Striche) → `#8e6926`,
  herat (HERAT NEGIN) → `#886122`, saffron → `#161101`, braun (GRADE 1 mit Strichen, 0,5 g, PACKED IN GERMANY) → `#261405`,
  berge → `#654d2c`, logo → `#dfc68b`.
- Flagge in Amtsfarben: Schwarz, Rot `#DD0000`, Gold `#FFCE00` (3 gleich hohe Streifen).
- `FORMAT`: W/H 0,7874, Eckradius 0,0406 Lw, PNG-Höhe 4096.
- Die Bandspitze verdeckt in der Referenz die Etikettmitte oben bis 0,132 Lh; dort steht nur Papier.

## Schriftwahl

Kennzahl: IoU der 50-%-Tintenmasken von Referenz und gesetztem Kandidaten im Referenzmaßstab (4× bilinear),
je Kandidat das beste Gewicht (300–900), Rahmen und Buchstabenmitten nach der Referenz nachgeführt
(Bild: `pruefung/schriften-vergleich.png`, Werte: `pruefung/anpassen-bericht.json`).

| Rolle | gewählt | IoU | Vergleich |
|---|---|---|---|
| ROYAL, SPICES | Cinzel 700 | 0,610 | Cormorant Garamond 700: 0,587; EB Garamond 600: 0,536 |
| SAFFRON | Cormorant Garamond 700 | 0,631 | EB Garamond 600: 0,630; Cinzel 600: 0,624 |
| HERAT NEGIN | Montserrat 700 | 0,590 | Raleway 700: 0,580; Marcellus: 0,485 |
| Kleintext (EST., 2024, GRADE 1, 0,5 g, PACKED IN GERMANY) | Montserrat 600 | 0,527 | Mulish 700: 0,519; Raleway 600: 0,458 |

Begründung: Gewählt ist je Rolle der höchste IoU-Wert. Der Titel ist eine Versal-Antiqua mit feinen Serifen, die Cinzel am
besten trifft. Bei SAFFRON liegen die drei Kandidaten praktisch gleichauf (Unterschied ≤ 0,007); Cormorant Garamond hat den
höchsten Wert und die passendere Kontrastform. HERAT NEGIN und der Kleintext sind eine geometrische Grotesk, die Montserrat am
besten wiedergibt.

## Faltung für K3 (c)
Die Referenz ist unschärfer als das Druckbild. Für den Farbvergleich je Element wird das Druckbild im Referenzmaßstab gefaltet.
- T-20261020-10: ein Gauß σ_zusatz = 0,565 px für alles (`falte`, `FALTUNG.sigmaZusatz`, seit T-20261021-15 nur noch Info).
- T-20261020-15, Modell (i) (`falteI`, `FALTUNG.modellI`): Luma-Gauß σ_Y = 0,416 px (nur Helligkeitskanten) plus Farbunterabtastung
  wie WebP (4:2:0, 2 × 2-Mittel im Raster des Referenzbilds, Rückweg „fancy upsampling“). Helligkeitskanten passen (Flagge 0,50 / Ref 0,47,
  SAFFRON 0,48 / 0,50), die Farbkante ROYAL R − B nicht (0,64 / 0,88, −27 %). Die Referenz ist in der Farbe unschärfer als 4:2:0 allein.
  Darum ist Modell (i) noch nicht in `build.cjs` eingebunden. Befund: `_agent/staging/T-20261020-15/pruefung/faltung.md`.

- T-20261021-15: Modell (i) + Chroma-Gauß σ_C = 1,5 px auf Cb/Cr vor dem 2 × 2-Mittel (`falteI(img, geo, sY, sC)`, `FALTUNG.modellI.sigmaC`).
  σ_C trifft ROYAL R − B 0,88 px; Gegenprobe HERAT NEGIN R − B 0,68 / 0,72 (−5,6 %), Flagge +6,4 %, SAFFRON −8,0 % (`faltung.cjs`, `faltung.md`).
  `build.cjs` faltet K3 damit. Wertung K3: Helligkeit Y = 0,299 R + 0,587 G + 0,114 B je Element ± 15 % ohne Ausnahme;
  Farbe je Farbgruppe je Kanal ± 15 % (SAFFRON Blau ausgenommen, |Referenz| < 0,01 nur absolut); Farbe je Element nur Info (`E.K3f`, `messung.md`).

## Bekannte Abweichungen

- Die Ecke unten rechts der Berglandschaft ist in der Referenz von der Safranschale verdeckt und wurde gespiegelt ergänzt.
- Logo: Umriss-Maximum 3,09 px = 2,2 % der Logohöhe (Ziel 2 %), an der Kehle Seitenzweig/Stiel; p95 1,1 %.
- Bandzeichen (≈ 12 px hoch): Bestwert p95 3,25 px, Max 4,5 px (Bogen + Schrägstrich).
- SAFFRON, Blaukanal: Referenzverhältnis 0,0036 entspricht 0,72 Stufen von 255; 8 bit erlaubt nur 0 oder 1 (Verhältnis 0,0050).
  Die ± 15 % sind dort nicht darstellbar, die Abweichung beträgt absolut 0,0014.
- Farben je Element: Eine Druckfarbe je Farbgruppe (gold, goldKlein, herat, saffron, braun). Je Gruppe stimmen die dunkelsten
  12 % im Referenzmaßstab auf ± 5 % (außer SAFFRON Blau). Einzeln gemessen erscheinen kleine und dünne Elemente der Referenz
  durch die Unschärfe heller (EST.-Striche, Striche um GRADE 1, PACKED IN GERMANY). Im Druck sind sie voll gedeckt, die Striche
  wirken dadurch kräftiger als in der Referenz. Tabelle: `pruefung/messung.md`, Abschnitt K3.

<!-- RUNDE-B BEGIN -->
## Runde (b) (T-20261021-17)

Nachbesserung nach der K3-Wertung (Modell (i), σ_Y 0,416 px, σ_C 1,5 px; Faltung und Messcode unverändert).
Geänderte Werte alt → neu:

- satz-werte.json `EST-Strich links` box [0.46271, 0.50136, 0.15747, 0.16148] → [0.46271, 0.50136, 0.1589, 0.16005]: Stärke 0.00401 → 0.00115 Lh (E1: zu dunkel → dünner)
- satz-werte.json `EST-Raute` box [0.51052, 0.52633, 0.14217, 0.17772] → [0.50402, 0.53282, 0.14217, 0.17772]: Breite 0.01581 → 0.02880 Lw (E3: rauteBreite)
- satz-werte.json `EST-Strich rechts` box [0.53659, 0.54894, 0.15547, 0.16172] → [0.53659, 0.54894, 0.15789, 0.15929]: Stärke 0.00625 → 0.00140 Lh (E1: zu dunkel → dünner)
- satz-werte.json `Strich links` box [0.29882, 0.34224, 0.67255, 0.67627] → [0.29882, 0.34224, 0.67401, 0.67481]: Stärke 0.00372 → 0.00080 Lh (E1: zu dunkel → dünner)
- satz-werte.json `GRADE 1` wght 600 → 900 (E1: zu hell → schwerer)
- satz-werte.json `Strich rechts` box [0.66339, 0.70712, 0.66873, 0.67215] → [0.66339, 0.70712, 0.66979, 0.67109]: Stärke 0.00342 → 0.00130 Lh (E1: zu dunkel → dünner)
- satz-werte.json `PACKED IN GERMANY` wght 600 → 430 (E1: zu dunkel → leichter)
- config.cjs VERHAELTNIS.herat [0.5670, 0.4379, 0.1709] → [0.5670, 0.4379, 0.1393] (E2: Farbe je Gruppe, gefaltet)
- config.cjs VERHAELTNIS.braun [0.1587, 0.0891, 0.0242] → [0.1375, 0.0814, 0.0448] (E2: Farbe je Gruppe, gefaltet)
- satz.cjs `EST-Raute` farbe 'goldKlein' → 'gold' (E3); config.cjs: Kommentare der Gruppen gold/goldKlein nachgeführt
<!-- RUNDE-B END -->

## Blattlogo (T-20261021-16)

**Blattlogo (logo-band).** Das Logo ist eine gefüllte Linienzeichnung in `logo-werte.json` (`logo-band.teile`): drei offene Blattumrisse (äußere minus innere Linse), Mittelrippe, zwei Seitenrippen, Stiel mit geraden Seitenzweigen und vier Knoten. `build.cjs` liest nur die Werte und schreibt `logo-band.svg/.png` reproduzierbar. Angepasst wird von Hand und nicht beim Build, mit `node logo.cjs nachschaerfen` (Signal Luma Y der Referenz `ref-glas-1910.webp`, Region x 208–310, y 138–320; Laufzeit mit `LOGO_MINUTEN` begrenzen, Schrittweiten mit `LOGO_SCHRITTE`). Geprüft wird mit `node logo-pruefen.cjs <ordner>`: L2 Umriss nach K7 auf Y (p95 ≤ 0,75 px, Max ≤ 1,5 px), L3 Strichstärke je Teil auf Y (≤ ± 10 %), L1 Merkmale mit Detailbild, L5 Farbe der PNG. R − B steht nur zur Information daneben.

## Bandzeichen (T-20261021-18)

Vorschläge für `royal-spices-v1/assets-src/label/README.md`. Gilt nur, wenn T-20261021-18 übernommen wird. Die Zeilennummern beziehen sich auf den Stand aus T-20261021-16.

**Zeile 13 (Tabelle Ausgaben), Teil `zeichen-oben.svg`:**
> `zeichen-oben.svg`: Blattlogo in Draufsicht (seit T-20261021-18). Es hat dieselben Teile wie `logo-band.svg` (gefüllte Linienzeichnung, nur `fill`), ist ungestaucht und nicht gedreht. Einheit = Referenzpixel des Blattlogos. Die Stauchung auf dem Band erzeugt Blender über die Perspektive.

**Zeile 18 (PNG-Größen):**
> `logo-band.png` 1264 × 2048, `zeichen-oben.png` 1264 × 2048 (lange Seite 2048, Gold #c19c58 auf transparent).

**Zeile 93 (Bestwerte Bandzeichen), ersetzen durch:**
> - Bandzeichen (≈ 12 px hoch, Region x 232–302, y 32–49). Gemessen auf Luma Y wie L2: `umriss` 50 %, 8×, gewertet p95. Messgrenze der Region (Masken 40/60 %): p95 3,09 px, Max 5,26 px. Das heutige Zeichen (Bogen + Schrägstrich, Stand T-20261020-10) kommt auf p95 4,19 px, Max 8,25 px. Das Blattlogo liegt flach auf dem Band, Stiel vorn (zur Kamera). Ausgleich: Maßstab 0,658, senkrechte Stauchung k 0,074 (nur für die Messung), Drehung −1,0°. Ergebnis: p95 3,25 px, Max 5,25 px. Mit Stiel hinten: 3,28 / 5,52 px. Auf dem Kork ist das Zeichen ≈ 6,7 mm breit (B = 52,7 mm ≙ 448,6 px). R − B nur zur Info: heute 3,33 / 4,51 px, Stiel vorn 5,69 / 8,13 px, Stiel hinten 4,13 / 5,76 px.

**Abschnitt Ablauf (nach Zeile 44), ergänzen:**
> `node tools/logo-pruefen.cjs <ordner> zeichen` rechnet L4 neu und trägt `zeichen-oben` in `logo-werte.json` ein (Ausrichtung, Maßstab, k, Drehung, Lage, Prüfwerte). Danach schreibt `build.cjs` die SVG und die PNG. Ein zweiter Aufruf `node tools/logo-pruefen.cjs <ordner>` (ohne `zeichen`) misst L5 auf der neuen PNG und zeichnet `zeichen-oben-fit.png`.

`build.cjs` muss nicht geändert werden. `schreiben()` gibt `zeichen-oben` mit `teile` bereits ohne `passung` aus (Draufsicht). Das Prüfbild `ueberlagerung-logo.png` in `build.cjs` rendert das Zeichen mit `passung` und misst wie bisher auf R − B (siehe T-20261021-16, eigener Schritt).

## Sichtkorrektur (T-20261021-19)
Nach -17 erfüllte das Druckbild alle Messwerte, sah aber an zwei Stellen anders aus als die Referenz: „GRADE 1“ war mit wght 900 viel zu fett, und in „EST.“ stießen S und T aneinander (falsche Buchstabenmitten seit T-20261019-02). Korrektur:
- `satz-werte.json`: `EST.` Buchstabenmitten [0,2420, 0,2712, 0,3002, 0,3200] (gleichmäßig wie in der Referenz, Breiten unverändert). `GRADE 1` wght 900 → 600, `0,5 g` 600 → 500, `PACKED IN GERMANY` 430 → 500.
- `satz.cjs`: `GRADE 1` und `0,5 g` in Farbgruppe `saffron` (in der Referenz fast schwarz, nicht braun).
- `config.cjs`: `VERHAELTNIS.braun` [0,1375, 0,0814, 0,0448] → [0,1587, 0,0950, 0,0680] (Gruppe jetzt nur Striche und PACKED IN GERMANY).
Ergebnis: E1 jedes Element ≤ 5,3 %, E2 jede Gruppe je Kanal ≤ 11,0 % (SAFFRON Blau ausgenommen), K1, K2, K5, K8 erfüllt.
