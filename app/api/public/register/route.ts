import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';
import { createRateLimiter } from '@/lib/public/rateLimit';
import { createDbRateLimiter } from '@/lib/public/dbRateLimiter';
import { turnstileFromEnv, verifyTurnstile } from '@/lib/public/turnstile';
import { handleRegister } from '@/lib/public/publicHandlers';

export const dynamic = 'force-dynamic';

const store = process.env.RATE_LIMIT_STORE ?? (process.env.NODE_ENV === 'production' ? 'db' : 'memory');
const byAddress = { windowMs: 60 * 60_000, max: 5 }, byEmail = { windowMs: 60 * 60_000, max: 3 };
const limiter = store === 'db' ? createDbRateLimiter(createSupabaseServerClient, { ...byAddress, prefix: 'register' }) : createRateLimiter(byAddress);
const emailLimiter = store === 'db' ? createDbRateLimiter(createSupabaseServerClient, { ...byEmail, prefix: 'register-email' }) : createRateLimiter(byEmail);

export async function POST(req: Request) {
  return handleRegister(req, { getClient: createSupabaseServerClient, limiter, emailLimiter, turnstile: (t, ip) => verifyTurnstile(t, ip, turnstileFromEnv(process.env)) });
}
