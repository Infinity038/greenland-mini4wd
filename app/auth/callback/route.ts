import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';
import { resolveSafeNextPath, resolveSafeMemberNextPath } from '@/lib/supabaseAuth/safeNextPath';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const rawNext = request.nextUrl.searchParams.get('next');
  // A member link (Prediction Pit / profile) and a staff link are different flows with different allowlists and
  // different failure pages. An unknown or hostile `next` falls back to the staff default, as before.
  const memberNext = resolveSafeMemberNextPath(rawNext);
  const next = memberNext ?? resolveSafeNextPath(rawNext || '/admin/setup');

  if (!code) {
    return NextResponse.redirect(new URL(memberNext ? '/secure-member-signin?auth=invalid&next=' + encodeURIComponent(memberNext) : '/admin/setup?confirmation=invalid', request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(memberNext ? '/secure-member-signin?auth=failed&next=' + encodeURIComponent(memberNext) : '/admin/setup?confirmation=failed', request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
