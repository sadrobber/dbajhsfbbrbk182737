import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/ui/placeholder-page";
import { resolveRouteLocale } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/legal">): Promise<Metadata> {
  const t = await getTranslations({ locale: await resolveRouteLocale(params), namespace: "Placeholder" });
  return { title: t("pages.legal") };
}

export default async function LegalPage({ params }: PageProps<"/[locale]/legal">) {
  await resolveRouteLocale(params);
  const t = await getTranslations("Placeholder");
  return <PlaceholderPage title={t("pages.legal")} />;
}
