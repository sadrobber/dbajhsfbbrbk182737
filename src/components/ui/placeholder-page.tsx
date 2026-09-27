import { ArrowLeftIcon as ArrowLeft, HammerIcon as Hammer } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { OpenAdvisorButton } from "@/components/advisor/advisor-buttons";
import { Link } from "@/i18n/navigation";
import { buttonClass, container, eyebrow } from "./styles";

/** Friendly "coming soon" page for routes that exist in the URL plan but not yet in the product. */
export async function PlaceholderPage({ title, children }: { title: string; children?: ReactNode }) {
  const t = await getTranslations("Placeholder");
  const common = await getTranslations("Common");

  return (
    <section className={`${container} py-16 sm:py-24`}>
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <p className={eyebrow}>
          <Hammer aria-hidden="true" className="size-4 text-accent-text" />
          {t("badge")}
        </p>
        <h1 className="mt-5 text-balance font-display text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-6xl">
          {title}
        </h1>
        {children}
        <p className="mt-5 max-w-xl text-lg text-fg-muted sm:text-xl">{t("text")}</p>
        <div className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <OpenAdvisorButton label={t("askAdvisor")} />
          <Link href="/" className={buttonClass("secondary", "lg")}>
            <ArrowLeft aria-hidden="true" className="size-5" />
            {common("backHome")}
          </Link>
        </div>
      </div>
    </section>
  );
}
