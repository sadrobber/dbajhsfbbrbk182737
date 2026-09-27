import { createTranslator } from "next-intl";
import type en from "../../messages/admin/en.json";

/**
 * Back-office languages. The admin has its own texts (messages/admin/*.json),
 * separate from the shop's, and its language is a cookie rather than the URL.
 * French is the default: the shop's staff work in French.
 */
export const adminLocales = ["fr", "en"] as const;
export type AdminLocale = (typeof adminLocales)[number];
export const DEFAULT_ADMIN_LOCALE: AdminLocale = "fr";
export const ADMIN_LOCALE_COOKIE = "novacell_admin_locale";

export type AdminMessages = typeof en;

export function isAdminLocale(value: unknown): value is AdminLocale {
  return typeof value === "string" && (adminLocales as readonly string[]).includes(value);
}

export function adminTranslator(locale: AdminLocale, messages: AdminMessages) {
  return createTranslator({ locale, messages, timeZone: "Europe/Paris" });
}

export type AdminTranslator = ReturnType<typeof adminTranslator>;

/** Keys built at runtime (validation codes, error codes): checked by the admin messages test, not by TypeScript. */
export function adminTranslateDynamic(t: AdminTranslator, key: string, values?: Record<string, string | number>): string {
  return (t as unknown as (key: string, values?: Record<string, string | number>) => string)(key, values);
}

export function adminHasKey(t: AdminTranslator, key: string): boolean {
  return (t as unknown as { has: (key: string) => boolean }).has(key);
}

const INTL: Record<AdminLocale, string> = { fr: "fr-FR", en: "en-GB" };

/** Prices and dates as staff read them, in the admin's language, Paris time. */
export function adminFormats(locale: AdminLocale) {
  const tag = INTL[locale];
  return {
    euro: new Intl.NumberFormat(tag, { style: "currency", currency: "EUR" }),
    date: new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeZone: "Europe/Paris" }),
    dateTime: new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }),
    number: new Intl.NumberFormat(tag),
  };
}

export type AdminFormats = ReturnType<typeof adminFormats>;
