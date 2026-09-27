"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_LOCALE_COOKIE, isAdminLocale } from "@/i18n/admin";

/** The admin language switch: remembered for a year, only sent to /admin. Also used on the login page, so no session is needed. */
export async function setAdminLocaleAction(locale: string): Promise<void> {
  if (!isAdminLocale(locale)) return;
  (await cookies()).set(ADMIN_LOCALE_COOKIE, locale, {
    path: "/admin",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/admin", "layout");
}
