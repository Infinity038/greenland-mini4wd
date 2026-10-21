import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeRewardPoints, rewardPointsEarnedBetween, rewardPointsFromEligibleSpend, REWARD_MILESTONES } from '@/lib/rewards';

// Explicit member columns (never password_hash or auth_user_id): column-level database privileges will not allow select('*') for signed-in roles.
const MEMBER_COLS = 'id,name,first_name,last_name,email,phone,nationality,city,experience,created_at,member_status,referral_code,referred_by,rank,total_points,favorite_chassis,is_active_member,membership_expires_at,loyalty_tier,points_rate,loyalty_progress,loyalty_needed,weekly_loyalty_progress,season_loyalty_progress,lifetime_spending,avatar_url';

/**
 * Mini4WD club loyalty (Reward Points + membership days), executed on the SERVER under the operator's own session.
 * This is a SEPARATE economy from the Prediction Pit 4W wallet: nothing here touches `pp.*`, and no 4W code touches
 * these tables.
 *
 * Guarantees (application layer; a SQL transaction would be stronger, see docs/phase1/ROLE_REVIEW.md section 7):
 *  - amounts are derived from the stored payment row and the member row, never from client-supplied numbers;
 *  - the member to credit comes from the payment row, never from the request;
 *  - `rewards_applied` is claimed with a compare-and-set, so concurrent or repeated requests award at most once;
 *  - member/loyalty updates use optimistic concurrency and are retried, with best-effort undo on failure.
 */
export type Source = 'order' | 'ticket';
export class LoyaltyError extends Error { constructor(public status: 400 | 404 | 409 | 422 | 500, message: string) { super(message); } }

export const SOURCES = {
  order: { table: 'orders', roles: ['admin', 'shop_staff'] as const },
  ticket: { table: 'race_tickets', roles: ['admin', 'registration_staff', 'checkin_staff'] as const },
};
const ORDER_PAID = ['payment_confirmed', 'reserved', 'awaiting_stock', 'in_transit', 'ready_for_pickup', 'completed'];
const MAX_SPEND = 1_000_000;

export function extractSpendFromNotes(notes: unknown): number {
  if (typeof notes !== 'string' || !notes) return 0;
  const full = notes.match(/Full Payment:\s*([\d.]+)\s*DKK/i);
  if (full) return parseFloat(full[1]);
  const deposit = notes.match(/Deposit:\s*([\d.]+)\s*DKK\s*\(Remaining:\s*([\d.]+)\s*DKK/i);
  if (deposit) return parseFloat(deposit[1]) + parseFloat(deposit[2]);
  const price = notes.match(/Price:\s*([\d.]+)\s*DKK/i);
  if (price) return parseFloat(price[1]);
  return 0;
}

export const membershipDays = (spendDkk: number) => spendDkk / 20;
const label = (m: any) => `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.name || m.email;
type Undo = () => Promise<unknown>;

async function runUndo(undo: Undo[]) { for (const u of undo.reverse()) { try { await u(); } catch { /* best effort */ } } }

async function loadSource(client: SupabaseClient, source: Source, id: string) {
  const cols = source === 'order' ? 'id,member_email,email,notes,spend_amount_dkk,payment_status,rewards_applied,points_awarded,membership_days_awarded'
    : 'id,member_email,total_price,payment_status,rewards_applied,points_awarded,membership_days_awarded';
  const { data, error } = await client.from(SOURCES[source].table).select(cols).eq('id', id).maybeSingle();
  if (error) throw new LoyaltyError(500, 'load failed');
  if (!data) throw new LoyaltyError(404, 'not found');
  return data as any;
}

async function claim(client: SupabaseClient, table: string, id: string, from: boolean): Promise<boolean> {
  let q: any = client.from(table).update({ rewards_applied: !from }).eq('id', id);
  q = from ? q.eq('rewards_applied', true) : q.or('rewards_applied.is.null,rewards_applied.eq.false');
  const { data, error } = await q.select('id');
  if (error) throw new LoyaltyError(500, 'claim failed');
  return Array.isArray(data) && data.length === 1;
}

/** Apply a delta to the member's cumulative spending/expiry with optimistic concurrency. Returns the undo. */
async function updateMember(client: SupabaseClient, memberId: string, compute: (m: any) => Record<string, unknown>): Promise<{ undo: Undo; member: any }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: m, error } = await client.from('members').select(MEMBER_COLS).eq('id', memberId).maybeSingle();
    if (error || !m) throw new LoyaltyError(404, 'member not found');
    const patch = compute(m);
    let q: any = client.from('members').update(patch).eq('id', memberId);
    q = m.lifetime_spending == null ? q.is('lifetime_spending', null) : q.eq('lifetime_spending', m.lifetime_spending);
    const { data: rows, error: uerr } = await q.select('id');
    if (uerr) throw new LoyaltyError(500, 'member update failed');
    if (rows?.length === 1) {
      const before = Object.fromEntries(Object.keys(patch).map(k => [k, (m as Record<string, any>)[k] ?? null]));
      return { member: m, undo: async () => { await client.from('members').update(before).eq('id', memberId); } };
    }
  }
  throw new LoyaltyError(409, 'member changed concurrently; retry');
}

async function updateLoyalty(client: SupabaseClient, member: any, delta: { balance: number; earned: number; redeemed: number }): Promise<Undo> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: row, error } = await client.from('loyalty_points').select('*').eq('member_id', member.id).maybeSingle();
    if (error) throw new LoyaltyError(500, 'loyalty read failed');
    const now = new Date().toISOString();
    if (!row) {
      const { error: ie } = await client.from('loyalty_points').insert({ member_id: member.id, member_name: label(member), points_balance: Math.max(0, delta.balance), total_earned: Math.max(0, delta.earned), total_redeemed: Math.max(0, delta.redeemed), tier: 'fixed_rewards', points_rate: 1, updated_at: now });
      if (!ie) return async () => { await client.from('loyalty_points').delete().eq('member_id', member.id); };
      continue; // unique violation: someone else created it; re-read
    }
    const next = {
      points_balance: Math.max(0, (Number(row.points_balance) || 0) + delta.balance),
      total_earned: Math.max(0, (Number(row.total_earned) || 0) + delta.earned),
      total_redeemed: Math.max(0, (Number(row.total_redeemed) || 0) + delta.redeemed),
      tier: 'fixed_rewards', points_rate: 1, updated_at: now,
    };
    let q: any = client.from('loyalty_points').update(next).eq('member_id', member.id);
    q = row.points_balance == null ? q.is('points_balance', null) : q.eq('points_balance', row.points_balance);
    const { data: rows, error: ue } = await q.select('member_id');
    if (ue) throw new LoyaltyError(500, 'loyalty update failed');
    if (rows?.length === 1) {
      const before = { points_balance: row.points_balance, total_earned: row.total_earned, total_redeemed: row.total_redeemed, tier: row.tier, points_rate: row.points_rate, updated_at: row.updated_at };
      return async () => { await client.from('loyalty_points').update(before).eq('member_id', member.id); };
    }
  }
  throw new LoyaltyError(409, 'loyalty account changed concurrently; retry');
}

async function logTx(client: SupabaseClient, tx: Record<string, unknown>): Promise<Undo> {
  const { data, error } = await client.from('points_transactions').insert(tx).select('id').maybeSingle();
  if (error) throw new LoyaltyError(500, 'activity log failed');
  return async () => { if (data?.id) await client.from('points_transactions').delete().eq('id', data.id); };
}

export async function awardForSource(client: SupabaseClient, source: Source, id: string) {
  const row = await loadSource(client, source, id);
  const email: string | null = row.member_email || row.email || null;
  const paid = source === 'order' ? ORDER_PAID.includes(row.payment_status) : row.payment_status === 'payment_confirmed';
  if (!paid) throw new LoyaltyError(422, 'payment is not confirmed');
  const spend = source === 'order' ? (Number(row.spend_amount_dkk) || extractSpendFromNotes(row.notes)) : Number(row.total_price);
  if (!email || !Number.isFinite(spend) || spend <= 0) return { status: 'nothing_to_award' as const };
  if (spend > MAX_SPEND) throw new LoyaltyError(422, 'spend out of range');

  const table = SOURCES[source].table;
  if (!(await claim(client, table, id, false))) return { status: 'already_applied' as const };
  const undo: Undo[] = [async () => { await client.from(table).update({ rewards_applied: false }).eq('id', id); }];
  try {
    const { data: found } = await client.from('members').select('id').eq('email', email).maybeSingle();
    if (!found) throw new LoyaltyError(404, 'member not found');
    let points = 0, days = 0, expires = '';
    const upd = await updateMember(client, found.id, m => {
      const prev = Number(m.lifetime_spending) || 0, next = prev + spend;
      points = rewardPointsEarnedBetween(prev, next); days = membershipDays(spend);
      const base = Math.max(Date.now(), m.membership_expires_at ? new Date(m.membership_expires_at).getTime() : Date.now());
      expires = new Date(base + days * 86_400_000).toISOString();
      return { membership_expires_at: expires, lifetime_spending: next, total_points: rewardPointsFromEligibleSpend(next), points_rate: 1, is_active_member: true };
    });
    undo.push(upd.undo);
    undo.push(await updateLoyalty(client, upd.member, { balance: points, earned: points, redeemed: 0 }));
    if (points > 0) undo.push(await logTx(client, { member_id: found.id, member_name: label(upd.member), type: 'earn', amount: points, rate_applied: 1, purchase_amount: spend, description: `Fixed rewards: +${points} point${points === 1 ? '' : 's'} after ${spend} DKK eligible payment` }));
    const fin = { points_awarded: points, membership_days_awarded: days, ...(source === 'order' ? { spend_amount_dkk: spend } : {}) };
    const { error } = await client.from(table).update(fin).eq('id', id);
    if (error) throw new LoyaltyError(500, 'could not record the award');
    return { status: 'awarded' as const, points, days, expires };
  } catch (e) { await runUndo(undo); throw e; }
}

export async function clawbackForSource(client: SupabaseClient, source: Source, id: string) {
  const row = await loadSource(client, source, id);
  const email: string | null = row.member_email || row.email || null;
  const points = normalizeRewardPoints(row.points_awarded), days = Math.max(0, Number(row.membership_days_awarded) || 0);
  if (!row.rewards_applied) return { status: 'not_applied' as const };
  const table = SOURCES[source].table;
  if (!(await claim(client, table, id, true))) return { status: 'not_applied' as const };
  const undo: Undo[] = [async () => { await client.from(table).update({ rewards_applied: true }).eq('id', id); }];
  try {
    if (email && (points > 0 || days > 0)) {
      const { data: found } = await client.from('members').select('id').eq('email', email).maybeSingle();
      if (found) {
        const spendBack = days * 20;
        const upd = await updateMember(client, found.id, m => {
          const next = Math.max(0, (Number(m.lifetime_spending) || 0) - spendBack);
          const cur = m.membership_expires_at ? new Date(m.membership_expires_at).getTime() : Date.now();
          return { membership_expires_at: new Date(Math.max(Date.now(), cur - days * 86_400_000)).toISOString(), lifetime_spending: next, total_points: rewardPointsFromEligibleSpend(next), points_rate: 1 };
        });
        undo.push(upd.undo);
        undo.push(await updateLoyalty(client, upd.member, { balance: -points, earned: -points, redeemed: 0 }));
        if (points > 0) undo.push(await logTx(client, { member_id: found.id, member_name: label(upd.member), type: 'redeem', amount: points, rate_applied: 1, purchase_amount: spendBack, description: `Reward clawback: cancelled or rejected payment (-${points} point${points === 1 ? '' : 's'})` }));
      }
    }
    return { status: 'clawed_back' as const, points, days };
  } catch (e) { await runUndo(undo); throw e; }
}

/** Manual bonus / adjustment / fixed-milestone redemption from the admin loyalty page. Admin only (enforced by the route). */
export async function adjustPoints(client: SupabaseClient, i: { memberId: string; kind: 'bonus' | 'adjust' | 'redeem'; amount: number; description?: string }) {
  if (!Number.isInteger(i.amount) || i.amount < 1 || i.amount > 100_000) throw new LoyaltyError(400, 'invalid amount');
  const redeem = i.kind === 'redeem';
  const milestone = REWARD_MILESTONES.find(m => m.points === i.amount);
  if (redeem && !milestone) throw new LoyaltyError(422, 'redemptions must use an approved milestone');
  const { data: member } = await client.from('members').select(MEMBER_COLS).eq('id', i.memberId).maybeSingle();
  if (!member) throw new LoyaltyError(404, 'member not found');
  if (redeem) {
    const { data: acct } = await client.from('loyalty_points').select('points_balance').eq('member_id', i.memberId).maybeSingle();
    if (i.amount > normalizeRewardPoints(acct?.points_balance)) throw new LoyaltyError(422, 'insufficient points');
  }
  const undo: Undo[] = [];
  try {
    undo.push(await updateLoyalty(client, member, redeem ? { balance: -i.amount, earned: 0, redeemed: i.amount } : { balance: i.amount, earned: i.amount, redeemed: 0 }));
    const description = (i.description ?? '').trim().slice(0, 300) || (redeem ? `Fixed reward redemption: ${i.amount} points for ${milestone!.discountDkk} DKK` : `Manual fixed reward adjustment: +${i.amount} points`);
    await logTx(client, { member_id: i.memberId, member_name: label(member), type: redeem ? 'redeem' : i.kind, amount: i.amount, rate_applied: 1, purchase_amount: null, description });
    return { status: redeem ? 'redeemed' as const : 'added' as const, amount: i.amount };
  } catch (e) { await runUndo(undo); throw e; }
}
