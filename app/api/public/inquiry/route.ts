import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';
import { createRateLimiter } from '@/lib/public/rateLimit';
import { createDbRateLimiter } from '@/lib/public/dbRateLimiter';
import { turnstileFromEnv, verifyTurnstile } from '@/lib/public/turnstile';
import { handleInquiry } from '@/lib/public/publicHandlers';

export const dynamic = 'force-dynamic';

// Persistent (database) limiter in production, in-memory locally unless RATE_LIMIT_STORE says otherwise.
const store = process.env.RATE_LIMIT_STORE ?? (process.env.NODE_ENV === 'production' ? 'db' : 'memory');
const win = { windowMs: 10 * 60_000, max: 5 };
const limiter = store === 'db' ? createDbRateLimiter(createSupabaseServerClient, { ...win, prefix: 'inquiry' }) : createRateLimiter(win);

export async function POST(req: Request) {
  return handleInquiry(req, { getClient: createSupabaseServerClient, limiter, turnstile: (t, ip) => verifyTurnstile(t, ip, turnstileFromEnv(process.env)) });
}
