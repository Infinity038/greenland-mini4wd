import { supabase } from './supabase';
import { getRankFromPoints } from './member';

// Tier point-earning rates — mirrors TIERS in app/admin/loyalty/page.tsx.
// Keep these two in sync if you ever change one.
export const TIER_RATES: Record<string, number> = {
  non_member: 0,
  member: 2,
  season_3rd: 3,
  season_2nd: 4,
  season_1st: 5,
  hall_of_fame: 8,
};

export function getTierRate(tier: string | null | undefined): number {
  return TIER_RATES[tier || 'member'] ?? 2;
}

// Membership days: every 20 kr of spend = 1 day. Days EXTEND from whichever is later —
// today, or the current expiry — so back-to-back purchases stack instead of overlapping/wasting.
export function calcMembershipDays(spendDkk: number): number {
  return spendDkk / 20;
}

export function isMemberActive(member: { membership_expires_at?: string | null } | null | undefined): boolean {
  if (!member?.membership_expires_at) return false;
  return new Date(member.membership_expires_at).getTime() > Date.now();
}

export function daysRemaining(member: { membership_expires_at?: string | null } | null | undefined): number {
  if (!member?.membership_expires_at) return 0;
  const ms = new Date(member.membership_expires_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

interface AwardResult {
  points: number;
  days: number;
  newExpiresAt: string;
}

// Call this the moment a payment is confirmed (order or ticket). Idempotent via the
// caller checking `rewards_applied` before calling — see admin/orders/page.tsx.
export async function awardForPayment(memberEmail: string, spendDkk: number): Promise<AwardResult | null> {
  if (!memberEmail || spendDkk <= 0) return null;

  const { data: member, error: fetchErr } = await supabase.from('members').select('*').eq('email', memberEmail).single();
  if (fetchErr) throw new Error(`Failed to fetch member: ${fetchErr.message}`);
  if (!member) return null;

  const rate = getTierRate(member.loyalty_tier);
  const points = Math.round((spendDkk * rate) / 100 * 100) / 100; // never rounded away — keep 2 decimals
  const days = calcMembershipDays(spendDkk);

  const now = Date.now();
  const currentExpiry = member.membership_expires_at ? new Date(member.membership_expires_at).getTime() : now;
  const base = Math.max(now, currentExpiry);
  const newExpiresAt = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();

  const newLifetimeSpending = (Number(member.lifetime_spending) || 0) + spendDkk;
  const newTotalPoints = (Number(member.total_points) || 0) + points;
  const newRank = getRankFromPoints(newTotalPoints);

  const { error: updateErr } = await supabase.from('members').update({
    membership_expires_at: newExpiresAt,
    lifetime_spending: newLifetimeSpending,
    total_points: newTotalPoints,
    rank: newRank,
    is_active_member: true,
  }).eq('id', member.id);
  if (updateErr) throw new Error(`Failed to update member: ${updateErr.message}`);

  // Mirror into loyalty_points so admin/loyalty's existing balance/earned display stays accurate
  const { data: lp, error: lpFetchErr } = await supabase.from('loyalty_points').select('*').eq('member_id', member.id).single();
  if (lpFetchErr && lpFetchErr.code !== 'PGRST116') throw new Error(`Failed to fetch loyalty_points: ${lpFetchErr.message}`);

  const { error: lpUpsertErr } = await supabase.from('loyalty_points').upsert({
    member_id: member.id,
    member_name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email,
    points_balance: (Number(lp?.points_balance) || 0) + points,
    total_earned: (Number(lp?.total_earned) || 0) + points,
    tier: member.loyalty_tier || 'member',
    points_rate: rate,
  }, { onConflict: 'member_id' });
  if (lpUpsertErr) throw new Error(`Failed to upsert loyalty_points: ${lpUpsertErr.message}`);

  const { error: txErr } = await supabase.from('points_transactions').insert({
    member_id: member.id,
    type: 'earn',
    amount: points,
    description: `Auto-earned from ${spendDkk} kr payment (membership +${days.toFixed(1)} days)`,
  });
  if (txErr) throw new Error(`Failed to insert points_transactions: ${txErr.message}`);

  return { points, days, newExpiresAt };
}

// Call this when a previously-confirmed order/ticket gets cancelled or its proof rejected.
// Reverses exactly what awardForPayment gave, using the stored points_awarded/membership_days_awarded.
export async function clawbackForPayment(memberEmail: string, pointsToRemove: number, daysToRemove: number): Promise<void> {
  if (!memberEmail || (pointsToRemove <= 0 && daysToRemove <= 0)) return;

  const { data: member, error: fetchErr } = await supabase.from('members').select('*').eq('email', memberEmail).single();
  if (fetchErr) throw new Error(`Failed to fetch member: ${fetchErr.message}`);
  if (!member) return;

  const newTotalPoints = Math.max(0, (Number(member.total_points) || 0) - pointsToRemove);
  const newLifetimeSpending = Math.max(0, (Number(member.lifetime_spending) || 0) - daysToRemove * 20);
  const currentExpiry = member.membership_expires_at ? new Date(member.membership_expires_at).getTime() : Date.now();
  const newExpiresAt = new Date(Math.max(Date.now(), currentExpiry - daysToRemove * 24 * 60 * 60 * 1000)).toISOString();
  const newRank = getRankFromPoints(newTotalPoints);

  const { error: updateErr } = await supabase.from('members').update({
    membership_expires_at: newExpiresAt,
    lifetime_spending: newLifetimeSpending,
    total_points: newTotalPoints,
    rank: newRank,
  }).eq('id', member.id);
  if (updateErr) throw new Error(`Failed to update member: ${updateErr.message}`);

  const { data: lp, error: lpFetchErr } = await supabase.from('loyalty_points').select('*').eq('member_id', member.id).single();
  if (lpFetchErr && lpFetchErr.code !== 'PGRST116') throw new Error(`Failed to fetch loyalty_points: ${lpFetchErr.message}`);

  if (lp) {
    const { error: lpUpdateErr } = await supabase.from('loyalty_points').update({
      points_balance: Math.max(0, (Number(lp.points_balance) || 0) - pointsToRemove),
      total_earned: Math.max(0, (Number(lp.total_earned) || 0) - pointsToRemove),
    }).eq('member_id', member.id);
    if (lpUpdateErr) throw new Error(`Failed to update loyalty_points: ${lpUpdateErr.message}`);
  }

  const { error: txErr } = await supabase.from('points_transactions').insert({
    member_id: member.id,
    type: 'redeem',
    amount: pointsToRemove,
    description: `Clawback: order cancelled/rejected (-${daysToRemove.toFixed(1)} membership days)`,
  });
  if (txErr) throw new Error(`Failed to insert points_transactions: ${txErr.message}`);
}