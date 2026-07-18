import { describe, expect, it, vi } from 'vitest';
import { resolveStaffSession } from './resolveStaffSession';

// Minimal fake conforming only to the two calls resolveStaffSession()
// actually makes (auth.getUser(), rpc('current_staff_roles')) — no live
// Supabase project or network access involved anywhere in this file.
// `from` is provided only so a test can assert it is NEVER called (a direct
// `.from('staff_roles')` query would be denied by RLS for every legitimate
// staff account — see resolveStaffSession.ts's header comment).
function fakeClient(opts: {
  getUserResult: { data: { user: { id: string } | null }; error: { message: string } | null };
  rpcResult?: { data: Array<{ role: string }> | null; error: { message: string } | null };
}) {
  // No declared parameters — vi.fn() still records whatever
  // resolveStaffSession() actually passes (asserted via rpc.mock.calls
  // below), regardless of this implementation's own signature.
  const rpc = vi.fn(async () => opts.rpcResult ?? { data: [], error: null });
  const from = vi.fn((table: string) => {
    throw new Error(`resolveStaffSession must never query tables directly — unexpected .from('${table}') call`);
  });
  return {
    auth: {
      getUser: async () => opts.getUserResult,
    },
    rpc,
    from,
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

  it('never calls the current_staff_roles RPC when there is no authenticated user', async () => {
    const client = fakeClient({ getUserResult: { data: { user: null }, error: null } });
    await resolveStaffSession(client);
    expect(client.rpc).not.toHaveBeenCalled();
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

describe('resolveStaffSession — authenticated racer with no staff role (fail closed)', () => {
  it('resolves to authenticated_no_staff_role on a genuine zero-row RPC result', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: { id: 'racer-1' } }, error: null },
      rpcResult: { data: [], error: null },
    });
    const session = await resolveStaffSession(client);
    expect(session.status).toBe('authenticated_no_staff_role');
    expect(session.userId).toBe('racer-1');
  });

  it('resolves to authenticated_no_staff_role — not staff — when the RPC itself errors (e.g. function not migrated yet)', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: { id: 'racer-2' } }, error: null },
      rpcResult: { data: null, error: { message: 'function current_staff_roles() does not exist' } },
    });
    const session = await resolveStaffSession(client);
    expect(session.status).toBe('authenticated_no_staff_role');
  });

  it('resolves to authenticated_no_staff_role when data is null with no reported error', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: { id: 'racer-3' } }, error: null },
      rpcResult: { data: null, error: null },
    });
    const session = await resolveStaffSession(client);
    expect(session.status).toBe('authenticated_no_staff_role');
  });
});

describe('resolveStaffSession — staff', () => {
  it('resolves to staff with the admin role for a real RPC row', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: { id: 'staff-1' } }, error: null },
      rpcResult: { data: [{ role: 'admin' }], error: null },
    });
    const session = await resolveStaffSession(client);
    expect(session.status).toBe('staff');
    expect(session.roles).toEqual(['admin']);
  });

  it('resolves to staff with multiple roles when the account holds more than one', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: { id: 'staff-2' } }, error: null },
      rpcResult: { data: [{ role: 'shop_staff' }, { role: 'checkin_staff' }], error: null },
    });
    const session = await resolveStaffSession(client);
    expect(session.status).toBe('staff');
    expect(session.roles).toEqual(['shop_staff', 'checkin_staff']);
  });

  it('never trusts a role string outside the known enum, even if it somehow appears in a row', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: { id: 'staff-3' } }, error: null },
      rpcResult: { data: [{ role: 'owner' }], error: null },
    });
    const session = await resolveStaffSession(client);
    // 'owner' is not a real staff_role value (see roles.ts) — dropped, so
    // this account resolves to no-staff-role rather than a fabricated role.
    expect(session.status).toBe('authenticated_no_staff_role');
  });
});

describe('resolveStaffSession — RPC call shape (RLS-compatibility fix)', () => {
  it('calls the current_staff_roles RPC by name', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: { id: 'staff-4' } }, error: null },
      rpcResult: { data: [{ role: 'admin' }], error: null },
    });
    await resolveStaffSession(client);
    expect(client.rpc).toHaveBeenCalledWith('current_staff_roles');
  });

  it('never supplies a user id (or any argument at all) to the RPC — current_staff_roles() takes none', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: { id: 'staff-5' } }, error: null },
      rpcResult: { data: [{ role: 'admin' }], error: null },
    });
    await resolveStaffSession(client);
    const call = client.rpc.mock.calls[0];
    // Exactly one argument was passed to client.rpc(): the function name.
    // No second (params) argument — in particular, never the authenticated
    // user's id.
    expect(call).toHaveLength(1);
    expect(call[0]).toBe('current_staff_roles');
  });

  it('never calls .from(\'staff_roles\') directly, for any outcome', async () => {
    const client = fakeClient({
      getUserResult: { data: { user: { id: 'staff-6' } }, error: null },
      rpcResult: { data: [{ role: 'admin' }], error: null },
    });
    await resolveStaffSession(client);
    expect(client.from).not.toHaveBeenCalled();
  });
});
