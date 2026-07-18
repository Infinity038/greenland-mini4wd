// The one reusable server-side staff-authorization entry point. Every
// current and future server-rendered /admin page should call this rather
// than re-deriving session/role logic itself.
//
// No direct `import 'server-only'` guard here — this module always imports
// ./serverClient below, and that module already carries the guard, so any
// real (unmocked) import chain that reaches this file transitively hits it
// too. Adding a second, redundant `import 'server-only'` directly in this
// file would also fire inside Vitest even when serverClient is mocked out
// (its module-level side effect runs on import regardless of mocking),
// which is exactly the scenario requireStaffSession.test.ts relies on.
//
// Composition, not new logic: creates the existing cookie-aware server
// client (serverClient.ts), hands it to the existing resolveStaffSession()
// lookup (already fail-closed, already distinguishes unauthenticated /
// expired / authenticated-no-staff-role / staff), and optionally narrows
// "staff" further against a caller-supplied allow-list of roles.
//
// Returns a typed StaffSession — it never throws and never redirects
// itself. Callers own the redirect/deny decision (e.g. unauthenticated and
// expired both typically redirect to /admin/login, while
// authenticated_no_staff_role typically renders an in-place "denied"
// screen instead) because that decision differs by call site and belongs
// in the page, not buried in a shared helper.
import { createSupabaseServerClient } from './serverClient';
import { resolveStaffSession } from './resolveStaffSession';
import { hasAnyRole, noStaffRoleSession, type StaffRole, type StaffSession } from './roles';

export async function requireStaffSession(allowedRoles?: readonly StaffRole[]): Promise<StaffSession> {
  const client = await createSupabaseServerClient();
  const session = await resolveStaffSession(client);

  if (session.status !== 'staff') {
    // Already one of unauthenticated / expired / authenticated_no_staff_role
    // — nothing this function does can upgrade that. Never trusts anything
    // from the browser here; the whole result came from resolveStaffSession's
    // own server-side auth.getUser() + staff_roles lookup.
    return session;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasAnyRole(session, allowedRoles)) {
    // A real staff account, but not holding any role this specific call
    // site requires. Collapse to the same deny status "no staff role at
    // all" uses rather than inventing a fifth StaffSessionStatus — from
    // this call site's perspective the outcome (denied) is identical, and
    // every existing caller of StaffSession already knows how to handle
    // authenticated_no_staff_role.
    // session.userId is guaranteed non-null here: staffSession() (roles.ts)
    // never constructs a 'staff' status without a real userId.
    return noStaffRoleSession(session.userId as string);
  }

  return session;
}
