"use client";

import { createTranslator } from "next-intl";
import { type ReactNode, useMemo } from "react";
import type { Messages, Translator } from "@/i18n/messages";
import { type Locale, locales } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { useAdminI18n } from "./i18n";

export type PreviewMessages = Record<Locale, Pick<Messages, "Product" | "Packages" | "Common" | "Gauge" | "Deals">>;

/** Same translator as the shop's server code, built in the browser for live previews. */
export function usePreviewTranslator(messages: PreviewMessages, locale: Locale): Translator {
  return useMemo(
    // Only the namespaces above are used by the preview builders.
    () => createTranslator({ locale, messages: messages[locale] as Messages }),
    [messages, locale],
  );
}

const LANGUAGE_LABELS: Record<Locale, string> = { fr: "FR", en: "EN", it: "IT" };

export function PreviewLanguageSwitch({ value, onChange }: { value: Locale; onChange: (locale: Locale) => void }) {
  const { t } = useAdminI18n();
  return (
    <div role="group" aria-label={t("Common.previewLanguage")} className="inline-flex rounded-lg bg-surface-2 p-0.5">
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          aria-pressed={value === locale}
          onClick={() => onChange(locale)}
          className={cn(
            "min-h-9 min-w-10 rounded-md px-2 text-[0.8125rem] font-bold",
            value === locale ? "bg-ink text-fg shadow-sm" : "text-fg-muted hover:text-fg",
          )}
        >
          {LANGUAGE_LABELS[locale]}
        </button>
      ))}
    </div>
  );
}

/** Frame around a live preview. `inert`: the shop's links inside can't be clicked or focused. */
export function PreviewFrame({
  title,
  locale,
  onLocaleChange,
  children,
  className,
}: {
  title: string;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={title} className={cn("rounded-2xl border border-dashed border-line-strong/50 bg-ink p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-fg-subtle">{title}</h3>
        <PreviewLanguageSwitch value={locale} onChange={onLocaleChange} />
      </div>
      <div inert className="select-none">
        {children}
      </div>
    </section>
  );
}
