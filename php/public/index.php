<?php
// Webroot entry for /api/anfrage/ (deployed as <webroot>/api/anfrage/index.php).
// App code and private data live outside the webroot; the folder names below are replaced by the
// deploy build. The environment overrides exist for tests only.
declare(strict_types=1);

define('RS_APP_DIR', getenv('RS_APP_DIR') ?: __DIR__ . '/../../../royalspices-app');
define('RS_PRIVATE_DIR', getenv('RS_PRIVATE_DIR') ?: __DIR__ . '/../../../royalspices-private');

require RS_APP_DIR . '/src/bootstrap.php';
