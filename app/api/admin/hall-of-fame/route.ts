import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';
import { handleHallOfFame } from '@/lib/admin/loyaltyHandlers';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return handleHallOfFame(req, { getClient: createSupabaseServerClient });
}
