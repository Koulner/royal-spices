# Übergabe 24.10.2026: Safran-Füllung natürlich und botanisch korrekt

Auftrag des Nutzers (24.10.): „den getrockneten Safran wirklich natürlich und biologisch korrekt rendern“. Chatwechsel wegen Budget, bevor Kriterien standen. **Keine Transaktion angelegt**, nichts geändert außer `docs/ABSCHLUSS-TODO.md` (Abschnitt 2 auf Stand 24.10.).

## Heutiger Stand im Projekt (nur gelesen)

- `pipeline/blender/saffron_pack.py` (877 Zeilen, nur numpy): jeder Faden eine eigene Form, 2–3,5 cm, flaches Band, schmale Basis, offener gekräuselter Trichter mit gezähntem Rand, verdreht, geknickt, teils gefaltet, einige gebrochen. Packung quasi-statisch unter Schwerkraft (absenken, kippen, rollen bis 3 Kontakte), etwa 22 % flach an der Glaswand (`P_WALL`). Parameter je Faden in `thread_params()`: `length`, `cut`, `w0`/`w1` (Breite Basis/Ende), `ts`, `d_end` (Trichter), `phi_sh`/`phi_end`, `flatten`, `thick`, `tooth`, `ruffle`(`_k`, `_ph`), `curl` …
- `pipeline/blender/saffron-fill.json`: Cache Version 2, Seed 20261007, 282 Fäden (421 verworfen), **Innenraum noch vom alten Glas** (`mm_per_bu` 11,8637).
- `pipeline/blender/saffron_fill.py` (382 Zeilen): baut die Füllung in Blender aus dem Cache. Ein gemeinsames Material „dried negin tissue“ für Füllung und lose Fäden vor dem Glas: Transluzenz Körper/Rand (`TRANS_*`), Längsrillen 10/mm, Bump 0,6, Rauheit 0,38, Spec 0,35. Dazu der verdeckte Kern (`CORE_ON`, T-20261010-01, tiefrot seit T-20261018-03): ein geschlossener Körper hinter den Fäden, damit die Füllung blickdicht wirkt.
- Geschichte im LOG: T-20261007-02, T-20261008-01/-02 verworfen (Geometrie und Packung), T-20261008-03 Material übernommen, T-20261010-01 Kern und Hülle, T-20261015-02 Kern rot.

## Zusammenhang

- Der Hero-Neurender (N10 in `UEBERGABE-PRODUKT-ABSCHLUSS.md`) muss die Füllung ohnehin für das neue Innenvolumen neu packen. Die Safran-Arbeit gehört also vor den Hero-Neurender und vor den Vollrender Flüssig Stufe 3, am besten in einen gemeinsamen Lauf.
- Die GPU ist bis nach dem Proberender T-20261023-03 und der S4-Kodierung belegt (`_agent/gpu.lock`), danach wartet noch Produkt 2b2b (Kork, t2214k). Packung und Geometrie laufen auf der CPU, das geht parallel.
- Laut Arbeitsweise: erst Muss-Kriterien vorlegen und freigeben lassen, dann bauen.

## Nächste Schritte

1. Referenz klären: echte Makrofotos von getrocknetem Negin-Safran. Liegt eine beim Nutzer oder Kunden? Sonst die Produktfotos aus `Projektübergabe/` und `ref-neu-negin-1g-premium.png` sichten.
2. Einen heutigen Render der Füllung (Nahaufnahme, mit und ohne Glas) mit der Referenz vergleichen und die Abweichungen benennen.
3. Muss-Kriterien entwerfen und dem Nutzer vorlegen. Botanische Grundlage (Crocus sativus, Güteklasse Negin):
   - nur die rote Narbe, kein gelber oder weißer Griffel
   - Länge etwa 20–35 mm
   - Narbe als Röhre, an einer Seite geschlitzt, zum Ende hin ein Trichter mit gefranstem Rand, Basis schmal
   - getrocknet: Längsfalten, verdreht, teils flach gedrückt
   - Farbe tief karminrot, an dünnen Stellen im Gegenlicht orangerot, matt mit leichtem Schimmer
   - teils drei Narben am Grund noch verbunden
   - Messbar machen: Längen- und Breitenverteilung, Trichteranteil, Farbe je Kanal gegen die Referenz (über `inv_view.py`, AgX), Sichtprüfung der Tafel.
4. Erst nach Freigabe: Transaktion anlegen (ID nach LOG-Prüfung), Schreibmenge `saffron_pack.py`, `saffron_fill.py`, `saffron-fill.json`. Nicht parallel zu T-20261022-14 rendern (gpu.lock).

## Startprompt für den neuen Chat

> Royal Spices, Safran-Füllung natürlich und botanisch korrekt rendern (Auftrag des Nutzers 24.10.). Lies H:\royal-spices\CLAUDE.md und royal-spices-v1/docs/UEBERGABE-SAFRAN.md. Noch keine Transaktion, noch keine Kriterien. Erst Referenz klären und den heutigen Stand (saffron_pack.py, saffron_fill.py) mit einer Nahaufnahme vergleichen, dann Muss-Kriterien vorlegen und auf Freigabe warten. GPU nur unter _agent/gpu.lock, der Proberender Flüssig T-20261023-03 und Produkt 2b2b haben Vorrang. Nichts übernehmen, kein Push ohne Go. Budget: kein Chat und kein Agent über 150k Tokens.

## Stand 24.10., 01:50: Vergleich gemacht, Kriterien S1–S14 liegen dem Nutzer vor (nicht freigegeben)

Weiterhin **keine Transaktion**, Projektcode unverändert. Alles Folgende liegt im Scratchpad der Sitzung cd8511c2 (`C:\Users\lukas\AppData\Local\Temp\claude\C--Users-lukas--claude-spares-spare-odL1Sw\cd8511c2-3e04-4324-9d59-797efe855078\scratchpad\`) und kommt bei BEGIN in den Staging-Ordner: `vergleich-safran-24-10.png` (Tafel Referenz gegen heute), `closeup.py` (Blender, CPU: `A` = Einzelfäden aus `thread_params()` auf Grau mit mm-Skala, `B` = Füllung ohne Glas aus dem Cache), `run_low.ps1` (CPU, 6 Threads, niedrige Priorität), `hsv.ps1` (Farbton/S/V der roten Pixel).

**Referenzen:** Form und Oberfläche nach dem Makrofoto der Live-Seite (`assets-src/photos/live-royalspices/saffron_threads_*.jpg`), Gesamtton im Glas nach dem echten Produktfoto (`safran-glaeser-real.jpg`, dunkles Weinrot). `ref-neu-negin-1g-premium.png` nur für das Licht: Die Fäden dort haben runde Köpfchen, das ist botanisch falsch. Literatur: 87,6 % der Narben 20–30 mm, Kopf 1,5–2 mm, „am Rand eingerollt, an der Spitze gekerbt“. Negin = rote Narbe ohne oder fast ohne Griffel. „Drei Narben verbunden“ ist für Negin nicht belegt.

**Abweichungen heute:** Die Front im Glas ist zu etwa 77 % Kern (K4: Fäden 23 %), ohne Glas sieht man einen Block mit hellem Marmormuster. Die Fäden sind steife, flache Bänder mit hartem orangem Saum, gleichmäßigen Rillen (wie Kord) und grauem Glanz (Sheen/Coat). Sie haben V-Knicke statt drahtiger Bögen. Der Trichter ist ein kleiner Becher, bei den losen Fäden eine Quaste. An der Front liegen die Fäden fast alle waagerecht. Gemessen (sRGB, Median rote Pixel): Makrofoto 0,4° / S 0,92; Füllung im Hero 12,5° / 0,85; lose Fäden 9,6° / 0,61; Tafel 8,3° / 0,61. Die Fäden sind also zu orange und zu braun, die Füllung zu orange.

**Kriterien-Entwurf** (Wortlaut im Chat vom 24.10., Kurzform): S1 nur rote Narbe · S2 ≥ 80 % der Fäden 20–30 mm (heute ca. 72 %) · S3 Schaft fadenförmig 0,2–0,5 mm, Breite:Dicke ≤ 2:1 (heute 4–11:1) · S4 Trompete 1,5–3 mm, geschlitzt, gekerbt, flach gefaltet, 15–30 % der Länge · S5 drahtige Bögen, keine V-Knicke · S6 alle verschieden, ca. 15 % gebrochen · S7 Farbton Tafel 0–6°, S ≥ 0,80, Ränder im Gegenlicht 10–25° · S8 kein grauer/weißer Glanz (≤ 1 % der Fadenpixel S < 0,35 und V > 0,6), unregelmäßige Fasern · S9 kein heller Saum · S10 Front ohne Glas ≥ 90 % Fäden, Kern nirgends sichtbar · S11 verfilzt, ≤ 40 % waagerecht ±15° · S12 Hero-Füllung ≤ 8°, Licht und Glas unverändert · S13 Füllhöhe bleibt, Oberfläche locker · S14 Packung CPU, deterministisch, ≤ 30 min, keine Durchdringung, neues Innenvolumen, Renderzeit ≤ +15 %.

**Offene Fragen an den Nutzer:** (1) Kern behalten (komplett verdeckt) oder durch mehr Fäden ersetzen? (2) Lose Fäden vor dem Glas mit in den Umfang? Dann kommt `web_hero.py` (nur `add_threads()`) in die Schreibmenge. (3) „Drei Narben verbunden“ streichen? (4) Gibt es ein Makrofoto vom echten Herat Negin des Kunden?

**Wichtig für COMMIT:** `web_hero.py` importiert `saffron_fill` bei jedem Blender-Start. Den Proberender T-20261023-03 und die Tafeln von 2b2b würde eine Übernahme also mittendrin verändern. Deshalb erst übernehmen, wenn beide Render fertig sind.

## Nachtrag 24.10., 02:30: hochwertige Fotos von Safranhaufen (auf Wunsch des Nutzers)

Gesichtet im eingebauten Browser, nichts heruntergeladen. Unsplash-Originale per Server-Ausschnitt (`?rect=x,y,w,h&w=800`) 1:1 angesehen.

| Quelle | Was es zeigt |
|---|---|
| Commons `File:Safran-Weinviertel_Niederreiter_2_Gramm_8285.jpg` (Hubertl, CC BY-SA 4.0, 3520 px) | 2 g im neutralen Studiolicht, 1:1: beste Farb- und Formreferenz |
| Commons `File:Persian_Saffron.jpg` (CC BY-SA 4.0, 5352 px) | persischer Haufen auf Weiß, rot, lange Fäden |
| Unsplash `photo-1697546312799-e46bcbd73ed6` (6240 px) | Safran im Glasgefäß (Laden): so wirkt die Füllung durch Glas |
| Unsplash `photo-1643471672168-f4a4b6cfa440` (5472 px) | aus kleinem Glas gekippter Haufen, 1:1 |
| Unsplash `photo-1615885108069-…`, `photo-1656568866961-…`, Commons `Saffron_-_premium_spice.jpg` | Haufen in Schale bzw. auf Stein, kräftiges Rot |
| Commons `Dried_saffron.jpg` | **kein Safran** (Saflorblüten), ausgeschlossen |

**Was die Fotos zeigen:**
- **Schaft:** schmal, leicht flach und verdreht (etwa 0,3–0,5 mm), drahtig, mit S-Bögen, Haken und Locken am dünnen Ende.
- **Trompete:** zerknittert und gefaltet wie ein kleiner Papierfächer, etwa 3–6 mm lang, mit gekräuseltem orange bis gelborangem Rand. Nie ein Becher, eine Quaste oder ein Köpfchen.
- **Farbe:** Im neutralen Licht ziegel- bis weinrot, an dünnen Stellen durchscheinend orange. Unter warmem Licht wirkt sie orangerot, Stockfotos sind auf Scharlach gezogen.
- **Oberfläche:** matt mit satiniertem, rötlich hellem Glanz auf flachen Stellen und feinen Längsfasern. Kein grauer Glanz.
- **Haufen und Glas:** wirken wie Filz oder Wolle aus sehr feinen, gelockten Fäden in alle Richtungen, mit hellerer Vorderlage und **dunkler, fast schwarzroter Tiefe** in den Lücken. An der Glaswand liegen die Fäden kreuz und quer, nicht als flache parallele Bänder. Die Oberkante ist flauschig, Locken stehen ab.

**Folgen für den Entwurf** (Änderungen gegenüber dem Stand von 01:50):
- **S3:** Schaft 0,2–0,6 mm, leicht flach und verdreht, Breite:Dicke ≤ 3:1.
- **S4:** Trompete zerknittert/gefaltet, 1,5–3 mm breit, 10–25 % der Länge, Rand gekerbt und gekräuselt, orange bis gelborange.
- **S7:** Körper 0–8°, S ≥ 0,75; dünne Stellen und Trompetenrand 15–35°.
- **S8:** satinierter rötlicher Glanz erlaubt, grauer oder weißer nicht.
- **S10:** Der Kern bleibt, aber dunkel schwarzrot, nur als Tiefe in den Lücken. Das kehrt T-20261018-03 um (Kern hellrot). Es ist erst vertretbar, wenn mindestens 90 % der Front aus Fäden bestehen.
- **S11 neu:** Im Hero bei 1920 px sind die Schäfte höchstens 3 px breit (heute 4–7 px breite Bänder, 1 mm ≈ 4,9 px).
- **S13:** Die Oberkante ist flauschig.
- **S14:** Packung ≤ 60 min, Renderzeit ≤ +25 %. Grund: Für ≥ 90 % Front mit dünnen Fäden braucht es geschätzt 1500–2500 Fäden in einer Schale von 3–4 mm vor dem Kern statt 282. Das heutige Packverfahren (282 Fäden in 543 s) reicht dafür voraussichtlich nicht, wahrscheinlich braucht die Schale an der Wand ein eigenes Verfahren.

**Budget:** Dieser Chat steht bei etwa 120k. Nach der Freigabe in einem neuen Chat weiter, mit dem Startprompt oben und dem Zusatz: „Kriterien: Abschnitte ‚Stand 24.10., 01:50‘ und ‚Nachtrag 02:30‘, Freigabe des Nutzers im Wortlaut eintragen.“

## Freigabe 24.10., 02:01

Wortlaut des Nutzers: „Freigegeben: S1–S14 in der Fassung vom Nachtrag 02:30, die vier Fragen nach deinen Empfehlungen. Trag die Freigabe ein, dann geht es im neuen Chat weiter.“

Damit gilt:
- **Kriterien:** S1–S14 aus „Stand 24.10., 01:50“ mit den Änderungen aus „Nachtrag 24.10., 02:30“. Bei Widerspruch gilt der Nachtrag. (Die Uhrzeiten 01:50/02:30 in den Überschriften waren geschätzt, die Freigabe kam laut Systemzeit um 02:01.)
- **(1) Kern:** Er bleibt, wird dunkel schwarzrot und ist nur als Tiefe in den Lücken sichtbar. Voraussetzung ist eine Front aus mindestens 90 % Fäden (S10).
- **(2) Lose Fäden vor dem Glas** gehören zum Umfang. Sie bekommen dieselbe Form und dasselbe Material (S1–S9).
- **(3)** „Drei Narben verbunden“ ist gestrichen: Negin besteht aus einzelnen Narben.
- **(4) Referenzen** wie in der Tabelle im Nachtrag:
  - Form und Farbe nach dem 2-g-Haufen Weinviertel (Studiolicht)
  - Wirkung durch Glas nach dem Glasgefäß im Laden (Unsplash `photo-1697546312799`)
  - Gesamtton nach dem echten Produktfoto
  - `ref-neu-negin-1g-premium.png` nur für das Licht

**Schreibmenge der kommenden Transaktion:**
- `royal-spices-v1/pipeline/blender/saffron_pack.py`
- `royal-spices-v1/pipeline/blender/saffron_fill.py`
- `royal-spices-v1/pipeline/blender/saffron-fill.json`
- `royal-spices-v1/pipeline/blender/web_hero.py`, nur `add_threads()`

Mit keiner offenen Transaktion (T-20261022-14, T-20261023-03/-04) gibt es Überschneidungen. Die ID vergibt der neue Chat nach Prüfung des LOG.

**Bedingungen:**
- Packen und Bauen auf der CPU im Staging.
- GPU nur unter `gpu.lock`, T-20261023-03 und 2b2b haben Vorrang.
- Übernahme erst, wenn beide Render fertig sind (`web_hero.py` importiert `saffron_fill` bei jedem Blender-Start).
- Das Packen zielt auf das neue Innenvolumen (N10).

**Hinweis zum Vorfall um 02:01:** Ein ungeschützter Heredoc hat Backtick-Pfade ausgeführt, dabei liefen `saffron_pack.py`, `saffron_fill.py`, `saffron-fill.json` und `web_hero.py` als Bash-Skripte und brachen mit Syntaxfehlern ab. Geprüft: keine Datei verändert oder angelegt (`find -newermt`), der Abschnitt wurde danach neu geschrieben.

### Startprompt für den neuen Chat

> Royal Spices, Safran-Füllung natürlich und botanisch korrekt (Auftrag 24.10.). Lies H:\royal-spices\CLAUDE.md und royal-spices-v1/docs/UEBERGABE-SAFRAN.md ab „Stand 24.10., 01:50“. Die Kriterien S1–S14 (Fassung Nachtrag 02:30) und die vier Entscheidungen sind freigegeben (Abschnitt „Freigabe 24.10., 02:01“). Lege die Transaktion an (ID nach LOG-Prüfung, Schreibmenge laut Übergabe) und schneide die Arbeit so, dass jeder Subagent weit unter 150k bleibt. Vorschlag: zuerst Fadengeometrie und Material (Tafel und Makro auf der CPU, Werkzeuge `closeup.py`, `run_low.ps1` und `hsv.ps1` aus dem Scratchpad der Sitzung cd8511c2, Pfad steht in der Übergabe), danach Wandschale und Packung, zuletzt die losen Fäden und den Hero-Abgleich. GPU nur unter _agent/gpu.lock, T-20261023-03 und Produkt 2b2b haben Vorrang. Erst nach dem Ende beider Render übernehmen. Kein Push ohne Go.

## Stand 24.10., 16:10 (Sitzung 8f942ddd): Transaktion läuft, Stufe b1 neu gestartet

Der Startprompt oben ist **veraltet**. Die Transaktion **T-20261024-10** besteht seit 02:15 (Sitzung 875b3d92). Maßgeblich sind die Zeile im `_agent/LOG.md` und `_agent/staging/T-20261024-10/AUFTRAG.md` (Kriterien, Stufen, Werkzeuge, Übernahmeregeln).

- **Stufe a** (Einzelfaden und Material, S1–S9): fertig und geprüft, siehe `PRUEFUNG-A.md`. Hinweise für Stufe c stehen dort: Orange nur am Trompetenrand, `retint_loose_threads()`.
- **Stufe b1** (Wandschale, Packung, Cache, ohne Render): Der erste Anlauf ist gegen 03:31 ohne Ergebnis stehen geblieben, als die Sitzung endete. Sein Stand liegt in `b-schale-abbruch1/`. Um 16:08 lief **b1 neu** als Subagent im Hintergrund dieser Sitzung an. Er arbeitet in `b-schale/` und beginnt mit einer Kopie von `a-faden/work/`. Verfahren: zuerst die Schale, jeder Faden wird entlang der Wandnormale an Glas oder Schale gelegt, die Deckung je Wand wird gerastert, danach füllt pack() die Oberkante. Grenze: 45 Tool-Aufrufe. Das Ergebnis kommt nach `b-schale/ERGEBNIS.md` und `messung-b1.txt`.
- **Danach** b2 (`b2-front/`: dunkler Kern, Frontrender S10/S11a/S13, beginnt mit einer Kopie von `b-schale/work/`), dann c (`c-hero/`: lose Fäden, S11b, S12, Renderzeit).
- **GPU:** Flüssig Durchgang 2 (T-20261023-03) läuft seit 16:05 etwa 3,5–4 h unter `gpu.lock`, danach folgen S4 und S2. Anschließend ist t2214k (2b2b, T-20261022-14) dran. Die Stufen a, b1 und b2 rendern nur auf der CPU über `run_low.ps1`.
- **Übernahme** erst nach dem Ende beider Render (T-20261023-03 samt S4, t2214k). Kein Push ohne Go.

### Startprompt für den nächsten Chat

> Royal Spices, Safran-Füllung, Transaktion T-20261024-10 weiterführen. Lies H:\royal-spices\CLAUDE.md, royal-spices-v1/docs/UEBERGABE-SAFRAN.md ab „Stand 24.10., 16:10“ und _agent/staging/T-20261024-10/AUFTRAG.md. Lege keine neue Transaktion an. Prüfe zuerst, ob `b-schale/ERGEBNIS.md` vorliegt (läuft noch, wenn nicht da und ein Python-Prozess rechnet). Dann b1 gegen die Abnahmekriterien prüfen (Deckung je Wand ≥ 92 %, S11a ≤ 40 %, Determinismus, keine Durchdringung, Packzeit ≤ 60 min) und `PRUEFUNG-B1.md` schreiben. Danach b2 und c als Subagents mit harten Grenzen für Tool-Aufrufe. GPU nur unter _agent/gpu.lock, T-20261023-03 und 2b2b haben Vorrang. Erst nach dem Ende beider Render übernehmen. Kein Push ohne Go.

### Nachtrag 17:32: b1 zweiter Anlauf ABGEBROCHEN

Das Ergebnis steht in `b-schale/ERGEBNIS.md` und `messung-b1.txt`, der Smoke-Render in `smoke-b1.png` (noch nicht angesehen). Erfüllt sind Determinismus (MD5 gleich), Packzeit 3156 s, keine Durchdringung, S11a 13,3 % und der Smoke-Test. **Verfehlt:**
- **Deckung je Wand 42,6 % statt ≥ 92 %.** Der Grund: Ab etwa 40 % Deckung kreuzen die rund 2 BU langen Fäden ältere Fäden und landen tiefer als die Schale von 0,30 BU. 53 799 von 54 500 Versuchen waren blockiert.
- **S13:** Die mittlere Oberfläche liegt bei 4,83 statt etwa 3,48. Der Haufen ist zu porös, eine leere Säule hat das Ende des Laufs verhindert.

Der Subagent lag bei ca. 207k Kontext und damit wie Stufe a über der Grenze. Der dritte Anlauf muss **kleiner geschnitten** werden:
- b1a: das Schalenverfahren nur auf einem Wandausschnitt von etwa 1 × 1 BU entwickeln, bis die Deckung dort ≥ 92 % erreicht. Ansätze aus ERGEBNIS.md: mehrere Lagen bzw. Lagen je Fadenform probieren, bevor verworfen wird, kürzere oder gebrochene Schalenfäden, Fäden an Vorgänger anschmiegen, größere Schale bzw. größerer CORE_IN.
- b1b: der volle Lauf mit Messung.
- Die Oberkante als eigener kleiner Schritt: halten bei surf ≥ z_goal, leere Säulen dem Kern überlassen.

Jeder Teilauftrag bekommt höchstens 25 Tool-Aufrufe und beginnt mit einer Kopie von `a-faden/work/`. Der Code aus `b-schale/work/` darf gelesen und übernommen werden (Hash2, korrigierte Klemme in `core_mesh`, CORE_INSET 0,35, `pack_seconds` ausgelagert).

## Stand 24.10., 19:45 (Sitzung 3f5f4eca): b1 zweiter Anlauf abgelehnt, b1 dritter Anlauf und c1 laufen

Der Abschnitt „Stand 24.10., 16:10“ ist überholt.

- **b1, zweiter Anlauf:** nicht angenommen, siehe `_agent/staging/T-20261024-10/PRUEFUNG-B1.md`. Deckung 0,43 statt ≥ 0,92, Oberfläche 4,83 statt ≈ 3,48. Erfüllt waren Determinismus, Durchdringung, S11a und Packzeit. Der Stand liegt in `b-schale-abbruch2/`.
- **Freigabe des Nutzers (ca. 19:40):** dritter Anlauf b1 (Schale in Lagen, Oberkante endet bei der Zielhöhe) und parallel c1. c ist geteilt: c1 übernimmt nur `add_threads()` (lose Fäden, S1–S9, CPU, ab `a-faden/work`). c2 übernimmt Material, S11b, S12 und Renderzeit nach b2. Die Änderung steht in `AUFTRAG.md`, Abschnitt „Änderung 24.10., 19:42“.
- **Laufend seit etwa 19:45:** zwei Subagents dieser Sitzung.
  - b1 in `b-schale/`, höchstens 40 Tool-Aufrufe. Er startet am Ende zwei volle Läufe losgelöst (`work/saffron-fill.json`, `run2.json`, Logs `run1.log`/`run2.log`). Die Abnahme macht der Hauptchat mit `b-schale/messen_schale.py --cache2 b-schale/run2.json`.
  - c1 in `c1-lose/`, höchstens 35 Tool-Aufrufe.
  - Beide schreiben `ERGEBNIS.md`.
- **Danach:** Prüfung von b1 und c1 (`PRUEFUNG-B1.md` ergänzen, `PRUEFUNG-C1.md`), dann b2 (`b2-front/`, ab `b-schale/work/`), dann c2 (`c-hero/`, ab `b2-front/work/` plus `add_threads()` aus `c1-lose/work/`). GPU nur unter `gpu.lock`, erst nach T-20261023-03 (samt S4/S2) und t2214k.
- **Übernahme** erst nach dem Ende beider Render. Kein Push ohne Go.

### Startprompt für den nächsten Chat

> Royal Spices, Safran-Füllung, Transaktion T-20261024-10 weiterführen. Lies H:\royal-spices\CLAUDE.md, royal-spices-v1/docs/UEBERGABE-SAFRAN.md ab „Stand 24.10., 19:45“ und _agent/staging/T-20261024-10/AUFTRAG.md (mit „Änderung 24.10., 19:42“). Lege keine neue Transaktion an. Prüfe, ob `b-schale/ERGEBNIS.md` und `c1-lose/ERGEBNIS.md` vorliegen und ob noch Packläufe (python saffron_pack.py) rechnen. Nimm b1 an den zwei vollen Läufen mit `messen_schale.py --cache2` ab und c1 gegen S1–S9. Danach b2 und c2 als Subagents mit harten Grenzen für Tool-Aufrufe. GPU nur unter _agent/gpu.lock, T-20261023-03 und t2214k haben Vorrang. Erst nach dem Ende beider Render übernehmen. Kein Push ohne Go.

## Stand 24.10., 20:45 (Sitzung 3f5f4eca): c1 angenommen, b1 dritter Anlauf abgebrochen, Entscheidung zum Verfahren offen

Der Abschnitt „Stand 24.10., 19:45“ ist überholt.

- **c1 angenommen** (`PRUEFUNG-C1.md`): 18 lose Fäden aus dem neuen Einzelfaden mit Füllmaterial, S1–S9 erfüllt (S8 nur durch den AA-Ring 1,83 %). Der Stand liegt in `c1-lose/work/web_hero.py` (65129205). c2 setzt ihn ein. Hinweise für c2 stehen in `PRUEFUNG-C1.md`.
- **b1 dritter Anlauf abgebrochen** (`PRUEFUNG-B1.md`, Nachtrag): Die Lagen-Schale verklemmt bei etwa 0,44 Deckung. Die Trompeten machen die Fäden quer zur Wand 0,11 BU dick, und starre Fäden, die einzeln gesetzt werden, verklemmen bei 20–40 % je Lage. Der Stand liegt in `b-schale/`, ist nicht übernehmbar, der Cache ist unverändert.
- **Entschieden (Nachtrag):** Option 1, gewachsene Schalenfäden, zuerst 2D-Machbarkeitstest auf einer Wand, Integration nur bei ≥ 0,92 mit höchstens 4 Lagen (Wortlaut im LOG, „Entscheidung b1-Verfahren“). Ursprünglich offen war die Entscheidung des Nutzers zum Verfahren für b1. Die Optionen stehen am Ende von `PRUEFUNG-B1.md`:
  1. gewachsene Schalenfäden mit 2D-Machbarkeitstest (Empfehlung)
  2. gemischte Tiefe
  3. Kriterium S10 ändern
  Die Antwort wird im `_agent/LOG.md` als „Entscheidung b1-Verfahren“ eingetragen.
- **Vor einem neuen b1-Anlauf:** `b-schale/` nach `b-schale-abbruch3/` verschieben und `b-schale/work/` neu anlegen, je nach Verfahren aus `b-schale-abbruch2/work/` oder `a-faden/work/`. CORE_IN und CORE_INSET gleichziehen.
- **Subagents:** Alle drei lagen über 150k (a 271k, c1 174k, b1 160k), obwohl die Grenzen für Tool-Aufrufe eingehalten waren. Nächste Aufträge deshalb kleiner schneiden: Machbarkeitstest und Integration als getrennte Subagents, höchstens 25 Tool-Aufrufe, keine Bilder ohne Not.
- GPU, Übernahme und Push wie bisher: GPU nur unter `gpu.lock` nach T-20261023-03 und t2214k, Übernahme erst nach dem Ende beider Render, kein Push ohne Go.

### Startprompt für den nächsten Chat

> Royal Spices, Safran-Füllung, Transaktion T-20261024-10 weiterführen. Lies H:\royal-spices\CLAUDE.md, royal-spices-v1/docs/UEBERGABE-SAFRAN.md ab „Stand 24.10., 20:45“, _agent/staging/T-20261024-10/AUFTRAG.md (mit „Änderung 24.10., 19:42“), PRUEFUNG-B1.md (Nachtrag und Optionen) und den letzten Eintrag „Entscheidung b1-Verfahren“ in _agent/LOG.md. Lege keine neue Transaktion an. Setze die Entscheidung als neuen b1-Anlauf um, mit Subagents unter 25 Tool-Aufrufen je Teilauftrag, Machbarkeitstest vor der Integration. Danach b2 und c2 (c1 ist angenommen). GPU nur unter _agent/gpu.lock, T-20261023-03 und t2214k haben Vorrang. Erst nach dem Ende beider Render übernehmen. Kein Push ohne Go.
