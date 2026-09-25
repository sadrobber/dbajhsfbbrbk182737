import { z } from "zod";

/**
 * Shapes of everything the storefront reads: catalogue, merchandising settings.
 * The same schemas will validate data coming from the database or admin API later.
 */

export const conditions = ["new", "refurbished"] as const;
export const grades = ["A+", "A", "B"] as const;
export const colors = ["black", "white", "blue", "green", "purple", "grey", "silver", "pink", "gold"] as const;
export const badges = ["new_arrival", "special_price", "last_one", "deal_of_the_week"] as const;
export const goodForTags = ["photo", "battery", "gaming", "work", "social", "easy"] as const;
export const visuals = ["duo", "trio", "column", "bar", "single"] as const;

export type Condition = (typeof conditions)[number];
export type Grade = (typeof grades)[number];
export type ColorKey = (typeof colors)[number];
export type Badge = (typeof badges)[number];
export type GoodFor = (typeof goodForTags)[number];
export type Visual = (typeof visuals)[number];

const slug = z.string().regex(/^[a-z0-9-]+$/, "use lowercase letters, digits and dashes");

export const brandSchema = z.object({
  id: slug,
  name: z.string().min(1),
});

export const productSchema = z
  .object({
    id: slug,
    brand: slug,
    model: z.string().min(1),
    condition: z.enum(conditions),
    storageGb: z.number().int().positive(),
    color: z.enum(colors),
    /** Refurbished only: A+ like new, A very good, B good. */
    grade: z.enum(grades).nullable(),
    /** Refurbished only: battery health in %. */
    batteryHealth: z.number().int().min(1).max(100).nullable(),
    warrantyMonths: z.number().int().positive(),
    /** Selling price in euros, VAT included. */
    price: z.number().positive(),
    /** Previous price, shown crossed out when the item is on special price. */
    compareAtPrice: z.number().positive().nullable(),
    stock: z.number().int().min(0),
    badges: z.array(z.enum(badges)),
    /** Most relevant first. */
    goodFor: z.array(z.enum(goodForTags)).min(1),
    /** Which neutral placeholder illustration to draw until real photos exist. */
    visual: z.enum(visuals),
  })
  .superRefine((p, ctx) => {
    if (p.condition === "refurbished" && (p.grade === null || p.batteryHealth === null)) {
      ctx.addIssue({ code: "custom", message: `${p.id}: a refurbished phone needs a grade and a battery health` });
    }
    if (p.condition === "new" && (p.grade !== null || p.batteryHealth !== null)) {
      ctx.addIssue({ code: "custom", message: `${p.id}: a new phone has no grade or battery health` });
    }
    if (p.compareAtPrice !== null && p.compareAtPrice <= p.price) {
      ctx.addIssue({ code: "custom", message: `${p.id}: compareAtPrice must be higher than price` });
    }
  });

export const catalogSchema = z
  .object({
    currency: z.literal("EUR"),
    brands: z.array(brandSchema).min(1),
    products: z.array(productSchema),
  })
  .superRefine((catalog, ctx) => {
    const brandIds = new Set(catalog.brands.map((b) => b.id));
    const seen = new Set<string>();
    for (const product of catalog.products) {
      if (seen.has(product.id)) {
        ctx.addIssue({ code: "custom", message: `duplicate product id "${product.id}"` });
      }
      seen.add(product.id);
      if (!brandIds.has(product.brand)) {
        ctx.addIssue({ code: "custom", message: `${product.id}: unknown brand "${product.brand}"` });
      }
    }
  });

export type Brand = z.infer<typeof brandSchema>;
export type Product = z.infer<typeof productSchema>;
export type Catalog = z.infer<typeof catalogSchema>;

/** A product as the storefront shows it: brand name resolved, derived badges and price comparison. */
export type CatalogItem = Product & {
  brandName: string;
  /** Price of the same model and storage bought new, when the shop sells it. Refurbished only. */
  newVersionPrice: number | null;
  /** newVersionPrice - price, when positive. */
  saving: number | null;
};

// ---------------------------------------------------------------------------
// Merchandising settings (site.config.ts today, admin panel tomorrow)
// ---------------------------------------------------------------------------

export type IconKey =
  | "plug"
  | "cable"
  | "screen"
  | "case"
  | "settings"
  | "transfer"
  | "user"
  | "check"
  | "shield"
  | "sparkles"
  | "store"
  | "support"
  | "repair";

export type PackageItem = {
  /** Label key in messages: Packages.items.<key> */
  key: string;
  icon: IconKey;
  /** Content not confirmed yet: shown with a TODO marker. */
  todo?: boolean;
};

export type PackageDefinition = {
  /** Used in URLs and as the label key in messages: Packages.<id>.name / .tagline */
  id: string;
  price: number;
  icon: IconKey;
  items: PackageItem[];
};

export type PrizeKey = "smartphone" | "computer" | "console";

export type GaugeSettings = {
  enabled: boolean;
  /** 0 to 100. */
  percent: number;
  prizes: PrizeKey[];
  /** Page with the official rules. */
  rulesPath: string;
};

export type ServiceKey = "collection" | "support" | "data_transfer" | "after_sales";

export type ServiceArea = {
  /** Label keys in messages: Local.towns.<key> */
  towns: string[];
  services: ServiceKey[];
};

export type Merchandising = {
  /** At or below this stock, cards say "Only N left". */
  lowStockThreshold: number;
  greatDeals: { productIds: string[]; maxItems: number };
  refurbishedPicks: { maxItems: number };
  gauge: GaugeSettings;
  packages: PackageDefinition[];
  serviceArea: ServiceArea;
};
