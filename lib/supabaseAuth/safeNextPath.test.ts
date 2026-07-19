import { describe, expect, it } from 'vitest';
import { DEFAULT_STAFF_REDIRECT_PATH, resolveSafeNextPath } from './safeNextPath';

describe('resolveSafeNextPath', () => {
  it('defaults when no path is provided', () => {
    expect(resolveSafeNextPath(null)).toBe(DEFAULT_STAFF_REDIRECT_PATH);
    expect(resolveSafeNextPath(undefined)).toBe(DEFAULT_STAFF_REDIRECT_PATH);
    expect(resolveSafeNextPath('')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
  });

  it('allows local admin routes', () => {
    expect(resolveSafeNextPath('/admin')).toBe('/admin');
    expect(resolveSafeNextPath('/admin/orders?status=pending')).toBe('/admin/orders?status=pending');
    expect(resolveSafeNextPath('/admin/setup')).toBe('/admin/setup');
  });

  it('rejects non-admin local routes', () => {
    expect(resolveSafeNextPath('/shop')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
    expect(resolveSafeNextPath('/profile')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
  });

  it('rejects protocol-relative and absolute redirects', () => {
    expect(resolveSafeNextPath('//evil.example')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
    expect(resolveSafeNextPath('https://evil.example/admin')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
    expect(resolveSafeNextPath('/admin\\evil')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
  });

  it('rejects whitespace and encoded-looking unsafe input', () => {
    expect(resolveSafeNextPath('/admin orders')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
    expect(resolveSafeNextPath(' javascript:alert(1)')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
  });
});
