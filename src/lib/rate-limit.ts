// Simple in-memory sliding-window rate limiter. Per-process — sufficient for a
// single-instance self-hosted deployment. For multi-instance, back this with Redis.

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

/**
 * Allow up to `max` events per `windowMs` for a given key.
 * Returns allowed=false with retryAfterSec once the limit is hit.
 */
export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    hits.set(key, recent);
    const retryAfterSec = Math.ceil((windowMs - (now - recent[0])) / 1000);
    return { allowed: false, retryAfterSec };
  }

  recent.push(now);
  hits.set(key, recent);
  return { allowed: true, retryAfterSec: 0 };
}
