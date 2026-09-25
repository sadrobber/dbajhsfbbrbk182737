import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

// Next.js 16 "proxy" (formerly middleware): adds the locale to each page request.
const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  return handleI18nRouting(request);
}

export const config = {
  // Skip API routes, Next internals, generated icons and any file with an extension.
  matcher: "/((?!api|_next|_vercel|icon|apple-icon|.*\\..*).*)",
};
