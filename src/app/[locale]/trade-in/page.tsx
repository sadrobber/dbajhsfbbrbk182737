import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/ui/placeholder-page";
import { resolveRouteLocale } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/trade-in">): Promise<Metadata> {
  const t = await getTranslations({ locale: await resolveRouteLocale(params), namespace: "Placeholder" });
  return { title: t("pages.tradeIn") };
}

export default async function TradeInPage({ params }: PageProps<"/[locale]/trade-in">) {
  await resolveRouteLocale(params);
  const t = await getTranslations("Placeholder");
  return <PlaceholderPage title={t("pages.tradeIn")} />;
}
