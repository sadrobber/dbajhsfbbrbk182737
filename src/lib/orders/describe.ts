import type { Translator } from "@/i18n/messages";
import type { CatalogItem, PackageDefinition } from "@/lib/data/schema";
import { translateDynamic } from "@/lib/i18n-dynamic";
import type { Locale } from "@/i18n/routing";
import { colorLabel, gradeLabel, storageLabel } from "@/lib/product-view";

/** "Apple iPhone 16 · 128 GB · Teal", plus the grade for refurbished phones. */
export function describeProduct(t: Translator, locale: Locale, item: CatalogItem): string {
  const parts = [`${item.brandName} ${item.model}`, storageLabel(t, item.storageGb), colorLabel(t, locale, item)];
  if (item.condition === "refurbished") {
    parts.push(`${t("Product.condition.refurbished")}${item.grade ? ` (${gradeLabel(t, item.grade)})` : ""}`);
  }
  return parts.join(" · ");
}

export function describePackage(t: Translator, pkg: PackageDefinition): string {
  return translateDynamic(t, `Packages.${pkg.id}.name`);
}
