import { defineRouting } from "next-intl/routing";

export const locales = ["fr", "en", "it"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "fr",
  // Every page has its language in the URL: /fr, /en, /it. "/" opens /fr.
  // (Explicit prefixes keep Next.js prefetching reliable; no hidden rewrites.)
  localePrefix: "always",
  // The site always opens in French; visitors switch with the language buttons.
  // Set to true to follow the browser language instead.
  localeDetection: false,
});

/** BCP 47 tags used for prices, percentages and lists. */
export const intlLocale: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-GB",
  it: "it-IT",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
