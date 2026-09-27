"use client";

import { ArrowCounterClockwiseIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { buttonClass, container } from "@/components/ui/styles";

/** Shown when a shop page fails to render: what happened, and a way to try again. */
export default function LocaleError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("Common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className={`${container} grid min-h-[60dvh] place-items-center py-16`}>
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-warning-soft text-warning">
          <WarningCircleIcon aria-hidden="true" className="size-7" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold leading-none tracking-tighter">{t("errorTitle")}</h1>
        <p className="mt-3 leading-relaxed text-fg-muted">{t("errorText")}</p>
        <button type="button" onClick={() => retry()} className={`${buttonClass("primary", "md")} mt-7`}>
          <ArrowCounterClockwiseIcon aria-hidden="true" className="size-5" />
          {t("retry")}
        </button>
      </div>
    </section>
  );
}
