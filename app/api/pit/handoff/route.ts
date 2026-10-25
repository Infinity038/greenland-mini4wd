import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';
import { readSessionToken } from '@/lib/public/publicHandlers';
import { clientKey } from '@/lib/public/rateLimit';
import { createDbRateLimiter } from '@/lib/public/dbRateLimiter';
import { issueHandoffTicket } from '@/scripts/pit-p0/sso-handoff-contract.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// RELEASE GATES:
// - PIT_HANDOFF_ENABLED is false/missing until GM4WD P4 security + owner P3 pass
// - GM4WD_PUBLIC_ORIGIN must be the exact production origin
// - PIT_HANDOFF_SIGNING_KEY_BASE64 is a secret shared through backend env only
// - pit_member_handoff_authorized does not exist in hosted GM4WD yet
// - Pit redeemer must verify signature, consume nonce ONCE, validate access
//   again and establish a real authenticated player session.
const limiter = createDbRateLimiter(createSupabaseServerClient, {
  windowMs: 60_000, max: 6, prefix: 'pit-handoff-issue',
});

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store, private',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    },
  });
}

export async function POST(req: Request): Promise<Response> {
  // Missing feature flag, secure origin, or key always DENY. This prevents
  // accidental early activation by merging the route before release approval.
  const issuerOrigin = process.env.GM4WD_PUBLIC_ORIGIN;
  if (process.env.PIT_HANDOFF_ENABLED !== 'true' ||
      !issuerOrigin || !issuerOrigin.startsWith('https://')) {
    return reply(503, { error: 'not available' });
  }
  try {
    if (new URL(req.url).origin !== issuerOrigin ||
        req.headers.get('origin') !== issuerOrigin ||
        !(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
      return reply(403, { error: 'forbidden' });
    }
    const body = await req.text();
    if (body.length > 32 || body.trim() !== '{}') {
      return reply(400, { error: 'invalid request' });
    }
    const sessionToken = readSessionToken(req);
    if (!sessionToken) return reply(401, { error: 'not signed in' });
    const limited = await limiter.check(clientKey(req));
    if (!limited.ok) return reply(429, { error: 'try again later' });

    const client = await createSupabaseServerClient();
    const { data, error } = await client.rpc('pit_member_handoff_authorized', {
      p_token: sessionToken,
    });
    const memberId = data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>).member_id
      : undefined;
    if (error || typeof memberId !== 'string' ||
        (data as Record<string, unknown>).allowed !== true) {
      // Do not reveal whether the member exists or has been denied by owner.
      return reply(403, { error: 'not authorized' });
    }
    const encoded = process.env.PIT_HANDOFF_SIGNING_KEY_BASE64;
    if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      return reply(503, { error: 'not available' });
    }
    const secret = Buffer.from(encoded, 'base64');
    if (secret.length < 32) return reply(503, { error: 'not available' });
    const ticket = issueHandoffTicket({
      memberId, authorized: true, secret,
      nowSeconds: Math.floor(Date.now() / 1000),
      ttlSeconds: 60,
    });
    // Ticket is short-lived, single-use and returned only to the GM4WD
    // same-origin client. It must cross to Pit via POST, never a query URL.
    return reply(200, { ok: true, ticket, transport: 'POST_ONLY' });
  } catch {
    return reply(503, { error: 'not available' });
  }
}
