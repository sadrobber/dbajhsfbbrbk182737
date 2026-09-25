import type { Locale } from "@/i18n/routing";
import { getTranslator } from "@/i18n/messages";
import type { CatalogItem, PackageDefinition } from "@/lib/data/schema";
import { locales } from "@/i18n/routing";
import { translateDynamic } from "@/lib/i18n-dynamic";

const GRADE_TEXT = { "A+": "like new", A: "very good condition", B: "good condition" } as const;

const LANGUAGE_NAMES: Record<Locale, string> = { fr: "French", en: "English", it: "Italian" };

/** Stable instructions first (cache-friendly), then packages, then today's stock. */
export function buildSystemPrompt(input: {
  brandName: string;
  siteLocale: Locale;
  towns: string[];
  items: CatalogItem[];
  packages: PackageDefinition[];
}): string {
  const { brandName, siteLocale, items, packages } = input;
  const en = getTranslator("en");

  const packageLines = packages.map((pkg) => {
    const names = locales.map((l) => `${l}: "${translateDynamic(getTranslator(l), `Packages.${pkg.id}.name`)}"`).join(", ");
    const confirmed = pkg.items
      .filter((item) => !item.todo)
      .map((item) => translateDynamic(en, `Packages.items.${item.key}`).toLowerCase());
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
    colour: item.color,
    ...(item.grade ? { grade: GRADE_TEXT[item.grade] } : {}),
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
3. If the request is too vague to recommend anything (no budget, brand, use or preference at all), set "type" to "question", ask ONE short follow-up question in "message" and give 2 to 4 short "quickReplies". Never ask two questions in a row: if your previous answer was a question, recommend popular choices instead.
4. If nothing fits (for example a brand we don't sell), set "type" to "no_match", say so kindly and recommend the closest alternatives if there are any.
5. Reply in the language of the customer's last message: French, English or Italian. If it is unclear, use ${LANGUAGE_NAMES[siteLocale]}. Set "language" to match.
6. Keep "message" to one or two short sentences, and each "reason" to a few words. Plain everyday words: no technical jargon, no markdown, no emojis.
7. Do not write prices or specs in "message" or "reason": the product cards show them.
8. Suggest a package in "packages" only when it is relevant.
9. Only talk about phones, the packages and the shop's services. Gently bring other topics back to choosing a phone.

"goodFor" tags: photo = camera, battery = battery life, gaming, work, social = social media, easy = easy to use. Refurbished grades: like new, very good condition, good condition. Prices are in euros, VAT included.

Packages:
${packageLines.join("\n")}

Catalogue (phones in stock today):
${JSON.stringify(catalogue)}`;
}
