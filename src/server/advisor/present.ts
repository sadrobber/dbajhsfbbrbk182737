import { getTranslator } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";
import type { AdvisorCurrentPhone, AdvisorReply, AssistantMemory } from "@/lib/advisor/contract";
import { modelTitle } from "@/lib/compare/pairs";
import type { TradeInEstimate } from "@/lib/data/pricing";
import type { CatalogItem, Merchandising, PhoneModel } from "@/lib/data/schema";
import { formatPrice } from "@/lib/format";
import { translateDynamic } from "@/lib/i18n-dynamic";
import { localizedPath, paths } from "@/lib/paths";
import { buildProductCardView, storageLabel } from "@/lib/product-view";

/** The customer's current phone and its best-case trade-in estimate (null: the shop doesn't list one). */
export type CurrentPhoneContext = { model: PhoneModel; estimate: TradeInEstimate | null };

/** Adds everything the chat panel needs to draw cards, in the reply language. */
export function presentReply(
  memory: AssistantMemory,
  context: {
    engine: AdvisorReply["engine"];
    items: CatalogItem[];
    settings: Merchandising;
    siteLocale: Locale;
    current?: CurrentPhoneContext | null;
  },
): AdvisorReply {
  const { items, settings, siteLocale } = context;
  const current = context.current ?? null;
  const locale = memory.language;
  const t = getTranslator(locale);
  const byId = new Map(items.map((item) => [item.id, item]));

  const currentPhone: AdvisorCurrentPhone | null = current && {
    modelId: current.model.id,
    title: t("AdvisorReply.yourPhone"),
    name: modelTitle(current.model),
    tradeIn: current.estimate
      ? t("AdvisorReply.tradeInUpTo", {
          amount: formatPrice(locale, current.estimate.storeCreditAmount),
          storage: storageLabel(t, current.estimate.storageGb),
        })
      : t("AdvisorReply.tradeInNone"),
    note: current.estimate ? t("AdvisorReply.tradeInNote") : null,
  };

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
          compare:
            current && current.model.id !== item.modelId
              ? {
                  href: localizedPath(siteLocale, paths.compare(current.model.id, item.modelId)),
                  label: t("AdvisorReply.compareWith", { phone: current.model.name }),
                }
              : null,
          afterTradeIn: current?.estimate
            ? t("AdvisorReply.afterTradeIn", {
                price: formatPrice(locale, Math.max(0, item.price - current.estimate.storeCreditAmount)),
              })
            : null,
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
    currentPhone,
    labels: { packagesTitle: t("Advisor.packagesTitle") },
    engine: context.engine,
    memory,
  };
}
