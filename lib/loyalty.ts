import { supabase } from './supabase';
import {
  rewardPointsEarnedBetween,
  rewardPointsFromEligibleSpend,
} from './rewards';

// Compatibility export for older callers. Reward earning is no longer tiered:
// every registered racer earns one whole point per 100 DKK of cumulative
// eligible spending.
export const TIER_RATES: Record<string, number> = {
  non_member: 1,
  member: 1,
  season_3rd: 1,
  season_2nd: 1,
  season_1st: 1,
  hall_of_fame: 1,
};

export function getTierRate(): number {
  return 1;
}

// Membership days remain separate from Reward Points. The profile shows only
// the resulting active/inactive membership state, not the spending calculation.
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

// Call when an eligible payment is confirmed. Points are awarded from the
// member's cumulative eligible spending so two smaller purchases can cross a
// 100 DKK boundary together. The caller keeps this idempotent with
// `rewards_applied` on the payment row.
export async function awardForPayment(memberEmail: string, spendDkk: number): Promise<AwardResult | null> {
  if (!memberEmail || spendDkk <= 0) return null;

  const { data: member, error: fetchErr } = await supabase
    .from('members')
    .select('*')
    .eq('email', memberEmail)
    .single();
  if (fetchErr) throw new Error(`Failed to fetch member: ${fetchErr.message}`);
  if (!member) return null;

  const previousLifetimeSpending = Number(member.lifetime_spending) || 0;
  const newLifetimeSpending = previousLifetimeSpending + spendDkk;
  const points = rewardPointsEarnedBetween(previousLifetimeSpending, newLifetimeSpending);
  const newTotalPoints = rewardPointsFromEligibleSpend(newLifetimeSpending);
  const days = calcMembershipDays(spendDkk);

  const now = Date.now();
  const currentExpiry = member.membership_expires_at
    ? new Date(member.membership_expires_at).getTime()
    : now;
  const base = Math.max(now, currentExpiry);
  const newExpiresAt = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateErr } = await supabase.from('members').update({
    membership_expires_at: newExpiresAt,
    lifetime_spending: newLifetimeSpending,
    total_points: newTotalPoints,
    points_rate: 1,
    is_active_member: true,
  }).eq('id', member.id);
  if (updateErr) throw new Error(`Failed to update member: ${updateErr.message}`);

  const { data: loyalty, error: loyaltyFetchErr } = await supabase
    .from('loyalty_points')
    .select('*')
    .eq('member_id', member.id)
    .maybeSingle();
  if (loyaltyFetchErr) throw new Error(`Failed to fetch loyalty_points: ${loyaltyFetchErr.message}`);

  const currentBalance = Number(loyalty?.points_balance) || 0;
  const currentEarned = Number(loyalty?.total_earned) || 0;
  const currentRedeemed = Number(loyalty?.total_redeemed) || 0;

  const { error: loyaltyUpsertErr } = await supabase.from('loyalty_points').upsert({
    member_id: member.id,
    member_name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.name || member.email,
    points_balance: currentBalance + points,
    total_earned: currentEarned + points,
    total_redeemed: currentRedeemed,
    tier: 'fixed_rewards',
    points_rate: 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'member_id' });
  if (loyaltyUpsertErr) throw new Error(`Failed to upsert loyalty_points: ${loyaltyUpsertErr.message}`);

  if (points > 0) {
    const { error: transactionErr } = await supabase.from('points_transactions').insert({
      member_id: member.id,
      member_name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.name || member.email,
      type: 'earn',
      amount: points,
      rate_applied: 1,
      purchase_amount: spendDkk,
      description: `Fixed rewards: +${points} point${points === 1 ? '' : 's'} after ${spendDkk} DKK eligible payment`,
    });
    if (transactionErr) throw new Error(`Failed to insert points_transactions: ${transactionErr.message}`);
  }

  return { points, days, newExpiresAt };
}

// Reverse the exact reward and membership-day amounts stored on the original
// payment row. Racer rank is intentionally not purchase-based and is not
// recalculated here.
export async function clawbackForPayment(
  memberEmail: string,
  pointsToRemove: number,
  daysToRemove: number
): Promise<void> {
  if (!memberEmail || (pointsToRemove <= 0 && daysToRemove <= 0)) return;

  const { data: member, error: fetchErr } = await supabase
    .from('members')
    .select('*')
    .eq('email', memberEmail)
    .single();
  if (fetchErr) throw new Error(`Failed to fetch member: ${fetchErr.message}`);
  if (!member) return;

  const spendToRemove = Math.max(0, daysToRemove * 20);
  const newLifetimeSpending = Math.max(0, (Number(member.lifetime_spending) || 0) - spendToRemove);
  const newTotalPoints = rewardPointsFromEligibleSpend(newLifetimeSpending);
  const currentExpiry = member.membership_expires_at
    ? new Date(member.membership_expires_at).getTime()
    : Date.now();
  const newExpiresAt = new Date(
    Math.max(Date.now(), currentExpiry - daysToRemove * 24 * 60 * 60 * 1000)
  ).toISOString();

  const { error: updateErr } = await supabase.from('members').update({
    membership_expires_at: newExpiresAt,
    lifetime_spending: newLifetimeSpending,
    total_points: newTotalPoints,
    points_rate: 1,
  }).eq('id', member.id);
  if (updateErr) throw new Error(`Failed to update member: ${updateErr.message}`);

  const { data: loyalty, error: loyaltyFetchErr } = await supabase
    .from('loyalty_points')
    .select('*')
    .eq('member_id', member.id)
    .maybeSingle();
  if (loyaltyFetchErr) throw new Error(`Failed to fetch loyalty_points: ${loyaltyFetchErr.message}`);

  if (loyalty) {
    const { error: loyaltyUpdateErr } = await supabase.from('loyalty_points').update({
      points_balance: Math.max(0, (Number(loyalty.points_balance) || 0) - pointsToRemove),
      total_earned: Math.max(0, (Number(loyalty.total_earned) || 0) - pointsToRemove),
      tier: 'fixed_rewards',
      points_rate: 1,
      updated_at: new Date().toISOString(),
    }).eq('member_id', member.id);
    if (loyaltyUpdateErr) throw new Error(`Failed to update loyalty_points: ${loyaltyUpdateErr.message}`);
  }

  if (pointsToRemove > 0) {
    const { error: transactionErr } = await supabase.from('points_transactions').insert({
      member_id: member.id,
      member_name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.name || member.email,
      type: 'redeem',
      amount: pointsToRemove,
      rate_applied: 1,
      purchase_amount: spendToRemove,
      description: `Reward clawback: cancelled or rejected payment (-${pointsToRemove} point${pointsToRemove === 1 ? '' : 's'})`,
    });
    if (transactionErr) throw new Error(`Failed to insert points_transactions: ${transactionErr.message}`);
  }
}
