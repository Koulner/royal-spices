# Übergabe Video (Bar-Film im Business-Block), Stand 22.10.2026, nach T-35

Plan (vom Nutzer freigegeben): `C:\Users\lukas\.claude\plans\compiled-inventing-toucan.md`. Transaktionen im ID-Block Video `T-20261021-30` bis `-39` (LOG-Kopf).

## Entscheidungen des Nutzers (21.10.)
- Platz: Startseite S9 „Für Küchen, die mehr erwarten.“ und /b2b/ „Zusammenarbeit“
- Ton: startet stumm, Knopf „Ton an“ (Musikrechte laut Nutzer geklärt)
- Ablauf: einmal abspielen, auf dem letzten Bild (Flasche) stehen bleiben, kein Loop
- Rechte am Video: geklärt, kein Schalter
- Bildrate: 30 fps (Probe: 60 fps bräuchte etwa die doppelte Größe für dieselbe VMAF)

## Stand
| ID | Inhalt | Status |
|---|---|---|
| T-20261021-30 | Kodierung: 4 Fassungen (AV1/H.264 × 1080/720), Poster `bar-poster`, `pipeline/video/build-video.mjs`, `src/data/videos.json`, `npm run assets:video` | ÜBERNOMMEN |
| T-20261021-31 | `server.mjs` + `server-static.mjs`: `.mp4` mit Range/206/416, gestreamt, `/video/` immutable | ÜBERNOMMEN |
| T-20261021-32 | Komponente und Einbau | VERWORFEN (Budget), Befunde in `staging/T-20261021-32/ERGEBNIS.md` |
| T-20261021-33 | Teil a: Komponente `InlineVideo.astro`, `inline-video.ts`, Test, Einbau, Doku (B1–B5) | ÜBERNOMMEN 22.10. (Nutzer-Go), `npm test` 210/210 |
| T-20261021-34 | Teil b: Messen, nur lesend (Bericht `staging/T-20261021-34/ERGEBNIS.md`) | ÜBERNOMMEN 22.10. (Bericht angenommen, Entscheidungen siehe unten) |
| T-20261021-35 | B2, B3 (Variante A) und B4 aus T-34: `inline-video.ts`, `InlineVideo.astro`, `docs/QA.md` (Bericht `staging/T-20261021-35/ERGEBNIS.md`) | ÜBERNOMMEN 22.10. (Nutzer-Go), K1–K6 erfüllt, `npm test` 210/210 |

Projekt: `npm test` 210/210, nichts davon in `dev`.

## Nächste Schritte
1. ~~T-33 prüfen und übernehmen~~ (erledigt 22.10.).
2. ~~T-34 Messen~~ (erledigt 22.10., Bericht `staging/T-20261021-34/ERGEBNIS.md`). Erfüllt sind V2 auf der Startseite (H.264 im Browser erzwungen: h264-1280 desktop, h264-1920 mobil), V4 (`/` CLS 0,0002 wie am 19.10., TBT 0 ms; /b2b/ CLS 0), V5 (auch der versteckte Tab, echt per minimiertem Fenster) und V7. V6 bringt keine Befunde vom Video. Entscheidungen des Nutzers vom 22.10.:
   - **B3:** Zuerst hingenommen, dann hat der Nutzer Variante A gewählt: Das Poster kommt aus einem `<template>`, und vor dem ersten Scrollen lädt nur, was schon im Bild ist.
   - **B2, B3 und B4 → T-35** (siehe Punkt 3).
3. ~~T-35~~ (erledigt und übernommen 22.10., Bericht `staging/T-20261021-35/ERGEBNIS.md`, Backup `staging/T-20261021-35/backup/`):
   - B2: Es geht je genau eine Videodatei raus, ohne Abbruch.
   - B3: Vor dem ersten Scrollen kommen weder Poster noch Video (desktop, mobil slow 4G, Tablet).
   - B4: Fokus am Ende auf „Noch einmal“.
   - Keine Rückschritte bei Verhalten, CLS, `perf.mjs`, a11y und Live-Text. JS 1484 B gzip.
   - Prüfskripte: `staging/T-20261021-34/checks/` und `staging/T-20261021-35/checks/`.
   - **Offen, nicht beauftragt:** B6. Ohne JS deckt das native `<video controls>` das Poster dunkel zu. Das alte Markup verhielt sich genauso. Eine Idee für später: `@media (scripting: none)` mit anderer Schichtung. Ein `poster`-Attribut würde B3 brechen.
4. Das Video geht mit **Übertrag A** nach `dev`, zusammen mit Live-Bildern T-19-07, B2 T-18-12 und Fragmentierung T-20-01/-02.
5. Safari/iOS (H.264-Weg, Range) prüft der Nutzer beim gemeinsamen Messtermin mit P3/P4.

## Wichtige Fakten
- Quelle `.raw/video/bar-0930.mp4` (2160 × 3840, 60 fps, 28,5 s), nicht in git. Geschnitten wird bei 25,35 s, weil die Abblende bei 25,37 s beginnt.
- ffmpeg ist nicht installiert. Nutzbar: `F:\3D\StableProjectorz\stableprojectorz\comfyui-rocm\python_env\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe` (libaom, x264, libvmaf), ffprobe unter `F:\3D\StableProjectorz\stableprojectorz\gen3d\trellis2-spz\tools\python\ffprobe.exe`. Ein Build dauert ca. 12 min.
- VMAF-Messung: `staging/T-20261021-30/verify.sh <Arbeitskopie>` (gleich nummerierte Bilder, `-nostdin`).
- CSP: kein `style`-Attribut, kein `define:vars` (Befund T-32).
- **Messumgebung (B1, 22.10.):** Die Windows-Animationseffekte sind aus. Headless Edge meldet deshalb `prefers-reduced-motion: reduce`, und das Video lädt und spielt in den QA-Läufen nicht. Gemessen wird daher mit `RS_QA_MOTION=no-preference`. Das ist eine Ergänzung nur in `browser.mjs` der Arbeitskopie, Vorlage `staging/T-20261021-34/checks/browser.wa-patched.mjs`. Der Bildtakt lag dabei bei etwa 32 Hz und taugt nicht als Vergleich.
- Arbeitskopie T-34: `C:\Users\lukas\AppData\Local\Temp\claude\H--royal-spices\feb81e20-942a-4a23-b7e6-d5442417ddc8\scratchpad\wa\royal-spices-v1` mit Junction `node_modules`. Vor dem Löschen die Junction mit `cmd /c rmdir` entfernen.
- Speicher: Der Staging-Ordner T-31 ist 604 MB groß (Kopie von node_modules). Löschen nur mit Freigabe des Nutzers.
- Git Bash wandelt Argumente wie `/b2b/` in Windows-Pfade um. Bei Prüfskripten mit Pfadargument `MSYS_NO_PATHCONV=1` setzen und die Arbeitskopie als `C:/…` angeben.

## Startprompt für den neuen Chat

> Weiter mit dem Bar-Video (Royal Spices, Arbeitskopie H:, kein git). Lies `H:\royal-spices\CLAUDE.md`, den Kopf von `_agent/LOG.md` (GPU-Sperre, Ports, Regel für den Übertrag) und `royal-spices-v1/docs/UEBERGABE-VIDEO.md`.
>
> Stand 22.10.: T-20261021-30, -31, -33, -34 und -35 sind übernommen. Keine Video-Transaktion ist `OFFEN`, im Projekt läuft `npm test` mit 210/210, nichts davon ist in `dev`. Die Befunde B1–B6 stehen in `staging/T-20261021-34/ERGEBNIS.md` und `-35/ERGEBNIS.md`.
>
> Frag den Nutzer zuerst, womit es weitergeht, und nimm nichts davon eigenmächtig in Angriff:
> 1. **Übertrag A nach `dev`**, zusammen mit T-19-07, T-18-12 und T-20-01/-02. Nur mit Freigabe und nie parallel zu einem anderen Übertrag; vorher im LOG prüfen, dass keiner `OFFEN` ist.
> 2. **B6:** Ohne JS deckt das native Video das Poster zu. Nicht beauftragt; vor dem Bauen die Kriterien zur Freigabe vorlegen.
> 3. **Safari/iOS** beim Messtermin P3/P4 (der Nutzer am Gerät).
> 4. **Aufräumen**, nur mit Freigabe: Arbeitskopie auf C: (zuerst die Junction entfernen) und Staging-Ordner T-30 bis T-35.
>
> Neue IDs im Video-Block nach der Regel im LOG-Kopf, vor der Vergabe prüfen. Messen: Server 4398, CDP 9333, GPU-Sperre vor `perf.mjs`. Auf diesem PC meldet Edge `reduce`, deshalb `RS_QA_MOTION=no-preference` (siehe „Messumgebung“ oben). B1 (Windows-Animationen) und B5 (Brotkrumen) gehören nicht zum Video-Block.
>
> Budget: kein Chat und kein Agent über 150k, bei etwa 120k eine Übergabe schreiben.
