<?php
// Loads royalspices-private/anfrage.config.php (outside the webroot, never in the repo).
// A missing or incomplete configuration disables delivery (503), it never fakes success.
// Only the name of the offending key is logged, never a value.
declare(strict_types=1);

namespace RoyalSpices\Anfrage;

final class Config
{
    /** @return array<string,mixed>|null */
    public static function load(string $privateDir): ?array
    {
        $file = $privateDir . '/anfrage.config.php';
        if (!is_file($file)) {
            Log::cause('configuration missing (anfrage.config.php)');
            return null;
        }
        $config = require $file;
        $problem = is_array($config) ? self::problem($config) : 'file does not return an array';
        if ($problem !== null) {
            Log::cause('configuration invalid: ' . $problem);
            return null;
        }
        $config['origin'] = (array) $config['origin'];
        return $config;
    }

    private static function problem(array $c): ?string
    {
        $smtp = $c['smtp'] ?? null;
        if (!is_array($smtp)) {
            return 'smtp';
        }
        if (!is_string($smtp['host'] ?? null) || $smtp['host'] === '') {
            return 'smtp.host';
        }
        if (!is_int($smtp['port'] ?? null) || $smtp['port'] < 1 || $smtp['port'] > 65535) {
            return 'smtp.port';
        }
        $secure = $smtp['secure'] ?? null;
        if (!in_array($secure, ['ssl', 'tls', 'none'], true)) {
            return 'smtp.secure (ssl|tls|none)';
        }
        if ($secure === 'none' && !self::isLoopback($smtp['host'])) {
            return 'smtp.secure none is only allowed for a loopback host';
        }
        if (!is_string($smtp['user'] ?? '') || !is_string($smtp['pass'] ?? '')) {
            return 'smtp.user/pass';
        }
        foreach (['from', 'to'] as $key) {
            if (!is_string($c[$key] ?? null) || filter_var($c[$key], FILTER_VALIDATE_EMAIL) === false) {
                return $key;
            }
        }
        $origins = (array) ($c['origin'] ?? []);
        if (!$origins) {
            return 'origin';
        }
        foreach ($origins as $origin) {
            if (!is_string($origin) || !preg_match('#^https?://[^/\s]+$#D', $origin)) {
                return 'origin (scheme://host[:port], no trailing slash)';
            }
        }
        $key = $c['hmac_key'] ?? null;
        if (!is_string($key) || strlen($key) < 32 || str_contains($key, 'CHANGE_ME')) {
            return 'hmac_key (at least 32 random characters)';
        }
        return null;
    }

    public static function isLoopback(string $host): bool
    {
        $host = trim($host, '[]');
        return $host === 'localhost' || $host === '::1' || preg_match('/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/D', $host) === 1;
    }
}
