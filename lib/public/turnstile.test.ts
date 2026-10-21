import { describe, expect, it, vi } from 'vitest';
import { TURNSTILE_VERIFY_URL, turnstileFromEnv, verifyTurnstile } from './turnstile';

const tok = 'x'.repeat(40);
const reply = (body: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => body }) as unknown as Response);

describe('verifyTurnstile (server-side, fail closed)', () => {
  it('accepts only when Cloudflare says success:true, posting the secret and token to the official endpoint', async () => {
    const f = reply({ success: true });
    expect(await verifyTurnstile(tok, '203.0.113.5', { secret: 'SECRET', required: true, fetchImpl: f as unknown as typeof fetch })).toEqual({ ok: true });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(TURNSTILE_VERIFY_URL);
    const body = init.body as URLSearchParams;
    expect(body.get('secret')).toBe('SECRET'); expect(body.get('response')).toBe(tok); expect(body.get('remoteip')).toBe('203.0.113.5');
  });
  it('rejects a token Cloudflare refuses, a missing/short/oversized token, and any non-boolean success', async () => {
    const o = (f: ReturnType<typeof reply>) => ({ secret: 'S', required: true, fetchImpl: f as unknown as typeof fetch });
    expect(await verifyTurnstile(tok, 'ip', o(reply({ success: false })))).toEqual({ ok: false, reason: 'invalid' });
    expect(await verifyTurnstile(tok, 'ip', o(reply({ success: 'true' })))).toEqual({ ok: false, reason: 'invalid' });
    for (const bad of [undefined, null, '', 'short', 5, 'y'.repeat(3000)]) expect(await verifyTurnstile(bad, 'ip', o(reply({ success: true })))).toEqual({ ok: false, reason: 'missing' });
  });
  it('is unavailable (refused) when verification is required but cannot complete', async () => {
    expect(await verifyTurnstile(tok, 'ip', { required: true })).toEqual({ ok: false, reason: 'unavailable' });                 // no secret configured
    expect(await verifyTurnstile(tok, 'ip', { secret: 'S', required: true, fetchImpl: reply({}, false) as unknown as typeof fetch })).toEqual({ ok: false, reason: 'unavailable' });
    const boom = vi.fn(async () => { throw new Error('network'); });
    expect(await verifyTurnstile(tok, 'ip', { secret: 'S', required: true, fetchImpl: boom as unknown as typeof fetch })).toEqual({ ok: false, reason: 'unavailable' });
    const hang = (_u: string, init?: RequestInit) => new Promise<Response>((_r, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('aborted'))));
    expect(await verifyTurnstile(tok, 'ip', { secret: 'S', required: true, fetchImpl: hang as unknown as typeof fetch, timeoutMs: 20 })).toEqual({ ok: false, reason: 'unavailable' });
  });
  it('local development without a secret and not required is allowed; production defaults to required', async () => {
    expect(await verifyTurnstile(undefined, 'ip', { required: false })).toEqual({ ok: true });
    expect(turnstileFromEnv({ NODE_ENV: 'production' }).required).toBe(true);
    expect(turnstileFromEnv({ NODE_ENV: 'development' }).required).toBe(false);
    expect(turnstileFromEnv({ NODE_ENV: 'development', TURNSTILE_REQUIRED: 'true', TURNSTILE_SECRET_KEY: 's' })).toMatchObject({ required: true, secret: 's' });
  });
});
