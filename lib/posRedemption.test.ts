import { describe, it, expect } from 'vitest';
import { issueRedemptionToken, resolveRedemptionScan, markRedemptionTokenUsed, DEMO_VALID_REDEMPTION_TOKEN, DEMO_EXPIRED_REDEMPTION_TOKEN } from './posRedemption';

const REWARD = { points: 25, discountDkk: 50 };

describe('posRedemption', () => {
  it('issues a token linked to exactly one racer and one reward, with an expiry', () => {
    const now = new Date('2026-07-16T12:00:00Z');
    const token = issueRedemptionToken('G4W-R-0047', REWARD, now);
    expect(token.racerId).toBe('G4W-R-0047');
    expect(token.reward).toEqual(REWARD);
    expect(new Date(token.expiresAt).getTime()).toBeGreaterThan(now.getTime());
    expect(token.redeemedAt).toBeNull();
  });

  it('resolves a valid, unexpired, unused token', () => {
    const now = new Date('2026-07-16T12:00:00Z');
    const token = issueRedemptionToken('G4W-R-0047', REWARD, now);
    const outcome = resolveRedemptionScan(token.token, [token], new Date(now.getTime() + 1000));
    expect(outcome).toEqual({ kind: 'valid', token });
  });

  it('rejects an unknown token', () => {
    expect(resolveRedemptionScan('redeem_unknown', [])).toEqual({ kind: 'not_found' });
  });

  it('fails after expiration', () => {
    const now = new Date('2026-07-16T12:00:00Z');
    const token = issueRedemptionToken('G4W-R-0047', REWARD, now, 60_000);
    const later = new Date(now.getTime() + 120_000);
    const outcome = resolveRedemptionScan(token.token, [token], later);
    expect(outcome).toEqual({ kind: 'expired' });
  });

  it('fails after redemption (cannot be reused)', () => {
    const now = new Date('2026-07-16T12:00:00Z');
    const token = issueRedemptionToken('G4W-R-0047', REWARD, now);
    const used = markRedemptionTokenUsed(token, new Date(now.getTime() + 1000));
    const outcome = resolveRedemptionScan(used.token, [used], new Date(now.getTime() + 2000));
    expect(outcome).toEqual({ kind: 'already_redeemed' });
  });

  it('markRedemptionTokenUsed does not mutate the original token', () => {
    const now = new Date('2026-07-16T12:00:00Z');
    const token = issueRedemptionToken('G4W-R-0047', REWARD, now);
    const used = markRedemptionTokenUsed(token);
    expect(token.redeemedAt).toBeNull();
    expect(used.redeemedAt).not.toBeNull();
  });

  it('the demo valid redemption token resolves as valid today', () => {
    const outcome = resolveRedemptionScan(DEMO_VALID_REDEMPTION_TOKEN.token, [DEMO_VALID_REDEMPTION_TOKEN]);
    expect(outcome).toEqual({ kind: 'valid', token: DEMO_VALID_REDEMPTION_TOKEN });
  });

  it('the demo expired redemption token resolves as expired today', () => {
    const outcome = resolveRedemptionScan(DEMO_EXPIRED_REDEMPTION_TOKEN.token, [DEMO_EXPIRED_REDEMPTION_TOKEN]);
    expect(outcome).toEqual({ kind: 'expired' });
  });
});
