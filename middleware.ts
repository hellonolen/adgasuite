import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/server/magic-auth";

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/suite/:path*"],
};
