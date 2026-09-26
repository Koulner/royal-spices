# Uebergabeprotokoll: Royal Spices Safran Website

Stand: 24. September 2026. Dieses Dokument dient als Startpunkt fuer einen neuen Chat.

## Auftrag und letzter Wunsch

Eine professionelle, deutschsprachige Royal-Spices-Website mit Safran aus Herat im Mittelpunkt. Vorbild sind https://royalspices.de/ und https://www.instagram.com/royal_spices_germany. Die Projektregeln liegen unter `C:\Users\adm\Documents\Codex\guidelines\web-buzz` (vier Markdown-Dateien: Master, 3D/Performance, Security/Engineering, Definition of Done).

Das Hero zeigt das Bergfoto der Referenzseite. Die 3D-Szene zeigt eine afghanisch inspirierte, gravierte Metallschale, in die Safran von ausserhalb des Bildes faellt. Am Ende ist die Schale voll. Der Nutzer wollte danach vor allem mehr Immersion: Die Kamera soll mit den Faeden in den Regen eintauchen und sich zum Schluss wieder zur vollen Schale zurueckziehen. Der Nutzer hat den Stand vor dieser letzten Kamerafahrt ausdruecklich als "fabelhaft" bezeichnet.

## Neue Prioritaet fuer den Folgechat

Der naechste Chat soll den folgenden kreativen und technischen Auftrag als neue Zieldefinition behandeln. Er baut auf dem aktuellen Website-Stand auf, ersetzt aber die bisherige reine Schalen-Fahrt als finales Konzept. Die aktuelle Szene ist deshalb als funktionierender Zwischenprototyp zu bewahren, waehrend das neue Konzept zuerst sauber als Produktionsbrief ausgearbeitet wird.

### The Journey of Saffron

Entwickle fuer Royal Spices eine einzige physisch zusammenhaengende Kamerareise:

1. Ein geneigtes, authentisches Safranglas ist der sichtbare Ursprung jedes einzelnen Fadens.
2. Das Glas kippt; die Safranfaeden loesen sich durch Schwerkraft und beginnen ihren sichtbaren Fall.
3. Die Kamera bewegt sich auf die fallenden Faeden zu. Einige Fadenbuendel kommen real an die Linse, gleiten ueber sie hinweg und erzeugen durch die Naehe organische optische Unschaerfe.
4. Die Kamera folgt dem Safran ohne Schnitt, Teleportation, Morphing oder versteckte Ueberblendung nach unten.
5. Die Faeden landen in einer handgefertigten dunklen Keramikschale, rutschen, haften, federn leicht und sammeln sich glaubhaft.
6. Danach folgt ein weicher Dolly-out und Crane-up zu einem ruhigen, zentrierten Produkt-Reveal auf poliertem weissem Marmor mit feiner grauer Aderung.

Die Wirkung soll massgeschneidert, ruhig, hochwertig, taktil und filmisch sein. Ziel ist das Gefuehl, mitten im Safranregen zu stehen und den Wunsch zu entwickeln, selbst in Safran zu baden. Die Bildwelt braucht Luxus-Food-Commercial-Qualitaet mit warmem natuerlichem Tageslicht, tiefem Safranrot, Burnt Orange, anthrazitfarbener Keramik, warmem Elfenbein-Marmor und glaubhaften Mikroreflexionen.

### Verbindliche Arbeitsweise

- Die Sequenz wird mit normalisiertem Fortschritt von 0 bis 100 Prozent beschrieben. Keine fixe Gesamtdauer als Anforderung; optionale Autoplay-Zeiten nur als Empfehlung ausweisen.
- Der naechste Chat soll zuerst einen vollstaendigen Creative- und Technical-Brief schreiben, keinen Code. Der Brief muss fuer Regie, Cinematography, 3D/Animation, Technical Art und Webentwicklung direkt nutzbar sein.
- Der Brief braucht eine Phasenaufteilung mit Fortschrittsbereichen, Kamera, Safranbewegung, Fokus, Optik, Licht, Materialien, Uebergangslogik, Kontinuitaet und erwarteter Wahrnehmung.
- Er muss Kamera und Cinematography, Physik und Animation, Materialien und Licht, Websiteverhalten, Responsive Design, Reduced Motion, Fallbacks, Loading, Lazy Loading und Performance abdecken.
- Es muessen zwei Umsetzungsrichtungen gegenuebergestellt werden: Echtzeit-3D/WebGL und vorgerendertes Cinematic-Video, jeweils mit Staerken, Grenzen, Assets, Performance und Fallback.
- Der Brief benoetigt messbare Abnahmekriterien fuer Kontinuitaet, Physik, Kamera, Realismus, Markenpassung, Responsive Verhalten, Accessibility, Performance und finalen Hero-Reveal.
- Am Ende steht ein eigenstaendiger Master-Prompt fuer 3D-Artist, Animationsteam, Video-Generierung oder Technical Director mit Essential Details, optionalen Details und Negativvorgaben.
- Keine Menschen, Haende, Explosionen, magischen Effekte, Rauch-/Fluessigkeits-/Cloud-Optik, kuenstlichen Schnitte, neuen Slogans oder nicht angeforderten Objekte erfinden.

### Spezieller Produktionshinweis

Die neue Definition verlangt echte Nachverfolgbarkeit jedes Fadens vom Glas bis zur Schale. Die vorhandene Bake mit 2.200 Buendeln und 11.000 sichtbaren Faeden kann als technische Grundlage dienen, muss aber fuer Glasquelle, Linsenkontakt, flexible Fadenbewegung, Ceramic-Bowl-Kollision und Marble-Reveal neu bewertet werden. Die bisherige gravierte Metallschale darf nicht ungeprueft als finale Schale uebernommen werden, weil der neue Auftrag ausdruecklich eine dunkle handgefertigte Keramikschale vorsieht.

Die vollstaendige Ausgangsanweisung wurde in `C:\Users\adm\.codex\attachments\daa5dc73-a26f-4784-a026-33d635119ea4\Eingefügter Text.txt` uebergeben. Falls der neue Chat den Anhang nicht lesen kann, gelten die Abschnitte oben als verbindliche Zusammenfassung.

## Ort und Vorschau

- Projekt: `C:\Users\adm\Documents\Codex\2026-09-24\he\outputs\royal-spices`
- Ausgelieferte statische Seite: `...\outputs\royal-spices\dist`
- Lokale Vorschau: http://127.0.0.1:4178/
- Vorschau direkt an der Szene: http://127.0.0.1:4178/#scene-story
- Der lokale Server antwortete bei der Uebergabe mit HTTP 200.
- Falls er im neuen Chat nicht mehr laeuft: `C:\Users\adm\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe C:\Users\adm\Documents\Codex\2026-09-24\he\work\serve.cjs` im Projektordner starten.
- Keine Live-Schaltung und keine Aenderung an royalspices.de erfolgt. Ein Site-Projekt wurde frueher nur privat registriert, nie veroeffentlicht. `robots` steht auf `noindex,nofollow`.

## Umsetzung

- `dist/index.html`: semantische Seite mit Hero, Safran-Inszenierung, Produkt- und Grosshandelsangebot, Catering, Kontaktformular und Bildnachweis. Reale Produktbilder und das echte Bergfoto der Referenzseite.
- `dist/styles.css`: responsives Layout und Scroll-Szene. Die Scrollstrecke wird mit JavaScript sofort reserviert, damit Nachladen kein Scroll-Springen ausloest. Ohne JavaScript bleibt die Seite lesbar.
- `dist/app.js`: Navigation, Formular, Lazy Loading der 3D-Szene und direkte Abbildung der Scrollposition auf den Animationsfortschritt. Pause-Funktion und Reduced-Motion-Beruecksichtigung.
- `dist/scene.js`: Three.js-Szene mit vertiefter Schale, Metalltextur, weichen Schatten, 11.000 instanzierten Safranfaeden und Kamera. Gebackene Cannon-es-Bewegungsdaten werden vor- und rueckwaerts zur Scrollposition interpoliert. Keine zeitliche Nachlaufanimation.
- `dist/assets/saffron-motion.json` und `.bin.gz`: 2.200 physikalische Buendel, 11.000 sichtbare Faeden, 481 Frames. Delta-Kompression auf 4,72 MB; die verlustfreie Rueckwandlung wurde geprueft.
- Die letzte Aenderung fuegt zwischen ungefaehr 10 % und 85 % Scrollfortschritt eine Kamerafahrt durch den Safranregen hinzu, mit groesster Naehe zwischen 36 % und 57 %. Desktop nutzt lokal gespeicherte Three.js-Tiefenschaerfe-Module; auf Mobilgeraeten wird dieser Zusatzpass beim initialen Laden unter 800 px weggelassen. Begleittexte blenden waehrend der Nahaufnahme aus.
- Das Kontaktformular bereitet eine E-Mail lokal vor. Es gibt keinen Server zum Versand und kein Tracking.

## Bisherige Pruefungen

- Voller Schalenstand visuell auf Desktop und Mobilgeraet begutachtet. Die 2.200 Buendel bleiben laut Bake innerhalb der Schale; 95 % ihrer Mittelpunkte liegen unter 0,364, der Schalenrand bei 0,45, Hoechstwert 0,479. Am Ende schlafen alle Buendel. Siehe `motion-verification.json`.
- Direkte Scrollkopplung vor der neuen Nahaufnahme getestet: gerenderter Fortschritt und berechneter Scrollfortschritt stimmten bis auf Rundung ueberein; nach Rueckwaertsscrollen kehrte sogar die Canvas-Pixelsignatur zum gleichen Wert zurueck.
- Mobile bei 390 x 844 und Desktop bis 1440 x 1000 visuell geprueft, ohne horizontales Ueberlaufen. Navigation, Formular und Pause wurden bereits getestet.
- Die neue immersive Desktop-Nahaufnahme wurde bei rund 25 % und 41 % angesehen: riesige Faeden im Vordergrund, Schale darunter, Tiefenschaerfe aktiv, keine Browserwarnungen oder Fehler. Bei 41 % meldete die Szene 49 Draw Calls und rund 3,75 Mio. Dreiecke pro Frame. Das ist ein Leistungsrisiko auf schwaecheren Rechnern.
- Nach der allerletzten CSS-Aenderung (frueheres Ausblenden der Texte) und der neuen Kamerafahrt ist die abschliessende Pruefung noch offen. Genau hier wurde die Arbeit durch die Bitte um dieses Protokoll unterbrochen.

## Naechste Schritte

1. Desktop-Fahrt von Beginn bis Ende und rueckwaerts erneut visuell pruefen. Besonders die Uebergaenge in/aus der Nahaufnahme, die Lesbarkeit der Bedienung und den Hintergrundfarbwechsel beim Aktivieren des Tiefenschaerfe-Passes beurteilen. In der Nahaufnahme wurde ein etwas graueres Weiss beobachtet.
2. Mobile Nahaufnahme mit der neuen Kamera testen, vor allem bei 390 x 844 und einem kleinen Display. Schale, Fadenregen und Bedienelemente duerfen nicht ungewollt verdeckt werden.
3. Scrollfortschritt erneut an mehreren Punkten mit `canvas[data-pixels]` gegen `-story.getBoundingClientRect().top / (story.offsetHeight - innerHeight)` pruefen. Die Werte `progress` und `target` muessen gleich sein; nach Rueckscrollen soll derselbe Bildzustand erscheinen.
4. Desktop- und Mobile-Leistung nach der Tiefenschaerfe-Aenderung messen. Falls noetig den Zusatzpass guenstiger machen oder auf langsameren Geraeten abschalten, ohne die Kamerafahrt zu entfernen.
5. `work/verify-assets.cjs` erneut laufen lassen: `assets.lock.json` wurde vor der letzten Delta-Kompression und den neuen Three.js-Modulen erstellt und ist deshalb veraltet. Das npm-Audit hatte fuer Three.js 0.180.0, Lucide 1.8.0 und Cannon-es 0.20.0 keine Meldungen geliefert.
6. Ein kurzes finales QA-Protokoll nach den Web-Buzz-Guidelines erstellen. Bisherige Laborwerte waren nur localhost/Desktop; reale Mobilgeraete und Felddaten wurden nicht gemessen.

## Fachliche und rechtliche Hinweise

- Produktangaben stammen von royalspices.de: Herat/Negin, 1-g-Glas 4,90 EUR, 24er-Display 117,60 EUR, lose Ware ab 10 kg mit Richtpreisen. Das verwendete Original-Glasfoto zeigt eine 0,5-g-Verpackung; die Seite kennzeichnet dies ausdruecklich.
- Das Bergfoto wurde von der Referenzseite uebernommen; im Footer stehen "Wakhan, Tajikistan" von Ninara und CC BY 2.0 mit Links. Der Text nennt nicht faelschlich einen konkreten afghanischen Aufnahmeort.
- Die gravierte Schale und ihr Material sind eine eigenstaendige digitale Interpretation afghanischer Metallarbeit, kein Foto eines historischen Einzelobjekts. Die Simulation ist eine visuelle Annaeherung, keine exakte Physik flexibler Safranfasern.
- Vor einer Veroeffentlichung: Preise, Kontakt- und Rechtstexte mit dem Betreiber abnehmen; Bildrechte pruefen; finale Domain und Canonical/OG setzen; Indexierung und Sitemap bewusst aktivieren.

## Praktischer Einstieg im neuen Chat

"Arbeite an `C:\Users\adm\Documents\Codex\2026-09-24\he\outputs\royal-spices` weiter. Lies zuerst `UEBERGABE.md` und die Regeln in `C:\Users\adm\Documents\Codex\guidelines\web-buzz`. Erstelle als naechsten Schritt den Creative- und Technical-Brief fuer `The Journey of Saffron`: geneigtes Glas, sichtbarer Ursprung jedes Fadens, Fall zur Kamera, echter Linsenkontakt mit organischer optischer Unschaerfe, kontinuierlicher Abstieg, dunkle handgefertigte Keramikschale und abschliessender Dolly-out/Crane-up-Reveal auf weissem Marmor. Verwende 0-100 Prozent normalisierten Fortschritt statt einer fixen Dauer. Liefere zuerst den Produktionsbrief und keinen Code. Bewahre die bisherige volle Schale und die direkte Scrollkopplung als Zwischenstand, bis der neue Brief abgenommen ist."
