# Royal Spices: Vorbereitung für den Umzug der Website (Phase 0)

**Für:** Sajad Akrami, Royal Spices
**Stand:** 16.10.2026. Alle Links auf Hilfeseiten wurden an diesem Tag geprüft.
**Grundlage:** SEO-Masterplan, Phase 0 (`docs/UEBERGABE-SEO.md`, Aufgaben V1–V6)

## Worum es geht

royalspices.de zieht von Shopify auf eine neue, eigene Website um. Der Shop bleibt im Hintergrund bei Shopify, der Bezahlvorgang auch. Damit Google und Bing den Shop nach dem Umzug weiter finden, sind vorher einige Schritte in **Ihren** Konten nötig. Diese Anleitung erklärt sie der Reihe nach.

Drei Regeln gelten für alles:

1. **Sie melden sich selbst an.** Schicken Sie uns nie Passwörter, Bestätigungscodes oder Zugangsschlüssel, auch nicht per WhatsApp. Wenn wir Zugriff brauchen, laden Sie uns als eigene Nutzer ein. Wie das geht, steht jeweils dabei.
2. **Im DNS nur hinzufügen, nie löschen.** Bei IONOS stehen Einträge, an denen Ihr E-Mail-Postfach und der heutige Shop hängen (Liste unten). Wenn ein Schritt verlangt, etwas zu löschen oder zu ändern: erst mit uns sprechen.
3. **Keine Codes auf die Website.** Wählen Sie bei jeder Bestätigung die Methode über DNS oder Search Console, nie „Google Analytics“, „Tag Manager“ oder ein Skript. So bleibt die Website ohne Tracking (Ihre Entscheidung vom 16.10.2026).

Die Menünamen in dieser Anleitung entsprechen dem Stand vom 16.10.2026. Wenn ein Knopf anders heißt, hilft die verlinkte Hilfeseite weiter. Kommen Sie nicht weiter, machen Sie einen Screenshot und schicken Sie ihn uns.

---

## Vorab: was Sie bereitlegen

### Ein Google-Konto für alles

Nutzen Sie für Search Console (V1), Merchant Center (V3) und Unternehmensprofil (V4) **dasselbe** Google-Konto. Das spart Arbeit, denn die Konten erkennen sich gegenseitig:

- Merchant Center gilt automatisch als bestätigt, wenn dasselbe Konto Inhaber in der Search Console ist.
- Das Unternehmensprofil lässt sich unter Umständen sofort über die Search Console bestätigen.

Am besten ist ein Konto, das zur Firma gehört, zum Beispiel `info@royalspices.de` (Ihre E-Mail läuft bereits über Google). Schalten Sie für dieses Konto die Bestätigung in zwei Schritten ein, falls sie noch fehlt.

### Zugang zu IONOS

Die Domain royalspices.de wird bei **IONOS** verwaltet, auch ihr DNS (öffentlich abgefragt am 16.10.2026). Sie brauchen Ihren Zugang zu „Mein IONOS“.

So legen Sie dort einen Eintrag an (gilt für V1, V4 und V5):

1. In Mein IONOS bei der Domain **royalspices.de** unter „Aktionen“ auf die drei Punkte klicken und **DNS** wählen.
2. **Record hinzufügen** klicken und den Typ wählen (TXT oder CNAME).
3. Felder ausfüllen wie in der jeweiligen Aufgabe beschrieben, dann **Speichern**.
4. Änderungen gelten bei IONOS meist innerhalb einer Stunde.

Hilfe: [IONOS – CNAME-Record anlegen](https://www.ionos.de/hilfe/domains/cname-records-fuer-subdomains-konfigurieren/cname-record-fuer-hostname-anlegen-der-mit-einem-unterstrich-beginnt) · [IONOS – DNS-Einstellungen (Übersicht)](https://www.ionos.de/hilfe/domains/dns-einstellungen/)

**Diese Einträge bitte nicht anfassen** (Stand 16.10.2026):

| Typ | Name | Wert (gekürzt) | Wofür |
|---|---|---|---|
| A | `@` | `23.227.38.65` | heutiger Shop bei Shopify, wird erst am Umzugstag geändert |
| CNAME | `www` | `shops.myshopify.com` | heutiger Shop, wird erst am Umzugstag geändert |
| MX | `@` | `aspmx.l.google.com` und weitere | Ihre E-Mail |
| TXT | `@` | `v=spf1 include:_spf.google.com …` | Ihre E-Mail (Schutz vor Fälschung) |
| TXT | `@` | `google-site-verification=3MA7…` | eine bestehende Google-Bestätigung, bleibt stehen |

### Firmendaten, überall gleich geschrieben

Google, Apple und Bing vergleichen Name, Adresse und Telefon (kurz NAP) zwischen den Verzeichnissen und der Website. Schreiben Sie die Angaben deshalb **zeichengenau** so, wie sie auf der Website stehen:

| Feld | Eintrag |
|---|---|
| Name | Royal Spices |
| Straße und Hausnummer | Hammerdeich 10 |
| PLZ und Ort | 20537 Hamburg |
| Land | Deutschland |
| Telefon | 040 59374940 (international: +49 40 59374940) |
| E-Mail | info@royalspices.de |
| Website | https://royalspices.de/ |
| Inhaber | Sajad Akrami |

Nur „Royal Spices“, ohne Zusätze wie „Safran Hamburg“ oder „Catering“. Google verbietet Suchbegriffe im Namen.

### Reihenfolge und Aufwand

| Nr | Aufgabe | Ihre Zeit | Wartezeit danach | Wann |
|---|---|---|---|---|
| V1 | Search Console einrichten, Daten sichern | ca. 30 Min. | bis 2 Tage (DNS) | **zuerst** |
| V2 | Bing Webmaster Tools (Import) | ca. 10 Min. | bis 48 Std. für Daten | nach V1 |
| V3 | Merchant Center, Versand, Rückgabe | ca. 45 Min. | – | nach V1 |
| V4 | Unternehmensprofil, Apple, Bing Places | ca. 60 Min. | Tage bis 2 Wochen (Bestätigung) | nach V1 |
| V5 | Shopify: Korrekturen und Checkout-Domain (Teil A) | ca. 45 Min. plus Rechtstexte | wenige Minuten | jederzeit, Teil B erst am Umzugstag |
| V6 | Hoster auswählen (Checkliste) | einige Stunden | Angebote der Hoster | parallel, früh beginnen |

---

## V1: Google Search Console einrichten und Daten sichern

**Ziel:** Sie bestätigen bei Google, dass royalspices.de Ihnen gehört, und sichern die Daten des heutigen Shops. Daraus erstellen wir die Liste aller alten Adressen, die nach dem Umzug weiterleiten müssen.

**Warum jetzt:** Google zeigt Daten nur für die letzten 16 Monate. Nach dem Umzug ändern sich die Adressen. Ohne Sicherung wüssten wir nicht mehr, welche alten Adressen Google kannte.

### Voraussetzungen

- Das Google-Konto aus „Vorab“
- Zugang zu IONOS

### Schritte

**A. Nachsehen, ob es schon eine Property gibt**

1. [search.google.com/search-console](https://search.google.com/search-console) öffnen und anmelden.
2. Oben links die Property-Auswahl öffnen.
3. Steht dort schon **royalspices.de** (ohne `https://`), sind Sie fertig mit B. Weiter bei C.
4. Steht dort nur `https://royalspices.de/` oder `https://www.royalspices.de/`, ist das eine ältere Property mit anderer Bestätigung. Sie bleibt bestehen, aber legen Sie zusätzlich die Domain-Property in B an.

**B. Domain-Property anlegen und per DNS bestätigen**

1. In der Property-Auswahl **+ Property hinzufügen** wählen.
2. Links **Domain** wählen und `royalspices.de` eingeben, ohne `https://` und ohne `www`. **Weiter**.
3. Google zeigt einen Wert, der mit `google-site-verification=` beginnt.
   - Steht IONOS in der Liste der Anbieter, können Sie **Bestätigung starten** wählen und sich bei IONOS anmelden. Google legt den Eintrag dann selbst an.
   - Sonst **Alle DNS-Anbieter** wählen, als Eintragstyp **TXT**, und den Wert kopieren.
4. Bei IONOS einen neuen Eintrag anlegen (siehe „Vorab“):
   - Typ: **TXT**
   - Hostname: `@`
   - Wert: den kopierten Text einfügen
   - Den vorhandenen `google-site-verification`-Eintrag **nicht** überschreiben. Beide dürfen nebeneinander stehen.
5. Zurück in der Search Console **Bestätigen** klicken.
6. Klappt es nicht sofort: nach einer Stunde noch einmal versuchen. Google kann bis zu zwei Tage brauchen.
7. Den TXT-Eintrag **für immer stehen lassen**. Ohne ihn verfällt die Bestätigung.

**C. Daten sichern (Export)**

Wählen Sie oben links die Property **royalspices.de**. Speichern Sie dann vier Exporte. Beim Export fragt Google nach dem Format. **Google Tabellen** oder **Excel** ist am einfachsten, weil alles in einer Datei landet. Bei **CSV** lädt Google mehrere Dateien herunter, die alle mitgeschickt werden müssen.

1. **Leistung:** Links **Leistung** › **Suchergebnisse**. Oben auf das Datum klicken und **Letzte 16 Monate** wählen. Dann oben rechts **Exportieren**. Die Datei enthält Suchanfragen, Seiten, Länder und Geräte.
2. **Indexierte Seiten:** Links **Indexierung** › **Seiten**. Auf **Daten zu indexierten Seiten ansehen** klicken (unter dem Diagramm). Dann **Exportieren**.
3. **Nicht indexierte Seiten:** Auf derselben Seite steht weiter unten die Tabelle der Gründe, warum Seiten nicht indexiert sind. Klicken Sie die Zeilen **Nicht gefunden (404)** und **Seite mit Weiterleitung** an, falls vorhanden, und exportieren Sie jede einzeln.
4. **Verlinkte Seiten:** Links **Links**. Im Kasten zu externen Links bei den am häufigsten verlinkten Seiten auf **Mehr** klicken, dann **Exportieren**. Diese Adressen sind besonders wertvoll, weil andere Websites auf sie zeigen.

Benennen Sie die Dateien bitte mit Datum, zum Beispiel `gsc-leistung-2026-10-20.xlsx`.

Gut zu wissen:

- Ein Export enthält höchstens 1.000 Zeilen. Für den heutigen Shop reicht das.
- Ist die Property ganz neu, können die Berichte noch leer sein. Dann nach zwei bis drei Tagen exportieren.
- **Kurz vor dem Umzugstag** machen Sie die Exporte 1 und 2 noch einmal. Wir sagen Ihnen rechtzeitig Bescheid.

**D. Optional: uns als Nutzer einladen**

Dann können wir Berichte selbst ansehen, und Sie müssen künftig keine Dateien schicken. Unter **Einstellungen** › **Nutzer und Berechtigungen** › **Nutzer hinzufügen** die E-Mail-Adresse eintragen, die wir Ihnen nennen. Berechtigung: **Uneingeschränkt**. Damit sehen wir alle Daten und können am Umzugstag die Sitemap einreichen. Inhaber bleiben allein Sie.

### Erwartetes Ergebnis

- In der Property-Auswahl steht **royalspices.de**, unter **Einstellungen** › **Inhaberschaft bestätigt** stehen Sie als Inhaber.
- Vier Exportdateien (bei CSV entsprechend mehr) liegen auf Ihrem Rechner.

### Rücklauf an uns

| Was | Wofür |
|---|---|
| Die vier Exporte aus C | Daraus entsteht die Liste der alten Adressen (`tools/seo/legacy-urls.txt`). Vor dem Umzug prüfen wir damit, dass jede alte Adresse in einem Schritt auf die richtige neue Seite weiterleitet. |
| Screenshot von **Einstellungen** › **Inhaberschaft bestätigt** | Nachweis, dass die Domain-Property per DNS bestätigt ist |
| Kurze Nachricht, ob Sie uns eingeladen haben (D) | damit wir wissen, ob wir selbst nachsehen können |

### Hilfe

- [Website-Property zur Search Console hinzufügen](https://support.google.com/webmasters/answer/34592?hl=de)
- [Website-Inhaberschaft bestätigen (DNS-Eintrag)](https://support.google.com/webmasters/answer/9008080?hl=de)
- [Daten direkt aus einem Search Console-Bericht exportieren](https://support.google.com/webmasters/answer/12919797?hl=de)
- [Bericht zur Seitenindexierung](https://support.google.com/webmasters/answer/7440203?hl=de)
- [Leistungsbericht (Google-Suchergebnisse)](https://support.google.com/webmasters/answer/7576553?hl=de)

---

## V2: Bing Webmaster Tools per Import aus der Search Console

**Ziel:** royalspices.de ist auch bei Bing bestätigt. Bing beliefert außerdem andere Suchdienste und KI-Assistenten.

### Voraussetzungen

- V1 ist fertig: Sie sind Inhaber der Property royalspices.de in der Search Console.
- Ein Konto zum Anmelden bei Bing. Das Google-Konto aus V1 funktioniert auch.

### Schritte

1. [bing.com/webmasters](https://www.bing.com/webmasters) öffnen und anmelden.
2. Auf der Startseite **Importieren** wählen (bei der Option, Websites aus der Google Search Console zu übernehmen).
3. Mit dem Google-Konto aus V1 anmelden und Bing den Lesezugriff erlauben.
4. Bing zeigt die bestätigten Websites aus der Search Console. **royalspices.de** anhaken und **Importieren**.
5. Fertig. Bing übernimmt auch eingereichte Sitemaps und prüft die Inhaberschaft künftig regelmäßig über die Search Console.

Wichtig: Trennen Sie die Verbindung zu Google später nicht. Sonst muss die Website bei Bing neu bestätigt werden.

### Erwartetes Ergebnis

- royalspices.de steht in Bing Webmaster Tools unter Ihren Websites, ohne Warnung zur Bestätigung.
- Zahlen zu Suchanfragen erscheinen erst nach bis zu 48 Stunden.

### Rücklauf an uns

- Screenshot der Website-Liste in Bing Webmaster Tools
- Falls der Import nicht klappt: Screenshot der Fehlermeldung. Wir schicken Ihnen dann eine andere Bestätigung per DNS.

### Hilfe

- [Bing – Add and Verify site (Abschnitt Import aus der Google Search Console)](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b)
- [Bing Webmaster Blog – Import aus der Search Console](https://blogs.bing.com/webmaster/september-2019/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools)

---

## V3: Google Merchant Center einrichten

**Ziel:** Ihre Produkte können später kostenlos im Google-Shopping-Tab erscheinen. Dafür richten Sie jetzt das Konto ein, verbinden die Domain und tragen Versand und Rückgabe ein. Die Produkte selbst kommen erst am Umzugstag dazu.

### Voraussetzungen

- V1 ist fertig, mit **demselben** Google-Konto
- Ihre aktuellen Versandtarife aus Shopify (**Einstellungen** › **Versand und Zustellung**). Auf der Website steht heute:
  - Standardversand in Deutschland: 4,99 €
  - **Kostenlos ab 50,00 € Warenwert** innerhalb Deutschlands
  - EU-Länder: 13,99 €
- Ihre echten Zeiten: bis wann bestellt sein muss, damit es am selben Tag rausgeht (Annahmeschluss), wie viele Tage Sie zum Packen brauchen, wie lange der Versand dauert
- Für die Rückgabe: Ihre Widerrufsbelehrung. Sie fehlt heute noch bei Shopify, siehe V5 A2.

### Schritte

**A. Konto anlegen**

1. [merchants.google.com](https://merchants.google.com) öffnen, mit dem Google-Konto aus V1 anmelden und **Konto erstellen** wählen.
2. Den Assistenten mit den Firmendaten aus „Vorab“ ausfüllen: Name **Royal Spices**, Land **Deutschland**, Adresse und Telefon genau wie in der Tabelle.
3. **Nicht** die Shopify-App „Google & YouTube“ verbinden und **keine** Produkte hinzufügen, auch wenn der Assistent es anbietet. Die App liefert bei der neuen Website die falsche Domain, und die Produkte nehmen wir am Umzugstag direkt von der neuen Seite.

**B. Website bestätigen und beanspruchen**

1. Links auf **Einstellungen** (Zahnrad) › **Unternehmensinformationen** › **Onlineshop bearbeiten**.
2. `https://royalspices.de` eintragen, **Weiter**.
3. Weil Sie Inhaber in der Search Console sind, ist die Website meist sofort bestätigt. Danach **beanspruchen** wählen. Damit gehört die Adresse exklusiv zu Ihrem Konto.
4. Bietet Google stattdessen Methoden an, wählen Sie **keine** über Google Analytics, Tag Manager oder HTML-Tag. Machen Sie einen Screenshot und schicken Sie ihn uns.

**C. Versand eintragen**

1. Links **Produkte und Geschäft** › **Versand und Retouren** › Tab **Versandrichtlinien** › **Versandrichtlinie hinzufügen**.
2. Name: `Deutschland Standard`. Land: **Deutschland**. Produkte: **Alle Produkte**.
3. Versandgeschwindigkeit:
   - **Annahmeschluss** mit Uhrzeit und Zeitzone Berlin
   - **Bearbeitungszeit** in Tagen (von–bis) und die Tage, an denen Sie versenden
   - **Laufzeit** in Tagen (von–bis)
4. Versandkosten:
   - Währung **EUR**
   - Pauschal **4,99 €**
   - **Kostenloser Versand ab einem Bestellwert** von **50,00 €**
   - **Keinen** Mindestbestellwert setzen. Sie liefern ja auch unter 50 €, nur nicht kostenlos.
5. Speichern. Für den Start reicht Deutschland. Die EU-Tarife können später dazukommen.

Die Angaben müssen genau zu Shopify und zur Website passen. Wenn Google abweichende Versandkosten findet, werden Produkte abgelehnt.

**D. Rückgabe eintragen**

1. **Produkte und Geschäft** › **Versand und Retouren** › **Rückgabebedingungen** › **Rückgabebedingungen hinzufügen**.
2. URL: eine **eigene** Seite nur zur Rückgabe bzw. zum Widerruf. AGB, FAQ oder Datenschutz gehen nicht.
   - Bis zum Umzug: die Shopify-Seite `https://royalspices.de/policies/refund-policy`, sobald Sie sie in V5 A2 angelegt haben. Heute liefert sie noch einen Fehler (404).
   - Am Umzugstag nennen wir Ihnen die neue Adresse (voraussichtlich `https://royalspices.de/widerruf/`), und Sie tauschen sie hier aus.
3. Land **Deutschland**, Rücksendung **per Post**, dazu Frist in Tagen, Kosten der Rücksendung, Zustand der Ware und Dauer bis zur Erstattung.
4. Alle Werte genau so, wie sie in Ihrer Widerrufsbelehrung stehen. Was dort rechtlich stehen muss, klärt bitte Ihre Rechtsberatung. Wir geben dazu keine Auskunft.

Ist die Widerrufsseite noch nicht fertig, lassen Sie D aus und holen es nach.

### Erwartetes Ergebnis

- Unter **Unternehmensinformationen** steht der Onlineshop `royalspices.de` als bestätigt und beansprucht.
- Eine Versandrichtlinie für Deutschland ist aktiv.
- Rückgabebedingungen sind angelegt, oder sie sind vorbereitet, bis die Widerrufsseite steht.
- Es gibt noch **keine** Produkte. Das ist so gewollt.

### Rücklauf an uns

| Was | Wofür |
|---|---|
| Merchant-Center-ID (Zahl oben rechts, kein Geheimnis) | Zuordnung am Umzugstag |
| Screenshot **Unternehmensinformationen** › Onlineshop | Nachweis: bestätigt und beansprucht |
| Ihre Werte für Annahmeschluss, Bearbeitungszeit und Laufzeit | Die Versandseite der neuen Website muss dieselben Angaben machen |
| Screenshot der Rückgabebedingungen, oder „noch offen“ | Abgleich mit der Widerrufsseite |

### Hilfe

- [Einführung in das Merchant Center](https://support.google.com/merchants/answer/12159157?hl=de)
- [URLs für Onlineshops bestätigen](https://support.google.com/merchants/answer/11586344?hl=de)
- [Anspruch auf Website erheben](https://support.google.com/merchants/answer/15623994?hl=de)
- [Versandeinstellungen für ein gesamtes Konto einrichten](https://support.google.com/merchants/answer/6069284?hl=de)
- [Mindestbestellwert hinzufügen (Unterschied zu „kostenlos ab“)](https://support.google.com/merchants/answer/14955659?hl=de)
- [Rückgabebedingungen festlegen](https://support.google.com/merchants/answer/10220642?hl=de)
- Für den Umzugstag: [Produkte automatisch aus Ihrem Onlineshop hinzufügen](https://support.google.com/merchants/answer/12158480?hl=de)

---

## V4: Unternehmensprofil bei Google, danach Apple und Bing Places

**Ziel:** Wer in Hamburg nach Catering sucht, findet Royal Spices in Google Maps, Apple Karten und Bing, überall mit denselben Firmendaten.

### Vorab eine Entscheidung: Kommen Kunden zum Hammerdeich 10?

- **Nein** (Sie liefern das Catering aus, dort ist kein Laden mit Öffnungszeiten): Dann sind Sie ein **Unternehmen mit Einzugsgebiet**. Die Adresse wird bei Google und Bing **ausgeblendet**. So ist es im Plan vorgesehen.
- **Ja** (dort ist ein beschilderter Ort mit Personal, an dem Kunden während fester Zeiten bedient werden): Dann sagen Sie uns Bescheid. Die Schritte ändern sich etwas.

Die Anleitung unten geht von **Nein** aus.

### Voraussetzungen

- Das Google-Konto aus V1
- Telefon 040 59374940 erreichbar, für Anruf oder SMS mit Code
- Für eine mögliche **Videobestätigung**: Sie sind am Hammerdeich 10 und zeigen live
  - die Umgebung, zum Beispiel ein Straßenschild,
  - etwas mit Ihrer Marke, zum Beispiel Verpackungen, Etiketten oder Catering-Ausrüstung,
  - dass Sie dort Zugang haben, zum Beispiel einen Lagerraum mit Schlüssel aufschließen.
- Liste der Orte, in die Sie Catering liefern (höchstens 20, nicht weiter als etwa zwei Autostunden entfernt)
- Einige echte Fotos von Ihren Caterings und Produkten, keine Archivbilder

### Schritte: Google Unternehmensprofil

1. [business.google.com/create](https://business.google.com/create) öffnen.
2. Name **Royal Spices**. Kategorie: Tippen Sie „Catering“ und wählen Sie den passenden Vorschlag, zum Beispiel **Cateringservice**. Die Kategorie beschreibt, was das Unternehmen *ist*. **Weiter**.
3. Frage nach einem Standort, den Kunden besuchen können: **Nein**.
4. Einzugsgebiet: Hamburg und die Orte oder Bezirke, in die Sie liefern, einzeln auswählen. Ein Radius ist nicht möglich.
5. Telefon `040 59374940`, Website `https://royalspices.de/`. **Weiter**, dann **Fertig**.
6. Bestätigen: Im roten Banner **Jetzt bestätigen** wählen. Google bietet die möglichen Wege selbst an (Video, Anruf, SMS, E-Mail, Postkarte). Video empfiehlt Google, wenn es angeboten wird.
   - Eine Postkarte kommt meist innerhalb von 14 Tagen, der Code gilt 30 Tage. Fordern Sie keinen zweiten Code an, das verlängert alles.
   - Die Prüfung durch Google kann bis zu fünf Werktage dauern.
7. Nach der Bestätigung kontrollieren, dass die Adresse verborgen ist: **Profil bearbeiten** › **Standort**, beim Unternehmensstandort auf den Stift. **Unternehmensadresse für Kunden einblenden** muss **aus** sein.
8. Profil ergänzen:
   - **Beschreibung:** nur Tatsachen, keine Aussagen zur Gesundheit, keine Superlative wie „der beste Safran“, keine Zertifikate ohne Nachweis. Gern schreiben wir Ihnen einen Vorschlag.
   - **Fotos:** echte Bilder.
   - **Leistungen:** Ihre Catering-Angebote.
   - **Öffnungszeiten:** nur, wenn Sie in dieser Zeit wirklich erreichbar sind.
9. **Bewertungen:** Bitten Sie Kunden nach dem Event um eine Bewertung, aber ohne Gegenleistung (kein Rabatt, kein Geschenk). Keine gekauften und keine eigenen Bewertungen. Das verbietet das Wettbewerbsrecht (UWG).

Nur **ein** Profil anlegen. Doppelte Profile können zur Sperrung des Google-Kontos führen.

### Schritte: Apple Business (früher „Apple Business Connect“)

Apple hat den Dienst umbenannt. Er heißt jetzt **Apple Business** und steuert unter anderem den Eintrag in Apple Karten.

**Bitte zuerst entscheiden:** In Apples Anleitung (geprüft 16.10.2026) gibt es keine Möglichkeit, die Adresse auszublenden oder nur ein Einzugsgebiet anzugeben. Ein Eintrag in Apple Karten zeigt also **Hammerdeich 10** mit einer Markierung auf der Karte. Die Adresse steht zwar schon im Impressum, aber Kunden könnten dorthin kommen wollen.

- Ist das für Sie in Ordnung: weiter mit den Schritten.
- Wenn nicht: Apple vorerst auslassen und uns Bescheid geben.

1. [business.apple.com](https://business.apple.com/) öffnen und **Jetzt anmelden** wählen.
2. Name und Adresse der Organisation genau wie in „Vorab“, Website `https://royalspices.de`. Die Website beschleunigt die Prüfung. Als Person Ihren echten Vor- und Nachnamen angeben.
3. Der Account entsteht bei der Anmeldung. Bestätigungscodes kommen per E-Mail und SMS oder Anruf.
4. Organisation bestätigen, **innerhalb von 60 Tagen**, sonst löscht Apple alles. Apple verlangt **zwei** Nachweise:
   - **Domain per TXT-Eintrag:** Apple zeigt einen Wert. Legen Sie ihn bei IONOS wie in V1 als **TXT** mit Hostname `@` an und lassen Sie ihn stehen.
   - **Offizielles Dokument**, zum Beispiel Ihre Gewerbeanmeldung.
   - Weg im Menü: **Einstellungen** › **Organisation** › **Jetzt bestätigen**, dann **Zur Prüfung senden**. Die Prüfung dauert bis zu fünf Werktage.
5. Standort anlegen: **Unternehmen** › **Standorte** › **Hinzufügen**. Name, Adresse, Kategorie und Telefon wie oben. Prüfen Sie, ob die Markierung auf der Karte richtig sitzt.
6. Hat Apple den Standort schon in Karten, kann er per **Bestätigungsanruf** an Ihre Telefonnummer bestätigt werden. Sie geben dann den vierstelligen Code ein.

### Schritte: Bing Places

Bing übernimmt das Google-Profil. Machen Sie diesen Schritt deshalb erst, wenn das Google-Profil **bestätigt** ist.

1. [bing.com/forbusiness](https://www.bing.com/forbusiness) öffnen und anmelden.
2. **Aus Ihrem Google Geschäftsprofil importieren** wählen.
3. Synchronisierung **wöchentlich** wählen.
4. Mit dem Google-Konto aus V1 anmelden und die erkannten Einträge importieren.
5. Ist das Google-Profil bestätigt, übernimmt Bing die Bestätigung automatisch. Bis der Eintrag erscheint, vergehen meist 7 bis 12 Tage, im Dashboard steht so lange „Pending Publish“.
6. Danach prüfen:
   - **Kategorie:** Bing übernimmt Kategorien nicht immer.
   - **Adresse:** Ist sie ausgeblendet, oder zeigt Bing nur PLZ und Ort? Bing fragt dazu: „Wird erwartet, dass Kunden Ihre Adresse besuchen?“
   - **Kein doppelter Eintrag**
7. Mit Google verbundene Einträge lassen sich bei Bing nicht direkt bearbeiten. Ändern Sie Angaben bei Google, Bing übernimmt sie bei der nächsten Synchronisierung. Stimmt danach etwas nicht, schicken Sie uns einen Screenshot.

### Erwartetes Ergebnis

- Google: Profil bestätigt, Kategorie Catering, Einzugsgebiet Hamburg und Umgebung, Adresse ausgeblendet
- Apple: Organisation bestätigt und Standort angelegt, oder bewusst ausgelassen
- Bing Places: Eintrag importiert und veröffentlicht, Adresse wie bei Google
- Überall dieselben Angaben für Name, Telefon und Website

### Rücklauf an uns

| Was | Wofür |
|---|---|
| Link zum Google-Profil (in Maps auf **Teilen** tippen) | `sameAs` und Verlinkung auf der neuen Catering-Seite |
| Gewählte Kategorie und Liste der Einzugsgebiete | Die Catering-Seite nennt dieselben Orte |
| Ihre Entscheidung zu Apple, ggf. der Link zum Eintrag in Apple Karten | wie oben |
| Link zum Bing-Eintrag oder Screenshot des Status | wie oben |
| Datum der Bestätigungen | für unser Protokoll |

### Hilfe

- [Für ein Unternehmensprofil registrieren](https://support.google.com/business/answer/10514137?hl=de)
- [Einzugsgebiete für Unternehmen ohne festen Standort verwalten](https://support.google.com/business/answer/9157481?hl=de)
- [Unternehmen bei Google bestätigen](https://support.google.com/business/answer/7107242?hl=de)
- [Richtlinien für die Darstellung Ihres Unternehmens](https://support.google.com/business/answer/3038177?hl=de)
- [Apple Business Connect heißt jetzt Apple Business](https://support.apple.com/de-de/guide/apple-business-connect/abcb205640e7/web)
- [Bei Apple Business anmelden](https://support.apple.com/de-de/guide/business/axm402206497/web)
- [Standort in Apple Business hinzufügen](https://support.apple.com/de-de/guide/business/abcb98816a34/web)
- [Bing Places – Google-Unternehmensprofil synchronisieren](https://www.bing.com/forbusiness/help/syncGoogleBusinessProfile)
- [Bing Places – Unternehmen ohne physischen Store](https://www.bing.com/forbusiness/help/businessesWithoutPhysicalStore)

---

## V5: Shopify vorbereiten

**Ziel:** Nach dem Umzug läuft der Bezahlvorgang unter `checkout.royalspices.de`. Wer noch die alte Shopify-Adresse aufruft, landet auf der neuen Website. Vorher werden die bekannten Fehler im Shop korrigiert.

**Wichtig, zwei Teile:**

- **Teil A** erledigen Sie **jetzt**. Er ändert am laufenden Shop nichts Sichtbares.
- **Teil B** machen wir **gemeinsam am Umzugstag**. Würden Sie ihn jetzt machen, leitet der heutige Shop auf eine Website um, die es noch nicht gibt, und der Shop wäre nicht mehr erreichbar.

### Voraussetzungen

- Zugang zum Shopify-Admin als Inhaber
- Zugang zu IONOS
- Für A2: Texte für AGB, Widerrufsbelehrung und Versand von Ihrer Rechtsberatung. Die Vorlagen von Shopify sind nicht rechtlich geprüft.

### Teil A: jetzt

**A1. Produkte korrigieren** (offener Punkt O6)

1. **Produkte** › „Herat Negin Safran – 1 g (Grade A)“ öffnen.
   - **Titel:** „Grade A“ durch **Grade 1** ersetzen. Passend zum 0,5-g-Produkt wäre zum Beispiel „Safran – Herat Negin Grade 1, 1 g“. Den Titel bitte komplett neu tippen, denn der alte enthält unsichtbare Sonderzeichen.
   - **Beschreibung:** Dort steht „Qualität: Negin, Grade A“. Auch hier auf **Grade 1** ändern.
   - **Medien:** Das 2. Bild ist das Favicon (goldenes Blütensymbol), kein Produktfoto. Dieses Bild aus dem Produkt **entfernen**.
2. Bei **beiden** Produkten das Feld **Anbieter** (Hersteller) von „www.Royal-Spices.com“ auf **Royal Spices** ändern. Google übernimmt diesen Wert als Marke.
3. Die **Produkt-URL (Handle)** `herat-negin-safran-1-g-grade-a` bitte **nicht** selbst ändern. Die neue Website ordnet die Produkte über diesen Namen zu. Eine Änderung stimmen wir vorher ab.
4. Empfehlung: Unter **Einstellungen** › **Allgemein** den Shopnamen von „www.Royal-Spices.com“ auf **Royal Spices** ändern. Er erscheint im Bezahlvorgang und in den E-Mails an Kunden.

**A2. Rechtstexte anlegen** (Pflicht vor dem Umzug)

1. **Einstellungen** › **Richtlinien**.
2. Rückerstattung bzw. Widerruf, AGB und Versand mit den Texten Ihrer Rechtsberatung füllen und speichern.
3. Die Versandrichtlinie muss dieselben Tarife nennen wie in V3: 4,99 €, kostenlos ab 50,00 € in Deutschland.
4. Danach sind `royalspices.de/policies/refund-policy`, `…/terms-of-service` und `…/shipping-policy` erreichbar. Heute liefern sie einen Fehler (404).

**A3. Checkout-Domain vorbereiten**

1. Bei IONOS einen neuen Eintrag anlegen:
   - Typ: **CNAME**
   - Hostname: `checkout`
   - Zeigt auf: `shops.myshopify.com`
   - Speichern
2. In Shopify: **Einstellungen** › **Domains** › **Bestehende Domain verbinden**. `checkout.royalspices.de` eingeben, **Weiter**, den Anweisungen folgen.
3. Erkennt Shopify den Eintrag noch nicht: kurz warten, dann auf die Schaltfläche klicken, mit der Shopify die DNS-Einträge erneut prüft.
4. Verlangt Shopify zusätzlich einen TXT-Eintrag (Name beginnt mit `shopify_verification_`): genau so bei IONOS anlegen.
5. **Nicht** als Primärdomain festlegen. Das passiert erst in Teil B.

**A4. Passwortschutz aus lassen**

Unter **Onlineshop** › **Präferenzen** gibt es „Zugriff auf den Shop beschränken“ mit Passwort. Bitte **nicht** einschalten, auch nicht später, um den alten Shop zu verstecken. Ein Passwort blockiert den Bezahlvorgang der neuen Website. Den alten Shop verstecken wir in Teil B mit einem Weiterleitungs-Theme.

### Teil B: am Umzugstag, gemeinsam mit uns (zur Orientierung)

1. Wir bestätigen, dass die neue Website beim Hoster läuft.
2. Shopify: **Einstellungen** › **Domains**. `checkout.royalspices.de` als **Primärdomain** festlegen, Ziel **Onlineshop**.
3. Shopify: **Onlineshop** › **Themes**. Das Weiterleitungs-Theme hochladen:
   - Das Theme ist Shopifys „Hydrogen Redirect Theme“. Wir geben Ihnen eine geprüfte ZIP-Datei.
   - In den Theme-Einstellungen unter **Storefront** als Ziel `royalspices.de` eintragen.
   - **Veröffentlichen**. Das alte Theme bleibt als Sicherung in der Bibliothek.
4. IONOS: Die Einträge `@` (A) und `www` (CNAME) auf die Werte des neuen Hosters ändern. MX und TXT bleiben unverändert.
5. Was mit den alten Domain-Einträgen `royalspices.de` und `www` in Shopify passiert, klären wir an dem Tag gemeinsam.
6. Testkauf bis zur Bestellbestätigung.

### Erwartetes Ergebnis (Teil A)

- Das 1-g-Produkt heißt „… Grade 1 …“, hat kein Favicon-Bild mehr, und bei beiden Produkten steht als Anbieter „Royal Spices“.
- Die drei Richtlinien-Seiten sind erreichbar.
- Unter **Einstellungen** › **Domains** steht `checkout.royalspices.de` als verbunden, aber **nicht** als primär. Wer die Adresse aufruft, landet heute noch auf royalspices.de.
- Der Shop läuft unverändert weiter.

### Rücklauf an uns

| Was | Wofür |
|---|---|
| Neuer Titel des 1-g-Produkts, wörtlich | Abgleich mit der Produktseite der neuen Website |
| Datum der Produktänderungen | Wir lesen die Produkte danach neu ein |
| Links zu den drei Richtlinien-Seiten | Merchant Center (V3 D) und Weiterleitungen am Umzugstag |
| Screenshot von **Einstellungen** › **Domains** | Nachweis: Checkout-Domain verbunden, nicht primär |
| Bestätigung: Handle nicht geändert, Passwortschutz aus | Voraussetzung für Teil B |

### Hilfe

- [Shopify – Subdomain eines Drittanbieters verbinden](https://help.shopify.com/de/manual/domains/add-a-domain/connecting-domains/connect-subdomain)
- [Shopify – Traffic auf eine Headless-Storefront umleiten (Domains, Passwortschutz, Weiterleitungs-Theme)](https://shopify.dev/docs/storefronts/headless/legacy/hydrogen/migrate/redirect-traffic). Der Satz zu eigenen Storefronts lautet: Bei Storefronts, die nicht bei Shopify gehostet sind, muss nur die Subdomain auf Shopify zeigen.
- [Shopify – Migration vom Onlineshop (Passwortschutz verhindert den Checkout)](https://shopify.dev/docs/storefronts/headless/hydrogen/migrate)
- [Shopify Hydrogen Redirect Theme (Quelle des Weiterleitungs-Themes)](https://github.com/Shopify/hydrogen-redirect-theme)

---

## V6: Hoster auswählen

**Ziel:** Sie wählen den Anbieter, auf dem die neue Website läuft. Die Technik steht fest, offen ist nur der Anbieter. Diese Checkliste hilft beim Vergleich. Holen Sie am besten zwei oder drei Angebote ein, und wir prüfen sie mit Ihnen.

### Voraussetzungen

- Nichts außer etwas Zeit. Die Fragen unten können Sie dem Vertrieb der Hoster so schicken.

### Checkliste

**Muss** (fehlt einer dieser Punkte, passt der Hoster nicht):

| Nr | Kriterium | Warum | So fragen Sie |
|---|---|---|---|
| H1 | **Node.js 22 oder neuer** als dauerhaft laufender Dienst (`node server.mjs`), nicht nur statische Dateien oder kurzlebige Funktionen | Die Website hat ein Kontaktformular und eigene Weiterleitungen, beides läuft in diesem Dienst. Node 22 wird bis 30.04.2027 gepflegt, Node 24 bis 30.04.2028. Der Hoster sollte beide anbieten. | „Kann ich eine Node.js-Anwendung (Version 22 und 24) als dauerhaften Prozess betreiben, der alle Anfragen beantwortet?“ |
| H2 | **Serverstandort in der EU**, am besten in Deutschland, auch für Backups und Logs | Datenschutz (DSGVO) | „Wo stehen die Server, Backups und Logs? Gibt es Unterauftragnehmer außerhalb der EU?“ |
| H3 | **Vertrag zur Auftragsverarbeitung (AV-Vertrag)** nach Art. 28 DSGVO | Pflicht, weil der Hoster Daten der Besucher verarbeitet | „Bieten Sie einen AV-Vertrag an? Bitte als PDF schicken.“ |
| H4 | **Server-Logs mit kurzer Aufbewahrung**: Rohlogs höchstens 7 Tage (bei Angriffen länger), einstellbar | Messung nur über Logs, ohne Tracking. Logs enthalten aber IP-Adressen und dürfen nur kurz liegen. | „Wie lange speichern Sie Zugriffslogs? Kann ich die Dauer auf 7 Tage stellen?“ |
| H5 | **Gekürzte IP-Adressen** in Statistik und Auswertung | Datenschutz: Die Statistik soll keine Person erkennen lassen. | „Können Logs oder Statistik mit gekürzter IP-Adresse geführt werden?“ |
| H6 | **Zugriff auf die Logs**, zum Download oder als Statistik ohne JavaScript und ohne Cookies | Daraus erstellen wir den Monatsbericht. | „Kann ich die Zugriffslogs herunterladen oder per Schnittstelle abrufen?“ |
| H7 | **Kein eingeschleuster Code**: Der Hoster fügt keine eigenen Skripte, Cookies oder Banner in die Seiten ein. | Die Website soll ohne Tracking auskommen. | „Fügen Sie in ausgelieferte Seiten eigene Skripte oder Cookies ein?“ |
| H8 | **Neu bauen per Webhook**: eine Adresse (Deploy-Hook), die den Neubau der Website startet. Alternativ ein nächtlicher Neubau per Zeitplan. | Ändern Sie in Shopify einen Preis, baut sich die Website neu. Shopify erlaubt als Ziel keine eigene Shop-Domain, die Adresse sollte also beim Hoster liegen. | „Gibt es eine Webhook-Adresse, die einen neuen Build und Deploy startet? Oder geplante Builds (Cron)?“ |
| H9 | **Eigene Domain ohne www**: Der Hoster nennt feste IP-Adressen (A-, besser auch AAAA-Eintrag) für `royalspices.de`, nicht nur einen CNAME. | Bei IONOS kann `royalspices.de` ohne www nur per A-Eintrag auf einen Server zeigen. | „Welche IP-Adressen trage ich für die Hauptdomain ohne www ein?“ |
| H10 | **Kostenloses HTTPS-Zertifikat**, automatisch verlängert, für `royalspices.de` und `www.royalspices.de` | Ohne HTTPS kein Ranking und keine Sicherheit | „Ist ein automatisch verlängertes Zertifikat (z. B. Let's Encrypt) enthalten?“ |
| H11 | **Geheime Umgebungsvariablen** (zum Beispiel Shopify-Schlüssel), getrennt vom Code gespeichert | Schlüssel gehören nicht in den Code. | „Kann ich Umgebungsvariablen geschützt hinterlegen?“ |
| H12 | **Ausgehende E-Mail (SMTP, Port 587) erlaubt** | Für das Kontaktformular (offener Punkt O2) | „Darf die Anwendung über einen externen SMTP-Server E-Mails versenden?“ |

**Sollte** (macht den Betrieb leichter):

| Nr | Kriterium | So fragen Sie |
|---|---|---|
| H13 | Rückkehr zur vorigen Version mit einem Klick | „Kann ich auf einen früheren Deploy zurückspringen?“ |
| H14 | Backups, Überwachung mit Alarm bei Ausfall | „Gibt es Backups und eine Benachrichtigung bei Ausfall?“ |
| H15 | Zugänge für weitere Personen mit eigenem Login, damit Sie uns einladen können, ohne ein Passwort weiterzugeben | „Kann ich weitere Nutzer mit eigenen Zugangsdaten einladen?“ |
| H16 | Monatlich kündbar, klare Preise, Support auf Deutsch | – |
| H17 | Falls ein CDN dabei ist: nur mit EU-Standorten oder mit AV-Vertrag dafür | „Läuft ein CDN mit, und wo werden dabei Daten verarbeitet?“ |

Die Weiterleitungen der alten Shop-Adressen laufen in der Website selbst (`server.mjs`). Der Hoster muss dafür nichts einrichten, er muss nur **alle** Anfragen an die Node-Anwendung geben (H1).

### Erwartetes Ergebnis

- Für zwei oder drei Hoster ist die Checkliste ausgefüllt, mit Ja oder Nein und dem Preis.
- Sie haben sich für einen entschieden, oder Sie entscheiden gemeinsam mit uns.

### Rücklauf an uns

| Was | Wofür |
|---|---|
| Ausgefüllte Checkliste je Hoster, mit Link zum Tarif | Wir prüfen die Technik (H1, H8, H9). |
| Antworten der Hoster per E-Mail (weiterleiten genügt) | Nachweis für H2–H7 |
| AV-Vertrag als PDF | Grundlage für den Abschnitt zu Logs in der Datenschutzerklärung |
| Ihre Entscheidung, danach eine Einladung als Nutzer (H15) | Damit wir die Website einrichten können. Bitte kein Passwort schicken. |

### Hilfe

- [Node.js – Release-Plan (Pflegezeiträume)](https://github.com/nodejs/Release)
- [Shopify – Webhooks im Admin anlegen (für H8)](https://help.shopify.com/en/manual/fulfillment/setup/notifications/webhooks)

---

## Übersicht: was Sie uns schicken

| Aufgabe | Rücklauf | Was wir damit machen |
|---|---|---|
| V1 | 4 Exporte (Leistung, indexierte Seiten, nicht indexierte, verlinkte Seiten), Screenshot Inhaberschaft, ggf. Einladung | Liste alter Adressen `tools/seo/legacy-urls.txt` und Test der Weiterleitungen vor dem Umzug |
| V2 | Screenshot Website-Liste | Sitemap am Umzugstag einreichen |
| V3 | Merchant-Center-ID, Screenshots, Versandzeiten | Versandseite angleichen, Produkte am Umzugstag verbinden |
| V4 | Links zu Google, Apple und Bing, Kategorie, Einzugsgebiete | Catering-Seite und Firmendaten der Website angleichen |
| V5 | Neuer Produkttitel, Datum, Links zu den Richtlinien, Screenshot Domains | Produkte neu einlesen, Teil B vorbereiten |
| V6 | Checklisten, Antworten, AV-Vertrag, Entscheidung | Hosting einrichten, Datenschutzerklärung ergänzen |

**Wie schicken?** Per E-Mail an die Adresse, die wir Ihnen genannt haben, oder in einem freigegebenen Ordner. Exporte und Screenshots sind unkritisch. **Nie** dabei: Passwörter, Codes aus SMS oder E-Mail, Shopify-Zugangsschlüssel.

## Zum Abhaken

- [ ] V1 Domain-Property `royalspices.de` bestätigt, TXT-Eintrag bleibt stehen
- [ ] V1 vier Exporte gespeichert und an uns geschickt
- [ ] V2 Bing per Import eingerichtet
- [ ] V3 Merchant Center: Konto, Website bestätigt und beansprucht, Versand Deutschland
- [ ] V3 Rückgabebedingungen (nach V5 A2)
- [ ] V4 Google-Profil bestätigt, Adresse ausgeblendet
- [ ] V4 Apple: angelegt oder bewusst ausgelassen
- [ ] V4 Bing Places importiert
- [ ] V5 A1 Titel Grade 1, Favicon-Bild entfernt, Anbieter „Royal Spices“
- [ ] V5 A2 AGB, Widerruf, Versand in Shopify angelegt
- [ ] V5 A3 `checkout.royalspices.de` verbunden, nicht primär
- [ ] V6 Hoster gewählt, AV-Vertrag liegt vor

## Hinweise zur Prüfung der Quellen (16.10.2026)

- Per WebFetch abgerufen und mit dem Text abgeglichen: alle Seiten der Search Console und des Unternehmensprofils, Merchant Center 11586344, 15623994, 6069284, 10220642 und 12158480, die drei Apple-Seiten, die Shopify-Seiten zur Subdomain und zum Umleiten, das Redirect-Theme, die IONOS-Seite zum CNAME und der Node.js-Release-Plan.
- Im Browser gelesen, weil sie ihren Inhalt per JavaScript laden: die beiden Seiten von Bing Places.
- Nur über die Suche bestätigt (Seite existiert, Inhalt aus dem Suchauszug): Bing „Add and Verify site“ und der Bing-Blog zum Import, Merchant Center 12159157 und 14955659, Shopify „Migrate from the online store“ und Shopify „Webhooks“, die IONOS-Übersicht zu DNS-Einstellungen.
- Die DNS-Einträge von royalspices.de wurden öffentlich abgefragt (Nameserver von IONOS).
- Ändert ein Anbieter seine Oberfläche, gilt die verlinkte Hilfeseite.
