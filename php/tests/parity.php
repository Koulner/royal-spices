<?php
// Parity harness for tests/ionos-php.test.mjs.
// stdin:  JSON array of {"id": string, "body": string (urlencoded request body)}
// stdout: JSON array of {"id", "ok": false, "fields"} or {"id", "ok": true, "subject", "text"}
declare(strict_types=1);

require __DIR__ . '/../src/Inquiry.php';

use RoyalSpices\Anfrage\Inquiry;

$cases = json_decode((string) stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$out = [];
foreach ($cases as $case) {
    $result = Inquiry::validate(Inquiry::parseBody($case['body']));
    $out[] = $result['ok']
        ? ['id' => $case['id'], 'ok' => true] + Inquiry::composeMail($result['value'])
        : ['id' => $case['id'], 'ok' => false, 'fields' => (object) $result['fields']];
}
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), "\n";
