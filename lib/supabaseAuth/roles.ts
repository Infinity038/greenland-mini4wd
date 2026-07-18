// Pure, dependency-free role/session logic — no Supabase client, no network
// call, fully unit-testable. Kept separate from resolveStaffSession.ts (which
// does the live lookup) so the fail-closed decision logic can be tested
// without ever touching a live Supabase project.
//
// Mirrors the staff_role enum defined in
// supabase/migrations-proposed/phase2_staff_roles_forward.sql — keep in sync
// if that enum ever changes. There is no 'owner' value: "owner" is an
// operational designation for the first bootstrap 'admin' row, not a
// database role (see that migration's OWNER DESIGNATION note).
export const STAFF_ROLES = [
  'admin',
  'registration_staff',
  'checkin_staff',
  'shop_staff',
  'race_marshal',
  'viewer',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export type StaffSessionStatus =
  | 'unauthenticated'
  | 'expired'
  | 'authenticated_no_staff_role'
  | 'staff';

export interface StaffSession {
  status: StaffSessionStatus;
  userId: string | null;
  roles: StaffRole[];
}

export const UNAUTHENTICATED_SESSION: StaffSession = { status: 'unauthenticated', userId: null, roles: [] };
export const EXPIRED_SESSION: StaffSession = { status: 'expired', userId: null, roles: [] };

export function noStaffRoleSession(userId: string): StaffSession {
  return { status: 'authenticated_no_staff_role', userId, roles: [] };
}

function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(value);
}

// Fail closed: any role string that isn't one of the six known values is
// dropped rather than trusted, and an empty/all-invalid role list resolves
// to "no staff role" rather than "staff with zero roles" — there is no
// StaffSession shape that means "staff" without at least one real role in
// it.
export function staffSession(userId: string, rawRoles: string[]): StaffSession {
  const roles = rawRoles.filter(isStaffRole);
  if (roles.length === 0) return noStaffRoleSession(userId);
  return { status: 'staff', userId, roles };
}

export function isAdmin(session: StaffSession): boolean {
  return session.status === 'staff' && session.roles.includes('admin');
}

export function hasAnyRole(session: StaffSession, allowed: readonly StaffRole[]): boolean {
  if (session.status !== 'staff') return false;
  return session.roles.some(role => allowed.includes(role));
}

export function isShopStaffOrAdmin(session: StaffSession): boolean {
  return hasAnyRole(session, ['shop_staff', 'admin']);
}

// Refunds are admin-only (approved owner decision) — shop_staff may review
// and approve ordinary payments once that RPC milestone lands, but must
// never be able to execute a refund. Deliberately NOT implemented as
// hasAnyRole(session, ['admin', 'shop_staff']) — that would silently widen
// refund access to shop_staff, exactly what this decision forbids. No
// refund RPC exists yet; this function exists now so the permission rule is
// encoded and tested ahead of that RPC being written.
export function canExecuteRefund(session: StaffSession): boolean {
  return isAdmin(session);
}

// One explicit "is this session denied by default" gate, for callers that
// just need a boolean rather than inspecting `status` themselves. Every
// unrecognized or non-'staff' status is denied — there is no status value
// this returns false for other than 'staff'.
export function isDeniedByDefault(session: StaffSession): boolean {
  return session.status !== 'staff';
}
