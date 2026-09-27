import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLanguageSwitch } from "@/components/admin/admin-nav";
import { Wordmark } from "@/components/layout/wordmark";
import { getAdminSession } from "@/server/admin/auth";
import { getAdminI18n } from "@/server/admin/i18n";
import { DEV_CREDENTIALS, getAdminCredentials, safeAdminRedirect } from "@/server/admin/session";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("Login.title") };
}

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next } = await searchParams;
  const target = safeAdminRedirect(next);
  if (await getAdminSession()) redirect(target);
  const credentials = getAdminCredentials();
  const { t } = await getAdminI18n();

  return (
    <main className="grid min-h-dvh place-items-center bg-night px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-white">
          <p>
            <Wordmark onDark />
            <span className="ml-2 align-middle text-[0.9375rem] font-semibold uppercase tracking-[0.14em] text-night-muted">
              {t("Common.admin")}
            </span>
          </p>
          <AdminLanguageSwitch onDark />
        </div>
        <div className="rounded-3xl bg-ink p-6 shadow-card sm:p-8">
          <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em]">{t("Login.title")}</h1>
          <p className="mt-1 text-fg-muted">{t("Login.subtitle")}</p>

          {credentials ? (
            <LoginForm next={target} />
          ) : (
            <p role="alert" className="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-[0.9375rem]">
              {t("Login.off")}
            </p>
          )}

          <p className="mt-6 rounded-xl border border-line bg-surface-1 p-3 text-[0.875rem] leading-snug text-fg-muted">
            <strong className="text-fg">{t("Login.temporaryTitle")}</strong> {t("Login.temporaryText")}
            {credentials?.source === "dev-default" && (
              <>
                <br />
                <span className="mt-2 block">
                  {t("Login.devDefaults")} <code className="font-semibold text-fg">{DEV_CREDENTIALS.email}</code> /{" "}
                  <code className="font-semibold text-fg">{DEV_CREDENTIALS.password}</code>
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
