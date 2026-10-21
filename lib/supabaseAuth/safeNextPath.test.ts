import { describe, expect, it } from 'vitest';
import { DEFAULT_STAFF_REDIRECT_PATH, resolveSafeMemberNextPath, resolveSafeNextPath, resolveSafeStaffNextPath } from './safeNextPath';

describe('resolveSafeMemberNextPath (member sign-in return paths)', () => {
  it('allows the verification, profile and portal paths, with query strings and sub-paths', () => {
    for (const ok of ['/secure-member-signin/complete', '/prediction-pit', '/prediction-pit/mcl', '/prediction-pit?x=1', '/profile', '/profile?tab=orders']) {
      expect(resolveSafeMemberNextPath(ok), ok).toBe(ok);
    }
  });
  it('rejects admin routes, look-alike prefixes, absolute and protocol-relative URLs, and junk', () => {
    for (const bad of ['/admin', '/admin/orders', '/prediction-pit-evil', '/profiles', '/shop', '//evil.example', 'https://evil.example/profile', '/profile\\x', '/profile x', '', null, undefined]) {
      expect(resolveSafeMemberNextPath(bad as string | null | undefined), String(bad)).toBeNull();
    }
  });
  it('a staff link can never be steered into a member route and a member link never into /admin', () => {
    expect(resolveSafeNextPath('/prediction-pit')).toBe(DEFAULT_STAFF_REDIRECT_PATH);
    expect(resolveSafeMemberNextPath('/admin')).toBeNull();
  });
});

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

describe('resolveSafeStaffNextPath (return to an admin page after the secure email sign-in)', () => {
  it('allows /admin pages with sub-paths and query strings', () => {
    expect(resolveSafeStaffNextPath('/admin')).toBe('/admin');
    expect(resolveSafeStaffNextPath('/admin/members')).toBe('/admin/members');
    expect(resolveSafeStaffNextPath('/admin/tickets?tab=pending')).toBe('/admin/tickets?tab=pending');
  });
  it('refuses everything else: other areas, look-alikes, login and setup (loops), absolute and protocol-relative URLs', () => {
    for (const bad of [null, undefined, '', '/', '/prediction-pit', '/adminx', '/admin-evil', '/admin/login', '/admin/setup', '/admin/login/x',
      '//evil.example', 'https://evil.example/admin', '/\\evil', '/admin\\x', 'javascript:alert(1)', '/admin orders']) {
      expect(resolveSafeStaffNextPath(bad as string | null | undefined), String(bad)).toBeNull();
    }
  });
  it('a staff path is not a member path and vice versa', () => {
    expect(resolveSafeMemberNextPath('/admin/members')).toBeNull();
    expect(resolveSafeStaffNextPath('/prediction-pit')).toBeNull();
  });
});
