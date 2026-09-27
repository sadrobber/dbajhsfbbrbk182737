"use client";

import {
  Database,
  FileText,
  Flame,
  Gauge,
  Languages,
  type LucideIcon,
  Package,
  Receipt,
  Repeat,
  Smartphone,
  Ticket,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { setAdminLocaleAction } from "@/app/admin/locale-actions";
import { adminLocales } from "@/i18n/admin";
import { cn } from "@/lib/cn";
import { useAdminI18n } from "./i18n";

type SectionKey = "products" | "models" | "deals" | "packages" | "gauge" | "orders" | "customers" | "tradeIns" | "tickets" | "invoices";

export const ADMIN_SECTIONS: { href: string; key: SectionKey; icon: LucideIcon; group: "shop" | "records" }[] = [
  { href: "/admin/products", key: "products", icon: Smartphone, group: "shop" },
  { href: "/admin/models", key: "models", icon: Database, group: "shop" },
  { href: "/admin/deals", key: "deals", icon: Flame, group: "shop" },
  { href: "/admin/packages", key: "packages", icon: Package, group: "shop" },
  { href: "/admin/gauge", key: "gauge", icon: Gauge, group: "shop" },
  { href: "/admin/orders", key: "orders", icon: Receipt, group: "records" },
  { href: "/admin/customers", key: "customers", icon: Users, group: "records" },
  { href: "/admin/trade-ins", key: "tradeIns", icon: Repeat, group: "records" },
  { href: "/admin/tickets", key: "tickets", icon: Ticket, group: "records" },
  { href: "/admin/invoices", key: "invoices", icon: FileText, group: "records" },
];

/** `alerts`: count of records waiting for staff, per section href (e.g. orders to confirm). */
export function AdminNav({ alerts = {} }: { alerts?: Record<string, number> }) {
  const pathname = usePathname();
  const { t } = useAdminI18n();

  const link = (section: (typeof ADMIN_SECTIONS)[number]) => {
    const active = pathname === section.href || pathname.startsWith(`${section.href}/`);
    const Icon = section.icon;
    const alert = alerts[section.href] ?? 0;
    return (
      <li key={section.href} className="shrink-0">
        <Link
          href={section.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-semibold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-night-accent",
            active ? "bg-white text-fg" : "text-night-muted hover:bg-white/10 hover:text-white",
          )}
        >
          <Icon aria-hidden="true" className={cn("size-5", active ? "text-accent" : "")} />
          {t(`Nav.${section.key}`)}
          {alert > 0 && (
            <span className="ml-auto grid min-w-6 place-items-center rounded-full bg-danger px-1.5 text-[0.8125rem] font-bold leading-6 text-white">
              {alert}
              <span className="sr-only"> {t("Common.toConfirm")}</span>
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label={t("Nav.label")} className="min-w-0">
      <p className="mb-1 hidden px-3 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-night-muted/80 lg:block">{t("Nav.shop")}</p>
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {ADMIN_SECTIONS.filter((s) => s.group === "shop").map(link)}
        <li aria-hidden="true" className="mx-1 my-2 hidden border-t border-white/10 lg:block" />
        <li className="hidden px-3 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-night-muted/80 lg:block">{t("Nav.records")}</li>
        {ADMIN_SECTIONS.filter((s) => s.group === "records").map(link)}
      </ul>
    </nav>
  );
}

/** FR / EN switch for the back office. `onDark`: on the navy sidebar or login page. */
export function AdminLanguageSwitch({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  const { t, locale } = useAdminI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div role="group" aria-label={t("Common.language")} className={cn("flex items-center gap-2", className)}>
      <Languages aria-hidden="true" className={cn("size-4", onDark ? "text-night-muted" : "text-fg-subtle")} />
      <div className={cn("inline-flex rounded-lg p-0.5", onDark ? "bg-white/10" : "bg-surface-2")}>
        {adminLocales.map((value) => (
          <button
            key={value}
            type="button"
            lang={value}
            aria-pressed={locale === value}
            disabled={pending}
            title={t(`Common.languages.${value}`)}
            onClick={() =>
              startTransition(async () => {
                await setAdminLocaleAction(value);
                router.refresh();
              })
            }
            className={cn(
              "min-h-9 min-w-10 rounded-md px-2 text-[0.8125rem] font-bold uppercase focus-visible:outline-3 focus-visible:outline-accent-strong",
              locale === value
                ? onDark
                  ? "bg-white text-fg"
                  : "bg-ink text-fg shadow-sm"
                : onDark
                  ? "text-night-muted hover:text-white"
                  : "text-fg-muted hover:text-fg",
            )}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
