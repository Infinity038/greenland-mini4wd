// Live staff-role lookup — the only part of this module that touches
// Supabase. Kept separate from roles.ts (pure logic, unit-tested without a
// live project) so this thin wrapper is the sole place a real network call
// happens.
//
// staff_roles does not exist in the live database yet (Phase 2 is an
// unapplied proposal — supabase/migrations-proposed/phase2_staff_roles_forward.sql).
// Calling this against the current live schema will surface a Postgres
// "relation does not exist" error from the `.from('staff_roles')` query
// below; that error is handled by the same fail-closed branch as "no staff
// role found" (see the query-error comment below), not treated as staff
// access. This function is safe to ship behind a default-false feature flag
// before Phase 2 is applied, and does not itself require the migration to
// be live in order to fail safely.
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  EXPIRED_SESSION,
  UNAUTHENTICATED_SESSION,
  noStaffRoleSession,
  staffSession,
  type StaffSession,
} from './roles';

// Supabase Auth's getUser() error message for a session whose JWT has
// expired or was rejected as invalid — distinguished here only to produce a
// clearer user-facing message (§4's "expired sessions" requirement); the
// resulting StaffSession is deny-by-default either way.
const EXPIRED_OR_INVALID_SESSION_PATTERN = /expired|invalid/i;

export async function resolveStaffSession(client: SupabaseClient): Promise<StaffSession> {
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError || !userData?.user) {
    if (userError && EXPIRED_OR_INVALID_SESSION_PATTERN.test(userError.message)) {
      return EXPIRED_SESSION;
    }
    return UNAUTHENTICATED_SESSION;
  }

  const { data: roleRows, error: roleError } = await client
    .from('staff_roles')
    .select('role')
    .eq('user_id', userData.user.id);

  // Fail closed: a query error (staff_roles not yet migrated, RLS denying
  // read, a network failure) resolves to the same "no staff role" outcome
  // as a genuine zero-row result — never silently upgraded to any access.
  if (roleError || !roleRows || roleRows.length === 0) {
    return noStaffRoleSession(userData.user.id);
  }

  return staffSession(
    userData.user.id,
    roleRows.map(row => row.role as string)
  );
}
