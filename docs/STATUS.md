# Stand 22.10.2026 — Betrieb auf IONOS-Webhosting (T-20261022-01, -02)

- **Übernommen (Freigabe des Nutzers), nicht in `dev`, kein Push.** Die Website läuft jetzt auch auf einem normalen IONOS-Webhosting: Apache mit `.htaccess`, PHP 8, SFTP. Der Node-Weg (`server.mjs`) bleibt unverändert und funktioniert weiter.
- **Neu:**
  - `tools/ionos/`: `htaccess.mjs` erzeugt die `.htaccess` aus `redirects.mjs`, `prepare.mjs` baut `dist-ionos/`, `check.mjs` prüft Apache und die Live-Domain, `container.mjs` startet Apache im Container, `deploy.sh` lädt per SFTP über lftp mit festem Host-Schlüssel hoch.
  - `php/` ist der Anfrage-Endpunkt (PHPMailer 6.12.0, SMTP über Google Workspace). Die Zugangsdaten liegen außerhalb des Webroots in `royalspices-private/`.
  - `.github/workflows/ionos.yml` läuft täglich um 03:30 und 13:30 Uhr und von Hand. Er baut nur `prod` und läuft erst, wenn die Variable `IONOS_DEPLOY=1` gesetzt ist.
  - Tests `ionos-htaccess` und `ionos-php` (106 Paritätsfälle).
  - Doku `docs/HOSTING-IONOS.md`, neuer Abschnitt 6 in `ABSCHLUSS-TODO.md`.
  - `package.json`: `build:ionos`, `check:ionos`.
- **Geprüft:**
  - `npm test`: mit PHP 234 von 234, ohne PHP 220 bestanden und 1 übersprungen. `astro check` 0/0/0.
  - Gegen einen lokalen Apache 2.4 mit PHP 8.3: `seo.mjs --redirects` S4 ohne Fehler (35 alte URLs, ein Sprung), `check.mjs` 22 von 22.
  - Node-Weg: `tools/qa/smtp.mjs` grün.
  - Docker läuft auf diesem Rechner nicht, weil Hyper-V aus ist. Der Container-Weg läuft deshalb nur im CI.
- **Abweichungen** (Details in `_agent/staging/T-20261022-01/ERGEBNIS.md`):
  - Ein unbekannter Produkt-Handle in Großbuchstaben bekommt auf Apache direkt 404.
  - zod zählt Längen in Code Points.
  - Fehlt die Konfiguration, antwortet der Endpunkt mit 503 statt 403.
  - Nur S4-Fehler stoppen den Deploy.
- **Offen:**
  - Q3, die Abnahme gegen `https://royalspices.de` nach dem Umzug.
  - Der S10-Befund „Große Wirkung“ auf `/` (Inhaltsfrage).
  - Ein Shopify-Webhook für sofortigen Neubau (Folgearbeit).
  - Der erste echte Lauf, nach einem Push auf `prod` mit gesetzten Secrets.
- **Backup:** `_agent/staging/T-20261022-01/backup/`.

# Stand 22.10.2026 — Bar-Video im Business-Block (T-20261021-30, -31, -33, -34, -35)

- **Übernommen (Freigabe des Nutzers), nicht in `dev`, kein Push:** Der Film des Kunden (Barszene mit Safran-Cocktail, endet auf dem 0,5-g-Glas) läuft auf der Startseite in S9 und auf /b2b/ unter „Zusammenarbeit“. Er startet stumm ab halber Sichtbarkeit, hat einen Knopf „Ton an“, spielt einmal und bleibt auf dem Glas stehen. Bei reduced motion gibt es kein Autoplay.
- **Dateien:**
  - `pipeline/video/build-video.mjs` (`npm run assets:video`), `src/data/videos.json`, `public/video/` (AV1/H.264 × 1080/720, 31,2 MB, VMAF ≥ 95,6 / 1-%-Tief ≥ 85,1, −16 LUFS, 30 fps)
  - Poster `bar-poster`
  - `server-static.mjs` (Range/206 für `.mp4`)
  - `src/components/InlineVideo.astro`, `src/scripts/inline-video.ts`
  - Tests `server-range`, `inline-video`
- **Geprüft:** `npm test` 210/210, `astro check` 0/0/0, Build grün, keine CSP-Meldung. Poster und Video laden erst nahe am Bild, vor dem ersten Scrollen nur, wenn das Video schon zu sehen ist. 1,5 kB JS.
- **Gemessen (T-20261021-34, 22.10., Bericht `_agent/staging/T-20261021-34/ERGEBNIS.md`):** Startseite: vor dem Scrollen keine Anfrage auf `/video/` oder `bar-poster`, danach eine Datei mit 206. H.264 im Browser erzwungen: h264-1280 (desktop) bzw. h264-1920 (mobil), spielt. `perf.mjs`: `/` CLS 0,0002 wie am 19.10., TBT 0 ms in allen Profilen. /b2b/: CLS 0 (desktop und mobil, mit Laden und Abspielen). Verhalten: Autoplay ab 50 %, Pause außerhalb und im versteckten Tab (echt geprüft, Fenster minimiert), keine Fortsetzung nach Nutzerpause, Ende bleibt stehen, Ton, reduced motion. `live-text.mjs --ohne-store` 0 offen. `a11y.mjs`: keine Befunde vom Video.
- **Nachgebessert (T-20261021-35, 22.10., übernommen, Bericht `_agent/staging/T-20261021-35/ERGEBNIS.md`):**
  - B2: Keine abgebrochene Zusatzanfrage mehr. Es kommt je genau eine Videodatei, auf beiden Seiten, desktop und mobil, AV1 und H.264.
  - B3, Variante A nach Wahl des Nutzers: Das Poster steht in einem `<template>`, ohne JS in `<noscript>`. Vor dem ersten Scrollen gibt es auf /b2b/ und `/` keine Anfrage auf `/video/` oder `bar-poster` (desktop, mobil slow 4G, Tablet).
  - B4: Der Fokus geht am Filmende vom Abspielknopf auf „Noch einmal“, sonst gibt es keinen Fokusraub.
  - Verhalten, CLS (/b2b/ 0), `perf.mjs` (TBT 0 ms), a11y und Live-Text sind unverändert.
  - Geändert: `src/scripts/inline-video.ts`, `src/components/InlineVideo.astro`, `docs/QA.md`. Backup in `_agent/staging/T-20261021-35/backup/`.
- **Offen:** B6 (Altbefund, nicht beauftragt): Ohne JS deckt das native Video das Poster mit einer dunklen Fläche zu. Safari/iOS prüft der Nutzer beim Messtermin P3/P4. Nach `dev` geht das Video mit Übertrag A. Übergabe: `docs/UEBERGABE-VIDEO.md`.
- **Nicht Video, aber bei T-34 gefunden:** B1: Die Windows-Animationseffekte sind aus. Headless Edge meldet daher `prefers-reduced-motion: reduce` und zeichnete nur mit etwa 32 Hz. QA-Läufe ohne Emulation messen so den Standbild-Weg, und Bildtakt-Messungen lassen sich nicht mit früheren vergleichen. B5: Der Brotkrumen-Link „Start“ ist mobil 33 × 44 px (`a11y.mjs` Exit 1 auf 11 Seiten).

# Stand 21.10.2026, vormittags — Flüssig: keine Fragmente beim schnellen Scrollen (T-20261020-01/-02)

- **Übernommen am 21.10. (Freigabe des Nutzers), nicht in `dev`, kein Push:** `src/scripts/journey.ts`, `src/scripts/journey-flow.ts`, `tests/journey-flow.test.mjs`, `tools/qa/{flow-gl,flow-check}.mjs`. Backups liegen in `_agent/staging/T-20261020-0{1,2}/backup/`.
- **Was sich ändert:** Der Warp läuft nur noch bis Bildabstand 2. Liegen die Bilder weiter auseinander, zeigt der Player ganze Bilder. Neue Diagnose `data-journey-frame` am Canvas. Neue Prüfungen: `flow-gl.mjs --fast` (N1–N3) und `flow-check.mjs --stride` (Splitter je Abstand und t).
- **Erfüllt:** N1–N5. Für N1 offline hat der Nutzer Entscheidung (a) getroffen. Geprüft: `npm test` 191/191, `astro check` 0 Fehler, Build ok. Konsolenläufe: `--fast` ok, `--f2` P1 143 fps und P2 112 fps, je 100 % Warp, die einzige Spitze am Wendepunkt ist ein Altbefund.
- **Offen:** Treppenkanten des Warps in Bewegung. Option (a) MSAA + weiche Gewichte ist im Bau als T-20261021-01/-02, siehe `docs/UEBERGABE-FLUESSIG.md`.

# Stand 19.10.2026, 23:30 — Live-Bilder in V1 (T-20261019-07)

- **Übernommen (Freigabe des Nutzers, L1–L4, K1–K9), nicht in `dev`, kein Push:** Logo von royalspices.de in Kopf (44 px hoch) und Fuß (56 px, Schrift hell), freigestellt beim Erzeugen; goldene Blüte als Markenzeichen S4; 1-g-Produktfoto als Ersatzbild ohne Store (Kollektion, Produktseite 1 g); Safranfäden-Foto für S6 eingebaut, aber erst mit `LIVE_THREADS_LICENSED=1` sichtbar (`src/config/launch.ts`).
- **Geprüft:** `npm test` 177/177, `astro check` 0/0/0, Build grün, `live-text.mjs --ohne-store` 0 offene Abweichungen, kein Verweis auf das Shopify-CDN für diese Bilder, größte AVIF 97 kB, Logogrund ΔE ≤ 0,39 gegen Kopf- und Fußhintergrund, 375 px ohne Überlauf, `perf.mjs` mobil TBT 0 ms, LCP Startseite 628 ms (vorher 704 ms), geschützte Dateien und alte `stills.json`-Einträge gleich. Screenshots: `_agent/staging/T-20261019-07/shots/`.
- **Offen:** Lizenz für `saffron_threads` beim Kunden klären, dann `LIVE_THREADS_LICENSED=1` beim Build setzen.

# Stand 19.10.2026, abends — Flüssig B1, R7 relativ zum Grundtakt (T-20261019-04)

- **Übernommen 19.10. abends (Freigabe des Nutzers), noch nicht in `dev`, kein Push:** `src/scripts/journey-flow.ts`, `tests/journey-flow.test.mjs` (5 neue Tests), `tools/qa/flow-gl.mjs`, dazu `docs/{STATUS,UEBERGABE-FLUESSIG}.md`. `journey.ts` und `HomeJourney.astro` unverändert.
- **Was sich ändert:** Der Wächter R7 schaltet den Warp nicht mehr bei einer festen Grenze von 22 ms ab, sondern relativ zum Grundtakt G des Geräts: Grenze = max(22 ms, 22 / 16,7 × G). G misst das Flow-Modul selbst, mit einer kurzen rAF-Messung ab dem ersten `load()`: 30 gültige Intervalle (ohne Warp-Bilder und ohne Lücken über 250 ms), davon das 25. Perzentil. Danach endet die Messung von selbst. Unverändert bleiben das Fenster von 2 s, der Neubeginn nach einer Pause und „aus bis zum Neuladen“.
- **Wirkung:** 30 Hz (G = 33,3 ms): Grenze 43,9 ms. Der Warp bleibt an und geht erst aus, wenn er das Gerät unter etwa 23 fps drückt. 60 Hz und schneller: 22 ms wie bisher. Solange G fehlt: 22 ms. Der Faktor ist genau 22 / 16,7 (≈ 1,317) statt 1,32, vom Nutzer freigegeben, damit 60 Hz genau bei 22 ms bleibt.
- **Erfüllt (W1–W7):** W1 30 Hz, nachgebildet mit `--hz30`: P1 und P2 ohne Warp je 33,3 ms, Warp 99,8 % bzw. 99,7 %, mit Warp 33,3 ms. W2 R7 greift bei Last weiter: 30 Hz nach 2,03 s, nativ nach 2,73 s. W3/W4 `npm test` 177/177, `astro check` 0/0/0, Build grün. W5 K1–K3 und K7 nicht schlechter, geschützte Dateien MD5-gleich. W6 (F2 nativ): ≥ 55 fps und ≥ 95 % Warp erfüllt (P1 etwa 144 fps, P2 etwa 112 fps, je 100 % Warp). Der Höchstwert liegt am Wendepunkt bei 34,7–34,9 ms, ohne -04 genauso (Gegenprobe). Das ist der bekannte Altbefund aus -07, vom Nutzer angenommen. W7 die Kurzmessung endet von selbst, in Ruhe kein rAF, `perf.mjs` mobil TBT 0 ms.
- **Prüfwerkzeug `flow-gl.mjs`:** neu `--hz30` (30-Hz-Gerät als Fahrplan), `--slow-warp <ms>` (Last je Warp-Bild) und `--idle` (W7). Bildtakt nur lokal an der Konsole messen, nicht per Remotedesktop. Details in `docs/UEBERGABE-FLUESSIG.md`.
- Danach wie bisher: P3 (Laptop) und P4 (Android) misst der Nutzer vor dem Übertrag nach `dev` und dem Push (E2). -12 (Shopify B2) kann starten.

# Stand 19.10.2026, nachmittags — Flüssig B1 Teil 2 (T-20261018-07, Player) übernommen

- **Übernommen 19.10. nachmittags (Freigabe des Nutzers), noch nicht in `dev`:** `src/scripts/journey-flow.ts` (neu, WebGL2-Warp mit Rückfall auf Überblenden), `src/scripts/journey.ts` (Anbindung), `tests/journey-flow.test.mjs` (9 Tests), `tools/qa/flow-gl.mjs` (Prüfwerkzeug), dazu `docs/{ASSETS,STATUS,UEBERGABE-FLUESSIG}.md`. `HomeJourney.astro` unverändert (E1).
- **Erfüllt:** K1 (GPU gleich Referenz, Mittel ≤ 0,106/255, p99 1/255), K2 (Ruhebild mit und ohne `?flow=off` pixelgleich), K3 (Rückfälle R1–R6), K4 (Bildtakt F2 auf der RX 9070, lokal an der Konsole: desktop 143,8 fps, Telefon-Profil mit CPU 4× 114,0 fps, je max. 27,8 ms und 100 % der bewegten Bilder im Warp), K5 (mobil TBT 0 ms, LCP 704 ms, CLS 0,0002; Flow-Daten nach der ersten Ladestufe, 8,4 % bzw. 11,9 % des Bewegungssatzes), K6 (`npm test` 172/172, `astro check` 0/0/0, Build grün), K7 (`journey.mjs` 72/72, MD5 der geschützten Dateien gleich).
- **Messwerkzeug:** In `flow-gl.mjs --f2` scrollt das Telefon-Profil per Maus-Geste, weil eine synthetische Touch-Geste in headless Edge nicht scrollt. Der Lauf prüft jetzt, dass die Seite wirklich scrollt. Per Remotedesktop ist F2 nicht messbar (30 Hz, Animationen aus).
- **Offen als Folge-Transaktion (erledigt durch T-20261019-04, siehe oben):** Der Wächter R7 schaltet den Warp auf Geräten mit 30-Hz-Grenze ab (z. B. Chrome-Energiesparmodus). Besser wäre eine Grenze relativ zum Takt, den das Gerät ohne Warp erreicht.
- Danach: P3 (Laptop) und P4 (Android) misst der Nutzer vor dem Übertrag nach `dev` und dem Push (E2), Befehle in `docs/UEBERGABE-FLUESSIG.md`. -12 (Shopify B2) kann starten.

# Stand 19.10.2026 — Übertrag Glas und Shopify-Fixes nach `dev`

Nachtrag: Nach Freigabe des Nutzers gepusht, `dev` = `origin/dev` = `b44cb1b`. Der Pages-Deploy lief am 19.10. um 02:45 erfolgreich (Actions-Lauf 39182125942); ausgeliefertes Hero- und Standbild MD5-gleich mit dem Projekt. Dieser Nachtrag ist noch nicht in `dev`, er geht mit dem nächsten Übertrag mit. `gh` ist auf diesem PC nicht installiert; den Lauf zeigt `https://api.github.com/repos/Koulner/royal-spices/actions/runs?branch=dev`.

**T-20261019-01:** zwei Commits im Desktop-Klon `C:\Users\lukas\Desktop\royal-spices\royal-spices` (Branch `dev`, Basis `5633590` = `origin/dev`). Die Hashes stehen in `_agent/LOG.md`.
- **Commit 1, Glas:** T-20261018-03 (`pipeline/blender/{web_hero,saffron_fill}.py`, c2-Konstanten) und die Ausgabe der Queue c2 vom 18.10. (`public/hero/5/**` mit 2.680 Bildern, `public/img/**` mit 54, `public/og.jpg`, `src/data/{hero-manifest,stills}.json`), dazu `docs/{ASSETS,UEBERGABE-E3-DEMO}.md`. 2.741 Pfade.
- **Commit 2, Shopify-Fixes:** T-20261018-09 (B6), -10 (B3 + B5), -11 (B4) und -13 (B1a), dazu diese Statusdatei. 21 Pfade, 5 davon neu. T-20261018-12 (B2) ist noch offen und wartet auf den Flüssig-Player T-20261018-07.
- **Nicht dabei:** `docs/UEBERGABE-FLUESSIG.md` und Flüssig B1 (T-20261018-06, -07, -08), weil sie noch nicht übernommen sind.
- **Vorher auf H: geprüft:** `npm test` 158/158, Build mit `astro check` 0/0/0. Hero angesehen quer (1440 × 900) und hoch (375 × 812) bei p 0,9 und p 1: Glas klar, Füllung rot, kein Schleier; keine Konsolenfehler, kein kaputtes Standbild.
- **Im Klon geprüft** (`package-lock.json` unverändert, daher kein `npm ci`): `npm test` 158/158, Build wie in der CI (`SITE_URL` = Pages-Origin, ohne Store) mit `astro check` 0/0/0, Pages-Kopie grün. Schlüsselsuche leer, keine ignorierten Dateien im Commit.
- **Noch nicht gepusht.** Ein Push auf `dev` startet den Pages-Deploy, also nur nach Freigabe des Nutzers. Die Grundpreis-Wache aus B4 kann den Deploy nicht blockieren, weil die CI ohne Store baut.

# Stand 18.10.2026, abends — Übertrag der Shopify-Fixes nach `dev`, gepusht

Nachtrag: Nach Freigabe des Nutzers gepusht, `dev` = `origin/dev` = `5633590`. Der Pages-Deploy lief am 18.10. um 19:18 erfolgreich (Actions-Lauf 39148951553). Dieser Nachtrag ist noch nicht in `dev`, er geht mit dem nächsten Übertrag mit.

T-20261018-01 und -02 als **T-20261018-04** in den Desktop-Klon `C:\Users\lukas\Desktop\royal-spices\royal-spices` übertragen (Branch `dev`). Vorher `git pull --ff-only` von `01a5d94` auf `1d7954a` = `origin/dev`. Ein Commit mit 14 Pfaden (4 neu, 10 geändert, keine gelöscht): `astro.config.mjs`, `src/lib/commerce/{rich-text,catalog,storefront,types}.ts`, `src/components/product/{ProductDescription,DescriptionInline}.astro`, `tests/{build-env,commerce,rich-text}.test.mjs`, `tests/fixtures/storefront-products.json`, `docs/{SHOPIFY,STATUS,UEBERGABE-SHOPIFY}.md`. Commit-Hash in `_agent/LOG.md`.
- **Bewusst nicht dabei:** `docs/UEBERGABE-E3-DEMO.md` (Wunsch des Nutzers) und die Glas-Übernahme T-20261018-03 (`web_hero.py`, `saffron_fill.py`, `ASSETS.md`), die erst nach dem Kopieren auf H: kam. Beides geht mit dem nächsten Übertrag.
- Im Worktree geprüft: `npm ci`, `npm test` 132/132, Build wie in der CI (`SITE_URL` = Pages-Origin, ohne Store) mit `astro check` 0/0/0, Pages-Kopie grün. Schlüsselsuche leer, keine ignorierten Dateien im Commit.
- Das Repo ist öffentlich, ein Push auf `dev` startet den Pages-Deploy. Push nur nach Freigabe des Nutzers.
- In Git Bash `MSYS_NO_PATHCONV=1` vor `tools/pages/prepare.mjs --base /royal-spices` setzen, sonst wird der Pfad zu `C:/Program Files/Git/...`.

# Stand 18.10.2026 — Prüfung von `dev`, Shopify-Fixes T-20261018-01 und -02

Der Nutzer hat `origin/dev` (`1d7954a`) am 17.10. prüfen lassen: sauber gebaut, `npm test` 115/115, gegen den echten Store aber noch nie gelaufen. Zwei Fehler waren per Build belegt. Der Nutzer hat ihre Behebung freigegeben; beide sind übernommen (Stand je ID in `_agent/LOG.md`).
- **T-20261018-01 (CSP mit `.env`):** `astro.config.mjs` liest die Store-Domain über `loadEnv`. Damit stimmen `connect-src` und `img-src` auch, wenn die Werte nur in `.env` stehen. Test: `tests/build-env.test.mjs`.
- **T-20261018-02 (Produktbeschreibung):** Bisher zerfiel die Beschreibung zu einem verklebten Absatz („…im kleinen Glas.Herat Negin…“), sobald der Kunde den Text in Shopify änderte; Meta und JSON-LD ebenso. Jetzt kommt die Struktur aus `descriptionHtml`, beim Build in reinen Text zerlegt (`src/lib/commerce/rich-text.ts`, nie HTML in die Seite). Build mit geänderter Fixture: h2, h3 und Liste wie gewohnt, genau eine `h1`, kein „Glas.Herat“ in Seite, Meta oder JSON-LD. Details in `docs/SHOPIFY.md`, „Stand 18.10.2026, Produktbeschreibung“.
- Im Projekt `npm test` 132/132, `astro check` 0/0/0. Build mit Fixture-Store: `live-text.mjs` meldet 0 offen. Build ohne Store grün.
- Weitere Befunde der Prüfung sind noch nicht beauftragt: kein automatischer Neubau, Handles fest im Code, nur die erste Variante kaufbar, Grundpreis fehlt, API-Version, `seo.mjs` liest nur die Prozessumgebung. Sie stehen in `docs/UEBERGABE-SHOPIFY.md`, Abschnitt „Wiedereinstieg (Stand 18.10.2026)“.
- T-01 und T-02 liegen nur auf H:, noch nicht in `dev`.

# Stand 17.10.2026, spätabends — Übertrag nach `dev`, gepusht

Nachtrag: `origin/dev` war beim Push schon `01a5d94` (10.10., ältere Glas-Dateien, alle vom Projekt überholt). Der Nutzer hat ihn gemergt (`1d7954a`, Baum identisch mit `69d7a18` und dem Projekt) und gepusht; der Pages-Deploy für `1d7954a` lief am 17.10. um 18:30 erfolgreich. `dev` = `origin/dev` = `1d7954a`. Dieser Nachtrag selbst ist noch nicht in `dev`, er geht mit dem nächsten Übertrag mit. Vor jedem Übertrag erst `git fetch` und `git status -sb` im Worktree prüfen.

Stand von `royal-spices-v1/` als **T-20261017-11** in den Worktree `royal-spices/royal-spices/` übertragen: Commit `a94d591` auf `dev` (Basis `cc4bb4a` = `origin/dev`), 917 Pfade (50 neu, 862 geändert, 5 gelöscht), davon 820 neu gerenderte Hero- und Standbilder. Vorher geprüft: `npm test` 115/115, Build wie in der CI (`astro check` 0/0/0, Pages-Kopie) grün, keine Schlüssel, keine ignorierten Dateien im Commit. `.gitignore` ignoriert jetzt `__pycache__/`.
- **Noch nicht gepusht.** Das Repo `Koulner/royal-spices` ist öffentlich, ein Push auf `dev` startet `.github/workflows/static.yml` (GitHub-Pages-Vorschau, ohne Store, also ohne Preise). Push nur nach Freigabe des Nutzers.
- Git auf E: (exFAT) meldet „dubious ownership“: Befehle mit `git -c safe.directory=* -C <Pfad>` aufrufen, ohne globale Änderung.
- Übertrag künftig: `robocopy royal-spices-v1 royal-spices\royal-spices /E /XD node_modules dist dist-pages .astro .raw .data __pycache__ .git /XF .env`, im Projekt gelöschte Dateien per `git rm`, dann `git add -A` und die gestagte Liste gegen den Vergleich `--work-tree=royal-spices-v1` prüfen.

# Stand 17.10.2026, spätabends — Shopify-Restpunkte erledigt (M1, M5, M7, Auslieferung)

Auftrag des Nutzers: die begonnenen Shopify-Anpassungen zu Ende bringen. Umgesetzt im Hauptchat als **T-20261017-09** und **-10**, geprüft und übernommen (`_agent/LOG.md`).
- **T-20261017-09:** Interne Hinweise (O4, O5, Wakhan-Notiz, ENTWURF und 8 PRÜFEN-Marken im Datenschutz) stehen nur noch im Quelltext (`{/* … */}`), das ausgelieferte HTML hat keine Kommentare mehr, auch nicht im Build mit Store. `tools/qa/axtree.mjs` prüft wieder den heutigen Stand (h1 aus SEO-B, Menü wie Live): 19/19 ok. `LabelSheet.astro` und die nur dort genutzten Daten sind entfernt.
- **T-20261017-10 (M1):** `tools/qa/live-text.mjs` (+ `tools/live/{compare,rules}.mjs`, 10 Tests) vergleicht den Live-Text wörtlich mit dem Build. Mit Fixture-Store 28 Zeilen, 0 offene Abweichungen; der Sprunglink heißt jetzt wie Live „Direkt zum Inhalt“. Stand je Zeile in `docs/LIVE-INVENTAR.md`.
- **M5** (keine Schlüssel im Projekt) und **M7** (CSP nur `self`, Store-Domain, `cdn.shopify.com`; Shopify-Texte per `textContent`) geprüft, erfüllt.
- Im Projekt `npm test` 115/115, Build 0/0/0.
- **A1–A4** vom Nutzer am 17.10. bestätigt; in `docs/LIVE-INVENTAR.md` stehen jetzt alle Zeilen auf `geprüft`, außer K4 (entfällt, O3) und Q9 (Datenschutz-Entwurf, Freigabe durch den Kunden). **Offen beim Kunden:** O1 Hosting/Domain, O2 SMTP, O4 Newsletter, O6 Shopify-Korrekturen und Rechtstexte, O7 Headless-Kanal und Storefront-Schlüssel, Grundpreis 0,5 g, PRÜFEN-Marken Datenschutz; danach Build gegen den echten Store und Testkauf (M9). Wiedereinstieg: `docs/UEBERGABE-SHOPIFY.md`, Abschnitt „Stand 17.10.2026“.

# Stand 17.10.2026, abends — SEO-Folgetransaktionen freigegeben, SEO-R, SEO-D, SEO-A, SEO-B und SEO-C übernommen, dazu S9 TBT

Der Nutzer hat am 17.10. den Plan SEO-R/D/A/B/C freigegeben, dazu E5–E7 und den Vorschlag zur `h1` (Augenbraue „ROYAL SPICES · SAFRAN AUS HERAT, AFGHANISTAN“ als `<span>` in der `h1`). IDs: **T-20261017-03** SEO-R, **-04** SEO-D, **-05** SEO-A, **-06** SEO-B, **-07** SEO-C, nacheinander (Entscheidung 4). Stand je ID in `_agent/LOG.md`.
- **T-20261017-03 (SEO-R) übernommen:** `/collections/frontpage` → 301 `/produkte/`. Im Projekt `npm test` 94/94; Nachmessung `seo.mjs --redirects` 33/35, nur die 2 absichtlichen 404 als Hinweis. S4 ist damit vor dem Launch erfüllt.
- **T-20261017-04 (SEO-D) übernommen:** `Base.astro` mit `serializeJsonLd`, Props `ogType` und `ogImage` (Maße nur, wenn bekannt), `max-image-preview:large` auf indexierbaren Seiten, PNG-Favicons 48/96/192 + `apple-touch-icon`; neu `src/components/Breadcrumbs.astro` (sichtbar + JSON-LD), `pipeline/images/build-favicons.mjs`, `tests/favicons.test.mjs`. Im Projekt `npm test` 100/100; `seo.mjs` nur noch 2 Fehler (S2 `WebSite`, S10). S9 Labor mobil: LCP ≤ 1,4 s, CLS ≤ 0,0002, TBT nicht gemessen.
- **T-20261017-05 (SEO-A) übernommen:** Produktseiten mit `buildProduct` (`sku` = `mpn` aus `firstVariant.sku`, Offer mit `itemCondition`), Brotkrumen über `Breadcrumbs.astro`, `og:type=product`, `og:image` mit Maßen (Shopify-Zuschnitt 1200 × 630, wenn die Quelle groß genug ist, sonst `og.jpg`; heute 1 g Zuschnitt, 0,5 g `og.jpg`). `/produkte/` mit Brotkrumen und freigegebener Beschreibung (134 Zeichen, E5). Im Projekt `npm test` 105/105; `seo.mjs` weiter 2 Fehler, 11 Hinweise; Build mit Fixture-Store geprüft.
- **T-20261017-06 (SEO-B) übernommen:** Startseite mit `buildOrganization` (`OnlineStore`, ohne Versand und Rückgabe, E7) und `buildWebSite` statt Inline-Schema; die Augenbraue „ROYAL SPICES · SAFRAN AUS HERAT, AFGHANISTAN“ ist jetzt die erste Zeile der `h1` (`span`, als Block). Desktop optisch gleich (≤ 0,5 px), auf dem Handy bricht die Augenbraue in zwei Zeilen um (vom Nutzer so entschieden). `npm test` 105/105; `seo.mjs` nur noch 1 Fehler (S10).
- **T-20261017-07 (SEO-C) übernommen:** Brotkrumen auf den 9 Unterseiten (B2B, Catering, Datenschutz, FAQ, Herkunft, Impressum, Kontakt, Über uns, Versand), `Service`-Schema auf `/catering/` (Hamburg aus `site.ts`), Titel und Beschreibungen in S1-Länge (vom Nutzer freigegeben, E5). `npm test` 105/105; `seo.mjs` 1 Fehler (S10), S1 ohne Hinweise.
- **T-20261017-08 (S9 TBT) übernommen:** `tools/qa/perf.mjs` misst TBT (Long Tasks ab FCP bis zu 5 s Ruhe, Gegenprobe 300 ms → 250 ms). Labor mobil TBT 0 ms auf `/`, Produktseite und `/kontakt/`, LCP ≤ 1292 ms, CLS ≤ 0,0002: **S9 im Labor erfüllt**. `npm test` 105/105.
- Damit sind alle SEO-Folgetransaktionen R/D/A/B/C und S9 übernommen. Offen: S10 (Urteil des Kunden, E6), E7 (Versand/Rückgabe im `OnlineStore` nach Bestätigung), Launch-Lauf mit Store und `SITE_INDEXABLE=1`. Wiedereinstieg: `docs/UEBERGABE-SEO.md`, Abschnitt „Wiedereinstieg (Stand 17.10.2026, nach SEO-C)“.

# Stand 17.10.2026, nachmittags — SEO S0 übernommen

S0 ist abgeschlossen: **T-20261017-01** (S0a: `src/lib/seo/schema.ts`, `tests/seo-schema.test.mjs`, `docs/SEO.md`) und **T-20261017-02** (S0b: `tools/qa/seo.mjs`, `tools/seo/{checks.mjs,indexnow.mjs,legacy-urls.txt}`, `tests/seo-checks.test.mjs`) sind geprüft und übernommen. Im Projekt läuft `npm test` mit 94/94 grün, der Build in der Prüfkopie ist grün. Die erste Messung mit `seo.mjs` steht als Status S1–S11 in `docs/SEO.md`, Abschnitt 4:
- Lücken: S2 (`WebSite` auf der Startseite fehlt), S4 (`/collections/frontpage` liefert 404), S8 (PNG-Favicons fehlen)
- offen: S10 („Große Wirkung.“, Urteil des Kunden), S9 (nicht gemessen)
- erfüllt: S3, S6 und S11, dazu S5 und S7 vor dem Launch

Offener Auftrag: **`docs/UEBERGABE-SEO.md`**, Abschnitt „Wiedereinstieg (Stand 17.10.2026, nach S0)“. Dort steht der Entwurf der Folgetransaktionen SEO-R/D/A/B/C mit den Entscheidungen E5–E7, noch nicht freigegeben.

# Stand 17.10.2026 — SEO S0 neu gestartet

S0 vom 16.10. (T-20261016-01 und -02) wurde vor dem Chatwechsel gestoppt und hat nichts erzeugt (im LOG jetzt `VERWORFEN`). Neu gestartet als **T-20261017-01** (S0a Schema und Doku) und **T-20261017-02** (S0b Prüfwerkzeuge), Kriterien unverändert aus `docs/UEBERGABE-SEO.md`, Abschnitt „S0“, angepasst an den Stand nach Shopify A–D. Stand in `_agent/LOG.md`. Die Website hat seit 16.10. du-Anrede und keine doppelten Kontaktdaten auf `/kontakt/` mehr (T-20261016-07). Die Glas-Demo steht unverändert bei `docs/UEBERGABE-E3-DEMO.md`, „Stand 16.10.“.

# Stand 16.10.2026, 16:30 — Shopify A–D übernommen (headless, Preise aus Shopify)

Produktliste und Produktseiten kommen per Handle aus der Storefront API (`src/lib/commerce/catalog.ts`, ohne Store mit Anfrageweg), die Startseite zeigt die Live-Abschnitte mit der V1-Journey, alle Seiten tragen den Live-Text plus belegte V1-Inhalte, `/b2b/`, `/faq/` und `/versand-lieferung/` sind neu, die früheren Seiten Handel und Gastronomie sowie die alte 1-g-Produktseite leiten per 301 weiter (`src/config/redirects.mjs`, `server.mjs`), der Kopf ist `sticky`. `npm test` 38/38, Build grün, Browser geprüft. Restverweise auf die alten Seiten sind bereinigt, `Journey.astro` ist entfernt (T-20261016-08). Offener Auftrag: **`docs/UEBERGABE-SHOPIFY.md`**, Abschnitt „Stand 16.10.2026, Ende Hauptchat 4“ (Kundenfragen, Punkte vor dem Deploy; Anrede du und Kontakt-Dopplung erledigt in T-20261016-07). Transaktionen: `_agent/LOG.md`.

# Stand 16.10.2026 — SEO-Masterplan freigegeben, S0 läuft

Offener Auftrag: **`docs/UEBERGABE-SEO.md`** (technisches SEO, Ratgeber-Hub, Offpage und Local, Messung nur über Server-Logs, alles DE/EU-konform). Die Entscheidungen 1–4 und die Musskriterien S1–S11 sind freigegeben. S0 lief als T-20261016-01 (Schema und Doku) und T-20261016-02 (Prüfwerkzeuge); beide wurden ohne Ergebnis gestoppt und am 17.10. neu gestartet (siehe oben). Shopify A–D sind seit 16.10. übernommen; die SEO-Ergänzungen dazu folgen als Folgetransaktionen.

---

# Stand 07.10.2026, 23:40 — Glas und Füllgut naturtreu: Kriterien freigegeben, Umsetzung in Arbeit (unterbrochen)

Offener Auftrag: **`docs/UEBERGABE-GLAS.md`**, Abschnitt „Wiedereinstieg“. Die Kriterien sind freigegeben, und zwei Transaktionen haben einen Zwischenstand in `_agent/staging/` (siehe `_agent/LOG.md`). Im Projekt ist noch nichts übernommen, kein Blender läuft.

---

# Stand 06.10.2026, 23:30 — Umzug auf den PC mit RX 9070, Rendern auf der Grafikkarte

Ergänzt die Übergabe von 20:25 (darunter). Deren Liste „Fehlt noch" gilt weiter, mit den Änderungen hier. **Abgenommen ist nichts.**

## Dieser Rechner

- AMD Radeon RX 9070, Ryzen 7 5700X (8 Kerne), 32 GB RAM. Projekt unter `H:\royal-spices`. **Auf H: sind nur rund 18 GB frei.**
- Blender 4.5.14 LTS liegt entpackt unter `F:\3D\Blender\Blender 4.5\` (Zip von blender.org, Prüfsumme geprüft). Direkt in `F:\3D\Blender\` liegt Blender 5.1 des Auftraggebers: nicht anfassen, das Projekt nicht damit rendern (der Master ist 4.5 LTS).
- `pipeline/blender/render.sh` sucht Blender erst unter dem Pfad des Laptops, dann unter `F:\3D\Blender\Blender 4.5\`. `BLENDER=…` geht weiter vor.
- **Jeder Renderaufruf hier braucht `RS_DEVICE=HIP`**, sonst rendert er auf der CPU. Gemessen mit dem Testbild aus dem Nachtrag 22:45 (1920 × 1080, 64 Samples): Grafikkarte 18,8 s, CPU dieses Rechners 110 s, Laptop rund 4 min. Grafikkarte und CPU ergeben dasselbe Bild (mittlere Abweichung 0,1 von 255 Stufen, `.raw/tests/gpu/`). In der Queue: 1920 × 1080 rund 15 s, 1440 × 810 rund 6 s je Bild.
- Node, npm und Git waren schon installiert, `node_modules` ist mitkopiert.
- Die Queue setzt jedes laufende `blender.exe` auf Leerlauf-Priorität, auch ein interaktiv geöffnetes Blender 5.1.

## Fehler an der Narbenspitze, behoben

Im ersten Bild in voller Auflösung (`.raw/desktop/0036.png`, 23:20) schwebte im geöffneten Narbenende ein Ring aus kurzen hellen Strichen. Ursache: Der Master hat je Narbenende 47 Papillen als eigene Kurvenobjekte (`Papilla_0_00` … `Papilla_2_46`) um das geschlossene Ende. `refine_stigma_ends` formt das Ende zur Trompete um, die Kurven blieben stehen. Jetzt blendet `refine_stigma_ends` sie aus; die Papillen des neuen Rands kommen aus dem Material. Vorher/nachher: `.raw/tests/gpu/papillae-vorher-nachher.png`. Eingetragen in `docs/ASSETS.md`.

Die Bilder, die bis dahin auf diesem Rechner gerendert waren (21 Basisbilder 29–49, 36 der Makro-Ansicht), liegen unter `.raw/prev-swing/papilla-dashes/`. Die zwei CPU-Bilder vom Laptop (`desktop/0029`, `0030`) liegen unter `.raw/prev-swing/cpu-laptop-desktop/`.

## Was läuft

`queue-large.sh`, neu gestartet um 23:25 mit `RS_DEVICE=HIP`, alle Stufen, Protokoll `.raw/queue-large.log`. Geprüft: Bild 0036 der neuen Fahrt hat keine Striche mehr. Schätzung aus den ersten Bildzeiten: fertig gegen 01:30.

Neustart des Rechners am 07.10. gegen 00:15, mitten in `l-d-sharp` (72 von 156 Bildern). Die zuletzt geschriebenen Bilder aller Ordner waren vollständig lesbar. Queue um 00:19 mit demselben Befehl wieder gestartet, Entwicklungsserver auf Port 4321 ebenfalls. Fertig voraussichtlich gegen 01:45.

Neu starten (z. B. nach einem Neustart des Rechners), vorher das zuletzt geschriebene Bild prüfen:

```bash
(RS_DEVICE=HIP nohup bash pipeline/blender/queue-large.sh >> .raw/queue-large.log 2>&1 &)
```

Die Bremse `.raw/queue-large.pause` wirkt nur beim Start der Queue, nicht zwischen den Stufen.

## Fehlt noch

1. Rendern abwarten und prüfen wie unter 20:25, Punkt 1.
2. Narbenspitze in voller Auflösung ansehen (20:25, Punkt 2), jetzt ohne die Striche: `.raw/desktop/0036.png`, `.raw/desktop-hold/0285.png`, Hochformat `.raw/mobile/0025.png` und `.raw/mobile-hold/`.
3. Weiter wie 20:25, Punkt 3. Performance-Messungen auf diesem Rechner sind nicht mit denen vom Laptop vergleichbar (andere CPU, anderer Bildschirm). Ob Port 4322 hier frei ist, ist nicht geprüft.

---

# Stand 06.10.2026, 20:25 — Narbe, Übergang und Hochformat überarbeitet, alles wird neu gerendert

Ersetzt die Übergabe von 18:40 (darunter, als Verlauf). Drei neue Rückmeldungen des Auftraggebers am Abend, alle drei im Code umgesetzt und an Testbildern geprüft. **Gerendert ist davon noch fast nichts. Abgenommen ist nichts.**

1. „Auf dem Handy ist die Sequenz nicht dieselbe wie auf dem Desktop." Ab dem Produkt (76 %) zeigt das Hochformat jetzt dieselben Einstellungen: Querformat-Sichtlinie, weiter zurück, Blüte, Glas und Fäden nebeneinander (`docs/sequenz-quer-hoch.png`).
2. „Beim Übergang Blüte → getrockneter Safran ist ein Szenensprung." Neuer Ausstieg aus der Makro-Ansicht (`leave_hold` in `web_hero.py`) und doppelter Scrollweg für diesen Abschnitt im Player (`docs/uebergang-narbe-faeden.png`).
3. „Bei der Nahaufnahme der Narbenspitze muss absoluter Realismus herrschen." Offene Trompete mit gezähntem Rand, durchscheinendes Gewebe (`refine_stigma_ends`, `docs/narbe-vorher-nachher.png`).

Begründungen und Werte: `docs/ASSETS.md` (Änderungen gegenüber dem Master, Tempo beim Scrollen), Rückmeldungen: `docs/QA.md`.

## Nachtrag 22:30 — Neustart des Rechners

Der Rechner wurde um 22:27 neu gestartet. Damit sind die alte Queue (`queue-inbetweens.sh`) und der veraltete Prozess 38260 weg; die Tabelle darunter ist überholt. Die Bilder der alten Queue bis 22:26 sind vollständig und lesbar geprüft (`.raw/desktop-fine`, `.raw/desktop-blur`). Ihre Stufen `m-hold`/`m-dwell` werden nicht nachgeholt; die neue Queue rendert dieselben Bilder in `s-m-base` und `s-m-dwell`.

- `.raw/queue-large.hold` gelöscht.
- `queue-large.sh` um 22:29 neu gestartet, ohne `RS_AFTER`, alle Stufen. Protokoll `.raw/queue-large.log`. Läuft ab `s-d-hold`.
- Startet der Rechner nochmals neu: dasselbe tun, also `(nohup bash pipeline/blender/queue-large.sh >> .raw/queue-large.log 2>&1 &)`, vorher das zuletzt geschriebene Bild prüfen.
- Zeitplan (Schätzung von 20:25, Start jetzt 22:29): Querformat am 07.10. gegen 13:30, alles gegen 22:30. Die alte Queue hätte realistisch bis gegen Mitternacht gebraucht; der Neustart spart diese anderthalb Stunden.
- Die Einschränkung „Zeilen 1–43 von `queue-large.sh` nicht ändern" gilt nur, solange die Queue läuft (sie liest das Skript stückweise).

### Rendern auf der Grafikkarte (vorbereitet 22:45, nicht ausprobiert)

Der Auftraggeber hat einen zweiten PC mit AMD RX 9070. `web_hero.py` liest jetzt `RS_DEVICE` (`HIP` für AMD, `OPTIX`/`CUDA` NVIDIA, `ONEAPI` Intel; ohne Variable wie bisher CPU). Findet Blender die verlangte Karte nicht, bricht das Rendern mit `RuntimeError` ab statt auf die CPU zurückzufallen. Vorige Fassung: `.raw/prev-swing/web_hero-before-gpu.py`. Geprüft: Syntax; auf diesem Laptop findet Blender keine nutzbare Karte (HIP, CUDA, OptiX, oneAPI leer), die laufende CPU-Queue ist nicht betroffen.

Umzug: Ordner `royal-spices-v1` und `Projektübergabe` nebeneinander kopieren, Blender 4.5, Git für Windows, Node.js installieren, `npm ci`. Testbild mit `RS_DEVICE=HIP bash pipeline/blender/render.sh --variant desktop --mode still --p 0.40 --res 1920x1080 --spp 64 --noise 0.03 --out .raw/tests/gpu --tag gpu` und mit demselben Bild von hier vergleichen. Dann die Queue dort mit `RS_DEVICE=HIP` starten. Bilder von CPU und Grafikkarte nicht in einer Fahrt mischen: die hier schon gerenderten Bilder dort neu rendern (Ordner vorher leeren).

## Was läuft (20:20, überholt durch den Nachtrag 22:30)

| Prozess | Was | Zustand |
| --- | --- | --- |
| `queue-inbetweens.sh` (PIDs 21388, 20984), Protokoll `.raw/queue-dwell.log` | Alte Queue von 16:44. Ihre restlichen Stufen (`d-hold-blur` … `m-blur-4`) rendern seit 19:58 mit der **neuen** `web_hero.py`. Brauchbar davon: `m-hold` und `m-dwell` (Hochformat in Endgröße); der Rest ist klein (960/540) und wird später durch große Bilder ersetzt | läuft, Ende sonst gegen 22:30. Der Auftraggeber wollte sie beenden (Befehle im Chat); die Berechtigungsprüfung lässt mich keine Prozesse beenden |
| `queue-large.sh` **PID 38260** (gestartet 18:30) | Hält eine **veraltete Fassung** des Skripts offen | hängt absichtlich an `.raw/queue-large.hold`. **Die Datei nicht löschen**, solange dieser Prozess lebt. Prozess beenden ist gefahrlos |
| `queue-large.sh` **PID 24388** (gestartet 20:08), Protokoll `.raw/queue-large.log` | Die neue Queue: Stufen `s-d-hold s-d-dwell l-d-into l-d-out s-d-open l-d-sharp s-d-reveal s-d-stills s-m-stills s-m-base s-m-dwell l-m-hold l-m-rest` (Skript, ab Zeile 44) | wartet auf `QUEUE-DONE` der alten Queue oder fünf Minuten ohne Blender. Bremse bei Bedarf: Datei `.raw/queue-large.pause` anlegen |

Geschätzte Dauer der neuen Queue, aus gemessenen Bildzeiten: Querformat vollständig nach rund 15 Stunden, alles nach rund 24 Stunden. Startet sie gegen 22:30, ist das Querformat am 07.10. gegen 13:30 fertig und alles am 07.10. gegen 22:30. Läuft sie früher an, entsprechend früher.

**Nicht ändern, solange PID 24388 wartet:** die Zeilen 1–43 von `pipeline/blender/queue-large.sh`. Bash liest das Skript stückweise; Änderungen davor verschieben, was es als Nächstes liest. Der Kopfkommentar dort beschreibt noch den Stand von 18:30; nach dem Lauf nachziehen.

Die Seite zeigt bis dahin den veröffentlichten Stand von 18:23. `build-hero.mjs` veröffentlicht eine Fahrt erst wieder, wenn alle ihre Basisbilder neu da sind (sonst „kept as published"). `build-stills.mjs` läuft in der Queue erst, wenn alle Quellen der Standbilder da sind. Alles Ersetzte liegt unter `.raw/prev-swing/` (alte `web_hero.py`, Manifest, Renderings).

## Geändert seit 18:40

- `pipeline/blender/web_hero.py` (Sicherung der vorigen Fassung: `.raw/prev-swing/web_hero.py`): `refine_stigma_ends()` und `_stigma_material()` (alle drei Narbenenden, Material); `stigma_macro(0.0)` vorher, damit die Makro-Pose vom unveränderten Ende abgeleitet wird; `EXIT`/`leave_hold()`; Hochformat-Schlüssel 0,76/0,90/1,00. Entwickelt in `.raw/tests/dev/` (`stigma_tip.py`, `mobile_keys2.py` rechnet die Hochformat-Posen aus).
- `src/data/journey.ts`: `slow`; Alt-Text des Narbenbilds (18:40). `src/components/Journey.astro`: `data-slow`, Höhe 849svh. `src/scripts/journey.ts`: Umrechnung Scrollweg ↔ Fortschritt.
- `tools/qa/browser.mjs`: `scrollToProgress`; `journey.mjs`, `axtree.mjs`, `shots.mjs` nutzen es.
- `pipeline/images/build-hero.mjs`: veröffentlicht keine halb gerenderte Fahrt.
- `pipeline/blender/queue-large.sh`: neue Stufen (siehe oben), Bremse `.raw/queue-large.pause`.
- Geprüft: `astro check` 0 Fehler; `tools/qa/journey.mjs` am Entwicklungsserver alle Prüfungen bestanden (`.raw/qa/journey-2015-dev.txt`); Umrechnung gemessen (`.raw/tests/dev/warp-check.mjs`: jeder Fortschritt kommt exakt an, Faktor 2,00 im Abschnitt, sonst unverändert); Testrenderings beider Formate mit der neuen `web_hero.py` (Standbild und unscharfes Sequenzbild) fehlerfrei.

## Fehlt noch

1. Rendern abwarten (beide Protokolle: `QUEUE-DONE`; nach `Error`/`Traceback` suchen). Bildzahlen: `.raw/desktop` 90, `.raw/mobile` 64, `.raw/desktop-hold` 43, `.raw/mobile-hold` 30, `.raw/desktop-blur-1440` 129, `.raw/desktop-fine-1440` 156, `.raw/mobile-blur-720` 238, `.raw/stills` 5 Dateien (`desktop_p0000`, `desktop_p1000`, `mobile_p0000`, `mobile_p1000`, `anatomy`).
2. **Narbenspitze in voller Auflösung ansehen**, sobald `s-d-hold` und `s-d-dwell` durch sind (`.raw/desktop/0036.png`, `.raw/desktop-hold/0285.png`). Realismus beurteilen, mit P01/P02 vergleichen. Stellschrauben in `refine_stigma_ends` (flare, depth, crenate, teeth) und `_stigma_material`.
3. Dann weiter wie 18:40, Punkte 2–7: Ausgabe von `build-hero.mjs`, Pulsieren, Build, Prüfskripte (Performance nur ohne Blender), Ansehen quer und hoch, `public/hero/3` und `/4` löschen, `docs/QA.md` (Datenmengen; die Seite ist jetzt 849svh hoch).
4. `.raw/queue-large.hold` löschen, sobald PID 38260 nicht mehr läuft.

---

# Stand 06.10.2026, 18:40 — zwei Renderläufe hintereinander (überholt durch 20:25)

Dieser Abschnitt ersetzt die Übergabe von 17:30 (darunter, als Verlauf). Kurz:

- **Vorgang A (Narbe):** Makro-Ansicht wird gerendert. Kapitelbild und Alt-Text sind nachgezogen.
- **Vorgang B („verpixelt / rauscht"):** Ursache gefunden und vom Auftraggeber entschieden: Die Zwischenbilder werden größer neu gerendert. Code ist fertig, das Rendern läuft.
- **Abgenommen ist nichts.** Performance ist erst messbar, wenn kein Blender mehr läuft.

## Was läuft

Zwei losgelöste Queues, nacheinander. Die zweite startet von selbst, wenn die erste `QUEUE-DONE` schreibt (oder fünf Minuten lang kein Blender läuft).

| Queue | Protokoll | Stufen | Stand 18:34 | Ende (geschätzt) |
| --- | --- | --- | --- | --- |
| `queue-inbetweens.sh` (seit 16:44, Übergabe 17:30) | `.raw/queue-dwell.log` | `d-dwell` (18 von 43), dann `d-hold-blur`, `d-pan-blur`, `d-hold-fine`, `m-hold`, `m-dwell`, `m-blur-2`, `m-blur-4` | `d-hold` fertig und veröffentlicht | 06.10. gegen 22:30 |
| `queue-large.sh` (neu, gestartet 18:30, wartet) | `.raw/queue-large.log` | `l-m-hold`, `l-d-into`, `l-d-out`, `l-d-sharp`, `l-m-rest` (Inhalt siehe Skriptkopf) | wartet | 07.10. gegen 12:00 (rund 13 Stunden, aus gemessenen Bildzeiten hochgerechnet: 105 s quer, 85 s hoch) |

- Die Stufen `d-hold-blur` bis `d-hold-fine` und `m-blur-2`/`m-blur-4` der ersten Queue rendern in 960/540, was die zweite danach in 1440/720 rendert (zusammen gut eine Stunde). Ich wollte die erste Queue nach `d-dwell` beenden; das Beenden der Prozesse hat die Berechtigungsprüfung abgelehnt. Schaden: nur Rechenzeit. Die kleinen Bilder dienen bis dahin als Zwischenstand.
- Jede Stufe beider Queues veröffentlicht sich selbst mit dem **geänderten** `build-hero.mjs` (nach `public/hero/5`). Bis alles durch ist, meldet es „still small" (Bilder der großen Sätze, die es nur klein gibt) und „not a release state".
- Prozesse erkennen: an der Befehlszeile `queue-inbetweens.sh` bzw. `queue-large.sh` (PowerShell: `Get-CimInstance Win32_Process` mit `CommandLine`). Anhalten: erst die Queue-Prozesse, dann Blender. Fortsetzen: denselben Befehl noch einmal starten, vorhandene Bilder werden übersprungen; das zuletzt geschriebene Bild prüfen (Größe 0 oder beschädigt: löschen).

```bash
(RS_AFTER=.raw/queue-dwell.log nohup bash pipeline/blender/queue-large.sh >> .raw/queue-large.log 2>&1 &)
```

## Vorgang B: Ursache und Entscheidung

- **Bildschirm des Auftraggebers:** Das Display dieses Laptops hat 2560 × 1600 Pixel bei 150 % Skalierung (Fenster rund 1707 CSS-Pixel breit). Die Diagnose von 17:30 hat mit 1920 Pixeln Breite gerechnet. Tatsächlich wurden die 960er-Bilder der Bewegungsebene **2,7-fach** gestreckt, die Bilder im Stillstand nur 1,3-fach.
- **Gezeigt in echten Gerätepixeln:** `docs/vergleich-bewegung-stillstand.png` (Headless Chrome, 1707 × 960 bei Faktor 1,5, `.raw/tests/noise/screen.mjs`). Im Stillstand scharf, in Bewegung weich und blockig.
- **Kein Effekt:** auch in CSS und Markup nicht (kein Korn, kein Filter, keine Mischmodi). Das stand um 17:30 nur für den Master fest.
- **Entscheidung des Auftraggebers (06.10., gegen 18:15):** Bewegungsbilder quer in 1440 × 810, hoch in 720 × 1280 neu rendern, mit gut 12 MB bzw. 6 bis 7 MB für die Fahrt auf leistungsfähigen Geräten. Schwächere Geräte behalten die kleinen Sätze.
- Das **Pulsieren** (jedes vierte Bild schärfer) verschwindet in den kleinen Sätzen von selbst, sobald alle Bilder aus großen Renderings verkleinert sind. Im großen Querformat-Satz bleibt es voraussichtlich in der Produktenthüllung (Positionen 528–712): Dort sind die Basisbilder in 1920 gerendert und werden auf 1440 verkleinert, die Zwischenbilder direkt in 1440. Messen und gegebenenfalls ausgleichen, siehe „Fehlt noch", Punkt 3.

## Geändert seit 17:30

- `pipeline/images/build-hero.mjs`: Pfad `/hero/5`; neue Bewegungssätze `d-1440m` (1440, Qualität 80) und `m-720m` (720, Qualität 80); Quellen `.raw/<Variante>-fine-<Breite>` und `-blur-<Breite>` haben Vorrang vor den kleinen Renderings, in allen Sätzen; meldet Bilder unter Sollbreite („still small"). Erster Lauf 18:23 bis 18:30 fehlerfrei (alle Sätze neu kodiert).
- `src/scripts/journey.ts` (`chooseSets`): Stufe High nimmt den großen Satz, wenn das Bild auf dem Schirm breiter als 1100 (quer) bzw. 620 (hoch) Gerätepixel ist. Geprüft: `astro check` 0 Fehler; Headless Chrome bei 1707 × 960, Faktor 1,5 wählt `d-1440m` und zeichnet ihn (`.raw/tests/noise/screen5/`).
- `tools/qa/journey.mjs`: prüft auf Stufe High den großen Satz.
- `pipeline/blender/queue-large.sh`: neu.
- `pipeline/blender/queue-all.sh`: Narben-Basisbilder 29–42 und 21–29, Makro-Ansicht beider Formate aufgenommen (Punkt 8 von 17:30).
- `public/img/stigma-*`, `src/data/stills.json`: Kapitelbild „Narbe" aus dem neuen `.raw/desktop/0036.png`, Zuschnitt unverändert passend (`npm run assets:stills`). `src/data/journey.ts`: Alt-Text beschreibt das neue Bild (Punkt 3 von 17:30).
- `docs/ASSETS.md`, `docs/QA.md`: Sätze, Rückmeldungen, Offen. `docs/vergleich-bewegung-stillstand.png` neu.
- Geprüft vor der Änderung an `journey.ts`: `npm test` 20 von 20.
- Geprüft nach der Änderung, am Entwicklungsserver mit dem Zwischenstand der Sätze (18:45): `tools/qa/journey.mjs` alle Prüfungen bestanden (`.raw/qa/journey-1840-dev.txt`). Stufe High wählt quer `d-1440m`, hoch `m-720m` (Tablet, Telefon, Telefon quer); Medium und Low weiter `d-960` und `m-540`; Fallback unverändert.

## Fehlt noch

1. Auf `QUEUE-DONE` in **beiden** Protokollen warten. Nach `Error` und `Traceback` suchen. Bildzahlen: `.raw/desktop-hold` 43, `.raw/mobile-hold` 30, `.raw/desktop-blur-1440` 129, `.raw/desktop-fine-1440` 156, `.raw/mobile-blur-720` 238.
2. Letzte Ausgabe von `build-hero.mjs` prüfen. Erwartet: `d-1440m` und `d-960` je 378 Bilder, `m-720m` und `m-540` je 268, nirgends „still small", keine Warnung.
3. Pulsieren messen: `node .raw/tests/noise/pulse.mjs public/hero/5/d-1440m` und `.../d-960`. Liegt die Produktenthüllung (528–712) über etwa 1,03: Basisbilder aus 1920er-Quellen in `build-hero.mjs` leicht weichzeichnen, kalibriert wie unter Vorgang B von 17:30 beschrieben (`calibrate.mjs`, für 1920 → 1440 neu).
4. `npm run build`, dann `PORT=4323 npm start`. Prüfskripte nacheinander (Port 9333): `tools/qa/journey.mjs`, `a11y.mjs`, `axtree.mjs`, `frame-steps.mjs d-1440m m-720m`, `perf.mjs` (nur ohne Blender: Bildtakt und Decodierzeit mit den großen Bildern sind das eigentliche Risiko; Budget der decodierten Bilder auf High rund 20 Bilder). `npm test`.
5. Ansehen in Laptop-Größe (1707 × 960, Faktor 1,5), quer und hoch: Fahrt in Bewegung, Narbe beim Scrollen, Sprung an den Rändern der Makro-Ansicht (264/306 quer, 187/216 hoch), „Weiter" hält auf scharfem Bild.
6. `public/hero/3/` und `public/hero/4/` löschen, wenn `/hero/5` vollständig und geprüft ist (sonst werden die alten Sätze mit ausgeliefert).
7. `docs/QA.md`: Datenmengen und Bildzahlen der Sätze, Messwerte, Zeile „Bewegungsebene größer" schließen.
8. Offen beim Auftraggeber, unverändert: Sollen die gesetzten Blenden für die ganze Fahrt gelten (siehe 17:30, Punkt 10)? Form der Narbe am frischen Exemplar prüfen (siehe 17:30, „Botanisch").

---

# Stand 06.10.2026, 17:30 — Übergabe mitten im Vorgang (überholt durch 18:40)

Dieser Abschnitt ist die Übergabe an den nächsten Bearbeiter. Zwei Vorgänge sind offen:

- **A. Narbe (Makro-Ansicht):** Code ist geschrieben, der Renderlauf **läuft noch**. Veröffentlicht, gebaut und im Browser geprüft ist nichts davon.
- **B. „Verpixelt / die Kamera rauscht":** nur Diagnose mit Messwerten. **Am Code ist dafür nichts geändert.**

Die Abschnitte weiter unten (16:05, 09:20) beschreiben den Stand davor und bleiben als Verlauf stehen. `docs/ASSETS.md` beschreibt für Vorgang A bereits den Zielzustand, als wäre er fertig.

## Was gerade läuft

Ein losgelöster Renderlauf, gestartet 16:44:

```bash
(RS_NO_FIRST_PUBLISH=1 nohup bash pipeline/blender/queue-inbetweens.sh d-hold d-dwell d-hold-blur d-pan-blur d-hold-fine m-hold m-dwell m-blur-2 m-blur-4 >> .raw/queue-dwell.log 2>&1 &)
```

- Protokoll: `.raw/queue-dwell.log`. Fertig ist er, wenn dort `QUEUE-DONE` steht. Um 17:24 lief die erste Stufe (`d-hold`), 9 von 14 Bildern waren fertig.
- Prozesse um 17:24: `blender.exe` PID 36032, die Queue als `bash.exe` PID 21388 und 20984 (an der Befehlszeile `queue-inbetweens.sh` zu erkennen).
- Dauer: geschätzt bis etwa 21:30 bis 22:30. Gemessen sind nur rund 4 Minuten je Bild in 1920 × 1080; der Rest ist hochgerechnet.
- Jede Stufe veröffentlicht sich am Ende selbst (`node pipeline/images/build-hero.mjs`). **Ab der ersten Veröffentlichung zeigt das Manifest auf `/hero/4`**, und bis alle Stufen durch sind, fehlen im Narben-Abschnitt Bilder der Bewegungsebene (der Player überblendet dort gröber). Bis 17:24 war noch nichts veröffentlicht: Manifest und Seite zeigen den alten Stand unter `/hero/3`.
- Anhalten: erst die beiden Queue-Prozesse beenden, dann Blender. Fortsetzen: denselben Befehl noch einmal starten, vorhandene Bilder werden übersprungen. Das zuletzt geschriebene Bild nach einem Abbruch prüfen (Größe 0 oder beschädigt: löschen).

| Stufe | Was | Ziel | Bilder |
| --- | --- | --- | --- |
| `d-hold` | Querformat, Basisbilder 29–42, 1920 × 1080, 64 Samples | `.raw/desktop/` | 14 |
| `d-dwell` | Querformat, Makro-Ansicht, Positionen 264–306, jede Position, 1440 × 810, 64 Samples | `.raw/desktop-hold/` | 43 |
| `d-hold-blur` | Querformat, Fahrt in die Makro-Ansicht, Positionen 232–264 (gerade), Bewegungsunschärfe, 960 × 540 | `.raw/desktop-blur/` | 17 |
| `d-pan-blur` | Querformat, Fahrt heraus, Positionen 306–338 (gerade); ab 340 vorhanden und übersprungen | `.raw/desktop-blur/` | 17 |
| `d-hold-fine` | Querformat, scharfe Zwischenbilder um die Makro-Ansicht (nur für `RS_NO_BLUR=1`), 960 × 540 | `.raw/desktop-fine/` | 25 |
| `m-hold` | Hochformat, Basisbilder 21–29, 720 × 1280, 64 Samples | `.raw/mobile/` | 9 |
| `m-dwell` | Hochformat, Makro-Ansicht, Positionen 187–216, jede Position, 720 × 1280 | `.raw/mobile-hold/` | 30 |
| `m-blur-2`, `m-blur-4` | Hochformat, Positionen 164–238 (gerade), Bewegungsunschärfe, 540 × 960 | `.raw/mobile-blur/` | 38 |

Die ersetzten Bilder des alten Pfads liegen unter `.raw/prev-dwell/` (gleiche Unterordner). Zurück zum alten Stand: Änderungen an `web_hero.py` zurücknehmen, diese Bilder zurückkopieren, die neuen Ordner `*-hold` entfernen, neu veröffentlichen.

## Vorgang A: Narbe

**Rückmeldung:** „Die Stelle, wo die Narbe scharf ist, muss etwas mehr Bilder erhalten. Sie ist so kurz scharf und durch die Bewegungsunschärfe sehr schnell wieder unscharf. Es muss gestochen scharf sein, gut zu erkennen und botanisch korrekt."

### Gefunden

1. **Die Blende war nie wirksam.** Der Master animiert die Blende an den Kameradaten (Action-Slot „Motion control | 85 mm"). `web_hero.py` hat nur die Animation des Kamera-Objekts entfernt, nicht die der Kameradaten. Alle Bilder beider Fahrten sind deshalb mit Blende 0,11 gerendert (Wert des letzten Master-Frames), nicht mit den Blenden der Schlüsselpositionen (0,20 bis 2,2). Die Korrektur vom Mittag („Blende 0,45 → 0,72") hat nichts bewirkt, nur die Verschiebung des Schärfepunkts. Nachgewiesen mit einem Messskript: Nach dem Rendern stand die Blende auf 0,11, obwohl 16 gesetzt war.
2. **Die Narbe war zu klein.** Auf dem gesetzten Pfad war ihr Ende rund 5 % der Bildbreite groß und von der Seite gesehen (Abstand 5,65 Einheiten, 83° zur Achse des Narbenastes). Faltung und papillöser Rand, die der Master modelliert (Referenzbild `L-fresh-apex.png` im Übergabepaket), waren nicht zu lesen.
3. **Die scharfe Phase war 2,4 % der Fahrt lang** (0,388 bis 0,412); direkt danach setzte die Bewegungsunschärfe ein.

### Geändert

- `pipeline/blender/web_hero.py`
  - `STIGMA_HOLD`, `stigma_macro()`, `aim_for()`, `refine_hold()`: Zwischen Fortschritt 0,325 und 0,475 blendet die Kamera vom gesetzten Pfad in eine Makro-Position vor dem Ende der Narbe und zurück (Abstand 1,9, 50° zur Achse, Blende 2,0, Schärfepunkt auf dem Ende). Von 0,375 bis 0,425 steht die Makro-Ansicht allein, mit langsamer Annäherung (6 % des Abstands) und 7° Schwenk über den Haltepunkt. Das Ende der Narbe bleibt an derselben Stelle im Bild wie in der gesetzten Komposition. Außerhalb von 0,325 bis 0,475 ändert sich kein Bild.
  - `RENDERED_FSTOP = 0.11` und `cd.animation_data_clear()`: Die Animation der Kameradaten wird jetzt entfernt, und außerhalb des Narben-Haltepunkts ist die Blende ausdrücklich auf 0,11 festgelegt, damit der veröffentlichte Look bleibt. **Die Blendenwerte in `KEYS` werden weiterhin nicht verwendet.**
  - `BLUR_FREE`: an der Narbe keine Bewegungsunschärfe innerhalb ±0,03, voll ab ±0,05 (andere Haltepunkte unverändert ±0,010 / ±0,035).
  - `stigma_end()` gibt jetzt Mittelpunkt, Achse und Radius zurück.
  - Neue Schalter für Testbilder: `--hold-dist`, `--hold-angle`, `--hold-fstop`, `--hold-core`, `--hold-reach`, `--hold-swing`.
- `pipeline/blender/render.sh`: zeigt auch Zeilen mit `HOLD` (Messwerte des Narbenendes).
- `pipeline/blender/queue-inbetweens.sh`: Stufen `d-hold`, `m-hold` mit neuen Bereichen; neu `d-dwell`, `m-dwell`, `d-hold-blur`, `d-hold-fine`; `d-pan-blur` beginnt bei 306 statt 272.
- `pipeline/images/build-hero.mjs`: neue Quelle `.raw/<Variante>-hold/` (hat in der Bewegungsebene Vorrang vor allen anderen Quellen, wird bis 1440 bzw. 720 Pixel breit veröffentlicht, zählt nicht für die Größenangabe des Satzes); Pfad `/hero/3` → `/hero/4`. **Noch nie ausgeführt, nur auf Syntax geprüft.**
- `src/scripts/journey.ts`: Das Speicherbudget der decodierten Bilder zählt Pixel statt Bilder, weil die Narbenbilder größer sind. **Ungetestet, `astro check` ist nicht gelaufen.**
- `docs/ASSETS.md`: beschreibt den Zielzustand.

### Geprüft

Nur Einzelbilder:

- Testbilder der Makro-Position in 960 × 540 (`.raw/tests/dwell/`): `g1_p0400.png` entspricht bis auf die Blende (1,5 statt 2,0) der gewählten Einstellung. `sheet-t.png` zeigt zehn Positionen von 0,325 bis 0,475 im Querformat, `sheet-m.png` drei im Hochformat: Die Fahrt hinein und heraus geht durch kein Blütenblatt.
- Das erste fertige Basisbild in 1920 × 1080 (`.raw/desktop/0033.png`): Ende der Narbe scharf, Faltung und Papillen zu erkennen, Hintergrund weich.

### Fehlt noch

1. Auf `QUEUE-DONE` warten. Im Protokoll nach `Error` und `Traceback` suchen und die Bildzahlen aus der Tabelle oben gegen die Ordner prüfen.
2. Die Ausgabe von `build-hero.mjs` im Protokoll prüfen (erster Lauf des geänderten Skripts). Erwartet: `d-960` mit 378 Bildern (357 + 21 ungerade Positionen), davon 43 „dwell frames"; `m-540` mit 268 (253 + 15), davon 30; Satzgrößen im Manifest weiter 960 × 540 und 540 × 960.
3. `npm run assets:stills` (das Kapitelbild „stigma" kommt aus `.raw/desktop/0036.png` mit einem Zuschnitt, der für das alte Motiv gewählt war: ansehen und in `pipeline/images/build-stills.mjs` anpassen). Alt-Text und Kapiteltext in `src/data/journey.ts` gegen das neue Bild lesen.
4. `npm run build` (enthält `astro check`).
5. Im Browser ansehen, quer und hoch: Überdeckt der Kapiteltext die jetzt größere Narbe? Wie wirkt die Fahrt hinein und heraus beim Scrollen? Hält „Weiter" auf einem scharfen Bild (Fortschritt 0,40 → Basisbild 36)? Ist der Wechsel zwischen den unscharfen 960er-Bildern und den scharfen 1440er-Bildern an den Positionen 264 und 306 als Sprung zu sehen?
6. Prüfskripte, nacheinander (fester Debug-Port 9333): `tools/qa/journey.mjs`, `a11y.mjs`, `axtree.mjs`, `frame-steps.mjs`; `perf.mjs` erst, wenn kein Blender mehr läuft. `npm test`.
7. `public/hero/3/` löschen, wenn `/hero/4` vollständig und geprüft ist (sonst wird der alte Satz mit ausgeliefert).
8. `pipeline/blender/queue-all.sh` nennt für die Narbe noch die alten Bereiche (Basisbilder 33–39 und 23–27): an 29–42 und 21–29 anpassen und `d-dwell`, `m-dwell` aufnehmen.
9. `docs/QA.md` nachziehen: Tabelle der Rückmeldungen, Bildzahlen und Datenmengen der Sätze, neue Messwerte. `docs/ASSETS.md` gegen das Ergebnis lesen.
10. Entscheidung des Auftraggebers: Sollen die gesetzten Blenden für die ganze Fahrt gelten? Das ändert den Look aller Bilder und heißt, beide Fahrten vollständig neu zu rendern. Die Frage ist gestellt, eine Antwort gibt es nicht.

### Botanisch

Das Bild zeigt, was der Master modelliert: einen zum Ende verbreiterten Narbenast mit Längsfurchen, gefaltetem Endquerschnitt und feinem papillösem Rand, nach den Quellen im Übergabepaket (`notes/00-sources-and-evidence.md`, S3–S5). Das Ende ist im Modell eine geschlossene, gefaltete Fläche, kein offener Trichter. Die Notizen des Übergabepakets (`notes/07-3d-artist-notes.md`) verlangen, die Form am frischen Exemplar zu prüfen, bevor ein extremer Makroshot final freigegeben wird. Diese Prüfung steht aus; „botanisch korrekt" ist damit nicht belegt. Am Modell wurde nichts verändert.

## Vorgang B: „verpixelt", „die gesamte Kamera rauscht"

**Rückmeldung:** „Woher kommt dieses Verpixelte im Bild? Es kann doch High-End aussehen, wenn ich mir die Render-Ergebnisse anschaue, aber die gesamte Kamera scheint etwas zu rauschen. Dann ist da irgendein Effekt zu viel."

**Stand: Diagnose. Nichts geändert, nichts behoben.** Messskripte und Vergleichsbilder liegen in `.raw/tests/noise/`. Welche der Ursachen der Auftraggeber als „Rauschen" sieht, ist nicht von ihm bestätigt.

### Was es nicht ist

- **Kein Effekt im Master:** kein Compositor, kein Korn, kein Nachbearbeitungsschritt. Einstellungen des Masters: AgX „Medium High Contrast", Pixelfilter Blackman-Harris 1,5 px, Dither 1,0, fester Seed 0, OpenImageDenoise.
- **Kein Renderrauschen:** Zwei benachbarte Rohbilder (`.raw/desktop-fine/0706.png`, `0710.png`) unterscheiden sich im Mittel um 0,18 von 255 Stufen, und nur dort, wo sich die Kamera bewegt hat (`diff-raw-706-710.png`, Differenz zwölffach verstärkt). Die Rohbilder sind auf Pixelebene sauber (`raw33-bg.png`, `raw33-tip.png`).

### Was gemessen wurde

1. **Halbe Auflösung in Bewegung.** Die Bewegungsebene ist 960 × 540 groß und wird auf den Bildschirm gestreckt; die Bilder in voller Auflösung erscheinen erst im Stillstand. Auf 1920 Pixel Breite sind Kanten weich und treppig (`motion640-on1920.png` gegen `rest640-on1920.png`, `q-compare.png`). Das ist der größte Teil von „verpixelt".
2. **Jedes vierte Bild ist schärfer.** Die Basisbilder der Bewegungsebene sind aus Renderings in 1440 oder 1920 Pixel Breite verkleinert, die drei Zwischenbilder dazwischen direkt in 960 gerendert. Schärfe eines Basisbilds im Verhältnis zu seinen Nachbarn im veröffentlichten Satz `d-960` (`pulse.mjs`):

   | Positionen | Median | Maximum |
   | --- | --- | --- |
   | 0–176 | 1,04 | 1,11 |
   | 176–272 | 1,04 | 1,12 |
   | 272–528 (alles mit Bewegungsunschärfe in 960 gerendert) | 1,00 | 1,04 |
   | 528–712 (Produktenthüllung, Basisbilder aus 1920) | 1,22 | 1,26 |

   Beim Scrollen pulsiert das ganze Bild scharf, weich, weich, weich. Das ist der größte gemessene Kandidat für „die Kamera rauscht". Für das Hochformat nicht gemessen; dort kommen alle Bilder der Bewegungsebene aus `.raw/mobile-blur` in gleicher Größe, ein Pulsieren ist nicht zu erwarten.
3. **Kompression.** Dieselben beiden Nachbarbilder unterscheiden sich nach WebP (Qualität 76) um 0,84 statt 0,18 Stufen, Basisbild gegen Zwischenbild um 1,44 (`diff-pub-704-706.png`: Blockmuster über die ganze ruhige Fläche, in jedem Bild anders). In ruhigen Flächen liegt der Fehler bei rund 0,6 bis 0,7 Stufen; 20 bis 25 % der 4 × 4-Felder weichen um eine Stufe oder mehr ab (`blocks.mjs`). Höhere Qualität ändert daran wenig: Qualität 76 → 0,69, Qualität 90 → 0,59. Vermutung, nicht belegt: Das kommt aus der 8-Bit-Farbumrechnung von verlustbehaftetem WebP zusammen mit dem Dither der Rohbilder (verlustfrei wären es rund 300 kB je Bild, die Bilder tragen also viel Feinrauschen).

   Abstand zum Rendering auf 1920 Pixel Breite und Datenmenge je Bild, Stichprobe von neun Basisbildern (`measure.mjs`):

   | Auslieferung | kB je Bild | PSNR |
   | --- | --- | --- |
   | 960 px, Qualität 76 (jetzt, Bewegung) | 16,8 | 38,0 dB |
   | 960 px, Qualität 88 | 27,7 | 39,6 dB |
   | 1280 px, Qualität 82 | 29,7 | 39,7 dB |
   | 1440 px, Qualität 80 (jetzt, Stillstand) | 31,7 | 39,8 dB |
   | 1440 px, Qualität 90 | 51,8 | 41,1 dB |

### Vorschläge, nicht umgesetzt

1. **Pulsieren beseitigen, ohne neu zu rendern.** In `build-hero.mjs` die Basisbilder der Bewegungsebene nach dem Verkleinern leicht weichzeichnen, wenn ihre Nachbarn direkt in Satzgröße gerendert sind. Kalibriert bei Qualität 84 (`calibrate.mjs 84`) mit einer 3 × 3-Faltung `(1 − t) · Original + t · [1 2 1; 2 4 2; 1 2 1] / 16`:
   - Quelle 1440 px: `t = 0,30` → Verhältnis 0,998 (Spanne 0,99–1,02)
   - Quelle 1920 px: `t = 0,35` → Verhältnis 0,998 (Spanne 0,97–1,03)

   Hinweise: `sharp().blur()` mit Sigma unter etwa 0,6 bewirkt nichts; der Kern `linear` allein ergibt 0,979 bzw. 0,943. Bei anderer Qualität neu kalibrieren. Erfolg prüfen mit `node .raw/tests/noise/pulse.mjs public/hero/4/d-960` (Ziel 1,00 in allen Abschnitten). Das gleicht nach unten an: In Bewegung sind dann alle Bilder so weich wie die Zwischenbilder.
2. **High-End in Bewegung heißt größer rendern.** Die scharfen Zwischenbilder des Querformats (Positionen 0–232 und 528–712, 156 Bilder) in 1440 × 810 neu rendern und die Bewegungsebene in dieser Größe ausliefern. Schätzung, nicht gemessen: rund sechs Stunden Rechenzeit, Datenmenge der Fahrt im Querformat rund 11 bis 12 MB statt 5,4 MB. Vorschlag 1 wird dort dann überflüssig. Das ist eine Entscheidung des Auftraggebers (Datenmenge steht schon in `docs/QA.md` als offene Abwägung); er ist dazu noch nicht gefragt worden. Hochformat: Die Bewegungsebene ist 540 Pixel breit und wird auf heutigen Telefonen gut zweifach gestreckt; nicht untersucht.
3. **Qualität anheben:** Bewegungsebene von 76 auf 84 bis 88, Stillstand von 80 auf 88. Hilft an Kanten, kaum in ruhigen Flächen (siehe Messung).
4. **Nicht untersucht:** ob Dither 0 beim Rendern oder ein anderes Bildformat das Flimmern in ruhigen Flächen senkt, und ob bessere Skalierung im Browser (Canvas wird per CSS gestreckt) etwas bringt.

## Geänderte Dateien dieser Sitzung

`pipeline/blender/web_hero.py`, `pipeline/blender/render.sh`, `pipeline/blender/queue-inbetweens.sh`, `pipeline/images/build-hero.mjs`, `src/scripts/journey.ts`, `docs/ASSETS.md`, `docs/STATUS.md`. Das Projekt liegt nicht unter Versionskontrolle; es gibt keinen Diff zum Nachlesen außer dieser Liste.

Ein Testbild der Makro-Position (rund eine Minute):

```bash
bash pipeline/blender/render.sh --variant desktop --mode still --p 0.40 --res 960x540 --spp 48 --noise 0.035 --threads 10 --out .raw/tests/dwell --tag probe
```

## Hinweise zu diesem Rechner

- Blender 4.5 rendert hier nur auf der CPU. Lange Läufe losgelöst mit Protokoll starten; sie müssen fortsetzbar sein.
- Kein Python im Pfad: Skripte mit Node schreiben (`sharp` ist installiert).
- Die Prüfskripte in `tools/qa/` nutzen denselben Debug-Port (9333): nie zwei gleichzeitig.
- Solange Blender rendert, sind Performance-Messungen ungültig.
- Auf dem Rechner laufen fremde Prozesse (andere Agenten, ein anderes Projekt). Nur Prozesse beenden, die an ihrer Befehlszeile eindeutig zu diesem Projekt gehören. Port 4322 war von einem fremden Prozess belegt.
- In `bash -c "…"` oder `node -e "…"` keine Markdown-Backticks verwenden: Git Bash führt sie als Befehl aus.
- Der Master unter `../Projektübergabe/royal-spices/blender/` wird nie gespeichert oder überschrieben.

---

# Stand 06.10.2026, 16:05 — Nachbesserung gerendert und geprüft, noch nicht angesehen

Es läuft nichts mehr im Hintergrund. Die Nachbesserung vom Nachmittag ist gerendert, veröffentlicht, gebaut und technisch geprüft. **Abgenommen ist der Stand nicht:** Ob die Fahrt jetzt flüssig genug und die Narbenspitze scharf genug ist, muss der Auftraggeber ansehen.

## Rückmeldung vom Mittag und was daraus wurde

„Fahrt ist flüssiger, geht es noch etwas flüssiger? Die Narbenspitze im Narben-Kapitel ist nicht so scharf, wie ich es mir wünsche."

- **Narbenspitze.** Gemessen am Blender-Master: Der Schärfepunkt lag auf der vorderen Wand des Narbentrichters, 0,10 Einheiten vor dessen Ende, bei einer Schärfentiefe von rund ±0,06 (Blende 0,45). Das Ende der Narbe, das Motiv des Kapitels, lag außerhalb. Jetzt liegt der Schärfepunkt am Haltepunkt auf dem Ende der Narbe, und die Blende schließt dort um den Faktor 1,6 (0,72). Der Hintergrund bleibt stark unscharf. Die Korrektur wirkt nur zwischen Fortschritt 0,36 und 0,44; die gesetzten Kamerapositionen und alle anderen Bilder bleiben unverändert (`pipeline/blender/web_hero.py`, `STIGMA_HOLD`). Vergleich alt/neu: `.raw/tests/focus/compare-1920.png`.
- **Narben-Kapitel in höherer Auflösung.** Die Basisbilder des Kapitels (Querformat 33–39, Hochformat 23–27) sind in 1920 × 1080 bzw. 720 × 1280 mit 64 Samples neu gerendert.
- **Keine Bewegungsunschärfe an den Haltepunkten.** Bisher setzte die Unschärfe des Schwenks genau am Narben-Haltepunkt ein. Jetzt blendet sie an allen vier Haltepunkten auf null aus.
- **Flüssiger, Teil 1:** Die Kamera folgt dem Scrollen wie eine kritisch gedämpfte Feder statt mit einfacher Verzögerung. Ihre Geschwindigkeit springt nie, einzelne Mausrad-Rasten verschmelzen. Im Browser geprüft: monoton, kein Überschwingen, kommt exakt an.
- **Flüssiger, Teil 2:** Im Querformat trägt die Bewegungsebene jetzt von der Narbe bis zum Glas Bewegungsunschärfe (129 statt 65 Bilder).

Grenze: Die Narbe hat im 3D-Modell wenig Feinstruktur (glatte Rippen, keine sichtbaren Papillen). Schärfer als das Modell kann das Bild nicht werden; mehr Detail an der Spitze wäre Modellierarbeit am Master.

Gerendert von 13:03 bis 15:51 (210 Bilder). Die ersetzten Bilder liegen unter `.raw/prev-focus/`.

## Geprüft am Produktions-Build (16:00)

Ausgaben in `.raw/qa/*-final.txt`.

- `tools/qa/journey.mjs`: alle 65 Prüfungen bestanden.
- `tools/qa/perf.mjs`: LCP 0,13–0,30 s am Desktop, 0,92–1,33 s im Telefon-Profil (CPU vierfach gedrosselt, langsames 4G); CLS höchstens 0,0002; längste Interaktion 136 ms; Bildtakt der Fahrt 16,7 ms (60 Hz) in allen drei Profilen, auch gedrosselt; keine Konsolen- oder CSP-Fehler.
- `tools/qa/a11y.mjs`, `tools/qa/axtree.mjs`, `tools/qa/smtp.mjs`: alle Prüfungen bestanden. `npm test`: 20 von 20. `astro check`: 0 Fehler.
- Sichtprüfung der neuen Einzelbilder rund um den Narben-Haltepunkt, quer und hoch (`.raw/shots2/sheet-refine.png`).

Nicht geprüft bleibt, was unten unter „Nicht geprüft" steht, allen voran: **die Fahrt in Bewegung, mit Augen.**

## Ansehen

Entwicklungsserver: http://127.0.0.1:4321/ (`npm run dev`). Produktionsstand: `npm run build`, dann `PORT=4323 npm start` (Port 4322 ist auf diesem Rechner von einem fremden Prozess belegt).

---

# Stand 06.10.2026, 09:20 — gerendert, gemessen, noch nicht abgenommen

Es läuft nichts mehr im Hintergrund. Alle Bilder sind gerendert und veröffentlicht, der Produktions-Build ist gebaut und geprüft, die Dokumente sind vollständig. **Abgenommen ist der Stand nicht:** Die wichtigste offene Frage kann nur der Auftraggeber beantworten, nämlich ob die Hero-Fahrt jetzt flüssig wirkt.

## Ansehen

```bash
npm run dev
```

Vorschau unter http://127.0.0.1:4321/ (Entwicklung).

```bash
npm run build
```

```bash
PORT=4323 npm start
```

Produktionsstand. Port 4322 (Standard) ist auf diesem Rechner von einem fremden Prozess belegt, deshalb ein anderer Port.

## Was der Auftraggeber beurteilen muss

1. **Sieht die Fahrt flüssig aus?** Mit Mausrad, Trackpad und dem Knopf „Weiter" durchgehen, im Querformat und in einem schmalen, hohen Fenster (oder auf dem Telefon).
2. **Gefällt die Bewegungsunschärfe?** Im Querformat ist der Schwenk von der Narbe zu den Fäden wie Film mit offenem Verschluss gerendert, im Hochformat die ganze Bewegung. Sobald die Kamera steht, wird das Bild scharf.
3. **Stört die weichere Bewegung auf großen Bildschirmen?** In Bewegung werden kleinere Bilder gezeichnet (960 × 540), im Stillstand die großen.
4. **Sind 5,5 MB (Querformat) bzw. 3,9 MB (Telefon) für die Fahrt vertretbar?** Sie laden nachrangig und verzögern die Seite nicht.

Stellschrauben und Alternativen stehen in `docs/QA.md`, Abschnitt „Offen".

## Verlauf am 06.10.

Rückmeldung des Auftraggebers, zweimal: Die Animation sieht nicht nach 60 Bildern pro Sekunde aus. Das traf zu. Gemessene Ursachen und was dagegen getan wurde:

| Ursache | Messung | Maßnahme |
| --- | --- | --- |
| Zu wenige Bilder: 90 für rund 540 Bildschirm-Frames einer Durchfahrt | Zeichentakt 16,7 ms, aber jedes Bild stand vier bis sechs Frames | Bewegungsebene mit vierfacher Bildzahl: 357 im Querformat, 253 im Hochformat (960 × 540 bzw. 540 × 960) |
| Bild verschiebt sich pro ausgeliefertem Bild zu weit | Querformat Median 1,82 % der Bildbreite, im Schwenk bis 15,7 %; Hochformat Median 5,0 %, bis 37 % | Nach der Verdichtung: Querformat Median 0,31 %, außerhalb des Schwenks höchstens rund 1,1 %; Hochformat Median 1,13 % |
| Schnelle Schwenks bleiben auch vierfach zu grob | Querformat-Schwenk 4,0 % je Bild, Hochformat bis 9,8 % | Diese Bilder mit Bewegungsunschärfe gerendert (Querformat 65, Hochformat alle 253) |
| Kleinere, teils unscharfe Bilder dürfen nicht stehen bleiben | | Schärfe-Ebene: Im Stillstand blendet auf jedem Gerät das Basisbild in voller Auflösung ein |
| Auf langsamen Prozessoren fiel jedes zweite Bild aus | Bildtakt 35 ms bei vierfach gedrosselter CPU | Überblendung über den Compositor statt per Skript, keine Stil- und Layoutarbeit pro Frame: Bildtakt 17,7 ms |

Außerdem am 06.10.:

- **Hero-Layout:** Textspalte endet rechnerisch vor der Blüte und die Überschrift skaliert mit (vorher lag der Text auf dem Telefon im Querformat auf der Blüte); Papierschleier hinter dem Hochformat-Auftakt; deckende Etiketten; kürzerer Verlauf am unteren Rand.
- **Lesereihenfolge:** Auftakt, vier Kapitel, Ankunft (vorher stand die Ankunft vor den Kapiteln).
- **Navigation:** liest beim Scrollen keine Layoutwerte mehr.
- **Renderskript:** Bewegungsunschärfe (`--blur`, `--blur-step`, `--blur-fade`), Zwischenbilder (`--mod`, `--rem`).
- **Prüfwerkzeuge neu:** `journey.mjs`, `axtree.mjs`, `smtp.mjs`, `frame-steps.mjs`. `perf.mjs` zählt nur noch echte Bedienungen als Interaktion.
- **Dokumente:** `ASSETS.md`, `PRODUCT-TRUTH.md`, `SHOPIFY.md`, `QA.md`.

## Geprüft am Produktions-Build (06.10., 09:05)

Ausgaben in `.raw/qa/*-final.txt`.

- `tools/qa/journey.mjs`: alle 65 Prüfungen bestanden — vier Viewports, vorwärts und rückwärts identisch, Schärfe an jedem Haltepunkt, Ausfall der Bilddateien führt in die Fallback-Stufe, Stufen Medium und Low.
- `tools/qa/perf.mjs`: LCP 0,10–0,47 s am Desktop, 0,86–1,10 s im Telefon-Profil (CPU vierfach gedrosselt, langsames 4G); CLS höchstens 0,0002; längste Interaktion 120 ms; Bildtakt der Fahrt 17,7 ms in allen drei Profilen; keine Konsolen- oder CSP-Fehler.
- `tools/qa/a11y.mjs`: alle Prüfungen bestanden (13 Seiten, zwei Viewports, Kontraste, Tastatur, Menü, Formular).
- `tools/qa/axtree.mjs`: alle Prüfungen bestanden.
- `tools/qa/smtp.mjs`: alle Prüfungen bestanden (lokaler Test-Mailserver).
- `npm test`: 20 von 20. `astro check`: 0 Fehler. `npm audit`: 0 bekannte Schwachstellen.
- Security-Header, Caching, Brotli, 404, Schrägstrich-Weiterleitung, Pfad-Traversal, Anfrage-Endpunkt (405, 403, 422, 503 ohne SMTP), keine Secrets im Client-Bundle, Sitemap mit 11 Seiten, `robots.txt` gesperrt.
- Sichtprüfung per Screenshot: Hero an neun Viewports, die Hochformat-Fahrt an fünf Positionen, unscharf gerenderte Einzelbilder, Fassung ohne JavaScript, Stand im eingebauten Browser.

## Nicht geprüft

- **Die Fahrt in Bewegung, mit Augen.** Alles oben sind Messungen und Einzelbilder.
- Echte Geräte (iPhone, Android, iPad), Safari, Firefox.
- Ein echter Screenreader (geprüft ist der Accessibility-Baum von Chrome).
- Felddaten zur Performance; INP nur über skriptgesteuerte Bedienungen angenähert.
- SMTP mit den Zugangsdaten eines echten Anbieters; Betrieb hinter Proxy und TLS.
- Warenkorb im Browser gegen einen echten Shopify-Store.

## Rendern wiederholen

Sequenzbilder, die es schon gibt, werden übersprungen. Standbilder und Basis-Fahrten (Achtung: Die Standbilder rendert dieser Lauf jedes Mal neu, rund eine Stunde):

```bash
bash pipeline/blender/queue-all.sh
```

Zwischenbilder und unscharfe Abschnitte (lief am 06.10. von 02:59 bis 08:40, rund 5,7 Stunden; etwa 40 Sekunden je Bild):

```bash
(nohup bash pipeline/blender/queue-inbetweens.sh >> .raw/queue-fine.log 2>&1 &)
```

Danach `npm run assets:hero` (macht die Queue nach jeder Stufe selbst) und `npm run build`.

## Produktdaten und offene Businesspunkte

Vollständig in `docs/PRODUCT-TRUTH.md`. Kurz: V1-Produkt ist das 1-g-Glas; Etikettdaten sind bestätigt (05.10.2026); keine Preise auf der Website. Offen sind unter anderem Rücketikett und Foto für 1 g, WhatsApp-/QR-Ziel, SKU, MHD- und Chargenverfahren, Siegelfarbe, Logo als Vektor, Hosting und E-Mail-Dienst, rechtliche Prüfung. Das Projekt liegt nicht unter Versionskontrolle.
