import type { Locale } from "@/i18n/routing";
import { getTranslator } from "@/i18n/messages";
import type { TradeInEstimate } from "@/lib/data/pricing";
import { type CatalogItem, localize, type PackageDefinition, type PhoneModel } from "@/lib/data/schema";
import { locales } from "@/i18n/routing";
import { translateDynamic } from "@/lib/i18n-dynamic";

const GRADE_TEXT = {
  premium: "premium (no sign of use)",
  excellent: "excellent (almost flawless)",
  very_good: "very good (light marks)",
  correct: "good (visible signs of use)",
} as const;

const LANGUAGE_NAMES: Record<Locale, string> = { fr: "French", en: "English", it: "Italian" };

/** The facts about a phone that matter when choosing its successor. */
function phoneSummary(model: PhoneModel): string {
  const s = model.specs;
  const main = s.rear_cameras.find((c) => c.role === "wide")?.mp;
  return [
    model.release.month ? `released ${model.release.month}` : model.release.year ? `released ${model.release.year}` : null,
    s.display.size_in ? `${s.display.size_in}" screen` : null,
    s.chip,
    s.battery_mah ? `${s.battery_mah} mAh battery` : null,
    s.rear_cameras.length > 0 ? `${s.rear_cameras.length} rear camera${s.rear_cameras.length > 1 ? "s" : ""}${main ? ` (main ${main} MP)` : ""}` : null,
    s.network,
  ]
    .filter(Boolean)
    .join(", ");
}

/** What the model is told about the customer's current phone. */
function currentPhoneSection(current: { model: PhoneModel; estimate: TradeInEstimate | null }): string {
  const name = `${current.model.brand} ${current.model.name}`;
  const tradeIn = current.estimate
    ? `Its trade-in estimate as shop credit: up to €${current.estimate.storeCreditAmount} (${current.estimate.storageGb} GB, perfect condition; the shop confirms the final offer).`
    : "The shop lists no trade-in price for it.";
  return `

The customer's current phone: ${name} (${phoneSummary(current.model)}).
${tradeIn}
- Never recommend the same model. Prefer phones that are a clear upgrade on what matters to them (newer, better camera, longer battery life) unless the budget rules it out, and say in "reason" what improves compared with their ${current.model.name}.
- You may quote that trade-in estimate, never another trade-in amount. The site already shows the price after trade-in and a "Compare with my phone" link on each card.`;
}

/** Stable instructions first (cache-friendly), then packages, then today's stock. */
export function buildSystemPrompt(input: {
  brandName: string;
  siteLocale: Locale;
  towns: string[];
  items: CatalogItem[];
  packages: PackageDefinition[];
  /** The phone the customer has now, when they said it. */
  currentPhone?: { model: PhoneModel; estimate: TradeInEstimate | null } | null;
}): string {
  const { brandName, siteLocale, items, packages } = input;
  const en = getTranslator("en");

  const packageLines = packages.map((pkg) => {
    const names = locales.map((l) => `${l}: "${translateDynamic(getTranslator(l), `Packages.${pkg.id}.name`)}"`).join(", ");
    const confirmed = pkg.items
      .filter((item) => !item.todo)
      .map((item) => localize(item.label, "en").toLowerCase());
    const contents = confirmed.length > 0 ? ` Includes: ${confirmed.join(", ")}.` : "";
    const when =
      pkg.id === "max-protection"
        ? "Suggest for children and teenagers, clumsy users, or anyone who wants the phone protected from day one."
        : pkg.id === "ready-to-use"
          ? "Suggest for seniors, gifts, or anyone who wants the phone set up for them."
          : "Suggest when clearly relevant.";
    return `- id "${pkg.id}", €${pkg.price}. Names: ${names}. "${translateDynamic(en, `Packages.${pkg.id}.tagline`)}"${contents} ${when}`;
  });

  const catalogue = items.map((item) => ({
    id: item.id,
    brand: item.brandName,
    model: item.model,
    condition: item.condition,
    storage: item.storageGb >= 1024 ? `${item.storageGb / 1024} TB` : `${item.storageGb} GB`,
    colour: item.colorName,
    ...(item.grade ? { grade: GRADE_TEXT[item.grade] } : {}),
    ...(item.battery === "new" ? { newBattery: true } : {}),
    ...(item.batteryHealth !== null ? { batteryHealthPercent: item.batteryHealth } : {}),
    warrantyMonths: item.warrantyMonths,
    priceEur: item.price,
    ...(item.compareAtPrice !== null ? { previousPriceEur: item.compareAtPrice } : {}),
    ...(item.newVersionPrice !== null ? { samePhoneNewPriceEur: item.newVersionPrice } : {}),
    stock: item.stock,
    goodFor: item.goodFor,
  }));

  return `You are the shopping advisor of ${brandName}, a smartphone shop on the French Riviera (${input.towns.join(", ")}). It sells new and refurbished smartphones. Customers range from teenagers to people in their seventies, so be warm, clear and patient.

Your job: help the customer choose a phone from the catalogue below.

Rules:
1. Recommend ONLY phones from the catalogue below, using their exact "id". Every phone listed is in stock. Never invent a phone, a spec, a price or a stock level.
2. Give at most 3 recommendations, each in a different slot:
   - "right_choice": the best match for the request and the budget.
   - "smart_deal": a cheaper alternative that still fits well. It must cost less than the right_choice.
   - "premium_option": above the budget, only when the extra money is clearly worth it. It must cost more than the right_choice. Leave it out otherwise.
   Fewer than 3 is fine.
3. If the request is too vague to recommend anything (no budget, brand, use or preference at all), set "type" to "question", ask ONE short follow-up question in "message" and give 2 to 4 short "quickReplies". Never ask two questions in a row: if your previous answer was a question, recommend popular choices instead. The site itself asks which phone the customer has now (answers with "question": "current_phone"): that one doesn't count as your question, and never ask it yourself.
4. If nothing fits (for example a brand we don't sell), set "type" to "no_match", say so kindly and recommend the closest alternatives if there are any.
5. Reply in the language of the customer's last message: French, English or Italian. If it is unclear, use ${LANGUAGE_NAMES[siteLocale]}. Set "language" to match.
6. Keep "message" to one or two short sentences, and each "reason" to a few words. Plain everyday words: no technical jargon, no markdown, no emojis.
7. Do not write prices or specs in "message" or "reason": the product cards show them.
8. Suggest a package in "packages" only when it is relevant.
9. Only talk about phones, the packages and the shop's services. Gently bring other topics back to choosing a phone.

"goodFor" tags: photo = camera, battery = battery life, gaming, work, social = social media, easy = easy to use. Refurbished grades, best first: premium, excellent, very good, good. Prices are in euros, VAT included.

Packages:
${packageLines.join("\n")}

Catalogue (phones in stock today):
${JSON.stringify(catalogue)}${input.currentPhone ? currentPhoneSection(input.currentPhone) : ""}`;
}
