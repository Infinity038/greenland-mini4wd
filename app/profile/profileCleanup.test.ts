import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), 'utf8');
const profile = read('app', 'profile', 'RacerProfile.tsx');
const profileRoute = read('app', 'profile', 'page.tsx');
const loyalty = read('lib', 'loyalty.ts');
const adminLoyalty = read('app', 'admin', 'loyalty', 'page.tsx');
const migration = read('supabase', 'migrations', '20260719_fixed_reward_points.sql');
const rollback = read('supabase', 'migrations-proposed', '20260719_fixed_reward_points_rollback.sql');

describe('racer profile cleanup', () => {
  it('uses the simplified racer profile component', () => {
    expect(profileRoute).toContain("import RacerProfile from './RacerProfile'");
    expect(profileRoute).toContain('<RacerProfile />');
  });

  it('removes the legacy coin, spending, rank and referral presentation', () => {
    expect(profile).not.toMatch(/Total Coins|club coins|RANK PROGRESS|Lifetime Spend|referral/i);
    expect(profile).not.toContain('DEMO_WALLET');
    expect(profile).not.toContain('DEMO_REFERRAL');
    expect(profile).not.toContain('weekly_loyalty_progress');
    expect(profile).not.toContain('season_loyalty_progress');
  });

  it('shows only one fixed Reward Points system', () => {
    expect(profile).toContain('REWARD POINTS');
    expect(profile).toContain('1 point for every 100 DKK');
    expect(profile).toContain('Your spending total is not displayed on your profile');
    expect(profile).toContain('REWARD_MILESTONES');
  });

  it('keeps racer activity separate from rewards', () => {
    expect(profile).toContain("type Tab = 'overview' | 'racing' | 'garage' | 'orders' | 'wishlist'");
    expect(profile).toContain('MY RACE ENTRIES');
    expect(profile).toContain('MY GARAGE');
    expect(profile).toContain('TICKET HISTORY');
  });
});

describe('fixed reward awarding', () => {
  it('awards from cumulative spend boundaries, not a percentage tier', () => {
    expect(loyalty).toContain('rewardPointsEarnedBetween(previousLifetimeSpending, newLifetimeSpending)');
    expect(loyalty).toContain('rewardPointsFromEligibleSpend(newLifetimeSpending)');
    expect(loyalty).not.toMatch(/spendDkk\s*\*\s*rate\s*\/\s*100/);
    expect(loyalty).not.toContain('getRankFromPoints');
  });

  it('always writes to the fixed reward account rather than a race tier', () => {
    expect(loyalty).toContain("tier: 'fixed_rewards'");
    expect(loyalty).not.toContain("tier: member.loyalty_tier");
  });

  it('uses whole fixed points in the admin screen', () => {
    expect(adminLoyalty).toContain('One whole point per 100 DKK');
    expect(adminLoyalty).toContain('REWARD_MILESTONES');
    expect(adminLoyalty).not.toMatch(/LOYALTY COINS|Coins Balance|coins\b/);
    expect(adminLoyalty).not.toContain('percent_off');
    expect(adminLoyalty).not.toContain('TIERS');
  });

  it('shows only fixed-system transactions in the new admin history', () => {
    expect(adminLoyalty).toContain(".eq('rate_applied', 1)");
    expect(adminLoyalty).toContain('No fixed-reward activity recorded.');
  });

  it('restricts redemption to the approved milestone point amounts', () => {
    expect(adminLoyalty).toContain('REWARD_MILESTONES.find(milestone => milestone.points === amount)');
    expect(adminLoyalty).toContain('Redemptions must use an approved milestone: 25, 50, 100 or 150 points.');
    expect(adminLoyalty).toContain('availableRedemptions.map');
  });
});

describe('reward data reconciliation', () => {
  it('takes private rollback snapshots before changing balances', () => {
    expect(migration).toContain('fixed_rewards_members_backup_20260719');
    expect(migration).toContain('fixed_rewards_accounts_backup_20260719');
    expect(migration).toContain('fixed_rewards_transactions_backup_20260719');
    expect(migration).toContain('revoke all');
  });

  it('converts every member to one integer point per 100 DKK', () => {
    expect(migration).toMatch(/floor\(greatest\(coalesce\(lifetime_spending, 0\), 0\) \/ 100\)/);
    expect(migration).toContain("'fixed_rewards'");
    expect(migration).toContain('points_rate = 1');
    expect(migration).toContain('Expected one reward account per member');
  });

  it('fails closed rather than discarding redeemed balances', () => {
    expect(migration).toContain('Migration requires manual review because a current account has redeemed points');
  });

  it('restores the exact backed-up member and account fields', () => {
    expect(rollback).toContain('fixed_rewards_members_backup_20260719');
    expect(rollback).toContain('fixed_rewards_accounts_backup_20260719');
    expect(rollback).toContain('Fixed reward rollback verification failed');
  });
});
