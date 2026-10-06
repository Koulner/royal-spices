// Sliding-window rate limit, in memory.
// Enough for one Node process. Behind several instances, move this to the shared edge or a store
// (documented in docs/ARCHITECTURE.md) — the interface stays the same.

type Options = { limit: number; windowMs: number };

export function createRateLimiter({ limit, windowMs }: Options) {
  const hits = new Map<string, number[]>();
  let lastSweep = 0;

  function sweep(now: number) {
    if (now - lastSweep < windowMs) return;
    lastSweep = now;
    for (const [key, times] of hits) {
      const fresh = times.filter((t) => now - t < windowMs);
      if (fresh.length) hits.set(key, fresh);
      else hits.delete(key);
    }
  }

  return {
    /** Records an attempt. `allowed` is false once the key has used its budget for the window. */
    take(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
      sweep(now);
      const times = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (times.length >= limit) {
        hits.set(key, times);
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((times[0] + windowMs - now) / 1000)) };
      }
      times.push(now);
      hits.set(key, times);
      return { allowed: true, retryAfterSeconds: 0 };
    },
    size: () => hits.size,
  };
}
