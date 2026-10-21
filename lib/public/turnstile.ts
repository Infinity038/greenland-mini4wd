/**
 * Server-side Cloudflare Turnstile verification for PUBLIC forms (registration, product inquiry, sign-in).
 * The browser widget only produces a token; the token proves nothing until THIS function verifies it with the secret key,
 * which exists only in the server environment (TURNSTILE_SECRET_KEY) and never reaches the browser, the repo or logs.
 *
 * Fail-closed rule: when verification is required and cannot be completed (no secret configured, network failure,
 * timeout, malformed answer) the request is REFUSED. When it is not required (local development) a missing secret
 * is accepted so the stack can run offline. Cloudflare publishes always-pass / always-fail test keys for development.
 */
export type TurnstileResult = { ok: true } | { ok: false; reason: 'missing' | 'invalid' | 'unavailable' };

export interface TurnstileOptions {
  secret?: string;
  /** refuse instead of skipping when the secret is not configured (set in production) */
  required: boolean;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token: unknown, remoteIp: string, o: TurnstileOptions): Promise<TurnstileResult> {
  if (!o.secret) return o.required ? { ok: false, reason: 'unavailable' } : { ok: true };
  if (typeof token !== 'string' || token.length < 10 || token.length > 2048) return { ok: false, reason: 'missing' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? 5000);
  try {
    const body = new URLSearchParams({ secret: o.secret, response: token });
    if (remoteIp && remoteIp !== 'unknown') body.set('remoteip', remoteIp);
    const res = await (o.fetchImpl ?? fetch)(TURNSTILE_VERIFY_URL, { method: 'POST', body, signal: ctrl.signal });
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    const data = (await res.json()) as { success?: unknown };
    return data.success === true ? { ok: true } : { ok: false, reason: 'invalid' };
  } catch {
    return { ok: false, reason: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

/** Environment-driven options for route files. Production requires verification unless explicitly disabled by the owner. */
export function turnstileFromEnv(env: Record<string, string | undefined>): TurnstileOptions {
  return { secret: env.TURNSTILE_SECRET_KEY, required: env.NODE_ENV === 'production' || env.TURNSTILE_REQUIRED === 'true' };
}
