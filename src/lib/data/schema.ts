import { z } from "zod";

/**
 * Shapes of the storefront data: catalogue and merchandising.
 * Each schema matches one JSON file in /data, which stands in for a database table.
 * The same schemas will validate rows coming from the real database later.
 */

export const conditions = ["new", "refurbished"] as const;
export const grades = ["A+", "A", "B"] as const;
export const colors = ["black", "white", "blue", "green", "purple", "grey", "silver", "pink", "gold"] as const;
export const badges = ["new_arrival", "special_price", "last_one", "deal_of_the_week"] as const;
/** Badges staff can set by hand. "last_one" always follows the real stock. */
export const manualBadges = ["new_arrival", "special_price", "deal_of_the_week"] as const;
export const goodForTags = ["photo", "battery", "gaming", "work", "social", "easy"] as const;
export const visuals = ["duo", "trio", "column", "bar", "single"] as const;
export const iconKeys = [
  "plug",
  "cable",
  "screen",
  "case",
  "settings",
  "transfer",
  "user",
  "check",
  "shield",
  "sparkles",
  "store",
  "support",
  "repair",
] as const;
export const prizeKeys = ["smartphone", "computer", "console"] as const;
/** Extra badge on a Great Deals card. "custom" uses the deal's own text. */
export const promoBadges = ["deal_of_the_week", "special_price", "new_arrival", "custom"] as const;

export type Condition = (typeof conditions)[number];
export type Grade = (typeof grades)[number];
export type ColorKey = (typeof colors)[number];
export type Badge = (typeof badges)[number];
export type GoodFor = (typeof goodForTags)[number];
export type Visual = (typeof visuals)[number];
export type IconKey = (typeof iconKeys)[number];
export type PrizeKey = (typeof prizeKeys)[number];
export type PromoBadge = (typeof promoBadges)[number];

export const slug = z.string().regex(/^[a-z0-9-]+$/, "use lowercase letters, digits and dashes");

/** Text typed by staff in the admin. English and Italian fall back to French when left empty. */
export const localizedTextSchema = z.object({
  fr: z.string().trim().min(1, "French text is required").max(60),
  en: z.string().trim().max(60),
  it: z.string().trim().max(60),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export function localize(text: LocalizedText, locale: "fr" | "en" | "it"): string {
  return text[locale] || text.fr;
}

/** Photos uploaded in the admin, served by /api/media. */
export const photoPathSchema = z.string().regex(/^\/api\/media\/[a-z0-9-]+\.(jpg|png|webp|avif)$/, "unknown photo");

export const brandSchema = z.object({
  id: slug,
  name: z.string().min(1),
});

export const productSchema = z
  .object({
    id: slug,
    brand: slug,
    model: z.string().trim().min(1, "Model is required").max(60),
    condition: z.enum(conditions),
    storageGb: z.number().int().positive(),
    color: z.enum(colors),
    /** Refurbished only: A+ like new, A very good, B good. */
    grade: z.enum(grades).nullable(),
    /** Refurbished only: battery health in %. */
    batteryHealth: z.number().int().min(1).max(100).nullable(),
    warrantyMonths: z.number().int().positive().max(60),
    /** Selling price in euros, VAT included. */
    price: z.number().positive(),
    /** Previous price, shown crossed out when the item is on special price. */
    compareAtPrice: z.number().positive().nullable(),
    stock: z.number().int().min(0),
    badges: z.array(z.enum(badges)),
    /** Most relevant first. */
    goodFor: z.array(z.enum(goodForTags)).min(1, "Pick at least one"),
    /** Neutral illustration drawn when there is no photo. */
    visual: z.enum(visuals),
    /** First photo is the main one. Empty: the illustration is used. */
    photos: z.array(photoPathSchema).max(6),
  })
  .superRefine((p, ctx) => {
    if (p.condition === "refurbished") {
      if (p.grade === null) ctx.addIssue({ code: "custom", path: ["grade"], message: "A refurbished phone needs a grade" });
      if (p.batteryHealth === null) {
        ctx.addIssue({ code: "custom", path: ["batteryHealth"], message: "A refurbished phone needs a battery health" });
      }
    }
    if (p.condition === "new" && (p.grade !== null || p.batteryHealth !== null)) {
      ctx.addIssue({ code: "custom", path: ["grade"], message: "A new phone has no grade or battery health" });
    }
    if (p.compareAtPrice !== null && p.compareAtPrice <= p.price) {
      ctx.addIssue({ code: "custom", path: ["compareAtPrice"], message: "Must be higher than the price" });
    }
  });

export type Brand = z.infer<typeof brandSchema>;
export type Product = z.infer<typeof productSchema>;
export type Catalog = { currency: "EUR"; brands: Brand[]; products: Product[] };

/** A product as the storefront shows it: brand name resolved, derived badges and price comparison. */
export type CatalogItem = Product & {
  brandName: string;
  /** Price of the same model and storage bought new, when the shop sells it. Refurbished only. */
  newVersionPrice: number | null;
  /** newVersionPrice - price, when positive. */
  saving: number | null;
};

// ---------------------------------------------------------------------------
// Merchandising: data/deals.json, data/packages.json, data/gauge-config.json
// ---------------------------------------------------------------------------

export const dealSchema = z
  .object({
    id: slug,
    productId: slug,
    position: z.number().int().min(0),
    promoBadge: z.enum(promoBadges).nullable(),
    /** Only for promoBadge "custom". */
    promoLabel: localizedTextSchema.nullable(),
  })
  .superRefine((deal, ctx) => {
    if (deal.promoBadge === "custom" && deal.promoLabel === null) {
      ctx.addIssue({ code: "custom", path: ["promoLabel"], message: "Type the badge text" });
    }
  });

export type Deal = z.infer<typeof dealSchema>;
export type DealPromo = { badge: PromoBadge; label: LocalizedText | null };

export const packageItemSchema = z.object({
  id: slug,
  icon: z.enum(iconKeys),
  label: localizedTextSchema,
  /** Content not confirmed yet: shown with a TODO marker. */
  todo: z.boolean(),
});

export const packageSchema = z.object({
  /** Used in URLs and as the label key in messages: Packages.<id>.name / .tagline */
  id: slug,
  position: z.number().int().min(0),
  price: z.number().positive().max(9999),
  icon: z.enum(iconKeys),
  items: z.array(packageItemSchema).max(8),
});

export type PackageItem = z.infer<typeof packageItemSchema>;
export type PackageDefinition = z.infer<typeof packageSchema>;

export const gaugeSchema = z.object({
  enabled: z.boolean(),
  /** 0 to 100, shown on the homepage. */
  percent: z.number().int().min(0).max(100),
  /** Number of tickets at which the draw happens. */
  targetTickets: z.number().int().positive(),
  prizes: z.array(z.enum(prizeKeys)).min(1, "Pick at least one prize"),
  /** Page with the official rules. */
  rulesPath: z.string().startsWith("/"),
});

export type GaugeSettings = z.infer<typeof gaugeSchema>;

export type ServiceKey = "collection" | "support" | "data_transfer" | "after_sales";

export type ServiceArea = {
  /** Label keys in messages: Local.towns.<key> */
  towns: string[];
  services: ServiceKey[];
};

export type Merchandising = {
  /** At or below this stock, cards say "Only N left". */
  lowStockThreshold: number;
  greatDeals: { deals: Deal[]; maxItems: number };
  refurbishedPicks: { maxItems: number };
  gauge: GaugeSettings;
  packages: PackageDefinition[];
  serviceArea: ServiceArea;
};
