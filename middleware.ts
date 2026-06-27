import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const sessionCookie = getSessionCookie(request);

    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

export default function middleware(request: NextRequest) {
  return authMiddleware(request);
}
