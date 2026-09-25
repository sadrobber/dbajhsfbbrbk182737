"use client";

import { ArrowRight, BadgePercent, ChevronDown, LayoutGrid, Recycle, Smartphone, Sparkles, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAdvisor } from "@/components/advisor/advisor-provider";
import { buttonClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { paths } from "@/lib/paths";

const SHORTCUTS: { key: "iphone" | "samsung" | "otherBrands" | "new" | "refurbished" | "deals"; href: string; icon: LucideIcon }[] = [
  { key: "iphone", href: paths.phones("apple"), icon: Smartphone },
  { key: "samsung", href: paths.phones("samsung"), icon: Smartphone },
  { key: "otherBrands", href: paths.phones("other"), icon: LayoutGrid },
  { key: "new", href: paths.phones("new"), icon: Sparkles },
  { key: "refurbished", href: paths.phones("refurbished"), icon: Recycle },
  { key: "deals", href: paths.deals, icon: BadgePercent },
];

/** The two big hero buttons: shortcuts for people who know, the advisor for everyone else. */
export function HeroActions() {
  const t = useTranslations("Hero");
  const { open } = useAdvisor();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-8 sm:mt-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="hero-shortcuts"
          onClick={() => setExpanded((value) => !value)}
          className={buttonClass("dark", "lg")}
        >
          {t("knowWhatIWant")}
          <ChevronDown aria-hidden="true" className={cn("size-5 transition duration-300", expanded && "rotate-180")} />
        </button>
        <button type="button" onClick={open} data-advisor-anchor="" className={buttonClass("primary", "lg")}>
          <Sparkles aria-hidden="true" className="size-5" />
          {t("helpMeChoose")}
        </button>
      </div>

      <div
        id="hero-shortcuts"
        inert={!expanded}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <p className="mt-7 text-[0.9375rem] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
            {t("shortcutsTitle")}
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-3 pb-1 sm:grid-cols-3">
            {SHORTCUTS.map(({ key, href, icon: Icon }) => (
              <li key={key}>
                <Link
                  href={href}
                  className="group flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface-1 px-4 py-3 text-[1.0625rem] font-semibold transition hover:-translate-y-0.5 hover:border-accent/70 hover:bg-surface-2"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">{t(`shortcuts.${key}`)}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="hidden size-4 shrink-0 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-fg sm:block"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
