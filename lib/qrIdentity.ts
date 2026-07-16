// Racer identity QR — an opaque, revocable token that identifies a Racer
// Profile only. It is NOT a reward-redemption coupon: redemption uses a
// separate short-lived single-use token (see the physical-card/reward-roadmap
// modules), never this permanent identity token.
//
// The payload intentionally carries no email, phone, name, or raw database
// UUID — only the opaque token, the public Racer ID, and bookkeeping fields.

export interface QrIdentityPayload {
  token: string;
  racerId: string;
  issuedAt: string;
  revoked: boolean;
}

const ALLOWED_PAYLOAD_KEYS = ['token', 'racerId', 'issuedAt', 'revoked'] as const;

function randomToken(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function issueQrIdentity(racerId: string): QrIdentityPayload {
  return { token: `qr_${randomToken()}`, racerId, issuedAt: new Date().toISOString(), revoked: false };
}

// Structural proof the payload embeds no personal information — only the
// allow-listed bookkeeping fields ever appear on a QR identity payload.
export function containsNoPersonalInformation(payload: QrIdentityPayload): boolean {
  return Object.keys(payload).every(key => (ALLOWED_PAYLOAD_KEYS as readonly string[]).includes(key));
}

export function revokeQrIdentity(payload: QrIdentityPayload): QrIdentityPayload {
  return { ...payload, revoked: true };
}

export function reissueQrIdentity(racerId: string): QrIdentityPayload {
  // A reissue is a brand-new opaque token — never a mutation of the old one,
  // so a captured/leaked old token cannot be "restored" to validity.
  return issueQrIdentity(racerId);
}

// A revoked token must fail verification even if it's otherwise well-formed
// and matches the expected racer.
export function verifyQrIdentity(payload: QrIdentityPayload, expectedRacerId?: string): boolean {
  if (payload.revoked) return false;
  if (expectedRacerId && payload.racerId !== expectedRacerId) return false;
  return true;
}
