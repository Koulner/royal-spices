# Product Truth

Verbindliche Produkt- und Unternehmensdaten für V1 und alles, was noch offen ist. Die Website zeigt nur, was hier als bestätigt steht. Offene Felder werden auf der Website nicht geraten, sondern weggelassen oder als „steht auf dem Glas" bezeichnet.

Stand: 06.10.2026. Bestätigung der Etikettdaten durch den Auftraggeber am 05.10.2026.

## SKU: Safranfäden im Glas, 1 g

| Feld | Wert | Status | Quelle |
| --- | --- | --- | --- |
| Produktbezeichnung | Safranfäden (Frontetikett: „Saffron") | bestätigt | Auftraggeber, 05.10.2026 |
| Füllmenge | 1 g | bestätigt | Auftraggeber, 05.10.2026: V1-Produkt ist das 1-g-Glas |
| Herkunft | Afghanistan | bestätigt | Auftraggeber, 05.10.2026 |
| Region | Herat | bestätigt | Auftraggeber, 05.10.2026 |
| Grade / Qualität | Negin · Grade 1 | bestätigt | Auftraggeber, 05.10.2026 |
| Zutaten | 100 % Safran | bestätigt | Auftraggeber, 05.10.2026 |
| Abfüllung | In Deutschland abgefüllt | bestätigt | Auftraggeber, 05.10.2026 |
| Verantwortliches Unternehmen | Royal Spices · Sajad Akrami | bestätigt | Auftraggeber, 05.10.2026 |
| Anschrift | Hammerdeich 10 · 20537 Hamburg | bestätigt | Auftraggeber, 05.10.2026 |
| Kontakt | info@royalspices.de · 040 59374940 | bestätigt | wie auf royalspices.de veröffentlicht (geprüft 28.09.2026) |
| USt-ID | DE459334343 | bestätigt | wie auf royalspices.de veröffentlicht |
| Lagerhinweis | „Trocken, kühl und vor Licht geschützt lagern." | **bitte bestätigen** | Rücketikett-Entwurf des Auftraggebers (0,5-g-Fassung); in der Bestätigung vom 05.10. nicht eigens genannt |
| Verpackung | Glas, Naturkork, Siegelstreifen, Papieretikett | sichtbar belegt | Produkttafel und Foto des Auftraggebers |
| SKU / Artikelnummer | – | **offen** | |
| WhatsApp-/QR-Ziel | – | **offen** | Rücketikett-Entwurf: „Nummer offen" |
| MHD-Verfahren | – | **offen** | Etikett hat ein Feld, das Verfahren ist nicht festgelegt |
| Charge / Los | – | **offen** | Etikett hat ein Feld, das Schema ist nicht festgelegt |
| Preis | – | bewusst nicht auf der Website | Auftraggeber, 05.10.2026: keine Preise |
| Zertifikate, Analysen | keine veröffentlicht | – | Es liegen keine Nachweise vor. Die Website nennt keine. |
| Claims | keine | – | Keine Gesundheits-, Qualitäts- oder Superlativ-Aussagen. |

So setzt die Website das um:

- `src/data/product.ts` und `src/config/site.ts` enthalten ausschließlich die bestätigten Werte.
- MHD und Charge erscheinen im Datenblatt als „steht auf dem Glas".
- WhatsApp und der Kaufkanal für Privatkunden werden erst gerendert, wenn `site.whatsapp` bzw. `site.retailUrl` gesetzt sind.
- Preis und Verfügbarkeit kommen später aus Shopify (`docs/SHOPIFY.md`); bis dahin führt das Produkt in die Anfrage.

## Weitere Gebinde und Leistungen

| Angabe | Wert | Status | Quelle |
| --- | --- | --- | --- |
| Display für den Verkauf | 24 Gläser à 1 g | übernommen | bisheriger Webauftritt („Thekendisplay mit 24 Gläsern à 1 g") |
| Lose Ware | ab 10 kg; Negin, Pushal, Konjai | übernommen | bisheriger Webauftritt |
| Preise | keine | bestätigt | Auftraggeber, 05.10.2026. Die Preise des bisherigen Webauftritts (Glas, Display) sind nicht übernommen. |
| Catering | Leistungen und Katalog im bisherigen Umfang, ohne Preise | bestätigt | Auftraggeber, 05.10.2026 |

## Offene Punkte

Jeder Punkt mit Auswirkung, Verantwortlichkeit und nächstem Schritt.

| Nr. | Punkt | Auswirkung | Wer | Nächster Schritt |
| --- | --- | --- | --- | --- |
| 1 | Rücketikett für 1 g existiert nicht (Vorlage nennt 0,5 g) | Im Hero ist das Rücketikett ausgeblendet; die Abnahme „Backlabel: korrekte Daten" ist nicht möglich | Auftraggeber | 1-g-Druckdatei liefern; dann Rückseite einblenden und Produktansicht „hinten" rendern |
| 2 | Foto zeigt die 0,5-g-Gläser | Das Originalfoto ist auf der Website als 0,5-g-Ausführung beschriftet | Auftraggeber | Foto der 1-g-Gläser liefern |
| 3 | WhatsApp-/QR-Ziel | Kein WhatsApp-Kontakt auf der Website | Auftraggeber | Nummer bzw. Ziel nennen |
| 4 | SKU, MHD-Verfahren, Chargenschema | Fehlen im Datenblatt und in den strukturierten Daten; für Shopify nötig. „Herkunft & Qualität" sagt, MHD und Los stünden auf jedem Glas und das Los ordne es seiner Charge zu: Das stimmt erst, wenn das Verfahren steht | Auftraggeber | Festlegen; bis dahin den Satz bestätigen oder streichen |
| 5 | Lagerhinweis | Steht auf der Website wie im Entwurf | Auftraggeber | Wortlaut bestätigen |
| 6 | Display ohne Bild | Die vorhandene Visualisierung passt nicht zur V1-Gestaltung; das Display steht nur als Text auf der Website | Auftraggeber | Foto des Displays liefern oder Rendering beauftragen |
| 7 | Satz „Negin nennt der Handel ganze, rote Fäden" | Erklärung auf „Herkunft & Qualität"; Handelsdefinition von uns, keine Angabe des Auftraggebers | Auftraggeber | Bestätigen, anpassen oder streichen |
| 8 | Farbe des Siegelstreifens | Spezifikation: dunkelgrün; Foto: blaugrau; Rendering: anthrazit | Auftraggeber | Verbindliche Farbe (Muster oder Farbwert) nennen; danach Standbilder und Sequenz neu rendern |
| 9 | Original-Logo als Vektor fehlt | Blattzeichen ist nach dem Etikett nachgezeichnet | Auftraggeber | Vektordatei liefern |
| 10 | Frontetikett: keine Druckdaten | Layout im Rendering ist nach der Produkttafel rekonstruiert; „0,5 g" wurde für V1 durch „1 g" ersetzt | Auftraggeber | Druckdatei des 1-g-Frontetiketts liefern |
| 11 | Kaufkanal für Privatkunden bis Shopify | Der bisherige TikTok-Shop-Link ist nicht übernommen (`site.retailUrl` leer); Privatkunden fragen an | Auftraggeber | Entscheiden: Link wieder aufnehmen oder bei Anfrage bleiben |
| 12 | Hosting und E-Mail-Dienst | Formular braucht einen Server und SMTP; der Datenschutztext ist bis dahin ein Entwurf | Auftraggeber / Technik | Anbieter wählen, Zugangsdaten als Umgebungsvariablen setzen, Datenschutztext ergänzen |
| 13 | Rechtliche Prüfung | Impressum, Datenschutz und Kennzeichnung sind nicht juristisch geprüft | Auftraggeber | Prüfung durch die verantwortliche Stelle vor Launch und vor Druck |
| 14 | Nachweise (Analysen, Zertifikate) | Der Abschnitt „Nachweise" bietet Unterlagen auf Anfrage an, zeigt aber keine | Auftraggeber | Vorhandene Dokumente liefern; nur diese werden veröffentlicht |

## Widersprüche in den Unterlagen

Historische Angaben, die nicht stillschweigend übernommen wurden:

- **Füllmenge:** Produkttafel, Rücketikett-Entwurf und Blender-Master nennen 0,5 g. Verbindlich ist 1 g (05.10.2026). Im Rendering wird nur die Mengenzeile geändert (`pipeline/blender/web_hero.py`); der Master bleibt unverändert.
- **Siegelstreifen:** drei verschiedene Farben in Spezifikation, Foto und Rendering (Punkt 8).
- **Produkttafel:** Ihre Fußnote weist sie als KI-Rekonstruktion nach Fotoreferenzen aus. Sie ist Bildreferenz für Glas, Kork, Siegel und Etikett, keine Quelle für Produktdaten.
