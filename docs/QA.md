# Prüfprotokoll

Was geprüft wurde, womit, mit welchem Ergebnis, und was offen ist. Grundlage: Web-Buzz Definition of Done und die Abnahmetabelle der V1-Spezifikation (§35).

**Ergebnis: offen.** Die Website ist technisch geprüft und gemessen. Abnahmefähig ist sie erst, wenn die unter „Offen" genannten Punkte geklärt sind, vor allem: Augenschein der Hero-Fahrt durch den Auftraggeber, echte Geräte, Screenreader, Produktdaten, rechtliche Prüfung, Hosting.

| Prüffeld | Eintrag |
| --- | --- |
| Projekt / URL | Royal Spices V1 · lokal: Entwicklungsserver `http://127.0.0.1:4321`, Produktions-Build über `server.mjs` (Standard-Port 4322; bei den Abschlussläufen auf einem freien Port, weil 4322 auf diesem Rechner belegt war). Nicht öffentlich ausgeliefert. |
| Geprüfter Stand | Arbeitsverzeichnis `royal-spices-v1` vom 06.10.2026. Kein Git-Repository: Es gibt keinen Commit, auf den sich das Protokoll beziehen könnte. |
| Datum / prüfende Person | 05.–06.10.2026 · Claude (KI-Assistenz), automatisierte Läufe und Sichtprüfung per Screenshot. Keine Prüfung durch eine zweite Person. |
| Geräte / Browser | Ein Rechner: Windows 11, Ryzen 5 6600HS, 14 GB RAM. Chrome (headless, über das DevTools-Protokoll) mit emulierten Viewports, Touch, CPU-Drosselung und Netzprofilen. **Kein Safari, kein Firefox, kein echtes Telefon oder Tablet.** |
| Nachweise | Skripte in `tools/qa/` und `tests/` (wiederholbar), Ausgaben in `.raw/qa/`, Screenshots in `.raw/shots2/`. |

## Geprüfte Viewports und Geräteklassen

Alle als Emulation in Chrome. „Sicht" heißt: Screenshot angesehen.

| Viewport | Klasse | Geprüft |
| --- | --- | --- |
| 1920 × 1080 | Large Desktop | Sicht: Ankunft |
| 1440 × 900 | Desktop | Sicht: Auftakt, Kapitel, Ankunft, statisch, ohne JavaScript, alle Seiten. Automatisch: Fahrt, Fallback, Tastatur, Accessibility-Baum, Performance |
| 1380 × 900, 1280 × 800, 1100 × 700 | Laptop, schmale Fenster | Sicht: Ankunft, statisch (Textspalte bleibt neben der Blüte) |
| 1024 × 768 | Tablet quer | Sicht: Auftakt, Ankunft |
| 768 × 1024 | Tablet hoch | Sicht: Auftakt, Ankunft, statisch. Automatisch: Fahrt, Fallback |
| 390 × 844 | Telefon hoch | Sicht: Auftakt, alle vier Kapitel, Ankunft, statisch, Menü, ganze Startseite. Automatisch: Fahrt, Fallback, Qualitätsstufen, Struktur aller Seiten, Zielgrößen, Menü, Performance |
| 844 × 390, 667 × 375 | Telefon quer | Sicht: Auftakt, Kapitel, Ankunft, statisch. Automatisch: Fahrt, Fallback (844 × 390) |

Befunde vom 06.10. und ihre Behebung:

- Telefon quer: Text lag auf der Blüte (Ankunft und statischer Hero). Behoben: Die Textspalte endet rechnerisch vor der Blüte, die Überschrift skaliert mit, die Ankunft verzichtet dort auf den Fließtext.
- Hochformat-Auftakt: Der rote Narbenast lief durch Überschrift und Fließtext. Behoben: Papierschleier hinter dem Text.
- Statischer Hero quer: Der Verlauf am unteren Rand wusch die Fäden aus. Behoben: Verlauf gekürzt.
- Etiketten über dem Bild waren leicht durchscheinend. Behoben: deckend.

## Hero-Fahrt

`node tools/qa/journey.mjs` an vier Viewports (1440 × 900, 768 × 1024, 390 × 844, 844 × 390):

- Acht Haltepunkte vorwärts, dann rückwärts: Text, Kapitel und gezeichnetes Bild sind in beiden Richtungen gleich; das Bild ändert sich zwischen allen Haltepunkten; am Anfang steht das Auftakt-Standbild, am Ende das Ankunfts-Standbild in voller Auflösung.
- Bilddateien blockiert: Die Seite wechselt in die Fallback-Stufe, zeigt Auftakt- und Ankunftsbild, alle vier Kapitel und beide Handlungen; keine Skriptfehler.
- Im Stillstand zwischen Anfang und Ende liegt das scharfe Bild über dem bewegten; an den beiden Enden übernehmen die Standbilder.
- Schwächere Geräte (Speicher und Kernzahl überschrieben): Die Seite lädt weniger Bilder, auf der untersten Stufe ohne Schärfe-Ebene, und spielt die Fahrt vollständig.

**Ergebnis am Produktions-Build (06.10., 16:00, nach der Nachbesserung; ebenso um 09:05): alle 65 Prüfungen bestanden**, keine Skriptfehler (`.raw/qa/journey-final.txt`). Geladene Bilddateien bei voller Durchfahrt: Querformat 365, Hochformat 261; Stufe Medium 187 bzw. 135; Stufe Low 39 bzw. 30. Screenshots der Fallback-Stufe: `.raw/shots2/fallback-*.png`.

### Wie flüssig ist die Fahrt?

**Rückmeldung des Auftraggebers (06.10.): Die Fahrt sieht nicht nach 60 Bildern pro Sekunde aus.** Das trifft zu, und die Ursache ist gemessen:

- Zeichentakt in der Vorschau des Auftraggebers, neun Sekunden Durchfahrt, während Blender rechnete: Median 16,7 ms je Bild, 95. Perzentil 16,8 ms. Die Seite zeichnet also 60-mal pro Sekunde.
- Verschiedene Bilder in dieser Durchfahrt: 90, für rund 540 Bildschirm-Frames. Jedes Bild steht vier bis sechs Frames und wird überblendet.

`node tools/qa/frame-steps.mjs` misst, wie weit sich das Bild von einem ausgelieferten Bild zum nächsten verschiebt, in Prozent der Bildbreite (beste Verschiebung zweier Nachbarbilder gegeneinander; Zoom und Schärfeverlagerung erfasst das Maß nur zum Teil). Eine Überblendung liest sich erst unter etwa 0,5 % als Bewegung; darüber sieht man das Motiv doppelt.

| Stand | Format | Bilder | Median | 90. Perzentil | Größter Schritt | Schritte über 1 % |
| --- | --- | --- | --- | --- | --- | --- |
| Nur Basisbilder (Stand bis 06.10., 02:00) | quer | 90 | 1,82 % | 5,35 % | 15,73 % | 54 von 89 |
| Nur Basisbilder | hoch | 64 | 5,04 % | 15,95 % | 36,93 % | 52 von 63 |
| **Fertige Bewegungsebene (06.10., 08:40)** | quer | 357 | **0,31 %** | 1,56 % | 4,00 % | 46 von 356 |
| **Fertige Bewegungsebene** | hoch | 253 | **1,13 %** | 3,75 % | 9,76 % | 128 von 252 |

Je Zehntel der Fahrt (größter Schritt, nur Basisbilder): quer 2,5 · 1,6 · 3,0 · 3,8 · **15,7** · **11,9** · 5,3 · 2,8 · 1,3 · 0; hoch 8,0 · 6,9 · 6,8 · 9,4 · **36,9** · **28,8** · 14,2 · 10,1 · 4,4 · 0. Die Fahrt war also überall zu grob aufgelöst, am stärksten im Schwenk von der Narbe zu den Fäden, und im Hochformat durchgehend.

Gegenmaßnahmen (`docs/ASSETS.md`): viermal so viele Bilder in der Bewegungsebene, scharfes Bild im Stillstand, Bewegungsunschärfe in den schnellen Abschnitten. Alle Bilder sind gerendert und veröffentlicht.

Fertige Bewegungsebene, größter Schritt je Zehntel der Fahrt: quer 0,6 · 0,3 · 0,7 · 1,0 · **4,0** · **2,9** · 1,1 · 0,9 · 0,3 · 0; hoch 1,6 · 1,4 · 2,0 · 2,4 · **9,8** · **7,2** · 3,6 · 1,7 · 1,3 · 0.

Was die Zahlen sagen und was nicht:

- Querformat: Außerhalb des Schwenks von der Narbe zu den Fäden liegt jeder Schritt bei höchstens rund 1,1 %, im Median bei 0,31 %. Die fett gesetzten Werte liegen im Schwenk. Von der Narbe bis zum Glas (129 Bilder) ist die Bewegungsebene mit Bewegungsunschärfe gerendert; die Bilder verwischen ineinander.
- Hochformat: Der schmale Rahmen wird schneller durchquert, die Schritte bleiben größer. Dort trägt die ganze Bewegungsebene Bewegungsunschärfe; die Verschiebung allein sagt dann wenig.
- Bei sehr langsamem Scrollen durch die schnellsten Stellen kann weiterhin zu sehen sein, dass zwei Bilder ineinander übergehen, als Wischer statt als scharfes Doppelbild.
- **Niemand hat das Ergebnis in Bewegung beurteilt.** Geprüft sind Einzelbilder (auch der unscharf gerenderten, `.raw/shots2/sheet-blur.png`), der Zeichentakt und die Abstände zwischen den Bildern. Ob die Fahrt jetzt nach 60 Bildern pro Sekunde aussieht, ob die Unschärfe in den Schwenks gefällt und ob die weichere Bewegungsebene auf großen Bildschirmen stört, kann nur jemand sagen, der sie ansieht.

### Rückmeldungen des Auftraggebers und was daraus wurde

| Wann (06.10.) | Rückmeldung | Maßnahme |
| --- | --- | --- |
| nachts, zweimal | Sieht nicht nach 60 Bildern pro Sekunde aus | Vierfache Bildzahl, Schärfe-Ebene, Bewegungsunschärfe in den Schwenks, Zeichnen über den Compositor |
| mittags | „Fahrt ist flüssiger", bitte noch etwas flüssiger | Kamera folgt wie eine gedämpfte Feder (kein Geschwindigkeitssprung, Mausrad-Rasten verschmelzen); Bewegungsunschärfe jetzt auch im Rückzug zum Glas; an den Kapitel-Haltepunkten ausgeblendet |
| mittags | Narbenspitze im Narben-Kapitel nicht scharf genug | Ursache gemessen: Schärfepunkt 0,10 Einheiten vor dem Ende der Narbe bei ±0,06 Schärfentiefe. Schärfepunkt auf das Ende der Narbe gelegt, Blende 0,45 → 0,72, Kapitelbilder in 1920 × 1080 neu gerendert, keine Bewegungsunschärfe mehr am Haltepunkt. Vergleich: `.raw/tests/focus/compare-1920.png` |
| nachmittags | Die Narbe ist zu kurz scharf, muss „gestochen scharf, gut zu erkennen und botanisch korrekt" sein | Gefunden: Die Blende war nie wirksam (alle Bilder mit 0,11 gerendert, die Korrektur vom Mittag ging ins Leere), die Narbe war rund 5 % der Bildbreite groß und von der Seite gesehen, die scharfe Phase dauerte 2,4 % der Fahrt. Neu: eigene Makro-Ansicht vor dem Ende der Narbe (Fortschritt 0,325–0,475, davon 0,375–0,425 allein), jede Position gerendert, scharf, 1440 × 810 bzw. 720 × 1280. Botanisch: zeigt, was der Master modelliert; Abgleich am frischen Exemplar steht aus (`docs/STATUS.md`) |
| nachmittags | „Verpixelt", „die gesamte Kamera scheint etwas zu rauschen", „irgendein Effekt zu viel" | Kein Effekt: weder im Master noch in CSS oder Markup. Ursache: Beim Scrollen wurden 960 px breite Bilder gezeichnet, auf dem 2560-px-Display des Laptops 2,7-fach gestreckt (`docs/vergleich-bewegung-stillstand.png`); dazu war jedes vierte Bild schärfer als seine Nachbarn (Pulsieren). Entscheidung des Auftraggebers: Zwischenbilder quer in 1440 × 810, hoch in 720 × 1280 neu rendern. Läuft (`docs/STATUS.md`) |

Die Nachbesserungen vom Nachmittag und Abend sind **vom Auftraggeber noch nicht angesehen.** Bis dahin gilt die Fahrt als **nicht abgenommen**.

## Performance

Labormessung am 06.10.2026, 16:00 (nach der Nachbesserung vom Nachmittag), Produktions-Build über `server.mjs`, Rechner im Leerlauf (kein Rendern), Chrome headless, `node tools/qa/perf.mjs`. Rohdaten: `.raw/qa/perf-final.json`, `.raw/qa/perf-final.txt`. Ein Lauf vom Vormittag (09:05, vor der Nachbesserung) ergab dieselbe Größenordnung.

| Profil | Seite | LCP | CLS | Langsamste Interaktion |
| --- | --- | --- | --- | --- |
| Desktop 1440 × 900 | Start | 0,30 s | 0,0002 | 48 ms |
| | Produkt | 0,13 s | 0 | – |
| | Kontakt | 0,13 s | 0 | 136 ms |
| Desktop, CPU 4-fach gedrosselt | Start | 0,34 s | 0,0002 | 56 ms |
| | Produkt | 0,38 s | 0 | – |
| | Kontakt | 0,38 s | 0 | 72 ms |
| Telefon 390 × 844, CPU 4-fach gedrosselt, langsames 4G (9 Mbit/s, 170 ms) | Start | 0,94 s | 0,0002 | 128 ms |
| | Produkt | 1,33 s | 0 | 64 ms |
| | Kontakt | 0,92 s | 0 | 80 ms |

Zielwerte (LCP unter 2,5 s, CLS unter 0,1, INP unter 200 ms) sind in allen Profilen eingehalten. Einschränkungen dieser Zahlen:

- **Laborwerte, keine Felddaten.** Die Website ist nicht öffentlich; es gibt keine Messung echter Nutzer.
- **Emulation, kein Gerät.** „Telefon" heißt: Chrome auf diesem Rechner mit gedrosselter CPU und gedrosseltem Netz.
- **INP ist nicht direkt gemessen.** Gemessen ist die längste Dauer von Klick, Tipp und Tastendruck bei skriptgesteuerten Bedienungen (Weiter-Knopf, Menü öffnen und schließen, Formular ausfüllen und absenden). Ein erster Lauf meldete 5,4 s im Telefon-Profil: Das waren Hover-Ereignisse während der künstlichen Scroll-Geste, keine Bedienung; das Werkzeug zählt sie nicht mehr.
- LCP-Element ist auf der Startseite Text (Überschrift bzw. Einleitung), das Standbild kommt per `preload`.

### Bildtakt der Fahrt

Scroll-Geste einmal durch die ganze Fahrt und zurück, 900 px pro Sekunde. Der Bildschirm im Test lief mit 60 Hz (16,7 ms).

| Profil | Bilder gezeichnet | Median | 95. Perzentil | über 33 ms | über 50 ms | JS-Heap |
| --- | --- | --- | --- | --- | --- | --- |
| Desktop | 901 | 16,7 ms | 16,8 ms | 0 | 0 | 1,3 MB |
| Desktop, CPU 4-fach gedrosselt | 893 | 16,7 ms | 16,8 ms | 3 | 1 | 1,7 MB |
| Telefon, CPU 4-fach gedrosselt | 744 | 16,7 ms | 17,0 ms | 1 | 1 | 1,4 MB |

Befund und Behebung am 06.10.: Mit vierfach gedrosselter CPU fiel zunächst jedes zweite Bild aus (Takt 35 ms). Ursache war nicht das Zeichnen der Bilder, sondern Stil- und Layoutarbeit pro Frame: eine CSS-Variable auf dem ganzen Hero, ein Text, der jedes Bild neu gesetzt wurde, und eine Layoutabfrage der Navigation nach Stiländerungen. Nach der Korrektur: Rechenzeit der Frame-Funktion im Median 0,2 ms statt 4,1 ms (gedrosselt), jedes Bild wird gezeichnet.

Der Bildtakt sagt, wie oft gezeichnet wird, nicht, wie flüssig die Bewegung wirkt. Dafür siehe „Wie flüssig ist die Fahrt?" oben.

### Datenmengen

Übertragen beim ersten Aufruf (komprimiert, kB): HTML 7–10, JavaScript 5 auf der Startseite und 2 sonst, CSS 4–7, Schriften 71, Standbilder 24–76.

| Posten | Wert |
| --- | --- |
| JavaScript | Navigation und Formular 3,1 kB, Hero-Player 7,0 kB (unkomprimiert). Kein Framework, keine Third-Party-Skripte |
| CSS | 16 kB global, 20 kB Startseite, 5 kB Formular (unkomprimiert) |
| Schriften | 3 WOFF2-Dateien, zusammen 72 kB, selbst gehostet, `preload` |
| LCP-Bild | Ein Standbild per `preload` (AVIF): das Auftaktbild mit 6–14 kB im bewegten Modus, das Ankunftsbild mit 14–45 kB im statischen |
| Bilder | AVIF und WebP, mehrere Breiten, feste Maße, `lazy` außerhalb des ersten Bildschirms |

Die Hero-Bildfolge lädt erst nach dem ersten Bild, mit niedriger Priorität, grob nach fein. Stand 06.10., 16:00; die großen Bewegungssätze `d-1440m` und `m-720m` werden gerade gerendert, ihre Zahlen folgen danach:

| Satz | Ebene | Bilder | Größe |
| --- | --- | --- | --- |
| `d-960` | Bewegung, Querformat | 357 (129 mit Bewegungsunschärfe) | 5,13 MB |
| `m-540` | Bewegung, Hochformat | 253 (alle mit Bewegungsunschärfe) | 3,63 MB |
| `d-1440` | Stillstand, Querformat | 90, einzeln bei Bedarf | 2,54 MB gesamt, rund 28 kB je Bild |
| `d-1920` | Stillstand, große Bildschirme | 90, einzeln bei Bedarf | 3,08 MB gesamt |
| `m-720` | Stillstand, Hochformat | 64, einzeln bei Bedarf | 1,53 MB gesamt, rund 24 kB je Bild |

Tatsächlich geladen bei einer vollständigen Durchfahrt: Querformat 363 Dateien, 5,5 MB; Telefon 259 Dateien, 3,9 MB. Die Stufe Medium lädt etwa die Hälfte der Bewegungsebene (187 bzw. 135 Dateien), die Stufe Low 39 bzw. 30. Wer „Daten sparen" eingestellt hat, bekommt die statische Fassung ohne Bildfolge.

**Abwägung, die der Auftraggeber kennen sollte:** Die dichtere Fahrt kostet 5,5 MB im Querformat und 3,9 MB auf dem Telefon, nachrangig geladen und ohne Einfluss auf LCP. Vor der Verdichtung waren es rund 2,5 MB bzw. 1,5 MB (90 bzw. 64 Bilder in der größeren Auflösung).

## Accessibility

| Prüfung | Werkzeug | Ergebnis (06.10.) |
| --- | --- | --- |
| Struktur aller 13 Seiten, Desktop und Telefon: eine `h1`, keine übersprungenen Ebenen, Landmarks, Alt-Texte, Formular-Labels, Namen aller Links und Schaltflächen, Zielgrößen ≥ 44 px, kein Querscrollen | `tools/qa/a11y.mjs` | bestanden |
| Farbkontraste der Palette | `tools/qa/a11y.mjs` | bestanden |
| Tastatur auf der Startseite: 16 Stationen in sinnvoller Reihenfolge, jede sichtbar und mit Fokusring; die Fahrt springt mit, wenn der Fokus die Ankunft erreicht | `tools/qa/a11y.mjs` | bestanden |
| Kompaktes Menü: geschlossen nicht erreichbar, geöffnet exklusiv (Seite dahinter `inert`), Fokus kehrt zurück | `tools/qa/a11y.mjs` | bestanden |
| Formular: Vorbelegung aus dem Link, Fehler am Feld, Fokus auf dem ersten Fehler, Meldung verknüpft | `tools/qa/a11y.mjs` | bestanden |
| Accessibility-Baum der Startseite: Reise in Erzählreihenfolge (Auftakt, vier Kapitel, Ankunft) an Anfang, Mitte und Ende der Fahrt; Canvas nicht angesagt; alles benannt; statische Fassung ohne Dopplung | `tools/qa/axtree.mjs` | bestanden |
| Reduced Motion: keine Fahrt, Ankunft als Hero, Bild-Essay | Sicht, `axtree.mjs` | bestanden |
| Ohne JavaScript: alle Inhalte, Navigation, Formular mit Ergebnisseiten | Sicht, Endpunkt-Tests | bestanden |

**Nicht geprüft:** ein Durchlauf mit einem echten Screenreader (VoiceOver, TalkBack, NVDA). Der Accessibility-Baum zeigt, was Chrome anbietet, nicht, wie es sich anhört. Ebenfalls offen: Zoom auf 200 % und 400 %, Windows-Kontrastmodus, Text über Bildern (Kontrast dort nur per Auge beurteilt).

Beobachtung: Die Steuerung der Fahrt ist per CSS in Großbuchstaben gesetzt; Chrome gibt die Namen deshalb in Großbuchstaben weiter („VOM CROCUS ZUM GLAS"). Mit einem Screenreader prüfen, ob das stört.

## Security und Engineering

| Prüfung | Ergebnis |
| --- | --- |
| Anfrage-Endpunkt am Produktionsserver: gültig (200), ungültig (422 mit Feldmeldungen), Bot-Falle und zu schnelles Absenden (Scheinbestätigung, kein Versand), falscher Inhaltstyp (415), zu groß (413, auch ohne Längenangabe), fremder Origin (403), falsche Methode (405), ohne JavaScript (303 auf Ergebnisseite), Rate-Limit (429 mit `Retry-After`) | bestanden (05.10.) |
| Versand über SMTP an einen lokalen Test-Mailserver: Umschlag, genau ein Empfänger, Reply-To als kodierte Adresse, nur Text, Umlaute; Zeilenumbruch in Name oder E-Mail wird abgewiesen; Nachrichtentext mit Punktzeile und Schein-Headern bleibt Text; Mailserver nicht erreichbar ergibt 503 ohne Interna, Fehler steht im Server-Log | bestanden (06.10., `tools/qa/smtp.mjs`) |
| Unit-Tests: Schema, Grenzen, Rate-Limit, Mailtext, Shopify-Schicht | 20 von 20 (06.10.) |
| Security-Header, `frame-ancestors`, Pfad-Traversal, 404, Weiterleitung auf Schrägstrich, Caching, Brotli | bestanden (05.10.; am Abschluss-Build vom 06.10. wiederholt) |
| CSP mit Hashes, keine Verstöße und keine Konsolenfehler im Produktions-Build | bestanden (06.10., Performance-Lauf über drei Seiten und drei Profile) |
| Cookies, Tracking, Third-Party-Skripte, externe Schriften | keine |
| Secrets | Nur Server-Variablen (`SMTP_URL`, `INQUIRY_TO`, `INQUIRY_FROM`), über `astro:env` als Secret deklariert. Öffentlich sind nur die Shopify-Storefront-Werte, die dafür gedacht sind |
| Abhängigkeiten | `npm audit`: 0 bekannte Schwachstellen (06.10.). 4 Laufzeit-Pakete. `package-lock.json` liegt bei |
| Typprüfung | `astro check`: 0 Fehler, 0 Warnungen (06.10.) |

**Nicht geprüft:** Versand mit den Zugangsdaten eines echten Mail-Anbieters; Betrieb hinter dem späteren Proxy (`TRUST_PROXY`, HSTS, Rate-Limit über mehrere Instanzen); der Warenkorb im Browser gegen einen echten Store (`docs/SHOPIFY.md`).

## SEO

Geprüft am 06.10. an allen 13 Seiten und der 404-Seite:

- Jede Seite hat einen eigenen Titel, eine eigene Beschreibung, eine Canonical-URL, Open-Graph-Angaben mit Bild (1200 × 630) und genau eine `h1`.
- Strukturierte Daten: `Organization` auf der Startseite, `Product` auf der Produktseite, bewusst ohne Angebot (kein Preis).
- **Indexierung ist absichtlich gesperrt:** `robots.txt` mit `Disallow: /` und `noindex, nofollow` auf jeder Seite, bis mit `SITE_INDEXABLE=1` gebaut wird. Die Sitemap wird beim Build erzeugt.
- Alle Produkt- und Herkunftsinformationen stehen als HTML im Dokument, nichts nur im Canvas.

Beobachtung: Vier Titel sind länger als rund 60 Zeichen (`/handel/` 85, `/catering/` 73, `/produkte/` und `/herkunft-qualitaet/` 70) und werden in Suchergebnissen gekürzt; das Wichtige steht vorn. Die Beschreibung von `/catering/` hat 177 Zeichen.

## Definition of Done

Angehakt ist nur, was tatsächlich geprüft wurde. „Emulation" heißt: in Chrome auf diesem Rechner, nicht auf dem Gerät.

### Design und Content

- [x] Art Direction und Signature Moment erkennbar; keine Template-Anmutung. *Eigene Sichtprüfung; die Freigabe durch den Auftraggeber steht aus.*
- [x] Typografie, Spacing, Alignment und Asset-Qualität geprüft. *An den oben genannten Viewports.*
- [x] Above the Fold vermittelt Orientierung, Relevanz und eine nächste Handlung.
- [x] Jede Section hat eine Funktion; Füllstoff entfernt.
- [x] Trust-Inhalte belegt; keine erfundenen Testimonials, Logos, Awards oder KPIs. *Es gibt keine Testimonials, Logos oder Kennzahlen. Offene Aussagen: `docs/PRODUCT-TRUTH.md`, Punkte 4, 5 und 7.*

### UX und Responsive

- [x] Navigation verständlich, primäre Handlung je Kontext klar.
- [x] Formulare mit Erfolgs- und Fehlerzuständen funktionieren.
- [x] Mobile, Tablet / Small Desktop und Large Desktop bewusst geprüft. *Emulation.*
- [x] Essentielles ohne Hover erreichbar.

### Motion und Accessibility

- [x] Animationen begründet: eine erzählende (die Fahrt), sonst nur funktionale (Menü, Etikett-Wechsel, Formular-Rückmeldung).
- [x] Motion beeinträchtigt weder Lesbarkeit noch Navigation oder Interaktion. *Natives Scrollen bleibt unangetastet; „Reise überspringen" ist immer erreichbar.*
- [x] Keyboard, Fokusreihenfolge, sichtbare Fokuszustände.
- [x] Semantik, Überschriften, Kontraste, Labels, Alt-Texte, Zielgrößen.
- [ ] Screenreader-Zugänglichkeit. *Accessibility-Baum geprüft, kein echter Screenreader.*
- [x] Reduced Motion funktioniert; nichts Essentielles hängt an Farbe, Hover, Animation oder Ton.

### 3D

- [x] Einsatz begründet: Die Fahrt vom Crocus zum Glas ist der Signature Moment; ausgeliefert wird sie vorgerendert (`docs/ASSETS.md`).
- [x] Core UI und Hauptinteraktion vor der Bildfolge nutzbar; die Bildfolge lädt nachrangig.
- [ ] Geometry, Draw Calls, Materials, Textures, Shader, Postprocessing. *N/A: Im Browser wird kein 3D gerechnet. Stattdessen geprüft: Bildgrößen, Decodierung, Speicher, Bildrate (Abschnitt Performance).*
- [ ] Mobile und schwächere Hardware getestet; Qualitätsabstufungen funktionieren. *Das Umschalten der Stufen ist geprüft (überschriebene Gerätewerte), die Leistung mit vierfach gedrosselter CPU gemessen (jedes Bild wird gezeichnet, Bildtakt 16,7 ms). Kein echtes Gerät.*
- [x] Fallback bewusst gestaltet und geprüft.

### Performance

- [ ] Performance am finalen Stand auf durchschnittlicher Hardware geprüft. *Am finalen Stand gemessen, aber nur emuliert (CPU vierfach gedrosselt, langsames 4G) auf einem Rechner. Kein durchschnittliches Gerät in der Hand.*
- [x] Core Web Vitals gegen die Zielwerte geprüft; Messwerte dokumentiert. *Labor: LCP höchstens 1,3 s, CLS höchstens 0,0002, längste Interaktion 136 ms. Felddaten fehlen: Die Website ist nicht öffentlich. INP ist nur über skriptgesteuerte Bedienungen angenähert.*
- [x] Images: Format, responsive Größen, Dimensionen, Ladepriorität.
- [x] Fonts: Dateien, Weights, Subsetting, Auslieferung.
- [x] JavaScript: Umfang, Aufteilung, Lazy Loading.
- [x] Kosten von Motion in der Messung. *Bildtakt, Rechenzeit pro Frame, Speicher und Datenmenge der Fahrt, Abschnitt Performance. Third-Party-Skripte gibt es nicht.*

### Engineering, Security, Privacy

- [x] Architektur, Datenflüsse und Komponenten nachvollziehbar (`docs/ARCHITECTURE.md`).
- [x] Verhalten ohne JavaScript geprüft.
- [x] Forms und API: Schema, Limits, Rate-Limit, Fehlerbehandlung; keine Stack Traces im Client.
- [x] Spam-, Bot- und CSRF-Schutz.
- [ ] Auth / Permissions. *N/A: keine Anmeldung, keine geschützten Bereiche.*
- [x] Secrets geschützt.
- [x] Security-Header; keine Cookies; kein CORS-Zugriff von außen.
- [x] Dependency Audit. *Lockfile vorhanden; „committed" lässt sich nicht bestätigen, weil das Verzeichnis kein Git-Repository ist.*
- [x] Externe Integrationen geprüft. *Aktiv ist keine. Shopify ist vorbereitet, der Mail-Anbieter offen.*

### SEO und Semantik

- [x] Title, Meta Description, Canonical, Open Graph.
- [x] Sitemap und `robots.txt` für die vorgesehene Veröffentlichung. *Vorgesehen ist derzeit: nicht indexieren.*
- [x] Strukturierte Daten.
- [x] Wichtiger Content semantisch zugänglich.

## Abnahme nach Spezifikation §35

| Bereich | Stand |
| --- | --- |
| Art Direction | eigene Prüfung bestanden; Freigabe Auftraggeber offen |
| Hero | verständlich ohne Erklärung; technisch gemessen. **Augenschein der Fahrt durch den Auftraggeber offen** |
| Crocus | Rekonstruktion aus dem Übergabepaket; botanische Freigabe ist nicht Teil dieser Arbeit |
| Safran | Makrostruktur der Fäden per Sicht geprüft |
| Glas | entspricht der Produkttafel; Siegelfarbe offen |
| Label | Frontetikett lesbar und scharf, Menge 1 g; Druckdaten fehlen |
| Backlabel | **nicht abnehmbar:** kein 1-g-Rücketikett, im Hero ausgeblendet |
| Desktop | geprüft (Emulation) |
| Tablet | geprüft (Emulation) |
| Mobile | eigene Komposition und eigene Kamerafahrt geprüft (Emulation) |
| Reduced Motion | geprüft |
| Fallback | geprüft |
| Performance | gemessen (Labor, 06.10.); Zielwerte eingehalten; Felddaten und echte Geräte offen |
| Keyboard | geprüft |
| Screenreader | Accessibility-Baum geprüft; echter Screenreader offen |
| Formulare | Fehler- und Erfolgszustände geprüft |
| Security | geprüft, soweit ohne Hosting möglich |
| SEO | geprüft; Indexierung bewusst gesperrt |
| Shopify | nicht aktiviert (`docs/SHOPIFY.md`) |
| Product Data | Etikettdaten bestätigt; offene Felder in `docs/PRODUCT-TRUTH.md` |

## Final Test

1. **Signature Moment?** Die Fahrt vom Inneren der Safranblüte über Narbe und getrocknete Fäden zum Royal-Spices-Glas, gesteuert vom Scrollen, endend in der Komposition, die auch das Standbild der Website ist.
2. **Warum sieht die Website so aus?** Papier, Tinte und Bronze kommen von den Etiketten, Rot, Violett, Schiefer und Kork von Blüte und Glas, die beiden Schriften stehen so auf dem Etikett. Das Etikett selbst ist das Muster für Informationen (feiner Rahmen, linierte Zeilen). Der rote Faden führt durch die Seite.
3. **Was wurde entfernt?** Gegenüber dem bisherigen Stand: die Ausgieß- und Schalenanimation, die 3D-Küche, simulierte Fäden in Echtzeit und WebGL insgesamt, die Preise und der Shop-Link. Bewusst nicht gebaut: Raster aus Produktkarten, Bewertungen, Newsletter, Tracking.
4. **Was schafft Vertrauen?** Die Etikettdaten Zeile für Zeile, das Originalfoto aus der Abfüllung mit ehrlicher Bildunterschrift, vollständige Firmenangaben, und der Satz, dass keine Siegel und Laborwerte ohne Bezug zu einer Charge veröffentlicht werden.
5. **Was führt zur Kontaktaufnahme?** Zwei Wege statt eines Funnels: „Produkt ansehen" für das Glas, „Handelsanfrage senden" für Mengen. Das Formular ist aus jedem Kontext vorbelegt.
6. **Durchschnittliche Hardware?** Im Labor ja: mit vierfach gedrosselter CPU und langsamem 4G LCP 0,9 bis 1,3 s, Bildtakt der Fahrt 16,7 ms bei 60 Hz, Interaktionen höchstens 128 ms. Auf einem echten Mittelklasse-Telefon ist das nicht geprüft. Für die Fahrt gibt es drei Stufen und einen Fallback.
7. **Ohne JavaScript oder ohne Bildfolge?** Ohne JavaScript, bei Reduced Motion und bei Save-Data: Ankunftsbild als Hero, die Reise als vierteiliger Bild-Essay, alle Inhalte und Formulare. Fällt nur die Bildfolge aus: gepinnte Bühne mit zwei Standbildern und allen Kapiteln.
8. **Security von Anfang an?** Ja. Eine einzige Server-Route mit Schema, Limits, Rate-Limit, Bot-Falle und Same-Origin-Prüfung; CSP mit Hashes; keine Cookies, keine Fremdskripte; Secrets nur auf dem Server.
9. **Keyboard und Reduced Motion?** Ja, geprüft.
10. **Nach Austausch von Logo und Text für eine andere Firma verwendbar?** Nein. Die Fahrt zeigt diese Pflanze, diese Fäden und dieses Glas mit diesem Etikett; Farben, Schriften und das Etikett-Muster stammen vom Produkt.

## Offen

| Punkt | Auswirkung | Wer | Nächster Schritt |
| --- | --- | --- | --- |
| Augenschein der Hero-Fahrt | Nachts als nicht flüssig bemängelt, mittags als „flüssiger" bestätigt mit dem Wunsch nach noch etwas mehr. Die Nachbesserung vom Nachmittag (Feder-Kameraführung, Unschärfe bis zum Glas, Narbe neu) hat der Auftraggeber noch nicht gesehen | Auftraggeber | Vorschau ansehen (Mausrad, Trackpad, „Weiter"), auch auf einem Telefon. Falls nicht gut genug: siehe nächste Zeilen |
| Form der Narbe | In der Makro-Ansicht sind Längsfurchen, das gefaltete Ende und der feine papillöse Rand zu sehen, so wie der Master sie modelliert. Das Ende ist im Modell eine geschlossene, gefaltete Fläche, kein offener Trichter. Ob das dem frischen Exemplar entspricht, ist nicht geprüft; „botanisch korrekt" ist damit nicht belegt | Auftraggeber / 3D | Mit einem Foto oder einem frischen Exemplar vergleichen (`notes/07-3d-artist-notes.md` im Übergabepaket verlangt das vor einem finalen Makroshot). Falls abweichend: Narbe im Blender-Master ausarbeiten, danach die Narben-Abschnitte neu rendern |
| Bewegungsebene größer | Entschieden am 06.10.: Zwischenbilder in 1440 × 810 und 720 × 1280. Rendern läuft bis voraussichtlich 07.10. mittags | Technik | Nach dem Rendern bauen, Pulsieren im Querformat-Abschnitt der Produktenthüllung messen, Performance messen (`docs/STATUS.md`) |
| Bewegungsunschärfe in den Schwenks | Gestalterische Entscheidung, bisher nur an Einzelbildern beurteilt. Querformat: der Schwenk von der Narbe zu den Fäden; Hochformat: die ganze Bewegungsebene | Auftraggeber | Ansehen. Ohne Unschärfe bauen: `RS_NO_BLUR=1 npm run assets:hero` (im Hochformat bleiben dann nur die 64 Basisbilder, weil dort keine scharfen Zwischenbilder gerendert sind). Weitere Wege: den Rückzug zum Glas ebenfalls unscharf rendern, oder die Kapitelwechsel als Überblendung statt als Schwenk anlegen (neue Kameraführung, neue Basisbilder) |
| Datenmenge der Fahrt | Mit den großen Bewegungssätzen geschätzt rund 12 MB im Querformat und 6 bis 7 MB auf dem Telefon (Stufe High), nachrangig geladen; schwächere Geräte und kleine Fenster weiter 5,5 bzw. 3,9 MB. Mit der Entscheidung für die großen Bilder akzeptiert, gemessen wird nach dem Rendern | Technik | Nach dem Rendern messen und hier eintragen. Stellschrauben, falls zu viel: Stufe Medium als Standard auf Telefonen, niedrigere Bildqualität der Bewegungsebene |
| Echte Geräte (iOS Safari, Android Chrome), Safari und Firefox am Desktop | Darstellung, Scrollverhalten und Bildrate dort unbekannt | Auftraggeber / Technik | Auf mindestens einem iPhone, einem Android-Telefon und einem iPad durchgehen |
| Screenreader | Hörbare Reihenfolge und Ansagen ungeprüft | Technik | Durchlauf mit VoiceOver und NVDA |
| Hosting, TLS, Mail-Anbieter | Formular stellt ohne SMTP nicht zu (antwortet dann ehrlich mit 503); HSTS und Proxy ungeprüft | Auftraggeber / Technik | Anbieter wählen, Variablen setzen, Endpunkt-Tests am Zielsystem wiederholen |
| Rechtliche Prüfung | Impressum, Datenschutz (Entwurf), Kennzeichnung | Auftraggeber | Prüfung vor Launch |
| Produktdaten | siehe `docs/PRODUCT-TRUTH.md` | Auftraggeber | Offene Felder bestätigen |
| Shopify | kein Kauf auf der Website | Auftraggeber | Store einrichten (`docs/SHOPIFY.md`) |
| Versionskontrolle | Kein Git-Repository; Stände sind nicht nachvollziehbar | Technik | Repository anlegen, bevor weitergearbeitet oder ausgeliefert wird |
