# Stand 06.10.2026, 18:40 — zwei Renderläufe hintereinander, Ende voraussichtlich 07.10. mittags

Dieser Abschnitt ersetzt die Übergabe von 17:30 (darunter, als Verlauf). Kurz:

- **Vorgang A (Narbe):** Makro-Ansicht wird gerendert. Kapitelbild und Alt-Text sind nachgezogen.
- **Vorgang B („verpixelt / rauscht"):** Ursache gefunden und vom Auftraggeber entschieden: Die Zwischenbilder werden größer neu gerendert. Code ist fertig, das Rendern läuft.
- **Abgenommen ist nichts.** Performance ist erst messbar, wenn kein Blender mehr läuft.

## Was läuft

Zwei losgelöste Queues, nacheinander. Die zweite startet von selbst, wenn die erste `QUEUE-DONE` schreibt (oder fünf Minuten lang kein Blender läuft).

| Queue | Protokoll | Stufen | Stand 18:34 | Ende (geschätzt) |
| --- | --- | --- | --- | --- |
| `queue-inbetweens.sh` (seit 16:44, Übergabe 17:30) | `.raw/queue-dwell.log` | `d-dwell` (18 von 43), dann `d-hold-blur`, `d-pan-blur`, `d-hold-fine`, `m-hold`, `m-dwell`, `m-blur-2`, `m-blur-4` | `d-hold` fertig und veröffentlicht | 06.10. gegen 22:30 |
| `queue-large.sh` (neu, gestartet 18:30, wartet) | `.raw/queue-large.log` | `l-m-hold`, `l-d-into`, `l-d-out`, `l-d-sharp`, `l-m-rest` (Inhalt siehe Skriptkopf) | wartet | 07.10. gegen 12:00 (rund 13 Stunden, aus gemessenen Bildzeiten hochgerechnet: 105 s quer, 85 s hoch) |

- Die Stufen `d-hold-blur` bis `d-hold-fine` und `m-blur-2`/`m-blur-4` der ersten Queue rendern in 960/540, was die zweite danach in 1440/720 rendert (zusammen gut eine Stunde). Ich wollte die erste Queue nach `d-dwell` beenden; das Beenden der Prozesse hat die Berechtigungsprüfung abgelehnt. Schaden: nur Rechenzeit. Die kleinen Bilder dienen bis dahin als Zwischenstand.
- Jede Stufe beider Queues veröffentlicht sich selbst mit dem **geänderten** `build-hero.mjs` (nach `public/hero/5`). Bis alles durch ist, meldet es „still small" (Bilder der großen Sätze, die es nur klein gibt) und „not a release state".
- Prozesse erkennen: an der Befehlszeile `queue-inbetweens.sh` bzw. `queue-large.sh` (PowerShell: `Get-CimInstance Win32_Process` mit `CommandLine`). Anhalten: erst die Queue-Prozesse, dann Blender. Fortsetzen: denselben Befehl noch einmal starten, vorhandene Bilder werden übersprungen; das zuletzt geschriebene Bild prüfen (Größe 0 oder beschädigt: löschen).

```bash
(RS_AFTER=.raw/queue-dwell.log nohup bash pipeline/blender/queue-large.sh >> .raw/queue-large.log 2>&1 &)
```

## Vorgang B: Ursache und Entscheidung

- **Bildschirm des Auftraggebers:** Das Display dieses Laptops hat 2560 × 1600 Pixel bei 150 % Skalierung (Fenster rund 1707 CSS-Pixel breit). Die Diagnose von 17:30 hat mit 1920 Pixeln Breite gerechnet. Tatsächlich wurden die 960er-Bilder der Bewegungsebene **2,7-fach** gestreckt, die Bilder im Stillstand nur 1,3-fach.
- **Gezeigt in echten Gerätepixeln:** `docs/vergleich-bewegung-stillstand.png` (Headless Chrome, 1707 × 960 bei Faktor 1,5, `.raw/tests/noise/screen.mjs`). Im Stillstand scharf, in Bewegung weich und blockig.
- **Kein Effekt:** auch in CSS und Markup nicht (kein Korn, kein Filter, keine Mischmodi). Das stand um 17:30 nur für den Master fest.
- **Entscheidung des Auftraggebers (06.10., gegen 18:15):** Bewegungsbilder quer in 1440 × 810, hoch in 720 × 1280 neu rendern, mit gut 12 MB bzw. 6 bis 7 MB für die Fahrt auf leistungsfähigen Geräten. Schwächere Geräte behalten die kleinen Sätze.
- Das **Pulsieren** (jedes vierte Bild schärfer) verschwindet in den kleinen Sätzen von selbst, sobald alle Bilder aus großen Renderings verkleinert sind. Im großen Querformat-Satz bleibt es voraussichtlich in der Produktenthüllung (Positionen 528–712): Dort sind die Basisbilder in 1920 gerendert und werden auf 1440 verkleinert, die Zwischenbilder direkt in 1440. Messen und gegebenenfalls ausgleichen, siehe „Fehlt noch", Punkt 3.

## Geändert seit 17:30

- `pipeline/images/build-hero.mjs`: Pfad `/hero/5`; neue Bewegungssätze `d-1440m` (1440, Qualität 80) und `m-720m` (720, Qualität 80); Quellen `.raw/<Variante>-fine-<Breite>` und `-blur-<Breite>` haben Vorrang vor den kleinen Renderings, in allen Sätzen; meldet Bilder unter Sollbreite („still small"). Erster Lauf 18:23 bis 18:30 fehlerfrei (alle Sätze neu kodiert).
- `src/scripts/journey.ts` (`chooseSets`): Stufe High nimmt den großen Satz, wenn das Bild auf dem Schirm breiter als 1100 (quer) bzw. 620 (hoch) Gerätepixel ist. Geprüft: `astro check` 0 Fehler; Headless Chrome bei 1707 × 960, Faktor 1,5 wählt `d-1440m` und zeichnet ihn (`.raw/tests/noise/screen5/`).
- `tools/qa/journey.mjs`: prüft auf Stufe High den großen Satz.
- `pipeline/blender/queue-large.sh`: neu.
- `pipeline/blender/queue-all.sh`: Narben-Basisbilder 29–42 und 21–29, Makro-Ansicht beider Formate aufgenommen (Punkt 8 von 17:30).
- `public/img/stigma-*`, `src/data/stills.json`: Kapitelbild „Narbe" aus dem neuen `.raw/desktop/0036.png`, Zuschnitt unverändert passend (`npm run assets:stills`). `src/data/journey.ts`: Alt-Text beschreibt das neue Bild (Punkt 3 von 17:30).
- `docs/ASSETS.md`, `docs/QA.md`: Sätze, Rückmeldungen, Offen. `docs/vergleich-bewegung-stillstand.png` neu.
- Geprüft vor der Änderung an `journey.ts`: `npm test` 20 von 20.

## Fehlt noch

1. Auf `QUEUE-DONE` in **beiden** Protokollen warten. Nach `Error` und `Traceback` suchen. Bildzahlen: `.raw/desktop-hold` 43, `.raw/mobile-hold` 30, `.raw/desktop-blur-1440` 129, `.raw/desktop-fine-1440` 156, `.raw/mobile-blur-720` 238.
2. Letzte Ausgabe von `build-hero.mjs` prüfen. Erwartet: `d-1440m` und `d-960` je 378 Bilder, `m-720m` und `m-540` je 268, nirgends „still small", keine Warnung.
3. Pulsieren messen: `node .raw/tests/noise/pulse.mjs public/hero/5/d-1440m` und `.../d-960`. Liegt die Produktenthüllung (528–712) über etwa 1,03: Basisbilder aus 1920er-Quellen in `build-hero.mjs` leicht weichzeichnen, kalibriert wie unter Vorgang B von 17:30 beschrieben (`calibrate.mjs`, für 1920 → 1440 neu).
4. `npm run build`, dann `PORT=4323 npm start`. Prüfskripte nacheinander (Port 9333): `tools/qa/journey.mjs`, `a11y.mjs`, `axtree.mjs`, `frame-steps.mjs d-1440m m-720m`, `perf.mjs` (nur ohne Blender: Bildtakt und Decodierzeit mit den großen Bildern sind das eigentliche Risiko; Budget der decodierten Bilder auf High rund 20 Bilder). `npm test`.
5. Ansehen in Laptop-Größe (1707 × 960, Faktor 1,5), quer und hoch: Fahrt in Bewegung, Narbe beim Scrollen, Sprung an den Rändern der Makro-Ansicht (264/306 quer, 187/216 hoch), „Weiter" hält auf scharfem Bild.
6. `public/hero/3/` und `public/hero/4/` löschen, wenn `/hero/5` vollständig und geprüft ist (sonst werden die alten Sätze mit ausgeliefert).
7. `docs/QA.md`: Datenmengen und Bildzahlen der Sätze, Messwerte, Zeile „Bewegungsebene größer" schließen.
8. Offen beim Auftraggeber, unverändert: Sollen die gesetzten Blenden für die ganze Fahrt gelten (siehe 17:30, Punkt 10)? Form der Narbe am frischen Exemplar prüfen (siehe 17:30, „Botanisch").

---

# Stand 06.10.2026, 17:30 — Übergabe mitten im Vorgang (überholt durch 18:40)

Dieser Abschnitt ist die Übergabe an den nächsten Bearbeiter. Zwei Vorgänge sind offen:

- **A. Narbe (Makro-Ansicht):** Code ist geschrieben, der Renderlauf **läuft noch**. Veröffentlicht, gebaut und im Browser geprüft ist nichts davon.
- **B. „Verpixelt / die Kamera rauscht":** nur Diagnose mit Messwerten. **Am Code ist dafür nichts geändert.**

Die Abschnitte weiter unten (16:05, 09:20) beschreiben den Stand davor und bleiben als Verlauf stehen. `docs/ASSETS.md` beschreibt für Vorgang A bereits den Zielzustand, als wäre er fertig.

## Was gerade läuft

Ein losgelöster Renderlauf, gestartet 16:44:

```bash
(RS_NO_FIRST_PUBLISH=1 nohup bash pipeline/blender/queue-inbetweens.sh d-hold d-dwell d-hold-blur d-pan-blur d-hold-fine m-hold m-dwell m-blur-2 m-blur-4 >> .raw/queue-dwell.log 2>&1 &)
```

- Protokoll: `.raw/queue-dwell.log`. Fertig ist er, wenn dort `QUEUE-DONE` steht. Um 17:24 lief die erste Stufe (`d-hold`), 9 von 14 Bildern waren fertig.
- Prozesse um 17:24: `blender.exe` PID 36032, die Queue als `bash.exe` PID 21388 und 20984 (an der Befehlszeile `queue-inbetweens.sh` zu erkennen).
- Dauer: geschätzt bis etwa 21:30 bis 22:30. Gemessen sind nur rund 4 Minuten je Bild in 1920 × 1080; der Rest ist hochgerechnet.
- Jede Stufe veröffentlicht sich am Ende selbst (`node pipeline/images/build-hero.mjs`). **Ab der ersten Veröffentlichung zeigt das Manifest auf `/hero/4`**, und bis alle Stufen durch sind, fehlen im Narben-Abschnitt Bilder der Bewegungsebene (der Player überblendet dort gröber). Bis 17:24 war noch nichts veröffentlicht: Manifest und Seite zeigen den alten Stand unter `/hero/3`.
- Anhalten: erst die beiden Queue-Prozesse beenden, dann Blender. Fortsetzen: denselben Befehl noch einmal starten, vorhandene Bilder werden übersprungen. Das zuletzt geschriebene Bild nach einem Abbruch prüfen (Größe 0 oder beschädigt: löschen).

| Stufe | Was | Ziel | Bilder |
| --- | --- | --- | --- |
| `d-hold` | Querformat, Basisbilder 29–42, 1920 × 1080, 64 Samples | `.raw/desktop/` | 14 |
| `d-dwell` | Querformat, Makro-Ansicht, Positionen 264–306, jede Position, 1440 × 810, 64 Samples | `.raw/desktop-hold/` | 43 |
| `d-hold-blur` | Querformat, Fahrt in die Makro-Ansicht, Positionen 232–264 (gerade), Bewegungsunschärfe, 960 × 540 | `.raw/desktop-blur/` | 17 |
| `d-pan-blur` | Querformat, Fahrt heraus, Positionen 306–338 (gerade); ab 340 vorhanden und übersprungen | `.raw/desktop-blur/` | 17 |
| `d-hold-fine` | Querformat, scharfe Zwischenbilder um die Makro-Ansicht (nur für `RS_NO_BLUR=1`), 960 × 540 | `.raw/desktop-fine/` | 25 |
| `m-hold` | Hochformat, Basisbilder 21–29, 720 × 1280, 64 Samples | `.raw/mobile/` | 9 |
| `m-dwell` | Hochformat, Makro-Ansicht, Positionen 187–216, jede Position, 720 × 1280 | `.raw/mobile-hold/` | 30 |
| `m-blur-2`, `m-blur-4` | Hochformat, Positionen 164–238 (gerade), Bewegungsunschärfe, 540 × 960 | `.raw/mobile-blur/` | 38 |

Die ersetzten Bilder des alten Pfads liegen unter `.raw/prev-dwell/` (gleiche Unterordner). Zurück zum alten Stand: Änderungen an `web_hero.py` zurücknehmen, diese Bilder zurückkopieren, die neuen Ordner `*-hold` entfernen, neu veröffentlichen.

## Vorgang A: Narbe

**Rückmeldung:** „Die Stelle, wo die Narbe scharf ist, muss etwas mehr Bilder erhalten. Sie ist so kurz scharf und durch die Bewegungsunschärfe sehr schnell wieder unscharf. Es muss gestochen scharf sein, gut zu erkennen und botanisch korrekt."

### Gefunden

1. **Die Blende war nie wirksam.** Der Master animiert die Blende an den Kameradaten (Action-Slot „Motion control | 85 mm"). `web_hero.py` hat nur die Animation des Kamera-Objekts entfernt, nicht die der Kameradaten. Alle Bilder beider Fahrten sind deshalb mit Blende 0,11 gerendert (Wert des letzten Master-Frames), nicht mit den Blenden der Schlüsselpositionen (0,20 bis 2,2). Die Korrektur vom Mittag („Blende 0,45 → 0,72") hat nichts bewirkt, nur die Verschiebung des Schärfepunkts. Nachgewiesen mit einem Messskript: Nach dem Rendern stand die Blende auf 0,11, obwohl 16 gesetzt war.
2. **Die Narbe war zu klein.** Auf dem gesetzten Pfad war ihr Ende rund 5 % der Bildbreite groß und von der Seite gesehen (Abstand 5,65 Einheiten, 83° zur Achse des Narbenastes). Faltung und papillöser Rand, die der Master modelliert (Referenzbild `L-fresh-apex.png` im Übergabepaket), waren nicht zu lesen.
3. **Die scharfe Phase war 2,4 % der Fahrt lang** (0,388 bis 0,412); direkt danach setzte die Bewegungsunschärfe ein.

### Geändert

- `pipeline/blender/web_hero.py`
  - `STIGMA_HOLD`, `stigma_macro()`, `aim_for()`, `refine_hold()`: Zwischen Fortschritt 0,325 und 0,475 blendet die Kamera vom gesetzten Pfad in eine Makro-Position vor dem Ende der Narbe und zurück (Abstand 1,9, 50° zur Achse, Blende 2,0, Schärfepunkt auf dem Ende). Von 0,375 bis 0,425 steht die Makro-Ansicht allein, mit langsamer Annäherung (6 % des Abstands) und 7° Schwenk über den Haltepunkt. Das Ende der Narbe bleibt an derselben Stelle im Bild wie in der gesetzten Komposition. Außerhalb von 0,325 bis 0,475 ändert sich kein Bild.
  - `RENDERED_FSTOP = 0.11` und `cd.animation_data_clear()`: Die Animation der Kameradaten wird jetzt entfernt, und außerhalb des Narben-Haltepunkts ist die Blende ausdrücklich auf 0,11 festgelegt, damit der veröffentlichte Look bleibt. **Die Blendenwerte in `KEYS` werden weiterhin nicht verwendet.**
  - `BLUR_FREE`: an der Narbe keine Bewegungsunschärfe innerhalb ±0,03, voll ab ±0,05 (andere Haltepunkte unverändert ±0,010 / ±0,035).
  - `stigma_end()` gibt jetzt Mittelpunkt, Achse und Radius zurück.
  - Neue Schalter für Testbilder: `--hold-dist`, `--hold-angle`, `--hold-fstop`, `--hold-core`, `--hold-reach`, `--hold-swing`.
- `pipeline/blender/render.sh`: zeigt auch Zeilen mit `HOLD` (Messwerte des Narbenendes).
- `pipeline/blender/queue-inbetweens.sh`: Stufen `d-hold`, `m-hold` mit neuen Bereichen; neu `d-dwell`, `m-dwell`, `d-hold-blur`, `d-hold-fine`; `d-pan-blur` beginnt bei 306 statt 272.
- `pipeline/images/build-hero.mjs`: neue Quelle `.raw/<Variante>-hold/` (hat in der Bewegungsebene Vorrang vor allen anderen Quellen, wird bis 1440 bzw. 720 Pixel breit veröffentlicht, zählt nicht für die Größenangabe des Satzes); Pfad `/hero/3` → `/hero/4`. **Noch nie ausgeführt, nur auf Syntax geprüft.**
- `src/scripts/journey.ts`: Das Speicherbudget der decodierten Bilder zählt Pixel statt Bilder, weil die Narbenbilder größer sind. **Ungetestet, `astro check` ist nicht gelaufen.**
- `docs/ASSETS.md`: beschreibt den Zielzustand.

### Geprüft

Nur Einzelbilder:

- Testbilder der Makro-Position in 960 × 540 (`.raw/tests/dwell/`): `g1_p0400.png` entspricht bis auf die Blende (1,5 statt 2,0) der gewählten Einstellung. `sheet-t.png` zeigt zehn Positionen von 0,325 bis 0,475 im Querformat, `sheet-m.png` drei im Hochformat: Die Fahrt hinein und heraus geht durch kein Blütenblatt.
- Das erste fertige Basisbild in 1920 × 1080 (`.raw/desktop/0033.png`): Ende der Narbe scharf, Faltung und Papillen zu erkennen, Hintergrund weich.

### Fehlt noch

1. Auf `QUEUE-DONE` warten. Im Protokoll nach `Error` und `Traceback` suchen und die Bildzahlen aus der Tabelle oben gegen die Ordner prüfen.
2. Die Ausgabe von `build-hero.mjs` im Protokoll prüfen (erster Lauf des geänderten Skripts). Erwartet: `d-960` mit 378 Bildern (357 + 21 ungerade Positionen), davon 43 „dwell frames"; `m-540` mit 268 (253 + 15), davon 30; Satzgrößen im Manifest weiter 960 × 540 und 540 × 960.
3. `npm run assets:stills` (das Kapitelbild „stigma" kommt aus `.raw/desktop/0036.png` mit einem Zuschnitt, der für das alte Motiv gewählt war: ansehen und in `pipeline/images/build-stills.mjs` anpassen). Alt-Text und Kapiteltext in `src/data/journey.ts` gegen das neue Bild lesen.
4. `npm run build` (enthält `astro check`).
5. Im Browser ansehen, quer und hoch: Überdeckt der Kapiteltext die jetzt größere Narbe? Wie wirkt die Fahrt hinein und heraus beim Scrollen? Hält „Weiter" auf einem scharfen Bild (Fortschritt 0,40 → Basisbild 36)? Ist der Wechsel zwischen den unscharfen 960er-Bildern und den scharfen 1440er-Bildern an den Positionen 264 und 306 als Sprung zu sehen?
6. Prüfskripte, nacheinander (fester Debug-Port 9333): `tools/qa/journey.mjs`, `a11y.mjs`, `axtree.mjs`, `frame-steps.mjs`; `perf.mjs` erst, wenn kein Blender mehr läuft. `npm test`.
7. `public/hero/3/` löschen, wenn `/hero/4` vollständig und geprüft ist (sonst wird der alte Satz mit ausgeliefert).
8. `pipeline/blender/queue-all.sh` nennt für die Narbe noch die alten Bereiche (Basisbilder 33–39 und 23–27): an 29–42 und 21–29 anpassen und `d-dwell`, `m-dwell` aufnehmen.
9. `docs/QA.md` nachziehen: Tabelle der Rückmeldungen, Bildzahlen und Datenmengen der Sätze, neue Messwerte. `docs/ASSETS.md` gegen das Ergebnis lesen.
10. Entscheidung des Auftraggebers: Sollen die gesetzten Blenden für die ganze Fahrt gelten? Das ändert den Look aller Bilder und heißt, beide Fahrten vollständig neu zu rendern. Die Frage ist gestellt, eine Antwort gibt es nicht.

### Botanisch

Das Bild zeigt, was der Master modelliert: einen zum Ende verbreiterten Narbenast mit Längsfurchen, gefaltetem Endquerschnitt und feinem papillösem Rand, nach den Quellen im Übergabepaket (`notes/00-sources-and-evidence.md`, S3–S5). Das Ende ist im Modell eine geschlossene, gefaltete Fläche, kein offener Trichter. Die Notizen des Übergabepakets (`notes/07-3d-artist-notes.md`) verlangen, die Form am frischen Exemplar zu prüfen, bevor ein extremer Makroshot final freigegeben wird. Diese Prüfung steht aus; „botanisch korrekt" ist damit nicht belegt. Am Modell wurde nichts verändert.

## Vorgang B: „verpixelt", „die gesamte Kamera rauscht"

**Rückmeldung:** „Woher kommt dieses Verpixelte im Bild? Es kann doch High-End aussehen, wenn ich mir die Render-Ergebnisse anschaue, aber die gesamte Kamera scheint etwas zu rauschen. Dann ist da irgendein Effekt zu viel."

**Stand: Diagnose. Nichts geändert, nichts behoben.** Messskripte und Vergleichsbilder liegen in `.raw/tests/noise/`. Welche der Ursachen der Auftraggeber als „Rauschen" sieht, ist nicht von ihm bestätigt.

### Was es nicht ist

- **Kein Effekt im Master:** kein Compositor, kein Korn, kein Nachbearbeitungsschritt. Einstellungen des Masters: AgX „Medium High Contrast", Pixelfilter Blackman-Harris 1,5 px, Dither 1,0, fester Seed 0, OpenImageDenoise.
- **Kein Renderrauschen:** Zwei benachbarte Rohbilder (`.raw/desktop-fine/0706.png`, `0710.png`) unterscheiden sich im Mittel um 0,18 von 255 Stufen, und nur dort, wo sich die Kamera bewegt hat (`diff-raw-706-710.png`, Differenz zwölffach verstärkt). Die Rohbilder sind auf Pixelebene sauber (`raw33-bg.png`, `raw33-tip.png`).

### Was gemessen wurde

1. **Halbe Auflösung in Bewegung.** Die Bewegungsebene ist 960 × 540 groß und wird auf den Bildschirm gestreckt; die Bilder in voller Auflösung erscheinen erst im Stillstand. Auf 1920 Pixel Breite sind Kanten weich und treppig (`motion640-on1920.png` gegen `rest640-on1920.png`, `q-compare.png`). Das ist der größte Teil von „verpixelt".
2. **Jedes vierte Bild ist schärfer.** Die Basisbilder der Bewegungsebene sind aus Renderings in 1440 oder 1920 Pixel Breite verkleinert, die drei Zwischenbilder dazwischen direkt in 960 gerendert. Schärfe eines Basisbilds im Verhältnis zu seinen Nachbarn im veröffentlichten Satz `d-960` (`pulse.mjs`):

   | Positionen | Median | Maximum |
   | --- | --- | --- |
   | 0–176 | 1,04 | 1,11 |
   | 176–272 | 1,04 | 1,12 |
   | 272–528 (alles mit Bewegungsunschärfe in 960 gerendert) | 1,00 | 1,04 |
   | 528–712 (Produktenthüllung, Basisbilder aus 1920) | 1,22 | 1,26 |

   Beim Scrollen pulsiert das ganze Bild scharf, weich, weich, weich. Das ist der größte gemessene Kandidat für „die Kamera rauscht". Für das Hochformat nicht gemessen; dort kommen alle Bilder der Bewegungsebene aus `.raw/mobile-blur` in gleicher Größe, ein Pulsieren ist nicht zu erwarten.
3. **Kompression.** Dieselben beiden Nachbarbilder unterscheiden sich nach WebP (Qualität 76) um 0,84 statt 0,18 Stufen, Basisbild gegen Zwischenbild um 1,44 (`diff-pub-704-706.png`: Blockmuster über die ganze ruhige Fläche, in jedem Bild anders). In ruhigen Flächen liegt der Fehler bei rund 0,6 bis 0,7 Stufen; 20 bis 25 % der 4 × 4-Felder weichen um eine Stufe oder mehr ab (`blocks.mjs`). Höhere Qualität ändert daran wenig: Qualität 76 → 0,69, Qualität 90 → 0,59. Vermutung, nicht belegt: Das kommt aus der 8-Bit-Farbumrechnung von verlustbehaftetem WebP zusammen mit dem Dither der Rohbilder (verlustfrei wären es rund 300 kB je Bild, die Bilder tragen also viel Feinrauschen).

   Abstand zum Rendering auf 1920 Pixel Breite und Datenmenge je Bild, Stichprobe von neun Basisbildern (`measure.mjs`):

   | Auslieferung | kB je Bild | PSNR |
   | --- | --- | --- |
   | 960 px, Qualität 76 (jetzt, Bewegung) | 16,8 | 38,0 dB |
   | 960 px, Qualität 88 | 27,7 | 39,6 dB |
   | 1280 px, Qualität 82 | 29,7 | 39,7 dB |
   | 1440 px, Qualität 80 (jetzt, Stillstand) | 31,7 | 39,8 dB |
   | 1440 px, Qualität 90 | 51,8 | 41,1 dB |

### Vorschläge, nicht umgesetzt

1. **Pulsieren beseitigen, ohne neu zu rendern.** In `build-hero.mjs` die Basisbilder der Bewegungsebene nach dem Verkleinern leicht weichzeichnen, wenn ihre Nachbarn direkt in Satzgröße gerendert sind. Kalibriert bei Qualität 84 (`calibrate.mjs 84`) mit einer 3 × 3-Faltung `(1 − t) · Original + t · [1 2 1; 2 4 2; 1 2 1] / 16`:
   - Quelle 1440 px: `t = 0,30` → Verhältnis 0,998 (Spanne 0,99–1,02)
   - Quelle 1920 px: `t = 0,35` → Verhältnis 0,998 (Spanne 0,97–1,03)

   Hinweise: `sharp().blur()` mit Sigma unter etwa 0,6 bewirkt nichts; der Kern `linear` allein ergibt 0,979 bzw. 0,943. Bei anderer Qualität neu kalibrieren. Erfolg prüfen mit `node .raw/tests/noise/pulse.mjs public/hero/4/d-960` (Ziel 1,00 in allen Abschnitten). Das gleicht nach unten an: In Bewegung sind dann alle Bilder so weich wie die Zwischenbilder.
2. **High-End in Bewegung heißt größer rendern.** Die scharfen Zwischenbilder des Querformats (Positionen 0–232 und 528–712, 156 Bilder) in 1440 × 810 neu rendern und die Bewegungsebene in dieser Größe ausliefern. Schätzung, nicht gemessen: rund sechs Stunden Rechenzeit, Datenmenge der Fahrt im Querformat rund 11 bis 12 MB statt 5,4 MB. Vorschlag 1 wird dort dann überflüssig. Das ist eine Entscheidung des Auftraggebers (Datenmenge steht schon in `docs/QA.md` als offene Abwägung); er ist dazu noch nicht gefragt worden. Hochformat: Die Bewegungsebene ist 540 Pixel breit und wird auf heutigen Telefonen gut zweifach gestreckt; nicht untersucht.
3. **Qualität anheben:** Bewegungsebene von 76 auf 84 bis 88, Stillstand von 80 auf 88. Hilft an Kanten, kaum in ruhigen Flächen (siehe Messung).
4. **Nicht untersucht:** ob Dither 0 beim Rendern oder ein anderes Bildformat das Flimmern in ruhigen Flächen senkt, und ob bessere Skalierung im Browser (Canvas wird per CSS gestreckt) etwas bringt.

## Geänderte Dateien dieser Sitzung

`pipeline/blender/web_hero.py`, `pipeline/blender/render.sh`, `pipeline/blender/queue-inbetweens.sh`, `pipeline/images/build-hero.mjs`, `src/scripts/journey.ts`, `docs/ASSETS.md`, `docs/STATUS.md`. Das Projekt liegt nicht unter Versionskontrolle; es gibt keinen Diff zum Nachlesen außer dieser Liste.

Ein Testbild der Makro-Position (rund eine Minute):

```bash
bash pipeline/blender/render.sh --variant desktop --mode still --p 0.40 --res 960x540 --spp 48 --noise 0.035 --threads 10 --out .raw/tests/dwell --tag probe
```

## Hinweise zu diesem Rechner

- Blender 4.5 rendert hier nur auf der CPU. Lange Läufe losgelöst mit Protokoll starten; sie müssen fortsetzbar sein.
- Kein Python im Pfad: Skripte mit Node schreiben (`sharp` ist installiert).
- Die Prüfskripte in `tools/qa/` nutzen denselben Debug-Port (9333): nie zwei gleichzeitig.
- Solange Blender rendert, sind Performance-Messungen ungültig.
- Auf dem Rechner laufen fremde Prozesse (andere Agenten, ein anderes Projekt). Nur Prozesse beenden, die an ihrer Befehlszeile eindeutig zu diesem Projekt gehören. Port 4322 war von einem fremden Prozess belegt.
- In `bash -c "…"` oder `node -e "…"` keine Markdown-Backticks verwenden: Git Bash führt sie als Befehl aus.
- Der Master unter `../Projektübergabe/royal-spices/blender/` wird nie gespeichert oder überschrieben.

---

# Stand 06.10.2026, 16:05 — Nachbesserung gerendert und geprüft, noch nicht angesehen

Es läuft nichts mehr im Hintergrund. Die Nachbesserung vom Nachmittag ist gerendert, veröffentlicht, gebaut und technisch geprüft. **Abgenommen ist der Stand nicht:** Ob die Fahrt jetzt flüssig genug und die Narbenspitze scharf genug ist, muss der Auftraggeber ansehen.

## Rückmeldung vom Mittag und was daraus wurde

„Fahrt ist flüssiger, geht es noch etwas flüssiger? Die Narbenspitze im Narben-Kapitel ist nicht so scharf, wie ich es mir wünsche."

- **Narbenspitze.** Gemessen am Blender-Master: Der Schärfepunkt lag auf der vorderen Wand des Narbentrichters, 0,10 Einheiten vor dessen Ende, bei einer Schärfentiefe von rund ±0,06 (Blende 0,45). Das Ende der Narbe, das Motiv des Kapitels, lag außerhalb. Jetzt liegt der Schärfepunkt am Haltepunkt auf dem Ende der Narbe, und die Blende schließt dort um den Faktor 1,6 (0,72). Der Hintergrund bleibt stark unscharf. Die Korrektur wirkt nur zwischen Fortschritt 0,36 und 0,44; die gesetzten Kamerapositionen und alle anderen Bilder bleiben unverändert (`pipeline/blender/web_hero.py`, `STIGMA_HOLD`). Vergleich alt/neu: `.raw/tests/focus/compare-1920.png`.
- **Narben-Kapitel in höherer Auflösung.** Die Basisbilder des Kapitels (Querformat 33–39, Hochformat 23–27) sind in 1920 × 1080 bzw. 720 × 1280 mit 64 Samples neu gerendert.
- **Keine Bewegungsunschärfe an den Haltepunkten.** Bisher setzte die Unschärfe des Schwenks genau am Narben-Haltepunkt ein. Jetzt blendet sie an allen vier Haltepunkten auf null aus.
- **Flüssiger, Teil 1:** Die Kamera folgt dem Scrollen wie eine kritisch gedämpfte Feder statt mit einfacher Verzögerung. Ihre Geschwindigkeit springt nie, einzelne Mausrad-Rasten verschmelzen. Im Browser geprüft: monoton, kein Überschwingen, kommt exakt an.
- **Flüssiger, Teil 2:** Im Querformat trägt die Bewegungsebene jetzt von der Narbe bis zum Glas Bewegungsunschärfe (129 statt 65 Bilder).

Grenze: Die Narbe hat im 3D-Modell wenig Feinstruktur (glatte Rippen, keine sichtbaren Papillen). Schärfer als das Modell kann das Bild nicht werden; mehr Detail an der Spitze wäre Modellierarbeit am Master.

Gerendert von 13:03 bis 15:51 (210 Bilder). Die ersetzten Bilder liegen unter `.raw/prev-focus/`.

## Geprüft am Produktions-Build (16:00)

Ausgaben in `.raw/qa/*-final.txt`.

- `tools/qa/journey.mjs`: alle 65 Prüfungen bestanden.
- `tools/qa/perf.mjs`: LCP 0,13–0,30 s am Desktop, 0,92–1,33 s im Telefon-Profil (CPU vierfach gedrosselt, langsames 4G); CLS höchstens 0,0002; längste Interaktion 136 ms; Bildtakt der Fahrt 16,7 ms (60 Hz) in allen drei Profilen, auch gedrosselt; keine Konsolen- oder CSP-Fehler.
- `tools/qa/a11y.mjs`, `tools/qa/axtree.mjs`, `tools/qa/smtp.mjs`: alle Prüfungen bestanden. `npm test`: 20 von 20. `astro check`: 0 Fehler.
- Sichtprüfung der neuen Einzelbilder rund um den Narben-Haltepunkt, quer und hoch (`.raw/shots2/sheet-refine.png`).

Nicht geprüft bleibt, was unten unter „Nicht geprüft" steht, allen voran: **die Fahrt in Bewegung, mit Augen.**

## Ansehen

Entwicklungsserver: http://127.0.0.1:4321/ (`npm run dev`). Produktionsstand: `npm run build`, dann `PORT=4323 npm start` (Port 4322 ist auf diesem Rechner von einem fremden Prozess belegt).

---

# Stand 06.10.2026, 09:20 — gerendert, gemessen, noch nicht abgenommen

Es läuft nichts mehr im Hintergrund. Alle Bilder sind gerendert und veröffentlicht, der Produktions-Build ist gebaut und geprüft, die Dokumente sind vollständig. **Abgenommen ist der Stand nicht:** Die wichtigste offene Frage kann nur der Auftraggeber beantworten, nämlich ob die Hero-Fahrt jetzt flüssig wirkt.

## Ansehen

```bash
npm run dev
```

Vorschau unter http://127.0.0.1:4321/ (Entwicklung).

```bash
npm run build
```

```bash
PORT=4323 npm start
```

Produktionsstand. Port 4322 (Standard) ist auf diesem Rechner von einem fremden Prozess belegt, deshalb ein anderer Port.

## Was der Auftraggeber beurteilen muss

1. **Sieht die Fahrt flüssig aus?** Mit Mausrad, Trackpad und dem Knopf „Weiter" durchgehen, im Querformat und in einem schmalen, hohen Fenster (oder auf dem Telefon).
2. **Gefällt die Bewegungsunschärfe?** Im Querformat ist der Schwenk von der Narbe zu den Fäden wie Film mit offenem Verschluss gerendert, im Hochformat die ganze Bewegung. Sobald die Kamera steht, wird das Bild scharf.
3. **Stört die weichere Bewegung auf großen Bildschirmen?** In Bewegung werden kleinere Bilder gezeichnet (960 × 540), im Stillstand die großen.
4. **Sind 5,5 MB (Querformat) bzw. 3,9 MB (Telefon) für die Fahrt vertretbar?** Sie laden nachrangig und verzögern die Seite nicht.

Stellschrauben und Alternativen stehen in `docs/QA.md`, Abschnitt „Offen".

## Verlauf am 06.10.

Rückmeldung des Auftraggebers, zweimal: Die Animation sieht nicht nach 60 Bildern pro Sekunde aus. Das traf zu. Gemessene Ursachen und was dagegen getan wurde:

| Ursache | Messung | Maßnahme |
| --- | --- | --- |
| Zu wenige Bilder: 90 für rund 540 Bildschirm-Frames einer Durchfahrt | Zeichentakt 16,7 ms, aber jedes Bild stand vier bis sechs Frames | Bewegungsebene mit vierfacher Bildzahl: 357 im Querformat, 253 im Hochformat (960 × 540 bzw. 540 × 960) |
| Bild verschiebt sich pro ausgeliefertem Bild zu weit | Querformat Median 1,82 % der Bildbreite, im Schwenk bis 15,7 %; Hochformat Median 5,0 %, bis 37 % | Nach der Verdichtung: Querformat Median 0,31 %, außerhalb des Schwenks höchstens rund 1,1 %; Hochformat Median 1,13 % |
| Schnelle Schwenks bleiben auch vierfach zu grob | Querformat-Schwenk 4,0 % je Bild, Hochformat bis 9,8 % | Diese Bilder mit Bewegungsunschärfe gerendert (Querformat 65, Hochformat alle 253) |
| Kleinere, teils unscharfe Bilder dürfen nicht stehen bleiben | | Schärfe-Ebene: Im Stillstand blendet auf jedem Gerät das Basisbild in voller Auflösung ein |
| Auf langsamen Prozessoren fiel jedes zweite Bild aus | Bildtakt 35 ms bei vierfach gedrosselter CPU | Überblendung über den Compositor statt per Skript, keine Stil- und Layoutarbeit pro Frame: Bildtakt 17,7 ms |

Außerdem am 06.10.:

- **Hero-Layout:** Textspalte endet rechnerisch vor der Blüte und die Überschrift skaliert mit (vorher lag der Text auf dem Telefon im Querformat auf der Blüte); Papierschleier hinter dem Hochformat-Auftakt; deckende Etiketten; kürzerer Verlauf am unteren Rand.
- **Lesereihenfolge:** Auftakt, vier Kapitel, Ankunft (vorher stand die Ankunft vor den Kapiteln).
- **Navigation:** liest beim Scrollen keine Layoutwerte mehr.
- **Renderskript:** Bewegungsunschärfe (`--blur`, `--blur-step`, `--blur-fade`), Zwischenbilder (`--mod`, `--rem`).
- **Prüfwerkzeuge neu:** `journey.mjs`, `axtree.mjs`, `smtp.mjs`, `frame-steps.mjs`. `perf.mjs` zählt nur noch echte Bedienungen als Interaktion.
- **Dokumente:** `ASSETS.md`, `PRODUCT-TRUTH.md`, `SHOPIFY.md`, `QA.md`.

## Geprüft am Produktions-Build (06.10., 09:05)

Ausgaben in `.raw/qa/*-final.txt`.

- `tools/qa/journey.mjs`: alle 65 Prüfungen bestanden — vier Viewports, vorwärts und rückwärts identisch, Schärfe an jedem Haltepunkt, Ausfall der Bilddateien führt in die Fallback-Stufe, Stufen Medium und Low.
- `tools/qa/perf.mjs`: LCP 0,10–0,47 s am Desktop, 0,86–1,10 s im Telefon-Profil (CPU vierfach gedrosselt, langsames 4G); CLS höchstens 0,0002; längste Interaktion 120 ms; Bildtakt der Fahrt 17,7 ms in allen drei Profilen; keine Konsolen- oder CSP-Fehler.
- `tools/qa/a11y.mjs`: alle Prüfungen bestanden (13 Seiten, zwei Viewports, Kontraste, Tastatur, Menü, Formular).
- `tools/qa/axtree.mjs`: alle Prüfungen bestanden.
- `tools/qa/smtp.mjs`: alle Prüfungen bestanden (lokaler Test-Mailserver).
- `npm test`: 20 von 20. `astro check`: 0 Fehler. `npm audit`: 0 bekannte Schwachstellen.
- Security-Header, Caching, Brotli, 404, Schrägstrich-Weiterleitung, Pfad-Traversal, Anfrage-Endpunkt (405, 403, 422, 503 ohne SMTP), keine Secrets im Client-Bundle, Sitemap mit 11 Seiten, `robots.txt` gesperrt.
- Sichtprüfung per Screenshot: Hero an neun Viewports, die Hochformat-Fahrt an fünf Positionen, unscharf gerenderte Einzelbilder, Fassung ohne JavaScript, Stand im eingebauten Browser.

## Nicht geprüft

- **Die Fahrt in Bewegung, mit Augen.** Alles oben sind Messungen und Einzelbilder.
- Echte Geräte (iPhone, Android, iPad), Safari, Firefox.
- Ein echter Screenreader (geprüft ist der Accessibility-Baum von Chrome).
- Felddaten zur Performance; INP nur über skriptgesteuerte Bedienungen angenähert.
- SMTP mit den Zugangsdaten eines echten Anbieters; Betrieb hinter Proxy und TLS.
- Warenkorb im Browser gegen einen echten Shopify-Store.

## Rendern wiederholen

Sequenzbilder, die es schon gibt, werden übersprungen. Standbilder und Basis-Fahrten (Achtung: Die Standbilder rendert dieser Lauf jedes Mal neu, rund eine Stunde):

```bash
bash pipeline/blender/queue-all.sh
```

Zwischenbilder und unscharfe Abschnitte (lief am 06.10. von 02:59 bis 08:40, rund 5,7 Stunden; etwa 40 Sekunden je Bild):

```bash
(nohup bash pipeline/blender/queue-inbetweens.sh >> .raw/queue-fine.log 2>&1 &)
```

Danach `npm run assets:hero` (macht die Queue nach jeder Stufe selbst) und `npm run build`.

## Produktdaten und offene Businesspunkte

Vollständig in `docs/PRODUCT-TRUTH.md`. Kurz: V1-Produkt ist das 1-g-Glas; Etikettdaten sind bestätigt (05.10.2026); keine Preise auf der Website. Offen sind unter anderem Rücketikett und Foto für 1 g, WhatsApp-/QR-Ziel, SKU, MHD- und Chargenverfahren, Siegelfarbe, Logo als Vektor, Hosting und E-Mail-Dienst, rechtliche Prüfung. Das Projekt liegt nicht unter Versionskontrolle.
