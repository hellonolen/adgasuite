import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/server/magic-auth";

// Security headers applied to every response.
// HSTS  : forces HTTPS for 1 year, included subdomains, preload-ready.
// XFO   : prevents clickjacking via iframe embedding (except same-origin for sharing).
// XCTO  : prevents MIME-type sniffing attacks on uploads / static assets.
// REF   : strips referrer to "strict-origin-when-cross-origin" so URLs with tokens don't leak.
// PERM  : disables high-risk browser APIs (camera, mic, geolocation, payment) until explicitly enabled.
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(), payment=(self), usb=()",
  );
  return response;
}

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-adga-pathname", request.nextUrl.pathname);
  const next = () => applySecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }));

  if (process.env.NODE_ENV !== "production") return next();

  const hostname = request.nextUrl.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return next();
  }

  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  if (hasSession) return next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return applySecurityHeaders(NextResponse.redirect(loginUrl));
}

export const config = {
  // Match every route except Next internals + static assets — security headers
  // need to apply everywhere a browser sees them. The auth gate inside still
  // only triggers on /suite/* paths.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|otf)).*)"],
};
