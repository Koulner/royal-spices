# Übergabe 19.10.2026: Produkt nach neuer Referenz (Glas, Kork, Band, Etikett, Logo)

Vorgänger: `UEBERGABE-E3-DEMO.md` (R1–R6 erfüllt, c2 im Code, Entwurf P1–P6 vom 17.10.). Transaktionslog: `../../_agent/LOG.md`.

**Stand 20.10.:**
- N0–N11 und F1–F6 sind freigegeben (19.10.).
- T-20261019-02 ist geprüft. Die Nacharbeit läuft als T-20261020-10.
- T-20261019-03 abgenommen (20.10.): Das Werkzeug aus T-20261020-11 ist geprüft (in einer Kopie bytegleich nachgebaut) und liegt in `staging/T-20261019-03/tools/`.
- T-20261020-12 (Glas und Kork) ist `VERWORFEN`: am 20.10. wegen Budget abgebrochen (164k Tokens), nichts übernommen. Stand t12b: 18 von 21 Glas- und Korkpunkten ≤ 1 % B. Außer Toleranz sind `lippe_o_r`, `schulter_l_44` und `schulter_l_40`. x 62 (`schulter_l_44`) wird nach Nutzerentscheid vom 20.10. nur ausgewiesen.
- **Glas-Strang (Stand 21.10.):** Eigene Übergabe ab dem Chatwechsel 21.10.: `UEBERGABE-GLASFORM.md` (Stand, Entscheidungen, nächste Schritte, Startprompt).
  - **T-20261020-17** Glasform ist `FERTIG` und vom Hauptchat geprüft: F1–F6 erfüllt, Schlusslauf t17c, alle 20 gewerteten Punkte ≤ 1 % B.
  - **T-20261021-10** Kantenband (G2) läuft als Subagent.
  - Danach folgt **T-20261021-11** Korkmaterial und Korn (G3), die ID ist reserviert.
  - Nutzer 21.10.: -17, -10 und -11 werden erst gemeinsam ins Projekt übernommen. Bis dahin bleibt `product_jar.py` im Projekt beim alten Glas.
- Die Musskriterien G1–G8 für die Glas-Transaktion sind freigegeben (20.10., Abschnitt unten).
- Projektcode unverändert.

## Entscheidungen des Nutzers zu T-20261019-02 (20.10.2026)

- **K7:** 2,2 % angenommen. Das Maximum ist eine Einzelstelle (Kehle Seitenzweig/Stiel), p95 liegt bei 1,1 %. K7 gilt damit als erfüllt, keine Nacharbeit.
- **K3:** Weg (c). Vor der Messung wird der Druck mit der Unschärfe der Referenz gefaltet, dann wird je Element gegen ±15 % gewertet. Der Druck bleibt unverändert. Nur Elemente, die danach noch durchfallen, werden nach (b) nachgebessert (Striche dünner, K5-Lage in Toleranz halten). SAFFRON Blau ist ausgenommen, weil ±15 % in 8 bit nicht darstellbar sind. Die Faltungsbreite wird aus der Referenz geschätzt (z. B. Kantenrampe an scharfen Etikettkanten) und in `ERGEBNIS.md` begründet.
- **Logofarbe:** Wird aus der Referenz gemessen: Median der Strichmitten im Referenz-Logo, ohne Kanten und Reflexe, statt `#dfc68b`. Endgültig wird sie im Render der Glas-Transaktion geprüft.
- **IDs:** Der Produkt-Chat vergibt neue IDs ab dem 20.10. nur aus dem Block `T-20261020-10` bis `-19` (siehe Kopf von `_agent/LOG.md`). Die Glas-Transaktion bekommt die erste freie ID daraus. Es gelten die GPU-Sperre `_agent/gpu.lock` und die anderen Regeln für den Parallelbetrieb im LOG-Kopf.

## Stand 20.10. (vierter Chat, Produkt)

- **T-20261019-02 geprüft:**
  - K1 und K8 unabhängig nachgemessen: W/H −0,006 %, Eckradius 0,0408 Lw; Papier 82,98 % genau 240/221/201.
  - K9 per Neuaufbau in einer Kopie bestätigt (GESAMT `0cb18f6b…acbd`).
  - Überlagerungen gesichtet: Zeilen, Schrift, Flagge und Logo-Umriss passen.
  - Nebenbefund EST-Raute: Im Druck ≈ 6 px breit statt ≈ 10–11 px. Die K5-Messung hatte Raute und rechten Strich verschmolzen. Die Asymmetrie der Striche (links ≈ 15 px, rechts ≈ 7 px) ist echt.
- **Logofarbe gemessen (Hauptchat):** Median der Strichmitten = `#ae884a`. Verhältnis zum Referenzpapier 0,8056 / 0,7047 / 0,4379, Druck mit PAPIER `#c19c58`. Skript: `_agent/staging/T-20261020-10/eingabe/logofarbe.cjs`.
- **T-20261020-10 (Subagent):** K3 (c) mit Faltung, Logofarbe, EST-Raute. Auftrag A1–A7. Danach `etikett.svg` und `berge.png` gemeinsam übernehmen (vorher Nutzer fragen). T-02 wird mit -10 zusammen übernommen.
- **T-20261019-03:**
  - `abgleich.py` angepasst: Breite aus `BODY_W_BU`, `AB_BPX` 897,2 / `AB_CX` 513,4 / `AB_GY` 1654, Blüte ausgeblendet.
  - t03b gerendert: Körper bei 0,60 B 448,1 px (Soll 448,6).
  - Werkzeug-Schritte 1, 2 und 4 laufen als **T-20261020-11** (Subagent, B1–B5).
  - Danach T-03 abnehmen.

## Wiedereinstieg (Stand 20.10., vierter Chatwechsel, Budget ~120k)

**Offen beim Nutzer (zuerst klären, falls unten nicht schon als entschieden eingetragen):**
1. ~~**Freigabe G1–G8**~~ **Erledigt:** am 20.10. vom Nutzer freigegeben. T-20261020-12 (Glas und Kork) startet nach der Übernahme von T-20261020-11.
2. ~~**K3-Weg für die Etikett-Nacharbeit.**~~ **Erledigt:** Der Nutzer hat am 20.10. Weg (i) gewählt. Er läuft als T-20261020-15 (Subagent, Sitzung „K3 Weg i und Logo“). Zusätzlich verlangt der Nutzer: „das Logo muss auch noch 1 zu 1 übernommen werden“. Die Kriterien L1–L6 hat der Nutzer am 20.10. freigegeben (Wortlaut in `_agent/staging/T-20261020-16/AUFTRAG.md`). Umsetzung als T-20261020-16 (Subagent, parallel zu -15, nur Logodateien). **Stand 21.10.:** -15 (C1, die Farbe der Referenz ist unschärfer als 4:2:0) und -16 (Budget) sind verworfen. Der Nutzer hat entschieden: Das Logo wird bei L2/L3 über die Helligkeit (Luma Y) gemessen, Toleranzen unverändert. Beim Etikett gilt K3 für die Helligkeit je Element ±15 % und für die Farbe je Farbgruppe ±15 % je Kanal. Folge-Transaktionen sind T-20261021-15 (Etikett) und T-20261021-16 (Logo). Das Bandzeichen (L4) folgt danach. Weiter im eigenen Chat: `UEBERGABE-ETIKETT.md`. Bisheriger Text: T-20261020-10 ist abgebrochen (Budget). Teilergebnisse liegen im Staging (siehe LOG). Die σ-Schätzung widerspricht sich: Die erf-Anpassung an Kanten ergibt σ_zusatz 0,565 px, die Gegenprobe mit kleinsten Quadraten 1,35–1,75 (Flagge 0,80). Mit 0,565 fallen 12 Elemente durch: dünne Striche zu dunkel, braune Texte zu hell, EST./2024 Blau zu dunkel. GRADE 1 Blau (Referenz −0,002) weicht absolut um 0,056 ab. Zur Wahl:
   - (i) **Empfohlen:** Die Referenz physikalisch nachbilden: Luma σ ≈ 0,6 und Chroma wie WebP 4:2:0 (Cb/Cr in halber Auflösung). Danach (b) für den Rest nach den Vorschlägen in `staging/T-20261020-10/ERGEBNIS.md`: Striche ≈ 0,5 px, Braun schwerer, EST-Raute in Gruppe gold und ≈ 10 px breit. GRADE 1 Blau ausgenommen wie SAFFRON Blau.
   - (ii) σ aus der Gegenprobe (≈ 1,5) nehmen.
   - (iii) K3 je Gruppe werten (≤ 4,7 %) und nur die EST-Raute (Breite, Gruppe gold) korrigieren.
   Folge-Transaktion: nächste freie ID ab `T-20261020-15` (-12 bis -14 sind für Glas/Band/Etikett vorgesehen), Eingabe ist `staging/T-20261020-10/out/`, gleiche Zielpfade. Klein schneiden: Der letzte Agent brauchte schon 51k Startkontext.
3. Nach der Folge-Transaktion: Nutzer fragen, dann `etikett.svg` und `berge.png` gemeinsam mit allem aus `out/` übernehmen. T-02 und die Folge-Transaktion gemeinsam auf `ÜBERNOMMEN` setzen, Backup nach CLAUDE.md.

**T-20261020-11 (Messwerkzeug, Subagent):** `FERTIG` kurz nach dem Chatwechsel. B1–B5 laut Bericht erfüllt. Abweichende Referenzpunkte: Kork rechts 434,8 (Pore bei 429), Etikett links 65,9, Band Hals rechts 319,0. Auf t03b bestanden 7/50 mit dem alten Produkt. Die AB-Werte aus dem Ausgleich nicht übernehmen (instabil, erst mit neuem Produkt sinnvoll). `staging/T-20261020-11/ERGEBNIS.md` gegen B1–B5 prüfen, dann die Werkzeuge nach `staging/T-20261019-03/tools/` und die Bilder nach `.raw/tests/glass-ref2/` übernehmen. Damit T-03 abnehmen.

**Startprompt für den neuen Chat:**
> Weiter mit dem Produkt nach der neuen Referenz (Royal Spices, Arbeitskopie H:, kein git). Lies `H:\royal-spices\CLAUDE.md`, den Kopf von `_agent/LOG.md` (Parallelbetrieb ab 20.10.: ID-Block `T-20261020-10` bis `-19`, GPU-Sperre, Schreibmengen) und in `royal-spices-v1/docs/UEBERGABE-PRODUKT.md` die Abschnitte „Stand 20.10.“, „Wiedereinstieg (Stand 20.10., vierter Chatwechsel)“ und „Musskriterien Glas-Transaktion“, dazu die LOG-Zeilen T-20261019-02/-03 und T-20261020-10/-11. Reihenfolge: (1) T-20261020-11 prüfen und übernehmen, T-03 abnehmen; (2) die offenen Nutzerentscheidungen (G1–G8, K3-Weg) einholen, soweit nicht eingetragen; (3) Etikett-Folge-Transaktion vergeben, prüfen, nach Rückfrage übernehmen; (4) nach Freigabe G1–G8 die Glas-Transaktion T-20261020-12 als Subagent. Blender 4.5 unter `F:\3D\Blender\Blender 4.5`, `RS_DEVICE=HIP`, vor jedem Render `_agent/gpu.lock` prüfen und setzen. Schreibmenge des Produkt-Chats: `assets-src/label/**`, `pipeline/blender/**` (Produkt), `.raw/tests/glass-ref2/**`, `docs/UEBERGABE-PRODUKT.md`, eigenes Staging. Budget: kein Chat und kein Agent über 150k; bei ~120k Übergabe schreiben und neuen Chat starten. Subagents klein schneiden (Ziel ≤ 80k).

## Musskriterien Glas-Transaktion (freigegeben 20.10.)

**Freigabe:** Der Nutzer hat G1–G8 am 20.10.2026 unverändert freigegeben. T-20261020-12 (Glas und Kork) darf starten, sobald das Messwerkzeug aus T-20261020-11 geprüft und übernommen ist (G1).

Grundlage: N0–N11 und F1–F6 (freigegeben 19.10.). Die Kriterien unten machen N2–N6 für den Bau messbar. Füllung (N10), Hero-Tafel 3 und R1–R4 folgen in einer eigenen Transaktion danach.

**Schnitt (Budget):** drei Transaktionen nacheinander bzw. teilweise parallel, je ein Subagent mit Staging:
- **T-20261020-12** Glas und Kork (`product_jar.py`).
- Danach parallel, mit disjunkten Dateien:
  - **-13** Band, Logo und Bandzeichen (`product_seal.py`).
  - **-14** Etikett am Glas (`product_label.py`).

Renders gehen nur ins jeweilige Staging bzw. nach `.raw/tests/glass-ref2/`, immer mit GPU-Sperre.

- **G1 Messung:** Alle Lage- und Formprüfungen laufen mit dem Werkzeug aus T-03 / T-20261020-11.
  - Die Abgleichkamera aus `abgleich.py` misst, Referenzwerte aus `ref-punkte.json`, Ausgleich (a).
  - Danach liegt jeder Punkt ≤ 1 % B neben der Referenz.
  - Boden und rechte Körperkante werden nur ausgewiesen.
  - Maßstab B = 52,7 mm (F2), Querschnitt quadratisch (F5).
  - Die abgeleiteten 3D-Maße in mm (Glashöhe, Lippe, Hals, Schulter, Kork, Band, Etikett) stehen als Tabelle im Ergebnis.
- **G2 Glas (-12):**
  - Alle Glaspunkte ≤ 1 % B: Körperbreite in mehreren Höhen, Schulter, Hals, Lippe (Breite, Ober- und Unterkante), Beginn der senkrechten Kante.
  - **Nutzerentscheid 20.10. (nach T-20261020-12):** Der Referenzpunkt x 62 (`schulter_l_44`) ist ein Artefakt der Referenz. Er liegt 11,5 px über x 79 und 6,2 px über seinem Spiegelpunkt x 451, das kann ein symmetrisches Glas nicht zeigen. Er wird wie Boden und rechte Körperkante nur ausgewiesen. Die Schulter richtet sich nach x 44, x 79 und x 451.
  - Boden dick, 0,11 B ± 0,02 B.
  - Lippe als dicker, runder Ring, Profil dokumentiert.
  - Radius der senkrechten Kanten: Die Breite des hellen Kantenbands im Render liegt ± 30 % neben der Referenz (≈ 12 px bei 1×, Luminanzprofil bei y 400).
  - Glas klar wie bisher (R5/R6-Material unverändert, nur die Form ist neu).
- **G3 Kork (-12):**
  - Silhouette ≤ 1 % B: Breite oben und an der Lippe, Überstand, leicht konisch, Oberkante gerundet.
  - Grober Presskork, mittlerer Kornabstand ± 25 % neben der Referenz (Autokorrelation an einem Korkausschnitt in Referenz und Render).
  - Farbe relativ zum Etikettpapier ± 15 % je Kanal, Licht- und Schattenseite getrennt. Gemessen wird erst mit dem neuen Etikett (-14), bis dahin zur Information.
- **G4 Band (-13):**
  - Dunkelgrün und matt, Farbe relativ zum Papier ± 15 % je Kanal.
  - Breite am Etikett und Mitte je ≤ 1 % B.
  - Läuft über die Korkoberseite und vorn senkrecht herab, Spitze halbrund, Unterkante ≤ 1 % B.
  - Liegt auf Kork und Lippe auf, spannt gerade über den Hals und liegt ab der Schulter an.
  - Keine Durchdringung: Mindestabstand Band–Glas/Kork ≥ 0 per BVH-Test, Wert ausgewiesen.
  - Rückseite bis zur Schulter, ohne Druck.
- **G5 Logo und Bandzeichen (-13):**
  - `logo-band.png` und `zeichen-oben.png` aus T-20261020-10.
  - Lage und Größe des Logos ≤ 1 % B.
  - Gold metallisch.
  - Farbe im Render: Median der Strichmitten (Verfahren `logofarbe.cjs`) ± 15 % je Kanal neben der Referenz (`#ae884a`). Das ist die endgültige Prüfung der Logofarbe.
- **G6 Etikett (-14):**
  - Format 0,837 × 1,063 B, Ecken r ≈ 0,034 B, mittig, Unterkante 0,117 B. Alle Etikettkanten ≤ 1 % B (Werte aus `ref-punkte.json`).
  - Textur `etikett.png` aus T-20261020-10, flach.
  - Im Render liegen ROYAL, SAFFRON und Flagge je ≤ 1 % Lh neben der Referenz.
  - Texeldichte im Abgleichrender ≥ 1 Texel je Pixel, Abschätzung für das größte Hero-Bild (N9).
- **G7 Ordnung:**
  - Der Master bleibt unverändert.
  - Änderungen nur in `pipeline/blender/product_{jar,seal,label}.py` (je Transaktion eine Datei). Die alten Werte bleiben als Kommentar oder Schalter nachvollziehbar.
  - Ein Aufruf von `ab.sh` erzeugt den Prüfrender neu.
- **G8 Abnahme je Transaktion:**
  - Tafel 1 (Referenz | Abgleichrender | Überlagerung) mit der Punkttabelle, alle in Toleranz.
  - Ab -13/-14 zusätzlich Tafel 2: 100-%-Ausschnitte von Kork, Band mit Logo, Etikett mit Bergen.

## Wiedereinstieg (Stand 19.10. mittags, dritter Chatwechsel, Budget ~120k)

**T-20261019-02 (Etikett-Druckbild): `OFFEN`.** Der erste Agent hat um 12:21:38 noch `ABGEBROCHEN` geschrieben. Der zweite Agent (Neustart 12:25) hat B und C fertig gemacht und endete `ABGEBROCHEN` (Budget). Werte: Logo-Strich 4,30 = 4,30 px, Umriss p95 1,58 px (1,1 %), Maximum 3,09 px (**2,2 % der Logohöhe, K7 knapp verfehlt**, Stelle: Kehle Seitenzweig/Stiel). Bandzeichen Bestwert p95 3,25 px. Berge 8,74× (Mitchell, selbst geschrieben), Kanten links 6/7 und rechts 7/7 ≤ 1 % Lw, die verdeckte Ecke unten rechts ist gespiegelt ergänzt. **Seit etwa 12:45 läuft ein dritter Agent nur für Teil D** (build.cjs, etikett.svg/png, Goldmaske, README, Überlagerungen, Endmessung K1–K5/K8, K9), im Hintergrund dieses Chats. Prüfen:
**Nachtrag 19.10. gegen 13:00: Der dritte Agent ist `FERTIG`** (`ERGEBNIS.md`, Ausgaben 12:44). Laut Bericht:
- K1: 3225 × 4096 px, W/H −0,006 %, Eckradius 0,0404 Lw.
- K2: oben/unten ≤ 0,01 % Lh, Breite ≤ 0,58 % Lw.
- K5: EST-Raute 1,94 % Lw, knapp in der Toleranz.
- K8: Standardabweichung 0.
- K9: zwei Läufe gleich, GESAMT-SHA-256 `0cb18f6b…acbd` (`pruefung/build-hashes.txt`).
- Eingriff in A: `tools/linien.cjs` verschiebt die Enden der „Linie mit Raute“ in `satz-werte.json` (alt: `pruefung/satz-werte-vor-D.json`).
- Der Agent hat etwa 174k Tokens gebraucht und damit die 150k-Grenze überschritten.

Noch nicht vom Hauptchat geprüft. **Zu tun im neuen Chat:**
1. Gegen K1–K9 prüfen: Messwerte nachrechnen, die Überlagerungen in `pruefung/` verkleinert ansehen, K9-Hash per Neuaufruf von `build.cjs`.
2. Dem Nutzer drei Entscheidungen vorlegen:
   - **K7:** Logo-Maximum 2,2 % statt 2 %.
   - **K3:** Je Farbgruppe passt es (≤ 4,7 %), außer SAFFRON Blau +38,7 % (8-bit-Grenze). Je Element liegen 11 von 17 außerhalb ±15 %, weil dünne Striche in der unscharfen Referenz heller wirken. Vorschläge des Agents: (a) je Gruppe werten, (b) Striche ≈ 1 px dünner setzen, (c) den Druck vor der Messung mit der Unschärfe der Referenz falten.
   - **Logofarbe:** `#dfc68b` wirkt in `ueberlagerung-logo.png` blasser als das Gold der Referenz.
3. Danach übernehmen: `etikett.svg` und `berge.png` gehören zusammen, Zielpfade stehen in `ERGEBNIS.md`. Oder Nacharbeit vergeben.

**T-20261019-03 (Abgleichkamera und Messwerkzeug): `OFFEN`.** Werkzeuge in `_agent/staging/T-20261019-03/tools/`:
- `ab.sh t03a --ab both --fill old` läuft (24 s). Maske sauber: Glas 1, Kork 1, Band 1, Logo 1, Etikett 19 Objekte. Bilder: `.raw/tests/glass-ref2/t03a_{abgleich,maske}.png`. Kosmetik: Im Abgleichrender ist links noch eine lila Blüte zu sehen (Namenspräfix fehlt in `hide_from_camera`).
- `punkte.cjs` schreibt die 42 Prüfpunkte nach `ref-punkte.json` und behält verfeinerte Werte. `messen.cjs --verfeinern` setzt die Referenzkanten und baut den Kontaktbogen `.raw/tests/glass-ref2/ref-punkte.png` (je Punkt ein 36-px-Ausschnitt, 5×). `messen.cjs <maske.png>` schreibt `<tag>_messung.{json,md}`. `lupe.cjs` macht Lupen mit Pixellineal.
- **Maskenseite funktioniert.** Kanten werden über Eintritt und Austritt gefunden, subpixelgenau per Projektion zwischen reinen Klassen. Befund bei t03a: Die Körpersilhouette im Render ist 36,3–472,6 px breit (436,3 px), soll aber 443 px haben. Die Bounding Box des Glases (4,503 BU) überschätzt die Silhouette um 1,5 %, `BODY_W_BU` 4,44 passt. Fix in `abgleich.py`: Breite aus `BODY_W_BU` (bzw. aus der gemessenen Silhouette), nicht aus der Bounding Box.
- **Referenzseite muss umgebaut werden.** Die Suche nach dem größten Gradienten (±4 px) landet an Innenreflexen (siehe Kontaktbogen). Neu: 50-%-Übergang, gemessen von der gleichmäßigen Seite aus. Je Punkt einstellbar: Kanal (Luminanz, für Kork gegen Beige besser der Blaukanal) und die Seite, die gleichmäßig ist (Grund bzw. Etikett/Band). Danach den Kontaktbogen erneut prüfen.

**Befunde an der Referenz (Lupe, bei 1×):**
- Körper links 32,4 px, scharf. Rechts ist die Kante weich (Rampe etwa 6 px) und nur vor dem dunklen Karton messbar (y 300–530). Der 50-%-Übergang liegt dort bei 479,3–483, im Mittel ≈ 481. Das helle Band bei x 469–481 ist die gerundete senkrechte Kante, links entsprechend etwa 33–47. Damit ist **B ≈ 448,6 px (Silhouette), Mitte ≈ 256,7**. Die Erstmessung hatte 443 / 256,5, also B um etwa 1,2 % zu klein. Alle B-Verhältnisse der Tabelle oben verschieben sich entsprechend.
- **Glasboden: weich und schräg.** 50-%-Übergang bei x 120: 821,5; x 160: 824,5; x 200: 825,2; x 240: 829,2; x 280: 829,8; x 320: 832,1; x 345: 831,8. Ein klarer Rand fehlt (Kontaktschatten oder Spiegelung). „Boden y 817“ stimmt nicht. Bei dieser Streuung lässt sich 0,2 % B am Boden nicht messen.
- Scharf sind:
  - Etikett: links 67,8, rechts 444,0 (376,2 px ≈ 0,839 B), oben 293,7 (bei u −0,30), unten 761,9.
  - Band: am Hals 196,5–318,0, Spitze 357,2, oben 30,8.
- Kork bei y 55 ≈ 93–429. Der Sollwert links in der Erstmessung (84) ist falsch.
- Die Bandbreite bei h 1,11 liegt schon im Halbkreis der Spitze. Sie muss über y 294 gemessen werden, auf dem Glas.
- Logo-Ausdehnung (Goldanteil): x 214,5–301,3, y 155,2–295,2, noch nicht per Kontaktbogen bestätigt.

**Entscheidung des Nutzers 19.10. mittags: Bezug (a).** Wortlaut: „Bezug a: Maßstab und Lage per Ausgleich über alle scharfen Punkte, ohne Boden und rechte Körperkante; danach jeder Punkt ≤ 1 % B.“ Damit entfällt „Rahmen ≤ 0,2 % B“ als Abnahme von T-03. Neu gilt: Werkzeug misst alle Punkte, Ausgleich eingebaut, Tafel vorhanden. Der Boden und die rechte Körperkante werden weiter gemessen und ausgewiesen, gehen aber nicht in den Ausgleich ein. Die Kamera von `abgleich.py` muss nur grob stimmen.

Zur Wahl standen:
- (a) **Empfohlen:** Maßstab und Lage per Ausgleich über alle scharfen Punkte (Ähnlichkeitstransformation: Maßstab, Versatz x, Versatz y), ohne Boden und rechte Körperkante. Danach muss jeder Punkt einzeln ≤ 1 % B liegen. Grund: Die Referenz ist ein KI-Bild mit inneren Widersprüchen (Boden schräg, rechte Kante weich). Ein fester Anker würde deren Fehler in alle Höhen tragen.
- (b) Fester Rahmen: Körperbreite (Silhouette, gemittelt) und Boden (Mittel über x 120–345, ≈ 827). Einfacher, aber jede Höhe trägt dann etwa ±0,5 % B Unsicherheit.

**Nächste Schritte T-03:**
1. Referenzseite auf den 50-%-Übergang umstellen.
2. Punktliste korrigieren:
   - Körper rechts nur bei y 300–530.
   - Band über y 294.
   - Kork-Sollwerte, Boden an mehreren x.
   - Rahmen B 448,6 / Mitte 256,7.
   - Danach `--verfeinern` und Kontaktbogen prüfen.
3. `abgleich.py`: Breite aus `BODY_W_BU`, `AB_BPX`/`AB_CX`/`AB_GY` auf die neuen Werte, Blüte ausblenden. Neu rendern (t03b).
4. Ausgleich (a) in `messen.cjs` einbauen (Maßstab, Versatz x, Versatz y nach kleinsten Quadraten über die scharfen Punkte; Boden und rechte Körperkante nur ausweisen), dann `tafel.cjs` (Referenz | Abgleichrender | Überlagerung).
5. T-03 abnehmen und `T-20261019-04` vergeben.

**Startprompt für den neuen Chat:**
> Weiter mit dem Produkt nach der neuen Referenz. Lies `royal-spices-v1/docs/UEBERGABE-PRODUKT.md`, Abschnitt „Wiedereinstieg (Stand 19.10. mittags, dritter Chatwechsel)“, und die letzten Einträge in `_agent/LOG.md`. Prüfe zuerst T-20261019-02 (FERTIG im Staging, gegen K1–K9 prüfen und K7/K3/Logofarbe dem Nutzer vorlegen), dann T-20261019-03 im Hauptchat fortsetzen. Bezug für den Rahmen ist (a), Ausgleich (entschieden).

## Wiedereinstieg (Stand 19.10., zweiter Chatwechsel, überholt)

**T-20261019-02 (Etikett-Druckbild, Subagent): `OFFEN`, läuft im Hintergrund des alten Chats.** Auftrag mit K1–K9 und Teilen A–D: `_agent/staging/T-20261019-02/AUFTRAG.md`. Zielpfade (beide neu, kein Backup nötig): `assets-src/label/**`, `pipeline/blender/label-assets/**`.
- Liegt `ERGEBNIS.md` vor: gegen K1–K9 prüfen (Messwerte nachrechnen, Tafeln in `pruefung/` ansehen, K9-Hash per Neuaufruf), dann übernehmen oder verwerfen.
- Fehlt `ERGEBNIS.md` und der alte Chat ist zu: Stand aus `STAND.md` lesen und den Agenten auf dem Zwischenstand neu starten (gleiche ID, wie bei T-20261016-03).

**T-20261019-03 (Abgleichkamera und Messwerkzeug, Hauptchat): `OFFEN`, begonnen.** Werkzeuge in `_agent/staging/T-20261019-03/tools/`:
- `abgleich.py`: führt `web_hero.py` bis vor den Kamerazweig aus (Szene, Produkt, Licht, Rendereinstellungen) und setzt dann die Abgleichkamera. Die Kamera steht waagerecht, damit die Senkrechten parallel bleiben, und rahmt per Shift. Lens und Shift folgen aus dem Referenzrahmen bei 2×: Körper 886 px breit, Mitte x 513, Glasboden y 1634. Optionen: `--ab info|render|mask|both`, `--ab-d` (Abstand zur Front in B, 20), `--ab-h` (Höhe über dem Glasboden in B, 2,5). Die Maske rendert flache Farben: Glas rot, Kork grün, Band blau, Bandlogo gelb (`SEAL PRINT` bzw. Name mit `LOGO`), Etikett weiß, alles andere aus. Mit `RS_PIPE=<Ordner>` werden `product_*.py` und `saffron_*.py` aus einer Arbeitskopie geladen (für -04). Karten, Blume, Fäden und Flaggen sind nur für die Kamera unsichtbar.
- `ab.sh <tag> [Argumente]`: Blender 4.5, HIP, 1076 × 1782, Ausgabe nach `.raw/tests/glass-ref2/` (`<tag>_abgleich.png`, `<tag>_maske.png`).
- Getestet ist nur `--ab info --fill old` (6,7 s). Ergebnis: Front −Y, Produkt um ≈ 3,2° gedreht, Kamera bei (−3,01, −91,56, 11,26), Lens 358,8 mm, Shift 0,0140 / −0,8290. `render` und `mask` sind noch nicht gelaufen.
- **Prüfen:** Die Körperbreite aus der Bounding Box des Glases ergibt 4,503 BU, `BODY_W_BU` sagt 4,44 (+1,4 %). Die Frontrichtung kommt aus den Etikettmitten; besser wären die lokalen Achsen des Produkt-Empties. Mit der ersten Maske kontrollieren: Kanten bei x 70 / 956, Boden bei y 1634.

**Kamerawahl (begründet, steht in T-03 noch zur Bestätigung durch den Prüfrender):** Die Hinweise in der Referenz widersprechen sich (KI-Bild):
- Bandoberseite auf dem Kork: 18 px sichtbar (y 30–48 bei x 257), nicht 10 px. Das ergibt etwa 3° Aufsicht am Kork.
- Korkrand-Silhouette: 3–6°.
- Lippenellipse: etwa 9–13 px, also 1,5–2°.
- Boden innen ≈ 0,11 B: 6–7°.

Gewählt: Kamera waagerecht, D = 20 B, H = 2,5 B. Daraus folgen 2,4° Aufsicht am Kork oben, 3,4° an der Lippe und 7,1° am Boden. Wie empfindlich: 1° Fehler verschiebt die obere Kontur der Lippe um etwa 0,7 % B. Wichtig für -04: Die obere Kontur runder Teile ist die Hinterkante (+R·sin α). Darum wird die 3D-Höhe per Prüfrender eingepasst, nicht aus der Tabelle abgeschrieben.

**Nächste Schritte T-03:**
1. `ab.sh t03a --ab both` laufen lassen und die Maske prüfen: Farben sauber, Rahmen stimmt an Körperkanten und Boden.
2. `messen.cjs` schreiben (Node, `sharp`):
   - Referenzpunkte fest in `ref-punkte.json`, aus der Tabelle und per Kantensuche (Gradient, ±4 px bei 1×) verfeinert.
   - Render aus der Maske messen: Farbklassen, Subpixel über den 50-%-Übergang.
   - Ausgabe: Tabelle mit Δ in % B und bestanden ≤ 1 % B.
3. Tafel `tafel.cjs`: Referenz | Abgleichrender | Überlagerung (Maskenkonturen über der Referenz).
4. Mit dem alten Glas weichen die oberen Prüfpunkte erwartungsgemäß stark ab. Abnahme T-03: Rahmen an Körperbreite und Boden ≤ 0,2 % B, Werkzeug misst alle Punkte, Tafel vorhanden. Danach T-03 in den Log und `T-20261019-04` (Glas, Kork, Band) vergeben.

**Startprompt für den neuen Chat:**
> Weiter mit dem Produkt nach der neuen Referenz. Lies `royal-spices-v1/docs/UEBERGABE-PRODUKT.md`, Abschnitt „Wiedereinstieg (Stand 19.10., zweiter Chatwechsel)“, und die letzten Einträge in `_agent/LOG.md`. Prüfe zuerst, ob T-20261019-02 ein `ERGEBNIS.md` hat (sonst wie beschrieben neu starten), dann T-20261019-03 im Hauptchat fortsetzen.

## Wiedereinstieg (Stand 19.10., erster Chatwechsel, überholt)

**Freigabe des Nutzers (Wortlaut):** „N0–N11 sind freigegeben, F1–F6 wie empfohlen: Referenz gilt, Breite 52,7 mm halten, 0,5 g, Füllhöhe wie Referenz, quadratischer Querschnitt, Schriften laden ok. Leg los.“

Damit gilt: Körper 52,7 mm breit (B = 52,7 mm), Etikett „0,5 g“, Füllung bis unter die Schulter, Querschnitt quadratisch, Cinzel, Marcellus und Montserrat dürfen von Google Fonts geladen werden. In der Referenz-Pose ergibt das grob: Etikett 44,1 × 56,0 mm, Glas 80,9 mm hoch, Kork oben 92,2 mm, Hals außen Ø 40 mm, Lippe Ø 44 mm.

**Bisher geprüft (nur gelesen):**
- Keine `OFFEN`-Transaktion schreibt in `pipeline/blender/product_*.py`, `saffron_*.py` oder `web_hero.py`. Offen sind nur T-20261018-07 (Player) und -12 (B2), beide ohne Pipeline-Dateien.
- Testrender laufen über `_agent/staging/INTEGRATION-20261016/tools/r.sh <tag> [Argumente]`: Blender 4.5, `RS_DEVICE=HIP`, Master unverändert, `tune.py` vor `web_hero.py`, Ausgabe nach `.raw/tests/glass-r`. Produktion läuft über `pipeline/blender/render.sh`, mit Master per `RS_MASTER` überschreibbar. Für eine Arbeitskopie der Pipeline im Staging muss der neue Chat erst klären, wie `web_hero.py` `product_jar` usw. importiert (Suchpfad), z. B. über eine Kopie von `pipeline/blender/` im Staging und `--python` auf die Kopie.
- Werkzeuge vom Messbild: `scratchpad/grid.cjs` und `messbild.cjs` (Sitzungs-Scratchpad, nicht dauerhaft). Bei Bedarf neu schreiben: `sharp` aus `royal-spices-v1/node_modules`, Gitter auf einen Ausschnitt legen und Pixel ablesen.

**Gedanken zur Abgleichkamera (N1), noch nicht geprüft:**
- Die Senkrechten in der Referenz laufen parallel. Vom Kork sieht man oben etwa 10 px Bandoberseite (≈ 1,7° Aufsicht), vom Boden innen etwa 0,1 B. Beides passt zu einem langen Objektiv (Abstand ≈ 15 B), Kamera etwa 2 B hoch und um ≈ 5° nach unten geneigt. Eine nahe Kamera würde den Boden viel stärker von oben zeigen.
- Das Band misst am Hals 117 px, am Etikett 124 px. Das spräche für eine nahe Kamera, widerspricht aber den Punkten oben. Vermutlich ist das eine Unstimmigkeit im KI-Bild. Vorschlag: Kamera mit langem Objektiv nehmen und die Maße so einpassen, dass die Überlagerung an allen Prüfpunkten ≤ 1 % B erreicht.
- In der Frontebene (Etikett, Körperkanten) sind die Bildverhältnisse bei geringer Neigung praktisch exakt. Lippe, Hals und Kork liegen 4–6 mm hinter der Front. Bei langem Objektiv sind sie in der Breite höchstens etwa 1 % zu korrigieren.
- Zuerst analytisch projizieren (Prüfpunkte des Profils mit einer Lochkamera, in Node oder Python ohne Blender), dann mit einem Blender-Prüfrender bestätigen.

**Geplante Transaktionen (IDs noch nicht vergeben, Schreibmengen disjunkt):**
1. **T-20261019-02, Subagent: Etikett-Druckbild.** Logo-Vektor (Band) und kleines Bandzeichen als SVG, Schriftsatz aller Zeilen nach der Tabelle, Berglandschaft aus der Referenz (Schrift und Flagge entfernt, ≥ 4× hochgerechnet, Verfahren nach Vergleich), Flagge, Ornamente. Ausgabe: SVG und PNG ≥ 4096 px Höhe, Seitenverhältnis 0,837 : 1,063, dazu eine Überlagerung gegen den Referenzausschnitt mit gemessenen Zeilenlagen (N5, N7, N8). Schreibt nur `_agent/staging/T-20261019-02/`. Startet sofort, ohne GPU.
2. **T-20261019-03, Hauptchat: Abgleichkamera und Messwerkzeug.** Kamera in `web_hero.py`-Arbeitskopie oder `tune.py`-Haken, Prüfrender 1076 × 1782, Skript, das die Prüfpunkte der Tabelle in Referenz und Render misst und eine Tabelle ausgibt, dazu eine Überlagerungstafel.
3. **T-20261019-04: Glas, Kork, Band.** `product_jar.py` (Profile `NECK_OUT`, `BORE`, `CORK`, Wand- und Schulterhöhen, Körnung und Farbe des Korks) und `product_seal.py` (flaches Band, Spitze, Goldlogo) als Kopien im Staging, angepasst bis alle Prüfpunkte ≤ 1 % B. Danach dürfen Etikett und Füllung folgen.
4. **Danach:** `product_label.py` auf die Textur aus -02 umstellen, Füllung neu packen (`saffron_pack.py`, `saffron-fill.json`), Messfelder für R1–R4 neu legen, Tafeln 1–3. Es folgen Queue, volle Tiefe, `flow/` neu, Build, Test und Commit, alles nach Rückfrage.

**Startprompt für den neuen Chat:**
> Weiter mit dem Produkt nach der neuen Referenz. Lies `royal-spices-v1/docs/UEBERGABE-PRODUKT.md` (Wiedereinstieg) und die letzten Einträge in `_agent/LOG.md`. N0–N11 und F1–F6 sind freigegeben. Vergib T-20261019-02 (Etikett-Druckbild, Subagent) und starte ihn, dann T-20261019-03 (Abgleichkamera und Messwerkzeug) im Hauptchat.

## Auftrag (Nutzer, 19.10.)

> hier hast du nochmal ein referenzbild für das glas. Du musst garantieren, dass die Maße 1:1 dieselben sind. es reichen ja die verhältnisse. Der korken muss ebenfalls wie in der referenz aussehen und was sehr sehr wichtig ist, label inkl. der berglandschaft als hintergrund (im label) und das Logo müssen auf jeden Fall sitzen!

- Referenz: `assets-src/photos/ref-glas-1910.webp` (538 × 891, Kopie in `.raw/tests/glass-ref2/ref-nutzer-1910.webp`). Das Bild ist eine Variante von `ref-neu-herat-05-story.png` (gleiches Design, andere Aufnahme) und vermutlich ebenfalls KI-generiert.
- Messbild: `.raw/tests/glass-ref2/messbild-1910.png`.

## Was sich gegenüber dem 17.10. ändert

Am 17.10. war entschieden: Das Original ist das echte Produkt (`safran-glaeser-real.jpg`), das Website-Bild dient nur für das Licht. Die neue Referenz kehrt das für Form, Kork, Band, Etikett und Logo um. Sie unterscheidet sich stark vom heutigen Modell:

| | Modell heute (nach Foto) | Referenz 19.10. |
|---|---|---|
| Glas Höhe : Breite | ≈ 1,05 (fast Würfel) | 1,535 (hoch) |
| Hals : Körper | ≈ 0,60 | 0,76 (Lippe 0,84) |
| Kork | dunkel, feine Körnung, schmal | hell honigfarben, grober Presskork, breit, konisch |
| Band | Schlaufe, blaugrau/dunkelgrün, Schrift „ROYAL SPICES“ | flach, dunkelgrün, ohne Schrift, goldenes Blattzeichen, halbrunde Spitze auf dem Etikett |
| Etikett | 44 × 38,2 mm (breiter als hoch) | Höhe : Breite 1,27, fast ganze Front |
| Etikettinhalt | Blatt, ROYAL SPICES, SAFFRON …, 1 g | EST. 2024, ROYAL SPICES, SAFFRON, HERAT NEGIN, GRADE 1, 0,5 g, PACKED IN GERMANY, Flagge, Berglandschaft |

Das bedeutet: neues Glas, neuer Kork, neues Band, neues Etikett, neu gepackte Füllung, neue Messfelder für R1–R4 und eine neue Queue für alle Bilder mit Glas.

## Messung der Referenz (Erstmessung, ±2 px ≈ ±0,5 % B)

B = Körperbreite in der Referenz (443 px, x 35–478). Höhen über dem Glasboden (y 817).

| Prüfpunkt | Höhe | Breite |
|---|---|---|
| Band oben (über dem Kork) | 1,772 B | |
| Kork oben | 1,749 B | 0,777 B |
| Kork an der Lippe | 1,535 B | 0,727 B |
| Lippe oben / unten | 1,535 / 1,400 B | 0,837 B |
| Hals | 1,400–1,287 B | 0,758 B |
| Schulter oben (Halsfuß) | 1,287 B | |
| Seitenkante senkrecht ab | 1,196 B | 1 B |
| Etikett oben / unten | 1,181 / 0,117 B | 0,837 B (Höhe 1,063 B, Ecke r ≈ 0,034 B) |
| Logo auf dem Band | 1,497–1,178 B | 0,194 B |
| Bandspitze (halbrund) | 1,041 B | Band 0,280 B am Etikett |
| Boden innen (unsicher ±0,02) | ≈ 0,11 B | |

Perspektive: Das Band misst am Etikett 124 px, am Hals 117 px. Die Kamera steht also nah genug, dass hintere Teile (Kork, Lippe) kleiner erscheinen. Die Tabelle gibt Bildverhältnisse an. Die echten 3D-Maße folgen erst aus dem Kamera-Abgleich (N1).

Etikettzeilen, bezogen auf das Etikett (oben = 0, Höhe Lh, Breite Lw):

| Zeile | oben–unten (Lh) | Breite (Lw) | Farbe in der Referenz |
|---|---|---|---|
| EST. ◆ 2024 | 0,140–0,165 | 0,550 | gold, matt |
| ROYAL | 0,207–0,283 | 0,558 | gold |
| SPICES | 0,313–0,387 | 0,553 | gold |
| Linie mit Raute | 0,420–0,433 | 0,553 | gold |
| SAFFRON | 0,469–0,552 | 0,710 | schwarzgrün |
| HERAT NEGIN | 0,600–0,637 | 0,549 | gold |
| — GRADE 1 — | 0,666–0,701 | 0,408 | dunkelbraun |
| 0,5 g | 0,754–0,798 | 0,151 | dunkelbraun |
| PACKED IN GERMANY | 0,833–0,860 | 0,458 | dunkelbraun |
| Flagge | 0,902–0,966 | 0,142 | |
| Berglandschaft | 0,62–1,00 | ganze Breite, zur Mitte auslaufend | Bleistift/Tusche, grau |

Die Bandspitze deckt das Etikett oben bis 0,132 Lh ab (Breite 0,334 Lw).

Farben im Referenzlicht (warm gegradet, sRGB, Mittel bzw. dunkelste 12 %): Papier `#e6d4c1`, Band `#242713`, Kork Lichtseite `#c78d51` / Schattenseite `#704015`, Gold `#7f5719`–`#8d6019`, SAFFRON `#191606`, Kleintext `#251607`–`#3a2816`, Bergstriche `#5a442c`.

## Musskriterien (Entwurf, nicht freigegeben)

- **N0 Vorlage:** Für Glasform, Kork, Band, Etikett und Logo gilt `ref-glas-1910.webp`. Der Entscheid vom 17.10. („Original = echtes Foto“) ist damit für diese Teile aufgehoben. R1–R6 (klares Glas, rote Füllung, kein Schleier) und L6/L7 gelten weiter.
- **N1 Abgleich:** Eine Kamera wird an die Referenz angepasst (Brennweite, Abstand, Höhe, Neigung). Der Prüfrender hat das Format der Referenz, 2× (1076 × 1782). Ein Messwerkzeug legt Referenz und Render übereinander und misst die Kanten an allen Prüfpunkten der Tabelle. Dazu kommt eine Überlagerungstafel.
- **N2 Glasform:** An jedem Prüfpunkt höchstens 1 % B neben der Referenz (≈ 4 px). Geprüft werden Körperbreite, Glashöhe, Lippe (Breite, Ober- und Unterkante), Hals, Schulter, senkrechte Kante, Kantenradien und Bodenkante. Der Querschnitt ist quadratisch (Annahme, F5). Der Boden ist dick (≈ 0,11 B), die Lippe ein dicker, runder Ring.
- **N3 Kork:** Silhouette höchstens 1 % B neben der Referenz: oben 0,777 B, an der Lippe 0,727 B, Überstand 0,214 B, leicht konisch, Oberkante leicht gerundet. Durch das Glas ist er bis etwa 1,30 B sichtbar. Material grober Presskork: helle, honigfarbene Körner mit dunklen Fugen. Korngröße wie in der Referenz (mittlerer Kornabstand ±25 %). Farbe relativ zum Etikettpapier höchstens ±15 % je Kanal neben der Referenz, Lichtseite und Schattenseite je für sich gemessen.
- **N4 Band:** Dunkelgrün, matt (Farbe relativ zum Papier ±15 % je Kanal). Breite 0,280 B am Etikett ±1 % B, mittig. Es läuft über die Korkoberseite (dort ein kleines goldenes Zeichen wie in der Referenz) und vorn senkrecht über Kork, Lippe, Hals und Schulter. Es endet mit einer halbrunden Spitze auf dem Etikett, Unterkante bei 1,041 B ±1 % B. Es liegt auf Kork und Lippe auf, spannt gerade über den Hals und liegt ab der Schulter flach an. Nichts durchdringt sich. Die Rückseite läuft wie vorn bis zur Schulter, ohne Druck (Annahme).
- **N5 Logo:** Das Blattzeichen wird aus der Referenz als Vektor nachgezeichnet: mittleres Blatt mit Mittelrippe, zwei seitliche Blätter mit Rippe, Stiel mit Verzweigung, Goldlinie ohne Füllung, Strichstärke wie in der Referenz. Der Umriss weicht höchstens 2 % der Logohöhe ab (≈ 3 px), die Lage höchstens 1 % B (0,194 × 0,318 B, Mitte Band, 1,497–1,178 B). Das kleine Zeichen oben auf dem Band wird genauso nachgezeichnet. Gold metallisch, Farbe nach Referenz.
- **N6 Etikett:** Format 0,837 × 1,063 B (Höhe : Breite 1,27), Ecken r ≈ 0,034 B, mittig, Unterkante 0,117 B über dem Glasboden; Kanten höchstens 1 % B neben der Referenz. Papier warmweiß, matt, mit feiner Faser nur im Streiflicht.
- **N7 Etikettdruck:** Zeilen, Ornamente und Flagge wie in der Tabelle. Lage höchstens 1 % Lh, Zeilenbreite höchstens 2 % Lw, Farben relativ zum Papier ±15 % je Kanal. Alles wird neu als Vektor gesetzt, nichts als unscharfes Bild aus der Referenz übernommen. Schriften frei (OFL), Auswahl per Überlagerung aus je 2–3 Kandidaten. Vorschlag: Cinzel (ROYAL SPICES, SAFFRON), Marcellus (HERAT NEGIN), Montserrat (EST. 2024, GRADE 1, 0,5 g, PACKED IN GERMANY).
- **N8 Berglandschaft:** Sie wird aus der Referenz übernommen, nicht neu erfunden. Bergketten links und rechts mit Gipfeln am Rand, Nadelbäume im Vordergrund, heller Talgrund in der Mitte, Bleistift- bzw. Tuschezeichnung in Grau, von 0,62 Lh bis zur Unterkante, zur Mitte hin auslaufend. Dafür wird der Ausschnitt aus der Referenz genommen, Schrift und Flagge werden entfernt, das Bild wird mindestens 4× hochgerechnet und als Ebene unter den Druck gelegt. Kanten der Bergzüge höchstens 1 % Lw neben der Referenz. Keine Schriftreste und keine sichtbaren Hochrechnungsartefakte im 100-%-Ausschnitt des größten Hero-Bildes.
- **N9 Textur:** Das Etikett hat mindestens 1 Texel je Bildpixel im Hero-Bild, in dem das Etikett am größten ist.
- **N10 Füllung:** Die Füllung wird für das neue Innenvolumen neu gepackt, Füllhöhe nach F4. R1–R4 werden in quer p 1, quer p 0,9 und hoch mit neu gelegten Messfeldern gemessen und müssen erfüllt sein. L7 (Renderzeit höchstens 1,1 × von c2) gilt weiter oder wird vor der Queue neu genannt.
- **N11 Abnahme:** Tafel 1 zeigt Referenz | Abgleichrender | Überlagerung, dazu die Prüfpunkt-Tabelle (alle innerhalb der Toleranz). Tafel 2 zeigt 100-%-Ausschnitte von Kork, Band mit Logo, Etikett und Berglandschaft. Tafel 3 zeigt die Hero-Bilder quer p 1, quer p 0,9 und hoch mit dem neuen Glas. Die Queue startet erst nach Freigabe dieser Tafeln durch den Nutzer. Der Master bleibt unverändert, alle Änderungen stehen in `pipeline/blender/product_*.py`, `saffron_*.py`, `web_hero.py` und `docs/ASSETS.md`.

## Offene Fragen an den Nutzer

1. **F1 Vorlage:** Gilt die neue Referenz ab jetzt statt des echten Produkts? Dann zeigt das Hero nicht mehr das Glas aus `safran-glaeser-real.jpg` (würfelig, blaugraues Band, kleines Etikett).
2. **F2 Maßstab:** Bleibt die Körperbreite 52,7 mm? Dann wird das Glas etwa 81 mm hoch, mit Kork etwa 92 mm (heute rund 55 bzw. 62 mm). Oder bleibt die Gesamthöhe? Dann wird das Glas etwa 35 mm breit. Empfehlung: Breite halten und die Schlüsselbilder auf Anschnitt prüfen; die Kamera wird nur angepasst, wenn der Kork angeschnitten ist.
3. **F3 Gewicht:** „0,5 g“ wie in der Referenz? Bisher stand „1 g“ auf dem Etikett.
4. **F4 Füllhöhe:** In der Referenz reichen die Fäden bis unter die Schulter (≈ 1,2 B). Das sind weit mehr Fäden als 0,5 g, und die Renderzeit steigt. Wie Referenz oder realistisch?
5. **F5 Tiefe:** Ist ein quadratischer Querschnitt in Ordnung? Die Referenz zeigt nur die Front.
6. **F6 Schriften:** Dürfen Cinzel, Marcellus und Montserrat von Google Fonts geladen werden (OFL, je unter 1 MB)?

## Folgen für laufende Arbeit

- **Flüssig (T-20261018-06/-07/-08):** Die Daten von -06 (`flow/`) beruhen auf den c2-Bildern. Mit dem neuen Glas werden alle Hero-Bilder neu gerendert. Dann folgen die volle Tiefe (≈ 1 h) und `flow/` mit den Werkzeugen von -08 neu. Der Player (-07) hängt nicht vom Bildinhalt ab.
- **dev:** `2f55884` (Glas c2) und `b44cb1b` liegen lokal, nicht gepusht. Ob c2 als Zwischenstand online geht, entscheidet der Nutzer getrennt.

## Vorgeschlagene Reihenfolge nach Freigabe

1. **Abgleich (Hauptchat):** Kamera an die Referenz anpassen, Messwerkzeug mit den Prüfpunkten bauen (`.raw/tests/glass-ref2/`).
2. **Etikett-Druckbild (Subagent, Staging):** Logo-Vektor, Schriftsatz, Berglandschaft (bereinigt, hochgerechnet) als SVG und PNG ≥ 4096 px. Läuft parallel zu Schritt 3, mit disjunkten Schreibmengen.
3. **Glas, Kork und Band (Hauptchat):** `product_jar.py` und `product_seal.py` nach N2–N4 umbauen, Abgleich bis alle Prüfpunkte ≤ 1 % B.
4. Etikett einbauen (`product_label.py`), Füllung neu packen, Tafeln 1–3 rendern, R1–R4 messen und dem Nutzer zeigen.
5. Nach Freigabe: alte Bilder wegräumen, Queue, volle Tiefe, `flow/` neu, Build, Test, Commit (nach Rückfrage).
