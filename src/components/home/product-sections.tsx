import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { DealCard } from "@/components/product/deal-card";
import { RefurbCard } from "@/components/product/refurb-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { container } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { paths } from "@/lib/paths";
import type { ProductCardView } from "@/lib/product-view";
import { ScrollRow } from "./scroll-row";

/** Great Deals: an editorial column on the left, the deals scrolling on the right. */
export async function GreatDeals({ products }: { products: ProductCardView[] }) {
  if (products.length === 0) return null;
  const [t, product, common] = await Promise.all([getTranslations("Deals"), getTranslations("Product"), getTranslations("Common")]);
  return (
    <section aria-labelledby="deals-title" className={`${container} reveal py-16 sm:py-24`}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
        <div className="lg:pt-6">
          <h2 id="deals-title" className="text-balance font-display text-3xl font-bold leading-none tracking-tighter md:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-4 max-w-[36ch] text-base leading-relaxed text-fg-muted md:text-lg">{t("subtitle")}</p>
          <Link
            href={paths.deals}
            className="group mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-accent-text underline-offset-4 hover:underline"
          >
            {t("seeAll")}
            <ArrowRightIcon aria-hidden="true" className="size-5 transition group-hover:translate-x-1" />
          </Link>
        </div>
        <ScrollRow label={t("title")} labels={{ previous: common("scrollPrevious"), next: common("scrollNext") }}>
          {products.map((item) => (
            <DealCard key={item.id} product={item} labels={{ view: product("view"), previousPrice: product("previousPrice") }} />
          ))}
        </ScrollRow>
      </div>
    </section>
  );
}

/** Refurbished picks: the heading across the top, then the row. */
export async function RefurbishedPicks({ products }: { products: ProductCardView[] }) {
  if (products.length === 0) return null;
  const [t, common] = await Promise.all([getTranslations("Refurbished"), getTranslations("Common")]);
  return (
    <section aria-labelledby="refurbished-title" className={`${container} reveal py-16 sm:py-24`}>
      <SectionHeading
        id="refurbished-title"
        title={t("title")}
        subtitle={t("subtitle")}
        link={{ href: paths.phones("refurbished"), label: t("seeAll") }}
      />
      <ScrollRow label={t("title")} labels={{ previous: common("scrollPrevious"), next: common("scrollNext") }}>
        {products.map((item) => (
          <RefurbCard key={item.id} product={item} />
        ))}
      </ScrollRow>
    </section>
  );
}
