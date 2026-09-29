# Prüfprotokoll – Royal Spices Version 2

## Erfolgreich geprüft

Während der Umsetzung, vor der letzten Unterbrechung der Browserverbindung:
- Interaktive Darstellung in 1440 × 900 und 390 × 844; 320 × 568 zusätzlich auf Überlauf und Bühnenhöhe geprüft.
- Kein horizontaler Seitenüberlauf in diesen Ansichten.
- Glas, Makrofaden und Blüte im Browser sichtbar; Kapitelwechsel per Tastatur geprüft.
- Kork, Papier, Safran und Glas verwenden die erzeugten Texturen; Blüten- und Makro-Render nach Sichtprüfung korrigiert.
- Tastaturdrehung mit Rechts-/Aufwärts-Pfeil und Rücksetzen mit Pos1.
- Wechsel aus einem späteren Kapitel zur ruhigen Ansicht: erster Text, volle Glasansicht, Scrollposition 0, Bühnenhöhe 844 px.
- Catering-Kategorie Signature Canapés geöffnet; alle sieben Gerichte sichtbar. Auswahl korrekt im Anfragefeld übernommen.
- Catering-Entwurf mit ausschließlich fiktiven Testdaten erstellt. Empfänger, Anlass, Gästezahl und Katalogauswahl korrekt im mailto-Link.
- Großhandel: 9 kg durch native Mindestmengenvalidierung abgelehnt; 10 kg akzeptiert. Gewünschte Labor-/Herkunftsunterlagen im Entwurf enthalten.
- Themenwechsel entfernt den alten Entwurf.
- Keine automatisch versendete Nachricht. Der E-Mail-Link wurde im Test nicht geöffnet.
- Keine fehlerhaften Bildressourcen, keine Unicode-Ersatzzeichen und keine Fehler/Warnungen in der zuletzt erfolgreich abgefragten Browserkonsole.

## Abschließende Dateiprüfung

Die Ergebnisse für Build, referenzierte Dateien, GLB-Container und Archive stehen in delivery-validation.json. Die Browsermodelle haben eingebettete Bilddateien und benötigen keine externen Texturpfade.

Der lokale Entwicklungsserver antwortete nach dem Neustart am 29.09.2026 mit HTTP 200. Ein weiterer Screenshot war wegen einer unterbrochenen In-App-Browserverbindung nicht verfügbar. Die letzte Änderung am Erscheinungsbild war die Freigabe von Pinch-Zoom auf der Drehfläche; anschließend wurden Dokumentation und Paketierung ergänzt.

## Prüfgrenzen

Keine Prüfung auf physischen Mobilgeräten, keine GPU-weite Bildratenzusage und keine vollständige Screenreader-Zertifizierung. Systemseitiges prefers-reduced-motion wird im Code berücksichtigt; die manuell aktivierte ruhige Ansicht wurde bedient. Kein absichtlicher WebGL-Ausfall oder Hardware-Kontextverlust erzeugt.

Die Abbildungen in renders/ sind Blender-Cycles-Renderings, keine Browser-Screenshots.

