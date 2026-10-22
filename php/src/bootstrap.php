<?php
// Loaded by the webroot entry (api/anfrage/index.php) after it has defined RS_APP_DIR and RS_PRIVATE_DIR.
declare(strict_types=1);

require __DIR__ . '/Log.php';
require __DIR__ . '/Inquiry.php';
require __DIR__ . '/Config.php';
require __DIR__ . '/RateLimit.php';
require __DIR__ . '/Mailer.php';
require __DIR__ . '/Endpoint.php';

\RoyalSpices\Anfrage\Endpoint::run(RS_APP_DIR, RS_PRIVATE_DIR);
