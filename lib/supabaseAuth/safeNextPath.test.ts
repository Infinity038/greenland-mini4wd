import { describe, expect, it } from 'vitest';
import { DEFAULT_STAFF_REDIRECT_PATH, resolveSafeNextPath } from './safeNextPath';

describe('resolveSafeNextPath — accepts genuine local paths', () => {
  it('accepts a plain local path', () => {
    expect(resolveSafeNextPath('/admin/orders')).toBe('/admin/orders');
  });
  it('accepts a local path with a query string', () => {
    expect(resolveSafeNextPath('/admin/products?tab=drafts')).toBe('/admin/products?tab=drafts');
  });
  it('accepts the root path', () => {
    expect(resolveSafeNextPath('/')).toBe('/');
  });
});

describe('resolveSafeNextPath — falls back to the default for anything unsafe', () => {
  it('falls back for null', () => {
    expect(resolveSafeNextPath(null)).toBe(DEFAULT_STAFF_REDIRECT_PATH);
  });
  it('falls back for undefined', () => {
    expect(resolveSafeNextPath(undefined)).toBe(DEFAULT_STAFF_REDIRECT_PATH);
  });
  it('falls back for an empty string', () => {
    expect(resolveSafeNextPath('')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
  });
  it('rejects a protocol-relative "//host" open redirect', () => {
    expect(resolveSafeNextPath('//evil.com')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
  });
  it('rejects a protocol-relative "///host" open redirect', () => {
    expect(resolveSafeNextPath('///evil.com')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
  });
  it('rejects a full external URL with a scheme', () => {
    expect(resolveSafeNextPath('https://evil.com')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
    expect(resolveSafeNextPath('http://evil.com')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
  });
  it('rejects a scheme with no leading slash at all', () => {
    expect(resolveSafeNextPath('javascript:alert(1)')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
  });
  it('rejects a backslash-prefixed path some browsers treat as protocol-relative', () => {
    expect(resolveSafeNextPath('/\\evil.com')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
  });
  it('rejects a path that embeds a scheme further in', () => {
    expect(resolveSafeNextPath('/redirect?to=https://evil.com')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
  });
  it('rejects a path containing whitespace', () => {
    expect(resolveSafeNextPath('/admin orders')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
  });
  it('rejects a path containing an embedded backslash', () => {
    expect(resolveSafeNextPath('/admin\\orders')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
  });
  it('rejects a relative path with no leading slash', () => {
    expect(resolveSafeNextPath('admin/orders')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
  });
});
