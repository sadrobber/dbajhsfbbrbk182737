import { intlLocale, type Locale } from "@/i18n/routing";

/** "€449" (en), "449 €" (fr, it). Cents only when needed. */
export function formatPrice(locale: Locale, amount: number): string {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat(intlLocale[locale], {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

/** 92 -> "92%" (en), "92 %" (fr). */
export function formatPercent(locale: Locale, value: number): string {
  return new Intl.NumberFormat(intlLocale[locale], { style: "percent", maximumFractionDigits: 0 }).format(
    value / 100,
  );
}

/** ["a", "b", "c"] -> "a, b and c" in the right language. */
export function formatList(locale: Locale, items: string[]): string {
  return new Intl.ListFormat(intlLocale[locale], { style: "long", type: "conjunction" }).format(items);
}
