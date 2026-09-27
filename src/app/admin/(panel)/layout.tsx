import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { AdminLanguageSwitch, AdminNav } from "@/components/admin/admin-nav";
import { Banner } from "@/components/admin/ui";
import { Wordmark } from "@/components/layout/wordmark";
import { countOrdersToCheck } from "@/lib/data/admin-repository";
import { requireAdmin } from "@/server/admin/auth";
import { getAdminI18n } from "@/server/admin/i18n";
import { getAdminAccounts } from "@/server/admin/session";
import { logout } from "../login/actions";

export default async function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireAdmin();
  const [ordersToCheck, { t, locale }] = await Promise.all([countOrdersToCheck(), getAdminI18n()]);
  const usingDevPassword = getAdminAccounts()?.source === "dev-default";
  const readOnlyHost = Boolean(process.env.VERCEL);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_1fr]">
      <aside className="bg-night text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-2 pt-4 lg:px-5 lg:pt-6">
          <Link href="/admin" className="rounded-lg focus-visible:outline-3 focus-visible:outline-night-accent">
            <Wordmark onDark className="text-[1.375rem]" />
            <span className="ml-2 align-middle text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-night-muted">
              {t("Common.admin")}
            </span>
          </Link>
          <AdminLanguageSwitch onDark />
        </div>
        <div className="px-2 pb-2 lg:flex-1 lg:overflow-y-auto lg:px-3 lg:pt-4">
          <AdminNav alerts={{ "/admin/orders": ordersToCheck }} />
        </div>
        <div className="hidden border-t border-white/10 p-3 lg:block">
          <Link
            href={`/${locale}`}
            target="_blank"
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] text-night-muted hover:bg-white/10 hover:text-white"
          >
            <ExternalLink aria-hidden="true" className="size-5" />
            {t("Common.viewShop")}
          </Link>
          <p className="truncate px-3 pt-2 text-[0.8125rem] text-night-muted" title={session.email}>
            {session.email}
          </p>
          <form action={logout}>
            <button
              type="submit"
              className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-semibold text-night-muted hover:bg-white/10 hover:text-white"
            >
              <LogOut aria-hidden="true" className="size-5" />
              {t("Common.signOut")}
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <main id="main" className="mx-auto grid max-w-[90rem] gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {(usingDevPassword || readOnlyHost || ordersToCheck > 0) && (
            <div className="grid gap-3">
              {ordersToCheck > 0 && (
                <Banner tone="warning">
                  <strong>{t("Common.ordersToCheckTitle", { count: ordersToCheck })}</strong> {t("Common.ordersToCheckText")}{" "}
                  <Link href="/admin/orders#to-confirm" className="font-semibold text-accent-text underline">
                    {t("Common.ordersToCheckLink", { count: ordersToCheck })}
                  </Link>
                </Banner>
              )}
              {usingDevPassword && (
                <Banner tone="warning">
                  <strong>{t("Common.devLoginTitle")}</strong> {t("Common.devLoginText")}
                </Banner>
              )}
              {readOnlyHost && (
                <Banner tone="warning">
                  <strong>{t("Common.readOnlyTitle")}</strong> {t("Common.readOnlyText")}
                </Banner>
              )}
            </div>
          )}
          {children}
        </main>
        <form action={logout} className="px-4 pb-8 sm:px-6 lg:hidden">
          <button type="submit" className="flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-fg-muted underline">
            <LogOut aria-hidden="true" className="size-4" />
            {t("Common.signOutAs", { email: session.email })}
          </button>
        </form>
      </div>
    </div>
  );
}
