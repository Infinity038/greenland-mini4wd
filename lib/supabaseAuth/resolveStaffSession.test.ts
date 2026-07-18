import { describe, expect, it } from 'vitest';
import { resolveStaffSession } from './resolveStaffSession';

// Minimal fake conforming only to the two calls resolveStaffSession()
// actually makes (auth.getUser(), from('staff_roles').select('role').eq(...))
// — no live Supabase project or network access involved anywhere in this
// file.
function fakeClient(opts: {
  getUserResult: { data: { user: { id: string } | null }; error: { message: string } | null };
  roleRowsResult?: { data: Array<{ role: string }> | null; error: { message: string } | null };
}) {
  return {
    auth: {
      getUser: async () => opts.getUserResult,
    },
    from: (table: string) => {
      if (table !== 'staff_roles') throw new Error(`unexpected table in test fake: ${table}`);
      return {
        select: () => ({
          eq: async () => opts.roleRowsResult ?? { data: [], error: null },
        }),
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('resolveStaffSession — unauthenticated', () => {
  it('resolves to unauthenticated when getUser() returns no user and no error', async () => {
    const client = fakeClient({ getUserResult: { data: { user: null }, error: null } });
    const session = await resolveStaffSession(client);
    expect(session.status).toBe('unauthenticated');
  });

  it('resolves to unauthenticated for a generic getUser() error unrelated to expiry', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: null }, error: { message: 'network error' } },
    });
    const session = await resolveStaffSession(client);
    expect(session.status).toBe('unauthenticated');
  });
});

describe('resolveStaffSession — expired/invalid session', () => {
  it('resolves to expired when getUser() reports an expired token', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: null }, error: { message: 'JWT expired' } },
    });
    const session = await resolveStaffSession(client);
    expect(session.status).toBe('expired');
  });

  it('resolves to expired when getUser() reports an invalid token', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: null }, error: { message: 'invalid JWT signature' } },
    });
    const session = await resolveStaffSession(client);
    expect(session.status).toBe('expired');
  });
});

describe('resolveStaffSession — authenticated racer with no staff_roles row (fail closed)', () => {
  it('resolves to authenticated_no_staff_role on a genuine zero-row result', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: { id: 'racer-1' } }, error: null },
      roleRowsResult: { data: [], error: null },
    });
    const session = await resolveStaffSession(client);
    expect(session.status).toBe('authenticated_no_staff_role');
    expect(session.userId).toBe('racer-1');
  });

  it('resolves to authenticated_no_staff_role — not staff — when the staff_roles query itself errors (e.g. table not migrated yet)', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: { id: 'racer-2' } }, error: null },
      roleRowsResult: { data: null, error: { message: 'relation "staff_roles" does not exist' } },
    });
    const session = await resolveStaffSession(client);
    expect(session.status).toBe('authenticated_no_staff_role');
  });

  it('resolves to authenticated_no_staff_role when data is null with no reported error', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: { id: 'racer-3' } }, error: null },
      roleRowsResult: { data: null, error: null },
    });
    const session = await resolveStaffSession(client);
    expect(session.status).toBe('authenticated_no_staff_role');
  });
});

describe('resolveStaffSession — staff', () => {
  it('resolves to staff with the admin role for a real staff_roles row', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: { id: 'staff-1' } }, error: null },
      roleRowsResult: { data: [{ role: 'admin' }], error: null },
    });
    const session = await resolveStaffSession(client);
    expect(session.status).toBe('staff');
    expect(session.roles).toEqual(['admin']);
  });

  it('resolves to staff with multiple roles when the account holds more than one', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: { id: 'staff-2' } }, error: null },
      roleRowsResult: { data: [{ role: 'shop_staff' }, { role: 'checkin_staff' }], error: null },
    });
    const session = await resolveStaffSession(client);
    expect(session.status).toBe('staff');
    expect(session.roles).toEqual(['shop_staff', 'checkin_staff']);
  });

  it('never trusts a role string outside the known enum, even if it somehow appears in a row', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: { id: 'staff-3' } }, error: null },
      roleRowsResult: { data: [{ role: 'owner' }], error: null },
    });
    const session = await resolveStaffSession(client);
    // 'owner' is not a real staff_role value (see roles.ts) — dropped, so
    // this account resolves to no-staff-role rather than a fabricated role.
    expect(session.status).toBe('authenticated_no_staff_role');
  });
});
