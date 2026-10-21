import type { SupabaseClient } from '@supabase/supabase-js';
import type { RateLimiter } from './rateLimit';

/**
 * Persistent limiter backed by public.rate_limit_hit (supabase/dev-only/club_rate_limit.sql). The count lives in the database,
 * so it is shared by every server instance and survives restarts. Fail-closed: if the database cannot answer, the request is
 * treated as limited (a visitor sees "try again later" instead of an unprotected form).
 */
export function createDbRateLimiter(getClient: () => Promise<SupabaseClient>, o: { windowMs: number; max: number; prefix: string }): RateLimiter {
  const seconds = Math.max(1, Math.round(o.windowMs / 1000));
  return {
    async check(key: string) {
      try {
        const client = await getClient();
        const { data, error } = await client.rpc('rate_limit_hit', { p_bucket: `${o.prefix}:${key}`.slice(0, 160), p_window_seconds: seconds, p_max: o.max });
        const row = Array.isArray(data) ? data[0] : data;
        if (error || !row || typeof row.allowed !== 'boolean') return { ok: false as const, retryAfterSeconds: 30 };
        return row.allowed ? { ok: true as const } : { ok: false as const, retryAfterSeconds: Math.max(1, Number(row.retry_after) || 1) };
      } catch {
        return { ok: false as const, retryAfterSeconds: 30 };
      }
    },
  };
}
