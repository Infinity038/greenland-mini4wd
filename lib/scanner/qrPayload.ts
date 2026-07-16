// Typed, versionable QR payload format shared by every club-controlled QR
// code: g4w:<type>:<opaque-token>. Pure parsing/formatting only — routing to
// the correct lookup happens in the caller (see components/pos/POSTerminal.tsx).

export type QrRecordType = 'product' | 'racer' | 'car' | 'service' | 'event' | 'redemption';

const QR_PREFIX = 'g4w';
const QR_RECORD_TYPES: readonly QrRecordType[] = ['product', 'racer', 'car', 'service', 'event', 'redemption'];

export interface ParsedQrPayload {
  type: QrRecordType;
  token: string;
  raw: string;
}

export type QrParseFailureReason = 'malformed' | 'unknown_type' | 'empty_token' | 'looks_like_personal_data';

export type QrParseResult =
  | { ok: true; payload: ParsedQrPayload }
  | { ok: false; reason: QrParseFailureReason };

// Defensive guard, not a substitute for correct issuance: opaque tokens
// should never look like an email address or a phone number. Real tokens are
// random (see lib/qrIdentity.ts's issueQrIdentity) so this should never
// trigger on legitimate payloads.
function looksLikePersonalData(token: string): boolean {
  if (token.includes('@')) return true;
  const stripped = token.replace(/[\s-]/g, '');
  const digitCount = (stripped.match(/\d/g) ?? []).length;
  return digitCount >= 7 && digitCount === stripped.length;
}

export function parseQrPayload(raw: string): QrParseResult {
  const trimmed = raw.trim();
  const parts = trimmed.split(':');
  if (parts.length < 3 || parts[0] !== QR_PREFIX) return { ok: false, reason: 'malformed' };

  const [, typeRaw, ...tokenParts] = parts;
  const token = tokenParts.join(':');

  if (!QR_RECORD_TYPES.includes(typeRaw as QrRecordType)) return { ok: false, reason: 'unknown_type' };
  if (!token) return { ok: false, reason: 'empty_token' };
  if (looksLikePersonalData(token)) return { ok: false, reason: 'looks_like_personal_data' };

  return { ok: true, payload: { type: typeRaw as QrRecordType, token, raw: trimmed } };
}

export function formatQrPayload(type: QrRecordType, token: string): string {
  return `${QR_PREFIX}:${type}:${token}`;
}
