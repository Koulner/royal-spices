<?php
// POST /api/anfrage/ on IONOS webhosting: same behaviour as src/pages/api/anfrage.ts.
// Security boundary: everything arriving here is untrusted.
//   - same-origin only (mirror of Astro's checkOrigin: cross-site form posts get 403)
//   - content type restricted, body capped at 16 KiB
//   - rate limit per client address (HMAC only) plus a global ceiling, shared via a locked file
//   - honeypot and minimum fill time against simple bots
//   - schema validation identical to schema.ts (parity-tested)
//   - errors are generic; nothing internal reaches the client, the log gets causes only
declare(strict_types=1);

namespace RoyalSpices\Anfrage;

final class Endpoint
{
    public const MAX_BODY_BYTES = 16384;

    private const MESSAGES = [
        'validation' => 'Bitte prüfe die markierten Angaben.',
        'rate' => 'Das waren viele Anfragen in kurzer Zeit. Bitte versuche es später noch einmal oder ruf uns an.',
        'type' => 'Die Anfrage konnte so nicht verarbeitet werden.',
        'size' => 'Die Anfrage ist zu umfangreich. Bitte kürze deine Nachricht.',
        'unavailable' => 'Die Anfrage konnte gerade nicht zugestellt werden. Bitte schreib uns direkt oder ruf an.',
    ];

    private const FORM_CONTENT_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];
    private const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

    public static function run(string $appDir, string $privateDir): void
    {
        ini_set('display_errors', '0');
        ini_set('default_mimetype', '');
        header_remove('X-Powered-By');

        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? null;

        $config = null;
        try {
            $config = Config::load($privateDir);
        } catch (\Throwable $e) {
            Log::cause('configuration unreadable: ' . get_class($e));
        }

        if ($config !== null && !in_array($method, self::SAFE_METHODS, true)
            && self::isForbiddenCrossOrigin($_SERVER['HTTP_ORIGIN'] ?? null, $contentType, $config['origin'])) {
            http_response_code(403);
            header('cache-control: no-store');
            header('content-type: text/plain;charset=UTF-8');
            echo "Cross-site {$method} form submissions are forbidden";
            return;
        }

        if ($method !== 'POST') {
            http_response_code(405);
            header('allow: POST');
            header('cache-control: no-store');
            return;
        }

        try {
            $outcome = $config === null
                ? self::fail(503, 'unavailable')
                : self::handle($config, $contentType, $appDir, $privateDir);
        } catch (\Throwable $e) {
            Log::cause('unexpected error: ' . get_class($e) . ' at ' . basename($e->getFile()) . ':' . $e->getLine());
            $outcome = self::fail(500, 'unavailable');
        }
        self::respond($outcome);
    }

    /** Astro checkOrigin: a form-like (or missing) content type needs Origin === site origin. */
    public static function isForbiddenCrossOrigin(?string $origin, ?string $contentType, array $allowed): bool
    {
        $sameOrigin = $origin !== null && in_array($origin, $allowed, true);
        if ($contentType !== null) {
            $lower = strtolower($contentType);
            foreach (self::FORM_CONTENT_TYPES as $form) {
                if (str_contains($lower, $form)) {
                    return !$sameOrigin;
                }
            }
            return false;
        }
        return !$sameOrigin;
    }

    private static function handle(array $config, ?string $contentType, string $appDir, string $privateDir): array
    {
        $type = strtolower(Inquiry::jsTrim(explode(';', $contentType ?? '')[0]));
        if ($type !== 'application/x-www-form-urlencoded') {
            return self::fail(415, 'type');
        }

        $limiter = new RateLimit($privateDir . '/anfrage-ratelimit.json', $config['hmac_key']);
        $retryAfter = $limiter->take((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
        if ($retryAfter > 0) {
            return self::fail(429, 'rate') + ['retryAfter' => $retryAfter];
        }

        $raw = self::readBody();
        if ($raw === null) {
            return self::fail(413, 'size');
        }

        $data = Inquiry::parseBody($raw);

        // Bots fill every field and submit at once. Answer as if it worked; deliver nothing.
        $started = Inquiry::jsNumber($data['gestartet'] ?? '0');
        $nowMs = microtime(true) * 1000;
        $tooFast = $started > 0 && $nowMs - $started < 2500;
        if (($data['website'] ?? '') !== '' || $tooFast) {
            return ['status' => 200, 'body' => ['ok' => true]];
        }

        $parsed = Inquiry::validate($data);
        if (!$parsed['ok']) {
            return self::fail(422, 'validation') + ['fields' => $parsed['fields']];
        }

        try {
            Mailer::send($config, $parsed['value'], $appDir);
            return ['status' => 200, 'body' => ['ok' => true]];
        } catch (DeliveryFailed $e) {
            Log::cause('delivery failed: ' . $e->getMessage());
            return self::fail(503, 'unavailable');
        }
    }

    /** Body up to MAX_BODY_BYTES, or null when larger (declared or actual). */
    private static function readBody(): ?string
    {
        $declared = Inquiry::jsNumber((string) ($_SERVER['CONTENT_LENGTH'] ?? '0'));
        if ($declared > self::MAX_BODY_BYTES) {
            return null;
        }
        $in = fopen('php://input', 'rb');
        if ($in === false) {
            return '';
        }
        $raw = stream_get_contents($in, self::MAX_BODY_BYTES + 1);
        fclose($in);
        if ($raw === false) {
            return '';
        }
        return strlen($raw) > self::MAX_BODY_BYTES ? null : $raw;
    }

    private static function fail(int $status, string $error): array
    {
        return ['status' => $status, 'body' => ['ok' => false, 'error' => $error, 'message' => self::MESSAGES[$error]]];
    }

    private static function respond(array $outcome): void
    {
        $body = $outcome['body'];
        if (isset($outcome['fields'])) {
            $body['fields'] = $outcome['fields'];
        }
        header('cache-control: no-store');
        if (!empty($outcome['retryAfter'])) {
            header('retry-after: ' . $outcome['retryAfter']);
        }

        // Scripted submissions get JSON; a plain form post (no JavaScript) is redirected to a result page.
        if (str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')) {
            http_response_code($outcome['status']);
            header('content-type: application/json; charset=utf-8');
            echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS);
            return;
        }
        $location = $outcome['status'] === 200 ? '/anfrage/gesendet/' : '/anfrage/fehler/?grund=' . $body['error'];
        header('location: ' . $location, true, 303);
    }
}
