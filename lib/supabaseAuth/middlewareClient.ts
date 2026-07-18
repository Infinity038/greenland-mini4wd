// Session-refresh helper for Next.js middleware, following the standard
// @supabase/ssr Next.js pattern. NOT wired into middleware.ts in this
// milestone — the admin-route protection change is explicitly out of scope
// here (see docs/OWNER-BOOTSTRAP-AND-AUTH-ROLLOUT.md, "scope exclusions").
// Provided now so a later phase can call `updateSupabaseSession(request)`
// from middleware.ts without inventing a new client pattern at that point.
// Uses only the public anon key.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, response };
}
