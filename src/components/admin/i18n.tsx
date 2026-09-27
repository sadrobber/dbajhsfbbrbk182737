"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import {
  type AdminFormats,
  adminFormats,
  type AdminLocale,
  type AdminMessages,
  type AdminTranslator,
  adminTranslator,
} from "@/i18n/admin";

type AdminI18n = { locale: AdminLocale; t: AdminTranslator; formats: AdminFormats };

const AdminI18nContext = createContext<AdminI18n | null>(null);

/** Gives admin client components the staff member's language (set by the admin root layout). */
export function AdminI18nProvider({ locale, messages, children }: { locale: AdminLocale; messages: AdminMessages; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: adminTranslator(locale, messages), formats: adminFormats(locale) }), [locale, messages]);
  return <AdminI18nContext.Provider value={value}>{children}</AdminI18nContext.Provider>;
}

export function useAdminI18n(): AdminI18n {
  const value = useContext(AdminI18nContext);
  if (!value) throw new Error("useAdminI18n must be used inside AdminI18nProvider");
  return value;
}
