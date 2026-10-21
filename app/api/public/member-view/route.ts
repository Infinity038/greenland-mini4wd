import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';
import { createRateLimiter } from '@/lib/public/rateLimit';
import { createDbRateLimiter } from '@/lib/public/dbRateLimiter';
import { handleMemberView } from '@/lib/public/publicHandlers';

export const dynamic = 'force-dynamic';

// Scoped self-view for the signed-in legacy club member. Identity = the HttpOnly session cookie, checked inside the database.
const store = process.env.RATE_LIMIT_STORE ?? (process.env.NODE_ENV === 'production' ? 'db' : 'memory');
const byAddress = { windowMs: 60_000, max: 120 };
const limiter = store === 'db' ? createDbRateLimiter(createSupabaseServerClient, { ...byAddress, prefix: 'mview' }) : createRateLimiter(byAddress);

export async function POST(req: Request) {
  return handleMemberView(req, { getClient: createSupabaseServerClient, limiter });
}
