import { getTranslator } from "@/i18n/messages";
import { isLocale, type Locale } from "@/i18n/routing";
import { REPLY_TYPES, SLOTS, type AssistantMemory, type ReplyType, type Slot } from "@/lib/advisor/contract";
import type { CatalogItem } from "@/lib/data/schema";
import type { ModelOutput } from "./output-schema";

/**
 * Safety net between the language model and the customer. Whatever the model
 * returns, only phones that exist and are in stock reach the screen, with at
 * most one per slot and consistent prices, and no invented amounts in the text.
 * Returns null when nothing usable is left (the demo engine answers instead).
 */

const MAX_MESSAGE = 480;
const MAX_REASON = 140;
const MAX_QUICK_REPLY = 48;

export function sanitizeText(text: string, max: number): string {
  let clean = text
    .replace(/[*_`#>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length > max) {
    const cut = clean.slice(0, max);
    const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
    clean = sentenceEnd > max * 0.5 ? cut.slice(0, sentenceEnd + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
  }
  return clean;
}

const AMOUNT = /€\s?(\d[\d\s.,  ]*\d|\d)|(\d[\d\s.,  ]*\d|\d)\s?(?:€|euros?\b|eur\b)/gi;

function parseAmount(raw: string): number {
  const compact = raw.replace(/[\s  ]/g, "");
  if (/[.,]\d{2}$/.test(compact)) {
    return Math.round(Number(`${compact.slice(0, -3).replace(/[.,]/g, "")}.${compact.slice(-2)}`));
  }
  return Number(compact.replace(/[.,]/g, ""));
}

/** Euro amounts written in a text: "€449", "1 299 €", "79 euros". */
export function amountsIn(text: string): number[] {
  return [...text.matchAll(AMOUNT)].map((match) => parseAmount(match[1] ?? match[2]));
}

const isSlot = (value: string): value is Slot => (SLOTS as readonly string[]).includes(value);
const isReplyType = (value: string): value is ReplyType => (REPLY_TYPES as readonly string[]).includes(value);

export type GuardContext = {
  /** Phones in stock. */
  items: CatalogItem[];
  packageIds: string[];
  packagePrices: number[];
  /** Amounts the customer wrote themselves. */
  customerNumbers: number[];
  siteLocale: Locale;
};

export function guardModelOutput(output: ModelOutput, context: GuardContext): AssistantMemory | null {
  const language: Locale = isLocale(output.language) ? output.language : context.siteLocale;
  const inStock = new Map(context.items.filter((item) => item.stock > 0).map((item) => [item.id, item]));

  // Known phones in stock only, one per product and per slot, in slot order.
  const seenIds = new Set<string>();
  const seenSlots = new Set<Slot>();
  let picks: { slot: Slot; reason: string; item: CatalogItem }[] = [];
  for (const rec of output.recommendations ?? []) {
    const item = inStock.get(rec.productId);
    if (!item || !isSlot(rec.slot) || seenIds.has(item.id) || seenSlots.has(rec.slot)) continue;
    seenIds.add(item.id);
    seenSlots.add(rec.slot);
    picks.push({ slot: rec.slot, reason: rec.reason ?? "", item });
  }
  picks.sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));

  // A cheaper or pricier alternative only makes sense next to a Right Choice.
  if (picks.length > 0 && picks[0].slot !== "right_choice") picks[0] = { ...picks[0], slot: "right_choice" };
  const rightChoice = picks[0]?.item;
  picks = picks
    .filter(
      (pick) =>
        pick.slot === "right_choice" ||
        (pick.slot === "smart_deal" && pick.item.price < rightChoice.price) ||
        (pick.slot === "premium_option" && pick.item.price > rightChoice.price),
    )
    .slice(0, 3);

  // An unknown type is read from the content: products mean recommendations.
  const type: ReplyType = isReplyType(output.type) ? output.type : picks.length > 0 ? "recommendations" : "question";
  if (type === "question") picks = [];
  if (type === "recommendations" && picks.length === 0) return null;

  // Amounts in the text must be real: prices of the recommended phones, gaps
  // between them or with the customer's budget, package prices, or numbers the
  // customer wrote. Anything else is treated as invented.
  const allowed = new Set<number>([...context.customerNumbers, ...context.packagePrices]);
  for (const { item } of picks) {
    allowed.add(item.price);
    if (item.compareAtPrice !== null) {
      allowed.add(item.compareAtPrice);
      allowed.add(item.compareAtPrice - item.price);
    }
    if (item.newVersionPrice !== null) allowed.add(item.newVersionPrice);
    if (item.saving !== null) allowed.add(item.saving);
    for (const amount of context.customerNumbers) allowed.add(Math.abs(amount - item.price));
  }
  for (const a of picks) for (const b of picks) if (a !== b) allowed.add(Math.abs(a.item.price - b.item.price));
  const honest = (text: string) => amountsIn(text).every((amount) => allowed.has(amount));

  let message = sanitizeText(output.message ?? "", MAX_MESSAGE);
  if (!message || !honest(message)) {
    if (type === "no_match" && picks.length === 0) return null;
    const t = getTranslator(language);
    message =
      type === "question"
        ? t("AdvisorReply.askBudget")
        : type === "no_match"
          ? t("AdvisorReply.closest")
          : t("AdvisorReply.safeIntro");
  }

  return {
    language,
    type,
    message,
    recommendations: picks.map((pick) => {
      const reason = sanitizeText(pick.reason, MAX_REASON);
      return { slot: pick.slot, productId: pick.item.id, reason: honest(reason) ? reason : "" };
    }),
    packages: [...new Set(output.packages ?? [])].filter((id) => context.packageIds.includes(id)).slice(0, 2),
    quickReplies:
      type === "question"
        ? (output.quickReplies ?? [])
            .map((reply) => sanitizeText(reply, MAX_QUICK_REPLY))
            .filter(Boolean)
            .slice(0, 4)
        : [],
  };
}
