"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkCredentials, createSessionToken, safeAdminRedirect, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/server/admin/session";
import { allowRequest } from "@/server/advisor/rate-limit";

export type LoginState = { error: string | null; email: string };

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "local";
  if (!allowRequest(`admin-login:${ip}`, Date.now(), 5)) {
    return { error: "Too many attempts. Wait a minute and try again.", email };
  }

  if (!checkCredentials(email, password)) {
    // Small delay: makes guessing slower without bothering real users.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { error: "Wrong email or password.", email };
  }

  const token = createSessionToken();
  if (!token) return { error: "The admin login is not configured on this server.", email };

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  redirect(safeAdminRedirect(formData.get("next")));
}

export async function logout(): Promise<void> {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/admin" });
  redirect("/admin/login");
}
