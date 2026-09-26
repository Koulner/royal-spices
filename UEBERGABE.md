# Übergabe

Aktueller Arbeitsstand: 2026-09-25T23:48:53.251Z

Projekt: C:\Users\adm\Documents\Codex\2026-09-25\au-erdem-die-f-den-d\outputs\royal-spices

Zuerst README.md und PRUEFPROTOKOLL.md lesen. Die aktualisierte Szene liegt in dist/saffron-scene.js, das Referenzglas und die Bühne in dist/set-design.js, gemeinsame Kollisionsmaße in dist/physics-shape.js, die Kamerafahrt und die direkte Cache-Wiedergabe in dist/journey.js. dist/bowl.js enthält den unveränderten Schalenblock der Vorgängerversion.

Bewegungsdaten: 800 Fäden × 13 Materialpunkte, 180-Hz-Berechnung, 60-Hz-Cache. Aktuell alle 800 innerhalb der Schale und ruhend. Die QA darf nicht durch Verändern von Objektzahlen, Ausblenden oder Positionskorrekturen ersetzt werden.

Vorbereitung und Prüfwerkzeuge stehen unter scripts/. Zum Neuberechnen von der Projektwurzel: node scripts/bake-fibers.mjs; danach node scripts/audit-motion.mjs. Jede Geometrie- oder Bewegungsänderung benötigt eine erneute Prüfung. Ein neuer Durchlauf kann mehrere Minuten dauern.

Die browser-verification.json und die 15 Bilder unter qualitaet/ belegen den ausgelieferten Stand. Reale Mobilgeräte und Safari sind noch nicht geprüft. Keine Änderung der echten Domain royalspices.de.
