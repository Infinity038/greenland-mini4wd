export const STAFF_ROLES = [
  'admin',
  'registration_staff',
  'checkin_staff',
  'shop_staff',
  'race_marshal',
  'viewer',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
export type StaffSessionStatus = 'unauthenticated' | 'expired' | 'authenticated_no_staff_role' | 'staff';

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

export function staffSession(userId: string, rawRoles: string[]): StaffSession {
  const roles = [...new Set(rawRoles.filter(isStaffRole))];
  return roles.length ? { status: 'staff', userId, roles } : noStaffRoleSession(userId);
}

export function hasAnyRole(session: StaffSession, allowed: readonly StaffRole[]): boolean {
  return session.status === 'staff' && session.roles.some(role => allowed.includes(role));
}

export function isAdmin(session: StaffSession): boolean {
  return hasAnyRole(session, ['admin']);
}
