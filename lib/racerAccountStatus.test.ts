import { describe, expect, it } from 'vitest';
import {
  canCompleteRaceCheckIn,
  canRedeemRewards,
  canEditProfile,
  isPermanentlyRetired,
  type RacerAccountStatus,
} from './racerAccountStatus';

const ALL_STATUSES: RacerAccountStatus[] = ['Pending Review', 'Active', 'Suspended', 'Archived'];

describe('canCompleteRaceCheckIn', () => {
  it('requires Active status — Pending Review, Suspended and Archived cannot check in', () => {
    expect(canCompleteRaceCheckIn('Active')).toBe(true);
    for (const status of ALL_STATUSES.filter(s => s !== 'Active')) {
      expect(canCompleteRaceCheckIn(status)).toBe(false);
    }
  });
});

describe('canRedeemRewards', () => {
  it('Suspended racers cannot redeem rewards', () => {
    expect(canRedeemRewards('Suspended')).toBe(false);
  });
  it('only Active racers can redeem rewards', () => {
    expect(canRedeemRewards('Active')).toBe(true);
    expect(canRedeemRewards('Pending Review')).toBe(false);
    expect(canRedeemRewards('Archived')).toBe(false);
  });
});

describe('canEditProfile', () => {
  it('Pending Review may complete profile information', () => {
    expect(canEditProfile('Pending Review')).toBe(true);
  });
  it('Active may edit', () => {
    expect(canEditProfile('Active')).toBe(true);
  });
  it('Suspended and Archived may not edit', () => {
    expect(canEditProfile('Suspended')).toBe(false);
    expect(canEditProfile('Archived')).toBe(false);
  });
});

describe('isPermanentlyRetired', () => {
  it('is true only for Archived', () => {
    expect(isPermanentlyRetired('Archived')).toBe(true);
    expect(isPermanentlyRetired('Active')).toBe(false);
  });
});
