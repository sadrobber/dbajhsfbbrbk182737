import type { Translator } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";
import type { AssistantMemory } from "@/lib/advisor/contract";
import type { CatalogItem } from "@/lib/data/schema";
import { formatPercent, formatPrice } from "@/lib/format";
import { gradeLabel } from "@/lib/product-view";
import type { Pick, Plan } from "./recommend";
import { BRAND_DISPLAY_NAMES, type Budget, type Intent } from "./understand";

/** Turns a demo plan into the advisor's words, in the customer's language. */
export function composeReply(
  plan: Plan,
  intent: Intent,
  context: { t: Translator; locale: Locale; brandNames: Map<string, string> },
): AssistantMemory {
  const { t, locale } = context;
  const base = { language: locale, recommendations: [], packages: [], quickReplies: [] };

  if (plan.kind === "question") {
    return {
      ...base,
      type: "question",
      message: t("AdvisorReply.askBudget"),
      quickReplies: [
        t("AdvisorReply.quickReplies.low"),
        t("AdvisorReply.quickReplies.mid"),
        t("AdvisorReply.quickReplies.high"),
        t("AdvisorReply.quickReplies.unsure"),
      ],
    };
  }

  if (plan.kind === "nothing") {
    return { ...base, type: "no_match", message: t("AdvisorReply.nothingInStock") };
  }

  const brandName = (id: string) => context.brandNames.get(id) ?? BRAND_DISPLAY_NAMES[id] ?? id;
  const rightChoice = plan.picks[0].item;

  let message: string;
  switch (plan.notice) {
    case "popular":
      message = t("AdvisorReply.popular");
      break;
    case "noBrand":
      message = t("AdvisorReply.noBrand", { brand: brandName(plan.missingBrand ?? "") });
      break;
    case "closest":
      message = t("AdvisorReply.closest");
      break;
    default:
      message = introMessage(intent, plan.statedBudget, context, brandName);
  }

  return {
    ...base,
    type: plan.notice === "noBrand" ? "no_match" : "recommendations",
    message,
    recommendations: plan.picks.map((pick) => ({
      slot: pick.slot,
      productId: pick.item.id,
      reason: reasonFor(pick, rightChoice, plan.statedBudget, context),
    })),
    packages: plan.packages,
  };
}

function introMessage(
  intent: Intent,
  budget: Budget | null,
  { t, locale }: { t: Translator; locale: Locale },
  brandName: (id: string) => string,
): string {
  const parts: string[] = [];
  if (intent.brands.length === 1) parts.push(t("AdvisorReply.introBrand", { brand: brandName(intent.brands[0]) }));
  else if (intent.otherBrands) parts.push(t("AdvisorReply.introOtherBrands"));

  if (budget) {
    const price = (amount: number) => formatPrice(locale, amount);
    switch (budget.kind) {
      case "max":
        parts.push(t("AdvisorReply.budgetMax", { amount: price(budget.amount) }));
        break;
      case "around":
        parts.push(t("AdvisorReply.budgetAround", { amount: price(budget.amount) }));
        break;
      case "min":
        parts.push(t("AdvisorReply.budgetMin", { amount: price(budget.amount) }));
        break;
      case "range":
        parts.push(t("AdvisorReply.budgetRange", { min: price(budget.min), max: price(budget.max) }));
        break;
    }
  }
  if (parts.length === 0) return t("AdvisorReply.safeIntro");
  return t("AdvisorReply.intro", { details: ` ${parts.join(" ")}` });
}

function conditionPhrase(item: CatalogItem, { t, locale }: { t: Translator; locale: Locale }): string {
  if (item.condition === "refurbished" && item.grade && item.batteryHealth !== null) {
    return t("AdvisorReply.reasons.refurbished", {
      grade: gradeLabel(t, item.grade),
      battery: formatPercent(locale, item.batteryHealth),
    });
  }
  return t("AdvisorReply.reasons.brandNew", { months: item.warrantyMonths });
}

/** One short line, two facts at most: price position, then what the phone is good at. */
function reasonFor(
  pick: Pick,
  rightChoice: CatalogItem,
  budget: Budget | null,
  context: { t: Translator; locale: Locale },
): string {
  const { t, locale } = context;
  const parts: string[] = [];

  if (pick.slot === "right_choice") {
    if (budget) parts.push(t(pick.fitsBudget ? "AdvisorReply.reasons.fitsBudget" : "AdvisorReply.reasons.closestToBudget"));
  } else if (pick.slot === "smart_deal") {
    parts.push(t("AdvisorReply.reasons.cheaperBy", { amount: formatPrice(locale, rightChoice.price - pick.item.price) }));
  } else {
    parts.push(t("AdvisorReply.reasons.moreBy", { amount: formatPrice(locale, pick.item.price - rightChoice.price) }));
  }

  const use = pick.matchedUses[0] ?? pick.item.goodFor[0];
  parts.push(t(`AdvisorReply.reasons.uses.${use}`));
  if (parts.length < 2) parts.push(conditionPhrase(pick.item, context));

  return parts.slice(0, 2).join(" · ");
}
