import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  isPreviewCommerceMutationBlocked,
  commerceGuardStatus,
  assertCommerceMutationAllowed,
  PreviewCommerceMutationBlockedError,
  PREVIEW_GUARD_ERROR_CODE,
  PREVIEW_GUARD_MESSAGE,
  PREVIEW_GUARD_USER_MESSAGE,
} from './commercePreviewGuard';

const ORIGINAL_VERCEL_ENV = process.env.VERCEL_ENV;

describe('isPreviewCommerceMutationBlocked — the authoritative server-side check', () => {
  afterEach(() => {
    if (ORIGINAL_VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = ORIGINAL_VERCEL_ENV;
  });

  it('blocks when VERCEL_ENV is "preview"', () => {
    process.env.VERCEL_ENV = 'preview';
    expect(isPreviewCommerceMutationBlocked()).toBe(true);
  });

  it('does not block Production — this guard never changes Production behavior', () => {
    process.env.VERCEL_ENV = 'production';
    expect(isPreviewCommerceMutationBlocked()).toBe(false);
  });

  it('does not block "development"', () => {
    process.env.VERCEL_ENV = 'development';
    expect(isPreviewCommerceMutationBlocked()).toBe(false);
  });

  it('missing VERCEL_ENV (local dev, CI) is explicitly not blocked — documented, not accidental', () => {
    delete process.env.VERCEL_ENV;
    expect(isPreviewCommerceMutationBlocked()).toBe(false);
  });
});

describe('commerceGuardStatus — structured status for the API route', () => {
  afterEach(() => {
    if (ORIGINAL_VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = ORIGINAL_VERCEL_ENV;
  });

  it('reports blocked with the exact required code and message on Preview', () => {
    process.env.VERCEL_ENV = 'preview';
    expect(commerceGuardStatus()).toEqual({
      blocked: true,
      code: 'PREVIEW_ORDER_SUBMISSION_DISABLED',
      message: 'Preview deployment — order submission is disabled to protect live inventory.',
    });
    expect(PREVIEW_GUARD_ERROR_CODE).toBe('PREVIEW_ORDER_SUBMISSION_DISABLED');
    expect(PREVIEW_GUARD_MESSAGE).toBe('Preview deployment — order submission is disabled to protect live inventory.');
  });

  it('reports not-blocked with null code/message on Production', () => {
    process.env.VERCEL_ENV = 'production';
    expect(commerceGuardStatus()).toEqual({ blocked: false, code: null, message: null });
  });
});

describe('assertCommerceMutationAllowed — the client-side call every mutation function awaits first', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws PreviewCommerceMutationBlockedError when the guard endpoint reports blocked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ blocked: true, code: PREVIEW_GUARD_ERROR_CODE, message: PREVIEW_GUARD_MESSAGE }),
    }));
    await expect(assertCommerceMutationAllowed()).rejects.toBeInstanceOf(PreviewCommerceMutationBlockedError);
    await expect(assertCommerceMutationAllowed()).rejects.toThrow(PREVIEW_GUARD_MESSAGE);
  });

  it('resolves without throwing when the guard endpoint reports not blocked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ blocked: false, code: null, message: null }),
    }));
    await expect(assertCommerceMutationAllowed()).resolves.toBeUndefined();
  });

  it('fails closed (throws) if the guard endpoint itself is unreachable — never silently permits a mutation on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(assertCommerceMutationAllowed()).rejects.toBeInstanceOf(PreviewCommerceMutationBlockedError);
  });

  it('always calls the same fixed endpoint, no caching, so every mutation gets a fresh check', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ blocked: false, code: null, message: null }) });
    vi.stubGlobal('fetch', fetchMock);
    await assertCommerceMutationAllowed();
    await assertCommerceMutationAllowed();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('/api/commerce-guard', { cache: 'no-store' });
  });
});

describe('PreviewCommerceMutationBlockedError', () => {
  it('carries the required error code', () => {
    const err = new PreviewCommerceMutationBlockedError();
    expect(err.code).toBe('PREVIEW_ORDER_SUBMISSION_DISABLED');
    expect(err.message).toBe(PREVIEW_GUARD_MESSAGE);
  });

  it('the storefront user-facing message matches the required concise wording', () => {
    expect(PREVIEW_GUARD_USER_MESSAGE).toBe('Preview mode — orders are disabled and no inventory will be changed.');
  });
});
