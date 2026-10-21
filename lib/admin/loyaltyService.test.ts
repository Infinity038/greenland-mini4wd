import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FakeDb } from './fakeSupabase';
import { adjustPoints, awardForSource, clawbackForSource, extractSpendFromNotes, LoyaltyError } from './loyaltyService';
import { checkRecord } from './hallOfFameService';
import { handleHallOfFame, handleLoyalty } from './loyaltyHandlers';

/** Synthetic data only. */
function world() {
  const db = new FakeDb();
  db.unique = { loyalty_points: ['member_id'] };
  db.seed('members', [
    { id: 'm1', email: 'ann@example.invalid', first_name: 'Ann', last_name: 'A', lifetime_spending: 0, total_points: 0, membership_expires_at: null },
    { id: 'm2', email: 'bo@example.invalid', first_name: 'Bo', last_name: 'B', lifetime_spending: 50, total_points: 0, membership_expires_at: null },
  ]);
  db.seed('orders', [
    { id: 'o1', member_email: 'ann@example.invalid', notes: 'Full Payment: 250 DKK', payment_status: 'payment_confirmed', rewards_applied: false },
    { id: 'o2', member_email: 'ann@example.invalid', notes: 'Price: 100 DKK', payment_status: 'awaiting_payment', rewards_applied: false },
    { id: 'o3', email: 'bo@example.invalid', notes: 'Deposit: 40 DKK (Remaining: 60 DKK', payment_status: 'completed', rewards_applied: null },
  ]);
  db.seed('race_tickets', [{ id: 't1', member_email: 'bo@example.invalid', total_price: 300, payment_status: 'payment_confirmed', rewards_applied: false }]);
  db.seed('loyalty_points', []); db.seed('points_transactions', []);
  return { db, client: db.client() as SupabaseClient };
}
const code = async (p: Promise<unknown>) => p.then(() => 'ok', e => (e instanceof LoyaltyError ? `${e.status}` : `other:${String(e)}`));

describe('spend parsing', () => {
  it('reads the three note formats and ignores junk', () => {
    expect(extractSpendFromNotes('Full Payment: 250 DKK')).toBe(250);
    expect(extractSpendFromNotes('Deposit: 40 DKK (Remaining: 60 DKK')).toBe(100);
    expect(extractSpendFromNotes('Price: 99.5 DKK')).toBe(99.5);
    expect(extractSpendFromNotes('nothing here')).toBe(0);
    expect(extractSpendFromNotes(undefined)).toBe(0);
  });
});

describe('awardForSource (server-derived, claim-once)', () => {
  it('derives points and days from the stored order, credits the member named on the ORDER, and records the award', async () => {
    const { db, client } = world();
    const r = await awardForSource(client, 'order', 'o1');
    expect(r).toMatchObject({ status: 'awarded', points: 2, days: 12.5 });
    const ann = db.rows('members').find(m => m.id === 'm1')!;
    expect(ann.lifetime_spending).toBe(250); expect(ann.total_points).toBe(2);
    expect(db.rows('members').find(m => m.id === 'm2')!.lifetime_spending).toBe(50);       // other member untouched
    expect(db.rows('loyalty_points')).toHaveLength(1);
    expect(db.rows('loyalty_points')[0]).toMatchObject({ member_id: 'm1', points_balance: 2, total_earned: 2, tier: 'fixed_rewards' });
    expect(db.rows('points_transactions')).toHaveLength(1);
    expect(db.rows('orders').find(o => o.id === 'o1')).toMatchObject({ rewards_applied: true, points_awarded: 2, membership_days_awarded: 12.5, spend_amount_dkk: 250 });
  });
  it('a second request for the same order awards nothing (idempotent)', async () => {
    const { db, client } = world();
    await awardForSource(client, 'order', 'o1');
    expect(await awardForSource(client, 'order', 'o1')).toEqual({ status: 'already_applied' });
    expect(db.rows('loyalty_points')[0].points_balance).toBe(2);
    expect(db.rows('points_transactions')).toHaveLength(1);
  });
  it('10 simultaneous requests award exactly once', async () => {
    const { db, client } = world();
    const results = await Promise.all(Array.from({ length: 10 }, () => awardForSource(client, 'order', 'o1').catch(e => e)));
    expect(results.filter(r => r.status === 'awarded')).toHaveLength(1);
    expect(results.filter(r => r.status === 'already_applied')).toHaveLength(9);
    expect(db.rows('loyalty_points')[0].points_balance).toBe(2);
    expect(db.rows('members').find(m => m.id === 'm1')!.lifetime_spending).toBe(250);
  });
  it('two different payments for the same member at once both count (optimistic concurrency retries)', async () => {
    const { db, client } = world();
    db.rows('orders').push({ id: 'o4', member_email: 'ann@example.invalid', notes: 'Full Payment: 150 DKK', payment_status: 'completed', rewards_applied: false });
    await Promise.all([awardForSource(client, 'order', 'o1'), awardForSource(client, 'order', 'o4')]);
    expect(db.rows('members').find(m => m.id === 'm1')!.lifetime_spending).toBe(400);
    expect(db.rows('loyalty_points')[0].points_balance).toBe(4);
  });
  it('refuses an unpaid order; nothing changes and the flag stays unclaimed', async () => {
    const { db, client } = world();
    expect(await code(awardForSource(client, 'order', 'o2'))).toBe('422');
    expect(db.rows('orders').find(o => o.id === 'o2')!.rewards_applied).toBe(false);
    expect(db.rows('loyalty_points')).toHaveLength(0);
  });
  it('tickets use total_price and require payment_confirmed', async () => {
    const { db, client } = world();
    expect(await awardForSource(client, 'ticket', 't1')).toMatchObject({ status: 'awarded', points: 3 });
    expect(db.rows('members').find(m => m.id === 'm2')!.lifetime_spending).toBe(350);
  });
  it('unknown id -> 404; member missing -> 404 and the claim is rolled back', async () => {
    const { db, client } = world();
    expect(await code(awardForSource(client, 'order', 'nope'))).toBe('404');
    db.rows('orders').push({ id: 'o9', member_email: 'ghost@example.invalid', notes: 'Price: 100 DKK', payment_status: 'completed', rewards_applied: false });
    expect(await code(awardForSource(client, 'order', 'o9'))).toBe('404');
    expect(db.rows('orders').find(o => o.id === 'o9')!.rewards_applied).toBe(false);
  });
  it('a failure part-way undoes everything already done (member, loyalty, claim)', async () => {
    const { db, client } = world();
    db.failOn = (t, op) => (t === 'points_transactions' && op === 'insert' ? 'disk full' : null);
    expect(await code(awardForSource(client, 'order', 'o1'))).toBe('500');
    expect(db.rows('members').find(m => m.id === 'm1')!.lifetime_spending).toBe(0);
    expect(db.rows('loyalty_points')).toHaveLength(0);
    expect(db.rows('orders').find(o => o.id === 'o1')).toMatchObject({ rewards_applied: false });
    db.failOn = () => null;                                                       // and a retry then succeeds exactly once
    expect(await awardForSource(client, 'order', 'o1')).toMatchObject({ status: 'awarded' });
    expect(db.rows('loyalty_points')[0].points_balance).toBe(2);
  });
});

describe('clawbackForSource (uses stored amounts only)', () => {
  it('reverses exactly what was awarded, once', async () => {
    const { db, client } = world();
    await awardForSource(client, 'order', 'o1');
    expect(await clawbackForSource(client, 'order', 'o1')).toMatchObject({ status: 'clawed_back', points: 2 });
    expect(db.rows('members').find(m => m.id === 'm1')).toMatchObject({ lifetime_spending: 0, total_points: 0 });
    expect(db.rows('loyalty_points')[0]).toMatchObject({ points_balance: 0, total_earned: 0 });
    expect(db.rows('orders').find(o => o.id === 'o1')!.rewards_applied).toBe(false);
    expect(await clawbackForSource(client, 'order', 'o1')).toEqual({ status: 'not_applied' });
    expect(db.rows('loyalty_points')[0].points_balance).toBe(0);                     // never negative, never double-reversed
  });
  it('does nothing for an order that never received rewards', async () => {
    const { db, client } = world();
    expect(await clawbackForSource(client, 'order', 'o1')).toEqual({ status: 'not_applied' });
    expect(db.rows('points_transactions')).toHaveLength(0);
  });
  it('award -> clawback -> award again works (cancel then re-confirm)', async () => {
    const { db, client } = world();
    await awardForSource(client, 'order', 'o1'); await clawbackForSource(client, 'order', 'o1');
    expect(await awardForSource(client, 'order', 'o1')).toMatchObject({ status: 'awarded', points: 2 });
    expect(db.rows('loyalty_points')[0].points_balance).toBe(2);
  });
});

describe('adjustPoints (manual, admin route only)', () => {
  it('adds points and logs; refuses fractional, zero, negative and absurd amounts', async () => {
    const { db, client } = world();
    expect(await adjustPoints(client, { memberId: 'm1', kind: 'bonus', amount: 10, description: 'Race day bonus' })).toEqual({ status: 'added', amount: 10 });
    expect(db.rows('loyalty_points')[0].points_balance).toBe(10);
    for (const amount of [0, -5, 1.5, 100_001, NaN]) expect(await code(adjustPoints(client, { memberId: 'm1', kind: 'bonus', amount }))).toBe('400');
  });
  it('redeems only approved milestones and never more than the balance', async () => {
    const { db, client } = world();
    await adjustPoints(client, { memberId: 'm1', kind: 'adjust', amount: 60 });
    expect(await code(adjustPoints(client, { memberId: 'm1', kind: 'redeem', amount: 30 }))).toBe('422');      // not a milestone
    expect(await code(adjustPoints(client, { memberId: 'm1', kind: 'redeem', amount: 100 }))).toBe('422');     // more than balance
    expect(await adjustPoints(client, { memberId: 'm1', kind: 'redeem', amount: 50 })).toMatchObject({ status: 'redeemed' });
    expect(db.rows('loyalty_points')[0]).toMatchObject({ points_balance: 10, total_redeemed: 50 });
  });
  it('unknown member -> 404', async () => {
    const { client } = world();
    expect(await code(adjustPoints(client, { memberId: 'zzz', kind: 'bonus', amount: 5 }))).toBe('404');
  });
});

describe('Hall of Fame (value and name computed on the server)', () => {
  function hofWorld() {
    const { db, client } = world();
    db.seed('race_results', [
      { id: 'r1', member_id: 'm1', lap_time_seconds: 12.5, wins: 1, points_earned: 10 },
      { id: 'r2', member_id: 'm1', lap_time_seconds: 11.9, wins: 2, points_earned: 15 },
      { id: 'r3', member_id: 'm2', lap_time_seconds: 13.2, wins: 0, points_earned: 3 },
    ]);
    db.seed('hall_of_fame', [
      { id: 'h1', category: 'fastest_lap', member_id: null, member_name: 'TBD', record_value: 99 },
      { id: 'h2', category: 'most_wins', member_id: 'm2', member_name: 'Bo', record_value: 1, achieved_at: '2026-01-01' },
    ]);
    db.seed('hall_of_fame_history', []);
    return { db, client };
  }
  it('crowns the best lap computed from stored results, with the name from the members table', async () => {
    const { db, client } = hofWorld();
    expect(await checkRecord(client, 'fastest_lap', 'm1')).toEqual({ broke_record: true, category: 'fastest_lap' });
    expect(db.rows('hall_of_fame').find(h => h.id === 'h1')).toMatchObject({ member_id: 'm1', member_name: 'Ann A', record_value: 11.9, record_label: '11.9s' });
    expect(db.rows('members').find(m => m.id === 'm1')!.loyalty_tier).toBe('hall_of_fame');
  });
  it('archives the previous holder and removes the old points_rate / loyalty_points side effects', async () => {
    const { db, client } = hofWorld();
    expect(await checkRecord(client, 'most_wins', 'm1')).toMatchObject({ broke_record: true });
    expect(db.rows('hall_of_fame_history')).toHaveLength(1);
    expect(db.rows('hall_of_fame_history')[0]).toMatchObject({ member_name: 'Bo', record_value: 1 });
    expect(db.rows('hall_of_fame').find(h => h.id === 'h2')).toMatchObject({ member_name: 'Ann A', record_value: 3, previous_holder_name: 'Bo' });
    expect(db.rows('members').find(m => m.id === 'm1')!.points_rate).toBeUndefined();
    expect(db.rows('loyalty_points')).toHaveLength(0);
  });
  it('does not change a record that is not beaten, or for a member with no results', async () => {
    const { db, client } = hofWorld();
    expect(await checkRecord(client, 'most_wins', 'm2')).toMatchObject({ broke_record: false });
    expect(db.rows('hall_of_fame_history')).toHaveLength(0);
  });
  it('unknown member -> error', async () => {
    const { client } = hofWorld();
    await expect(checkRecord(client, 'most_wins', 'ghost')).rejects.toMatchObject({ status: 404 });
  });
});

// ---------------- HTTP handlers: identity, roles, strict bodies ----------------
function staffClient(db: FakeDb, who: { user: { id: string } | null; roles?: string[] }) {
  const base = db.client() as any;
  return {
    ...base,
    auth: { getUser: async () => ({ data: { user: who.user }, error: who.user ? null : { message: 'no session' } }) },
    rpc: async (n: string) => (n === 'current_staff_roles' ? { data: (who.roles ?? []).map(role => ({ role })), error: null } : { data: null, error: { message: 'unexpected' } }),
  } as SupabaseClient;
}
const post = (body: unknown, headers: Record<string, string> = {}, path = '/api/admin/loyalty') =>
  new Request(`https://club.example${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://club.example', ...headers }, body: JSON.stringify(body) });

describe('POST /api/admin/loyalty', () => {
  const award = (source: 'order' | 'ticket', id: string) => ({ action: 'award', source, id });
  it('anonymous -> 401; player/no-role -> 403; wrong staff role for the source -> 403; nothing is written', async () => {
    const { db } = world();
    expect((await handleLoyalty(post(award('order', 'o1')), { getClient: async () => staffClient(db, { user: null }) })).status).toBe(401);
    expect((await handleLoyalty(post(award('order', 'o1')), { getClient: async () => staffClient(db, { user: { id: 'p' }, roles: [] }) })).status).toBe(403);
    expect((await handleLoyalty(post(award('order', 'o1')), { getClient: async () => staffClient(db, { user: { id: 's' }, roles: ['checkin_staff'] }) })).status).toBe(403);
    expect((await handleLoyalty(post(award('ticket', 't1')), { getClient: async () => staffClient(db, { user: { id: 's' }, roles: ['shop_staff'] }) })).status).toBe(403);
    expect((await handleLoyalty(post(award('order', 'o1')), { getClient: async () => staffClient(db, { user: { id: 's' }, roles: ['viewer'] }) })).status).toBe(403);
    expect(db.rows('loyalty_points')).toHaveLength(0);
    expect(db.rows('orders').every(o => !o.rewards_applied)).toBe(true);
  });
  it('shop_staff may award an order; checkin_staff may award a ticket; replay is a harmless 200 already_applied', async () => {
    const { db } = world();
    const shop = { getClient: async () => staffClient(db, { user: { id: 's' }, roles: ['shop_staff'] }) };
    const r = await handleLoyalty(post(award('order', 'o1')), shop);
    expect(r.status).toBe(200); expect((await r.json()).status).toBe('awarded');
    expect((await (await handleLoyalty(post(award('order', 'o1')), shop)).json()).status).toBe('already_applied');
    const desk = { getClient: async () => staffClient(db, { user: { id: 'c' }, roles: ['checkin_staff'] }) };
    expect((await (await handleLoyalty(post(award('ticket', 't1')), desk)).json()).status).toBe('awarded');
  });
  it('the request cannot carry amounts, emails or a member: such fields are rejected', async () => {
    const { db } = world();
    const admin = { getClient: async () => staffClient(db, { user: { id: 'a' }, roles: ['admin'] }) };
    for (const extra of [{ points: 9999 }, { amount: 5 }, { memberEmail: 'bo@example.invalid' }, { memberId: 'm2' }, { spend: 100000 }, { role: 'admin' }, { actor: 'x' }]) {
      expect((await handleLoyalty(post({ ...award('order', 'o1'), ...extra }), admin)).status).toBe(400);
    }
    expect(db.rows('loyalty_points')).toHaveLength(0);
  });
  it('manual adjust is admin only, validated, and ignores header/query identity claims', async () => {
    const { db } = world();
    const body = { action: 'adjust', memberId: 'm1', kind: 'bonus', amount: 10 };
    const shop = { getClient: async () => staffClient(db, { user: { id: 's' }, roles: ['shop_staff'] }) };
    expect((await handleLoyalty(post(body, { 'x-role': 'admin', authorization: 'Bearer admin' }), shop)).status).toBe(403);
    const admin = { getClient: async () => staffClient(db, { user: { id: 'a' }, roles: ['admin'] }) };
    expect((await handleLoyalty(post({ ...body, kind: 'steal' }), admin)).status).toBe(400);
    expect((await handleLoyalty(post({ ...body, amount: '10' }), admin)).status).toBe(400);
    expect((await handleLoyalty(post(body), admin)).status).toBe(200);
    expect(db.rows('loyalty_points')[0].points_balance).toBe(10);
  });
  it('cross-origin, missing origin, wrong content type, bad JSON and GET are refused', async () => {
    const { db } = world(); const d = { getClient: async () => staffClient(db, { user: { id: 'a' }, roles: ['admin'] }) };
    expect((await handleLoyalty(post(award('order', 'o1'), { origin: 'https://evil.example' }), d)).status).toBe(403);
    expect((await handleLoyalty(new Request('https://club.example/api/admin/loyalty', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }), d)).status).toBe(403);
    expect((await handleLoyalty(post(award('order', 'o1'), { 'content-type': 'text/plain' }), d)).status).toBe(415);
    expect((await handleLoyalty(new Request('https://club.example/api/admin/loyalty', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://club.example' }, body: '{nope' }), d)).status).toBe(400);
    expect((await handleLoyalty(new Request('https://club.example/api/admin/loyalty', { method: 'GET' }), d)).status).toBe(405);
    expect(db.rows('loyalty_points')).toHaveLength(0);
  });
  it('the 4W Prediction Pit wallet is never touched: no pp tables are read or written', async () => {
    const { db } = world(); const admin = { getClient: async () => staffClient(db, { user: { id: 'a' }, roles: ['admin'] }) };
    await handleLoyalty(post(award('order', 'o1')), admin); await handleLoyalty(post({ action: 'adjust', memberId: 'm1', kind: 'bonus', amount: 3 }), admin);
    expect(db.log.filter(l => /^pp|wallet|ledger/.test(l))).toEqual([]);
  });
});

describe('POST /api/admin/hall-of-fame', () => {
  const path = '/api/admin/hall-of-fame';
  it('requires admin or race_marshal; accepts only category + memberId (no values, no names)', async () => {
    const { db } = world();
    db.seed('race_results', [{ id: 'r1', member_id: 'm1', lap_time_seconds: 10, wins: 1, points_earned: 5 }]);
    db.seed('hall_of_fame', [{ id: 'h1', category: 'fastest_lap', member_id: null, member_name: 'TBD', record_value: 99 }]); db.seed('hall_of_fame_history', []);
    const as = (roles: string[]) => ({ getClient: async () => staffClient(db, { user: { id: 'u' }, roles }) });
    expect((await handleHallOfFame(post({ category: 'fastest_lap', memberId: 'm1' }, {}, path), as(['shop_staff']))).status).toBe(403);
    expect((await handleHallOfFame(post({ category: 'fastest_lap', memberId: 'm1', value: 0.001, memberName: 'Mallory' }, {}, path), as(['race_marshal']))).status).toBe(400);
    expect((await handleHallOfFame(post({ category: 'owner_of_everything', memberId: 'm1' }, {}, path), as(['race_marshal']))).status).toBe(400);
    expect((await handleHallOfFame(post({ category: 'fastest_lap', memberId: 'm1' }, {}, path), { getClient: async () => staffClient(db, { user: null }) })).status).toBe(401);
    const ok = await handleHallOfFame(post({ category: 'fastest_lap', memberId: 'm1' }, {}, path), as(['race_marshal']));
    expect(ok.status).toBe(200); expect(await ok.json()).toEqual({ broke_record: true, category: 'fastest_lap' });
    expect(db.rows('hall_of_fame')[0]).toMatchObject({ member_name: 'Ann A', record_value: 10 });
  });
});
