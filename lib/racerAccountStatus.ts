// Racer account status rules. Pure predicates only — no production database
// enforcement yet (see lib/PROPOSED notes); this is the reference logic that
// Race Check-In and reward redemption will both call once wired to real data.

export type RacerAccountStatus = 'Pending Review' | 'Active' | 'Suspended' | 'Archived';

export const REGISTRATION_REQUIRED_NOTICE =
  'You must create and activate a Racer Profile before you can enter an Arctic Mini4WD race.';

export const RACE_CHECK_IN_BLOCKED_NOTICE =
  'Registration must be completed and approved before Race Check-In.';

// Only an Active racer may complete Race Check-In (i.e. actually race).
export function canCompleteRaceCheckIn(status: RacerAccountStatus): boolean {
  return status === 'Active';
}

// Suspended racers cannot redeem rewards; only an Active racer can.
export function canRedeemRewards(status: RacerAccountStatus): boolean {
  return status === 'Active';
}

// Pending Review and Active racers may log in and complete/edit profile
// information. Suspended and Archived accounts are read-only historical
// records for participation purposes, but nothing here blocks viewing them.
export function canEditProfile(status: RacerAccountStatus): boolean {
  return status === 'Pending Review' || status === 'Active';
}

// Archived racers retain historical records but can never participate again.
export function isPermanentlyRetired(status: RacerAccountStatus): boolean {
  return status === 'Archived';
}
