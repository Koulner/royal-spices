# Übergabe 22.10.2026: Produkt-Strang abschließen (Etikett, Glas, Hero-Neurender)

Auftrag des Nutzers (22.10.): „Erst den Produkt-Strang abschließen: Etikett -17/-18 prüfen, Glas zusammenführen, Hero neu rendern.“ Hintergrund: Der Kunde baut nebenher selbst eine Website. Es muss bald geliefert werden. Ziel ist **fertig statt perfekt**.

Vorgänger: `UEBERGABE-PRODUKT.md` (G1–G8, N0–N11), `UEBERGABE-GLASFORM.md`, `UEBERGABE-ETIKETT.md`. Log: `../../_agent/LOG.md`.

## Stand

| ID | Inhalt | Status |
|---|---|---|
| T-20261020-17, T-20261021-10, -11 | Glasform, Kantenband (Werkzeug), Kork | **ÜBERNOMMEN 22.10.** `pipeline/blender/product_jar.py` = MD5 `c80a838b…`. Backup `_agent/staging/T-20261021-11/backup-uebernahme/` |
| T-20261021-17, -18 | Etikett-Runde (b), Bandzeichen | vom Hauptchat geprüft (Kopien bitgleich) |
| **T-20261021-19** | Etikett + Blattlogo + Bandzeichen zusammengeführt, mit Sichtkorrektur | **ÜBERNOMMEN 22.10.** (Go des Nutzers), 31 Dateien MD5-gleich. T-02, -16, -17, -18 ebenfalls `ÜBERNOMMEN` |
| -13 Band/Logo/Bandzeichen (`product_seal.py`) = T-20261022-10 | G4, G5 | **VERWORFEN 22.10.** (abgebrochen), `work/` ist Eingabe, siehe „Stand nach -13/-14“ |
| -14 Etikett am Glas (`product_label.py`) = T-20261022-11 | G6 | **VERWORFEN 22.10.** (Kriterien knapp verfehlt, Farben ausgewaschen), `work/` ist Eingabe |
| Hero-Neurender | N9–N11, R1–R4, Tafel 3, Queue | **nicht begonnen** |

Die Projekt-Pipeline zeigt jetzt das neue Glas und den neuen Kork mit dem **alten** Band und dem alten Etikett. Die neuen Etikett- und Logodateien liegen zwar im Projekt, aber `product_seal.py` und `product_label.py` binden sie erst mit -13/-14 ein. Bis dahin keine Hero-Bilder rendern.

## Befunde dieser Sitzung

- **-17 Sicht:** Die Messwerte waren erfüllt, aber „GRADE 1“ war mit wght 900 viel zu fett, und in „EST.“ stießen S und T aneinander (falsche Buchstabenmitten seit T-02). Korrigiert in -19: GRADE 1 und 0,5 g in Gruppe `saffron` (in der Referenz fast schwarz), Gewichte 600/500, PACKED 500, braun neu, EST-Mitten gleichmäßig. Alle Kriterien bleiben erfüllt (E1 ≤ 5,3 %). Vergleichsbild: `_agent/staging/T-20261021-19/pruefung/sicht-ref-17-korrektur.png`.
- **Lehre:** Die Messung gegen das verlustbehaftete WebP lässt sich mit unpassender Typografie erfüllen. Jede Runde braucht deshalb einen Sichtvergleich mit der Referenz (100 % und 2×), nicht nur Zahlen.
- **-18:** Das Blattlogo in Draufsicht ist besser als das heutige Zeichen (p95 3,25 gegen 4,19 px). Empfehlung: neu. Ist in -19 enthalten.
- **-11 Kork:** Gemessen in Ordnung, wirkt aber als dunkles Mosaiknetz. Feinschliff in -13: Lücken brauner, `CORK1910_PORE_T` 0,36–0,38. Danach `korn.cjs`/`kork.cjs` erneut (siehe `T-20261021-11/ERGEBNIS.md`, Hinweise).
- **-10 Kantenband:** Über die Form nicht erreichbar (4,3 px gegen 14,4 px). Der Lichtvorschlag (`web_hero.py`, linker Kantenstreifen 1,0 BU breit, 0,10 BU vor der Front, ca. 600 W) betrifft alle Hero-Bilder. **Nutzerentscheid offen**, sinnvoll zusammen mit dem Hero-Neurender.

## Stand nach -13/-14 (22.10. nachmittags, Sitzung „Glas und Logo“)

Beide liefen parallel als Subagents: T-20261022-10 (-13) und T-20261022-11 (-14). Beide sind `VERWORFEN`, der Projektcode ist unverändert. Ihre `work/`-Stände sind die Eingabe für den Folgeschritt:
- `_agent/staging/T-20261022-10/work/product_seal.py`: neuer Weg `build_seal_1910()` mit den Konstanten `SEAL1910_*`. Dazu `work/product_jar.py`: der Kork-Feinschliff, er ist erfüllt. **Nicht** verwenden: `work/label-assets/zeichen-oben.png` (siehe Punkt 3).
- `_agent/staging/T-20261022-11/work/product_label.py`: neuer Weg mit den Konstanten `LABEL1910_*`, Format und Lage sind erfüllt.

Erreicht:
- **Band:** Breiten und Spitze liegen höchstens 0,39 % B neben der Referenz, keine Durchdringung. In der Etikettzone (z 55,13–62,16 mm) liegt die Bandrückseite 0,0242–0,0247 BU vor der Glasfront.
- **Kork:** Das dunkle Netz ist weg, das Kornmaß liegt bei 1,012 (`CORK1910_JOINT`, `_PORE`, `_PORE_T` 0,34 → 0,38).
- **Etikett:**
  - Alle `et_*`-Punkte liegen innerhalb 1 % B.
  - Format 44,02 × 54,52 mm = 0,835 × 1,035 B. Die Referenz zeigt W/H 0,807, deshalb ist der Druck 2,5 % breiter gezogen.
  - 4,3 Texel je Pixel, Vorderfläche 0,0214 BU vor der Glasfront.
  - Die Oberkante liegt bei 62,49 mm in der Schulterrundung, dort bis 0,037 BU Abstand zum Glas.

Offen:
1. **Ausgewaschene Drucke, gemeinsame Ursache:**
   - Etikettpapier 251/237/220 statt 220/197/173, Gold pfirsichfarben, Flagge rosa. Das Blattlogo rendert cremig, #e4cdac statt #ae884a.
   - Vermutlich kommt das vom orangen Frontlicht in `web_hero.py` (Z. 228). Die alte Flagge war per Light Linking davon ausgenommen, das alte Papier war mit einer dunklen Albedo eingepasst.
   - Bilder: `staging/T-20261022-11/render/t2211b_tafel2.png`, `staging/T-20261022-10/render/t2210b_tafel2.png`.
   - **Nutzerentscheid 22.10.: Ausgleich im Material, das Licht bleibt.** Wortlaut: „Gleich die Drucke im Material aus (Etikett und Logo dunkler bzw. farbkorrigiert), das Licht bleibt.“ Also werden Etikett und Logo im Shader dunkler bzw. farbkorrigiert (Helligkeit und Farbstich, z. B. Faktor auf die Textur oder Gold etwa #8d713e aus -10). `web_hero.py` wird nicht angefasst. Der Lichtvorschlag für das Kantenband bleibt eine eigene offene Frage beim Hero-Neurender.
2. **Lippe (B2):** Das Band liegt nicht auf der Lippe, es steht 0,7–0,95 mm davor. Oberhalb der Lippe muss es der Kontur folgen und dann senkrecht herabfallen.
3. **Bandzeichen:** Die Projektdatei `zeichen-oben.png` = `logo-band.png` ist richtig.
   - So gewollt seit T-20261021-18, siehe `staging/T-20261021-18/README-zeichen.md`. Lage, Maßstab 0,658, k und Drehung stehen in `assets-src/label/tools/logo-werte.json`.
   - Der Agent von -10 hielt die gleichen Dateien für einen Fehler und nutzte den alten Stand. Deshalb war sein Zeichen zu flach.
4. **Messkopplung:** `abgleich.py` (`product_frame`) richtet die Kamera nach der Mitte der `FRONT LABEL*`-Objekte aus.
   - Die Ursprünge der Etikettobjekte auf x = 0 lassen und den Versatz DX −0,51 mm in die Netzpunkte legen.
   - Danach sollte `schulter_l_44` wieder ≤ 1 % B liegen, zuletzt waren es 1,04 %.
5. **SAFFRON:** Die rechte Kante liegt 1,11 % Lh neben der Referenz, im Druck ist der Schriftzug 2,7 % breiter. Vorschlag: als Abweichung annehmen (unter 0,6 mm), den Nutzer fragen.
6. **Logo-Messung:** `messen.cjs` findet das Logo erst, wenn es wieder goldfarben ist (R−B-Kontrast).
7. **Füllhöhe:** `fill_top_z` hängt noch an der alten Etiketthöhe (`LABEL_*` in `product_jar.py`). Das gehört zum Hero-Neurender.
8. **Budget:** Beide Agents lagen laut Harness bei 241k bzw. 284k Tokens, obwohl sie unter 30 Aufrufen blieben. Den Folgeschritt deshalb kleiner schneiden.

## Stand nach a) (22.10. abends, T-20261022-12/-13)

- **T-20261022-12:** Der Subagent wurde vom Nutzungslimit unterbrochen und danach fortgesetzt. Ergebnis `VERWORFEN` (ABGEBROCHEN): Lauf 2 renderte versehentlich die Werte von Lauf 1. Dazu ein falscher Befund („Sockel unabhängig von der Albedo“) und `product_seal.py` stillschweigend auf LF umgestellt.
- **T-20261022-13** (Hauptchat): `FERTIG`, A1–A6 erfüllt. Details in `_agent/staging/T-20261022-13/ERGEBNIS.md`, Tafel `render/t2213a_tafel2e.png`.
  - **AgX statt Standard:** Der Abgleichrender läuft mit dem View des Masters, **AgX mit dem Look „AgX - Medium High Contrast“**. `abgleich.py` setzt „Standard“ nur in der Maske. Die Strahlung ist proportional zur Druckfarbe; Gain 0 ergibt schwarzes Papier.
  - **Werte aus der invertierten OCIO-Kette** (`tools/inv_view.py`; sie sagt t2211b auf 0,3 Stufen genau voraus):
    - Etikett-Gain (0,22, 0,22, 0,30): Papier 222/199/176, ≈ −1 %
    - Logo '#5a4425': #ae8848 gegen #ae884a
  - **Kamera:** Etikettwurzel bei x = 0, DX −0,30 mm in den Netzpunkten. Glaspunkte 20/20, Schulter x 44 bei 0,37 % B, alle `et_*` ≤ 0,40 % B.
  - **Punkt 6 oben war falsch:** `messen.cjs` findet `logo_*` im Render nie, weil das Logo jetzt eine Textur im Bandmaterial ist. Die Maske hat deshalb keine Logo-Klasse. Ersatz ist `tools/logolage.cjs` (gleiches Verfahren wie `refBox()`, für die Referenz bitgleiche Werte). Logolage ≤ 0,53 % B.
  - **Sicht:** Papier und Logo passen.
    - Die Mitteltöne des Etiketts sind zu warm: Berge sepia statt grau-schwarz, Gold oranger als Ocker, Flagge heller. Ein Gain je Kanal gleicht das orange Licht nur in der AgX-Schulter aus.
    - **Nutzerentscheid 22.10. abends:** „Ja, gleiche die Mitteltöne des Etiketts mit b) per Kurven im Material aus.“ Also Kurven je Kanal im Druckmaterial (`RGB Curves` vor `Base Color`), kalibriert auf der Grauachse und dem Papier über `inv_view.py`. Das gehört zu b), siehe „Nächste Schritte“.
  - Die Werte gelten auch für die Hero-Bilder, solange Licht und View des Masters gleich bleiben.

## Stand nach b) Teil 1 (23.10. früh, T-20261022-14)

- **Kurven im Druckmaterial erledigt** (Hauptchat, `_agent/staging/T-20261022-14/ERGEBNIS.md`, Bilder `render/t2214b_felder.png`, `_tafel2e.png`). Nutzerentscheid 23.10. früh: **zwei Kurvensätze**, Gold über die Maske `etikett-gold.png`, der Rest getrennt. Grund: Mit einer Kurve je Kanal sind Berge und ROYAL im Grün nicht zugleich erreichbar.
- Werte t2214b: Papier #dec7b0 unverändert, Berge 104,8/78/46,8 gegen 94/72/47 (+11,5/+8,3/−0,4 %), ROYAL 140,5/97,3/32,5 gegen 139/97/30 (+1,1/+0,3/+8,3 %). Logo, Logolage und Glaspunkte 20/20 unverändert.
- Werkzeuge in `staging/T-20261022-14/tools/`:
  - `feld.cjs`: Messfelder, dunkelstes Viertel, Median je Kanal
  - `kurve.py`: Newton-Inversion der AgX-Kette. Sie ersetzt `inv_view.py`, das im flachen Fuß hängen bleibt.
  - `kurvenprobe.py`, `scan.py`
- **Offen (geht mit Teil 2, Kriterien F1–F6 im Auftrag):** Das Flaggengold ist blass-pfirsich statt kräftig gelb (232/182/112 gegen 214/147/2, nur Information). Es liegt nicht in der Goldmaske. Weg: Flaggenmaske, oder die Flagge in die Goldmaske aufnehmen. Das ist ein eigener kleiner Schritt, erst nach Rückfrage.
- `work/product_label.py` (ab35bbbe) ist Eingabe für Teil 2, `product_seal.py` und `product_jar.py` sind unverändert gegenüber -13.

## Stand nach b) Teil 2a (23.10., Flaggengold)

- Teil 2a lief als Subagent, `FERTIG` und im Hauptchat geprüft (`staging/T-20261022-14/ERGEBNIS-2a.md`, Lauf t2214c, Tafel `render/t2214c_tafel2e.png`). Dritter Kurvensatz `flagge` in `LABEL1910_CURVES`, Maske = UV-Rechteck der Flagge (u 0,42946–0,57364, v 0,04028–0,10791, weiche Kante 1,5 Texel) aus Shader-Knoten.
- F1 Flaggengold 204,3/137,3/16,8 gegen 214/147/2 (R −4,5 %, G −6,6 %, B ≤ 30). R/G liegen bewusst etwas unter dem Ziel, weil AgX bei voller Höhe Blau ≥ 40 erzeugt. F2 (Rot, Schwarz) und F3 (K1–K3, Logo, Logolage) gleich t2214b. Außerhalb der Flagge höchstens 2/255 Abweichung.
- Geprüft: label 35e57f97 (LF, 0 CR), seal e2c6a62c (CRLF) und jar afa6f1bc unverändert, Projektdateien unverändert (label 33f481fc, seal 54c42415, jar c80a838b), `gpu.lock` frei.
- Neue Werkzeuge: `tools/flagge.cjs` (Felder Gold, Rot, Schwarz), `tools/flaggekurve.py`. `lauf.sh` setzt `gpu.lock` selbst. K1 misst `tools/logofarbe-render.cjs`.
- Info, nicht beauftragt: Das Flaggenrot ist heller und oranger als die Referenz (233/56/32 gegen 180/7/2), unverändert seit t2214b.
- Sicht: Der Nutzer hat das Flaggengold am 23.10. abgenommen („Das Flaggengold passt.“).
- Budget: Der Subagent brauchte 136k Tokens für 23 Aufrufe und einen Lauf. 2b ist größer, deshalb in 2b1 und 2b2 teilen.

## Stand nach 2b2a (23.10., Chatwechsel bei 199k)

- **2b1 Band an der Lippe:** FERTIG und geprüft (`staging/T-20261022-14/ERGEBNIS-2b1.md`, Lauf t2214d).
  - Ergebnis: L1 Band auf Kork und Lippe ≤ 0,088 mm. B1 band_* ≤ 0,40 % B, Glas/Kork 20/20. B3 0 Durchdringungen, Etikettzone 0,0242–0,0247 BU. Logo ≤ 0,53 % B, K1–K3 und F1 unverändert.
  - Nutzer: „Die Knickkante ist ok.“
  - Der Subagent wurde bei 184k gestoppt, Lauf und Prüfung liefen im Hauptchat.
- **2b2a Bandfarbe und Bandzeichen:** FERTIG und geprüft (`ERGEBNIS-2b2a.md`, Läufe t2214e/f, Subagent 115k).
  - Band relativ zum Papier +4,1/+4,4/+7,8 % (#202410 gegen #1f230f).
  - Bandzeichen dielektrisch #88714c gegen #8d754c. Eigener Knoten `Gm`, `SEAL1910_MARK_COLOR` und `SEAL1910_MARK_METALLIC`. Der Logodruck `SEAL1910_PRINT_*` ist unverändert.
  - Stand: seal b4dc87ae.
- **Nutzer 23.10.:** „metallisch wäre schon sehr gut“ und „das Logo oben auf dem Kork ist im Rendering nicht zentriert“.
  - Gemessen auf t2214f: Das Zeichen sitzt +10,3 px rechts der Bandmitte (x 258,3).
  - Ursache: `SEAL1910_MARK_PX = (232, 302)` ist die absolute Lage aus der Referenz. Dort ist die Band-Oberseite nach rechts versetzt, die linke Kante läuft schräg, und das Zeichen sitzt mittig darauf.
  - Breite: 70 gegen 56 px (Methode `zeichenfarbe.cjs`).
  - Neues Werkzeug `tools/zeichenmitte.cjs`.
- **2b2a2 Nachbesserung Bandzeichen:** beim Chatwechsel als Subagent des alten Chats gestartet. Er meldet sich nicht beim neuen Chat.
  - Kriterien: M1 Metallic ≥ 0,6 (Ziel 1,0) und Farbe ± 15 %; kein stiller Rückfall auf dielektrisch. M2 Versatz ≤ 1,5 px. M3 Breite ± 5 %. Dazu bleiben Band, Logo, Felder, Glas/Kork, label und jar unverändert.
  - Läufe t2214g–i, Ergebnis in `ERGEBNIS-2b2a2.md`. Sicherung `vor-2b2a2/product_seal.py` (b4dc87ae).
- **Information:**
  - `band_o` (Oberkante des Bands) liegt −1,21 % B unter der Referenz, seit t2214c unverändert, deshalb liegt das Zeichen tiefer (y 38–48 gegen 33–44).
  - Die Band-Oberseite ist etwas grauer als in der Referenz (70/71/60 gegen 83/73/43).
  - Der Kork ist heller und grobkörniger als die Referenz, das ist Aufgabe von 2b2b.
- **Offen danach: 2b2b Kork und Tafeln.**
  - Kork G3: Farbe relativ zum Papier ± 15 %, Licht- und Schattenseite getrennt. `korn.cjs` Kornmaß 0,75–1,25. Fugen brauner. Nur `cork_material_1910()` und `CORK1910_*` in `product_jar.py`.
  - Tafel 1 (`tafel.cjs`) und Tafel 2 (`tafel2.cjs`, `tafel2e.cjs`) mit allen drei Teilen.
  - Kriterien: B7/B8 in `staging/T-20261022-10/AUFTRAG.md` Zeilen 40–46, G3 in `UEBERGABE-PRODUKT.md` ab Zeile 83.
- **Hinweise:**
  - Die Flüssig-Sitzung belegt `gpu.lock` oft (bis 30 min). `lauf.sh` wartet bis 60 min.
  - `sed -i` entfernt die CRs in `product_seal.py`, also nicht verwenden.
  - Subagents: höchstens ~22 Aufrufe, unter 100k.
  - Der Hauptchat lief unbemerkt auf 199k. Deshalb die Übergabe spätestens nach zwei Subagent-Runden schreiben.

## Stand nach 2b2a2 (23.10. nachmittags, neuer Chat)

- **2b2a2 geprüft** (Hauptchat): Die Messungen auf t2214i sind nachgerechnet, alle JSON-Dateien sind identisch. Der Kontrollrender t2214ip aus `work/` liefert dieselben Werte.
  - M1: Metallic 1,0 im Code, Zeichen #8d764c gegen #8d754c. M2: 0 px. M3: 56 px (231–287).
  - Rest wie t2214f, Glas/Kork 20/20.
  - Dateien: seal 96ab98b2 (972 CR auf 972 Zeilen), label 35e57f97, jar afa6f1bc. Projekt unverändert.
  - Tafel `render/t2214i_tafel2.png` ist vom Nutzer abgenommen („Das Bandzeichen passt so.“).
- **2b2b läuft als Subagent** (Kork G3/B7, Tafel 1/2, nur `cork_material_1910()`/`CORK1910_*` in `work/product_jar.py`, Läufe t2214j/k). Sicherung: `vor-2b2b/product_jar.py` (afa6f1bc, LF). Das Ergebnis kommt in `ERGEBNIS-2b2b.md`. Kriterien:
  - Korkfarbe relativ zum Papier (`korn.cjs`) ± 15 % je Kanal, L und R getrennt
  - Kornmaß im Mittel 0,75–1,25
  - Fugen brauner, kein Mosaiknetz
  - Glas/Kork 20/20 und jarcheck basis 0
  - Band, Logo, Logolage, Zeichen (Farbe ± 3/255, Mitte ≤ 1,5 px, Breite 56 ± 5 %) und `feld.cjs` (≤ 2/255) unverändert neben t2214i
  - seal und label MD5-gleich
  - Tafel 1 und 2 des Endlaufs
  - Höchstens 2 Läufe, 22 Aufrufe

## Nächste Schritte

1. ~~**-19 übernehmen**~~ **Erledigt 22.10.:** `royal-spices-v1/assets-src/label/**` und `royal-spices-v1/pipeline/blender/label-assets/**` (31 Dateien, MD5 gleich dem Staging).
2. **Folgeschritt zu -13/-14** (die erste Runde ist gelaufen, siehe „Stand nach -13/-14“). Er startet nach dem Nutzerentscheid zu Punkt 1 und läuft in zwei kleinen Transaktionen nacheinander, gleiche Dateien nie parallel. IDs ab `T-20261022-12`, vorher LOG und Staging prüfen.
   - **a) Farbe und Kamera:**
     - Dateien: `product_label.py` (aus -11) und `product_seal.py` (aus -10), nur Material und Ursprung.
     - Abnahme: Papierton und Logofarbe je Kanal ± 15 % (das Logo gegen #ae884a mit `logofarbe.cjs`). Glaspunkte 20/20. `logo_*` über `messen.cjs`.
   - a) **erledigt** als T-20261022-13 (siehe „Stand nach a)“).
   - **b) Band an der Lippe, Bandzeichen, gemeinsame Probe** (ID `T-20261022-14`):
     - Eingabe: `_agent/staging/T-20261022-13/work/` (alle drei Dateien) und `tools/` (mit `logolage.cjs`, `tafel2e.cjs`, `inv_view.py`). Farbziele immer über `inv_view.py` rechnen, die Abgleichkette ist AgX.
     - Datei: `product_seal.py` (CRLF erhalten, nach dem Schreiben prüfen: `tr -cd '\r' < datei | wc -c`).
     - Dazu nach Nutzerentscheid: `product_label.py`, nur das Druckmaterial `_print_material_1910()`. Kurven je Kanal (`RGB Curves`) vor `Base Color`. Ziel: Berge grau-schwarz statt sepia, Etikettgold Ocker statt Orange, Flagge kräftiger.
       - Kalibrierung: über `inv_view.py` aus der Grauachse und dem Papier. Strahlung ist proportional zur Druckfarbe, Beleuchtung je Kanal aus dem Papier in t2213a: Gain (0,22, 0,22, 0,30) → 222/199/176.
       - Abnahme: Papier bleibt bei A1 (± 15 %). Je ein Feld in den Bergen und in ROYAL liegt je Kanal ± 15 % neben der Referenz. Felder und Verfahren vor dem Lauf im Auftrag festlegen, gleiche Methode auf Referenz und Render. Dazu Sicht in Tafel 2 (`tafel2e.cjs`).
     - Abnahme: B2 und B4 mit der Projektdatei `zeichen-oben.png`, BVH Band × Etikett. Tafel 1 und Tafel 2 mit allen drei Teilen. Bandfarbe (G4) und Korkfarbe (G3) relativ zum neuen Papier.
   - Je höchstens 30 Tool-Aufrufe, 2 Renderläufe und 3 Bilder. Aufträge und Werkzeuge wie in `staging/T-20261022-10/AUFTRAG.md` bzw. `-11/AUFTRAG.md`.
   - Danach gemeinsame Übernahme von `product_seal.py`, `product_jar.py` und `product_label.py`, vorher Backup.

   Ursprünglicher Plan für -13/-14 (erledigt, zur Information): als Subagents (Kriterien G4–G6 sind freigegeben, siehe `UEBERGABE-PRODUKT.md`). Disjunkte Dateien, aber beide rendern, deshalb gilt die GPU-Sperre `_agent/gpu.lock`. IDs: nächste freie ID nach LOG- und Staging-Prüfung (Vorschlag `T-20261022-10` und `-11`).
   - Eingaben: `label-assets/{etikett,etikett-gold,logo-band,zeichen-oben}.png` aus -19, Werkzeuge `staging/T-20261019-03/tools/` (`ab.sh`, `messen.cjs`, `jarcheck.py`, `korn.cjs`, `kork.cjs`), Glas = Projektstand.
   - Staging vorher selbst vorbereiten (Kopie `product_seal.py` bzw. `product_label.py`, Werkzeuge LF).
   - Feste Grenzen: höchstens 30 Tool-Aufrufe, `ERGEBNIS.md` spätestens nach dem 25., höchstens 3 Bilder, **höchstens 2 Renderläufe**. Ein Sichtvergleich (Tafel 2) ist Pflicht.
   - -13 zusätzlich den Kork-Feinschliff, falls `product_jar.py` dafür frei ist (sonst eigener kleiner Schritt danach, gleiche Datei nie parallel).
3. **Hero-Neurender** (eigene Transaktion, Kriterien N9–N11 freigegeben 19.10.):
   - Füllung für das neue Innenvolumen neu packen (N10, Füllhöhe F4). R1–R4 in quer p 1, quer p 0,9 und hoch messen. L7: Renderzeit ≤ 1,1 × c2.
   - Vorher den Nutzer zum Lichtvorschlag aus -10 fragen.
   - Tafel 3 (Hero quer p 1, quer p 0,9, hoch) dem Nutzer zeigen. **Die Queue startet erst nach seiner Freigabe.**
   - Queue wie c2 (`pipeline/blender/queue-*.sh`, rund 3 Stunden auf der RX 9070, `RS_DEVICE=HIP`). Danach Build, `npm test`, `astro check`, `perf.mjs`, Sichtprüfung 1440 × 900 und 375 × 812.
   - Achtung: Die Queue schreibt `public/hero/5/**`, `public/img/**` und `src/data/stills.json`. T-20261022-41 (Übertrag B, enthält `stills.json`) muss vorher gepusht oder abgeschlossen sein. Status im LOG prüfen.
4. Danach Übertrag nach `dev` (eigene Transaktion, Push nur mit Go).

## Startprompt für den neuen Chat

**Aktuell (23.10. abends, nach 2b2a2):**

> Weiter mit dem Produkt-Abschluss (Royal Spices, Arbeitskopie H:, kein git). Lies `H:\royal-spices\CLAUDE.md`, aus `_agent/LOG.md` nur die letzten 5 Zeilen (`tail -n 5 | cut -c1-600`) und in `royal-spices-v1/docs/UEBERGABE-PRODUKT-ABSCHLUSS.md` nur den Abschnitt „Stand nach 2b2a2“.
>
> T-20261022-14 ist `OFFEN`. Fertig, geprüft und vom Nutzer abgenommen ist 2b2a2 (Bandzeichen). 2b2b (Kork G3/B7, Tafel 1/2) lief als Subagent des alten Chats:
> - Lauf t2214j ist fertig: Kornmaß 1,11. Die Schattenseite ist zu hell, die Körner sind 2–3× zu grob.
> - Die Konstanten für t2214k stehen schon in `staging/T-20261022-14/work/product_jar.py` (af162775, LF). Der Lauf wartete auf `gpu.lock`, weil die Flüssig-Sitzung Proberender machte (T-20261023-03).
> - Der Subagent hatte über 125k Tokens verbraucht.
>
> 2b2b ist auf Nutzerentscheid `ABGEBROCHEN` (24.10., 01:56), t2214k ist nicht gerendert. Stand, Konstanten alt → j → k und die offenen Messungen stehen in `staging/T-20261022-14/ERGEBNIS-2b2b.md`. Der Hauptchat hat geprüft:
> - Die Änderungen in jar liegen nur in `CORK1910_*` und `cork_material_1910()`.
> - seal und label sind MD5-gleich, jar hat 0 CR.
> - Kein `lauf.sh` ist mehr aktiv.
>
> Weiter so:
> 1. `_agent/gpu.lock` prüfen. Ist die Sperre frei, rendert der Hauptchat selbst: `cd staging/T-20261022-14 && RS_DEVICE=HIP bash tools/lauf.sh t2214k --fill off`.
> 2. Gegen die Kriterien im Abschnitt „Stand nach 2b2a2“ messen: `korn.cjs`, `feld.cjs`, `logofarbe-render.cjs`, `logolage.cjs`, `zeichenfarbe.cjs`, `zeichenmitte.cjs`, MD5, `diff` gegen `vor-2b2b/`.
>
> Danach Tafel 1 (`tafel.cjs`) und Tafel 2 (`tafel2e.cjs`) erzeugen und Tafel 2 dem Nutzer zeigen. Ein dritter Kork-Lauf nur mit Go des Nutzers.
>
> Danach die gemeinsame Übernahme von `product_seal.py` (96ab98b2), `product_label.py` (35e57f97) und `product_jar.py` mit Backup, nur mit Go des Nutzers, dann der Hero-Neurender.
>
> Ziel: fertig statt perfekt. Budget: Die Grundlast des Chats liegt schon bei etwa 70k, deshalb wenig lesen, Bilder sparsam, Übergabe bei ~110k.

**Früherer Startprompt (nach 2b2a, nur zur Information):**

> Weiter mit dem Produkt-Abschluss (Royal Spices, Arbeitskopie H:, kein git). Lies `H:\royal-spices\CLAUDE.md`, aus `_agent/LOG.md` nur die Zeile T-20261022-14 (per grep und `cut -c1-600` auf das Zeilenende, die Zeile ist sehr lang) und in `royal-spices-v1/docs/UEBERGABE-PRODUKT-ABSCHLUSS.md` nur „Stand nach 2b2a (23.10., Chatwechsel bei 199k)“. T-20261022-14 ist `OFFEN`. Fertig und geprüft sind Teil 1, 2a, 2b1 (Band an der Lippe, Sicht abgenommen) und 2b2a (Bandfarbe). Zuerst 2b2a2 prüfen (Bandzeichen metallisch, zentriert, Breite). Es lief als Subagent des alten Chats und meldet sich nicht. Prüfe `staging/T-20261022-14/ERGEBNIS-2b2a2.md` gegen M1–M3 und den Rest, messe selbst nach (`zeichenfarbe.cjs`, `zeichenmitte.cjs`, `logofarbe-render.cjs`, `logolage.cjs`, `feld.cjs`, MD5, CR = Zeilen) und zeige dem Nutzer die Tafel `render/t2214<g|h|i>_tafel2.png`. Fehlt ERGEBNIS-2b2a2.md, prüfe STAND.md, `_agent/gpu.lock` und laufende `lauf.sh`/Blender-Prozesse. Danach 2b2b (Kork G3 und Tafel 1/2) als Subagent nach der Vorlage in CLAUDE.md, höchstens 22 Aufrufe, 2 Läufe, unter 100k, kein `sed -i` auf CRLF-Dateien. Danach die gemeinsame Übernahme von `product_seal.py`, `product_label.py` und `product_jar.py` mit Backup, nur mit Go des Nutzers, dann der Hero-Neurender. Ziel: fertig statt perfekt, nach jeder Runde ein Sichtvergleich. Budget: Der Hauptchat liest wenig, Bilder sparsam. Die Übergabe spätestens nach zwei Subagent-Runden oder bei ~100k schreiben.

**Früherer Startprompt (nach b) Teil 2a, nur zur Information):**

> Weiter mit dem Produkt-Abschluss (Royal Spices, Arbeitskopie H:, kein git). Lies `H:oyal-spices\CLAUDE.md`, aus `_agent/LOG.md` nur die Zeile T-20261022-14 (per grep, die Tabellenzeilen sind sehr lang) und in `royal-spices-v1/docs/UEBERGABE-PRODUKT-ABSCHLUSS.md` nur „Stand nach b) Teil 2a“ und „Nächste Schritte“ 2 b). T-20261022-14 ist `OFFEN`: Teil 1 (Kurven) und Teil 2a (Flaggengold, `ERGEBNIS-2a.md`) sind fertig und geprüft. Offen ist Teil 2b auf `staging/T-20261022-14/work/` (label 35e57f97 LF, seal e2c6a62c CRLF, jar afa6f1bc): Band an der Lippe (B2), Bandzeichen mit der Projektdatei `zeichen-oben.png` (B4), BVH Band × Etikett, Bandfarbe G4 (heute #313511 gegen #1f230f), Korkfarbe G3 relativ zum neuen Papier, Tafel 1 und 2 mit allen drei Teilen. Kriterien: B1–B8 in `staging/T-20261022-10/AUFTRAG.md`, G3/G4 in `UEBERGABE-PRODUKT.md` „Musskriterien Glas-Transaktion“. Diese Dateien liest der Subagent, nicht der Hauptchat. 2b als zwei Subagents nacheinander (Auftrag nach der Vorlage in CLAUDE.md): 2b1 Band an der Lippe und BVH (Geometrie in `product_seal.py`), 2b2 Bandzeichen, Bandfarbe, Korkfarbe, Tafel 1/2 (`product_seal.py` Material, `product_jar.py` nur Kork). Je höchstens 25 Aufrufe und 1–2 Läufe (`RS_DEVICE=HIP bash tools/lauf.sh t2214<x> --fill off`, setzt `gpu.lock` selbst), Farbziele über `tools/kurve.py`. Nach jedem Lauf mit `feld.cjs`, `flagge.cjs` und `logolage.cjs` prüfen, dass K1–K3 und F1 halten. Danach gemeinsame Übernahme von `product_seal.py`, `product_label.py` und `product_jar.py` mit Backup, nur mit Go des Nutzers, dann der Hero-Neurender. Ziel: fertig statt perfekt, nach jeder Runde ein Sichtvergleich. Budget: Das Einlesen kostet hier schon 80–100k, der Hauptchat liest deshalb wenig und koordiniert nur; bei ~120k Übergabe.

**Früherer Startprompt (nach b) Teil 1, nur zur Information):**

> Weiter mit dem Produkt-Abschluss (Royal Spices, Arbeitskopie H:, kein git). Lies `H:oyal-spices\CLAUDE.md`, den Kopf von `_agent/LOG.md` und in `royal-spices-v1/docs/UEBERGABE-PRODUKT-ABSCHLUSS.md` die Abschnitte „Stand nach -13/-14“, „Stand nach a)“, „Stand nach b) Teil 1“ und „Nächste Schritte“. Lies in `UEBERGABE-PRODUKT.md` nur „Musskriterien Glas-Transaktion“ (G3–G6, G8). T-20261022-14 ist `OFFEN`: Teil 1 (Kurven im Druckmaterial, zwei Sätze über die Goldmaske) ist fertig und geprüft. Setze Teil 2 in `staging/T-20261022-14/` fort, auf `work/` (label ab35bbbe, seal e2c6a62c CRLF, jar afa6f1bc). Teil 2: Band an der Lippe (B2), Bandzeichen mit der Projektdatei `zeichen-oben.png` (B4), BVH Band × Etikett, Bandfarbe G4 (heute #313511 gegen #1f230f) und Korkfarbe G3 relativ zum neuen Papier, Tafel 1 und 2 mit allen drei Teilen. Farbziele über `tools/kurve.py` (Newton) rechnen, Logolage mit `logolage.cjs`. Höchstens 2 Renderläufe (`RS_DEVICE=HIP bash tools/lauf.sh t2214<x> --fill off`). Nach dem ersten Lauf mit `feld.cjs` prüfen, dass K1–K3 aus Teil 1 halten. Dazu das Flaggengold nach F1–F6 in `staging/T-20261022-14/AUFTRAG.md` (Nutzer 23.10.: mitnehmen, Kriterien vorher zeigen). F1–F6 sind vom Nutzer am 23.10. freigegeben. Danach die gemeinsame Übernahme von `product_seal.py`, `product_label.py` und `product_jar.py` mit Backup, dann der Hero-Neurender. Ziel: fertig statt perfekt, nach jeder Runde ein Sichtvergleich. Budget: kein Chat und kein Agent über 150k, bei ~120k eine Übergabe schreiben.

**Früherer Startprompt (nach a), nur zur Information):**

> Weiter mit dem Produkt-Abschluss (Royal Spices, Arbeitskopie H:, kein git). Lies `H:\royal-spices\CLAUDE.md`, den Kopf von `_agent/LOG.md` und in `royal-spices-v1/docs/UEBERGABE-PRODUKT-ABSCHLUSS.md` die Abschnitte „Stand nach -13/-14“, „Stand nach a)“ und „Nächste Schritte“. Lies in `UEBERGABE-PRODUKT.md` nur „Musskriterien Glas-Transaktion“ (G3–G6, G8). Folgeschritt a) ist als T-20261022-13 `FERTIG`: Papier, Logo und Kamera passen. Die Abgleichkette ist AgX mit dem Look „Medium High Contrast“, Farbziele deshalb über `tools/inv_view.py` rechnen. Starte b) als T-20261022-14 auf `staging/T-20261022-13/work/`: Band an der Lippe, Bandzeichen mit der Projektdatei `zeichen-oben.png`, BVH Band × Etikett, Bandfarbe G4 und Korkfarbe G3 relativ zum neuen Papier, Tafel 1 und 2 mit allen drei Teilen. Logolage mit `logolage.cjs`, nicht mit `messen.cjs`. Der Nutzer hat entschieden: Die zu warmen Mitteltöne des Etiketts (Berge sepia statt grau-schwarz, Gold orange statt Ocker) werden mit b) per Kurven je Kanal im Druckmaterial von `product_label.py` ausgeglichen. Kalibrierung über `inv_view.py`, das Papier bleibt im Ziel; Felder und Kriterien stehen unter „Nächste Schritte“ b). Danach die gemeinsame Übernahme von `product_seal.py`, `product_label.py` und `product_jar.py` mit Backup, dann der Hero-Neurender. Ziel: fertig statt perfekt, nach jeder Runde ein Sichtvergleich. Budget: kein Chat und kein Agent über 150k, bei ~120k eine Übergabe schreiben. Subagents brauchten zuletzt 142–284k, b) deshalb lieber im Hauptchat oder sehr klein geschnitten.

**Früherer Startprompt (vor a), nur zur Information):**

> Weiter mit dem Produkt-Abschluss (Royal Spices, Arbeitskopie H:, kein git). Lies `H:\royal-spices\CLAUDE.md`, den Kopf von `_agent/LOG.md` und `royal-spices-v1/docs/UEBERGABE-PRODUKT-ABSCHLUSS.md` ganz. Lies in `UEBERGABE-PRODUKT.md` nur die Abschnitte „Musskriterien Glas-Transaktion“ (G4–G8) und N9–N11. T-20261021-19 (Etikett) ist übernommen. Die erste Runde -13/-14 (T-20261022-10/-11) ist `VERWORFEN`, ihre `work/`-Stände sind die Eingabe. Lies dazu den Abschnitt „Stand nach -13/-14“. Der Nutzer hat zu Punkt 1 entschieden: Ausgleich im Material, das Licht in `web_hero.py` bleibt. Starte den Folgeschritt a), danach b), nach den Grenzen in der Übergabe. Danach kommt der Hero-Neurender. Ziel ist fertig statt perfekt: nach jeder Runde ein Sichtvergleich mit der Referenz, keine Nachbesserung unter der Messgrenze. Budget: kein Chat und kein Agent über 150k, bei ~120k eine Übergabe schreiben.
