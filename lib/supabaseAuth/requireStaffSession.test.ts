// requireStaffSession() unit tests — both createSupabaseServerClient() and
// resolveStaffSession() are mocked, so this file never touches cookies(),
// next/headers, or a live Supabase project.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { requireStaffSession } from './requireStaffSession';
import {
  EXPIRED_SESSION,
  UNAUTHENTICATED_SESSION,
  noStaffRoleSession,
  staffSession,
  type StaffSession,
} from './roles';

vi.mock('./serverClient', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ fake: 'client' })),
}));

let mockedSession: StaffSession = UNAUTHENTICATED_SESSION;
vi.mock('./resolveStaffSession', () => ({
  resolveStaffSession: vi.fn(async () => mockedSession),
}));

beforeEach(() => {
  mockedSession = UNAUTHENTICATED_SESSION;
});

describe('requireStaffSession — fail-closed pass-through for non-staff statuses', () => {
  it('returns unauthenticated as-is', async () => {
    mockedSession = UNAUTHENTICATED_SESSION;
    const result = await requireStaffSession();
    expect(result.status).toBe('unauthenticated');
  });

  it('returns expired as-is', async () => {
    mockedSession = EXPIRED_SESSION;
    const result = await requireStaffSession();
    expect(result.status).toBe('expired');
  });

  it('returns authenticated_no_staff_role as-is', async () => {
    mockedSession = noStaffRoleSession('racer-1');
    const result = await requireStaffSession();
    expect(result.status).toBe('authenticated_no_staff_role');
  });
});

describe('requireStaffSession — no allowedRoles argument', () => {
  it('returns any staff session unchanged', async () => {
    mockedSession = staffSession('u1', ['viewer']);
    const result = await requireStaffSession();
    expect(result.status).toBe('staff');
    expect(result.roles).toEqual(['viewer']);
  });
});

describe('requireStaffSession — with an allowedRoles argument', () => {
  it('returns the staff session unchanged when it holds an allowed role', async () => {
    mockedSession = staffSession('u2', ['admin']);
    const result = await requireStaffSession(['admin', 'shop_staff']);
    expect(result.status).toBe('staff');
  });

  it('returns the staff session unchanged when it holds at least one of several allowed roles', async () => {
    mockedSession = staffSession('u3', ['shop_staff', 'checkin_staff']);
    const result = await requireStaffSession(['admin', 'shop_staff']);
    expect(result.status).toBe('staff');
  });

  it('denies (collapses to authenticated_no_staff_role) a real staff account with no allowed role', async () => {
    mockedSession = staffSession('u4', ['viewer']);
    const result = await requireStaffSession(['admin']);
    expect(result.status).toBe('authenticated_no_staff_role');
    expect(result.userId).toBe('u4');
  });

  it('does not upgrade unauthenticated/expired/no-staff-role just because allowedRoles was passed', async () => {
    mockedSession = EXPIRED_SESSION;
    const result = await requireStaffSession(['admin']);
    expect(result.status).toBe('expired');
  });

  it('an empty allowedRoles array is treated as "no restriction", not "deny everyone"', async () => {
    mockedSession = staffSession('u5', ['viewer']);
    const result = await requireStaffSession([]);
    expect(result.status).toBe('staff');
  });
});

describe('requireStaffSession — never trusts anything except the server-derived session', () => {
  it('the only inputs are the mocked server client and resolveStaffSession result — no role or identity is read from any browser-supplied argument', async () => {
    mockedSession = staffSession('server-derived-id', ['admin']);
    // requireStaffSession() takes no user/session/role argument at all other
    // than the allow-list of roles this specific call site requires — there
    // is no parameter through which a caller could inject a fabricated
    // identity or role.
    const result = await requireStaffSession(['admin']);
    expect(result.userId).toBe('server-derived-id');
  });
});
