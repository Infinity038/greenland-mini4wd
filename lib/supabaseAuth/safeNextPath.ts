// Validates a `?next=` redirect target so a staff login can be sent back to
// where they started without becoming an open redirect. Pure, dependency-
// free, fully unit-testable.
export const DEFAULT_STAFF_REDIRECT_PATH = '/admin';

// Accepts only a single-leading-slash, same-origin, relative path with no
// embedded scheme, no protocol-relative "//host" prefix, no backslash
// tricks some browsers still treat as protocol-relative, and no
// whitespace/control characters. Anything that doesn't clearly satisfy
// this falls back to the default rather than being partially trusted.
const SAFE_LOCAL_PATH_PATTERN = /^\/(?!\/|\\)[^\s\\]*$/;

export function resolveSafeNextPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_STAFF_REDIRECT_PATH;
  if (!SAFE_LOCAL_PATH_PATTERN.test(raw)) return DEFAULT_STAFF_REDIRECT_PATH;
  if (raw.includes('://')) return DEFAULT_STAFF_REDIRECT_PATH;
  return raw;
}
