# Assets, 3D und Fallback

Wie die Bilder der Website entstehen, wie der Hero ausgeliefert wird und was ohne Bewegung übrig bleibt.

## Grundsatz

Die Offline-Produktion ist die visuelle Wahrheit (Spezifikation §7, §10). Der Browser rechnet kein 3D. Er zeigt Bilder, die Blender mit Cycles gerechnet hat:

- **Warum kein WebGL:** Der Hero lebt von Makro-Schärfentiefe, Glasbrechung, Subsurface in Blütenblättern und 1.050 einzelnen Fäden im Glas. In Echtzeit wäre das auf durchschnittlicher Hardware nur mit sichtbaren Abstrichen möglich. Vorgerendert ist jedes Bild so gut wie der Master, und die Kosten im Browser sind die einer Bildfolge.
- **Was dafür wegfällt:** freie Interaktion mit dem Objekt. Die Fahrt hat genau einen Freiheitsgrad, den Fortschritt. Das entspricht dem Storyboard (§6) und der Vorgabe „keine permanente Objektrotation".
- **Folge für die Checkliste:** Geometrie, Draw Calls, Shader, Texturspeicher und Postprocessing im Browser sind nicht anwendbar. Geprüft werden stattdessen Bildgrößen, Decodierkosten, Speicher und Bildrate beim Scrollen (`docs/QA.md`).

## Quelle

`../Projektübergabe/royal-spices/blender/royal-spices-master.blend` (Blender 4.5 LTS). Der Master wird nie gespeichert oder überschrieben. `pipeline/blender/web_hero.py` lädt ihn und leitet die Web-Fassung im Arbeitsspeicher ab.

Zur Einordnung, wie im Übergabepaket dokumentiert: Die Szene ist eine recherchierte Rekonstruktion, kein Scan. Glas, Blüte, Griffel, Narben, Staubblätter, Kork, Siegel und Füllgut sind Geometrie. Die Farbvorlagen für Blütenblätter und frische Narben wurden mit einem Bildgenerator ausgearbeitet und sind keine kalibrierten Messdaten. Das Frontetikett ist nach der Produkttafel rekonstruiert, nicht aus Druckdaten.

### Änderungen gegenüber dem Master

| Änderung | Grund |
| --- | --- |
| Mengenzeile des Frontetiketts „0,5 g" → „1 g" | Bestätigtes V1-Produkt (05.10.2026) |
| Rücketikett ausgeblendet | Die Vorlage ist der 0,5-g-Entwurf; ein 1-g-Rücketikett existiert nicht |
| Eine Prise getrockneter Fäden zwischen Blüte und Glas (18 Fäden, von Hand gelegt) | Kapitel „Safran" der Fahrt. Gebaut aus dem Trockenfaden des Masters, mit eigener Verdrehung, zwei Knicken und Materialvariation je Faden. Nichts bewegt sich während der Aufnahme: Die Fahrt behauptet nicht, dass Safran von selbst ins Glas wandert |
| Grund, Welt und Lichtbalance neu gesetzt | Warmer Papierton statt neutralem Studio; passt zur Farbwelt der Etiketten |
| Zwei schwarze Karten außerhalb des Bildes | Dunkle Kanten im Glas auf hellem Grund |
| Ein niedriges Gegenlicht hinter dem Glas | Die Fäden lesen sich durch das Glas rot statt schwarz |
| Eine Lichtfläche wandert während der Produktenthüllung über das Glas | Der eine animierte Reflex aus §6 („65–82 %"); er erklärt die Form |
| Füllgut: etwas kräftigere Fäden, wärmeres Rot | Lesbarkeit der Fäden im Glas bei Web-Auflösung |
| Kamerafahrt: zwei eigene Pfade statt des einen 85-mm-Pfads | Eigene Kompositionen für Quer- und Hochformat (§13) |
| Am Narben-Haltepunkt (Fortschritt 0,40): Die Kamera verlässt zwischen Fortschritt 0,325 und 0,475 den gesetzten Pfad für eine Makro-Position vor dem Ende der Narbe (Abstand 1,9 statt 5,6 Einheiten, 50° zur Achse des Narbenastes, Blende 2,0, Schärfepunkt auf dem Ende) | Auf dem gesetzten Pfad war das Ende der Narbe rund 5 % der Bildbreite groß, von der Seite gesehen und nur kurz scharf (Rückmeldung des Auftraggebers, 06.10.). Der gefaltete Endquerschnitt und der papillöse Rand, die der Master modelliert, waren so nicht zu lesen. Zwischen 0,375 und 0,425 zeigt das Bild allein die Makro-Ansicht, mit langsamer Annäherung und leichtem Schwenk; außerhalb von 0,325 bis 0,475 ändert sich kein Bild |
| Enden der drei frischen Narbenäste geöffnet: Das Ende weitet sich trompetenförmig, die geschlossene Endfläche wird zur Mulde, der Rand ist unregelmäßig gekerbt und fein gezähnt. Gewebe durchscheinend (Subsurface 0,35 statt 0,045), leichter Samtschimmer, Rand etwas heller und orangeroter, feine Zellstruktur und Papillen als Relief (`refine_stigma_ends`, nur im Arbeitsspeicher). Die 141 Papillen-Kurven des Masters (`Papilla_*`, je 47 um das geschlossene Ende) sind ausgeblendet: Sie wandern mit der geöffneten Form nicht mit und schwebten sonst als Ring heller Striche in der Mulde (gefunden am 06.10. um 23:20 im ersten Bild in voller Auflösung) | Rückmeldung des Auftraggebers (06.10. abends): Die Nahaufnahme der Narbenspitze muss absolut realistisch sein und darf nicht gerendert aussehen. Der Master modelliert das Ende als geschlossenen, gefalteten Querschnitt; nah gesehen las es sich als abgeschnittenes rotes Profil, wovor die Notizen des 3D-Artists ausdrücklich warnen („keine rote Kunststoffschnur"). Die Quellen beschreiben trichterförmige Narbenlappen mit papillösem Rand [S4]. Die Form ist eine Interpretation dieser Beschreibung und der Fotos P01/P02, keine Messung |
| Ausstieg aus der Makro-Ansicht (`leave_hold`): Der gesetzte Weg von der Narbe zu den Fäden beginnt erst nach der Makro-Ansicht, sanft, und auf halbem Weg zieht die Kamera etwas zurück (Abstand bis × 1,5) | Rückmeldung (06.10. abends): „Szenensprung statt Übergang". Der gesetzte Pfad lief während der Makro-Ansicht weiter; beim Verlassen musste die Kamera aufholen: Narbe, leerer Boden, Fäden in rund 3 % der Fahrt. Jetzt stehen Narbe und Fäden kurz gemeinsam im Bild (Fortschritt 0,48) |
| Hochformat ab dem Produkt (76, 90, 100 %): dieselbe Sichtlinie wie im Querformat, nur weiter zurück (Faktor 1,42 bzw. 1,30), Ausschnitt per Objektivverschiebung | Rückmeldung (06.10. abends): Auf dem Telefon war die Abfolge nicht dieselbe. Das Hochformat fuhr ans Etikett heran, und am Ende war die Blüte abgeschnitten. Jetzt zeigt es dieselben Einstellungen: Blüte, Glas und Fäden nebeneinander, innerhalb der mittleren 82 % der Bildbreite, die ein 9:19,5-Telefon zeigt, oberhalb des Textschilds |
| Blende außerhalb des Narben-Haltepunkts fest auf 0,11 | Der Master animiert die Blende an den Kameradaten. Diese Animation wurde vom Renderskript nie entfernt: Alle Bilder beider Fahrten sind mit dem Wert des letzten Master-Frames (0,11) gerendert, nicht mit den Blenden der Schlüsselpositionen (gefunden am 06.10.; deshalb blieb die Narbe nach der ersten Korrektur weich). Der veröffentlichte Look bleibt so; die gesetzten Blenden überall zu verwenden hieße, beide Fahrten neu zu rendern |

## Die Fahrt

Zwei von Hand gesetzte Kamerapfade, je sieben Schlüsselpositionen, 85 mm Brennweite, Blende und Schärfepunkt pro Position:

| Fortschritt | Kapitel (§6) | Was die Kamera tut |
| --- | --- | --- |
| 0 % | Origin | Makro im Blüteninneren, Schärfe auf einem Narbenast |
| 22 % | Crocus | Rückzug: die Blüte als Ganzes |
| 40 % | Narbe | Annäherung an die Spitze eines Narbenastes |
| 56 % | Safran | Schwenk auf die getrockneten Fäden daneben |
| 76 % | Produkt | Rückzug auf das Glas, der Reflex wandert |
| 90 % | Royal Spices | Schärfe auf dem Etikett, 3/4-Ansicht |
| 100 % | Hero State | Kamera steht; diese Komposition ist das Standbild der Website |

Zwischen den Positionen: Catmull-Rom für Ort, Ziel und Schärfepunkt, weiches An- und Abfahren, Blende logarithmisch wie ein echter Blendenzug. Hochformat ist ein gedrehter Sensor, kein Ausschnitt: Der Auftakt hält das Motiv tief (Überschrift darüber), alle späteren Positionen hoch (Beschriftung darunter). Beide Formate zeigen dieselbe Abfolge von Einstellungen; das Hochformat steht dafür auf derselben Sichtlinie weiter zurück (Vergleich: `docs/sequenz-quer-hoch.png`).

**Tempo beim Scrollen.** Der Fortschritt ist nicht überall proportional zum Scrollweg. Von 0,425 bis 0,56 (von der Makro-Ansicht der Narbe zu den Fäden) kostet die Fahrt den doppelten Scrollweg, mit weichen Übergängen (`slow` in `src/data/journey.ts`, umgerechnet in `src/scripts/journey.ts`; Prüfskripte nutzen dieselbe Umrechnung, `scrollToProgress` in `tools/qa/browser.mjs`). Die Seite ist entsprechend länger (849 statt 760 svh), alle anderen Abschnitte behalten ihr Tempo. Gemessen bei 900 px Fensterhöhe: 5940 px Scrollweg je Fortschrittseinheit, im langsamen Abschnitt 11875 px.

Rendereinstellungen: Cycles, 48 Samples adaptiv (Schwelle 0,035) für Sequenzbilder, 96 Samples (0,02) für die beiden Standbilder je Format, OpenImageDenoise, keine Kaustiken. Die Basisbilder des Narben-Kapitels (Querformat 29–42, Hochformat 21–29) sind in voller Größe (1920 × 1080 bzw. 720 × 1280) mit 64 Samples gerendert: Dort verweilt man am längsten.

**Verweilen an der Narbe.** In der Makro-Ansicht (Querformat Positionen 264 bis 306, Hochformat 187 bis 216) ist jede Position des Rasters belegt, nicht nur jede zweite, also doppelt so viele Bilder wie sonst. Sie sind scharf, ohne Bewegungsunschärfe, mit 64 Samples und größer als der Rest der Bewegungsebene gerendert (1440 × 810 bzw. 720 × 1280), damit die Narbe auch während des Scrollens scharf ist und nicht erst im Stillstand. Quelle: `.raw/<Variante>-hold`; in der Bewegungsebene haben diese Bilder Vorrang vor allen anderen.

## Auslieferung des Hero

### Bewegung und Stillstand: zwei Ebenen

Die Fahrt wird als Bildfolge ausgeliefert und beim Scrollen gezeichnet (`src/scripts/journey.ts`).

**Wie gezeichnet wird.** Zwei übereinanderliegende Canvas-Elemente halten die beiden Bilder rund um die Kameraposition; die Deckkraft des oberen ist die Überblendung. Pro Bildschirm-Frame ändert sich nur diese Deckkraft, und ein Bild wird genau einmal in ein Canvas kopiert, wenn es ins Spiel kommt. Jedes Canvas hat die Größe seines Bildes; Zuschnitt und Skalierung übernimmt der Browser (`object-fit`, mit demselben Bildschwerpunkt wie die Standbilder). So bleibt der Haupt-Thread frei von Pixelarbeit. Was sich pro Frame ändert, wird nur an dem Element gesetzt, das es braucht (Fortschrittsfaden, Ausblendung am Ende), und die Navigation liest während des Scrollens keine Layoutwerte. Gemessen mit vierfach gedrosselter CPU: Jedes Bild wird gezeichnet (Bildtakt 16,7 ms bei 60 Hz), vorher fiel jedes zweite aus.

**Wie die Kamera folgt.** Die Scrollposition wird nur gelesen. Die Kamera folgt ihr wie eine kritisch gedämpfte Feder: Ihre Geschwindigkeit springt nie, sie fährt weich an und läuft weich aus, ohne Überschwingen, und die einzelnen Rasten eines Mausrads verschmelzen zu einer Bewegung.

**Warum viele Bilder.** Der Bildschirm zeichnet 60-mal pro Sekunde. Eine Fahrt, die jemand in neun Sekunden durchscrollt, braucht dafür rund 540 Bildschirm-Frames. Mit 90 Bildern steht jedes Bild vier bis sechs Frames lang und wird dazwischen überblendet: Das wirkt wie 10 bis 15 Bilder pro Sekunde, unabhängig von der Rechenleistung. Gemessen am 06.10.2026 in der Vorschau: Zeichentakt 16,7 ms, also 60 pro Sekunde, bei nur 90 verschiedenen Bildern.

**Deshalb zwei Ebenen:**

| Ebene | Bilder | Größe | Wann |
| --- | --- | --- | --- |
| Bewegung | Basisbilder plus drei Zwischenbilder je Schritt: 357 im Querformat, 253 im Hochformat | 1440 × 810 bzw. 720 × 1280 auf leistungsfähigen Geräten mit großem Bild, sonst 960 × 540 bzw. 540 × 960 | solange die Kamera fährt |
| Stillstand | nur die Basisbilder: 90 bzw. 64 | bis 1920 × 1080 bzw. 720 × 1280 | sobald die Kamera ruht: Das scharfe Bild blendet über das bewegte |

Die Kamera kommt immer auf einem Basisbild zur Ruhe (sie gleitet die letzten Schritte dorthin), damit es dafür ein scharfes Bild gibt. An Anfang und Ende übernehmen wie bisher die beiden Standbilder.

**Warum die Bewegungsebene groß ist.** Zuerst waren die Zwischenbilder nur in 960 × 540 bzw. 540 × 960 gerendert. Auf dem 16-Zoll-Laptop des Auftraggebers (Display 2560 × 1600, Skalierung 150 %) wird ein Bild dieser Größe 2,7-fach gestreckt: Beim Scrollen war die Fahrt weich und blockig („verpixelt"), im Stillstand scharf (Vergleich in Gerätepixeln: `docs/vergleich-bewegung-stillstand.png`). Seit dem 06.10.2026 werden die Zwischenbilder deshalb in 1440 × 810 bzw. 720 × 1280 gerendert (`pipeline/blender/queue-large.sh`). Daraus entstehen zwei Größen der Bewegungsebene: die großen Sätze `d-1440m` und `m-720m` und, daraus verkleinert, `d-960` und `m-540` für schwächere Geräte und kleine Fenster. Weil alle Bilder eines kleinen Satzes aus größeren Renderings verkleinert sind, ist keins schärfer als seine Nachbarn.

**Bewegungsunschärfe in schnellen Abschnitten.** Auch viermal so viele scharfe Bilder liegen zu weit auseinander, wo die Kamera schnell reist. Gemessen (`frame-steps`, Verschiebung des Bildes pro Basisschritt in Prozent der Bildbreite): im Querformat meist 0,3 bis 4 %, im Schwenk von der Narbe zu den Fäden bis 15,7 %; im Hochformat, wo der schmale Rahmen schneller durchquert ist, 1 bis 9 % und im Schwenk bis 37 %. Eine Überblendung liest sich erst unter etwa einem halben Prozent als Bewegung; darüber sieht man das Motiv doppelt.

Diese Abschnitte werden deshalb wie Film gerendert: Der Verschluss bleibt von einem Zwischenbild zum nächsten offen, benachbarte Bilder verwischen ineinander. Die Unschärfe folgt der Geschwindigkeit der Kamera, an den vier Kapitel-Haltepunkten wird sie auf null ausgeblendet (voll erst rund 3,5 % der Fahrt weiter; an der Narbe ist die gesamte Makro-Ansicht frei davon, voll erst 5 % weiter), und ebenso an den Rändern eines unscharfen Abschnitts. Unscharf sind nur Bilder der Bewegungsebene:

- Querformat: die Fahrt in die Makro-Ansicht der Narbe hinein (Positionen 232 bis 264) und aus ihr heraus über die Fäden bis zum Glas (306 bis 528).
- Hochformat: die gesamte Bewegungsebene.

Ein ruhendes Bild ist nie unscharf: Im Stillstand übernimmt auf jedem Gerät das scharfe Basisbild. Die scharfen Zwischenbilder des Querformat-Schwenks bleiben erhalten; `RS_NO_BLUR=1 npm run assets:hero` baut die Bewegungsebene ohne Unschärfe. Im Hochformat gibt es keine scharfen Zwischenbilder; ohne Unschärfe bleiben dort die 64 Basisbilder.

- **Raster:** Positionen liegen auf einem Raster von acht je Basisschritt (713 im Querformat, 505 im Hochformat). Belegt waren zuerst die geraden, in der Makro-Ansicht der Narbe alle. Seit dem 07.10.2026 (Entscheidung des Auftraggebers, „Option A") werden auch die ungeraden gerendert (`pipeline/blender/queue-dense.sh`): doppelt so viele Bilder in der Bewegungsebene, bei neun Sekunden Durchfahrt rund 79 statt 42 Bilder pro Sekunde im Querformat, 56 statt 28 im Hochformat. Die unscharfen ungeraden Bilder haben dieselbe Belichtungslänge wie ihre geraden Nachbarn (zwei Positionen); die Belichtungen überlappen sich zur Hälfte, und keine Strecke wechselt den Look.
- **Zwischen zwei benachbarten Bildern** wird überblendet. Bei eng liegenden oder ineinander verwischten Bildern liest sich das als Bewegung.
- **Bei schnellem Scrollen** überspringt der Player Positionen (jede zweite, vierte, dann nur die Basisbilder), damit nie mehr Bilder decodiert werden müssen, als das Gerät schafft.
- **Messung:** `node tools/qa/frame-steps.mjs` zeigt, wie stark sich das Bild von einem ausgelieferten Bild zum nächsten ändert. Die Zwischenbilder rendert `pipeline/blender/queue-large.sh` (1440 × 810, 720 × 1280); `pipeline/blender/queue-inbetweens.sh` enthält die Stufen der ersten, kleinen Renderings und die Makro-Ansicht der Narbe.

Dateien: `public/hero/5/<Satz>/<Position>.webp` (die Zahl zählt hoch, wenn sich veröffentlichte Bilder ändern, weil Browser sie eine Woche lang unter ihrem Namen behalten). WebP statt AVIF, weil die Folge gescrubbt wird und die Decodierzeit zählt. Welche Positionen es je Satz gibt, steht in `src/data/hero-manifest.json` (erzeugt von `pipeline/images/build-hero.mjs`).

### Sätze

| Satz | Ebene | Für | Bildgröße |
| --- | --- | --- | --- |
| `d-1440m` | Bewegung | Querformat, Stufe High, wenn das Bild auf dem Schirm breiter als 1100 Gerätepixel ist | 1440 × 810 |
| `d-960` | Bewegung | Querformat, alle übrigen Geräte | 960 × 540 (in der Makro-Ansicht der Narbe 1440 × 810) |
| `m-720m` | Bewegung | Hochformat, Stufe High, wenn das Bild auf dem Schirm breiter als 620 Gerätepixel ist | 720 × 1280 |
| `m-540` | Bewegung | Hochformat, alle übrigen Geräte | 540 × 960 (in der Makro-Ansicht der Narbe 720 × 1280) |
| `d-1440` | Stillstand | Querformat | 1440 × 810 |
| `d-1920` | Stillstand | Querformat ab 1700 Gerätepixeln Breite, Stufe High | 1920 × 1080 ab der Produktenthüllung, davor 1440 × 810 |
| `m-720` | Stillstand | Hochformat | 720 × 1280 |

Die Bilder der Stillstand-Ebene werden einzeln geladen, wenn die Kamera ruht; die der Kapitel-Haltepunkte vorab. Aktuelle Bildzahlen und Datenmengen je Satz: `docs/QA.md`, Abschnitt Performance.

### Qualitätsstufen

Die Stufe richtet sich nach dem Gerät (Arbeitsspeicher, Kerne), nicht nach der Netzschätzung des Browsers.

| Stufe | Wann | Was gezeichnet wird |
| --- | --- | --- |
| **High** | mehr als 4 GB und mehr als 4 Kerne | Alle Bilder der Bewegungsebene, bei Tempo ausgedünnt, bei großem Bild aus den großen Sätzen; Schärfe im Stillstand |
| **Medium** | bis 4 GB oder bis 4 Kerne | Ein Zwischenbild je Basisschritt (halb so viele Bilder); Schärfe im Stillstand |
| **Low** | bis 2 GB oder bis 2 Kerne | Jedes dritte Basisbild; Schärfe im Stillstand; drei statt sechs parallele Downloads |
| **Fallback** | Bilder lassen sich nicht laden oder decodieren (mehr als sechs Fehler) | Die Bühne bleibt stehen, die Kapitel laufen weiter, das Auftaktbild blendet bei 62 % in das Ankunftsbild über |
| **Statisch** | kein JavaScript, `prefers-reduced-motion`, Save-Data, Browser ohne `createImageBitmap` | Keine Fahrt. Die Ankunfts-Komposition ist der Hero, die Reise folgt als vierteiliger Bild-Essay mit denselben Texten |

Fallback und statische Fassung sind eigene Kompositionen mit denselben Inhalten und beiden Handlungen, keine Fehlermeldung. Geprüft mit `node tools/qa/journey.mjs` (blockiert die Bilddateien, überschreibt die Gerätewerte) und per Screenshot.

### Ladereihenfolge

1. HTML und CSS: Überschrift, Navigation und beide Handlungen stehen ohne ein einziges Hero-Bild.
2. Ein Standbild, per `preload` mit hoher Priorität: im bewegten Modus das Auftaktbild, im statischen das Ankunftsbild, je nach Format quer oder hoch. Das ist das LCP-Element.
3. Schriften (drei Dateien, selbst gehostet).
4. Erst danach, mit niedriger Priorität, die Bewegungsebene: erstes und letztes Bild, dann jedes 16., 8., 4., 2. Basisbild, dann die Basisbilder vollständig, dann die Zwischenbilder, vom Groben zum Feinen (jede vierte, jede zweite, jede Position). Die Fahrt ist nach einer Handvoll Bildern benutzbar und wird feiner, während der Rest eintrifft.
   **Bremse für langsame Leitungen:** Die Basisbilder kommen immer. Jede feinere Stufe beginnt nur, wenn sie bei der bis dahin gemessenen Datenrate (gemessen an den Bildern selbst, nicht an der Netzschätzung des Browsers) in höchstens acht Sekunden vollständig wäre (`REFINE_SECONDS` in `src/scripts/journey.ts`). Sonst bleibt die Fahrt auf der Stufe, die vollständig da ist, gleichmäßig dicht statt halb gefüllt. Großer Querformat-Satz gerechnet: Bei 50 Mbit/s kommen alle Stufen, bei 10 Mbit/s alle außer der feinsten (dann so dicht wie vor Option A), bei 3 Mbit/s rechnerisch eine Zwischenstufe. Gemessen (gedrosselte Leitung in `tools/qa/journey.mjs`) bleibt es bei 3 Mbit/s bei den 90 Basisbildern, weil die tatsächlich erreichte Rate unter dem Nennwert der Leitung liegt; die Fahrt läuft trotzdem durch. Welche Stufe erreicht ist, steht in `data-detail` am Hero (8 = nur Basisbilder, 1 = jede Position).
5. Danach die scharfen Bilder der Kapitel-Haltepunkte; alle anderen erst, wenn die Kamera dort ruht.
6. Das Ankunfts-Standbild in voller Auflösung wird erst geladen, wenn es gebraucht wird (`loading="lazy"`).

Im Speicher liegen die komprimierten Dateien der Bewegungsebene; decodiert ist nur, was in ein Budget passt (96 MB auf der Stufe High, 48 MB Medium, 32 MB Low; gezählt in Pixeln, auf High also rund 20 Bilder in 1440 × 810), jeweils rund um die aktuelle Position, dazu höchstens zehn scharfe Bilder.

## Standbilder

`pipeline/images/build-stills.mjs` erzeugt AVIF und WebP in mehreren Breiten und schreibt `src/data/stills.json`. Templates setzen daraus `srcset`, `sizes`, `width` und `height`; nichts ist von Hand eingetragen.

| Bild | Quelle | Breiten |
| --- | --- | --- |
| Auftakt und Ankunft, Querformat | eigene Standbilder, 2560 × 1440 | 960–2560 |
| Auftakt und Ankunft, Hochformat | eigene Standbilder, 1080 × 1920 | 540–1080 |
| Vier Kapitelbilder (Crocus, Narbe, Safran, Glas) | Bilder der Querformat-Fahrt selbst: Essay und Fahrt zeigen dasselbe | 640–1440 |
| Botanische Abbildung | Ansicht „E" des Masters im Web-Set, vollständig scharf, in der Seite beschriftet | 640–1920 |
| Gläser, Catering | Fotos des Auftraggebers (`assets-src/photos/`) | 480–1200 |
| `og.jpg` | Ankunft, 1200 × 630 | – |

Alle Bilder außerhalb des ersten Bildschirms laden `lazy`. Alt-Texte beschreiben, was zu sehen ist.

## Schriften

Cormorant Garamond Medium (aufrecht und kursiv) und Manrope Variable (400–700), beide SIL Open Font License (`assets-src/font-license-*.txt`), nur der lateinische Zeichensatz, drei WOFF2-Dateien, zusammen rund 72 kB, selbst gehostet, mit `preload` und metrisch angepassten Ersatzschriften gegen Layoutsprünge. Beide Schriften stehen so auf den Etiketten.

## Neu erzeugen

```bash
bash pipeline/blender/queue-all.sh
```

rendert Standbilder und beide Basis-Fahrten (auf dieser Maschine rund sechs Stunden, fortsetzbar).

```bash
bash pipeline/blender/queue-inbetweens.sh d-dwell m-dwell
```

rendert die Makro-Ansicht der Narbe (jede Position, scharf; rund 3,5 Stunden).

```bash
bash pipeline/blender/queue-large.sh
```

rendert seit dem 06.10. abends beide Fahrten vollständig: Basisbilder, Makro-Ansicht der Narbe, Zwischenbilder in 1440 × 810 und 720 × 1280, Standbilder und botanische Abbildung (auf dieser Maschine rund 24 Stunden, fortsetzbar, einzelne Stufen wählbar; Stufen im Skriptkopf). Die übrigen Stufen von `queue-inbetweens.sh` rendern Zwischenbilder klein (960 × 540, 540 × 960); sie werden nur gebraucht, wenn die großen fehlen.

```bash
RS_DEVICE=HIP bash pipeline/blender/queue-dense.sh
```

rendert die ungeraden Positionen des Rasters (Option A, 07.10.): Querformat 335, Hochformat 237 Bilder, auf der RX 9070 rund eine Stunde, fortsetzbar.

```bash
npm run assets:stills
```

```bash
npm run assets:hero
```

Einzelne Prüfbilder, z. B. die Ankunft im Hochformat:

```bash
bash pipeline/blender/render.sh --variant mobile --mode still --p 1 --res 540x960 --out .raw/tests --tag check
```

`.raw/` (Renderings) und `public/hero/`, `public/img/` (erzeugte Dateien) sind Build-Ergebnisse und lassen sich aus dem Master wiederherstellen.
