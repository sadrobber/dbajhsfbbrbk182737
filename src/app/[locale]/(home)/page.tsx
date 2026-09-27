import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CloseToYou } from "@/components/home/close-to-you";
import { GaugeSection } from "@/components/home/gauge-section";
import { Hero } from "@/components/home/hero";
import { PackagesSection } from "@/components/home/packages-section";
import { GreatDeals, RefurbishedPicks } from "@/components/home/product-sections";
import { TradeInSection } from "@/components/home/trade-in-section";
import { getTranslator } from "@/i18n/messages";
import { routing } from "@/i18n/routing";
import { getGreatDeals, getMerchandising, getRefurbishedPicks } from "@/lib/data/queries";
import { localizedPath } from "@/lib/paths";
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

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [deals, refurbished, settings] = await Promise.all([
    getGreatDeals(),
    getRefurbishedPicks(),
    getMerchandising(),
  ]);
  const t = getTranslator(locale);
  const toCard = (item: (typeof refurbished)[number]) =>
    buildProductCardView(item, { t, locale, lowStockThreshold: settings.lowStockThreshold });
  const toDealCard = (item: (typeof deals)[number]) =>
    buildProductCardView(item, { t, locale, lowStockThreshold: settings.lowStockThreshold, promo: item.promo });

  return (
    <>
      <Hero />
      <GreatDeals products={deals.map(toDealCard)} />
      <RefurbishedPicks products={refurbished.map(toCard)} />
      <PackagesSection packages={settings.packages} locale={locale} />
      {settings.gauge.enabled && <GaugeSection gauge={settings.gauge} locale={locale} />}
      <TradeInSection />
      <CloseToYou area={settings.serviceArea} />
    </>
  );
}
