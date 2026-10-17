# Übergabe 11.10.2026: Licht und Reflexe (E3, E4), Testbilder (G), Demo-Ausrollung

Vorgänger: `UEBERGABE-GLAS.md` (Musskriterien A–G, am 07.10. freigegeben). Transaktionslog: `../../_agent/LOG.md`.

**Ziel des Auftraggebers:** Die nächste Version bald für die Demo ausrollen. Pragmatisch vorgehen, aber ohne milchigen Schleier auf dem Glas.

## Stand 16.10. (vierter Chat): Glas immer noch zu dunkel, neue Kriterien R1–R6

- **Erledigt:** 1.468 alte Bilder liegen in `.raw/prev-e3/`. `docs/ASSETS.md` ist um Produktnachbau, Moltonkarten, Produkt-, Füll- und Flaggenlicht ergänzt (Tabelle „Änderungen gegenüber dem Master“).
- **Queue gestartet und angehalten.** Start am 15.10. um 21:49. `queue-all` war um 22:30 fertig. `queue-large` brach um 22:41 ab, als die Claude-Sitzung endete: Ein mit `nohup` gestarteter Prozess überlebt das Sitzungsende nicht. Die nächste Queue deshalb im Terminal-Panel starten (`run_in_terminal`), mit dem Befehl als eine Zeile. Am 16.10. um 14:17 fortgesetzt, um 14:25 angehalten. Gerendert mit dem Stand T-02 sind alle `queue-all`-Bilder und 82 von 256 in `desktop-blur-1440`. Sie werden nach dem Umbau ersetzt: wieder wegschieben, z. B. nach `.raw/prev-e3b/` (`move-old.sh` mit geändertem Zielordner), `anatomy.png` bleibt.
- **Nutzer am 16.10.:** Das Glas ist im Vergleich zur Website-Referenz zu dunkel und unnatürlich (Bild des Nutzers ≈ Ausschnitt aus `assets-src/photos/ref-neu-negin-1g-premium.png`). Ursachen:
  1. Der Kern ist rotschwarz, zwischen den Fäden sieht man Schwarz.
  2. Die dunklen Moltonkarten spiegeln sich als schwarze Streifen in Wänden und Kanten und sind durch den leeren oberen Teil des Glases zu sehen.
  3. Die Fäden sind gröber als in der Referenz (nicht im Umfang).
  4. Der Kork ist dunkel (nicht im Umfang).
- L2 und L3 waren die falschen Kriterien: L2 verlangt nur Median ≥ 0,05 × Papier, L3 verlangt Dunkelheit.
- **Freigegeben am 16.10.:** Umfang „Füllung hell + Glas klar“ (nicht feinere Fäden, nicht Kork). Musskriterien R1–R6 ersetzen L2–L4:
  - R1 Füllung hell: Median V ≥ 0,55 in jedem Füllfeld
  - R2 keine dunklen Lücken: je Füllfeld V < 0,25 ≤ 8 %, V < 0,40 ≤ 25 %
  - R3 Farbe: Farbton 5–20°, Sättigung Median ≥ 0,6
  - R4 Glas klar: Kante, Schulter, Boden je Feld V < 0,25 ≤ 8 %, Glanzlinien bleiben (L5)
  - R5 bleibt: L1 Papier, L6 außerhalb ≤ 1 %, L7 Renderzeit ≤ 1,15 ×, L8 Flagge
  - R6 Sichtprüfung durch den Nutzer: Tafel Referenz | Render quer und hoch, vor der Queue
  - Referenzwerte (Bild des Nutzers): Füllung V 0,58–0,68, V < 0,25 2–6 %, V < 0,40 12–24 %, Farbton 9–15°, Sättigung 0,60–0,79. Kante V < 0,25 1 %.
  - Gemessen wird quer p 1, dazu p 0,9 und hoch p 1. Für p 0,9 und hoch fehlen die Felder noch.
- **Werkzeug** in `_agent/staging/INTEGRATION-20261016/tools/`, ändert nichts im Projekt. Backup des Codes vor dem Umbau liegt in `../backup/` (`web_hero.py`, `saffron_fill.py`, `product_jar.py`).
  - `r.sh <tag>` rendert quer p 1 (1280×720, 48 spp, etwa 20 s) nach `.raw/tests/glass-r/`. Konstanten über die Umgebung: `TUNE_SF_<NAME>=<Python-Ausdruck>` (saffron_fill), `TUNE_PJ_` (product_jar), `TUNE_WH_` (Zeile in web_hero.py).
  - `node measure.cjs <bild> [<basis>]` misst die Felder R1–R4 (Koordinaten auf 2560×1440 bezogen), Papier und L6.
- **Versuche** (quer p 1, Werte V-Median / Anteil V < 0,25):

| Versuch | Füllung Seite | über Etikett | linke Kante | Bemerkung |
|---|---|---|---|---|
| `base` (Stand T-02) | 0,49 / 6 %, S 0,70 | 0,28 / 40 % | 34 % | R1, R2, R4 nein |
| `card30`: `SHADE_CARD_GREY=0.3` | 0,60 / 0 %, **S 0,43** | 0,46 / 12 % | 0 % | Seite milchig (R3 nein) |
| `core`: Kern hell, `CORE_GAIN=1.0`, DARK (0,20/0,015/0,005), MID (0,45/0,05/0,012), LIGHT (0,75/0,12/0,03) | **0,77 / 1 %, S 0,67, 14°** | 0,33 / 31 % | 32 % | Seite erfüllt R1–R3 |
| `both`: beides | 0,80 / 0 %, S 0,49 | 0,49 / 9 % | 0 % | R3 Seite nein |

L1 und L6 sind überall erfüllt (Papier Rot 0,94, außerhalb ≤ 0,13/255). Die Bilder wurden noch nicht angesehen.

### Nächste Schritte (16.10.)

1. Kern hell wie `core` beibehalten. Bei den Karten weiter abwägen:
   - die rechte Karte dunkel lassen, sie hält die Seite gesättigt;
   - links und hinten hell oder warm einfärben, für Kante und „über Etikett“;
   - oder alle Karten auf 0,10–0,15 setzen.
   - Bleibt „über Etikett“ dunkel: das Füllicht verstärken (`FILL_PANEL`) oder die Füllhöhe prüfen.
   - Für eine Kartenfarbe je Seite braucht `add_shade_cards()` eine kleine Änderung.
2. Die Bilder ansehen, sparsam. Dann die Felder für p 0,9 und hoch festlegen, dort messen, L7 prüfen.
3. Tafel für R6 bauen und dem Nutzer zeigen. Nach der Freigabe: Konstanten in `saffron_fill.py` und `web_hero.py` setzen, Kommentare und `docs/ASSETS.md` anpassen (Kern hell, Karten).
4. Danach weiter wie unten unter „Stand 15.10.“, Nächste Schritte 1–4: wegräumen, Queue (im Terminal-Panel), Build, Test, Commit, Push nach Rückfrage. Noch kein Commit. Die Shopify-Unterlagen (`LIVE-INVENTAR.md`, `UEBERGABE-SHOPIFY.md`, `PRODUCT-TRUTH.md`, `SHOPIFY.md`) gehören nicht in den Demo-Commit, außer der Nutzer will es.

## Stand 15.10. (dritter Chat): Belichtung wie Website

- **G4 für E3 nicht erteilt.** Der Nutzer fand das Glas zu dunkel. Ursache: Die schwarzen Moltonkarten spiegeln überall Schwarz, die Glasabsorption macht Kanten und Boden grün, der Kern ist rotschwarz. Auch gegenüber dem echten Foto war das Glas zu dunkel.
- **Neue Referenzen** (Ja des Nutzers): `assets-src/photos/ref-neu-*.png`, Tabelle in `UEBERGABE-GLAS.md`. Vermutlich KI-generiert (gespiegeltes S auf dem Band, keine Kameradaten). Vergleichstafel G1: `.raw/tests/glass/g1-website-foto-render_p1000.png`.
- Der Nutzer will „diese Belichtung“, also wie `ref-neu-negin-1g-premium.png`. Musskriterien L1–L7 freigegeben, L8 (Flagge) kam beim Prüfen dazu:
  - L1 Papier sRGB (0,965 / 0,875 / 0,729) ± 0,04
  - L2 Füllgut rot: Seite und Front je Farbton 0–20°, Sättigung ≥ 0,55, Median ≥ 0,05 × Papier
  - L3 Mittel Seite und Front ≤ 0,25 × Papier
  - L4 Boden ≥ 0,25 × Papier, Farbton 20–45°, nichts grün
  - L5 Glanzlinien an den Ecken, Schulter und Hals klar
  - L6 außerhalb des Produkts ≤ 1 %
  - L7 Renderzeit ≤ 1,15 ×
  - L8 Flagge kräftig
- **T-20261015-01 übernommen** (Produktlicht per Light Linking, Karten 0,03, Absorption 0,33). Erfüllt L1 und L3–L7. Danach im Hauptchat gefunden: Die Flagge ist unter dem orangen Frontlicht blass.
- **T-20261015-02 übernommen** (Innenlichter nur für Füllung und Kern, `CORE_GAIN 3.0`, Flagge mit eigenem kühlem Licht). Vom Nutzer mit zwei L2-Abweichungen freigegeben. Bilder: `_agent/staging/T-20261015-02/renders/`.
- **G4 am 15.10. freigegeben** (Stand T-02). Die Queue darf laufen.
- **Halt-Prüfung:** Drei Halt-Bilder wurden mit dem jetzigen Code neu gerendert (desktop 35, desktop-hold 285, mobile-hold 200). Gegen die alten weichen sie im Mittel 3,0/255 ab, im 99. Perzentil 24. Deshalb wird alles neu gerendert, auch `*-hold`. Nur `stills/anatomy.png` bleibt, dort ist das Produkt ausgeblendet.
- **Noch nicht gemacht:** Wegräumen, Queue, Build, Commit, `docs/ASSETS.md` (Produkt-, Füll- und Flaggenlicht nachtragen).

### Nächste Schritte

1. Prüfen, dass kein Blender läuft (`tasklist | grep -i blender`). Dann die alten Bilder wegräumen. Ohne `DRY=0` ist es nur ein Probelauf. Mit `DRY=0` verschiebt das Skript 1.468 Bilder nach `.raw/prev-e3/`, das ist umkehrbar:
   `DRY=0 bash /h/royal-spices/_agent/staging/INTEGRATION-20261015/tools/move-old.sh`
2. Queue starten, aus `royal-spices-v1`, losgelöst und nacheinander:
   `(RS_DEVICE=HIP nohup bash -c 'bash pipeline/blender/queue-all.sh >> .raw/queue.log 2>&1; bash pipeline/blender/queue-large.sh >> .raw/queue-large.log 2>&1; bash pipeline/blender/queue-dense.sh >> .raw/queue-dense.log 2>&1' > /dev/null 2>&1 &)`
   - Es dürfen keine `.raw/queue-large.pause` oder `.hold` vorhanden sein (am 15.10. geprüft: keine da).
   - `queue-inbetweens.sh` ist nicht nötig, es rendert nur kleine Bilder, die `build-hero.mjs` durch die großen ersetzt.
   - Bildzeiten am 15.10. gemessen: 1920×1080 bei 64 spp 18 s, 1440×810 11,5 s, 720×1280 10 s. Das sind etwa 1.470 Bilder, also eher 4–5 Stunden, nicht 2,5. Das erste Bild jeder Stufe prüfen. In den Protokollen nach `Error`/`Traceback` suchen.
   - Die Queues veröffentlichen sich selbst (`build-hero.mjs`, `build-stills.mjs`).
3. Danach: `npm run build`, `npm test` (am 15.10. vor der Queue 20/20), `npm run assets:hero` und `npm run assets:stills`, falls die Queue das nicht schon getan hat. Ansehen quer und hoch.
4. `docs/ASSETS.md` und `docs/STATUS.md` nachziehen. Dann commit auf `dev` (H: → Worktree → Repo, siehe Memory `local-repo-layout`, Identität koulner <w.lukas99@gmx.net>). Nicht im Repo sind: `web_hero.py`, `product_jar.py`, `saffron_fill.py`, `saffron_pack.py`, `saffron-fill.json`, `assets-src/photos/ref-neu-*.png`, die Docs. Vor dem Push fragen.
5. Offen nach der Demo: Kork ist dunkler als auf der Website (bekommt kein Produktlicht), Halsbreite, MNEE-Schatten. Beide Subagents lagen über 150k (183k, 174k): Aufträge mit Rendern noch kleiner schneiden.

## Stand 11.10.

- **Füllung übernommen** (T-20261010-01, 11.10.): `saffron_fill.py`, `saffron_pack.py`, `saffron-fill.json`. `web_hero.py` baut sie jetzt ein, das Glas ist nicht mehr leer.
- Aktueller Stand gerendert, 1600×900, 96 spp, 9–15 s je Bild: `.raw/tests/glass/stand-1110_p{0000,0300,0560,0800,1000}.png`. Der Auftraggeber hat die Bilder gesehen.
- **Code seit der Übernahme nicht geändert.** Backup ist trotzdem schon angelegt: `_agent/staging/INTEGRATION-20261011/backup/` mit `web_hero.py` (MD5 b3815a6c…) und `product_jar.py` (MD5 9e10c6fb…).
- **Git:** `dev` = `origin/dev` = `01a5d94` (10.10., Glas ohne Füllung). **Nicht im Repo** sind die drei Füllungsdateien von heute. Ablauf H: → Worktree → Repo und die Git-Identität: siehe Memory `local-repo-layout`. Vor dem Push fragen.
- **Website-Bilder** (`public/hero/`) stammen aus `cc4bb4a` vom 10.10. und zeigen noch das alte Master-Glas.

## Befund E3: Woher der Schleier kommt (gemessen bei p 1)

Strahlanalyse (`tools/diag_reflect.py`): Kamerastrahl trifft Glas, wird gespiegelt, was trifft er? Ergebnis bei p 0,76, 0,90 und 1,0 fast gleich:
- Seitenwand +x: 79–83 % **Studioboden** rechts hinter dem Glas (Median x 6,2 / y 4,4), dazu 14–16 % Kicker-Licht.
- Vorderseite −y: 83–88 % Studioboden vor dem Glas (Median y −6).
- Schulter +z: Welt 40 %, Rest Glas, Flag, Siegel, Kork.

Zerlegung der Helligkeit (`tools/diag_split.py`, kumulativ, linear, Etikettpapier = 0,53, Bilder in `_agent/staging/INTEGRATION-20261011/diag/`):

| Variante | Seite / Papier | Front / Papier |
|---|---|---|
| jetzt | **1,06** | 0,62 |
| Kicker nicht in der Spiegelung | 0,94 | 0,62 |
| + Boden schwarz für Glossy-Strahlen | 0,25 | 0,13 |
| + Welt schwarz für Glossy | 0,24 | 0,11 |
| + alle Lichter nicht in der Spiegelung | 0,24 | 0,10 |
| (getrennt: RIM-Licht aus) | 0,90 | 0,52 |

- Die Kamera schaut von oben, deshalb spiegeln die senkrechten Wände den hellen Boden. Der Boden ist neben dem Glas mit Y 0,69 heller als das Etikett. Physikalisch ist das korrekt, im Foto ist die Umgebung aber dunkel.
- Der Glossy-Dimmer auf die Welt in `tune_render_for_glass` (35 %) wirkt hier praktisch nicht.
- Ohne Bodenspiegelung bleibt die Seite grau (sRGB 60/54/50) statt rotschwarz. Der Kern ist sehr dunkel (lineare Farbe 0,01–0,09), der graue Rest hat also eine andere Ursache. **Noch nicht geklärt**, Verdacht: Fäden vor dem Kern im Licht des Kickers, Reflexe an den Innenflächen.

## E3 gebaut (11.10., zweiter Chat)

`add_shade_cards()` in `web_hero.py`: vier Moltonkarten (schwarz, Specular 0) rechts, links, hinten, vorn, Maße wie im Plan unten, Höhe bis Wandende + 0,2 BU. Gemessen bei p 1: Seite/Papier **0,069**, Front/Papier **0,094** (Ziel ≤ 0,20); p 0,9 und 0,76 ebenso unter 0,20. Die Karten links und hinten waren nicht im Plan: Mit nur rechts+vorn blieb die Front bei 0,32, weil dicke Wände und Boden Strahlen per Totalreflexion zum hellen Boden hinter dem Glas leiten (`tools/diag_refract.py`). Nebenwirkung: Der Glasboden wirkt dunkelgrün statt mittelgrau wie im Foto. Boden, Schatten, Blüte und Fäden unverändert. Bilder: `.raw/tests/glass/e3_p*.png`, `e3m_p*.png`, `e3-vergleich_p*.png`. Welt-Dimmer bleibt. E4: Schatten weich wie die übrige Szene, dünne Kontaktlinie; nichts geändert.

## Plan E3 (Stand vor dem Bau)

**Abschattkarten** nach dem Muster von `add_flags()` in `web_hero.py`: schwarz, `visible_camera`, `visible_diffuse` und `visible_shadow` aus, Glossy und Transmission an. Sie stehen dicht neben dem Glas, im lokalen Rahmen des Objekts `JAR | pressed soda-lime glass after photo`. Der Ursprung ist nicht die Mitte: x reicht etwa von 0 bis 4,46, y von −2,2 bis 2,2, rotz −4°. Grenzen aus `bound_box` lesen.
- **Rechts:** senkrecht bei xmax + 0,5. y von ymin − 0,5 bis ymax + 3, denn die Spiegelstrahlen laufen mit dy/dx ≈ 2,6 nach +y. z von 0 bis zur Schulter (ca. 4,1), nicht höher, sonst wird die Schulter dunkel.
- **Vorn:** senkrecht bei ymin − 0,5. x von xmin − 3 bis xmax + 0,5, denn die Strahlen laufen nach −x. z wie rechts.
- Spiegelstrahlen von senkrechten Flächen laufen bei diesem Blick immer nach unten. Die Karten blockieren so auch den Kicker-Reflex (rechts). Das wandernde Streiflicht (`GLASS | controlled soft reflection`, z 8) erscheint nur auf Schulter und Kanten und bleibt erhalten.
- Danach messen: Seite/Papier und Front/Papier sollen ≤ 0,20 liegen (D4), Farbton rot. Dazu Sichtprüfung bei p 0,76, 0,9 und 1, die Kanten sollen kontrastreich und begrenzt sein (G2). Den Welt-Dimmer erst dann neu bewerten.
- Dann den grauen Rest klären: Kicker-Energie und -Farbe, ggf. `CORE_*`/`TRANS_EDGE` in `saffron_fill.py`. Risiko aus T-20261008-03: unter Hero-Licht zu orange und hell.

## Danach

1. **E4 Schatten:** Kaustik ist an (`caustics_refractive`/`reflective` in `tune_render_for_glass`). Ausschnitt Schatten und Kontaktschatten ansehen. MNEE-Shadow-Caustics nur, wenn nötig.
2. **G1/G2:** Vergleichstafel Foto gegen Render, dazu 100-%-Ausschnitte (Seite, Kante, Boden, Hals mit Kork, Oberfläche, Schatten). Die Werkzeuge `imgtool.py pair/view/stats` liegen in `tools/`. Aufruf über Blender: `blender -b --python imgtool.py -- …`, nur absolute Pfade, PIL gibt es nicht.
3. **G3:** Hero-Standbild quer und hoch sowie Sequenz bei 76, 90 und 100 %. Dem Auftraggeber zeigen, **Queue erst nach Freigabe (G4).**
4. **F4/F3:** Renderzeit messen, dann die Queue für alle Bilder mit Glas, Assets, Build und Prüfskripte (`docs/STATUS.md`, `pipeline/blender/queue-*.sh`). Danach Commit auf `dev`, Push nach Rückfrage.

## Aufrufe

```bash
cd /h/royal-spices/royal-spices-v1
RS_DEVICE=HIP bash pipeline/blender/render.sh --variant desktop --mode still --p 0.76,0.9,1 --res 1600x900 --spp 96 --out .raw/tests/glass --tag e3
```

Analyse ohne Rendern, Szene wie `web_hero.py`, nur der Render-Aufruf ist entfernt:

```bash
M="../Projektübergabe/royal-spices/blender/royal-spices-master.blend"; T="H:/royal-spices/_agent/staging/INTEGRATION-20261011/tools"
"/f/3D/Blender/Blender 4.5/blender.exe" -b "$M" --python "$T/diag_reflect.py" -- --p 1 --res 1920x1080 2>&1 | grep DIAG
DIAG_OUT=<ordner> DIAG_VARIANTS=base,nokick,nofloor RS_DEVICE=HIP "/f/3D/Blender/Blender 4.5/blender.exe" -b "$M" --python "$T/diag_split.py" -- --p 1 --res 1280x720 --spp 64 2>&1 | grep DIAG
```

`diag_split.py` misst die Masken `side+x`, `front-y` und `paper` aus den ersten Treffern. Es eignet sich auch zum Nachmessen nach dem Einbau der Karten: Variante `base`.

## Zurückgestellt: Halsbreite

Siehe `UEBERGABE-GLAS.md`, Abschnitt „Offener Punkt: Halsbreite“. Laut Auftraggeber macht der Hals 70–80 % aus, im Modell sind es etwa 60 %, der Foto-Abgleich spricht für 60 %. Wird nach der Demo in einem eigenen Chat geklärt.
