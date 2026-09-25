import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE, verifySessionToken } from "./server/admin/session";

// Next.js 16 "proxy" (formerly middleware): adds the locale to each page request.
const handleI18nRouting = createMiddleware(routing);

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** First gate of the (temporary) admin login. Pages and server actions check again. */
function handleAdmin(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const signedIn = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value) !== null;

  let response: NextResponse;
  if (pathname === "/admin/login" || signedIn) {
    response = NextResponse.next();
  } else {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    if (pathname !== "/admin") url.searchParams.set("next", `${pathname}${search}`);
    response = NextResponse.redirect(url);
  }
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export function proxy(request: NextRequest) {
  if (isAdminPath(request.nextUrl.pathname)) return handleAdmin(request);
  return handleI18nRouting(request);
}

export const config = {
  // Skip API routes, Next internals, generated icons and any file with an extension.
  matcher: "/((?!api|_next|_vercel|icon|apple-icon|.*\\..*).*)",
};
