/**
 * STAGING-ONLY trust boundary for the GM4WD -> Prediction Pit one-time handoff.
 * This is NOT wired to the live sites and does not authorize session creation.
 *
 * Only a GM4WD server with an authenticated, approved member session may
 * issue a ticket. A Pit server verifies HS256 and current owner approval,
 * then delegates one-time replay prevention to an atomic DB operation.
 * Do not put tickets in URL query strings; exchange server-to-server via POST.
 * Never bind an existing Pit player/wallet via email similarity.
 */
import { createHmac, randomUUID, timingSafeEqual, createHash } from 'node:crypto';

export const HANDOFF_ISSUER = 'gm4wd-private-members';
export const HANDOFF_AUDIENCE = 'prediction-pit-private-entry';
const ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HEADER = Object.freeze({ alg: 'HS256', typ: 'JWT' });
const b64 = x => Buffer.from(JSON.stringify(x)).toString('base64url');
const verifyKey = key => {
  if (!Buffer.isBuffer(key) || key.length < 32) throw Error('SERVER_KEY_REQUIRED');
};
const reject = code => ({ accepted: false, code });
const signature = (message, key) =>
  createHmac('sha256', key).update(message, 'utf8').digest();
function decodeBase64Json(input) {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) throw Error('INVALID_ENCODING');
  return JSON.parse(Buffer.from(input, 'base64url').toString('utf8'));
}

/** Server-only issuer; caller MUST enforce real GM4WD session + approvals. */
export function issueHandoffTicket({ memberId, authorized, secret, nowSeconds,
  nonce = randomUUID(), ttlSeconds = 60 }) {
  verifyKey(secret);
  if (!ID.test(memberId || '') || !authorized || !ID.test(nonce || '') ||
      !Number.isSafeInteger(nowSeconds) || nowSeconds < 0 ||
      !Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 60) {
    throw Error('ISSUANCE_DENIED');
  }
  const payload = {
    iss: HANDOFF_ISSUER, aud: HANDOFF_AUDIENCE, sub: memberId.toLowerCase(),
    iat: nowSeconds, exp: nowSeconds + ttlSeconds, jti: nonce.toLowerCase(),
  };
  const input = b64(HEADER) + '.' + b64(payload);
  return input + '.' + signature(input, secret).toString('base64url');
}

/** Pure server-side validation. Never expose whether a member exists. */
export function verifyHandoffTicket(token, { secret, nowSeconds }) {
  verifyKey(secret);
  if (typeof token !== 'string' || token.length > 2400 || token.length < 70 ||
      !Number.isSafeInteger(nowSeconds)) return reject('INVALID_TICKET');
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(x => !/^[A-Za-z0-9_-]+$/.test(x)))
    return reject('INVALID_TICKET');
  const [head, claims, mac] = parts;
  const signed = head + '.' + claims;
  const actual = Buffer.from(mac, 'base64url');
  const expected = signature(signed, secret);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return reject('INVALID_TICKET');
  try {
    const h = decodeBase64Json(head), c = decodeBase64Json(claims);
    if (h.alg !== 'HS256' || h.typ !== 'JWT' ||
        Object.keys(h).sort().join(',') !== 'alg,typ' ||
        c.iss !== HANDOFF_ISSUER || c.aud !== HANDOFF_AUDIENCE ||
        !ID.test(c.sub || '') || !ID.test(c.jti || '') ||
        Object.keys(c).sort().join(',') !== 'aud,exp,iat,iss,jti,sub' ||
        !Number.isSafeInteger(c.iat) || !Number.isSafeInteger(c.exp) ||
        c.exp <= c.iat || c.exp - c.iat > 60 ||
        c.iat > nowSeconds + 5 || c.exp <= nowSeconds) return reject('INVALID_TICKET');
    return { accepted: true, code: 'VALID_SIGNATURE_NOT_AUTHORIZATION',
      memberId: c.sub.toLowerCase(), expiresAt: c.exp,
      nonceHash: createHash('sha256').update(c.jti, 'utf8').digest('hex') };
  } catch { return reject('INVALID_TICKET'); }
}

/**
 * Integration adapter reference ONLY. The connected Pit server must verify
 * owner approval on every exchange; preserve an existing player identity.
 * atomicConsume(input) MUST use PostgreSQL UNIQUE/ON CONFLICT under transaction,
 * never check-then-write in memory. Return player ID only, NOT a session.
 */
export async function redeemHandoffTicket({ token, secret, nowSeconds,
  isCurrentlyApproved, lookupLinkedPlayer, atomicConsume }) {
  const verified = verifyHandoffTicket(token, { secret, nowSeconds });
  if (!verified.accepted) return verified;
  if (typeof isCurrentlyApproved !== 'function' ||
      typeof lookupLinkedPlayer !== 'function' ||
      typeof atomicConsume !== 'function') return reject('SERVER_DEPENDENCY_MISSING');
  if (await isCurrentlyApproved(verified.memberId) !== true)
    return reject('APPROVAL_REQUIRED');
  const player = await lookupLinkedPlayer(verified.memberId);
  if (!player || !ID.test(player.id || '') ||
      String(player.memberId).toLowerCase() !== verified.memberId)
    return reject('EXISTING_IDENTITY_LINK_REQUIRED');
  const consumed = await atomicConsume({
    memberId: verified.memberId, playerId: player.id.toLowerCase(),
    nonceHash: verified.nonceHash, expiresAt: verified.expiresAt,
  });
  if (consumed !== true) return reject('REPLAY_OR_EXPIRED');
  return { accepted: true, code: 'ONE_USE_REDEEMED_SESSION_STILL_REQUIRED',
    memberId: verified.memberId, playerId: player.id.toLowerCase() };
}
