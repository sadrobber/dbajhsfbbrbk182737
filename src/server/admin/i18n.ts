import "server-only";
import { cookies } from "next/headers";
import en from "../../../messages/admin/en.json";
import fr from "../../../messages/admin/fr.json";
import {
  ADMIN_LOCALE_COOKIE,
  type AdminLocale,
  type AdminMessages,
  adminFormats,
  adminTranslator,
  DEFAULT_ADMIN_LOCALE,
  isAdminLocale,
} from "@/i18n/admin";

const catalogs: Record<AdminLocale, AdminMessages> = { fr, en };

export function getAdminMessages(locale: AdminLocale): AdminMessages {
  return catalogs[locale];
}

/** The staff member's language, from the cookie set by the language switch. */
export async function getAdminLocale(): Promise<AdminLocale> {
  const value = (await cookies()).get(ADMIN_LOCALE_COOKIE)?.value;
  return isAdminLocale(value) ? value : DEFAULT_ADMIN_LOCALE;
}

/** Translator and formatters for admin pages, server actions and metadata. */
export async function getAdminI18n() {
  const locale = await getAdminLocale();
  return { locale, t: adminTranslator(locale, catalogs[locale]), formats: adminFormats(locale) };
}
