import { describe, it, expect, afterEach } from 'vitest';
import { GET } from './route';

const ORIGINAL_VERCEL_ENV = process.env.VERCEL_ENV;

describe('GET /api/commerce-guard — server-side mutation boundary', () => {
  afterEach(() => {
    if (ORIGINAL_VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = ORIGINAL_VERCEL_ENV;
  });

  it('returns 403 and blocked:true on Preview', async () => {
    process.env.VERCEL_ENV = 'preview';
    const res = await GET();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({
      blocked: true,
      code: 'PREVIEW_ORDER_SUBMISSION_DISABLED',
      message: 'Preview deployment — order submission is disabled to protect live inventory.',
    });
  });

  it('returns 200 and blocked:false on Production — Production is never blocked by this guard', async () => {
    process.env.VERCEL_ENV = 'production';
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ blocked: false, code: null, message: null });
  });

  it('returns 200 and blocked:false when VERCEL_ENV is unset (local dev / CI)', async () => {
    delete process.env.VERCEL_ENV;
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).blocked).toBe(false);
  });
});
