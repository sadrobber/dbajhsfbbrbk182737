import { ArrowRight, RefreshCw } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PhoneVisual } from "@/components/product/phone-visual";
import { buttonClass, container } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { paths } from "@/lib/paths";

export async function TradeInSection() {
  const t = await getTranslations("TradeIn");
  return (
    <section aria-labelledby="trade-in-title" className={`${container} reveal py-14 sm:py-20`}>
      <div className="relative grid items-center gap-8 overflow-hidden rounded-[2.5rem] border border-line bg-[linear-gradient(135deg,#0d0d12,#101a33_60%,#0b1a33)] px-6 py-10 sm:px-10 sm:py-12 md:grid-cols-[1.2fr_0.8fr] lg:px-14">
        <div>
          <h2
            id="trade-in-title"
            className="text-balance font-display text-[2rem] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[2.75rem]"
          >
            {t("title")}
          </h2>
          <p className="mt-3 max-w-lg text-lg text-fg-muted sm:text-xl">{t("subtitle")}</p>
          <Link href={paths.tradeIn} className={`${buttonClass("primary", "lg")} mt-7`}>
            {t("cta")}
            <ArrowRight aria-hidden="true" className="size-5" />
          </Link>
        </div>
        <div aria-hidden="true" className="relative mx-auto flex h-56 w-full max-w-xs items-center justify-center sm:h-64">
          <PhoneVisual color="grey" visual="single" className="absolute left-[8%] h-[78%] -rotate-[10deg] opacity-60 grayscale" />
          <span className="relative z-10 grid size-16 place-items-center rounded-full bg-accent text-white shadow-glow">
            <RefreshCw className="size-8" />
          </span>
          <PhoneVisual color="blue" visual="duo" className="absolute right-[8%] h-[92%] rotate-[8deg]" />
        </div>
      </div>
    </section>
  );
}
