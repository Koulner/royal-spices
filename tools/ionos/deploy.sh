#!/usr/bin/env bash
# Upload of dist-ionos/ to the IONOS webspace over SFTP (docs/HOSTING-IONOS.md). Run by
# .github/workflows/ionos.yml; works the same from a shell with lftp and the variables below.
#   IONOS_SFTP_HOST, IONOS_SFTP_USER, IONOS_SFTP_PASSWORD   access (GitHub secrets)
#   IONOS_KNOWN_HOSTS                                        pinned host key line(s) (ssh-keyscan once, checked by hand)
#   IONOS_WEBROOT=royalspices  IONOS_APP_DIR=royalspices-app  folders on the webspace
# Order, so a visitor never gets a page whose files are missing:
#   1. app/ (PHP code, outside the webroot)
#   2. webroot without HTML and .htaccess: new fingerprinted files arrive beside the old ones
#   3. webroot complete: HTML and .htaccess switch to the new build
#   4. webroot with --delete: files the new build no longer has go away
# Unchanged files are skipped: prepare.mjs gives every file a modification time derived from its
# content, and mirror compares size and time. The private folder is never touched.
set -euo pipefail

: "${IONOS_SFTP_HOST:?}" "${IONOS_SFTP_USER:?}" "${IONOS_SFTP_PASSWORD:?}" "${IONOS_KNOWN_HOSTS:?}"
WEBROOT="${IONOS_WEBROOT:-royalspices}"
APP_DIR="${IONOS_APP_DIR:-royalspices-app}"
SRC="${1:-dist-ionos}"
[ -f "$SRC/public/index.html" ] && [ -f "$SRC/public/.htaccess" ] && [ -f "$SRC/app/vendor/autoload.php" ] \
  || { echo "[deploy] $SRC is incomplete (run tools/ionos/prepare.mjs)" >&2; exit 1; }

KNOWN="$(mktemp)"
trap 'rm -f "$KNOWN"' EXIT
printf '%s\n' "$IONOS_KNOWN_HOSTS" > "$KNOWN"

export LFTP_PASSWORD="$IONOS_SFTP_PASSWORD"
lftp --env-password -u "$IONOS_SFTP_USER" "sftp://$IONOS_SFTP_HOST" <<LFTP
set cmd:fail-exit yes
set net:max-retries 3
set net:timeout 30
set sftp:auto-confirm no
set sftp:connect-program "ssh -a -x -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$KNOWN"
mirror --reverse --delete --no-perms --parallel=4 --verbose=1 "$SRC/app" "/$APP_DIR"
mirror --reverse --no-perms --parallel=4 --verbose=1 --exclude-glob *.html --exclude-glob .htaccess "$SRC/public" "/$WEBROOT"
mirror --reverse --no-perms --parallel=4 --verbose=1 "$SRC/public" "/$WEBROOT"
mirror --reverse --delete --no-perms --parallel=4 --verbose=1 --exclude-glob .well-known/ "$SRC/public" "/$WEBROOT"
bye
LFTP
echo "[deploy] done: /$WEBROOT and /$APP_DIR on $IONOS_SFTP_HOST"
