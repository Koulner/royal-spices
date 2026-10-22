# Flüssig beim langsamen Scrollen (18.10.2026)

## Neuester Stand (21.10. vormittags): -01/-02 übernommen, Warp-Kanten nach Option (a) im Bau (T-20261021-01/-02)

- **Entscheidungen des Nutzers (21.10.):** T-20261020-01/-02 übernehmen (erledigt, Backups in den Staging-Ordnern, MD5 gleich). Gegen die Warp-Kanten Option (a): MSAA + weiche Gewichte, als A/B-Versuch mit V0–V3. Kriterien K1–K7 und Info I1 sind freigegeben: `_agent/staging/T-20261021-01/KRITERIEN.md`.
- **Vorgabe des Nutzers (21.10., wörtlich):** „es darf kein weg gewählt werden, der die performance der seite reduziert“ und „es muss allerdings flüssig sein“. Beides ist Musskriterium. Messbar gemacht als K6: kein Wert schlechter als der geprüfte Stand von T-20261020-01 (`--f2`, `--fast` warm, `perf`, Transfer), im selben Block an der Konsole abwechselnd gegen V0 gemessen. Dazu K8: GPU-Zeit je Warp-Bild ≤ V0 × 1,10. Damit scheiden (b) und (c) aus. Neu ist V4 (nur weiche Gewichte, ohne MSAA), die Reihenfolge ist V4 → V1 → V2 → V3.
- **Bau (Subagents parallel, Aufträge in den Staging-Ordnern):**
  - -01 baut das Messwerkzeug `tools/qa/flow-edge.mjs` und misst V0. Arbeitskopie `wa`, Port 4391, CDP 9351.
  - -02 baut V1–V3 in `journey-flow.ts` hinter `createRenderer(canvas, { samples, smooth })`, `RENDER_DEFAULTS` und `RENDER_AT_SCREEN`. Arbeitskopie `wb`, Port 4392, CDP 9352.
  - Beide Arbeitskopien liegen im Scratchpad der Sitzung `023c4cfa-…`, als vollständige Kopien (ohne /MT) mit verglichener Dateiliste.
- **Danach (Hauptchat):**
  1. Prüfkopie aus Projekt + -01 + -02 anlegen und V0–V3 mit `flow-edge.mjs` messen. Vorgabe ist die kleinste Variante, die K1–K4 und K7 erfüllt.
  2. K5 prüfen, K6 an der Konsole (`--f2`, gpu.lock, CDP 9336).
  3. Sichtprüfung des Nutzers auf Port 4394.
  4. Übernahme mit Backup, danach diese Datei und STATUS.md nachziehen.

## Stand 21.10. früh: N1–N5 erfüllt, -01/-02 nicht übernommen; neuer Befund „Warp-Kanten in Bewegung“

- **Konsolenläufe** (Protokolle in `_agent/staging/T-20261020-01/pruefung/`):
  - `--fast` erfüllt alle Prüfungen. N1 0, N2 warm erfüllt (P1 bis 4000 px/s d ≤ 2,0), N3 warm mindestens 89 fps und höchstens 30,4 ms.
  - W1, W2 und `perf` ok (TBT 0, LCP 672 ms).
  - `--f2` dreimal gelaufen: je Profil genau ein Intervall von 34,6–37,0 ms, nur am Wendepunkt (Altbefund). Sonst 143 fps (Desktop) und 112 fps (Telefon), 100 % Warp.
  - N1 offline hat der Nutzer mit (a) angenommen (`ENTSCHEIDUNG-N1.md`).
- **Nicht übernommen.** Der Nutzer sah beim Anschauen in Bewegung (21.10.): „alle Ränder kaputt, als wäre Anti-Aliasing auf niedrigster Einstellung“. Im Standbild verschwinden die Kanten.
- **Befund des Hauptchats:** Die Kanten kommen vom Warp bei Abstand 1–2, und den gibt es schon seit T-20261018-07 im Projekt. Im Standbild zeigt der Player echte Renders. Aufnahmen und Vergleiche mit `?flow=off` liegen im Scratchpad der Sitzung `a6c2fb99-…` (`cap2/cmp-428.png`, `zoom-428.png`; Skripte `cap.mjs`, `cap2.mjs`).
  - Im Warp haben die Kanten der Fäden kleine Knicke und Treppen. Im Bild ohne Warp gibt es stattdessen Doppelbilder.
  - Vermutete Anteile:
    1. Der Warp rendert ohne Kantenglättung (`antialias: false`, Render-Targets ohne Multisampling) in Bildauflösung (1440 px). Der Browser skaliert das auf 2560 px. Verdeckungskanten der Dreiecke werden so zu Pixeltreppen, die in Bewegung krabbeln.
    2. Die Gewichte je Dreieck (`vG` aus Tiefenverhältnis und Dehnung) und das grobe Tiefenraster (Zellen von etwa 14 px) knicken die Kanten an den Zellgrenzen.
    3. Möglicher Zusatz durch -01: Bei mittlerem Tempo wechselt der Player Frame für Frame zwischen Warp und ganzem Bild (P1 Flick 4000: 166 Warp / 429 ganze Bilder). Das ist nicht geprüft.
  - F1/N1 messen auf 960 px heruntergerechnet und gemittelt, deshalb sehen sie diese Kanten nicht.
- **Optionen zur Entscheidung (Kriterien vor dem Bau):**
  - (a) Kantenglättung im Warp: MSAA-Render-Targets (WebGL2 `renderbufferStorageMultisample` + `blitFramebuffer`), eventuell in Bildschirmauflösung. Klein. Zuerst als A/B-Versuch in der Prüfkopie, mit einem neuen Kantenmaß in voller Auflösung und Flimmern von Frame zu Frame.
  - (b) Feineres Tiefenraster: Flow-Daten aus `.raw/*-depth` neu erzeugen. Größer, betrifft F3 (Transfer).
  - (c) Kein Warp mehr: ganze Bilder bzw. Überblenden, dann ohne Kanten, aber mit Stufen bzw. Doppelbildern.
- **Offen:** Übernahme von -01/-02 (Fragmente beim schnellen Scrollen sind behoben, die Werkzeuge taugen für den nächsten Schritt) und die Wahl der Option.

**Startprompt für eine neue Sitzung:**
> Royal Spices, Flüssig: Warp-Kanten in Bewegung („wie Anti-Aliasing auf niedrigster Stufe“, verschwinden im Standbild). Lies H:\royal-spices\CLAUDE.md, den Kopf von _agent/LOG.md und in royal-spices-v1/docs/UEBERGABE-FLUESSIG.md den Abschnitt „Neuester Stand (21.10.)“. T-20261020-01 (Player, keine Fragmente) und -02 (Werkzeuge) sind fertig geprüft (N1–N5 erfüllt), aber nicht übernommen. Kläre mit dem Nutzer: Übernahme -01/-02 ja oder nein, und welche Option gegen die Warp-Kanten (a MSAA, b feineres Tiefenraster, c kein Warp). Lege für die gewählte Option zuerst messbare Kriterien vor (Kanten in voller Auflösung, Flimmern in Bewegung), erst nach Freigabe bauen (Subagent nach CLAUDE.md §3, neue ID im Block T-20261021-01…-09). Prüfkopie im Scratchpad ohne robocopy /MT, Dateiliste vergleichen, Port 4394. Bildtakt nur an der Konsole mit gpu.lock und CDP 9336. Kein Übertrag nach dev, kein Push ohne Freigabe. Budget: kein Chat und kein Agent über 150k Tokens.

## Stand 20.10. abends: Fragmentierung, Bau fertig und geprüft bis auf Konsole und Entscheidung (T-20261020-01/-02)

- **Bau:** Er lief in zwei Transaktionen, damit jeder Subagent im Budget bleibt. Beide Subagents lagen trotzdem darüber: A 162k, B 217k laut Harness.
  - **-01 Player** (`journey.ts`, `journey-flow.ts`, Tests): Neue reine Funktionen `MAX_SPAN = 2`, `stridesFor`, `limitsFor`, `pairAllowed`, `chooseFrames`. Gewarpt oder überblendet wird nur, wenn die beiden Bilder höchstens 2 Positionen auseinanderliegen. Sonst zeigt der Player ganze Bilder, höchstens 4 Positionen neben der Kamera (E1 a). Ein ganzes Bild liegt nie mehr als 0,5 Positionen hinter dem vorigen, entgegen der Fahrtrichtung. Passt nichts, bleibt das Bild stehen. `flow.draw` verweigert Abstände über 2 selbst und meldet zurück, ob es gewarpt hat. `medium` nutzt die Abstände [2, 4, 8] (E2 a). `low` bleibt unverändert. Diagnose-Attribut am Film: `data-journey-frame = "<pos> <a> <b> <warp|fade|whole>"`, gesetzt nur bei Änderung.
  - **-02 Werkzeuge:** `flow-gl.mjs --fast [P1,P2,P2m] [--no-timing] [--out f.json] [--cdp p]` misst N1–N3 (etwa 20 min). `flow-check.mjs --stride s --t …` misst die Splitter.
- **Ergebnisse** liegen im Staging von -01 und -02, jeweils mit `ERGEBNIS.md` und `diff.patch`. Die Prüfprotokolle stehen in `_agent/staging/T-20261020-01/pruefung/`.
- **Prüfkopie:** `scratchpad\pk` der Sitzung `a6c2fb99-…`, das ist Projekt + -01 + -02. Server auf 4394. Die Dateiliste ist geprüft gleich dem Projekt. Achtung: `robocopy /MT` hatte bei den Arbeitskopien still 1642 Dateien ausgelassen, deshalb ohne `/MT` kopieren und die Dateiliste vergleichen.
- **Geprüft:**
  - `npm test` 191/191, `astro check` 0 Fehler, Build ok.
  - Per RDP mit `no-rm-preload.mjs`: K2, K3, K5 `--load`, W7, K7 72/72 alle ok.
  - `--fast --no-timing`: N1 hält. In allen 24 Fahrten gibt es 0 Frames mit Abstand über 2, auch kalt, und 0 Rücksprünge. Gegenprobe: Der alte Player hatte 2986 solche Frames.
  - N2 auf P1 bei Flicks bis 4000 px/s per RDP (30 Hz) verfehlt, d bis 4,0. Muss bei 144 Hz an der Konsole gemessen werden. Reicht es dort nicht, kann `high` höchstens auf Abstand 4 dekodieren (Vorschlag A).
- **Offen:**
  1. **Konsolenläufe** mit `_agent/staging/T-20261020-01/console-runs.sh`: `--fast` (N1–N3), `--f2` (K4/N4), W1, W2, `perf`. Das Skript wartet auf `>console` und setzt `gpu.lock`.
  2. **Entscheidung N1 offline:** Siehe `_agent/staging/T-20261020-01/ENTSCHEIDUNG-N1.md`. Quer liegen 11 Positionen über 0,02 %, hoch die ganze Haltestelle 188–215 (dünne Naht an der Narbe). Alles betrifft Abstand 2 und war schon vor dem Umbau so. t 0,25/0,75 und Abstand 1 sind ohne Referenz nicht messbar. Empfehlung: (a) annehmen.
  3. Nach Freigabe: Übernahme -01 + -02 mit Backup, LOG, STATUS. Kein `dev`/Push ohne Freigabe.
- **Hinweise aus A:** Kalt bleiben die Poster stehen, bis ein Bild höchstens 4 Positionen neben der Kamera fertig ist. `medium` lädt doppelt so viele Bilder (Desktop 357 statt 179), das Speicherbudget von 48 MB bleibt.

**Startprompt für eine neue Sitzung:**
> Royal Spices, Flüssig: Fragmentierung beim schnellen Scrollen, T-20261020-01 (Player) und -02 (Werkzeuge) sind gebaut und bis auf die Konsolenläufe geprüft. Lies H:\royal-spices\CLAUDE.md, den Kopf von _agent/LOG.md und in royal-spices-v1/docs/UEBERGABE-FLUESSIG.md den Abschnitt „Neuester Stand (20.10. abends)“. Prüfe die Protokolle in _agent/staging/T-20261020-01/pruefung/ (Konsolenläufe über console-runs.sh: fast, f2, w1-hz30, w2-native-slow25, perf; fehlen sie, die Prüfkopie neu anlegen: Projekt ohne /MT kopieren, Dateiliste vergleichen, -01 und -02 aus dem Staging einspielen, bauen, Server PORT=4394, Skript-Pfad PK anpassen). Bildtakt nur an der Konsole (`query session` beginnt mit `>console`), gpu.lock setzen und löschen, CDP 9336 nacheinander. Die Entscheidung zu N1 offline (ENTSCHEIDUNG-N1.md) liegt beim Nutzer. Übernahme ins Projekt nur nach Freigabe, mit Backup und Statuspflege im LOG; kein Übertrag nach dev und kein Push ohne ausdrückliche Freigabe. Danach UEBERGABE-FLUESSIG.md und STATUS.md nachziehen. Budget: kein Chat und kein Agent über 150k Tokens.

## Stand 20.10.: Fragmentierung beim schnellen Scrollen, Kriterien freigegeben (T-20261020-01)

Auftrag des Nutzers (20.10.): „die animation ist jetz super flüssig, allerdings gibt es fragmentierungen, wenn man schnell durchscrolled, das darf nicht passieren“. Befund, Messwerte, Kriterien N1–N5 und Entscheidungen: `_agent/staging/T-20261020-01/KRITERIEN.md`, am 20.10. vom Nutzer freigegeben. Messwerkzeuge der Analyse liegen in `messung/` daneben.

- **Ursache, vom Nutzer anhand von `bild-kante-100.png` bestätigt („genau das“):** Beim schnellen Scrollen wählt `journey.ts` die Stufen 2/3, also Bildabstand 4/8, und `journey-flow.ts` warpt ohne Abstandsgrenze. Das Tiefenraster 1/12 erzeugt dann Treppen und Splitter an Tiefenkanten. Splitter sind Pixel mit Fehler über 48/255, ihr Anteil liegt bei Abstand 2/4/8 bei höchstens 0,01 / 0,06 / 0,42 %. Am Telefon (P2) springt das Bild außerdem in 12–25 % der Frames auf ein ungewarptes Nachbarbild, bis zu 22 Positionen weit und auch rückwärts. Die Stufe `medium` warpt nur über 4/8.
- **Freigegeben:** N1 (kein Warp über einen Abstand größer als 2, Splitter ≤ 0,02 % im erlaubten Bereich), N2 (warm höchstens 4 Positionen neben der Kamera, P1 bis 4000 px/s höchstens 2, keine Rücksprünge), N3 (≥ 55 fps, ≤ 33,4 ms bei schnellen Fahrten), N4 (kein Rückschritt, K4 bei 300 px/s ≥ 95 % Warp), N5 (`flow-gl.mjs --fast`, Splittermessung in `flow-check.mjs`). **E1 (a):** Ist die Kamera für saubere Zwischenbilder zu schnell, zeigt der Player ganze Bilder (das nächste fertige Bild, ohne Warp und ohne Überblenden). **E2 (a):** `medium` lädt auch Abstand 2 und warpt wie `high`. **E3:** P3/P4 misst der Nutzer vor dem Übertrag nach `dev`.
- **Stand:** Projektcode unverändert, T-20261020-01 `OFFEN` (Bau nicht begonnen). Server 4394 gestoppt, `gpu.lock` nicht gesetzt.
- **Hinweise für den Bau:**
  - Die Analyse-Prüfkopie (`scratchpad\pk` der Sitzung `cda9ae11-…`) enthält Protokoll-Haken (`window.__jlog`, `__jcap`). Für die Abnahme taugt sie nicht, deshalb neu anlegen.
  - Auf H: lassen sich keine Junctions anlegen („lokale NTFS-Volumes erforderlich“). Prüfkopie deshalb im Scratchpad auf C: mit Junction auf `H:\royal-spices\royal-spices-v1\node_modules`, Server mit `PORT=4394`. Nach jedem Neubau den Server neu starten, sonst liefert er die alte Seite.
  - `.raw/desktop-fine-1440` enthält nur 364 Bilder, gerade Zwischenpositionen fehlen teils. N1 offline deshalb dort messen, wo Quellen liegen, und die Abdeckung nennen.
  - Ein Diagnose-Attribut wie `data-journey-flow` ist in Ordnung, gesetzt nur bei Änderung. Globale Testhaken im Produktionscode sind es nicht.

**Startprompt für die neue Sitzung:**
> Royal Spices, Flüssig: Fragmentierung beim schnellen Scrollen beheben, Transaktion T-20261020-01 (ID-Block -01 bis -09; Kriterien freigegeben). Lies H:\royal-spices\CLAUDE.md, den Kopf von _agent/LOG.md (Parallelbetrieb: GPU-Sperre, Prüfkopie, Ports, HomeJourney.astro gehört T-20261018-12), dann _agent/staging/T-20261020-01/KRITERIEN.md (N1–N5, E1 a, E2 a) und in royal-spices-v1/docs/UEBERGABE-FLUESSIG.md den Abschnitt „Neuester Stand (20.10.)“. Baue per Subagent nach der Vorlage in CLAUDE.md §3: Er schreibt nur nach _agent/staging/T-20261020-01/ (Projektpfade), Schreibmenge laut KRITERIEN.md, nicht HomeJourney.astro (wird sie gebraucht: melden und warten), flow-warp.mjs bleibt die Referenz. Danach im Hauptchat gegen N1–N5 prüfen, in einer frischen Prüfkopie im Scratchpad (Port 4394). Bildtakt (--f2, --fast) nur lokal an der Konsole (`query session` beginnt mit `>console`), nacheinander, CDP 9336, vorher _agent/gpu.lock setzen und danach löschen. Übernahme ins Projekt nur nach meiner Freigabe, mit Backup und Statuspflege im LOG; kein Übertrag nach dev und kein Push ohne meine ausdrückliche Freigabe. Danach UEBERGABE-FLUESSIG.md und STATUS.md nachziehen. Budget: kein Chat und kein Agent über 150k Tokens; bei etwa 120k Übergabe in UEBERGABE-FLUESSIG.md mit Startprompt schreiben und eine neue Sitzung fortsetzen lassen. Subagents antworten mit höchstens 300 Wörtern.

## Stand 19.10. abends: R7 relativ zum Grundtakt (T-20261019-04) übernommen

Kriterien W1–W7 und Entscheidungen E1 (a), E2, E3 (a): `_agent/staging/T-20261019-04/KRITERIEN.md`. Ergebnis und Protokolle: `_agent/staging/T-20261019-04/ERGEBNIS.md` und `*.log` daneben.

- **Grundtakt G** (`createBase` in `journey-flow.ts`): Mit dem ersten `load()` startet einmalig eine eigene rAF-Kurzmessung, also nach der ersten Ladestufe und bevor der Warp zeichnet. Sie sammelt 30 gültige Intervalle (`BASE_SAMPLES`) und endet dann von selbst. Nicht gezählt werden das Intervall mit einem Warp-Bild und das nächste (`rate.warped()` nach jedem gezeichneten Warp) sowie Lücken über 250 ms (`GAP_MS`). G ist das 25. Perzentil: Last verlängert Intervalle, verkürzt sie aber nie.
- **Grenze** `slowLimit(g)` (reine Funktion): für g > 16,7 ms (`BASE_REF_MS`) 22 · g / 16,7, sonst 22 ms, ohne G 22 ms. 30 Hz: 43,9 ms, 60 Hz und schneller: 22 ms wie bisher. Der Faktor ist genau 22 / 16,7 statt 1,32 (Freigabe des Nutzers), sonst läge G = 16,7 bei 22,04 ms. `createWatch(limit)` nimmt eine Zahl oder eine Funktion, `createFlow` übergibt `() => slowLimit(rate.value)`. Fenster 2 s, Neubeginn nach einer Pause und „aus bis zum Neuladen“ bleiben. Ein Taktwechsel während des Besuchs wird nicht nachgemessen (E3 a); schlimmstenfalls gilt das alte Verhalten.
- **Werkzeug `flow-gl.mjs`:**
  - `--f2 --hz30` (W1): 30-Hz-Gerät als Fahrplan. Jedes 30-Hz-Bild hat eine Sollzeit, die Rückrufe laufen am ersten echten Takt höchstens 8,3 ms vor der Sollzeit, mit dessen Zeitstempel. Abweichungen der echten Takte addieren sich nicht, Last zeigt sich weiter als längeres Intervall. Je Lauf gibt es die echten Taktabstände als Diagnose aus. Die erste Fassung („erster Takt ≥ 33,3 ms minus halbe Taktbreite“) feuerte unter CPU 4× schon nach 31,3 ms und meldete doppelte Takte; beides ist behoben.
  - `--f2 P1 --slow-warp <ms>` (W2): so viel CPU-Last je Warp-Bild, nur im Mischpass (`drawArrays`), das Überblenden bleibt unbelastet.
  - `--idle` (W7): zählt rAF-Aufrufe in Ruhe. `--f2` zeichnet jetzt auch den Aufwärmlauf auf, die Basis-URL wird nur noch per `http(s)://` erkannt.
- **Messwerte** (RX 9070, lokal an der Konsole, Produktionsbuild der Prüfkopie, mit `no-rm-preload.mjs`): W1 P1/P2 ohne Warp je 33,3 ms, Warp 99,8 % / 99,7 % des ganzen Durchgangs, mit Warp 33,3 ms. W2 mit Last: 30 Hz schlägt R7 nach 2,03 s Warp-Zeit an (Mittel 54,9 ms), nativ nach 2,73 s (32,2 ms), danach 0 Bilder im Warp. W6 (`--f2` nativ): P1 etwa 144 fps, P2 etwa 112 fps, je 100 % Warp. Der Höchstwert liegt am Wendepunkt bei 34,7–34,9 ms (5 Takte bei 144 Hz), auch mit `?flow=off`. Die Gegenprobe gegen den Projektstand ohne -04 (zweite Prüfkopie, `console-runs-w6b.sh`, Läufe `w6b-3` bis `w6b-5`) zeigt dasselbe, dazu Einzelspitzen abseits der Wende (273 ms ohne -04). Altbefund wie in -07 (Zeile „Wendepunkt“ unten), am 19.10. vom Nutzer angenommen. W7: 0 rAF in 2 s nach der Ruhe, `perf.mjs` mobil TBT 0 ms, LCP 684 ms, CLS 0,0002. `npm test` 177/177.
- **Konsolenpflicht:** Bildtakt (`--f2`, auch mit `--hz30` und `--slow-warp`) nur lokal an der Konsole messen. Vorher `query session`, die Zeile muss mit `>console` beginnen. Per Remotedesktop sind es 30 Hz und keine Animationen. Läufe nacheinander, nie parallel (fester CDP-Port 9336). Vorlage, die auf die Konsole wartet: `_agent/staging/T-20261019-04/console-runs.sh`.
- Am 19.10. abends mit Freigabe des Nutzers ins Projekt übernommen, Backup in `_agent/staging/T-20261019-04/backup/`. Noch nicht in `dev`, kein Push. Weiter wie bisher: P3 (Laptop) und P4 (Android) durch den Nutzer, dann Übertrag nach `dev`.

## Stand 19.10. nachmittags: Teil 2 (-07) übernommen, K4 erfüllt

- **K4 erfüllt**, gemessen lokal an der Konsole (nicht per RDP, rAF 7 ms, Animationseffekte an, ohne Preload). Mit `flow-gl.mjs --f2` gingen alle Prüfungen auf `ok`. P1 desktop: Warp 143,8 fps, max. 27,8 ms, 100 % im Warp. P2 Telefon, CPU 4×: Warp 114,0 fps, max. 27,8 ms, 100 % im Warp. Protokoll `_agent/staging/T-20261018-07/k4-f2.log`.
- **Werkzeugkorrektur `flow-gl.mjs` (Freigabe des Nutzers):** Eine synthetische Touch-Geste scrollt im kopflosen Edge nicht. Der erste Lauf hat deshalb für P2 nichts gemessen (Warp 0 %, Seite stand still). P2 scrollt jetzt per Maus-Geste bei weiter aktiver Touch-Emulation. `--f2` schlägt fehl, wenn die Seite nicht durch die Reise scrollt, und nennt den Ort des langsamsten Intervalls.
- **Wendepunkt:** Die einzige Spitze über 33,4 ms (je einmal etwa 34,7 ms, mal mit Warp, mal mit `?flow=off`) liegt am Wendepunkt zwischen den beiden Gesten, wo die Seite stillsteht. Das ist ein Effekt des Messablaufs. Meldet `--f2` dort „the dissolve alone misses F2“, ist diese Stelle gemeint.
- **R7 (30-Hz-Geräte), entschieden, erledigt durch T-20261019-04 (siehe oben):** -07 bleibt bei der festen Grenze von 22 ms. Eine Grenze relativ zum Takt, den das Gerät ohne Warp erreicht, kommt als eigene Folge-Transaktion.
- `npm test` 172/172. K1–K3, K5–K7 wie unten. Am 19.10. nachmittags mit Freigabe des Nutzers ins Projekt übernommen, Backup in `_agent/staging/T-20261018-07/backup/`. Noch nicht in `dev`, kein Push. Vorher misst der Nutzer P3 (Laptop) und P4 (Android), Befehle im Abschnitt darunter. Im Projekt läuft der Server ohne `PORT` auf 4322. -12 (Shopify B2) kann starten.

## Stand 19.10. mittags: Teil 2 (-07) geprüft bis auf K4, F2-Messung braucht die Konsole

- Neue Prüfkopie, Build grün (`astro check` 0/0/0), `npm test` 172/172, Produktionsserver (`server.mjs`). Nichts übernommen, Code im Staging unverändert seit dem Bau.
- **K2 erfüllt:** An 5 Ruhestellen je Variante (desktop 1707 × 960 @ 1,5, Telefon 390 × 844 @ 3) sind die Bildschirmfotos mit und ohne `?flow=off` pixelgleich. Unterwegs war der Warp aktiv. t = 0 zeigt A mit 0/255 Abweichung (gemessen in K1).
- **K5 erfüllt:** `perf.mjs` mobil auf `/`: TBT 0 ms, LCP 704 ms, CLS 0,0002, keine Konsolenfehler. `--load`: Die erste Flow-Anfrage kommt nach der ersten Ladestufe (quer bei 229 ms, Stufe fertig bei 111 ms; hoch 114 bzw. 70 ms). Transfer quer 1.098.239 B (8,4 % von `d-960`, F3 8,8 %), hoch 972.113 B (11,9 %, F3 12,3 %).
- **K7 erfüllt:** `journey.mjs` besteht alle 72 Prüfungen. Die MD5 aller geschützten Dateien gleichen `md5-vorher.txt`, im Projekt wie in der Prüfkopie. Auch `journey.ts` im Projekt ist noch auf dem Stand vor dem Bau.
- **K4 hier nicht gültig messbar:** Der PC lief in einer Remotedesktop-Sitzung (`rdp-tcp#0`). RDP schaltet die Windows-Animationseffekte ab und begrenzt die Bildwiederholung auf 30 Hz.
  - Folge 1: Das kopflose Edge meldet `prefers-reduced-motion: reduce`, die Startseite zeigt den statischen Hero. Der erste `--rest`-Lauf scheiterte deshalb mit leerem „states seen“. Behelf für K2, K5 und K7: der Node-Preload `_agent/staging/T-20261018-07/no-rm-preload.mjs` (`node --import <file-URL> tools/qa/…`). Er gibt Edge `--force-prefers-no-reduced-motion` mit, die Projektdateien bleiben unverändert.
  - Folge 2: Der rAF-Takt liegt fest bei 33 ms. P1 mit Warp: 30,5 fps, max. 33,8 ms, Warp 0 %. Der Wächter R7 schlägt nach 2 s an, weil 33 ms über 22 ms liegen. Mit `?flow=off` ebenso 30,5 fps. Das ist kein Altbefund des Players, sondern die Sitzung. Der Lauf wurde nach P1 abgebrochen, Protokoll `k4-f2-rdp.log`.
- **Zur Entscheidung (R7, E4):** Wo der Browser auf 30 Hz begrenzt (RDP, Chrome-Energiesparmodus im Akkubetrieb, Energiesparmodi mancher Telefone), schaltet der Wächter den Warp nach 2 s bis zum Neuladen ab. Dabei läuft das Überblenden dort auch nicht schneller. Das entspricht der Spezifikation, ist aber vermutlich nicht gewollt. Möglich wäre eine Grenze relativ zum Takt, den das Gerät ohne Warp erreicht, statt fest 22 ms. Nicht geändert.

**K4 nachholen (P1, P2):** lokal am PC angemeldet oder per Parsec (nicht per RDP), Animationseffekte an, keine Blender-Queue auf der GPU. In der Prüfkopie (oder nach der Übernahme im Projekt) etwa 10 min:

```
npm run build
node server.mjs                                         # Terminal 1, Port 4322
node tools/qa/flow-gl.mjs http://127.0.0.1:4322 --f2    # Terminal 2
```

Bestanden, wenn je Profil „F2 with warp … ≥ 55, max … ≤ 33.4“ und „≥ 95 % of the moving frames warped“ mit `ok` erscheinen. Steht „the dissolve alone misses F2“ da, ist das ein Altbefund: berichten und nachfragen.

**P3 Laptop (E2, vor dem Push):** dasselbe am Laptop mit `--f2 P1` (das Profil 1707 × 960 @ 1,5 entspricht seinem Bildschirm). Netzteil an, Windows-Energiesparmodus aus, lokal angemeldet, Animationseffekte an.

**P4 Android-Telefon (E2, DevTools-Trace):** Telefon per USB, USB-Debugging an. Am PC `node server.mjs` starten, dann `edge://inspect` öffnen, unter „Port forwarding“ 4322 → `localhost:4322` eintragen und am Telefon in Chrome `http://localhost:4322/` aufrufen. Unter „Inspect“ → Performance eine Aufnahme starten, langsam die ganze Fahrt hinunter und wieder hinauf scrollen, Aufnahme stoppen. Grenzen: im Mittel ≥ 55 fps, kein Frame über 33,4 ms. Dass der Warp läuft, zeigt während des Scrollens in der Konsole `document.querySelector('[data-journey-flow]').dataset.journeyFlow` (`warp`).

Alle Protokolle liegen in `_agent/staging/T-20261018-07/` (`k1-g1.log`, `k2-rest.log`, `k3-fallback.log`, `k4-f2-rdp.log`, `k5-load.log`, `k5-perf.log`, `k7-journey.log`).

## Stand 19.10. früh: Bau Teil 2 (-07) zur Hälfte geprüft, Chatwechsel wegen Budget

- Gebaut im Staging `_agent/staging/T-20261018-07/` (Projektpfade): `journey-flow.ts` (neu), `journey.ts` (geändert), `tests/journey-flow.test.mjs` (9 Tests), `tools/qa/flow-gl.mjs`. `HomeJourney.astro` blieb unverändert (E1). Projektcode unverändert, nichts übernommen.
- **Erfüllt:** K6 (`npm test` 172/172, `astro check` 0/0/0, Build grün), K1 (Mittel max. 0,106/255, p99 1/255, beide Varianten, RX 9070), K3 (R1–R6 grün).
- **Offen:** K2 (`--rest`), K4 (`--f2`), K5 (`perf.mjs` + `--load`), K7 (`journey.mjs`, MD5 gegen `staging/T-20261018-07/md5-vorher.txt`), Doku im Staging, ERGEBNIS.md auf FERTIG, Freigabe, Übernahme.
- Einzelheiten und Messwerte: `_agent/staging/T-20261018-07/ERGEBNIS.md` (Zwischenstand).

**Startprompt für den neuen Chat:**
> Royal Spices, flüssiges Scrollen (B1), Teil 2 (T-20261018-07, Player) fertig prüfen. Lies H:\royal-spices\CLAUDE.md, dann `_agent/staging/T-20261018-07/ERGEBNIS.md` (Zwischenstand) und in royal-spices-v1/docs/UEBERGABE-FLUESSIG.md den Abschnitt „Entwurf Teil 2 „Player““ (K1–K7). Der Code ist gebaut, K1, K3 und K6 sind erfüllt. Prüfkopie im Scratchpad neu anlegen (robocopy ohne node_modules/.raw/dist, Junction auf node_modules, Staging darüber kopieren), Build, Produktionsserver mit eigenem PORT. Dann K2 (`flow-gl.mjs --rest`), K4 (`--f2`, im Hintergrund), K5 (`perf.mjs` und `--load`) und K7 (`journey.mjs`, MD5) prüfen, Doku im Staging nachziehen, ERGEBNIS.md auf FERTIG. Ins Projekt erst nach meiner Freigabe, Push nur nach Rückfrage. Muss HomeJourney.astro geändert werden: anhalten und fragen. Harte Grenze: höchstens 150k Tokens je Chat, ab ca. 120k Übergabe schreiben.

## Entwurf Teil 2 „Player“ (T-20261018-07, 19.10.), freigegeben 19.10. mit E1–E4 wie empfohlen

Grundlage: F1–F4 (freigegeben 18.10.), Verfahren `_agent/staging/T-20261018-08/FORMAT.md`, CPU-Referenz `tools/qa/flow-warp.mjs`. Diese Sitzung läuft auf dem PC mit Ryzen 7 5700X und RX 9070, nicht auf dem Laptop aus F2.

**Umfang**
- **U1 Warp im Player:** Ein neues Modul `src/scripts/journey-flow.ts` übernimmt Zielkamera, Uniforms, das Laden der Tiefe und WebGL2 mit beiden Pässen nach `FORMAT.md`. `journey.ts` ruft es in `draw()` auf. Die Quellen sind die beiden Bilder, die `around(position, level)` heute schon wählt, beim schnellen Scrollen also auch die gröberen Stufen. Die Zielkamera ist die Kamera der feinen Position, dazwischen wird interpoliert (Entscheidung 19.10.).
- **U2 Darstellung:** Eine WebGL-Leinwand liegt über den beiden 2D-Ebenen. Sie entsteht per `cloneNode` aus der vorhandenen Ebene und hat damit dieselbe Klasse, dasselbe `object-fit` und denselben Fokuspunkt. Sichtbar ist sie nur, solange sich die Kamera bewegt. In Ruhe zeigt wie heute die 2D-Ebene das ganze Bild, darüber das Ruheset. Ruhebild und Ruheset bleiben dadurch unverändert (F4).
- **U3 Daten:** Geladen werden `${base}/flow/<variant>.json` und die Blätter zur Variante des Bewegungssatzes, auch beim Rückgriff von hoch auf quer. Die Anfrage startet erst nach der ersten Ladestufe der Bilder (Abstand 16 · fine), mit niedriger Priorität, die Blätter um die Kamera zuerst. Manifest und `build-hero.mjs` bleiben unverändert.
- **U4 Schalter:** `?flow=off` erzwingt das Überblenden, für Vergleichsmessungen und die Fehlersuche.
- **Nicht im Umfang:** Fehlen die Nachbarbilder noch, wird das nächste dekodierte Bild ungewarpt gezeigt, wie heute. Brechung im Glas und Lichtstreifen bleiben bekannte Grenzen aus F1.

**Rückfall auf Überblenden (F4).** Überblendet wird wie heute, ohne Fehlermeldung und ohne leeres Bild, in diesen Fällen:
- **R1:** Es gibt kein WebGL2, oder Shader, Programm oder FBO entstehen nicht. Das wird einmal beim Start geprüft.
- **R2:** `flow/<variant>.json` fehlt oder ist fehlerhaft. Dann gilt das bis zum Neuladen.
- **R3:** Für das aktuelle Paar ist ein Blatt noch nicht geladen, oder ein Eintrag in `cams` fehlt. Das gilt nur für dieses Paar.
- **R4:** Der Kontext geht verloren (`webglcontextlost`). Die 2D-Ebenen übernehmen im selben Bild.
- **R5:** Stufe `low` (≤ 2 GB oder ≤ 2 Kerne): kein Warp und keine Flow-Daten (E3).
- **R6:** Bei Save-Data bleibt es wie heute beim statischen Hero, ohne Flow-Anfrage.
- **R7 Wächter (E4):** Liegt beim Warpen das mittlere Bildintervall 2 s lang über 22 ms (unter 45 fps), schaltet der Player bis zum Neuladen auf Überblenden.

**Musskriterien**
- **K1 GPU gleich Referenz:** `tools/qa/flow-gl.mjs --g1` läuft am Entwicklungsserver und importiert dort das Modul direkt, ohne Testhaken in der Produktion. Geprüft werden je Variante 12 Paare:
  - 8 benachbarte Paare (Stufe 0): Narbe-Haltestrecke, Glas, schnelle Strecke und 261 bzw. 185, je bei t = 0,25, 0,5 und 0,75;
  - 4 Paare mit Abstand 8 (schnelle Stufe).
  - Das GPU-Ergebnis (`readPixels`) wird mit `flowFrame` aus `flow-warp.mjs` verglichen, gerechnet mit denselben im Browser dekodierten Bildern. So fließt WebP nicht in den Fehler ein.
  - Grenze je Kanal: Mittel ≤ 1/255, p99 ≤ 4/255. Der Renderer steht im Ergebnis.
- **K2 Ruhebild:** An 5 Ruhestellen je Variante sind die Bildschirmfotos mit und ohne `?flow=off` pixelgleich. Bei t = 0 zeigt die WebGL-Leinwand Bild A mit einer Abweichung von höchstens 1/255, damit der Wechsel in die Ruhe nicht springt.
- **K3 Rückfall:** `flow-gl.mjs --fallback` spielt durch:
  - R1, einmal als fehlendes `webgl2` und einmal als Shaderfehler (`COMPILE_STATUS` false);
  - R2 (`flow/` blockiert), R3 (ein Blatt blockiert), R4 (`loseContext` mitten im Scrollen), R5 und R6.
  - In jedem Fall gilt: keine Ausnahme, keine Konsolenfehler außer der blockierten Anfrage, und das Bild ändert sich zwischen den Stopps. Nach R4 ist das nächste Bild nicht leer. Bei R1, R2, R5 und R6 gibt es keine Anfrage an die Blätter, bei R1, R5 und R6 auch keine an `flow/`.
- **K4 F2-Messung:** `flow-gl.mjs --f2` läuft am Produktionsbuild, headless mit echter GPU. SwiftShader zählt nicht. Gemessen wird nach einem Aufwärmdurchlauf, einmal die ganze Fahrt hinunter und wieder hinauf, mit einer Scrollgeste bei 300 px/s. Dabei werden die rAF-Intervalle aufgezeichnet.
  - P1 Desktop hier: 1707 × 960, DPR 1,5 (Satz `d-1440m`), Maus.
  - P2 Telefon-Ersatz hier: 390 × 844, DPR 3, Touch, CPU 4× gedrosselt. Die GPU lässt sich nicht drosseln.
  - P3 Laptop (Ryzen 5 6600HS) und P4 Android-Telefon misst der Nutzer mit demselben Skript bzw. per DevTools-Trace (E2).
  - Grenzen: im Mittel ≥ 55 fps, kein Intervall über 33,4 ms (bei 60 Hz also höchstens ein verpasster Bildwechsel am Stück). Mindestens 95 % der gezeichneten Bilder müssen im Warp-Modus entstehen, sonst wäre das Falsche gemessen.
  - Zum Vergleich läuft derselbe Durchgang mit `?flow=off`. Verfehlt schon das Überblenden F2, ist das ein Altbefund: Dann folgen Bericht und Rückfrage, kein stilles Nachbessern.
- **K5 Laden:** `perf.mjs` auf `/`: TBT im mobilen Profil bleibt 0 ms, LCP und CLS bleiben in den S9-Grenzen. Im Netzwerkprotokoll kommt die erste Flow-Anfrage erst nach der ersten Ladestufe der Bilder. Der Flow-Transfer je Variante ist höchstens so groß wie unter F3 gemessen (8,8 % bzw. 12,3 % des Bewegungssatzes).
- **K6 Tests:** `tests/journey-flow.test.mjs` enthält mindestens 8 Tests:
  - Zielkamera: auf der feinen Position exakt, in der Mitte gleich `interpCam`, Vorzeichen der Quaternion;
  - Uniforms M, tv und K gegen `project(unproject())` der Referenz, höchstens 1e-6 px an 100 Zufallspunkten;
  - Blattadressierung und Dekodierung gegen die echten Dateien in `public/hero/5/flow/` (Positionen 0, 63, 64 und die letzte);
  - Konstanten gleich denen in `flow-warp.mjs`;
  - Moduswahl R1–R5 als reine Funktion.
  - `npm test` ergibt 163 plus die neuen Tests, alle grün. `astro check` 0/0/0, `npm run build` grün.
- **K7 Kein Rückschritt:** `tools/qa/journey.mjs` besteht unverändert alle Prüfungen, mit aktivem Warp. Per MD5 unverändert bleiben `HomeJourney.astro` (E1), `hero-manifest.json`, `build-hero.mjs`, `public/hero/5/**`, `flow-warp.mjs`, `flow-check.mjs`, `journey.mjs` und `perf.mjs`.

**Schreibmenge (ersetzt die Spalte im Log):** `src/scripts/journey.ts`, `src/scripts/journey-flow.ts` (neu), `tests/journey-flow.test.mjs` (neu), `tools/qa/flow-gl.mjs` (neu), `docs/{ASSETS,STATUS,UEBERGABE-FLUESSIG}.md`. Gegenüber dem Log fallen `HomeJourney.astro` (E1) und `build-hero.mjs` weg; das Manifest bleibt unverändert.

**Ablauf:** Gebaut wird in einem neuen Chat, weil dieser am Budget ist. Gearbeitet wird im Staging `_agent/staging/T-20261018-07/` mit Projektpfaden. Build und Prüfskripte laufen in einer Prüfkopie im Scratchpad mit Junction auf `node_modules`, wie bei Shopify. Übernommen wird erst nach Prüfung gegen K1–K7 und nach Freigabe. Der Übertrag von -06, -08 und -07 nach `dev` folgt nur nach Rückfrage.

**Entscheidungen (19.10. vom Nutzer wie empfohlen freigegeben)**
- **E1:** `HomeJourney.astro` fällt aus der Schreibmenge, damit -12 (Shopify B2) sofort starten kann. Empfehlung: ja. Muss die Datei beim Bauen doch geändert werden: anhalten und fragen.
- **E2:** Die F2-Geräte. Empfehlung: Abnahme mit P1 und P2 hier. P3 und P4 misst der Nutzer vor dem Push, den Befehl liefert -07. Alternative: P3 und P4 sind Pflicht vor der Übernahme.
- **E3:** Stufe `low` ohne Warp. Empfehlung: ja, denn das sind schwache Geräte, und es spart etwa 1 MB.
- **E4:** Wächter R7. Empfehlung: ja.

**Startprompt für den Bau (nach Freigabe):**
> Royal Spices, flüssiges Scrollen (B1), Teil 2 bauen (T-20261018-07, Player). Lies H:\royal-spices\CLAUDE.md, dann in royal-spices-v1/docs/UEBERGABE-FLUESSIG.md den Abschnitt „Entwurf Teil 2 „Player““ (freigegeben, Entscheidungen E1–E4 siehe dort), dazu _agent/staging/T-20261018-08/FORMAT.md und die letzten Zeilen von _agent/LOG.md. Die Schreibmenge von -07 ist im Log schon nachgezogen. Im Staging bauen und gegen K1–K7 prüfen. Ins Projekt erst nach meiner Freigabe übernehmen, Push nur nach Rückfrage. Harte Grenze: höchstens 150k Tokens je Chat und Subagent, ab ca. 120k Übergabe schreiben.

## Neuester Stand (19.10. nachts): Teil 1 übernommen, als Nächstes Teil 2 (-07)

- **Glas-Commit erledigt (T-20261019-01):** `2f55884` Glas und `b44cb1b` Shopify-Fixes, gepusht, `origin/dev` = `b44cb1b`, Pages-Deploy erfolgreich (Lauf 39182125942).
- **T-20261018-06 und -08 übernommen** (Freigabe des Nutzers 19.10.). Neu im Projekt, nichts überschrieben: `pipeline/blender/web_depth.py`, `pipeline/images/build-flow.mjs`, `tools/qa/{flow-check,flow-warp,png-lite}.mjs`, `tests/flow-warp.test.mjs`, `public/hero/5/flow/` (22 Dateien, Raster desktop 120 × 68 und mobile 90 × 160). Alle 28 Dateien MD5-gleich mit dem Staging. `npm test` 163/163. Backups (Log, diese Datei) in `staging/T-20261018-06/backup/`.
- **Noch nicht in `dev`:** -06/-08 und diese Datei. Übertrag erst nach Rückfrage, sinnvoll zusammen mit -07.
- **Nicht gemacht:** `build-flow` im Projekt nachlaufen lassen und gegen `flow/` vergleichen (D4 im Projekt). Im Staging ist D4 zweimal erfüllt, die Werkzeuge sind byte-gleich.
- **Als Nächstes Teil 2, T-20261018-07 (Player):** WebGL2-Warping in `journey.ts` mit Rückfall auf Überblenden; der Shader folgt der CPU-Referenz `tools/qa/flow-warp.mjs` und `staging/T-20261018-08/FORMAT.md`. Die Zielkamera ist die Kamera der feinen Position, zwischen zwei feinen Positionen wird interpoliert. Schreibmenge laut Log. **Zuerst die Musskriterien für Teil 2 (F2-Messung, Rückfall, Tests) als Entwurf vorlegen und freigeben lassen**, erst dann bauen. Danach kann Shopify B2 (T-20261018-12) starten, sie wartet auf -07.

**Startprompt für den neuen Chat:**
> Royal Spices, flüssiges Scrollen (B1), Teil 2 (T-20261018-07, Player). Lies H:\royal-spices\CLAUDE.md, dann in royal-spices-v1/docs/UEBERGABE-FLUESSIG.md die Abschnitte „Neuester Stand (19.10. nachts)“, „Entwurf vom 18.10. (Kriterien F1–F4 freigegeben)“ und „Optionen“ (B1), dazu _agent/staging/T-20261018-08/FORMAT.md und die letzten Zeilen von _agent/LOG.md. Teil 1 (-06/-08) ist übernommen, `npm test` 163/163. Schlag mir zuerst die Musskriterien für -07 vor (Umfang, F2-Messung, Rückfall auf Überblenden, Tests, Schreibmenge) und warte auf meine Freigabe, bevor du baust. Harte Grenze: höchstens 150k Tokens je Chat und Subagent, ab ca. 120k Übergabe schreiben.

## Stand 19.10. (Teil 1 im Staging geprüft)

- Details: `_agent/staging/T-20261018-06/ERGEBNIS.md`, Ausgaben in `check/`, Web-Daten in `flow/` (Raster 1/12 bzw. 1/8, der alte Stand 1/16 liegt in `flow-1-16/`).
- **D1, D2, D4 und F3 sind für alle Positionen erfüllt.** D1 max. 0,0014 px, D2 Median max. 0,047 %, F3 6,0 % bzw. 4,9 %.
- **F1 (vor der Entscheidung, Raster 1/16):** Mit echter Kamera der feinen Position verfehlen 5/356 (desktop) und 5/250 (mobile), alle am Rand der Haltestrecke. Linear interpolierte Kamera: 10 bzw. 16 verfehlt.
  - Die schnellen Strecken haben nur Bilder mit Bewegungsunschärfe. Dort wurde gegen diese gemessen, das sind die Quellen der Bewegungsfolge.
  - Vorschlag: Kamera je feiner Position (in -07), Raster desktop 1/12 und mobile 1/8.
  - Bestätigt (`check/v-*`): desktop 355/356 (nur 261: 1,77/25,2), mobile 249/250 (nur 185: 2,07/25,3), F3 8,8 % bzw. 12,3 %. Auswerten mit `node _agent/staging/T-20261018-06/check/sum.mjs v-desktop-120x68 …` oder direkt aus `summary.json`.
- **Entscheidung des Nutzers (19.10.):** Vorschlag angenommen, die Reststellen 261 und 185 sind akzeptiert. Umgesetzt im Staging:
  - -08: GRID 120 × 68 bzw. 90 × 160, `flow-check` mit `--cam true` als Standard, `FORMAT.md` (Zielkamera je feiner Position).
  - `flow/` neu gebaut: F3 8,8 % bzw. 12,3 %, D4 gleiche Bytes.
  - **Teil 1 ist abnahmebereit.**
- **Für -07:** Der Shader nimmt als Zielkamera die Kamera der feinen Position aus `cams`, zwischen zwei feinen Positionen wird zwischen deren Kameras interpoliert, nie zwischen den Bildpositionen. Siehe `staging/T-20261018-08/FORMAT.md`.
- Offen: Glas-Commit (`UEBERGABE-E3-DEMO.md`), danach Übernahme -06/-08 nur nach Freigabe. Dazu Backup, Kopie (`flow/` → `public/hero/5/flow/`), `npm test` muss 142 ergeben.
- **Nachtrag 19.10. (T-20261019-01):** Der Glas-Commit ist erledigt, auf `dev` (`2f55884`, danach die Shopify-Fixes als `b44cb1b`), gepusht, Pages-Deploy erfolgreich. **`npm test` muss nach der Übernahme 163 ergeben, nicht 142.** Die Shopify-Sitzung hat -09, -10, -11 und -13 übernommen, damit liegt das Projekt bei 158, und D3 bringt 5 dazu. Die Zahlen 137 und 142 weiter unten sind überholt. Die Übernahme von -06/-08 braucht weiter die Freigabe des Nutzers.

## Neuester Stand (19.10., 0 Uhr, Chatwechsel auf Wunsch des Nutzers)

- **Queue c2 ist fertig** (all 20:00, large 21:11, dense 22:23, ohne `Error`/`Traceback`). Aus dem Glas-Auftrag noch offen: `npm run build` und `npm test`, Ergebnis dem Nutzer zeigen, Commit (`UEBERGABE-E3-DEMO.md`).
- **T-20261018-08** (JS-Werkzeuge) ist FERTIG und geprüft, wartet auf die Übernahme. **T-20261018-06** (Daten) ist `OFFEN`, `web_depth.py` liegt im Staging. Details stehen unten unter „Stand Schritt 1“.
- **Volle Tiefe FERTIG (19.10., 00:09):** desktop 713/713 (23:58), mobile 505/505, je mit `cams.json`, 0 Fehler. Der folgende Neustart-Hinweis ist damit erledigt. Gestartet am 18.10., 23:44 (Wunsch des Nutzers: CPU, 4 Threads), erst desktop, dann mobile. Fertig ist sie, wenn in `staging/T-20261018-06/full-mobile.log` `DONE` steht und `.raw/desktop-depth` 713 bzw. `.raw/mobile-depth` 505 PNGs plus `cams.json` hat. Ist der Lauf mit dem alten Chat abgebrochen, denselben Aufruf in Git Bash erneut starten; vorhandene Bilder werden übersprungen:
  ```
  B="F:/3D/Blender/Blender 4.5/blender.exe"; M="H:/royal-spices/Projektübergabe/royal-spices/blender/royal-spices-master.blend"
  S="H:/royal-spices/_agent/staging/T-20261018-06"; P="H:/royal-spices/royal-spices-v1"
  RS_DEVICE=CPU "$B" -b "$M" --python "$S/web_depth.py" -- --variant desktop --range 0:713 --threads 4 --out "$P/.raw/desktop-depth" --hero "$P/pipeline/blender/web_hero.py" >> "$S/full-desktop.log" 2>&1
  (mobile: --variant mobile --range 0:505, Ausgabe mobile-depth, Protokoll full-mobile.log)
  ```
  Die Queue ist durch, die GPU wäre jetzt frei (`RS_DEVICE=HIP`). Das nur nach Rückfrage, der Nutzer hatte CPU gewählt.
- **Danach, alles im Staging:** Werkzeuge aus `staging/T-20261018-08/work/` (Aufrufe in deren `ERGEBNIS.md`):
  - `flow-check --cams` und `--consistency` für beide Varianten.
  - `--f1 --variant desktop|mobile --raw <P>/.raw/<v>-depth --src <P>/.raw --out <dir>`.
  - `build-flow` nach `staging/T-20261018-06/flow/` mit `--base <P>/public/hero/5/d-960` bzw. `m-540`.
  - Wo F1 verfehlt wird, eine Liste der Strecken plus Vorschlag; die Entscheidung trifft der Nutzer.
- **Übernahme -06/-08** (Backup, Kopie, `npm test` muss 142 ergeben, also 137 + 5) erst nach dem Glas-Commit und nach Freigabe des Nutzers. Parallel arbeitet eine Shopify-Sitzung im Projekt (T-20261018-09 bis -13), ihre Schreibmengen sind disjunkt.
## Wiedereinstieg (Stand 18.10. abends, Chatwechsel wegen Budget)

**Freigegeben (Nutzer, 18.10.):** Option B1 (Bewegungsfeld aus Tiefe und Kamera, WebGL2-Warping) mit den Kriterien F1–F4 unten, „als eigene Transaktion“. Sonst ist noch nichts entschieden.

**Transaktionen** (in `_agent/LOG.md`; am 18.10. abends von -04/-05 umnummeriert, weil -04 schon für den Übertrag nach `dev` vergeben war):
- **T-20261018-06 Daten** (Hauptchat) und **-08 Werkzeuge** (Subagent), zusammen „Teil 1“:
  - `pipeline/blender/web_depth.py` (neu): Tiefe und Kamera (Matrix, Brennweite, Shift) je Rasterposition, Cycles 1 spp, ohne Schärfentiefe. Varianten: quer 713 und hoch 505 Positionen.
  - `pipeline/images/build-flow.mjs` (neu): Bewegungsdaten fürs Web.
  - `tools/qa/flow-check.mjs` (neu): Prüfung F1. Es erzeugt das Zwischenbild an jeder ungeraden Position aus den beiden geraden Nachbarn und vergleicht es mit dem gerenderten Bild.
- **T-20261018-07 Player** (nach -06/-08): WebGL2-Warping in `src/scripts/journey.ts` (`draw()`/`present()`, ab Zeile ~358), Rückfall auf das heutige Überblenden, Manifest in `pipeline/images/build-hero.mjs`, Test, F2-Messung (Prüfskripte in `tools/qa/`, Debug-Port 9333, nie zwei gleichzeitig).

**Harte Randbedingungen:**
- **Die Queue c2 läuft** (gestartet 19:19 im Terminal-Tab „Queue c2“, `_agent/staging/INTEGRATION-20261016/tools/queue-e3b.sh`). Sie ruft für jedes Bild `web_hero.py` und `render.sh` neu auf und veröffentlicht sich selbst über `build-hero.mjs` und `build-stills.mjs`. Diese Dateien bis zum Ende nicht im Projekt ändern. Übernahmen von -06/-07/-08 erst danach.
- Ende erkennen: `##### … alle drei Queues fertig` im Tab bzw. `QUEUE-DONE` in `.raw/queue.log`, `queue-large.log` und `queue-dense.log`. Nach `Error`/`Traceback` suchen.
- Danach, offen aus dem Glas-Auftrag: `npm run build` und `npm test`, quer und hoch ansehen, **dem Nutzer das Build-Ergebnis zeigen, vor dem Commit** (Commit-Weg wie unter „Stand 15.10.“ in `UEBERGABE-E3-DEMO.md`, Nächste Schritte 4).
- Tiefe rendern belegt die GPU. Also entweder nach der Queue oder per CPU (bei 1 spp ist das günstig).
- `web_hero.py` baut die Szene beim `exec` vollständig auf. Ob `web_depth.py` sie ohne Änderung an `web_hero.py` nutzen kann (Kamera: `apply_camera(p)` Zeile ~831, `setup_render()` ~877), zuerst prüfen. Braucht es doch eine Änderung (z. B. `--mode depth`), dann erst nach der Queue.

**Hinweise für den Entwurf (nicht verbindlich):**
- F3 (≤ 15 % mehr Daten) früh überschlagen. Ein Fluss-Feld in 1/8 Auflösung je Paar (180 × 102 × 2 Kanäle) läge eher bei 30 % des Bewegungssatzes. Sparsamer: je Position eine kleine Tiefenkarte (z. B. 1/16, 8 bit logarithmisch) plus Kameradaten als JSON, die Rückprojektion rechnet dann der Shader. Das läge bei geschätzt 2 MB.
- Verschieben per Rückwärts-Abtastung: Zielbild an Mischwert t aus A bei x − t·F(A→B) und aus B bei x + (1 − t)·F(B→A), dann mischen. An Verdeckungen das Bild mit der passenderen Tiefe stärker gewichten.
- Grenzen von B1: Brechung im Glas (Füllung hinter dem Glas bewegt sich anders als die Glasfläche) und stark unscharfe Bereiche (Makro an der Narbe). Beides zeigt F1. Falls F1 dort verfehlt: dort dichter rendern, das Raster erlaubt Läufe je Strecke (`frames`).
- F1 braucht für die Prüfung Felder über zwei Rasterschritte (gerade → gerade). Im Betrieb nutzt der Player die Nachbarn des veröffentlichten Rasters.

## Entwurf Teil 1 „Daten und Prüfwerkzeug“ (18.10. abends, vom Nutzer freigegeben samt Umnummerierung)

**ID-Kollision:** `T-20261018-04` ist in `_agent/LOG.md` doppelt vergeben, auch für den Übertrag nach `dev` (ÜBERNOMMEN, in `STATUS.md` genannt). Die beiden Reservierungen sind jetzt **T-20261018-06** (Daten) und **-07** (Player). Die JS-Werkzeuge laufen als eigene Transaktion **-08** (Subagent), mit disjunkter Schreibmenge.

**Befund `web_hero.py`:** Pro Position ändern sich nur die Kamera (`apply_camera(p)`: Ort, Richtung, `lens`, `shift`, Schärfentiefe) und der Lichtstreifen am Glas (p 0,60–0,94). Die Szene ist sonst starr, B1 reicht also. `web_depth.py` kann die Szene **ohne Änderung** an `web_hero.py` nutzen: `exec` mit `--mode none --range 0:0`. Das läuft in den `seq`-Zweig, rendert nichts und baut die Szene vollständig auf. Danach wird `apply_camera(i/(N−1))` aufgerufen und mit eigenen Einstellungen gerendert (1 spp, ohne Entrauschen, ohne Schärfentiefe, Z-Pass).

**Datenformat:**
- **Roh** (`.raw/<variant>-depth/`, nicht veröffentlicht): je Position die inverse Tiefe als PNG mit 16 bit in Bewegungssatzgröße (960 × 540 bzw. 540 × 960), dazu `cams.json`. So lassen sich Auflösung und Verkleinerung später ändern, ohne neu zu rendern.
- **Web** (`public/hero/5/flow/`, allgemein `public/<base>/flow/` mit `base` aus `src/data/hero-manifest.json`; von `build-flow.mjs`):
  - `<variant>.json`: `fine`, `count`, Sensor (36 mm lange Seite), Kachelaufbau und je Position 12 Zahlen: Ort (3), Quaternion (4), `lens`, `shift` x/y, Tiefenbereich `dn`/`df` (inverse Tiefe). Geschätzt 30 KB gzip.
  - `<variant>-depth-NN.png`: inverse Tiefe mit 8 bit, linear zwischen `dn` und `df` je Position, 0 = Hintergrund (unendlich). Grau, 64 Positionen je Blatt (8 × 8), damit der Player blattweise nachladen kann. Startauflösung 1/16 der größten Bewegungsgröße (quer 90 × 51 von 1440 × 810, hoch 45 × 80 von 720 × 1280), wahlweise 1/12 oder 1/8. Die Wahl trifft die F1-Messung innerhalb von F3. Verkleinert wird als Median je Block.
  - Die Tiefe gilt für alle Breiten einer Variante. `hero-manifest.json` und `build-hero.mjs` bleiben unverändert.
- **Warp (Referenz):** Gitter mit einem Eckpunkt je Tiefentexel. Rückprojektion mit Kamera A, Projektion mit Kamera t, Rasterung mit Tiefentest, Abtastung von A. Gleiches für B. Gemischt wird mit (1 − t) und t, gewichtet nach Gültigkeit: gedehnte Dreiecke an Tiefensprüngen und Pixel außerhalb des Bildes zählen weniger. Wo beides ungültig ist, wird überblendet wie heute. Kamera bei t: Ort, `lens` und `shift` linear, Richtung per Slerp. `flow-check.mjs` rechnet genau das auf der CPU. In -07 muss der Shader dieser Referenz folgen.

**Abnahmekriterien (Vorschlag):**
- **D1 Kamera:** Für jede Position gibt es einen Eintrag (quer 713, hoch 505). Drei feste Weltpunkte, mit den exportierten Daten projiziert, weichen höchstens 0,1 px (bei 960 px) von Blenders `world_to_camera_view` ab, an 20 Stichproben je Variante.
- **D2 Tiefe:** Für jede Position gibt es ein Bild. Tiefe i, mit Kamera i+1 umprojiziert, weicht in sichtbaren Bereichen im Median höchstens 1 % von Tiefe i+1 ab. Das prüft Achsen und Vorzeichen.
- **D3 Warp-Test:** Neuer Test `tests/flow-warp.test.mjs` mit einer synthetischen Ebene und Stufe bei bekannter Kamera: Lage ≤ 0,5 px. `npm test` bleibt grün (seit T-20261018-09: 137, mit D3 dann 142).
- **F1:** Gemessen an **jeder** ungeraden Position, quer und hoch, in 960 × 540 bzw. 540 × 960 gegen die Quell-PNGs: Mittel ≤ 2/255, p99 ≤ 24/255. Zum Vergleich wird das heutige Überblenden mitgemessen. Wo F1 verfehlt wird, kommt eine Liste der Strecken mit Vorschlag, z. B. dort dichter rendern. Die Entscheidung liegt beim Nutzer, vor der Übernahme.
- **F3:** Je Variante sind die Web-Daten höchstens 15 % des kleinsten Bewegungssatzes nach der Queue (`d-960`, `m-540`; heute hochgerechnet etwa 10,5 und 7,4 MB, also etwa 1,6 und 1,1 MB).
- **D4 Keine Rückwirkung:** `web_hero.py`, `build-hero.mjs`, `build-stills.mjs`, `journey.ts` und `hero-manifest.json` sind unverändert (MD5). Die Seite lädt `flow/` noch nicht. `build-flow.mjs` liefert zweimal hintereinander dieselben Bytes.

**Schreibmengen:** -06 `pipeline/blender/web_depth.py`, `public/hero/5/flow/**` (beide neu), dieses Dokument, roh `.raw/{desktop,mobile}-depth/`. -08 `pipeline/images/build-flow.mjs`, `tools/qa/{flow-check,flow-warp,png-lite}.mjs`, `tests/flow-warp.test.mjs` (alle neu).

**Ablauf:**
1. **Jetzt, während die Queue läuft, nur im Staging:** Werkzeuge schreiben. Probelauf der Tiefe auf der CPU mit 4 Threads an etwa 10 Positionen, D1–D3 daran prüfen.
2. **Nach der Queue:** Tiefe voll auf der GPU (1.218 Bilder, geschätzt 30–45 min), dann `build-flow`, F1 voll und F3.
3. **Übernahme ins Projekt:** erst nach Build, Test und Commit des Glas-Stands.

**Stand Schritt 1 (18.10., 19:50):**
- `staging/T-20261018-06/web_depth.py` läuft unverändert gegen das Projekt-`web_hero.py`, Aufruf siehe Kopf der Datei.
- Probe auf der CPU mit 4 Threads und `RS_DEVICE=CPU`: desktop 0, 100, 268–278, 400, 600, 712; mobile 0, 200–202, 504. Etwa 1,4 s je Bild, ohne Fehler. Rohdaten in `staging/T-20261018-06/raw/`, je Bild etwa 0,5 MB, voll also etwa 0,6 GB (H: hat 12 GB frei).
- **-08 FERTIG und vom Hauptchat geprüft** (`staging/T-20261018-08/ERGEBNIS.md`, Verfahren für den Shader in `FORMAT.md`):
  - D3 ist 5/5 in 0,5 s.
  - D4: Zweimal `build-flow` ergibt gleiche Bytes.
  - D1: höchstens 0,0014 px (desktop) bzw. 0,0006 px (mobile). Das Vorzeichen von `shift` ist bestätigt.
  - D2: Median 0,011 % bzw. 0,010 %.
  - F1 desktop 269–277: Mittel ≤ 0,56, p99 ≤ 3,2, alle bestanden. Das ist nur die Haltestrecke mit Bewegung unter 1 px, die eigentliche Probe kommt nach der Queue. Mobile ist noch nicht messbar, weil die Queue `.raw/mobile*` erst füllt.
  - F3 hochgerechnet aus der Probe: desktop etwa 1,4 MB, also etwa 11–12 % von `hero/5/d-960` (12,1 MB); mobile etwa 0,9 MB, also etwa 12 % von `m-540` (7,7 MB).
- **Korrektur durch den Hauptchat:** Der Entwurf und der Auftrag nannten fälschlich `public/hero/3`. Veröffentlicht wird nach `/hero/5`. `build-flow.mjs` liest den Bezug für F3 jetzt aus `hero-manifest.json`; `--base` und `--out` bleiben möglich.
- **Nächste Schritte:**
  1. Tiefe voll rendern. **Läuft seit 18.10., 23:44** auf Wunsch des Nutzers auf der CPU mit 4 Threads, parallel zur Queue: erst desktop, dann mobile, nach `.raw/<variant>-depth/`. Protokolle `staging/T-20261018-06/full-{desktop,mobile}.log`, je Bild eine `DEPTH`-Zeile, am Ende `DONE`. `web_depth.py` überspringt Vorhandenes; nach einem Abbruch denselben Aufruf neu starten (Aufruf wie die Probe, mit `--range 0:713` bzw. `0:505`).
     **Queue c2 ist fertig:** all 20:00, large 21:11, dense 22:23, ohne `Error`/`Traceback`. Offen aus dem Glas-Auftrag: Build, Test, Ergebnis zeigen, Commit (`UEBERGABE-E3-DEMO.md`).
  2. `build-flow` zuerst ins Staging (`staging/T-20261018-06/flow/`, mit `--base public/hero/5/d-960` bzw. `m-540`), erst bei der Übernahme nach `public/hero/5/flow/`.
  3. `flow-check --f1` voll für quer und hoch, außerdem `--cams` und `--consistency`.
  4. Übernahme -06/-08, erst nach dem Glas-Commit.

Bekannte Grenzen, die F1 zeigt: Brechung im Glas (Variante zum Prüfen: Tiefe mit ausgeblendetem Glas, nur in der Glas-Strecke), Lichtstreifen p 0,60–0,94, Makro mit Schärfentiefe.

**Startprompt für den neuen Chat:**
> Royal Spices, flüssiges Scrollen (B1), Teil 1 abschließen. Lies H:\royal-spices\CLAUDE.md, dann in royal-spices-v1/docs/UEBERGABE-FLUESSIG.md die Abschnitte „Neuester Stand (19.10., 0 Uhr)“ und „Entwurf Teil 1“ (freigegeben) und die letzten Zeilen von _agent/LOG.md. Zuerst prüfen, ob die volle Tiefe fertig ist; sonst denselben Aufruf neu starten, er setzt fort. Dann im Staging: D1/D2 für alle Positionen, F1 voll quer und hoch, build-flow mit F3. Ergebnis knapp berichten. Ins Projekt (-06/-08) erst nach dem Glas-Commit und nach meiner Freigabe übernehmen. Harte Grenze: höchstens 150k Tokens Kontext, ab etwa 120k Übergabe schreiben. Bilder nur verkleinert und sparsam ansehen. Deutsch, knapp.

## Entwurf vom 18.10. (Kriterien F1–F4 freigegeben)

Auftrag des Nutzers (18.10.): „Im Endprodukt müssen wir garantieren, dass es beim langsam Scrollen flüssig läuft, also entweder genug Frames oder eine sinnvolle Alternative.“

## Heutiger Stand

- **Player** (`src/scripts/journey.ts`): Die Kamera folgt dem Scrollen wie eine kritisch gedämpfte Feder (`FOLLOW` 10/s). Zwei Nachbarbilder werden je nach Position überblendet. Im Ruhezustand rastet das Bild auf ein ganzes Bild ein, das Ruheset in voller Auflösung übernimmt.
- **Raster:** `fine` 8, also 713 Positionen quer und 505 hoch. Wenn alle drei Queues durch sind (all, large, dense; Entscheid 07.10., Option A), ist jede Position gerendert.
- **Scrollweg:** 749 svh. Bei einem Laptop mit 960 px Höhe sind das etwa 9 px Scroll pro Rasterposition, in der langsamen Strecke 0,425–0,56 etwa 18 px.

## Messung (18.10.)

Messverfahren: Blockvergleich zwischen den Basisbildern (`.raw/prev-e3b/desktop`, `mobile`; gleiche Kamera wie c2), geteilt durch 8. Gezählt wird das 90. Perzentil der bewegten Kacheln, umgerechnet in CSS-Pixel bei Laptop 1707 × 960 und Telefon 390 × 844. Skripte: `_agent/staging/INTEGRATION-20261016/tools/flow.cjs` und `sum.cjs`, Rohwerte in `tools/flow-1810/`.

| | Verschiebung je Rasterschritt (p90) | Schritte über 2 px | Bilder für ≤ 2 px | für ≤ 4 px | heute |
|---|---|---|---|---|---|
| quer | Median 5 px, Spitze 45 px (Narbe → Fäden) | 69 von 89 | ~3.600 | ~1.900 | 713 |
| hoch | Median 4 px, Spitze 25 px | 40 von 63 | ~1.800 | ~1.000 | 505 |

Die Messung ist grob: In der Haltestrecke an der Narbe ergab der direkte Vergleich der Einzelbilder etwa 14 px je Schritt, aus den Basisbildern geschätzt waren es 5–9 px. Die Aussage hält trotzdem: Überblenden mit Abständen von 5–45 px sieht man als Doppelkontur. Das gilt besonders beim langsamen Scrollen, wo jede Überblendung lange stehen bleibt.

## Kriterien (Vorschlag)

- **F1 Keine Doppelkonturen:** Ein Zwischenbild an einer ungeraden Rasterposition wird nur aus den beiden geraden Nachbarn erzeugt. Verglichen mit dem tatsächlich gerenderten Bild an dieser Position ist die mittlere Abweichung ≤ 2/255 und das 99. Perzentil ≤ 24/255. Das ist die Spanne von zwei Renderläufen am 15.10. Gemessen wird über die ganze Fahrt, quer und hoch.
- **F2 Bildrate:** Beim langsamen Scrollen (Trackpad, ≤ 300 px/s) im Mittel ≥ 55 fps, kein Einzelbild über 33 ms. Referenzgeräte: dieser Laptop (Ryzen 5 6600HS, iGPU) und ein mittleres Android-Telefon. Messung per Performance-Trace.
- **F3 Daten:** Der Bewegungssatz wird höchstens 15 % größer als ohne Maßnahme.
- **F4 Kein Rückschritt:** Ohne WebGL2 oder bei einem Fehler läuft das heutige Überblenden weiter. Ruhebild und Ruheset bleiben gleich scharf.

## Optionen

- **A) Mehr Bilder:** Für ≤ 2 px wären es quer etwa 3.600 statt 713 und hoch 1.800 statt 505 Bilder. Das kostet rund 13 h zusätzliche Renderzeit und etwa die fünffache Datenmenge (quer ~100 MB). Das ist nicht sinnvoll, F3 verfehlt.
- **B) Bewegungskompensiertes Überblenden (Empfehlung):** Zu jedem Paar von Nachbarbildern gibt es ein Bewegungsfeld in geringer Auflösung. Ein WebGL2-Shader verschiebt beide Bilder zur Zwischenposition und blendet sie erst dann. So entsteht bei jedem Bildwechsel des Bildschirms ein passendes Zwischenbild, ohne Doppelkontur, und die vorhandenen 713/505 Bilder reichen.
  - **B1 Feld aus Tiefe und Kamera (Empfehlung):** zusätzlich ein Tiefenbild je Position (Cycles 1 spp, ohne Schärfentiefe, etwa 1 s je Bild) und die Kameradaten aus `web_hero.py`. Das Feld ist für die ruhende Szene exakt. Ungenau ist es nur bei Brechung im Glas und in sehr unscharfen Bereichen. Kein Download nötig.
  - **B2 Feld aus den Bildern (optischer Fluss):** kein zusätzlicher Render. Dafür braucht es OpenCV (Download, Freigabe nötig) oder eine eigene Umsetzung, und das Feld ist bei wenig Struktur und an Verdeckungen ungenau.
- **C) Beibehalten:** Dann gibt es keine Garantie, F1 ist verfehlt.

Die laufende Queue wird für A, B und C gebraucht. Sie läuft deshalb weiter.
