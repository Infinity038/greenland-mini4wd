'use client';

// Auth-session-aware browser client — for Supabase Auth flows only (sign-in,
// sign-out, session/role checks). This is intentionally separate from the
// existing lib/supabase.ts singleton, which every current page still uses
// for public/anonymous data fetching; that client is untouched in this
// milestone (see docs/OWNER-BOOTSTRAP-AND-AUTH-ROLLOUT.md). Only
// NEXT_PUBLIC_* values are ever read here — never a service-role key.
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
