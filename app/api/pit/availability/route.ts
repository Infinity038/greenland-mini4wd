import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';
import { readSessionToken } from '@/lib/public/publicHandlers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request): Promise<Response> {
  const headers = {
    'content-type':'application/json',
    'cache-control':'no-store, private',
    'x-content-type-options':'nosniff',
  };
  const disabled = () => new Response(JSON.stringify({allowed:false}),{status:200,headers});
  if (process.env.PIT_HANDOFF_ENABLED !== 'true' ||
      !process.env.NEXT_PUBLIC_PIT_ORIGIN?.startsWith('https://') ||
      !process.env.GM4WD_PUBLIC_ORIGIN?.startsWith('https://'))
    return disabled();
  const token = readSessionToken(req);
  if (!token) return disabled();
  try {
    if (new URL(req.url).origin !== process.env.GM4WD_PUBLIC_ORIGIN) return disabled();
    const client = await createSupabaseServerClient();
    const { data,error } = await client.rpc('pit_member_handoff_authorized', { p_token:token });
    if (error || data?.allowed !== true) return disabled();
    return new Response(JSON.stringify({allowed:true}),{status:200,headers});
  } catch { return disabled(); }
}
