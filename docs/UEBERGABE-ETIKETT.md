# Übergabe 21.10.2026: Etikett-Druckbild und Blattlogo (Nacharbeit zu T-20261019-02)

Vorgänger: Sitzung „K3 Weg i und Logo“ (20./21.10., Chatwechsel bei über 200k Tokens). Übergeordnet: `UEBERGABE-PRODUKT.md`. Transaktionslog: `../../_agent/LOG.md`.

## Entscheidungen des Nutzers

- **20.10.:** K3-Weg (i): Die Referenz wird nachgebildet (Unschärfe und Farbauflösung), danach wird nach (b) nachgebessert.
- **20.10.:** „Das Logo muss auch noch 1 zu 1 übernommen werden.“ Dafür gelten die Kriterien L1–L6 (Wortlaut in `_agent/staging/T-20261020-16/AUFTRAG.md`), freigegeben:
  - L1 Merkmale: spitze Spitzen, gerades Stielende, Knoten an den Verzweigungen.
  - L2 Umriss: p95 ≤ 0,75 px, Max ≤ 1,5 px.
  - L3 Strichstärke je Teil ± 10 %.
  - L4 Bandzeichen als Blattlogo in Draufsicht, falls der Ausgleich besser passt als heute.
  - L5 Farbe #c19c58.
  - L6 Ordnung und Wiederholbarkeit.
- **21.10.:**
  - Das Logo wird bei L2 und L3 über die **Helligkeit (Luma Y)** gemessen statt über R − B. Die Toleranzen bleiben.
  - **Etikett K3:** Helligkeit je Element ± 15 % ohne Ausnahme, Farbe je Farbgruppe ± 15 % je Kanal. Die Farbe je Element wird nur ausgewiesen. Ausgenommen bleibt SAFFRON Blau (8 bit), Kanäle mit |Ref| < 0,01 werden nur absolut gewertet.
  - **21.10. (Folgechat):** L4 Bandzeichen: Das neue Zeichen (Blattlogo in Draufsicht) und das heutige Zeichen werden beide über **Luma Y** gemessen und verglichen. Der alte Vergleichswert 3,25 px (R − B) entfällt, R − B nur als Info. Runde (b) zu -15 als T-20261021-17 freigegeben.
- Grund für beides: Die Referenz ist ein verlustbehaftetes WebP. Ihre Farbe ist deutlich unschärfer als die Helligkeit, stärker als 4:2:0 allein erklärt (σ_C ≈ 1,5 zusätzlich). Über die Farbe gemessen liegt die Messgrenze des Logos über der Toleranz. Über die Helligkeit gemessen liegt sie bei p95 0,56 / Max 1,03 px, also innerhalb.

## Transaktionen (Stand 21.10., 15:30, Folgechat „Etikett und Blattlogo“)

| ID | Status | Inhalt |
|---|---|---|
| T-20261019-02 | OFFEN | Etikett-Druckbild, Grundlage. Wird gemeinsam mit den Folgen übernommen. |
| T-20261020-10/-15/-16 | VERWORFEN | Teilergebnisse sind Eingaben der Folgen. |
| T-20261021-15 | VERWORFEN | Etikett K3 (D1–D7), `ABGEBROCHEN` (Tool-Grenze). D1 erfüllt (σ_C 1,5), D2/D4 nicht, D5–D7 ja. `out/` ist Eingabe von -17. |
| T-20261021-16 | **FERTIG, geprüft** | Blattlogo `logo-band` über Y, M1–M5 erfüllt. Unabhängig nachgebaut: Hashes und `logo-messung.md` bitgleich. Offen: `build-logo.patch` fehlt (`ueberlagerung-logo.png`/`endmessung.json` zeigen R − B). README-Text zum Logo steht in seinem `ERGEBNIS.md`. |
| **T-20261021-17** | **FERTIG laut Agent, ungeprüft** | E1–E6 gemeldet erfüllt, GESAMT `9da61257…346b`. Zu prüfen: Gruppenzuordnung in `satz.cjs` geändert (Raute → gold, nicht in `config.cjs`), braun R/G/B gesenkt bzw. angehoben ([0,1587 0,0891 0,0242] → [0,1375 0,0814 0,0448]), GRADE 1 Gewicht 900 (Maximum). | Runde (b) zu -15, Kriterien E1–E6 (`staging/T-20261021-17/AUFTRAG.md`). Einmal vom Sitzungslimit unterbrochen (nur die Kopie war fertig und ist geprüft), danach fortgesetzt. |
| **T-20261021-18** | **FERTIG laut Agent, ungeprüft** | Y 8×: heute p95 4,19 / Max 8,25, Blattlogo Stiel vorn 3,25 / 5,25 (hinten 3,28 / 5,52), Messgrenze 3,09 / 5,26. Vorsprung 0,94 px = 0,30 × Messgrenze. Nach der Regel neu: Draufsicht, Stiel vorn; `zeichen-oben.svg` = `logo-band.svg`. Dem Nutzer vorlegen (Vorsprung klein gegen die Messgrenze). `build.cjs` lief nicht: beim Zusammenführen prüfen, ob `build.cjs` aus dem neuen Eintrag `zeichen-oben` dieselben Dateien erzeugt. README-Vorschlag `README-zeichen.md`. | Bandzeichen L4 über Y, Kriterien Z1–Z5 (`staging/T-20261021-18/AUFTRAG.md`), Grundlage -16. |

-17 und -18 sind fertig (Stand 21.10. abends), beide `ERGEBNIS.md` liegen vor. -18 lag laut Harness bei 121k Tokens, -17 bei 181k. Fehlt `ERGEBNIS.md`: `STAND.md` und die Änderungszeiten ansehen, nicht pollen. Wird ein Agent vom Sitzungslimit unterbrochen, setzt der Folgechat ihn mit SendMessage fort.

**ID-Vergabe:** Im Produktblock vom 21.10. sind `T-20261021-10` (andere Sitzung) sowie -15 bis -18 vergeben. Frei ist nur noch -19 (für das Zusammenführen vorgesehen). -11 bis -14 sind frei geblieben, die Glas-Sitzung nutzt sie aber möglicherweise. Vor jeder neuen ID LOG **und** `_agent/staging/` prüfen.

**Hinweis zu L4:** Über Y liegt die Messgrenze in der Zeichen-Region (8×) bei p95 3,09 / Max 5,26 px, also etwa so hoch wie der alte R − B-Wert 3,25. Unterschiede zwischen dem neuen und dem heutigen Zeichen sind daher nur aussagekräftig, wenn sie deutlich darüber liegen. -18 weist das aus. Die Regel „p95_neu < p95_alt“ bleibt, ob das Ergebnis trägt, entscheidet der Nutzer.

## Nächste Schritte

1. **-17 prüfen** gegen E1–E6: `ERGEBNIS.md`, in `pruefung/messung.md` den Abschnitt „K3 (Wertung …)“, `build.cjs` aus einer Kopie neu bauen und die Hashes vergleichen (Muster: Kopie im Scratchpad, `node build.cjs <ordner>`, ≈ 5 s). Bei Abbruch oder Durchfallern: dem Nutzer vorlegen. Den Status im LOG führt der neue Chat nach.
2. **-18 prüfen** gegen Z1–Z5: `zeichen-oben-fit.png` ansehen. In einer Kopie `node logo-pruefen.cjs <ordner>` laufen lassen und `logo-messung.md` vergleichen. Die Entscheidung neu/alt mit der Messgrenze dem Nutzer vorlegen.
3. **Zusammenführen (T-20261021-19)**, Hauptchat oder Subagent, in einem Staging-Ordner:
   - `out/` aus -17 als Grundlage.
   - Darüber die 5 Logodateien aus -16 (Hashes in dessen `ERGEBNIS.md`) und die Zeichendateien aus -18.
   - Den README-Text zum Logo aus -16 sowie Patch und README-Text aus -18 einarbeiten.
   - Entscheiden (Nutzer), ob `build.cjs` für `ueberlagerung-logo`/K7kontrolle auf Y umgestellt wird.
   - `build.cjs` zweimal und einmal aus einer Kopie laufen lassen (K9).
   - Alle Kriterien neu prüfen: K1–K9, E, M, Z.
4. **Nutzer fragen**, dann übernehmen:
   - Backup nach CLAUDE.md in `staging/T-20261021-19/backup/`.
   - Zielpfade `royal-spices-v1/assets-src/label/**` und `royal-spices-v1/pipeline/blender/label-assets/**`.
   - T-02, -16, -17, -18 und -19 auf `ÜBERNOMMEN` setzen.
5. **Glas-Sitzung informieren:**
   - `logo-band.png`, `zeichen-oben.png` und `etikett.png` sind die Eingaben für G5/G6.
   - Zeigt `zeichen-oben` das Blattlogo in Draufsicht, liegt es flach oben auf dem Band. Die Perspektive staucht es dann von selbst.
   - Die Glas-Sitzung findet man über `list_sessions` {"linked": true} oder über den Nutzer, nicht per Suche.

## Erfahrungen zum Budget

- Die Harness-Zahl der Subagents liegt deutlich über ihrer eigenen Schätzung (-15: Schätzung ≈ 75k, Harness 138k).
- Die Agenten auf diesem Code lagen bei 138k bis 187k. -17 lag trotz nur 22 Tool-Aufrufen bei 181k. Die Grenze der Tool-Aufrufe allein reicht also nicht. Aufträge kleiner schneiden (z. B. Messen und Nachbessern getrennt) oder Aufgaben im Hauptchat erledigen.
- Darum feste Grenze in jedem Auftrag: höchstens 30 Tool-Aufrufe, spätestens nach dem 25. wird `ERGEBNIS.md` geschrieben, höchstens 2 Bilder, Dateien nur stellenweise lesen.
- Ein Agent, der vom Sitzungslimit unterbrochen wurde, lässt sich mit SendMessage fortsetzen. Vorher seinen Stand prüfen.

## Startprompt für den neuen Chat

> Weiter mit Etikett und Blattlogo (Royal Spices, Arbeitskopie H:, kein git). Lies `H:\royal-spices\CLAUDE.md` und den Kopf von `_agent/LOG.md`. Lies außerdem die LOG-Zeilen T-20261019-02 und T-20261021-15 bis -18, dann `royal-spices-v1/docs/UEBERGABE-ETIKETT.md` ganz.
>
> Prüfe, ob `_agent/staging/T-20261021-17/ERGEBNIS.md` und `-18/ERGEBNIS.md` vorliegen. Fehlt eine Datei, läuft der Agent noch: dem Nutzer sagen und auf die Meldung des Folgechats warten, nicht pollen.
>
> Dann folgen die Schritte 1–5 aus „Nächste Schritte“.
>
> Schreibmenge: `assets-src/label/**`, `pipeline/blender/label-assets/**`, `docs/UEBERGABE-ETIKETT.md`, eigene Staging-Ordner. `pipeline/blender/*.py` und `.raw/tests/glass-ref2/**` gehören der Glas-Sitzung.
>
> Budget: kein Chat und kein Agent über 150k, bei ~120k eine Übergabe schreiben. Subagents bekommen eine feste Grenze von 30 Tool-Aufrufen.
