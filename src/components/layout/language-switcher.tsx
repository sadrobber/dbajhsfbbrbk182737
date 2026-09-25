"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/cn";

function LanguageLinks({ query }: { query?: Record<string, string> }) {
  const t = useTranslations("Header");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("languageLabel")}>
      <ul className="flex items-center gap-1 rounded-full border border-line-strong/70 bg-surface-1 p-1">
        {routing.locales.map((code) => {
          const active = code === locale;
          return (
            <li key={code}>
              <Link
                href={{ pathname, query }}
                locale={code}
                hrefLang={code}
                lang={code}
                title={t(`languages.${code}`)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "grid min-h-11 min-w-12 place-items-center rounded-full px-3 text-[0.9375rem] font-bold uppercase tracking-wide transition",
                  active ? "bg-fg text-ink" : "text-fg-muted hover:bg-surface-3 hover:text-fg",
                )}
              >
                {code}
                <span className="sr-only"> {t(`languages.${code}`)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function LanguageLinksWithQuery() {
  const searchParams = useSearchParams();
  return <LanguageLinks query={Object.fromEntries(searchParams.entries())} />;
}

/** FR | EN | IT, always visible. Keeps the current page (and its filters) when switching. */
export function LanguageSwitcher() {
  return (
    <Suspense fallback={<LanguageLinks />}>
      <LanguageLinksWithQuery />
    </Suspense>
  );
}
