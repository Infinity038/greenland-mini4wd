import 'server-only';

// Auth-session-aware server client — for Server Components and Route
// Handlers that need to read the caller's Supabase Auth session via cookies.
// The `server-only` import above turns any accidental import of this module
// from a Client Component into a build-time error, not just a lint warning.
// Still uses only the public anon key — no service-role key exists anywhere
// in this milestone (see docs/OWNER-BOOTSTRAP-AND-AUTH-ROLLOUT.md).
//
// Not called from anywhere yet in this milestone — provided so a later
// phase (server-side route protection, RPC-backed writes) has a ready
// client instead of inventing a new pattern at that point.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render, which cannot set
            // cookies (no active response to attach them to). Safe to
            // ignore here as long as a middleware-based session refresh is
            // also in place before this client is relied on for session
            // renewal — not wired into middleware.ts in this milestone.
          }
        },
      },
    }
  );
}
