// Tiny in-memory token bucket. One process keeps one map; this is a
// best-effort floor, not a strict cap (Vercel runs many instances).
// For a real cap, swap the map for Upstash/Redis later — the interface
// stays the same.
//
// Defaults: 20 AI calls per user per 5 minutes. Tune via env if needed.

const BUCKETS = new Map<string, { tokens: number; resetAt: number }>();

interface Result {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function takeToken(
  key: string,
  capacity = Number(process.env.AI_RATE_LIMIT_CAPACITY ?? 20),
  windowMs = Number(process.env.AI_RATE_LIMIT_WINDOW_MS ?? 5 * 60_000),
): Result {
  const now = Date.now();
  const cur = BUCKETS.get(key);

  if (!cur || cur.resetAt < now) {
    BUCKETS.set(key, { tokens: capacity - 1, resetAt: now + windowMs });
    return { ok: true, remaining: capacity - 1, resetAt: now + windowMs };
  }

  if (cur.tokens <= 0) {
    return { ok: false, remaining: 0, resetAt: cur.resetAt };
  }

  cur.tokens -= 1;
  return { ok: true, remaining: cur.tokens, resetAt: cur.resetAt };
}

export function rateLimitHeaders(r: Result): HeadersInit {
  return {
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(Math.ceil(r.resetAt / 1000)),
  };
}
