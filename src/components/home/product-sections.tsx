import { getTranslations } from "next-intl/server";
import { DealCard } from "@/components/product/deal-card";
import { RefurbCard } from "@/components/product/refurb-card";
import { Carousel } from "@/components/ui/carousel";
import { SectionHeading } from "@/components/ui/section-heading";
import { container } from "@/components/ui/styles";
import { paths } from "@/lib/paths";
import type { ProductCardView } from "@/lib/product-view";

export async function GreatDeals({ products }: { products: ProductCardView[] }) {
  if (products.length === 0) return null;
  const t = await getTranslations("Deals");
  const product = await getTranslations("Product");
  return (
    <section aria-labelledby="deals-title" className={`${container} reveal py-14 sm:py-20`}>
      <SectionHeading
        id="deals-title"
        title={t("title")}
        subtitle={t("subtitle")}
        link={{ href: paths.deals, label: t("seeAll") }}
      />
      <Carousel label={t("title")}>
        {products.map((item) => (
          <DealCard key={item.id} product={item} labels={{ view: product("view"), previousPrice: product("previousPrice") }} />
        ))}
      </Carousel>
    </section>
  );
}

export async function RefurbishedPicks({ products }: { products: ProductCardView[] }) {
  if (products.length === 0) return null;
  const t = await getTranslations("Refurbished");
  return (
    <section aria-labelledby="refurbished-title" className={`${container} reveal py-14 sm:py-20`}>
      <SectionHeading
        id="refurbished-title"
        title={t("title")}
        subtitle={t("subtitle")}
        link={{ href: paths.phones("refurbished"), label: t("seeAll") }}
      />
      <Carousel label={t("title")}>
        {products.map((item) => (
          <RefurbCard key={item.id} product={item} />
        ))}
      </Carousel>
    </section>
  );
}
