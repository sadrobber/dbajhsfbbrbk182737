import { getTranslator } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";
import type { AdvisorReply, AssistantMemory } from "@/lib/advisor/contract";
import type { CatalogItem, Merchandising } from "@/lib/data/schema";
import { formatPrice } from "@/lib/format";
import { translateDynamic } from "@/lib/i18n-dynamic";
import { localizedPath, paths } from "@/lib/paths";
import { buildProductCardView } from "@/lib/product-view";

/** Adds everything the chat panel needs to draw cards, in the reply language. */
export function presentReply(
  memory: AssistantMemory,
  context: { engine: AdvisorReply["engine"]; items: CatalogItem[]; settings: Merchandising; siteLocale: Locale },
): AdvisorReply {
  const { items, settings, siteLocale } = context;
  const locale = memory.language;
  const t = getTranslator(locale);
  const byId = new Map(items.map((item) => [item.id, item]));

  return {
    language: locale,
    type: memory.type,
    message: memory.message,
    cards: memory.recommendations.flatMap((rec) => {
      const item = byId.get(rec.productId);
      if (!item) return [];
      return [
        {
          slot: rec.slot,
          slotLabel: t(`Advisor.slots.${rec.slot}`),
          reason: rec.reason,
          product: buildProductCardView(item, {
            t,
            locale,
            hrefLocale: siteLocale,
            lowStockThreshold: settings.lowStockThreshold,
          }),
        },
      ];
    }),
    packages: memory.packages.flatMap((id) => {
      const pkg = settings.packages.find((p) => p.id === id);
      if (!pkg) return [];
      return [
        {
          id,
          icon: pkg.icon,
          name: translateDynamic(t, `Packages.${id}.name`),
          tagline: translateDynamic(t, `Packages.${id}.tagline`),
          price: formatPrice(locale, pkg.price),
          href: localizedPath(siteLocale, paths.package(id)),
          learnMore: t("Packages.learnMore"),
        },
      ];
    }),
    quickReplies: memory.quickReplies,
    labels: { packagesTitle: t("Advisor.packagesTitle") },
    engine: context.engine,
    memory,
  };
}
