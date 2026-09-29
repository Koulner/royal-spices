# Royal Spices – Website und Blender, Version 2

Stand: 29. September 2026. Lokale, bearbeitbare Website mit einer interaktiven Produktreise und den Geschäftsinhalten von Royal Spices.

## Starten

Node.js 22.12 oder neuer und pnpm installieren. Im Projektordner:
- pnpm install
- pnpm dev
- Vorschau: http://127.0.0.1:5173/

Für einen statischen Build: pnpm build. Den Inhalt von dist über einen HTTP-Server ausliefern; index.html nicht per Datei-Doppelklick öffnen. Die beigefügte Royal-Spices-Website-Build.zip enthält die benötigten Auslieferungsdateien.

## Umgesetzt

- Sieben Kapitel: Glas, Nahaufnahme, einzelner Safranfaden, Herkunft Herat, Crocus-sativus-Blüte, Rotes Gold und Rückkehr zum drehbaren Glas.
- In Blender Cycles berechnete Farb-, Rauheits- und Normal-Texturen für Kork, Papier, Siegel, Glas und Safran. Eigene Studio-Lichtumgebung für Blender und Browser.
- Anthrazitblaues Siegel entsprechend dem Originalfoto. Korrigierte Überschneidung am Glasrand.
- Organisch gekrümmte Safrannarbe mit länglicher Oberflächenstruktur und geweiteter Spitze.
- Maus-, Touch- und Tastatursteuerung mit Trägheit und langsamer Rückkehr zur Kamerafahrt.
- Angepasste mobile Komposition, Bildfallback, reduzierte Bewegung sowie Renderpause außerhalb der Produktreise und bei verborgenem Tab.
- Herkunft und Qualität, B2B-Gläser mit Fotos, loser Safran ab 10 kg, Catering mit sechs aufklappbaren Kategorien, Pakete und FAQ.
- Drei Anfragearten. Die Website erstellt einen lokalen Entwurf; nur der Besucher öffnet und versendet ihn im eigenen E-Mail-Programm. Kein Backend und kein automatischer Versand.
- Selbst gehostete Schriften, sichtbare Fokusmarkierungen, Sprunglink, native Formularvalidierung und korrekt kodierter deutscher Text.

## Dateien

- asset-source/royal-spices-v2.blend: aktuelles Glas, Safran, Materialien und Studiobeleuchtung. Texturen sind eingepackt.
- asset-source/crocus.blend: bearbeitbare Blüte mit sechs Blütenblättern, drei gelben Staubbeuteln und drei roten Narbenästen.
- public/assets/materials/: hochauflösende Blender-Texturen.
- public/assets/royal-jar-web.glb, saffron-thread-web.glb, crocus-web.glb: optimierte Modelle für die Website.
- public/assets/royal-studio.exr: berechnete Lichtumgebung.
- renders/hero-reference-v2.png, saffron-macro-v2.png, crocus-reference.png: eigenständige Cycles-Renderings.
- references/: Originalfotos, Faktenprüfung, Materialverzeichnis und Prüfprotokoll.
- src/: React-Oberfläche und Echtzeit-Animation.

Die Browser-Modelle benötigen zusammen rund 7 MB unkomprimiert. Die ursprünglichen Textur-Bakes und Blender-Dateien werden von der Website nicht geladen. Hochauflösende Ausgangsexporte sind als -v2.glb ebenfalls enthalten.

## Bearbeiten und neu berechnen

Die fertigen Blender-Dateien können direkt geöffnet werden. Die Browseranimation wird in src/scene/ScrollDirector.js gestaltet; die .blend-Dateien sind die Modell- und Materialquellen, kein exportierter Film.

Für die vollständige Neuerzeugung mit Blender 4.5 die folgenden Python-Dateien nacheinander mit Blender --background --python ausführen:
1. asset-source/material_pipeline_v2.py
2. asset-source/build_flower_and_refs.py
3. asset-source/refine_flower.py
4. asset-source/finish_seal.py

Danach mit normalem Python und Pillow: python asset-source/prepare_web_assets.py. Das erstellt kleinere Texturen innerhalb der GLBs, die WebP-Fotos, das Poster und den Katalog aus dem archivierten HTML. Blender selbst wird nicht mitgeliefert. Die älteren Generatoren und die erste .blend-Datei bleiben als Ausgangsbasis erhalten.

## Nachweise und Grenzen

Geschäftsinhalte und Preise wurden am 28.09.2026 mit royalspices.de abgeglichen. Bildreferenz und 3D-Modell zeigen die fotografierte 0,5-g-Verpackung; das aktuelle B2B-Angebot betrifft 1-g-Gläser. Dieser Unterschied steht auch auf der Website.

Form und Mikrostruktur sind visuelle Rekonstruktionen nach Fotos und der synthetischen Referenztafel. Es handelt sich nicht um einen maßhaltigen Scan. Verdeckte Flächen sind rekonstruiert. Die Blüte ist eine botanisch orientierte 3D-Illustration. Echtzeitglas bleibt eine Näherung gegenüber dem Cycles-Render.

Die Website wurde im Desktop-Browser und in mobilen Viewports geprüft. Reale iOS-/Android-Geräte und sämtliche GPU-Klassen sind nicht abgedeckt. Detailnachweise: references/qa-v2.md.

Die Live-Seite royalspices.de wurde nicht verändert. Die Vorschau enthält weiterhin noindex,nofollow. Für eine Veröffentlichung sind das endgültige Hosting, die Live-Inhalte und die Suchmaschinenfreigabe noch festzulegen.

