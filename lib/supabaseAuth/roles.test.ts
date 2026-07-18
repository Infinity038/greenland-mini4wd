import { describe, expect, it } from 'vitest';
import {
  EXPIRED_SESSION,
  UNAUTHENTICATED_SESSION,
  STAFF_ROLES,
  canExecuteRefund,
  hasAnyRole,
  isAdmin,
  isDeniedByDefault,
  isShopStaffOrAdmin,
  noStaffRoleSession,
  staffSession,
} from './roles';

describe('unauthenticated / expired sessions — fail closed', () => {
  it('UNAUTHENTICATED_SESSION is denied by every check', () => {
    expect(isDeniedByDefault(UNAUTHENTICATED_SESSION)).toBe(true);
    expect(isAdmin(UNAUTHENTICATED_SESSION)).toBe(false);
    expect(isShopStaffOrAdmin(UNAUTHENTICATED_SESSION)).toBe(false);
    expect(canExecuteRefund(UNAUTHENTICATED_SESSION)).toBe(false);
    expect(hasAnyRole(UNAUTHENTICATED_SESSION, STAFF_ROLES)).toBe(false);
  });

  it('EXPIRED_SESSION is denied by every check', () => {
    expect(isDeniedByDefault(EXPIRED_SESSION)).toBe(true);
    expect(isAdmin(EXPIRED_SESSION)).toBe(false);
    expect(isShopStaffOrAdmin(EXPIRED_SESSION)).toBe(false);
    expect(canExecuteRefund(EXPIRED_SESSION)).toBe(false);
  });
});

describe('authenticated racer with no staff role — never treated as staff', () => {
  it('noStaffRoleSession() is denied by every check despite having a real userId', () => {
    const session = noStaffRoleSession('racer-user-id');
    expect(session.status).toBe('authenticated_no_staff_role');
    expect(isDeniedByDefault(session)).toBe(true);
    expect(isAdmin(session)).toBe(false);
    expect(isShopStaffOrAdmin(session)).toBe(false);
    expect(canExecuteRefund(session)).toBe(false);
  });

  it('a valid Auth session alone (no roles array) never becomes "staff"', () => {
    const session = staffSession('racer-user-id', []);
    expect(session.status).toBe('authenticated_no_staff_role');
  });

  it('unrecognized role strings are dropped, not trusted — falls back to no-staff-role if nothing valid remains', () => {
    const session = staffSession('user-id', ['owner', 'superadmin', 'root']);
    expect(session.status).toBe('authenticated_no_staff_role');
    expect(session.roles).toEqual([]);
  });

  it('a mix of valid and invalid role strings keeps only the valid ones', () => {
    const session = staffSession('user-id', ['shop_staff', 'owner']);
    expect(session.status).toBe('staff');
    expect(session.roles).toEqual(['shop_staff']);
  });
});

describe('admin', () => {
  it('isAdmin() is true only for a staff session that includes the admin role', () => {
    const admin = staffSession('u1', ['admin']);
    expect(isAdmin(admin)).toBe(true);
  });

  it('isAdmin() is false for a staff session without the admin role', () => {
    const shopStaff = staffSession('u2', ['shop_staff']);
    expect(isAdmin(shopStaff)).toBe(false);
  });
});

describe('shop_staff-or-admin', () => {
  it('succeeds for shop_staff', () => {
    expect(isShopStaffOrAdmin(staffSession('u1', ['shop_staff']))).toBe(true);
  });
  it('succeeds for admin', () => {
    expect(isShopStaffOrAdmin(staffSession('u2', ['admin']))).toBe(true);
  });
  it('fails for every other single role', () => {
    for (const role of ['registration_staff', 'checkin_staff', 'race_marshal', 'viewer'] as const) {
      expect(isShopStaffOrAdmin(staffSession('u3', [role]))).toBe(false);
    }
  });
});

describe('viewer never receives mutation-shaped permission', () => {
  it('viewer fails isAdmin, isShopStaffOrAdmin, and canExecuteRefund', () => {
    const viewer = staffSession('u4', ['viewer']);
    expect(isAdmin(viewer)).toBe(false);
    expect(isShopStaffOrAdmin(viewer)).toBe(false);
    expect(canExecuteRefund(viewer)).toBe(false);
  });
});

describe('refund authorization is admin-only (approved owner decision)', () => {
  it('admin can execute a refund', () => {
    expect(canExecuteRefund(staffSession('u5', ['admin']))).toBe(true);
  });

  it('shop_staff — even though eligible for ordinary payment approval — cannot execute a refund', () => {
    const shopStaff = staffSession('u6', ['shop_staff']);
    expect(isShopStaffOrAdmin(shopStaff)).toBe(true); // eligible for approval-shaped checks
    expect(canExecuteRefund(shopStaff)).toBe(false); // but never refunds
  });

  it('no other single staff role can execute a refund', () => {
    for (const role of ['registration_staff', 'checkin_staff', 'shop_staff', 'race_marshal', 'viewer'] as const) {
      expect(canExecuteRefund(staffSession(`u-${role}`, [role]))).toBe(false);
    }
  });

  it('a multi-role session without admin still cannot execute a refund', () => {
    const session = staffSession('u7', ['shop_staff', 'checkin_staff', 'race_marshal']);
    expect(canExecuteRefund(session)).toBe(false);
  });
});

describe('hasAnyRole', () => {
  it('matches when the session has one of the allowed roles', () => {
    expect(hasAnyRole(staffSession('u8', ['race_marshal']), ['admin', 'race_marshal'])).toBe(true);
  });
  it('does not match a role outside the allowed set', () => {
    expect(hasAnyRole(staffSession('u9', ['viewer']), ['admin', 'race_marshal'])).toBe(false);
  });
  it('never matches a non-staff session regardless of the allowed set', () => {
    expect(hasAnyRole(UNAUTHENTICATED_SESSION, STAFF_ROLES)).toBe(false);
  });
});
