import { describe, expect, it } from 'vitest';
import { issueQrIdentity, containsNoPersonalInformation, revokeQrIdentity, reissueQrIdentity, verifyQrIdentity } from './qrIdentity';

describe('issueQrIdentity', () => {
  it('contains no direct personal information (no email/phone/name/UUID fields)', () => {
    const payload = issueQrIdentity('G4W-R-0047');
    expect(containsNoPersonalInformation(payload)).toBe(true);
    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('phone');
    expect(payload).not.toHaveProperty('name');
    expect(Object.keys(payload).sort()).toEqual(['issuedAt', 'racerId', 'revoked', 'token'].sort());
  });

  it('issues a fresh, non-empty opaque token each time', () => {
    const a = issueQrIdentity('G4W-R-0047');
    const b = issueQrIdentity('G4W-R-0047');
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThan(10);
  });
});

describe('verifyQrIdentity', () => {
  it('verifies a freshly issued, non-revoked token', () => {
    const payload = issueQrIdentity('G4W-R-0047');
    expect(verifyQrIdentity(payload, 'G4W-R-0047')).toBe(true);
  });

  it('a revoked token fails verification', () => {
    const payload = revokeQrIdentity(issueQrIdentity('G4W-R-0047'));
    expect(verifyQrIdentity(payload, 'G4W-R-0047')).toBe(false);
  });

  it('fails verification if the racer ID does not match', () => {
    const payload = issueQrIdentity('G4W-R-0047');
    expect(verifyQrIdentity(payload, 'G4W-R-9999')).toBe(false);
  });
});

describe('reissueQrIdentity', () => {
  it('produces a brand-new token distinct from any prior one', () => {
    const original = issueQrIdentity('G4W-R-0047');
    const revoked = revokeQrIdentity(original);
    const reissued = reissueQrIdentity('G4W-R-0047');
    expect(reissued.token).not.toBe(original.token);
    expect(reissued.revoked).toBe(false);
    expect(verifyQrIdentity(revoked)).toBe(false);
    expect(verifyQrIdentity(reissued)).toBe(true);
  });
});
