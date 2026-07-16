// Pure redirect-decision logic for the /tickets -> /race-check-in rename,
// extracted out of middleware.ts so it's unit-testable without an edge-runtime
// request/response mock.
export function getLegacyTicketRedirectPath(pathname: string): string | null {
  if (pathname === '/tickets' || pathname.startsWith('/tickets/')) {
    return pathname.replace(/^\/tickets/, '/race-check-in');
  }
  return null;
}
