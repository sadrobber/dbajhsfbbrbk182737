import type { Locale } from "@/i18n/routing";

/**
 * "/phones/x" -> "/fr/phones/x", "/en/phones/x"... Same URLs as next-intl's
 * links (locale prefix "always"), usable outside React (API, emails, feeds).
 */
export function localizedPath(locale: Locale, path: string): string {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

export const paths = {
  product: (id: string) => `/phones/${id}`,
  package: (id: string) => `/packages/${id}`,
  phones: (filter?: "apple" | "samsung" | "other" | "new" | "refurbished") => {
    if (!filter) return "/phones";
    if (filter === "new" || filter === "refurbished") return `/phones?condition=${filter}`;
    return `/phones?brand=${filter}`;
  },
  deals: "/deals",
  /** The picker, or two phones side by side: "/compare/apple-iphone-12-vs-apple-iphone-16". */
  compare: (mine?: string, want?: string) => (mine && want ? `/compare/${mine}-vs-${want}` : "/compare"),
  tradeIn: "/trade-in",
  rules: "/rules",
  store: "/store",
  legal: "/legal",
} as const;
