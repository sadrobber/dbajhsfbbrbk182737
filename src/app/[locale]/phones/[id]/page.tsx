import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ProductPicture } from "@/components/product/product-picture";
import { Availability, visualBackdrop } from "@/components/product/product-bits";
import { PlaceholderPage } from "@/components/ui/placeholder-page";
import { getTranslator } from "@/i18n/messages";
import { routing } from "@/i18n/routing";
import { getCatalogItems, getItem, getMerchandising } from "@/lib/data/queries";
import { buildProductCardView } from "@/lib/product-view";

export async function generateStaticParams() {
  return (await getCatalogItems()).map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/phones/[id]">): Promise<Metadata> {
  const { id } = await params;
  const item = await getItem(id);
  return item ? { title: `${item.brandName} ${item.model}` } : {};
}

/** Placeholder product page: the real one (photos, specs, add to cart) comes later. */
export default async function ProductPage({ params }: PageProps<"/[locale]/phones/[id]">) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const item = await getItem(id);
  if (!item) notFound();
  const settings = await getMerchandising();
  const card = buildProductCardView(item, {
    t: getTranslator(locale),
    locale,
    lowStockThreshold: settings.lowStockThreshold,
  });
  const details = [card.storageLabel, card.colorLabel, card.conditionLabel, card.gradeLabel, card.batteryLabel, card.warrantyLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <PlaceholderPage title={`${card.brandName} ${card.model}`}>
      <div className="mt-8 flex w-full max-w-lg items-center gap-5 rounded-[2rem] border border-line bg-surface-1 p-5 text-left">
        <div
          className="relative h-40 w-28 shrink-0 overflow-hidden rounded-2xl bg-surface-2"
          style={{ backgroundImage: visualBackdrop(card.color) }}
        >
          <ProductPicture
            photo={card.photo}
            color={card.color}
            visual={card.visual}
            sizes="7rem"
            photoClassName="p-2"
            className="fade-bottom absolute bottom-[-20%] left-1/2 h-[112%] -translate-x-1/2"
          />
        </div>
        <div className="min-w-0">
          <p className="text-fg-muted">{details}</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{card.price}</p>
          {card.newVersionPrice && <p className="text-[0.9375rem] text-fg-subtle">{card.newVersionPrice}</p>}
          <Availability tone={card.availability.tone} label={card.availability.label} className="mt-2" />
        </div>
      </div>
    </PlaceholderPage>
  );
}
