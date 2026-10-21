/**
 * Sliding-window rate limiter for PUBLIC routes.
 * LIMITATION (documented, owner decision needed): state lives in the memory of one server instance. On serverless
 * hosting each instance has its own counters, so this is a speed bump against casual abuse, not a guarantee. Production
 * needs a shared store (for example Vercel KV / Upstash Redis or the database) behind the same interface.
 */
export type RateResult = { ok: true } | { ok: false; retryAfterSeconds: number };
/** Synchronous (in-memory) or asynchronous (database) limiter: callers always `await` the result. */
export interface RateLimiter { check(key: string, now?: number): RateResult | Promise<RateResult> }

export function createRateLimiter(opts: { windowMs: number; max: number; maxKeys?: number }): RateLimiter {
  const hits = new Map<string, number[]>();
  const maxKeys = opts.maxKeys ?? 10_000;
  return {
    check(key, now = Date.now()) {
      const cutoff = now - opts.windowMs;
      const recent = (hits.get(key) ?? []).filter(t => t > cutoff);
      if (recent.length >= opts.max) {
        hits.set(key, recent);
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + opts.windowMs - now) / 1000)) };
      }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > maxKeys) for (const k of hits.keys()) { if (hits.size <= maxKeys / 2) break; if (k !== key) hits.delete(k); }  // bounded memory
      return { ok: true };
    },
  };
}

/** First hop of x-forwarded-for (set by the hosting proxy), else a shared bucket. Never trust it for authorization. */
export function clientKey(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  const ip = xff?.split(',')[0]?.trim() || req.headers.get('x-real-ip')?.trim() || 'unknown';
  return ip.slice(0, 64);
}
