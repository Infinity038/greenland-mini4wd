export const DEFAULT_STAFF_REDIRECT_PATH = '/admin';
const SAFE_LOCAL_PATH_PATTERN = /^\/(?!\/|\\)[^\s\\]*$/;

export function resolveSafeNextPath(raw: string | null | undefined): string {
  if (!raw || !SAFE_LOCAL_PATH_PATTERN.test(raw) || raw.includes('://')) {
    return DEFAULT_STAFF_REDIRECT_PATH;
  }
  return raw.startsWith('/admin') ? raw : DEFAULT_STAFF_REDIRECT_PATH;
}

/**
 * Destinations a verified MEMBER sign-in may return to. Kept separate from the staff list so a member link can
 * never land in /admin and a staff link can never be redirected into a member route. Exact paths or a path
 * prefix followed by "/" or "?" only (so "/prediction-pit-evil" does not match "/prediction-pit").
 */
export const DEFAULT_MEMBER_REDIRECT_PATH = '/secure-member-signin/complete';
const MEMBER_PREFIXES = ['/secure-member-signin/complete', '/prediction-pit', '/profile'] as const;

export function resolveSafeMemberNextPath(raw: string | null | undefined): string | null {
  if (!raw || !SAFE_LOCAL_PATH_PATTERN.test(raw) || raw.includes('://')) return null;
  const pathOnly = raw.split(/[?#]/)[0];
  const ok = MEMBER_PREFIXES.some(p => pathOnly === p || pathOnly.startsWith(p + '/'));
  return ok ? raw : null;
}

/**
 * Where a verified-email sign-in may return an OPERATOR/STAFF member: an /admin page (not the login/setup screens, to avoid loops).
 * This only decides where the browser goes after signing in; the admin pages themselves still require a staff role (middleware and
 * server guard) and the database re-checks it, so naming an /admin path grants nothing.
 */
export function resolveSafeStaffNextPath(raw: string | null | undefined): string | null {
  if (!raw || !SAFE_LOCAL_PATH_PATTERN.test(raw) || raw.includes('://')) return null;
  const pathOnly = raw.split(/[?#]/)[0];
  if (pathOnly !== '/admin' && !pathOnly.startsWith('/admin/')) return null;
  if (pathOnly === '/admin/login' || pathOnly === '/admin/setup' || pathOnly.startsWith('/admin/login/') || pathOnly.startsWith('/admin/setup/')) return null;
  return raw;
}
