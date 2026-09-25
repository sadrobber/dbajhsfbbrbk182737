import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { OpenAdvisorButton } from "@/components/advisor/advisor-buttons";
import { buttonClass, container } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";

export default function NotFoundPage() {
  const t = useTranslations("NotFound");
  const common = useTranslations("Common");
  const advisor = useTranslations("Advisor");
  return (
    <section className={`${container} py-20 sm:py-28`}>
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <p className="font-display text-7xl font-extrabold text-accent-text">404</p>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">{t("title")}</h1>
        <p className="mt-4 text-lg text-fg-muted">{t("text")}</p>
        <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Link href="/" className={buttonClass("dark", "lg")}>
            <ArrowLeft aria-hidden="true" className="size-5" />
            {common("backHome")}
          </Link>
          <OpenAdvisorButton label={advisor("launcher")} />
        </div>
      </div>
    </section>
  );
}
