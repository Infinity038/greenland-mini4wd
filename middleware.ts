import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { FEATURE_FLAGS } from "@/lib/featureFlags";

// Pages that require membership
const MEMBER_ONLY = ["/profile", "/tickets/checkout"];

// Pages behind the Open Tournament feature flag — while disabled, direct visits
// redirect to the beginner-first learning page with a postponed notice instead
// of exposing the tournament/ticket flows.
const TOURNAMENT_ONLY = ["/tournament", "/tickets"];

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