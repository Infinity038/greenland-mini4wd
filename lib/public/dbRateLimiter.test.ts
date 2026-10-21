import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createDbRateLimiter } from './dbRateLimiter';

const client = (rpc: ReturnType<typeof vi.fn>) => ({ rpc }) as unknown as SupabaseClient;

describe('createDbRateLimiter (persistent, fail-closed)', () => {
  it('maps the database answer, namespaces the bucket and converts the window to seconds', async () => {
    const rpc = vi.fn(async () => ({ data: [{ allowed: true, retry_after: 5 }], error: null }));
    const l = createDbRateLimiter(async () => client(rpc), { windowMs: 600_000, max: 5, prefix: 'inquiry' });
    expect(await l.check('203.0.113.9')).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith('rate_limit_hit', { p_bucket: 'inquiry:203.0.113.9', p_window_seconds: 600, p_max: 5 });
  });
  it('returns the database retry-after when the allowance is used up', async () => {
    const rpc = vi.fn(async () => ({ data: [{ allowed: false, retry_after: 42 }], error: null }));
    expect(await createDbRateLimiter(async () => client(rpc), { windowMs: 60_000, max: 1, prefix: 'x' }).check('k')).toEqual({ ok: false, retryAfterSeconds: 42 });
  });
  it('FAILS CLOSED on a database error, a malformed answer, or an exception', async () => {
    const mk = (rpc: ReturnType<typeof vi.fn>) => createDbRateLimiter(async () => client(rpc), { windowMs: 60_000, max: 1, prefix: 'x' });
    expect(await mk(vi.fn(async () => ({ data: null, error: { message: 'down' } }))).check('k')).toMatchObject({ ok: false });
    expect(await mk(vi.fn(async () => ({ data: [{}], error: null }))).check('k')).toMatchObject({ ok: false });
    expect(await mk(vi.fn(async () => { throw new Error('boom'); })).check('k')).toMatchObject({ ok: false });
  });
  it('long keys are truncated to the database bucket limit', async () => {
    const rpc = vi.fn(async () => ({ data: [{ allowed: true, retry_after: 1 }], error: null }));
    await createDbRateLimiter(async () => client(rpc), { windowMs: 1000, max: 1, prefix: 'p' }).check('k'.repeat(500));
    expect(((rpc.mock.calls[0] as unknown[])[1] as { p_bucket: string }).p_bucket.length).toBe(160);
  });
});
