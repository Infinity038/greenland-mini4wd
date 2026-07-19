export const DEFAULT_STAFF_REDIRECT_PATH = '/admin';
const SAFE_LOCAL_PATH_PATTERN = /^\/(?!\/|\\)[^\s\\]*$/;

export function resolveSafeNextPath(raw: string | null | undefined): string {
  if (!raw || !SAFE_LOCAL_PATH_PATTERN.test(raw) || raw.includes('://')) {
    return DEFAULT_STAFF_REDIRECT_PATH;
  }
  return raw.startsWith('/admin') ? raw : DEFAULT_STAFF_REDIRECT_PATH;
}
