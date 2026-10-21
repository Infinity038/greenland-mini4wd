import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';
import { handleLoyalty } from '@/lib/admin/loyaltyHandlers';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return handleLoyalty(req, { getClient: createSupabaseServerClient });
}
