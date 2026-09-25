import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/ui/placeholder-page";
import { routing } from "@/i18n/routing";
import { getPackage, getPackages } from "@/lib/data/queries";
import { formatPrice } from "@/lib/format";
import { translateDynamic } from "@/lib/i18n-dynamic";

export async function generateStaticParams() {
  return (await getPackages()).map((pkg) => ({ id: pkg.id }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/packages/[id]">): Promise<Metadata> {
  const { locale, id } = await params;
  const pkg = await getPackage(id);
  if (!pkg || !hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Packages" });
  return { title: translateDynamic(t, `${pkg.id}.name`) };
}

export default async function PackagePage({ params }: PageProps<"/[locale]/packages/[id]">) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const pkg = await getPackage(id);
  if (!pkg) notFound();
  const t = await getTranslations("Packages");

  return (
    <PlaceholderPage title={translateDynamic(t, `${pkg.id}.name`)}>
      <p className="mt-4 font-display text-4xl font-extrabold">{formatPrice(locale, pkg.price)}</p>
      <p className="mt-2 text-lg text-fg-muted">{translateDynamic(t, `${pkg.id}.tagline`)}</p>
    </PlaceholderPage>
  );
}
