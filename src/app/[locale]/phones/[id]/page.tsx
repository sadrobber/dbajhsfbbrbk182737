import { ArrowsLeftRightIcon as ArrowLeftRight, ClockIcon as Clock, CreditCardIcon as CreditCard, ChatTextIcon as MessageSquareText, ShoppingBagIcon as ShoppingBag, StorefrontIcon as Store } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { addToCartAction } from "@/app/[locale]/cart/actions";
import { OpenAdvisorButton } from "@/components/advisor/advisor-buttons";
import { Availability, ProductBadge, visualBackdrop } from "@/components/product/product-bits";
import { ProductPicture } from "@/components/product/product-picture";
import { buttonClass, container } from "@/components/ui/styles";
import { getTranslator } from "@/i18n/messages";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { supplyOf } from "@/lib/data/catalog-logic";
import { getCatalogItems, getItem, getMerchandising } from "@/lib/data/queries";
import type { Supply } from "@/lib/data/schema";
import { paths } from "@/lib/paths";
import { buildProductCardView } from "@/lib/product-view";

export async function generateStaticParams() {
  return (await getCatalogItems()).map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/phones/[id]">): Promise<Metadata> {
  const { id } = await params;
  const item = await getItem(id);
  return item ? { title: `${item.brandName} ${item.model}` } : {};
}

const SUPPLY_ICONS: Record<Supply, typeof Store> = { in_store: Store, within_48h: Clock, on_request: MessageSquareText };

/** Product page: the phone, how it can be ordered right now, and the button to do it. */
export default async function ProductPage({ params }: PageProps<"/[locale]/phones/[id]">) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const item = await getItem(id);
  if (!item) notFound();
  const settings = await getMerchandising();
  const t = getTranslator(locale);
  const card = buildProductCardView(item, { t, locale, lowStockThreshold: settings.lowStockThreshold });
  const details = [card.storageLabel, card.colorLabel, card.conditionLabel, card.gradeLabel, card.batteryLabel, card.warrantyLabel]
    .filter(Boolean)
    .join(" · ");
  const supply = supplyOf(item);
  const SupplyIcon = supply ? SUPPLY_ICONS[supply] : null;

  return (
    <section className={`${container} py-10 sm:py-16`}>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <div
          className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-line bg-surface-1 sm:aspect-square"
          style={{ backgroundImage: visualBackdrop(card.color) }}
        >
          <ProductPicture
            photo={card.photo}
            color={card.color}
            visual={card.visual}
            sizes="(min-width: 1024px) 40rem, 100vw"
            photoClassName="p-8"
            className="fade-bottom absolute bottom-[-8%] left-1/2 h-[92%] -translate-x-1/2"
          />
        </div>

        <div className="grid gap-5">
          {card.badges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {card.badges.map((badge) => (
                <ProductBadge key={badge.key} badge={badge.key} label={badge.label} />
              ))}
            </div>
          )}
          <div>
            <p className="font-semibold text-fg-muted">{card.brandName}</p>
            <h1 className="text-balance font-display text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
              {card.model}
            </h1>
            <p className="mt-3 text-fg-muted">{details}</p>
          </div>

          <div>
            <p className="flex flex-wrap items-baseline gap-x-3 font-display text-4xl font-extrabold">
              {card.price}
              {card.compareAtPrice && (
                <s className="text-xl font-semibold text-fg-subtle">
                  <span className="sr-only">{t("Product.previousPrice")} </span>
                  {card.compareAtPrice}
                </s>
              )}
            </p>
            {card.newVersionPrice && <p className="mt-1 text-[0.9375rem] text-fg-subtle">{card.newVersionPrice}</p>}
            {card.saving && <p className="mt-1 font-semibold text-success">{card.saving}</p>}
            <Availability tone={card.availability.tone} label={card.availability.label} className="mt-3" />
          </div>

          {supply && SupplyIcon ? (
            <>
              <div className="flex gap-4 rounded-3xl border border-line bg-surface-1 p-5">
                <SupplyIcon aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-accent-text" />
                <div>
                  <h2 className="font-display text-lg font-bold">{t(`ProductPage.supply.${supply}.title`)}</h2>
                  <p className="mt-1 text-fg-muted">{t(`ProductPage.supply.${supply}.text`)}</p>
                </div>
              </div>
              <form action={addToCartAction.bind(null, "product", item.id, locale)}>
                <button type="submit" className={buttonClass("primary", "lg") + " w-full sm:w-auto"}>
                  {supply === "on_request" ? (
                    <MessageSquareText aria-hidden="true" className="size-5" />
                  ) : supply === "within_48h" ? (
                    <CreditCard aria-hidden="true" className="size-5" />
                  ) : (
                    <ShoppingBag aria-hidden="true" className="size-5" />
                  )}
                  {supply === "on_request" ? t("ProductPage.requestIt") : t("ProductPage.addToCart")}
                </button>
              </form>
            </>
          ) : (
            <div className="grid justify-items-start gap-4">
              <p className="text-fg-muted">{t("ProductPage.soldOut")}</p>
              <OpenAdvisorButton label={t("Advisor.launcher")} />
            </div>
          )}

          <Link
            href={`${paths.compare()}?want=${encodeURIComponent(item.modelId)}`}
            className="inline-flex min-h-11 items-center gap-2 justify-self-start font-semibold text-accent-text underline-offset-4 hover:underline"
          >
            <ArrowLeftRight aria-hidden="true" className="size-5" />
            {t("ProductPage.compare")}
          </Link>
        </div>
      </div>
    </section>
  );
}
