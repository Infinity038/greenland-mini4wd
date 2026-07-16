// Reward redemption uses a separate short-lived, single-use QR — never the
// permanent Racer QR. Pure state machine only; a real implementation will
// persist issued tokens server-side once schema/RLS is reviewed.
import type { RewardTier } from './loyaltyRoadmap';

export interface RedemptionToken {
  token: string;
  racerId: string;
  reward: RewardTier;
  issuedAt: string;
  expiresAt: string;
  redeemedAt: string | null;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function issueRedemptionToken(
  racerId: string,
  reward: RewardTier,
  now: Date = new Date(),
  ttlMs: number = DEFAULT_TTL_MS
): RedemptionToken {
  return {
    token: `redeem_${racerId}_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    racerId,
    reward,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    redeemedAt: null,
  };
}

export type RedemptionOutcome =
  | { kind: 'valid'; token: RedemptionToken }
  | { kind: 'not_found' }
  | { kind: 'expired' }
  | { kind: 'already_redeemed' };

export function resolveRedemptionScan(
  rawToken: string,
  tokens: RedemptionToken[],
  now: Date = new Date()
): RedemptionOutcome {
  const found = tokens.find(t => t.token === rawToken);
  if (!found) return { kind: 'not_found' };
  if (found.redeemedAt) return { kind: 'already_redeemed' };
  if (now.getTime() > new Date(found.expiresAt).getTime()) return { kind: 'expired' };
  return { kind: 'valid', token: found };
}

// Marks the token used — the caller (a mock in-memory list in the POS
// screen for this phase) is responsible for persisting the updated record.
export function markRedemptionTokenUsed(token: RedemptionToken, now: Date = new Date()): RedemptionToken {
  return { ...token, redeemedAt: now.toISOString() };
}
