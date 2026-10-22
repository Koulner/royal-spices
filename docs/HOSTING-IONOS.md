# Hosting bei IONOS (Webhosting, Vertrag beim Kunden)

Stand: 22.10.2026 (T-20261022-01). Die Website läuft auf einem normalen IONOS-Webhosting: Apache mit `.htaccess`, PHP 8, SFTP. Es gibt kein Node und keinen eigenen Server. Der Node-Weg (`server.mjs`) funktioniert weiterhin aus demselben Build, für einen späteren Umzug auf einen eigenen Server.

## Was wo läuft

| Aufgabe | Node-Weg | IONOS |
|---|---|---|
| Seiten | `server.mjs` liefert `dist/client` aus | Apache liefert `dist-ionos/public/` aus (Kopie von `dist/client`) |
| 301 für alte URLs | `redirectTarget()` zur Laufzeit | `.htaccess`, bei jedem Build aus `src/config/redirects.mjs` erzeugt (`tools/ionos/htaccess.mjs`) |
| Security-Header, Caching, MIME | `server.mjs`, `server-static.mjs` | dieselben Werte in der `.htaccess`, Test gegen beide Quellen |
| Range/206 für Video | `server-static.mjs` | Apache von sich aus |
| Anfrageformular | `src/pages/api/anfrage.ts` (nodemailer) | `api/anfrage/index.php` (PHPMailer), gleiche Regeln, Paritätstest |
| Preise aus Shopify | Build | Build in GitHub Actions, täglich 03:30 und 13:30 Uhr und von Hand |

**Bekannte Abweichung:** Ein unbekannter Produkt-Handle in Großbuchstaben (`/products/Neu-Im-Shop`) bekommt auf Apache direkt 404. Der Node-Weg leitet erst auf eine 404-Seite weiter. Für die Handles der gebauten Produktseiten gibt es eigene Regeln, die Groß- und Kleinschreibung ignorieren.

## 1. Was der Kunde bucht

Ein IONOS-Webhosting-Paket im eigenen Namen. Den Paketnamen und den Preis sehen wir zum Zeitpunkt der Buchung im Shop nach. Das Paket muss Folgendes haben:

- PHP 8.1 oder neuer (wir stellen 8.3 ein)
- SFTP-Zugang (ein SSH-Zugang ist nicht nötig)
- `.htaccess` mit `mod_rewrite` und `mod_headers` (bei IONOS-Webhosting Standard)
- SSL-Zertifikat für `royalspices.de` **und** `www.royalspices.de` (bei IONOS im Paket enthalten)
- mindestens 1 GB Webspace (der Build hat heute etwa 150 MB)
- keine Datenbank, kein E-Mail-Paket von IONOS. Die Mail bleibt bei Google Workspace.

Die Domain liegt schon bei IONOS. Sie wird im selben Konto mit dem Webspace verbunden. Ein Domainumzug ist nicht nötig.

## 2. Einrichtung (einmalig, mit Zugang des Kunden)

1. **Ordner auf dem Webspace** per SFTP anlegen:

   | Ordner | Inhalt | Deploy schreibt? |
   |---|---|---|
   | `/royalspices/` | Webroot | ja |
   | `/royalspices-app/` | PHP-Code und `vendor/`, außerhalb des Webroots | ja |
   | `/royalspices-private/` | `anfrage.config.php` und die Rate-Limit-Datei | **nie** |

   Andere Namen sind möglich. Dann setzt man die GitHub-Variablen `IONOS_WEBROOT`, `IONOS_APP_DIR` und `IONOS_PRIVATE_DIR` (Abschnitt 3).
2. **PHP-Version** im IONOS-Panel auf 8.3 stellen.
3. **Zugang für den Formularversand** (Google Workspace, Entscheidung E2):
   - Im Admin-Konto von Google Workspace App-Passwörter zulassen. Für das Postfach muss die Bestätigung in zwei Schritten aktiv sein.
   - Am besten ein eigenes Postfach oder einen Alias wie `website@royalspices.de` nutzen.
   - Unter myaccount.google.com → Sicherheit → App-Passwörter ein Passwort „Website“ anlegen.
   - `php/anfrage.config.example.php` als `/royalspices-private/anfrage.config.php` hochladen und ausfüllen:
     - `smtp.gmail.com`, Port 465, `ssl`
     - Benutzer und App-Passwort
     - `from`: das Postfach
     - `to`: der Empfänger der Anfragen
     - `origin`: `https://royalspices.de`
     - `hmac_key`: eine lange Zufallszeichenfolge, z. B. aus `openssl rand -hex 32`
   - Die Datei bekommt die Rechte `600`.
   - **Kein `mail()` über IONOS.** Der SPF-Eintrag der Domain erlaubt nur `_spf.google.com`, solche Mails landen im Spam.
4. **Host-Schlüssel festhalten:** `ssh-keyscan -t ed25519,rsa <sftp-host>` einmal ausführen. Den Fingerprint mit dem im IONOS-Panel vergleichen, dann die Zeilen als Secret `IONOS_KNOWN_HOSTS` hinterlegen.
5. **Domain verbinden** (erst am Umzugstag, Abschnitt 5): `royalspices.de` und `www` im Panel auf den Ordner `/royalspices/` zeigen lassen und SSL aktivieren.

## 3. GitHub: Secrets und Variablen

Repository → Settings → Secrets and variables → Actions.

| Art | Name | Inhalt |
|---|---|---|
| Secret | `IONOS_SFTP_HOST` | SFTP-Server aus dem IONOS-Panel |
| Secret | `IONOS_SFTP_USER` | SFTP-Benutzer |
| Secret | `IONOS_SFTP_PASSWORD` | SFTP-Passwort |
| Secret | `IONOS_KNOWN_HOSTS` | Ausgabe von `ssh-keyscan`, geprüft (Abschnitt 2.4) |
| Variable | `IONOS_DEPLOY` | `1` schaltet den Workflow ein. Bis zum Umzugstag leer lassen. |
| Variable | `SITE_INDEXABLE` | `1` erst nach Abnahme und eingebundenen Rechtstexten, sonst `noindex` überall |
| Variable | `PUBLIC_SHOPIFY_STORE_DOMAIN`, `PUBLIC_SHOPIFY_STOREFRONT_TOKEN`, `PUBLIC_SHOPIFY_API_VERSION` | wie in `.env` (öffentliche Werte, siehe `SHOPIFY.md`) |
| Variable (optional) | `IONOS_WEBROOT`, `IONOS_APP_DIR`, `IONOS_PRIVATE_DIR` | nur bei anderen Ordnernamen |

Kein Zugangswert steht im Repo oder im Log. Die SMTP-Zugangsdaten kennt GitHub nicht, sie liegen nur auf dem Webspace.

## 4. Deploy

`.github/workflows/ionos.yml` baut immer den Branch `prod`. Er läuft zweimal täglich und von Hand über Actions → „Deploy to IONOS“ → Run workflow.

1. `npm ci`, `composer install` in `php/`
2. `npm test`, darin die PHP-Tests: Parität mit `schema.ts` und Ende-zu-Ende über eine SMTP-Senke
3. `npm run build` (mit `astro check`)
4. `tools/qa/freshness.mjs`: Bei einer Abweichung baut der Workflow einmal neu, danach bricht er ab
5. `tools/ionos/prepare.mjs` erzeugt `dist-ionos/public` und `dist-ionos/app`
6. Prüfung gegen Apache im Container: `tools/ionos/check.mjs` und `seo.mjs --redirects`
7. `tools/ionos/deploy.sh`: SFTP-Upload in vier Durchgängen (erst Code, dann neue Dateien, dann HTML und `.htaccess`, zuletzt Aufräumen)
8. Smoke-Test gegen `https://royalspices.de`: `check.mjs --smoke`

Schlägt ein Schritt vor 7 fehl, wird nichts hochgeladen, und der alte Stand bleibt online. Bei einem roten Lauf schickt GitHub eine Mail an den, der den Workflow zuletzt geändert hat.

Unveränderte Dateien werden nicht erneut übertragen. `prepare.mjs` setzt das Änderungsdatum jeder Datei aus ihrem Inhalt. Prüfpunkt nach dem ersten echten Deploy: Ein zweiter Lauf ohne Änderung darf fast nichts übertragen (Log von `mirror`). Wenn doch, setzt der IONOS-Server das Datum nicht, und jeder Lauf überträgt alles. Das ist langsamer, aber nicht falsch.

**Rollback:** Den letzten guten Commit auf `prod` wiederherstellen (`git revert`), dann den Workflow von Hand starten.

**Ohne GitHub, von einem Rechner mit `lftp`:**

```bash
npm run build:ionos
```

```bash
IONOS_SFTP_HOST=… IONOS_SFTP_USER=… IONOS_SFTP_PASSWORD=… IONOS_KNOWN_HOSTS="$(cat known_hosts)" bash tools/ionos/deploy.sh
```

## 5. DNS-Umzug (MX und SPF bleiben unverändert)

Stand heute: `A @` → `23.227.38.65` und `www` CNAME → `shops.myshopify.com` (alter Shopify-Shop). MX und SPF zeigen auf Google Workspace.

1. **Am Tag davor:**
   - Die TTL von `@` und `www` im IONOS-Panel auf den kleinsten Wert senken.
   - Den Ist-Zustand sichern und ins Abnahmeprotokoll schreiben:

     ```bash
     nslookup -type=MX royalspices.de
     ```

     ```bash
     nslookup -type=TXT royalspices.de
     ```

   - Auf GitHub die Secrets und Variablen setzen, außer `IONOS_DEPLOY`.
2. **Am Umzugstag:**
   1. `IONOS_DEPLOY=1` setzen und den Workflow von Hand starten. Der Upload läuft, auch wenn die Domain noch auf Shopify zeigt. Der Smoke-Test am Ende schlägt dann fehl, das ist hier erwartet.
   2. Im IONOS-Panel die Domain `royalspices.de` und `www` mit dem Webspace-Ordner `/royalspices/` verbinden. IONOS setzt dabei `A`/`AAAA` für `@` und `www` selbst.
      - Den CNAME `www` → `shops.myshopify.com` vorher entfernen, falls IONOS das nicht selbst tut.
      - **Bei der Frage nach E-Mail „nicht ändern“ wählen. MX- und TXT/SPF-Einträge nicht anfassen.**
   3. SSL-Zertifikat für Apex und `www` aktivieren.
   4. `checkout` als CNAME auf `shops.myshopify.com` anlegen. In Shopify unter Einstellungen → Domains `checkout.royalspices.de` verbinden und als primäre Domain setzen. Danach `royalspices.de` und `www` dort entfernen, sonst beansprucht Shopify sie weiter.
   5. Wenn alles aufgelöst ist, die Prüfungen aus Abschnitt 6 durchführen und den Workflow erneut starten. Jetzt muss der Smoke-Test grün sein.
   6. MX und TXT erneut abfragen und mit dem Ist-Zustand vom Vortag vergleichen. Sie müssen gleich sein. Dann eine Testmail an das Postfach schicken.
3. **Danach:** Die TTL wieder auf den Standard setzen.

## 6. Prüfungen

**Vor jedem Upload** laufen sie automatisch im Workflow. Lokal (Docker Desktop muss laufen):

```bash
npm run build
```

```bash
node tools/ionos/prepare.mjs --origin http://localhost:8089 --out dist-ionos-local
```

```bash
node tools/ionos/container.mjs start --out dist-ionos-local
```

```bash
node tools/ionos/check.mjs http://localhost:8089 --dist dist-ionos-local/public
```

```bash
node tools/qa/seo.mjs http://localhost:8089 --redirects --no-browser
```

```bash
node tools/ionos/container.mjs stop
```

**Ohne Docker** (auf dem Entwicklungsrechner ist die Virtualisierung aus) ging die Prüfung am 22.10. so:

- Portables PHP 8.3 (Thread Safe, x64) von windows.php.net und Apache 2.4 Win64 von apachelounge.com in einen Ordner außerhalb des Projekts entpacken, beide mit Prüfsumme.
- Eine eigene `httpd.conf` anlegen:
  - Module `authz_core`, `authz_host`, `mime`, `dir`, `rewrite`, `headers`, `filter`, `deflate`, `brotli`, `log_config`
  - `LoadModule php_module …/php8apache2_4.dll`
  - `DocumentRoot` auf `dist-ionos-local/public`, dort `AllowOverride All`
- Daneben eine Junction `royalspices-app` → `dist-ionos-local/app` anlegen.
- In der `php.ini` `extension_dir` als absoluten Pfad setzen.

Dann `check.mjs` und `seo.mjs` wie oben ausführen.

Ohne PHP auf dem Rechner überspringt `npm test` die PHP-Tests mit einem Hinweis. Mit Docker laufen sie über `RS_PHP` (siehe Kopf von `tests/ionos-php.test.mjs`).

**Abnahme nach dem Umzug** gegen die echte Domain. Der IONOS-Apache kann vom Container abweichen, zum Beispiel bei der HTTPS-Erkennung oder bei `mod_brotli`:

```bash
node tools/ionos/check.mjs https://royalspices.de --dist dist-ionos/public
```

```bash
node tools/qa/seo.mjs https://royalspices.de --redirects
```

Dazu eine echte Anfrage über das Formular: Sie muss im Postfach ankommen, `Reply-To` ist der Absender.

Häufige Ursachen, wenn etwas nicht klappt:

- **Endlosschleife oder 301 auf sich selbst über https:** Die HTTPS-Erkennung greift nicht. Prüfen, ob IONOS `HTTPS=on` oder `X-Forwarded-Proto` liefert, und die Bedingung in `tools/ionos/htaccess.mjs` anpassen. Nicht von Hand in der `.htaccess` ändern.
- **500 nach dem Upload:** Eine Direktive ist nicht erlaubt (Fehlerprotokoll im IONOS-Panel). Verdächtig ist zuerst `Options -Indexes`, dann `<If>`.
- **Anfrage liefert 503:** Konfiguration fehlt oder Google lehnt die Anmeldung ab. Den Grund zeigt das PHP-Fehlerprotokoll im Panel. Formularinhalte stehen dort nicht.
