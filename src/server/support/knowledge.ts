import type { SupportContact } from "@/config/support.config";
import type { Translator } from "@/i18n/messages";
import { supplyOf } from "@/lib/data/catalog-logic";
import { type BatteryOptionInfo, type CatalogItem, type GradeInfo, localize, type Merchandising } from "@/lib/data/schema";
import { translateDynamic } from "@/lib/i18n-dynamic";

/**
 * The "website knowledge" part of the support prompt, written from the shop's
 * live data, so answers follow what staff change in /admin.
 * Pure functions: no data access here (see ./index.ts).
 */

export type KnowledgeInput = {
  brandName: string;
  /** English texts of the site (messages/en.json): the model translates when it answers. */
  t: Translator;
  items: CatalogItem[];
  grades: GradeInfo[];
  batteryOptions: BatteryOptionInfo[];
  settings: Merchandising;
  contact: SupportContact;
  /** The owner's own text (src/config/support.config.ts). */
  ownerKnowledge: string;
};

const euro = (amount: number) => `€${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;

/** Drops "TODO" placeholder lines, then any heading left without content. */
export function cleanOwnerKnowledge(text: string): string {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\s*TODO\b/i.test(line));
  const kept: string[] = [];
  lines.forEach((line, index) => {
    if (/^\s*#/.test(line)) {
      const next = lines.slice(index + 1).find((l) => l.trim() !== "");
      if (next === undefined || /^\s*#/.test(next)) return;
    }
    kept.push(line);
  });
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Contact details that are filled in, as "label: value" lines. Empty when none are. */
export function contactLines(contact: SupportContact): string[] {
  const fields: [string, string | null][] = [
    ["Email", contact.email],
    ["Phone", contact.phone],
    ["Shop address", contact.address],
    ["Opening hours", contact.openingHours],
  ];
  return fields.flatMap(([label, value]) => (value?.trim() ? [`${label}: ${value.trim()}`] : []));
}

function phonesSection(items: CatalogItem[]): string {
  const byModel = new Map<string, { name: string; lines: CatalogItem[] }>();
  for (const item of items) {
    if (supplyOf(item) === null) continue;
    const name = `${item.brandName} ${item.model}`;
    const entry = byModel.get(item.modelId) ?? { name, lines: [] };
    entry.lines.push(item);
    byModel.set(item.modelId, entry);
  }
  if (byModel.size === 0) return "No phone can be ordered at the moment.";

  const rows = [...byModel.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, lines }) => {
      const from = (condition: CatalogItem["condition"]) => {
        const prices = lines.filter((item) => item.condition === condition).map((item) => item.price);
        return prices.length > 0 ? Math.min(...prices) : null;
      };
      const offers = [
        from("new") !== null ? `new from ${euro(from("new")!)}` : null,
        from("refurbished") !== null ? `refurbished from ${euro(from("refurbished")!)}` : null,
      ].filter(Boolean);
      const inShop = lines.some((item) => supplyOf(item) === "in_store");
      return `- ${name}: ${offers.join(", ")}${inShop ? "" : " (not in the shop today: ordered from a supplier)"}`;
    });
  return [
    "Stock changes every day; storage sizes, colours and exact prices are on each phone's page.",
    ...rows,
  ].join("\n");
}

function warrantySection(items: CatalogItem[]): string | null {
  const lines = (["new", "refurbished"] as const).flatMap((condition) => {
    const months = [...new Set(items.filter((i) => i.condition === condition).map((i) => i.warrantyMonths))].sort(
      (a, b) => a - b,
    );
    if (months.length === 0) return [];
    const range = months.length === 1 ? `${months[0]} months` : `${months[0]} to ${months.at(-1)} months, depending on the phone`;
    return [`- ${condition === "new" ? "New" : "Refurbished"} phones: ${range} warranty (shown on each phone's page).`];
  });
  return lines.length > 0 ? lines.join("\n") : null;
}

export function buildKnowledge(input: KnowledgeInput): string {
  const { t, brandName, settings } = input;
  const sections: [string, string | null][] = [];

  sections.push([
    `About ${brandName}`,
    [
      t("Footer.tagline"),
      t("Local.subtitle"),
      `Towns served: ${settings.serviceArea.towns.map((town) => translateDynamic(t, `Local.towns.${town}`)).join(", ")}.`,
      "Services in the shop:",
      ...settings.serviceArea.services.map(
        (service) =>
          `- ${translateDynamic(t, `Local.services.${service}.title`)}: ${translateDynamic(t, `Local.services.${service}.text`)}`,
      ),
    ].join("\n"),
  ]);

  const contact = contactLines(input.contact);
  sections.push(["Contact and opening hours", contact.length > 0 ? contact.join("\n") : null]);

  sections.push([
    "Ordering and payment on the website",
    [
      "There are three ways to order, depending on the phone's availability (shown on its page and in the cart):",
      `- Phone in stock in the shop: ${t("Cart.mode.in_store.text")}`,
      `- Phone available from a supplier within 24–48h: ${t("Cart.mode.within_48h.text")}`,
      `- Phone on request: ${t("Cart.mode.on_request.text")}`,
      `Online orders are picked up in the shop (click & collect).`,
      t("Cart.secure"),
      `After ordering, the customer gets an order page that shows its progress. ${t("Order.keepLink")}`,
      `If the shop can't get a phone: ${t("Order.stage.unavailable.text")}`,
      "The assistant can't see orders: for a question about a specific order, the customer must contact the shop.",
    ].join("\n"),
  ]);

  sections.push(["Phones for sale", phonesSection(input.items)]);

  sections.push([
    "Condition grades",
    input.grades
      .map((grade) => {
        const label = grade.id === "new" ? t("Product.condition.new") : translateDynamic(t, `Product.grade.${grade.id}`);
        return `- ${label}: ${grade.summary.en} Screen: ${grade.screen.en} Body: ${grade.body.en}`;
      })
      .join("\n"),
  ]);

  sections.push([
    "Batteries (refurbished phones)",
    input.batteryOptions
      .map((option) => {
        const extra = option.surcharge > 0 ? ` (${euro(option.surcharge)} extra)` : "";
        return `- ${translateDynamic(t, `Product.batteryOption.${option.id}`)}${extra}: ${option.explanation.en.replace("{min}", String(option.minHealthPercent))}`;
      })
      .join("\n"),
  ]);

  sections.push(["Warranty", warrantySection(input.items)]);

  sections.push([
    "Packages (optional extras added to a phone)",
    settings.packages
      .map((pkg) => {
        const included = pkg.items.filter((item) => !item.todo).map((item) => localize(item.label, "en"));
        return [
          `- ${translateDynamic(t, `Packages.${pkg.id}.name`)}, ${euro(pkg.price)}: ${translateDynamic(t, `Packages.${pkg.id}.tagline`)}`,
          included.length > 0 ? `  Includes: ${included.join("; ")}.` : null,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n"),
  ]);

  sections.push([
    "Trade-in",
    `${t("TradeIn.title")} ${t("TradeIn.subtitle")} The online estimate is not available yet: for a trade-in offer, the customer contacts the shop.`,
  ]);

  if (settings.gauge.enabled) {
    sections.push([
      "The Gauge (prize draw)",
      [
        t("Gauge.subtitle"),
        `Each purchase gives the customer a ticket. The Gauge is at ${settings.gauge.percent}% today.`,
        `Prizes: ${settings.gauge.prizes.map((prize) => translateDynamic(t, `Gauge.prizes.${prize}`)).join(", ")}.`,
        `${t("Gauge.rules")}.`,
      ].join("\n"),
    ]);
  }

  const owner = cleanOwnerKnowledge(input.ownerKnowledge);
  if (owner) sections.push(["More from the shop", owner]);

  return sections
    .filter((section): section is [string, string] => Boolean(section[1]?.trim()))
    .map(([title, body]) => `# ${title}\n${body}`)
    .join("\n\n");
}
