# Übernahmeprotokoll — Royal Spices, Safranreise

Stand: 26. September 2026. Dieses Protokoll beschreibt den **laufenden Arbeitsstand** für einen neuen Chat. Die aktuelle 2.400-Fäden-Fassung ist noch nicht vollständig abgenommen.

## Auftrag und Priorität

Der Nutzer möchte die bestehende interaktive 3D-Safrananimation nach dem Masterbrief überarbeiten. Zusätzlich dürfen Fäden keine Glaswände, den Schalenrand oder andere feste Flächen durchdringen. Die jüngste Korrektur des Nutzers ist die höchste Priorität: **viel mehr Fäden und eine Form, Farbe und Oberfläche, die echtem getrocknetem Safran möglichst genau entspricht**. Er möchte anschließend in einem anderen Chat fortfahren.

Der vollständige Masterbrief liegt unter `C:\Users\adm\.codex\attachments\d1d18b15-b95e-4737-bd4f-ef8a32e8597b\Eingefügter Text.txt`. Die vom Nutzer bereitgestellte Glasreferenz wurde unter `work/jar-reference.png` abgelegt. Eine scharfe Makroaufnahme **des konkreten Royal-Spices-Safrans** wurde bereits angefragt, ist bisher aber nicht eingetroffen. Ohne diese Referenz ist eine echte 1:1-Übereinstimmung mit dem Produkt nicht belegbar. Die neue Form orientiert sich vorläufig an Makrofotos echten Safrans und einer botanischen Untersuchung; diese externen Bilder wurden nicht als Website-Dateien übernommen.

## Orte und Vorschau

- Arbeitsverzeichnis: `C:\Users\adm\Documents\Codex\2026-09-25\au-erdem-die-f-den-d`
- Projekt: `outputs\royal-spices`
- Webdateien: `outputs\royal-spices\dist`
- Lokale Vorschau: `http://127.0.0.1:4182/#scene-story`
- Vorschau bei Bedarf aus dem Arbeitsverzeichnis starten: `node work/serve.cjs`
- Aktueller Vorschauprozess wurde im bisherigen Chat erneut gestartet; die Vorschau kann in einem anderen Chat trotzdem einen Neustart benötigen.
- Die echte Domain `royalspices.de` wurde nicht geändert. Die Website wurde nicht veröffentlicht. Die `.openai/hosting.json` ist vorhanden; ein Sites-Projekt existiert, aber es gibt noch keine bereitgestellte Version.

## Was bereits geändert wurde

Die vorherige geprüfte Zwischenfassung hatte 800 röhrenartige Fäden. Die aktuelle Animation verwendet **2.400 permanent identifizierte Fäden** mit jeweils **17 Kontrollpunkten**, längerer und unterschiedlich gekrümmter Form. Die Oberfläche hat flache und verdrehte Körper, dünnere Ansätze, verbreiterte unregelmäßige Enden, Rot- und Orangetöne, feine Rillen und eine matte Materialreaktion. Die Schlusskamera zeigt die Schale näher. Die Form wird in drei Geometriedichten dargestellt; die Fadenzahl bleibt dabei gleich.

Die Physik berücksichtigt weiterhin Glas, bewegte Linse und die unveränderte gravierte Metallschale. Nach einem strengeren Test wurden die Kollisionen am äußeren Glasrand und am gerollten Schalenrand ergänzt. Die neue, zuletzt akzeptierte Berechnung meldet: **2.400/2.400 ausgetreten, 2.400/2.400 in der Schale, 2.400/2.400 ruhend**, 58 Linsenkontakte, 321 direkte Metallkontakte. Die Bewegungsdatei wurde anschließend auf 550 Bilder beziehungsweise 9,15 s gekürzt; die komprimierte Datei ist etwa **41,5 MB** groß.

Wichtige Dateien:

- `dist/fiber-morphology.js`: einzelne Fadenprofile und Spitzen
- `dist/fibers.js`: Geometrie, Farbe, Mikrostruktur, Material und Detailstufen
- `dist/fiber-curve.js`: geglättete Bahn aus Kontrollpunkten
- `dist/saffron-scene.js`: 3D-Darstellung und Kameraschnittstelle
- `dist/journey.js`: Scrollzeit und Kamerafahrt
- `dist/physics-shape.js`: gemeinsame Kollisionsmaße
- `dist/bowl.js`: unveränderte Schalenquelle
- `dist/assets/saffron-motion.json` und `.bin.gz`: aktuelle vorberechnete Bewegung
- `work/bake-fibers.mjs`: Physik erneut berechnen
- `work/trim-motion.mjs`: ruhende Schlussbilder kürzen
- `work/audit-motion.mjs`: Wand-, Schalen-, Linsen- und Austrittsprüfung
- `work/audit-morphology.mjs`: maximale Ausdehnung des Fadenprofils
- `work/verify-browser.cjs`: Browser- und Bedienungsprüfung plus 15 Prüfbilder
- `work/finalize.mjs`: Prüfprotokoll, Objektverfolgung, Poster und Übergabedateien nach bestandenen Prüfungen aktualisieren

## Unbedingt beachten: Prüfstand ist noch offen

Die **Profilprüfung** ist für die neue Form bestanden: 18.585.600 Profilproben, maximale Ausdehnung 0,007873 gegenüber der geprüften Hülle 0,0085. Nachweis: `morphology-verification.json`.

Die **vollständige Kollisionsprüfung der aktuellen 17-Punkte-Bewegung wurde noch nicht gestartet beziehungsweise bestanden**. `motion-verification.json` enthält derzeit einen **fehlgeschlagenen Test der vorherigen 13-Punkte-Kandidatin**. Dessen Fehlerzahlen gelten nicht für die jetzt gespeicherte 17-Punkte-Bewegung. Ebenso beziehen sich `browser-verification.json`, `PRUEFPROTOKOLL.md`, `README.md`, `UEBERGABE.md`, `objektverfolgung.*` und die normalen Bilder in `qualitaet/` noch auf die letzte abgeschlossene 800-Fäden-Fassung beziehungsweise einen älteren Zwischenstand. Diese Dateien dürfen bis zur Neugenerierung nicht als Nachweis der neuen Fassung ausgegeben werden. `qualitaet/vorher-makro.webp` und `vorher-schale.webp` wurden für den Vergleich gesichert.

Die aktuelle Vorschau verwendet bereits die neuen Quelldateien und Bewegungsdaten, ist aber **ein Arbeitsstand**. Die 41,5-MB-Bewegungsdatei ist außerdem ein konkretes Lade- und Mobilrisiko. Im Browser gilt derzeit ein 15-Sekunden-Ladefenster mit Poster als Rückfall. Echte Smartphones und Safari sind weiterhin nicht geprüft.

## Nächste Schritte für den neuen Chat

1. Aus dem oben genannten Arbeitsverzeichnis `node work/audit-motion.mjs` ausführen. Der Test prüft sichtbare Faserhüllen bei 16, 19 und 31 Querschnitten über gespeicherte Bilder und zeitliche Zwischenwerte. Bei einem Fehler zuerst die genaue Stelle untersuchen und die **Physik oder die Geometrie** korrigieren; keine Fäden ausblenden, löschen, versetzen oder den Test abschalten. Nach einer Physikänderung neu berechnen und erneut kürzen.
2. Falls die Kollisionsprüfung besteht, mit `node work/inspect-fibers.cjs` die neue Nahaufnahme und Schlussschale begutachten. Die Bilder heißen `work/stigma-25.png`, `stigma-45.png`, `stigma-100.png`. Auf glaubwürdige Fadenlänge, matte tiefrote Farbe, aufgefächerte Spitzen und ausreichende Menge achten. Für eine genaue Produktangleichung eine eingereichte Makroaufnahme berücksichtigen, falls sie im neuen Chat vorliegt.
3. `node work/verify-browser.cjs` ausführen. Dabei müssen Desktop, Tablet, Mobil, Rückwärts-Scrollen, Pause, optionale Wiedergabe, Tastatur, Reduced Motion und Fehlerfälle bestehen. Das Skript erzeugt 15 neue Prüfbilder und aktualisierte Poster. Bei 41,5 MB besonders Ladezeit und Speicher prüfen; die automatische Browservorschau darf nicht auf ein altes Poster fallen.
4. Erst danach `node work/finalize.mjs` ausführen. Das Programm verweigert die Übergabe bei fehlender Kollisionsprüfung, Browserfehlern oder veralteten Fadenzahlen. Danach `PRUEFPROTOKOLL.md`, `README.md`, `UEBERGABE.md`, `qualitaet/` und `assets.lock.json` auf die neue Fassung kontrollieren.
5. Die geöffnete lokale Vorschau neu laden und die fünf Scrollstationen visuell abnehmen. Offen dokumentieren, dass die WebGL-Oberfläche eine Annäherung bleibt und ein konkreter 1:1-Produktvergleich eine scharfe Produktreferenz benötigt.

Für den neuen Chat genügt als Startauftrag: **„Setze die Arbeit am Royal-Spices-Projekt anhand von `outputs/royal-spices/UEBERNAHMEPROTOKOLL.md` fort. Priorität sind echte Safranoptik, mehr Fäden, vollständige Kollisionsprüfung und die abschließende Browserabnahme. Übernimm keine veralteten Prüfergebnisse als Beleg für die aktuelle Fassung.“**
