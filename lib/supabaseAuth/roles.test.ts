import { describe, expect, it } from 'vitest';
import {
  EXPIRED_SESSION,
  STAFF_ROLES,
  UNAUTHENTICATED_SESSION,
  hasAnyRole,
  isAdmin,
  noStaffRoleSession,
  staffSession,
} from './roles';

describe('staff role helpers', () => {
  it('defines the expected closed role set', () => {
    expect(STAFF_ROLES).toEqual([
      'admin',
      'registration_staff',
      'checkin_staff',
      'shop_staff',
      'race_marshal',
      'viewer',
    ]);
  });

  it('represents unauthenticated and expired sessions without roles', () => {
    expect(UNAUTHENTICATED_SESSION).toEqual({ status: 'unauthenticated', userId: null, roles: [] });
    expect(EXPIRED_SESSION).toEqual({ status: 'expired', userId: null, roles: [] });
  });

  it('fails closed for authenticated users without staff roles', () => {
    const session = noStaffRoleSession('user-1');
    expect(session.status).toBe('authenticated_no_staff_role');
    expect(hasAnyRole(session, STAFF_ROLES)).toBe(false);
    expect(isAdmin(session)).toBe(false);
  });

  it('filters unknown roles and removes duplicates', () => {
    expect(staffSession('user-1', ['admin', 'admin', 'not_a_role'])).toEqual({
      status: 'staff',
      userId: 'user-1',
      roles: ['admin'],
    });
  });

  it('does not promote a user when every returned role is unknown', () => {
    expect(staffSession('user-1', ['owner', 'superuser'])).toEqual({
      status: 'authenticated_no_staff_role',
      userId: 'user-1',
      roles: [],
    });
  });

  it('checks only the explicitly allowed roles', () => {
    const viewer = staffSession('user-1', ['viewer']);
    expect(hasAnyRole(viewer, ['viewer'])).toBe(true);
    expect(hasAnyRole(viewer, ['admin'])).toBe(false);
    expect(isAdmin(viewer)).toBe(false);
    expect(isAdmin(staffSession('user-2', ['admin']))).toBe(true);
  });
});
