import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handleAdminWrite } from './adminWriteHandler';
import { validateWrite, WRITE_RULES, type WriteRule } from './writePolicy';
import { STAFF_ROLES } from '@/lib/supabaseAuth/roles';

/** Mock Supabase client: the ONLY source of identity is `user`/`roles`, exactly like the real server client's cookie session. */
function mock(opts: { user: { id: string } | null; roles?: string[]; playerAllowed?: boolean }) {
  const touched: string[] = [];
  const chain: any = { eq: () => chain, neq: () => chain, then: (f: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(f) };
  const from = vi.fn((t: string) => ({
    insert: () => { touched.push(`${t}.insert`); return chain; }, upsert: () => { touched.push(`${t}.upsert`); return chain; },
    update: () => { touched.push(`${t}.update`); return chain; }, delete: () => { touched.push(`${t}.delete`); return chain; },
  }));
  const client = {
    auth: { getUser: async () => ({ data: { user: opts.user }, error: opts.user ? null : { message: 'no session' } }) },
    rpc: async (n: string) =>
      n === 'current_staff_roles' ? { data: (opts.roles ?? []).map(role => ({ role })), error: null }
      : n === 'prediction_pit_allowed' ? { data: opts.playerAllowed ?? false, error: null }
      : { data: null, error: { message: 'unexpected rpc' } },
    from,
  } as unknown as SupabaseClient;
  return { client, touched, from };
}
const post = (body: unknown, headers: Record<string, string> = {}, url = 'https://club.example/api/admin/write') =>
  new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://club.example', ...headers }, body: JSON.stringify(body) });

// A valid sample value for every column any rule writes.
const SAMPLE: Record<string, string | number | boolean | null | string[]> = {
  status: 'approved', notes: 'n', member_id: 'm1', member_name: 'N', record_value: 1.5, record_label: 'lbl', achieved_at: '2026-01-01',
  previous_record_value: 1, previous_holder_name: 'p', previous_achieved_at: '2026-01-01T00:00:00Z', category: 'c',
  held_from: '2026-01-01T00:00:00Z', held_until: '2026-02-01T00:00:00Z', loyalty_tier: 'member', name: 'N', avatar_url: 'https://x.example/a.png',
  season_loyalty_progress: 3, weekly_loyalty_progress: 3, payment_status: 'cancelled', points_awarded: 5, membership_days_awarded: 2.5,
  rewards_applied: true, spend_amount_dkk: 100, reviewed_at: '2026-01-01T00:00:00.000Z', season_id: 's1', race_category: 'c', race_date: '2026-01-01',
  position: 1, lap_time_seconds: 1.2, qualifying_time_1: 1.2, qualifying_time_2: 1.3, round_2_result: null, wins: 0, points_earned: 5,
  start_date: '2026-01-01', end_date: '2026-12-31', is_active: false, key: 'earlybird_slots', value: '5',
  title: 'T', summary: 's', body: 'b', image_url: 'https://x.example/i.png', published: true, tournament_id: 't1', created_at: '2026-01-01T00:00:00Z', caption: 'c',
  item_no: 'A1', subcategory: 'Motors', chassis: 'AR', type: 'boxed', description: 'd', available: true, is_collectors_vault: false,
  unbuilt_stock: 1, built_stock: 1, price_dkk: 10, original_price_dkk: 12, stock_qty: 3,
  unbuilt_price_dkk: 1, unbuilt_original_price_dkk: 1, unbuilt_case_price_dkk: 1, unbuilt_case_original_price_dkk: 1,
  built_price_dkk: 1, built_original_price_dkk: 1, built_case_price_dkk: 1, built_case_original_price_dkk: 1,
  date: '2026-11-01T10:00', case_stock: 10, member_status: 'official', location: 'Hall', race_categories: ['Box Stock'], ticket_type: 'weekly', ticket_price_dkk: 150, max_participants: 16,
};
/** Columns whose valid value depends on the table. */
const OVERRIDE: Record<string, string | number | boolean | null | string[]> = {
  'preorders.status': 'fulfilled', 'tournaments.status': 'upcoming', 'products.status': 'in stock', 'products.category': 'cars',
  'news_posts.category': 'News', 'gallery_items.category': 'race day', 'orders.payment_status': 'completed', 'race_tickets.payment_status': 'cancelled',
};
function requestFor(rule: WriteRule) {
  const values = Object.fromEntries(rule.columns.map(c => [c, `${rule.table}.${c}` in OVERRIDE ? OVERRIDE[`${rule.table}.${c}`] : SAMPLE[c]]));
  const r: Record<string, unknown> = { table: rule.table, op: rule.op };
  if (rule.columns.length) r.values = values;
  if (rule.op === 'update' || rule.op === 'delete') r.match = { [rule.match[0]]: 'id1' };
  if (rule.op === 'upsert') r.onConflict = rule.onConflict;
  return r;
}
const label = (r: WriteRule) => `${r.table}.${r.op}[${r.columns.join(',')}]`;

describe('policy sanity', () => {
  it('every rule has a valid sample request that the policy itself accepts', () => {
    for (const r of WRITE_RULES) expect(validateWrite(requestFor(r)), label(r)).toMatchObject({ ok: true });
  });
  it('the read-only `viewer` role is never granted any write, and the owner role `admin` can do everything', () => {
    for (const r of WRITE_RULES) { expect(r.roles, label(r)).not.toContain('viewer'); expect(r.roles, label(r)).toContain('admin'); }
  });
  it('no rule can touch staff_roles, password_hash or loyalty_points/points_transactions (separate economies)', () => {
    for (const r of WRITE_RULES) {
      expect(r.table).not.toBe('staff_roles'); expect(r.table).not.toMatch(/loyalty_points|points_transactions|^pp\b|ledger|wallet/);
      expect(r.columns).not.toContain('password_hash'); expect(r.columns).not.toContain('auth_user_id'); expect(r.columns).not.toContain('email');
    }
  });
});

describe('authorization matrix: every rule x every staff role x anonymous', () => {
  for (const rule of WRITE_RULES) {
    it(label(rule), async () => {
      const body = requestFor(rule);
      for (const role of STAFF_ROLES) {
        const m = mock({ user: { id: `u-${role}` }, roles: [role] });
        const res = await handleAdminWrite(post(body), { getClient: async () => m.client });
        const allowed = rule.roles.includes(role);
        expect(res.status, `${label(rule)} as ${role}`).toBe(allowed ? 200 : 403);
        expect(m.touched.length, `${label(rule)} as ${role} db calls`).toBe(allowed ? 1 : 0);
      }
      const anon = mock({ user: null });
      expect((await handleAdminWrite(post(body), { getClient: async () => anon.client })).status).toBe(401);
      expect(anon.from).not.toHaveBeenCalled();
      const noRole = mock({ user: { id: 'player' }, roles: [], playerAllowed: true });  // an allow-listed Prediction Pit PLAYER is not an operator
      expect((await handleAdminWrite(post(body), { getClient: async () => noRole.client })).status).toBe(403);
      expect(noRole.from).not.toHaveBeenCalled();
    });
  }
});

describe('the server never accepts a client-supplied identity or role', () => {
  const carBody = { table: 'cars', op: 'update', values: { status: 'approved' }, match: { id: 'c1' } };
  it('headers, query string and cookies claiming admin are ignored: the session decides', async () => {
    const m = mock({ user: { id: 'u' }, roles: ['shop_staff'] });
    const res = await handleAdminWrite(
      post(carBody, { 'x-user-id': 'admin', 'x-role': 'admin', 'x-staff-role': 'admin', authorization: 'Bearer admin', cookie: 'role=admin; staff=admin' }, 'https://club.example/api/admin/write?role=admin&userId=owner'),
      { getClient: async () => m.client });
    expect(res.status).toBe(403);
    expect(m.touched).toEqual([]);
  });
  it('identity-like body fields are rejected outright, even from an admin', async () => {
    const m = mock({ user: { id: 'a' }, roles: ['admin'] });
    for (const extra of [{ role: 'admin' }, { roles: ['admin'] }, { userId: 'owner' }, { actor: 'owner' }, { user: { id: 'x' } }, { staffRole: 'admin' }]) {
      const res = await handleAdminWrite(post({ ...carBody, ...extra }), { getClient: async () => m.client });
      expect(res.status).toBe(400);
    }
    expect(m.touched).toEqual([]);
  });
  it('a literal __proto__ key (prototype-pollution attempt) at the top level or inside values is refused', async () => {
    const m = mock({ user: { id: 'a' }, roles: ['admin'] });
    for (const raw of [
      '{"__proto__":{"role":"admin"},"table":"cars","op":"update","values":{"status":"approved"},"match":{"id":"c1"}}',
      '{"table":"cars","op":"update","values":{"__proto__":"x","status":"approved"},"match":{"id":"c1"}}',
      '{"table":"cars","op":"update","values":{"status":"approved"},"match":{"__proto__":"c1"}}',
    ]) {
      const res = await handleAdminWrite(new Request('https://club.example/api/admin/write', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://club.example' }, body: raw }), { getClient: async () => m.client });
      expect(res.status).toBe(400);
    }
    expect(({} as Record<string, unknown>).role).toBeUndefined();
    expect(m.touched).toEqual([]);
  });
  it('role and identity columns cannot be written through any rule (privilege escalation paths)', () => {
    for (const bad of [
      { table: 'staff_roles', op: 'insert', values: { user_id: 'u', role: 'admin' } },
      { table: 'members', op: 'update', values: { auth_user_id: 'u' }, match: { id: 'm' } },
      { table: 'members', op: 'update', values: { email: 'x@y.z' }, match: { id: 'm' } },
      { table: 'members', op: 'update', values: { password_hash: 'x' }, match: { id: 'm' } },
      { table: 'members', op: 'update', values: { is_admin: true }, match: { id: 'm' } },
      { table: 'loyalty_points', op: 'upsert', values: { member_id: 'm', points_balance: 1e6 }, onConflict: 'member_id' },
      { table: 'admin_config', op: 'upsert', values: { key: 'owner_email', value: '1' }, onConflict: 'key' },
    ]) expect(validateWrite(bad).ok, JSON.stringify(bad)).toBe(false);
  });
  it('anonymous callers learn nothing about the policy: invalid bodies still answer 401, not 400', async () => {
    const anon = mock({ user: null });
    for (const body of [{ table: 'staff_roles', op: 'insert' }, { nonsense: true }, null]) {
      expect((await handleAdminWrite(post(body), { getClient: async () => anon.client })).status).toBe(401);
    }
  });
});

describe('value constraints: a permitted role still cannot write arbitrary states or amounts', () => {
  const bad: [string, unknown][] = [
    ['cars.status outside the workflow', { table: 'cars', op: 'update', values: { status: 'owned_by_me' }, match: { id: 'c' } }],
    ['orders.payment_status invented', { table: 'orders', op: 'update', values: { payment_status: 'refunded_double' }, match: { id: 'o' } }],
    ['orders.points_awarded: reward fields are no longer writable at all', { table: 'orders', op: 'update', values: { points_awarded: 5 }, match: { id: 'o' } }],
    ['orders.rewards_applied: only the loyalty service may flip it', { table: 'orders', op: 'update', values: { rewards_applied: true }, match: { id: 'o' } }],
    ['orders payment_status + reward field together', { table: 'orders', op: 'update', values: { payment_status: 'completed', points_awarded: 99999 }, match: { id: 'o' } }],
    ['orders.spend_amount_dkk', { table: 'orders', op: 'update', values: { spend_amount_dkk: 1 }, match: { id: 'o' } }],
    ['race_tickets.membership_days_awarded', { table: 'race_tickets', op: 'update', values: { membership_days_awarded: 365 }, match: { id: 't' } }],
    ['gallery image from a non-image scheme', { table: 'gallery_items', op: 'update', values: { image_url: 'javascript:alert(1)' }, match: { id: 'g' } }],
    ['gallery data URL that is not an image', { table: 'gallery_items', op: 'update', values: { image_url: 'data:text/html;base64,PHNjcmlwdD4=' }, match: { id: 'g' } }],
    ['product image over http', { table: 'products', op: 'update', values: { image_url: 'http://x.example/a.jpg' }, match: { id: 'p' } }],
    ['product status invented', { table: 'products', op: 'update', values: { status: 'free' }, match: { id: 'p' } }],
    ['product negative price', { table: 'products', op: 'update', values: { price_dkk: -1 }, match: { id: 'p' } }],
    ['shop_inventory negative stock', { table: 'shop_inventory', op: 'update', values: { case_stock: -1 }, match: { id: 1 } }],
    ['preorder status other than fulfilled', { table: 'preorders', op: 'update', values: { status: 'paid' }, match: { id: 'p' } }],
    ['member_status invented', { table: 'members', op: 'update', values: { member_status: 'owner' }, match: { id: 'm' } }],
    ['tournament status invented', { table: 'tournaments', op: 'update', values: { status: 'free_entry' }, match: { id: 't' } }],
    ['tournament race_categories as a string', { table: 'tournaments', op: 'update', values: { race_categories: 'Box Stock' }, match: { id: 't' } }],
    ['tournament race_categories with 13 entries', { table: 'tournaments', op: 'update', values: { race_categories: Array.from({ length: 13 }, (_, i) => `c${i}`) }, match: { id: 't' } }],
    ['tournament negative price', { table: 'tournaments', op: 'update', values: { ticket_price_dkk: -5 }, match: { id: 't' } }],
    ['returning flag on a non-returning insert', { table: 'race_results', op: 'insert', values: { ...SAMPLE_RESULT() }, returning: true }],
    ['news category too long', { table: 'news_posts', op: 'update', values: { category: 'x'.repeat(61) }, match: { id: 'n' } }],
    ['news body beyond 20000 characters', { table: 'news_posts', op: 'update', values: { body: 'x'.repeat(20001) }, match: { id: 'n' } }],
    ['tickets status not offered by the page', { table: 'race_tickets', op: 'update', values: { payment_status: 'completed' }, match: { id: 't' } }],
    ['members.loyalty_tier invented', { table: 'members', op: 'update', values: { loyalty_tier: 'platinum_god' }, match: { id: 'm' } }],
    ['members progress out of 0..9', { table: 'members', op: 'update', values: { weekly_loyalty_progress: 10 }, match: { email: 'a@b.c' } }],
    ['avatar_url javascript:', { table: 'members', op: 'update', values: { avatar_url: 'javascript:alert(1)' }, match: { id: 'm' } }],
    ['avatar_url http (not https)', { table: 'members', op: 'update', values: { avatar_url: 'http://x.example/a.png' }, match: { id: 'm' } }],
    ['profile request status pending', { table: 'profile_edit_requests', op: 'update', values: { status: 'pending' }, match: { id: 'r' } }],
    ['admin_config value not a number', { table: 'admin_config', op: 'upsert', values: { key: 'earlybird_slots', value: 'abc' }, onConflict: 'key' }],
    ['race result position 0', { table: 'race_results', op: 'insert', values: { ...SAMPLE_RESULT(), position: 0 } }],
    ['race result wins fractional', { table: 'race_results', op: 'insert', values: { ...SAMPLE_RESULT(), wins: 1.5 } }],
    ['race result bad date', { table: 'race_results', op: 'insert', values: { ...SAMPLE_RESULT(), race_date: 'yesterday' } }],
    ['race result missing required column', { table: 'race_results', op: 'insert', values: (({ season_id, ...rest }) => rest)(SAMPLE_RESULT()) }],
    ['season created already active', { table: 'seasons', op: 'insert', values: { name: 'S', start_date: '2026-01-01', end_date: '2026-12-31', is_active: true } }],
    ['hall of fame record negative', { table: 'hall_of_fame', op: 'update', values: { record_value: -1 }, match: { id: 'h' } }],
  ];
  function SAMPLE_RESULT() {
    return { season_id: 's1', race_category: 'c', member_id: 'm1', member_name: 'N', race_date: '2026-01-01', position: 1, lap_time_seconds: 1.2, qualifying_time_1: 1.2, qualifying_time_2: 1.3, round_2_result: null, wins: 0, points_earned: 5, notes: '' };
  }
  it.each(bad)('%s is refused', (_n, body) => { expect(validateWrite(body).ok).toBe(false); });
  it('and through the handler an authorised admin gets 400 and the database is never touched', async () => {
    const m = mock({ user: { id: 'a' }, roles: ['admin'] });
    for (const [, body] of bad) expect((await handleAdminWrite(post(body), { getClient: async () => m.client })).status).toBe(400);
    expect(m.touched).toEqual([]);
  });
  it('what the pages really send still passes (regression on the real shapes, incl. fractional membership days)', () => {
    const ok = [
      { table: 'orders', op: 'update', values: { payment_status: 'payment_confirmed' }, match: { id: 'o1' } },
      { table: 'orders', op: 'update', values: { payment_status: 'cancelled' }, match: { id: 'o1' } },
      { table: 'tournaments', op: 'insert', values: { name: 'Race', date: '2026-11-01T10:00', location: 'Hall', race_categories: ['Box Stock', 'Open'], ticket_type: 'weekly', ticket_price_dkk: 150, max_participants: 16, status: 'upcoming', description: '', image_url: '' }, returning: true },
      { table: 'gallery_items', op: 'insert', values: { title: '', caption: '', image_url: 'data:image/png;base64,iVBORw0KGgo=', category: 'race day', created_at: '2026-01-01T00:00:00.000Z' } },
      { table: 'products', op: 'update', values: { image_url: 'https://a.example/1.jpg,https://a.example/2.jpg', price_dkk: 99, status: 'sold out' }, match: { id: 'p1' } },
      { table: 'race_results', op: 'insert', values: SAMPLE_RESULT() },
      { table: 'hall_of_fame', op: 'update', values: { member_id: null, member_name: '', record_value: 12.34, record_label: '', achieved_at: '2026-01-01', previous_record_value: 10, previous_holder_name: null, previous_achieved_at: '2025-12-31T10:00:00+00:00' }, match: { id: 'h' } },
      { table: 'seasons', op: 'update', values: { is_active: false }, neq: { id: 's' } },
    ];
    for (const b of ok) expect(validateWrite(b), JSON.stringify(b)).toMatchObject({ ok: true });
  });
});
