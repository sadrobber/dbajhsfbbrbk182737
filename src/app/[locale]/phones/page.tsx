import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/ui/placeholder-page";
import { resolveRouteLocale } from "@/i18n/server";

type PageKey = "phones" | "iphone" | "samsung" | "otherBrands" | "new" | "refurbished";

/** /phones?brand=apple|samsung|other and /phones?condition=new|refurbished */
function pageKey(query: Record<string, string | string[] | undefined>): PageKey {
  const brand = typeof query.brand === "string" ? query.brand : undefined;
  const condition = typeof query.condition === "string" ? query.condition : undefined;
  if (brand === "apple") return "iphone";
  if (brand === "samsung") return "samsung";
  if (brand === "other") return "otherBrands";
  if (condition === "new") return "new";
  if (condition === "refurbished") return "refurbished";
  return "phones";
}

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/phones">): Promise<Metadata> {
  const t = await getTranslations({ locale: await resolveRouteLocale(params), namespace: "Placeholder" });
  return { title: t(`pages.${pageKey(await searchParams)}`) };
}

export default async function PhonesPage({ params, searchParams }: PageProps<"/[locale]/phones">) {
  await resolveRouteLocale(params);
  const t = await getTranslations("Placeholder");
  return <PlaceholderPage title={t(`pages.${pageKey(await searchParams)}`)} />;
}
