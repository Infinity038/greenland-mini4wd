import type { EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';
import { resolveSafeNextPath } from '@/lib/supabaseAuth/safeNextPath';

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]);

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const rawType = request.nextUrl.searchParams.get('type');
  const next = resolveSafeNextPath(request.nextUrl.searchParams.get('next') || '/admin/setup');

  if (!tokenHash || !rawType || !ALLOWED_OTP_TYPES.has(rawType as EmailOtpType)) {
    return NextResponse.redirect(new URL('/admin/setup?confirmation=invalid', request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: rawType as EmailOtpType,
  });

  if (error) {
    return NextResponse.redirect(new URL('/admin/setup?confirmation=failed', request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
