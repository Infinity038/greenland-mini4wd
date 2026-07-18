// Live staff-role lookup — the only part of this module that touches
// Supabase. Kept separate from roles.ts (pure logic, unit-tested without a
// live project) so this thin wrapper is the sole place a real network call
// happens.
//
// Resolves roles via the `current_staff_roles()` RPC
// (supabase/migrations-proposed/phase2_staff_roles_forward.sql), never via
// a direct `.from('staff_roles')` table query. staff_roles has RLS enabled
// with NO SELECT policy in Phase 2 — and Phase 3 only ever adds an
// admin-only read policy, never a general authenticated self-read policy
// (docs/RLS-POLICY-MATRIX.md, Group D) — so a direct table query would be
// denied for every legitimate staff account, not just intruders.
// `current_staff_roles()` is SECURITY DEFINER and reads past that RLS
// default-deny on the caller's behalf, but only ever for auth.uid() itself:
// it takes no argument, so there is no parameter through which this code
// (or anything else) could ask for another user's roles.
//
// Neither `current_staff_roles()` nor the `staff_roles` table it reads
// exists in the live database yet (Phase 1/2 are unapplied proposals).
// Calling the RPC against the current live schema surfaces a Postgres
// "function does not exist" error; that error is handled by the same
// fail-closed branch as "no staff role found" (see the RPC-error comment
// below), never treated as staff access. This function is safe to ship
// behind a default-false feature flag before Phase 1/2 are applied, and
// does not itself require the migration to be live in order to fail safely.
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

  // No arguments — current_staff_roles() only ever resolves auth.uid()
  // server-side. Never pass userData.user.id (or anything else) here; doing
  // so would imply a user-id parameter this RPC deliberately does not have.
  const { data: roleRows, error: roleError } = await client.rpc('current_staff_roles');

  // Fail closed: an RPC error (function/table not yet migrated, RLS
  // denying the underlying read, a network failure) resolves to the same
  // "no staff role" outcome as a genuine zero-row result — never silently
  // upgraded to any access.
  if (roleError || !roleRows || roleRows.length === 0) {
    return noStaffRoleSession(userData.user.id);
  }

  return staffSession(
    userData.user.id,
    roleRows.map((row: { role: string }) => row.role)
  );
}
