# Royal Spices — Prüfung der Safranreise

Geprüfter Stand: flexible-fibers-v1. Browserprüfung: 2026-09-25T23:44:19.978Z. 153.0.4234.48, Windows, automatisierte lokale Edge-Prüfung. Die Hoch- und Querformate wurden als Browseransichten geprüft; echte Mobilgeräte und Safari wurden nicht geprüft.

## Physik und vollständige Landung

| Prüfung | Ergebnis |
|---|---|
| Gestartete, dauerhaft identifizierte Fäden | 800 |
| Zu Beginn sichtbar über die Öffnung ragende Fäden | 42 |
| Innerhalb der ersten 0,2 s bewegte Fäden | 800 / 800 |
| Vollständig durch die Öffnung ausgetreten | 800 / 800 |
| Physischer Kontakt zur virtuellen Linse | 31 |
| Direkter Metallkontakt | 173 |
| Kontakt zur Schale oder zu bereits gelandetem Safran | 800 / 800 |
| Vollständig innerhalb der Schale im Schlussbild | 800 / 800 |
| Ruhende Fäden | 800 / 800 |
| Maximale gespeicherte Endgeschwindigkeit | 0 |
| Gleiche Koordinaten in den letzten beiden Bildern | true |
| Geprüfte Faser-/Zwischenbildpunkte | 34.560.000 |
| Treffer Glas / Schale / Linse / Hintergrund | 0 / 0 / 0 / 0 |
| Geometrie, Gravur und Material der bisherigen Schale | unverändert; Quellvergleich bestanden |

Jeder Faden besteht aus 13 permanenten Materialpunkten. Schwerkraft wirkt ab dem ersten Rechenschritt auf alle Fäden. Feste Schritte mit 180 Hz, Längen- und Biegebedingungen, Nachbarkontakte, Reibung sowie Glas-, Linsen- und Schalenkontakte bestimmen die Bewegung. Es gibt keine individuellen Freigabezeiten und keine Zielanziehung zur Schale.

Die gültige Berechnung wird mit 60 Bildern pro Simulationssekunde gespeichert. Im Browser werden dieselben Koordinaten vorwärts und rückwärts interpoliert. Alle 800 Fäden bleiben vorhanden; die Darstellung verschiebt, löscht oder ersetzt keine Fäden zur Fehlerkorrektur. Numerisch beruhigte, ausreichend langsame Fäden erhalten einen Ruhezustand in der vorberechneten Simulation.

Der Geometrietest prüft die geglättete sichtbare Kurve mit einer Hülle von 0,0085 Szeneneinheiten (größer als der maximale sichtbare Faserradius), einschließlich zeitlicher Zwischenwerte und räumlicher Segmentzwischenpunkte. Das ist eine dokumentierte numerische Prüfung des ausgelieferten Datensatzes, kein Beweis für beliebige neue Simulationen. Neue Physikdaten müssen diese Prüfung erneut bestehen.

Nachweise: [vollständige Bewegungsprüfung](motion-verification.json), [Kontinuität und unveränderte Schale](journey-verification.json), [Objektverfolgung als CSV](objektverfolgung.csv), [Materialpunkte und Ereignisse je ID](objektverfolgung.json).

## Visuelle Prüfung

| Zustand | Geprüfter Inhalt |
|---|---|
| 0 % | Gekipptes abgerundetes Quadratglas, klarer Kragen, schwere Basis, grünes Band, sauberes Etikett; mehrere Fäden passieren bereits die Öffnung. |
| 25 % | Dichter, zusammenhängender Austritt aus dem bewegten Glasinhalt; Ursprung der Fäden bleibt sichtbar. |
| 45 % | Großaufnahme echter Fasern an der Linsenfläche; keine rote Ebene oder Überblendung. |
| 70 % | Kontinuierliche Abwärtsfahrt mit räumlicher Rotation; Fäden über der bestehenden Metallschale. |
| 100 % | Vollständige, ruhige Schale auf Walnussholz, dichter Safranhaufen; keine Fasern außerhalb oder unter dem Boden. |

[Desktopübersicht](qualitaet/desktop-uebersicht.png) · [Tabletübersicht](qualitaet/tablet-uebersicht.png) · [Mobilübersicht](qualitaet/mobile-uebersicht.png). Die 15 Einzelbilder liegen ebenfalls unter qualitaet/.

## Bedienung und Fehlerfälle

- desktop: 1440 × 1000, Vor-/Zurück identisch, Pause/Fortsetzen, Wiedergabe und manueller Abbruch, Tastatursprung, kein horizontaler Überlauf
- tablet: 820 × 1180, Vor-/Zurück identisch, Pause/Fortsetzen, Wiedergabe und manueller Abbruch, Tastatursprung, kein horizontaler Überlauf
- mobile: 390 × 844, Vor-/Zurück identisch, Pause/Fortsetzen, Wiedergabe und manueller Abbruch, Tastatursprung, kein horizontaler Überlauf
- Reduced Motion: statisches Szenenbild, keine angeforderten Bewegungsdaten oder WebGL-Engine.
- Ohne JavaScript: Inhalte, Navigation und passendes Poster bleiben vorhanden.
- Ladefehler, fehlendes WebGL und Kontextverlust: statisches Schlussbild erscheint; Bedienelemente ohne Funktion werden entfernt.
- Autoplay ist optional. Scrollen, Berühren, Tastatur oder andere manuelle Eingriffe beenden es.
- Die erste Seite ist vor dem Laden der Szene nutzbar; Bewegungsdaten werden erst nahe der Szene angefordert. Keine Scrollsperre. Keine neuen externen Skripte oder Tracker.

Nachweis: [Browserprüfung](browser-verification.json).

## Verbleibende Näherungen und Grenzen

1. Die Fasern sind diskrete biegsame Kurven mit vereinfachten Kontakt- und Reibungswerten; keine wissenschaftlich kalibrierte Safranmaterialsimulation. Ihr Kontaktvolumen ist konservativ größer als die sichtbare Oberfläche.
2. Die Zuordnung von 0,5 g zur sichtbaren Fadenzahl und den Szenenmaßen ist nicht massen- oder maßstabsgetreu kalibriert. Die Füllmenge ist eine visuelle Inszenierung.
3. Glasbrechung und Tiefenschärfe sind WebGL-Näherungen. Die gewünschte f/1.8- und 1/120-s-Anmutung wird durch selektive Tiefenschärfe und fehlendes zeitliches Verschmieren angenähert. Ein echtes kalibriertes 100–120-mm-Objektiv und physikalische Verschlusszeit werden nicht simuliert. Mobil wird der zusätzliche Tiefenschärfepass eingespart.
4. Der Küchenraum ist eine fotorealistische, KI-erzeugte Hintergrundfläche in räumlicher Entfernung. Glas, Fasern, Holzplatte und Schale sind dreidimensionale Geometrie; der Hintergrund ist kein vollständig modellierter Küchenraum.
5. Das Glas wurde aus einer einzelnen niedrig aufgelösten Referenz nachmodelliert. Proportionen, Wandstärke und nicht erkennbare Details sind Annäherungen. Das Etikett wurde mit den lesbaren Angaben ROYAL SPICES, SAFFRON und 0,5 g neu gesetzt; unleserliche Kleinstschrift wurde nicht erfunden.
6. Desktop/Tablet/Mobil sind emulierte Ansichten. Tests auf realen durchschnittlichen Smartphones, Safari, Felddaten zu LCP/INP/CLS sowie eine vollständige Screenreaderprüfung stehen aus. Lokale Messwerte stehen in performance-lab.json; daraus wird keine pauschale 60-fps- oder Core-Web-Vitals-Zusage abgeleitet.
7. Die Bewegungsdatei benötigt komprimiert 8.45 MB und wird erst für die Szene geladen. Das Poster bleibt währenddessen nutzbar. Nach 15 Sekunden wird bei ausbleibenden Szenendaten der Fehlerfallback aktiviert.

## Web-Buzz-Abnahme

Produktbezogene Makroreise, zurückhaltende Bedienung, lokale Assets, native Scrollführung, Tastaturbedienung, drei Bildschirmformate und Ausfallzustände sind geprüft. Bestehende Produktpreise, Rechtstexte, Kontaktadressen und Bildrechte wurden in dieser Animationsüberarbeitung nicht erneut redaktionell freigegeben. Die echte Domain royalspices.de wurde nicht verändert. Vollständige Produktionsabnahme bleibt hinsichtlich der unter Punkt 6 genannten Geräte- und Feldprüfungen offen.
