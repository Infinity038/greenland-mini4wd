import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';
import { createRateLimiter } from '@/lib/public/rateLimit';
import { createDbRateLimiter } from '@/lib/public/dbRateLimiter';
import { turnstileFromEnv, verifyTurnstile } from '@/lib/public/turnstile';
import { handleMemberLogin } from '@/lib/public/publicHandlers';

export const dynamic = 'force-dynamic';

// Legacy club-member password login. The password is compared inside the database (public.club_member_login), never in the browser.
// Per-address and per-email throttles live here (the database function adds its own per-email throttle).
const store = process.env.RATE_LIMIT_STORE ?? (process.env.NODE_ENV === 'production' ? 'db' : 'memory');
const byAddress = { windowMs: 15 * 60_000, max: 20 }, byEmail = { windowMs: 15 * 60_000, max: 8 };
const limiter = store === 'db' ? createDbRateLimiter(createSupabaseServerClient, { ...byAddress, prefix: 'mlogin' }) : createRateLimiter(byAddress);
const emailLimiter = store === 'db' ? createDbRateLimiter(createSupabaseServerClient, { ...byEmail, prefix: 'mlogin-email' }) : createRateLimiter(byEmail);

export async function POST(req: Request) {
  return handleMemberLogin(req, { getClient: createSupabaseServerClient, limiter, emailLimiter, turnstile: (t, ip) => verifyTurnstile(t, ip, turnstileFromEnv(process.env)) });
}
