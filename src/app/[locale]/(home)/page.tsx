import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { GaugeSection } from "@/components/home/gauge-section";
import { Hero, type HeroFacts } from "@/components/home/hero";
import { PackagesSection } from "@/components/home/packages-section";
import { GreatDeals, RefurbishedPicks } from "@/components/home/product-sections";
import { type CompareShowcase, ServicesBento } from "@/components/home/services-bento";
import { getTranslator } from "@/i18n/messages";
import { type Locale, routing } from "@/i18n/routing";
import { compareSpecs } from "@/lib/compare/specs";
import { getAvailableItems, getGreatDeals, getMerchandising, getModel, getRefurbishedPicks } from "@/lib/data/queries";
import type { CatalogItem } from "@/lib/data/schema";
import { formatPrice } from "@/lib/format";
import { localizedPath, paths } from "@/lib/paths";
import { buildProductCardView } from "@/lib/product-view";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  return {
    alternates: {
      canonical: localizedPath(locale, "/"),
      languages: Object.fromEntries([
        ...routing.locales.map((l) => [l, localizedPath(l, "/")]),
        ["x-default", localizedPath(routing.defaultLocale, "/")],
      ]),
    },
  };
}

/** The pair shown in the compare tile: a common upgrade, with its real specs. */
const SHOWCASE = { mine: "apple-iphone-12", want: "apple-iphone-16" } as const;
const SHOWCASE_ROWS = ["mainCamera", "battery", "wireless", "wifi", "released"];

async function compareShowcase(locale: Locale): Promise<CompareShowcase | null> {
  const [mine, want] = await Promise.all([getModel(SHOWCASE.mine), getModel(SHOWCASE.want)]);
  if (!mine || !want) return null;
  const rows = compareSpecs(mine, want, getTranslator(locale), locale)
    .flatMap((section) => section.rows)
    .filter((row) => SHOWCASE_ROWS.includes(row.key) && row.better === "want" && row.mine && row.want)
    .sort((a, b) => SHOWCASE_ROWS.indexOf(a.key) - SHOWCASE_ROWS.indexOf(b.key))
    .slice(0, 4)
    .map((row) => ({ label: row.label, mine: row.mine!, want: row.want! }));
  return rows.length > 0 ? { mine: mine.name, want: want.name, href: paths.compare(mine.id, want.id), rows } : null;
}

/** Figures for the hero, from what is in stock today. */
function heroFacts(items: CatalogItem[], locale: Locale): HeroFacts {
  const refurbished = items.filter((item) => item.condition === "refurbished").map((item) => item.price);
  const warranty = items.map((item) => item.warrantyMonths);
  return {
    phones: items.reduce((sum, item) => sum + item.stock, 0),
    refurbishedFrom: refurbished.length > 0 ? formatPrice(locale, Math.min(...refurbished)) : null,
    warrantyMonths: warranty.length > 0 ? Math.max(...warranty) : null,
  };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [deals, refurbished, settings, available, showcase] = await Promise.all([
    getGreatDeals(),
    getRefurbishedPicks(),
    getMerchandising(),
    getAvailableItems(),
    compareShowcase(locale),
  ]);
  const t = getTranslator(locale);
  const toCard = (item: (typeof refurbished)[number]) =>
    buildProductCardView(item, { t, locale, lowStockThreshold: settings.lowStockThreshold });
  const toDealCard = (item: (typeof deals)[number]) =>
    buildProductCardView(item, { t, locale, lowStockThreshold: settings.lowStockThreshold, promo: item.promo });

  return (
    <>
      <Hero facts={heroFacts(available, locale)} />
      <GreatDeals products={deals.map(toDealCard)} />
      <ServicesBento area={settings.serviceArea} compare={showcase} />
      <RefurbishedPicks products={refurbished.map(toCard)} />
      <PackagesSection packages={settings.packages} locale={locale} />
      {settings.gauge.enabled && <GaugeSection gauge={settings.gauge} locale={locale} />}
    </>
  );
}
