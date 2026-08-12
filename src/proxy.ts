import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "pokedex_session";
const PRIVATE_PATHS = [
  "/dashboard",
  "/pokedex",
  "/collection",
  "/identify",
  "/analytics",
  "/assistant",
];

function startsWithAny(pathname: string, values: string[]): boolean {
  return values.some((value) => pathname === value || pathname.startsWith(`${value}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (!hasSession && startsWithAny(pathname, PRIVATE_PATHS)) {
    const targetUrl = new URL("/login", request.url);
    targetUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(targetUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pokedex/:path*",
    "/collection/:path*",
    "/identify/:path*",
    "/analytics/:path*",
    "/assistant/:path*",
  ],
};