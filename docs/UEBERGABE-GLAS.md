# Übergabe 07.10.2026 — Glas und Füllgut naturtreu (noch nichts umgesetzt)

## Auftrag

Wortlaut des Auftraggebers: „Letzte richtige Baustelle ist noch das Glas. Es wirkt generiert. Das darf auf gar keinen Fall sein. Sieh dir ganz genau die Referenzbilder auf der Website oder im Projektordner an, aber sorge bitte für maximale Echtheit und dass das Glas sowie der Inhalt wirklich naturtreu sind."

Dann: „Stelle bitte alle Musskriterien auf, bevor du etwas umsetzt."

**Stand:** Befund erhoben, Musskriterien aufgestellt und dem Auftraggeber vorgelegt. Am Code, am Master und an veröffentlichten Bildern ist nichts geändert.

## Freigabe und Antworten (07.10.2026, neuer Chat)

- **Musskriterien A–G: alle freigegeben.**
- **Glas:** Das 1-g-Glas ist baugleich mit den 0,5-g-Gläsern auf dem Foto. **Maße gibt es nicht.** Die Form wird per Kamera-Abgleich aus dem Foto bestimmt (A2).
- **Füllhöhe:** wie auf dem Foto, etwa bis zur Oberkante des Etiketts (D6). Das hat Vorrang vor der Fadenzahl aus dem Gewicht (D1). Wie viele Fäden diese Höhe ergeben, wird gemessen und genannt.
- **Umfang:** Siegel und Etikett gehören mit zum Auftrag.
  - Siegel: Schlaufe mit Luft über dem Kork, wie im Foto.
  - Etikett: wärmeres Papier, „SAFFRON" fett, Satz nach dem Foto.
  - Die Siegelfarbe ist noch offen (PRODUCT-TRUTH Punkt 8). Sie ist ein einzelner Parameter und steht vorläufig auf dem Blaugrau des Fotos.
- **Maßstab (Annahme, da keine Maße):** Das Frontetikett hat das Format des Rücketikett-Entwurfs, 44 × 49 mm. Die Körperbreite bleibt 4,44 BU, damit die Bildausschnitte halten. Daraus folgt der Maßstab mm je BU für Glas und Fäden.

## Umsetzung: Transaktionen (siehe `_agent/LOG.md`)

| ID | Inhalt | Schreibt nach Übernahme |
| --- | --- | --- |
| T-20261007-01 | Glaskörper und Kork nach Foto, Kamera-Abgleich (B, C, Teile von E) | `pipeline/blender/product_jar.py` (neu) |
| T-20261007-02 | Füllgut: Fadengeometrie, Material, Packung unter Schwerkraft (D, E5) | `pipeline/blender/saffron_fill.py`, `pipeline/blender/saffron-fill.json` (neu) |
| T-20261007-03 (noch nicht angelegt) | Etikett und Siegelschlaufe nach Foto, auf der neuen Glasform. Start erst, wenn T-01 fertig ist | `pipeline/blender/product_label.py` (neu) |
| danach, Hauptchat | Einbau in `web_hero.py`, Licht und Reflexe (E3, E4), Technik (F), Vergleichstafel und Testbilder (G) | `pipeline/blender/web_hero.py`, Doku |

## Wiedereinstieg (Stand 07.10.2026, 23:40, Sitzung wegen Nutzungslimit beendet)

Beide Agenten wurden um 23:33 mit dem Sitzungsende gestoppt. Keiner hat ein `ERGEBNIS.md`. **Im Projekt ist nichts übernommen**, und es läuft kein Blender. Der Zwischenstand liegt in `_agent/staging/`:

- **T-01:**
  - Kamera-Abgleich zum Foto: `tests/pose.json`, `tests/calib_jar2.json`.
  - Innenmaße: `jar-interior.json`, mit `mm_per_bu` 10,946, `inner_half_width` 2,0, `inner_floor_z` 0,57, `inner_shoulder_z` 3,99, `label_top_z` = `fill_top_z` 3,715. Der Körper bleibt damit ungefähr so hoch wie im Master.
  - Entwurf `product_jar.py`, `web_hero_test.py` und erster Silhouettenabgleich `tests/m1_abgleich.png`.
  - Messwerkzeuge in `tools/`.
- **T-02:** Entwurf `saffron_fill.py` mit Fadengenerator und quasi-statischer Packung, noch ungetestet. Cache und Testbilder fehlen noch.

**So geht es weiter:**

1. Je Transaktion einen neuen Agenten starten (`general-purpose`, im Hintergrund):
   - Auftrag wie bisher: `_agent/staging/<ID>/AUFTRAG.md`.
   - Dazu der Satz: „Im Staging-Ordner liegt dein Zwischenstand aus einer unterbrochenen Sitzung. Prüfe ihn, baue darauf auf und beginne nicht neu.“
   - T-02 rechnet die Packung gleich mit `_agent/staging/T-20261007-01/jar-interior.json`. Ändert T-01 die Datei noch, wird neu gepackt.
2. Ergebnisse gegen die Abnahmekriterien in den Aufträgen prüfen. Dann COMMIT nach `CLAUDE.md` mit Backup, Status `ÜBERNOMMEN`.
3. T-03 für Etikett und Siegel anlegen:
   - Satz nach dem Foto, „1 g“ statt „0,5 g“, wärmeres Papier, „SAFFRON“ fett.
   - Siegel als Schlaufe mit Luft über dem Kork, Farbe vorläufig das Blaugrau des Fotos, als ein Parameter.
4. Einbau in `web_hero.py`, Licht und Reflexe (E3, E4), F1/F2, Vergleichstafel (G1, G2), Testbilder (G3). Dem Auftraggeber zeigen, Queue erst nach Freigabe (G4).

Offene Frage an den Auftraggeber, gestellt und unbeantwortet: Siegelfarbe blaugrau wie im Foto?

## Zustand des Rechners (07.10., bei der Übergabe)

- Beide Queues sind durch: `.raw/queue-large.log` QUEUE-DONE 01:16, `.raw/queue-dense.log` QUEUE-DONE 02:22. Kein Blender läuft.
- Rendern nur mit Blender 4.5 und `RS_DEVICE=HIP` (siehe `docs/STATUS.md`, Abschnitt „Dieser Rechner"). Auf H: sind nur rund 18 GB frei.
- Der Master wird nie gespeichert oder überschrieben. Alle Änderungen gehören in `pipeline/blender/web_hero.py`.

## Referenzen

| Datei | Was | Taugt für |
| --- | --- | --- |
| `assets-src/photos/safran-glaeser-real.jpg` (= royalspices.de/safran-glaeser-real.jpg) | **Einziges echtes Foto**, 0,5-g-Gläser, 1152 × 1536 | Maßgeblich für Form, Glas, Füllgut |
| `../Projektübergabe/royal-spices/references/00-royal-spices-product-reference.png` (= `royal-spices-dev/references/Royal-Spices-3D-Referenztafel.png`) | Produkttafel, laut Fußnote KI-Rekonstruktion | Nur für nicht fotografierte Ansichten |
| `../Projektübergabe/royal-spices-dev/references/safran-display.jpg` | Display, auf royalspices.de als Visualisierung bezeichnet | Nicht als Vorlage für das Glas |

royalspices.de wurde am 07.10. geprüft: Es gibt dort keine weiteren Produktfotos.

Vergleichsausschnitte liegen in `.raw/tests/glass/`:

- `real-jar2.png`, `real-front-jars.png`: echte Gläser von vorn
- `real-left-side.png`: Seitenwand, Schulter, Hals
- `real-neck.png`: Hals, Lippe, Kork, Siegelschlaufe
- `real-base.png`: dicker Boden mit grünlichem Band
- `real-content-zoom.png`: Füllgut hinter Glas, vergrößert
- `render-jar.png`: aktueller Render, Ausschnitt aus `.raw/stills/desktop_p1000.png`
- `render-p0760-frame0068.png`: aktueller Render bei Fortschritt 0,76

## Befund: warum das Glas generiert wirkt

1. **Füllgut-Geometrie:** `SAFFRON | 1050 dry filaments` im Master (`build_scene.py` Z. 373–382, Packung aus `blender/dry-fill-packing.json`). Gemessen: 1.050 Stränge, Länge Median 0,93 BU (p10 0,71, p90 1,38), also rund 9 mm bei 1 BU = 1 cm. Runde Kurven-Röhrchen (Bevel 0,022, in `web_hero.py` `tune_materials()` auf 0,03 gesetzt), Radius spindelförmig mit dem Maximum in der Mitte, bei allen Strängen gleich (0,019). Ein echter Negin-Faden ist 2 bis 3,5 cm lang, flach, am Ansatz schmal und am Ende ein offener Trichter. Wirkung im Bild: Stahlwolle oder Haar.
2. **Füllgut zu hell und grau:** Gemessene mittlere sRGB-Werte:

   | | Füllgut | Etikettpapier | Verhältnis |
   | --- | --- | --- | --- |
   | Foto (Ausschnitt x 607–617, y 1005–1095) | 26/17/14 | 189/176/141 | ≈ 0,14 |
   | Render (`desktop_p1000`, x 2180–2240, y 850–1000) | 126/111/100 | 214/207/196 | ≈ 0,57 |

3. **Füllhöhe:** Stränge von z 0,51 bis 2,42. Innenboden liegt bei 0,44, Schulter innen bei etwa 3,9, also rund 55 % gefüllt. Im Foto reicht das Füllgut etwa bis zur Oberkante des Etiketts (rund 80 %).
4. **Glasmaterial** (`build_scene.py` Z. 100–101): IOR 1,49 ist Acrylglas; Kalk-Natron-Glas hat 1,52. Roughness 0,045 mattiert leicht und erzeugt einen Schleier vor dem Füllgut. Die Tönung kommt aus der Base Color (0,965/0,99/0,98) statt aus Volumenabsorption. Deshalb fehlen die grünlich-grauen dicken Kanten und der Boden, die im Foto deutlich sind.
5. **Reflexe:** Die gleichmäßig helle Welt (`setup_world_and_lights()`, Background 0,62) spiegelt sich als milchiger Schleier über die obere Glashälfte. Im Foto sind die Reflexe begrenzt, und das Innere bleibt durchsichtig.
6. **Form** (`build_scene.py` Z. 304–317, Superellipse mit Exponent 5, um die Achse gedreht): Körper außen 4,44 BU breit, rund 3,96 hoch (z 0,07–4,03). Er wirkt gedrungener als im Foto, die Flächen sind leicht kissenförmig, die Kanten gleichmäßig weich, alles perfekt symmetrisch und sauber. Wand 0,22 BU, Boden 0,37 BU; das helle Bodenband aus dem Foto liest sich nicht.
7. **Schatten:** Die Kaustiken sind aus (`setup_render()`, `caustics_refractive = False`). Das Glas wirft einen Schatten wie ein fester Körper.
8. **Lichtwege:** `transmission_bounces = 10`, `max_bounces = 10`. Ob das in Boden und Ecken reicht, ist nicht geprüft.

## Musskriterien (vorgelegt, noch nicht freigegeben)

**A. Vorlage und Maßstab**
- **A1:** Maßgeblich ist das echte Foto, dazu alles, was der Auftraggeber vom echten 1-g-Glas liefert. Produkttafel und Display nur für nicht fotografierte Ansichten.
- **A2:** Die Maße kommen vom echten Glas (Messschieber). Ohne Maße wird die Form per Kamera-Abgleich aus dem Foto bestimmt. Die Szene bekommt dafür einen echten Maßstab in mm, damit die Fadengröße im Verhältnis zum Glas stimmt.
- **A3:** Der Master bleibt unverändert. Alle Änderungen stehen in `web_hero.py` und werden in `docs/ASSETS.md` dokumentiert.

**B. Glasform**
- **B1:** Die Silhouette deckt sich mit dem Foto, wenn man beide mit gleicher Kamera übereinanderlegt. Abweichung höchstens 3 % der Körperbreite, geprüft an Körperproportion, Schulter, Hals, Lippe und Korküberstand.
- **B2:** Die Seitenflächen sind flach, nicht kissenförmig gewölbt. Die senkrechten Kanten haben den Radius aus dem Foto.
- **B3:** Die Schulter ist fast flach mit kurzem Übergang. Der Hals ist kurz und hat eine dicke, gerundete Lippe.
- **B4:** Die Wandstärke ist ungleichmäßig wie bei gepresstem Glas. Der Boden ist dick und zeigt unter dem Füllgut ein helles, grünliches Band. Innen sind die Radien größer als außen.
- **B5:** Fertigungsspuren sind dezent vorhanden: eine Formnaht, leichte Welligkeit der Flächen (nur in Reflexen und Brechung sichtbar), minimale Asymmetrie und ein Standring am Boden.
- **B6:** Der Kork sitzt mit Kontakt im Hals, und seine Unterseite ist wie im Foto durch den Hals zu sehen. Nichts durchdringt sich.

**C. Glasmaterial**
- **C1:** IOR 1,52 (Kalk-Natron-Glas).
- **C2:** Die Tönung entsteht nur im Glasvolumen. Dünne Wände sind farblos, Boden und Kanten in Blickrichtung grünlich-grau.
- **C3:** Die Oberfläche ist poliert, ohne Mattierungsschleier.
- **C4:** Gebrauchsspuren (Staub, Fingerabdruck) sind nur im Streiflicht der Reflexe sichtbar, nie als Textur.
- **C5:** Die Rückseite des Etiketts (Papier, Kleber) ist durch Seitenwände und Boden zu sehen, wie im Foto.

**D. Füllgut**
- **D1:** Die Fadenzahl folgt aus dem Gewicht. 1 g Negin sind rund 450 Fäden (etwa 150 Blüten je Gramm mal drei Narben; Literaturwert, am echten Glas nachzählbar).
- **D2:** Jeder Faden ist 2 bis 3,5 cm lang und ein flaches Band: am Ansatz schmal, am Ende ein offener, gekräuselter Trichter mit gezacktem Rand. Die Fäden sind verdreht, geknickt, teils gefaltet, einige sind abgebrochen. Kein Faden gleicht dem anderen, und es gibt keine gelben Griffelreste (Negin).
- **D3:** Das Material ist tief karminrot bis ochsenblutrot. Dünne Ränder scheinen im Gegenlicht orangerot durch. Feine Längsrillen und ein leicht wachsiger Glanz, keine Haar- oder Textiloptik.
- **D4:** Durch das Glas wirkt das Füllgut dunkel rotschwarz. Die mittlere Helligkeit liegt bei höchstens rund 20 % des Etikettpapiers, der Farbton ist klar rot und nicht graubraun. Einzelne Fäden sind nur an der Glaswand zu erkennen.
- **D5:** Die Packung ist physikalisch plausibel. Die Fäden haben sich unter Schwerkraft gesetzt und liegen unten dichter. Die Oberfläche ist unruhig, einzelne Fäden stehen heraus. An der Innenwand liegen Fäden flach an und sind dort als Kontaktstellen sichtbar. Nichts schwebt, nichts durchdringt sich; geprüft wird das wie im Master (Kapselprüfung).
- **D6:** Die Füllhöhe entspricht dem echten 1-g-Glas. Bis zur Klärung gilt das Foto: etwa bis zur Oberkante des Etiketts.

**E. Glas, Füllgut und Umgebung zusammen**
- **E1:** Durch flache Seiten ist das Füllgut scharf. Der lokale Kontrast erreicht mindestens 85 % des Werts ohne Glas. Geprüft wird das mit einem Testbild, in dem das Glas ausgeblendet ist.
- **E2:** An Kanten und im Boden erscheint das Füllgut verschoben, gestaucht und gespiegelt (Totalreflexion), wie im Foto.
- **E3:** Reflexe kommen nur von echten Flächen der Umgebung (Softbox, Karten, Raum), folgen der Form und sind klar begrenzt. Mindestens zwei Drittel jeder Seitenfläche bleiben ohne Schleier.
- **E4:** Der Schatten des Glases ist heller als bei einem festen Körper, zeigt eine Lichtbündelung (Kaustik) und ist durch das Füllgut leicht rötlich. An der Standkante liegt ein enger Kontaktschatten.
- **E5:** Die losen Fäden vor dem Glas (`add_threads()`) und das Füllgut sind derselbe Werkstoff.

**F. Technik**
- **F1:** Boden und Ecken haben keine schwarzen oder grauen Abbrüche. Geprüft wird das gegen ein Bild mit doppelter Bounce-Zahl.
- **F2:** Das Entrauschen verwischt keine Fäden hinter dem Glas. Geprüft wird ein Ausschnitt gegen ein Referenzbild mit sehr vielen Samples.
- **F3:** Jedes Bild mit dem Glas wird mit demselben Stand neu gerendert: beide Formate, Bewegung und Stillstand, Standbilder, Kapitelbild „Glas", `og.jpg`. Das Glas ist schon früh als Kante im Bild; den Bereich vor dem Rendern bestimmen. Alte und neue Bilder werden nicht gemischt.
- **F4:** Die Renderzeit pro Bild wird gemessen und genannt, bevor die Queue startet. Schätzung: grob 2 bis 5 Stunden auf der RX 9070, nicht gemessen.

**G. Abnahme**
- **G1:** Eine Vergleichstafel stellt einen Render mit nachgestellter Kamera und ähnlichem Licht neben das echte Foto. Dazu kommen 100-%-Ausschnitte: Seite mit Füllgut, senkrechte Kante, Boden, Hals mit Kork, Oberfläche der Füllung und Schatten.
- **G2:** Keiner dieser Fehler darf im Bild vorkommen: milchiger Schleier, runde Fasern, gleiche Fäden, glatte Oberfläche der Füllung, schwebende oder durchdringende Fäden, Kunststoffglanz, perfekte Symmetrie, gleichförmige Kantenreflexe, deckender Schatten, schwarze Abbrüche.
- **G3:** Danach kommen Testbilder: das Hero-Standbild quer und hoch sowie Sequenzbilder bei 76, 90 und 100 %.
- **G4:** Die Queue läuft erst nach Freigabe dieser Testbilder durch den Auftraggeber.

**Nicht im Auftrag, aufgefallen und dem Auftraggeber genannt**
- Siegel: Im Foto steht es als Schlaufe mit Luft über dem Kork und ist blaugrau. Im Render liegt es flach an und ist fast schwarz. Die Farbe ist ohnehin offen, `docs/PRODUCT-TRUTH.md` Punkt 8.
- Etikettpapier: Im Foto deutlich wärmer, und „SAFFRON" ist fett gesetzt.

## Offene Fragen an den Auftraggeber (gestellt, unbeantwortet)

1. **Glas:** Ist das 1-g-Glas dasselbe Glas wie auf dem Foto mit der 0,5-g-Ausführung?
2. **Maße:** Kann er ein echtes Glas mit dem Messschieber messen?
   - Körper außen (Breite × Tiefe × Höhe), Gesamthöhe ohne Kork
   - Hals außen und innen, Wandstärke am Hals, Bodenstärke
   - Kork (Durchmesser oben und unten, Höhe, Überstand), Etikett (Breite × Höhe)

   Dazu, wenn möglich, drei bis vier Handyfotos: von vorn, von der Seite, gegen ein Fenster und Fäden auf weißem Papier neben einem Lineal. Das ist der größte Hebel für Echtheit.
3. **Füllhöhe:** Wie hoch ist das 1-g-Glas gefüllt?
4. **Siegel und Etikett:** Gleich mit angehen oder nur Glas und Füllgut?

## Vorgeschlagene Reihenfolge nach der Freigabe

1. Antworten einarbeiten (Maße, Füllhöhe). Ohne Maße: Kamera-Abgleich mit `real-jar2.png`.
2. In `web_hero.py` das Glas des Masters ersetzen oder umformen (B), das Glasmaterial neu aufsetzen (C), Licht und Umgebung für die Reflexe prüfen (E3).
3. Füllgut neu erzeugen (D): Fadengeometrie, Packung unter Schwerkraft, Kontaktprüfung. Dann E1, F1 und F2 messen.
4. Vergleichstafel (G1, G2), dann Testbilder (G3). Dem Auftraggeber zeigen.
5. Nach Freigabe: Renderzeit messen (F4), Queue für alle Bilder mit Glas (F3), `npm run assets:stills`, `npm run assets:hero`, Build und Prüfskripte wie in `docs/STATUS.md`.

Testbild (Beispiel):

```bash
RS_DEVICE=HIP bash pipeline/blender/render.sh --variant desktop --mode still --p 1 --res 1920x1080 --spp 64 --noise 0.03 --out .raw/tests/glass --tag probe
```
