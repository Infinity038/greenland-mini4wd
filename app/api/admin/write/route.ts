import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';
import { handleAdminWrite } from '@/lib/admin/adminWriteHandler';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return handleAdminWrite(req, { getClient: createSupabaseServerClient });
}
