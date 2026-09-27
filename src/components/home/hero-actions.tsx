"use client";

import {
  ArrowRightIcon,
  ArrowsLeftRightIcon,
  CaretDownIcon,
  DeviceMobileIcon,
  RecycleIcon,
  SealPercentIcon,
  SparkleIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAdvisor } from "@/components/advisor/advisor-provider";
import { Magnetic } from "@/components/motion/magnetic";
import { buttonClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { paths } from "@/lib/paths";

const SHORTCUTS: { key: "iphone" | "samsung" | "otherBrands" | "new" | "refurbished" | "deals"; href: string; icon: Icon }[] = [
  { key: "iphone", href: paths.phones("apple"), icon: DeviceMobileIcon },
  { key: "samsung", href: paths.phones("samsung"), icon: DeviceMobileIcon },
  { key: "otherBrands", href: paths.phones("other"), icon: SquaresFourIcon },
  { key: "new", href: paths.phones("new"), icon: SparkleIcon },
  { key: "refurbished", href: paths.phones("refurbished"), icon: RecycleIcon },
  { key: "deals", href: paths.deals, icon: SealPercentIcon },
];

/** The two big hero buttons: shortcuts for people who know, the advisor for everyone else. */
export function HeroActions() {
  const t = useTranslations("Hero");
  const { open } = useAdvisor();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Magnetic>
          <button type="button" onClick={open} data-advisor-anchor="" className={cn(buttonClass("primary", "lg"), "w-full sm:w-auto")}>
            <SparkleIcon aria-hidden="true" className="size-5" />
            {t("helpMeChoose")}
          </button>
        </Magnetic>
        <Magnetic>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="hero-shortcuts"
            onClick={() => setExpanded((value) => !value)}
            className={cn(buttonClass("secondary", "lg"), "w-full sm:w-auto")}
          >
            {t("knowWhatIWant")}
            <CaretDownIcon aria-hidden="true" className={cn("size-5 transition duration-300", expanded && "rotate-180")} />
          </button>
        </Magnetic>
      </div>
      <Link
        href={paths.compare()}
        className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-accent-text underline-offset-4 hover:underline"
      >
        <ArrowsLeftRightIcon aria-hidden="true" className="size-5" />
        {t("compareLink")}
      </Link>

      <div
        id="hero-shortcuts"
        inert={!expanded}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <p className="mt-6 text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-fg-subtle">{t("shortcutsTitle")}</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 pb-1 sm:grid-cols-3">
            {SHORTCUTS.map(({ key, href, icon: ShortcutIcon }) => (
              <li key={key}>
                <Link
                  href={href}
                  className="group flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-ink px-3.5 py-2.5 font-semibold transition hover:-translate-y-0.5 hover:border-accent/50 active:scale-[0.98]"
                >
                  <ShortcutIcon aria-hidden="true" className="size-5 shrink-0 text-accent-text" />
                  <span className="min-w-0 flex-1 leading-tight">{t(`shortcuts.${key}`)}</span>
                  <ArrowRightIcon
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
