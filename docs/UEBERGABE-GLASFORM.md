# Übergabe 21.10.2026: Glas-Strang (Glas und Kork nach `ref-glas-1910.webp`)

Teil von `UEBERGABE-PRODUKT.md`: Musskriterien G1–G8, freigegeben 20.10. Etikett und Logo laufen in einer parallelen Sitzung („K3 Weg i und Logo“). Transaktionslog: `../../_agent/LOG.md`. Chatwechsel, weil der Kontext über 240k lag.

## Stand

| ID | Inhalt | Status |
|---|---|---|
| T-20261019-03 / T-20261020-11 | Abgleichkamera und Messwerkzeug | übernommen bzw. abgenommen 20.10.; Werkzeuge in `_agent/staging/T-20261019-03/tools/` |
| T-20261020-12 | Glas und Kork, 1. Versuch | `VERWORFEN` (Budget), Stand floss in -17 |
| **T-20261020-17** | Glasform: Lippe, Schulter, quadratischer Körper, JARCHECK, Maßtabelle, Tafel 1 | `FERTIG`, vom Hauptchat geprüft, **nicht übernommen** |
| **T-20261021-10** | Helles Kantenband an den senkrechten Kanten (G2), auf Basis -17 | **läuft** als Subagent des alten Chats (Start 21.10. vormittags) |
| **T-20261021-11** | Korkmaterial und Korn (G3) | ID im LOG reserviert, noch nicht angelegt |

Prüfung von -17 (21.10.):
- Messung t17c bytegleich reproduziert: s 1,00222, 0 Ausreißer, alle 20 gewerteten Glas- und Korkpunkte ≤ 1 % B.
- `jarcheck.py` selbst laufen lassen:
  - Glas und Kork sind geschlossen, Normalen außen, keine Selbstdurchdringung.
  - Glas × Kork 0, Abstand 0,030 mm.
  - `photo` gleicht dem Backup bis 4,4e−16 BU.
  - Material und Konstanten unverändert, dazu ein eigener Quellvergleich.
- Glashöhe im Modell 78,78 mm = 1,496 B. Maßtabelle und Lippenprofil stehen in `staging/T-20261020-17/ERGEBNIS.md`.

## Entscheidungen des Nutzers

- 20.10.: G1–G8 freigegeben.
- 20.10.: Referenzpunkt x 62 (`schulter_l_44`) ist ein Artefakt und wird nur ausgewiesen. Die Schulter richtet sich nach x 44, x 79 und x 451. In `tools/ref-punkte.json` ab -17 als „nicht im Ausgleich“ markiert.
- 21.10.: **-17, -10 und -11 erst gemeinsam übernehmen**, in einem Schritt. Bis dahin bleibt `royal-spices-v1/pipeline/blender/product_jar.py` beim alten Glas (MD5 `9f33c301…`), damit andere Sitzungen keine halbfertigen Hero-Bilder rendern.
- 21.10.: Den Rest in zwei kleinen Schritten nacheinander: erst das Kantenband (-10), dann der Kork (-11). Beide schreiben `product_jar.py`, deshalb nicht parallel.

## Nächste Schritte

1. **T-20261021-10 prüfen.**
   - Liegt `staging/T-20261021-10/ERGEBNIS.md` noch nicht vor, arbeitet der Subagent vermutlich noch. Das zeigen Zeitstempel in `STAND.md` und `render/` sowie `_agent/gpu.lock`. Dann warten und nicht neu starten. Bei Zweifel den Nutzer fragen.
   - Prüfen gegen E1–E4 im `AUFTRAG.md` dort:
     - Messung des Schlusslaufs mit `tools/messen.cjs … --nur k_l,schulter,hals,lippe,kork` neu rechnen und auf Bytegleichheit prüfen.
     - `kante.cjs` neu laufen lassen.
     - `jarcheck.py` laufen lassen: `"/f/3D/Blender/Blender 4.5/blender.exe" -b --factory-startup --python tools/jarcheck.py -- work/product_jar.py backup/product_jar.py`, ohne GPU.
     - Kantenbild sichten.
   - Bei `ABGEBROCHEN`: VERWORFEN, Folge auf demselben Stand.
2. **T-20261021-11 Kork (G3) anlegen.**
   - Basis: `work/product_jar.py` aus -10, oder aus -17, falls -10 scheitert.
   - Staging wie bei -10 vorbereiten: Werkzeuge aus `staging/T-20261021-10/tools/` kopieren, auf LF prüfen. `lauf.sh` ist ortsunabhängig.
   - Kriterien aus G3, die Silhouette ist schon erfüllt und muss bleiben:
     - Grober Presskork mit hellen, honigfarbenen Körnern und dunklen Fugen.
     - Mittlerer Kornabstand ± 25 % neben der Referenz, per Autokorrelation an einem Korkausschnitt in gleichem Maßstab.
     - Farbe relativ zum Etikettpapier ± 15 % je Kanal, Licht- und Schattenseite getrennt. **Nur zur Information**, bis das neue Etikett (-14) sitzt.
   - Dazu wie bei -10: Form bleibt (alle 20 Punkte ≤ 1 % B), `jarcheck` ok, `photo` identisch, Glasmaterial unverändert.
   - Hebel:
     - `cork_material()` und `CORK_*` dürfen hier ausnahmsweise geändert werden, nur im Zweig `ref1910`.
     - Die Fassung `photo` muss gleich bleiben. Vorschlag: eigene Funktion oder Konstanten nur für `ref1910`. Den F6-Vergleich in `jarcheck.py` dafür anpassen, sodass `photo` gegen das Backup verglichen wird.
   - Hinweise:
     - Sichtbarer Kork liegt zwischen z 78,97 und 90,88 mm, r 19,0–20,5, oben 0,6 mm nach rechts geneigt (`staging/T-20261020-17/ERGEBNIS.md`, Z. 107–112).
     - Referenzfarben: Korklicht `#c78d51`, Korkschatten `#704015`, Papier `#e6d4c1` (`UEBERGABE-PRODUKT.md`, Abschnitt „Messung der Referenz“).
     - Referenz-Kork 1× etwa x 92–435, y 37–145.
   - Subagent mit Ziel ≤ 70k, höchstens 3 Bilder.
3. **Gemeinsame Übernahme, nur mit Go des Nutzers.** Vorher prüfen, ob eine andere Sitzung gerade Hero-Bilder rendert (Flüssig). Ab der Übernahme zeigt die Projekt-Pipeline das neue Glas mit altem Band und Etikett.
   - **Backup:** Projektdatei `product_jar.py` liegt schon in `staging/T-20261020-17/backup/` und `staging/T-20261021-10/backup/`. Bei der Übernahme erneut sichern.
   - **Projektcode:** letzte `work/product_jar.py` → `royal-spices-v1/pipeline/blender/product_jar.py`.
   - **Bilder:** Schlussläufe `t17c_*`, `t2110*_*`, `t2111*_*` → `royal-spices-v1/.raw/tests/glass-ref2/`.
   - **Werkzeuge** (LF) → `_agent/staging/T-20261019-03/tools/`, vorher sichern:
     - `punkte.cjs` und `ref-punkte.json` nur zusammen.
     - `messen.cjs`, `tafel.cjs`, `ab.sh`, `lauf.sh` (ortsunabhängige Fassung).
     - `silhouette.py`, `prognose.py`, `jarcheck.py`, `kante.cjs`.
   - Dateien per MD5 gegen das Staging prüfen. Danach -17, -10 und -11 gemeinsam auf `ÜBERNOMMEN` setzen.
4. **Danach** -13 Band, Logo und Bandzeichen (`product_seal.py`) und -14 Etikett am Glas (`product_label.py`), mit neuen IDs. Beide brauchen die Etikett- und Logo-Ausgaben der parallelen Sitzung (T-20261021-15/-16), vorher deren Stand prüfen. Kriterien G4–G6 sind freigegeben.

## Regeln und Erfahrungen

- **IDs:** Die parallele Sitzung „K3 Weg i und Logo“ nutzt am 21.10. `T-20261021-15/-16`. Am 21.10. griffen beide Sitzungen gleichzeitig nach -10/-11. Vorschlag für die Aufteilung des Produktblocks: Glas-Strang -10 bis -14, Etikett und Logo -15 bis -19. Vor jeder Vergabe `LOG.md` greppen, die Zeile sofort eintragen und erst dann den Staging-Ordner anlegen.
- **Budget:** T-12 brauchte 164k Tokens, T-17 200k (Neuladen beim Fortsetzen nach dem API-Limit). Deshalb:
  - Aufträge klein schneiden.
  - Der Hauptchat bereitet das Staging vor (Arbeitskopie, Werkzeuge).
  - Ziel je Subagent ≤ 70k.
  - Mit `silhouette.py` und `prognose.py` lässt sich die Form ohne Render vorhersagen, auf ≤ 0,05 % B genau.
- **Zeilenenden:** Das Edit-Werkzeug der Subagents schreibt CRLF. Werkzeuge vor der Übernahme auf LF stellen.
- **Werkzeug:** Blender 4.5 unter `F:\3D\Blender\Blender 4.5`, `RS_DEVICE=HIP`.
- **GPU-Sperre:** `_agent/gpu.lock`, `lauf.sh` setzt und entfernt sie.
- **Kamera:** Die Abgleichkamera sieht das Glas um etwa −0,66° gedreht. Daher tx ≈ −2,7 px, der Ausgleich fängt das auf. Kamera nicht ändern.

## Startprompt für den neuen Chat

> Weiter mit dem Glas-Strang (Royal Spices, Arbeitskopie H:, kein git). Lies `H:\royal-spices\CLAUDE.md`, den Kopf von `_agent/LOG.md` (Parallelbetrieb: GPU-Sperre, Schreibmengen, IDs) und `royal-spices-v1/docs/UEBERGABE-GLASFORM.md` ganz. Dazu die LOG-Zeilen T-20261020-17, T-20261021-10 und den Abschnitt „Musskriterien Glas-Transaktion“ in `UEBERGABE-PRODUKT.md`. Reihenfolge: (1) T-20261021-10 prüfen, sobald `ERGEBNIS.md` vorliegt (läuft noch als Subagent des alten Chats; nicht neu starten, solange er arbeitet); (2) T-20261021-11 Kork (G3) als Subagent, Staging vorher selbst vorbereiten; (3) gemeinsame Übernahme von -17, -10 und -11 nur nach Go des Nutzers; (4) danach -13 und -14. Budget: kein Chat und kein Agent über 150k, Subagents Ziel ≤ 70k; bei ~120k Übergabe schreiben.
