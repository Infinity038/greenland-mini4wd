import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient, copyResponseCookies } from '@/lib/supabaseAuth/middlewareClient';

const MEMBER_ONLY = ['/profile', '/tickets/checkout'];
const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/admin/setup']);

function adminLoginRedirect(request: NextRequest, refreshedResponse: NextResponse, reason?: string) {
  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  if (reason) loginUrl.searchParams.set(reason, '1');
  return copyResponseCookies(refreshedResponse, NextResponse.redirect(loginUrl));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('favicon')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    const { supabase, getResponse } = createMiddlewareSupabaseClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const refreshedResponse = getResponse();

    if (pathname === '/admin/setup') {
      // Public only for the one-time owner signup/confirmation flow. The
      // database bootstrap function independently enforces the confirmed
      // owner email and refuses every other account.
      return refreshedResponse;
    }

    if (pathname === '/admin/login') {
      if (!userError && userData.user) {
        const { data: roles, error: roleError } = await supabase.rpc('current_staff_roles');
        if (!roleError && roles?.length) {
          return copyResponseCookies(refreshedResponse, NextResponse.redirect(new URL('/admin', request.url)));
        }
      }
      return refreshedResponse;
    }

    if (!PUBLIC_ADMIN_PATHS.has(pathname) && (userError || !userData.user)) {
      return adminLoginRedirect(request, refreshedResponse);
    }

    const { data: roles, error: roleError } = await supabase.rpc('current_staff_roles');
    if (roleError || !roles?.length) {
      return adminLoginRedirect(request, refreshedResponse, 'denied');
    }

    return refreshedResponse;
  }

  if (MEMBER_ONLY.some(path => pathname.startsWith(path))) {
    const registered = request.cookies.get('gm4wd_registered');
    if (!registered) {
      return NextResponse.redirect(new URL(`/register?next=${encodeURIComponent(pathname)}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
