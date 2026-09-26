import type { Translator } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";
import { localize, type PackageDefinition } from "@/lib/data/schema";
import { formatPrice } from "@/lib/format";
import { translateDynamic } from "@/lib/i18n-dynamic";
import { localizedPath, paths } from "@/lib/paths";
import type { PackageCardView } from "@/components/product/package-card";

/** Package card content in one language. Names and taglines come from messages, contents from data/packages.json. */
export function buildPackageCardView(pkg: PackageDefinition, t: Translator, locale: Locale): PackageCardView {
  return {
    price: formatPrice(locale, pkg.price),
    icon: pkg.icon,
    name: translateDynamic(t, `Packages.${pkg.id}.name`),
    tagline: translateDynamic(t, `Packages.${pkg.id}.tagline`),
    items: pkg.items.map((item) => ({ id: item.id, icon: item.icon, label: localize(item.label, locale), todo: item.todo })),
    labels: {
      includes: t("Packages.includes"),
      todo: t("Common.todo"),
      todoHint: t("Common.todoHint"),
      learnMore: t("Packages.learnMore"),
    },
    href: localizedPath(locale, paths.package(pkg.id)),
  };
}
