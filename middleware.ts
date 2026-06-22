import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that require membership
const MEMBER_ONLY = ["/profile", "/tickets/checkout"];

// Pages that are always public
// Everything else is public by default

export function proxy(request: NextRequest) {
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