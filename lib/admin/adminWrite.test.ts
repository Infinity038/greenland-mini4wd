import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { validateWrite, WRITE_RULES } from './writePolicy';
import { handleAdminWrite } from './adminWriteHandler';

describe('validateWrite (policy)', () => {
  const ok = (r: unknown) => expect(validateWrite(r).ok).toBe(true);
  const no = (r: unknown) => expect(validateWrite(r).ok).toBe(false);

  it('accepts the exact shapes the seven admin pages use', () => {
    ok({ table: 'cars', op: 'update', values: { status: 'approved' }, match: { id: 'c1' } });
    ok({ table: 'cars', op: 'delete', match: { id: 'c1' } });
    ok({ table: 'members', op: 'update', values: { weekly_loyalty_progress: 3 }, match: { email: 'a@b.c' } });
    ok({ table: 'seasons', op: 'update', values: { is_active: false }, neq: { id: 's1' } });
    ok({ table: 'seasons', op: 'insert', values: { name: 'S', start_date: '2026-01-01', end_date: '2026-12-31', is_active: false } });
    ok({ table: 'admin_config', op: 'upsert', values: { key: 'earlybird_slots', value: '5' }, onConflict: 'key' });
  });
  it('refuses unknown tables, ops and columns (not stripped: rejected)', () => {
    no({ table: 'staff_roles', op: 'insert', values: { role: 'admin' } });
    no({ table: 'members', op: 'delete', match: { id: 'm' } });
    no({ table: 'members', op: 'update', values: { password_hash: 'x' }, match: { id: 'm' } });
    no({ table: 'members', op: 'update', values: { loyalty_tier: 'x', name: 'y' }, match: { id: 'm' } }); // two rules' columns mixed
    no({ table: 'cars', op: 'update', values: { status: 'approved', owner_id: 'z' }, match: { id: 'c' } });
    no({ table: 'orders', op: 'truncate' });
  });
  it('requires a filter: no mass update or delete', () => {
    no({ table: 'cars', op: 'delete' });
    no({ table: 'cars', op: 'delete', match: {} });
    no({ table: 'cars', op: 'update', values: { status: 'approved' } });
    no({ table: 'race_results', op: 'delete', neq: { id: 'x' } });
  });
  it('rejects wrong filter columns and filter smuggling', () => {
    no({ table: 'cars', op: 'update', values: { status: 'a' }, match: { status: 'pending' } });
    no({ table: 'cars', op: 'update', values: { status: 'a' }, match: { id: { $ne: 1 } } });
    no({ table: 'cars', op: 'update', values: { status: 'a' }, match: { id: 'x' }, neq: { id: 'y' } });
    no({ table: 'race_results', op: 'insert', values: { season_id: 's' }, match: { id: 'x' } });
  });
  it('constrains admin_config keys and seasons.is_active on insert', () => {
    no({ table: 'admin_config', op: 'upsert', values: { key: 'owner_email', value: 'x' }, onConflict: 'key' });
    no({ table: 'admin_config', op: 'upsert', values: { key: 'earlybird_slots', value: '1' }, onConflict: 'id' });
    no({ table: 'seasons', op: 'insert', values: { name: 'S', start_date: 'a', end_date: 'b', is_active: true } });
  });
  it('rejects non-scalar, non-finite and oversized values; non-plain bodies', () => {
    no({ table: 'cars', op: 'update', values: { notes: { a: 1 } }, match: { id: 'c' } });
    no({ table: 'cars', op: 'update', values: { notes: 'x'.repeat(4001) }, match: { id: 'c' } });
    no({ table: 'race_results', op: 'insert', values: { wins: Infinity } });
    no(null); no([]); no('x'); no({ table: 5, op: 'insert' });
  });
  it('every rule grants admin or a named staff role, and no rule has an empty role list', () => {
    for (const r of WRITE_RULES) expect(r.roles.length).toBeGreaterThan(0);
  });
});

type Chain = { eq: ReturnType<typeof vi.fn>; neq: ReturnType<typeof vi.fn>; then: (f: (v: unknown) => unknown) => unknown };
function client(opts: { user?: { id: string } | null; roles?: string[] | null; dbError?: { message: string; code?: string } | null }) {
  const calls: { fn: string; args: unknown[] }[] = [];
  const chain = (): Chain => {
    const c: any = {
      eq: vi.fn((...a: unknown[]) => { calls.push({ fn: 'eq', args: a }); return c; }),
      neq: vi.fn((...a: unknown[]) => { calls.push({ fn: 'neq', args: a }); return c; }),
      then: (f: (v: unknown) => unknown) => Promise.resolve({ error: opts.dbError ?? null }).then(f),
    };
    return c;
  };
  const from = vi.fn((t: string) => ({
    insert: (v: unknown) => { calls.push({ fn: `${t}.insert`, args: [v] }); return chain(); },
    upsert: (v: unknown, o: unknown) => { calls.push({ fn: `${t}.upsert`, args: [v, o] }); return chain(); },
    update: (v: unknown) => { calls.push({ fn: `${t}.update`, args: [v] }); return chain(); },
    delete: () => { calls.push({ fn: `${t}.delete`, args: [] }); return chain(); },
  }));
  const c = {
    auth: { getUser: async () => ({ data: { user: opts.user ?? null }, error: opts.user ? null : { message: 'no session' } }) },
    rpc: async (n: string) => (n === 'current_staff_roles' ? { data: (opts.roles ?? []).map(role => ({ role })), error: null } : { data: null, error: { message: 'x' } }),
    from,
  } as unknown as SupabaseClient;
  return { c, calls, from };
}
const post = (body: unknown, h: Record<string, string> = {}) =>
  new Request('https://club.example/api/admin/write', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://club.example', ...h }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const carBody = { table: 'cars', op: 'update', values: { status: 'approved' }, match: { id: 'c1' } };

describe('handleAdminWrite', () => {
  it('anonymous -> 401 and the database is never touched', async () => {
    const k = client({ user: null });
    expect((await handleAdminWrite(post(carBody), { getClient: async () => k.c })).status).toBe(401);
    expect(k.from).not.toHaveBeenCalled();
  });
  it('signed-in user with no staff role -> 403', async () => {
    const k = client({ user: { id: 'u' }, roles: [] });
    expect((await handleAdminWrite(post(carBody), { getClient: async () => k.c })).status).toBe(403);
    expect(k.from).not.toHaveBeenCalled();
  });
  it('wrong staff role for this rule -> 403 (shop_staff cannot approve cars)', async () => {
    const k = client({ user: { id: 'u' }, roles: ['shop_staff'] });
    expect((await handleAdminWrite(post(carBody), { getClient: async () => k.c })).status).toBe(403);
    expect(k.from).not.toHaveBeenCalled();
  });
  it('permitted role executes exactly the validated write with its filter', async () => {
    const k = client({ user: { id: 'u' }, roles: ['registration_staff'] });
    const res = await handleAdminWrite(post(carBody), { getClient: async () => k.c });
    expect(res.status).toBe(200);
    expect(k.calls).toEqual([{ fn: 'cars.update', args: [{ status: 'approved' }] }, { fn: 'eq', args: ['id', 'c1'] }]);
  });
  it('season deactivate uses neq; admin_config upsert passes onConflict', async () => {
    const k = client({ user: { id: 'a' }, roles: ['admin'] });
    await handleAdminWrite(post({ table: 'seasons', op: 'update', values: { is_active: false }, neq: { id: 's2' } }), { getClient: async () => k.c });
    await handleAdminWrite(post({ table: 'admin_config', op: 'upsert', values: { key: 'earlybird_slots', value: '9' }, onConflict: 'key' }), { getClient: async () => k.c });
    expect(k.calls).toContainEqual({ fn: 'neq', args: ['id', 's2'] });
    expect(k.calls).toContainEqual({ fn: 'admin_config.upsert', args: [{ key: 'earlybird_slots', value: '9' }, { onConflict: 'key' }] });
  });
  it('policy violations are 400 before any session or DB work', async () => {
    const k = client({ user: { id: 'a' }, roles: ['admin'] });
    for (const b of [{ table: 'staff_roles', op: 'insert', values: { role: 'admin' } }, { table: 'cars', op: 'delete' }]) {
      expect((await handleAdminWrite(post(b), { getClient: async () => k.c })).status).toBe(400);
    }
    expect(k.from).not.toHaveBeenCalled();
  });
  it('rejects cross-origin, missing Origin, wrong content type, bad JSON, oversize, wrong method', async () => {
    const k = client({ user: { id: 'a' }, roles: ['admin'] }); const d = { getClient: async () => k.c };
    expect((await handleAdminWrite(post(carBody, { origin: 'https://evil.example' }), d)).status).toBe(403);
    const noOrigin = new Request('https://club.example/api/admin/write', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(carBody) });
    expect((await handleAdminWrite(noOrigin, d)).status).toBe(403);
    expect((await handleAdminWrite(post(carBody, { 'content-type': 'text/plain' }), d)).status).toBe(415);
    expect((await handleAdminWrite(post('{nope'), d)).status).toBe(400);
    expect((await handleAdminWrite(post(JSON.stringify({ table: 'cars', pad: 'x'.repeat(2_100_000) })), d)).status).toBe(413);
    expect((await handleAdminWrite(new Request('https://club.example/api/admin/write', { method: 'GET' }), d)).status).toBe(405);
    expect(k.from).not.toHaveBeenCalled();
  });
  it('database errors surface as 409 with a bounded message, never a stack', async () => {
    const k = client({ user: { id: 'a' }, roles: ['admin'], dbError: { message: 'denied by policy', code: '42501' } });
    const res = await handleAdminWrite(post(carBody), { getClient: async () => k.c });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'write failed', code: '42501', message: 'denied by policy' });
  });
});

describe('the seven formerly-anonymous admin pages', () => {
  const pages = ['cars', 'hall-of-fame', 'orders', 'profile-requests', 'race-results', 'seasons', 'tickets'];
  it.each(pages)('%s no longer writes with the browser anon client and uses adminWrite', page => {
    const src = fs.readFileSync(path.join(process.cwd(), 'app/admin', page, 'page.tsx'), 'utf8');
    expect(src).not.toMatch(/supabase\s*\.from\([^)]*\)\s*\.(insert|update|delete|upsert)\(/);
    expect(src).not.toMatch(/supabase\s*\.from\([^)]*\)\s*\.(insert|update|delete|upsert)\b/);
    expect(src).toContain('adminWrite(');
  });
});
