import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';
import { resolveSafeNextPath } from '@/lib/supabaseAuth/safeNextPath';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = resolveSafeNextPath(request.nextUrl.searchParams.get('next') || '/admin/setup');

  if (!code) {
    return NextResponse.redirect(new URL('/admin/setup?confirmation=invalid', request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/admin/setup?confirmation=failed', request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
