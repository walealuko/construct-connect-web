type Bucket = { count: number; resetAt: number };

// In-memory key->bucket map. For multi-instance deployments (Vercel
// multi-region), swap to Upstash/Redis. The interface (`take(...)`)
// is small enough to keep stable across that swap.
const buckets = new Map<string, Bucket>();

/**
 * Token-bucket rate limiter. Returns true if the request is allowed,
 * false if the caller has exceeded `limit` within the `windowMs` window.
 *
 * Idle keys are pruned every 10 minutes by a `setInterval` below so
 * the map doesn't grow unbounded under sustained attack. The prune
 * uses `unref()` so it never holds the Node event loop open.
 */
export function take(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

// Prune idle keys. The `setInterval` exists in Node and Edge runtime
// both; the `unref?.()` call is a Node-only nicety that lets the
// process exit cleanly during local dev. We only set the timer once
// per process; the `globalThis` flag stops HMR from stacking timers
// in dev.
const g = globalThis as unknown as { __rateLimitPruneInstalled?: boolean };
if (!g.__rateLimitPruneInstalled && typeof setInterval !== "undefined") {
  g.__rateLimitPruneInstalled = true;
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) {
      if (b.resetAt < now) buckets.delete(k);
    }
  }, 10 * 60_000).unref?.();
}
