import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { getLegacyTicketRedirectPath } from "@/lib/legacyTicketRedirect";

// Pages that require membership
const MEMBER_ONLY = ["/profile", "/race-check-in/checkout"];

// Pages behind the Open Tournament feature flag — while disabled, direct visits
// redirect to the beginner-first learning page with a postponed notice instead
// of exposing the tournament flow. Race Check-In is NOT gated here — regular
// weekly Box Stock racing (RSVP + in-person payment) is a standing feature
// independent of the separately-disabled Open Tournament/Open Class format.
const TOURNAMENT_ONLY = ["/tournament"];

// Pages that are always public
// Everything else is public by default

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static/admin/api/register
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes("favicon")
  ) {
    return NextResponse.next();
  }

  // Legacy route rename: /tickets -> /race-check-in (preserve query string).
  const legacyRedirect = getLegacyTicketRedirectPath(pathname);
  if (legacyRedirect) {
    const url = new URL(legacyRedirect, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  if (!FEATURE_FLAGS.openTournamentEnabled && TOURNAMENT_ONLY.some(p => pathname.startsWith(p))) {
    const url = new URL("/how-to-join", request.url);
    url.searchParams.set("notice", "tournament-paused");
    return NextResponse.redirect(url);
  }

  // Only gate member-only pages
  if (MEMBER_ONLY.some(p => pathname.startsWith(p))) {
    const registered = request.cookies.get("gm4wd_registered");
    if (!registered) {
      return NextResponse.redirect(new URL("/register?next=" + pathname, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};