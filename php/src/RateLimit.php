<?php
// Sliding-window rate limit shared by all PHP processes: one JSON file, guarded by flock.
// Same rules as src/lib/inquiry/rate-limit.ts with the limits of anfrage.ts
// (8 per client address and 120 overall per 10 minutes). Client addresses are stored only as
// HMAC-SHA256 with the key from the configuration; entries older than the window are dropped
// on every write, so nothing outlives 10 minutes.
declare(strict_types=1);

namespace RoyalSpices\Anfrage;

final class RateLimit
{
    public const WINDOW_MS = 600000;
    public const PER_CLIENT = 8;
    public const OVERALL = 120;

    public function __construct(private string $file, private string $hmacKey)
    {
    }

    /**
     * Records one attempt for "all" and for the client, like anfrage.ts (both are always counted).
     *
     * @return int 0 when allowed, otherwise Retry-After in seconds (>= 1)
     */
    public function take(string $clientAddress, ?int $now = null): int
    {
        $now ??= (int) floor(microtime(true) * 1000);
        $handle = fopen($this->file, 'c+');
        if ($handle === false) {
            throw new \RuntimeException('rate-limit file cannot be opened');
        }
        try {
            if (!flock($handle, LOCK_EX)) {
                throw new \RuntimeException('rate-limit file cannot be locked');
            }
            $raw = stream_get_contents($handle);
            $hits = is_string($raw) && $raw !== '' ? json_decode($raw, true) : [];
            if (!is_array($hits)) {
                $hits = []; // a damaged file only resets the counters
            }
            $fresh = [];
            foreach ($hits as $key => $times) {
                if (!is_array($times)) {
                    continue;
                }
                $times = array_values(array_filter($times, static fn ($t): bool => is_int($t) && $now - $t < self::WINDOW_MS));
                if ($times) {
                    $fresh[(string) $key] = $times;
                }
            }

            $global = self::takeKey($fresh, 'all', self::OVERALL, $now);
            $client = self::takeKey($fresh, 'c:' . hash_hmac('sha256', $clientAddress, $this->hmacKey), self::PER_CLIENT, $now);

            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, json_encode((object) $fresh, JSON_THROW_ON_ERROR));
            fflush($handle);
            flock($handle, LOCK_UN);
            return max($global, $client);
        } finally {
            fclose($handle);
        }
    }

    /** @return int 0 or Retry-After seconds */
    private static function takeKey(array &$hits, string $key, int $limit, int $now): int
    {
        $times = $hits[$key] ?? [];
        if (count($times) >= $limit) {
            return max(1, (int) ceil(($times[0] + self::WINDOW_MS - $now) / 1000));
        }
        $times[] = $now;
        $hits[$key] = $times;
        return 0;
    }
}
