import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';
import { createRateLimiter } from '@/lib/public/rateLimit';
import { handleMemberLogout } from '@/lib/public/publicHandlers';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return handleMemberLogout(req, { getClient: createSupabaseServerClient, limiter: createRateLimiter({ windowMs: 60_000, max: 60 }) });
}
