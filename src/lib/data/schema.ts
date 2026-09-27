import { z } from "zod";

/**
 * Shapes of the storefront data: catalogue and merchandising.
 * Each schema matches one JSON file in /data, which stands in for a database table.
 * The same schemas will validate rows coming from the real database later.
 */

export const conditions = ["new", "refurbished"] as const;
/** Refurbished grades, best first. Descriptions and example surcharges in data/grades.json; labels in messages Product.grade.<grade>. */
export const grades = ["premium", "excellent", "very_good", "correct"] as const;
/** Refurbished only: the original battery (tested), or a new one fitted by the workshop. data/battery-options.json */
export const batteryOptions = ["standard", "new"] as const;
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
/**
 * What the shop offers once its own stock is used up. Set in the admin today;
 * a supplier feed can set it later (src/server/suppliers).
 */
export const supplierAvailabilities = ["none", "within_48h", "on_request"] as const;
/**
 * How a phone can be ordered right now:
 * in_store   - in the shop, paid at once;
 * within_48h - from a supplier in 24-48h, card authorised and charged once staff confirm;
 * on_request - no payment online, staff check and get back to the customer.
 * Listed from least to most restrictive.
 */
export const supplies = ["in_store", "within_48h", "on_request"] as const;

export type Condition = (typeof conditions)[number];
export type Grade = (typeof grades)[number];
export type BatteryOption = (typeof batteryOptions)[number];
export type ColorKey = (typeof colors)[number];
export type Badge = (typeof badges)[number];
export type GoodFor = (typeof goodForTags)[number];
export type Visual = (typeof visuals)[number];
export type IconKey = (typeof iconKeys)[number];
export type PrizeKey = (typeof prizeKeys)[number];
export type PromoBadge = (typeof promoBadges)[number];
export type SupplierAvailability = (typeof supplierAvailabilities)[number];
export type Supply = (typeof supplies)[number];

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

/** Longer text in the three languages, all required (descriptions, explanations). */
export const localizedLongTextSchema = z.object({
  fr: z.string().trim().min(1).max(400),
  en: z.string().trim().min(1).max(400),
  it: z.string().trim().min(1).max(400),
});
export type LocalizedLongText = z.infer<typeof localizedLongTextSchema>;

/** Photos uploaded in the admin, served by /api/media. */
export const photoPathSchema = z.string().regex(/^\/api\/media\/[a-z0-9-]+\.(jpg|png|webp|avif)$/, "unknown photo");

export const brandSchema = z.object({
  id: slug,
  name: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Models: data/models.json, the phone spec database (one row per model)
// ---------------------------------------------------------------------------

export const cameraRoles = ["wide", "ultrawide", "telephoto", "periscope telephoto", "depth", "macro", "monochrome", "ToF / LiDAR"] as const;
export const dataQualityStatuses = ["web_checked", "needs_check"] as const;

const dimensionsSchema = z.object({ height: z.number().positive(), width: z.number().positive(), thickness: z.number().positive() });
const text = z.string().trim().min(1);

/** A colour as the manufacturer names it. French / Italian names and the swatch are shop fields, null until filled in. */
export const modelColorSchema = z.object({
  name_en: text,
  name_fr: text.nullable(),
  name_it: text.nullable(),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  /** Optional extra price for this colour, in euros. */
  surcharge: z.number().positive().optional(),
});

/**
 * Spec values are facts from the manufacturer: they are imported, never retyped.
 * null (or an empty list) means unknown: listed in data_quality.missing_fields and hidden on the site.
 */
export const phoneModelSchema = z.object({
  id: slug,
  /** brands.name */
  brand: text,
  series: text,
  name: text,
  full_name: text,
  form_factor: z.enum(["bar", "foldable"]),
  release: z.object({ year: z.number().int().min(2000).nullable(), month: z.string().regex(/^\d{4}-\d{2}$/).nullable() }),
  specs: z.object({
    display: z.object({
      size_in: z.number().positive().nullable(),
      panel: text.nullable(),
      refresh_hz: z.number().int().positive().nullable(),
      resolution: text.nullable(),
    }),
    cover_display: z.object({ size_in: z.number().positive(), panel: text, refresh_hz: z.number().int().positive() }).nullable(),
    chip: text.nullable(),
    ram_gb: z.array(z.number().positive()),
    storage_gb: z.array(z.number().int().positive()).min(1),
    rear_cameras: z.array(
      z.object({
        mp: z.number().positive().nullable(),
        role: z.enum(cameraRoles),
        optical_zoom: z.string().regex(/^\d+(\.\d+)?x$/).optional(),
      }),
    ),
    front_camera_mp: z.number().positive().nullable(),
    battery_mah: z.number().int().positive().nullable(),
    charging: z.object({ wired_w: z.number().positive().nullable(), wireless_w: z.number().positive().nullable() }),
    connector: text.nullable(),
    biometrics: text.nullable(),
    network: text.nullable(),
    wifi: text.nullable(),
    bluetooth: text.nullable(),
    sim: text.nullable(),
    /** Foldables: folded and unfolded. */
    dimensions_mm: z.union([dimensionsSchema, z.object({ folded: dimensionsSchema, unfolded: dimensionsSchema })]).nullable(),
    weight_g: z.number().positive().nullable(),
    water_resistance: text.nullable(),
    os_at_launch: text.nullable(),
    // Extras, only where relevant.
    magsafe: z.boolean().optional(),
    qi2_magnets: z.boolean().optional(),
    dynamic_island: z.boolean().optional(),
    action_button: z.boolean().optional(),
    camera_control: z.boolean().optional(),
    headphone_jack: z.boolean().optional(),
    micro_sd: z.boolean().optional(),
    glyph_lights: z.boolean().optional(),
    s_pen: z.union([z.boolean(), text]).optional(),
    frame: text.optional(),
    form_style: z.enum(["flip"]).optional(),
  }),
  colors: z.array(modelColorSchema),
  /** Region differences and caveats, in English, for staff. */
  notes: text.nullable(),
  data_quality: z.object({
    status: z.enum(dataQualityStatuses),
    source: text.nullable(),
    missing_fields: z.array(z.string()),
  }),
  /** Short intro generated from the specs. */
  description: localizedLongTextSchema,
  // Shop fields.
  /** What comes in the box the shop hands over; null until confirmed. */
  in_the_box: localizedLongTextSchema.nullable(),
  /** EXAMPLE starting price of a refurbished unit (smallest storage, "correct", standard battery), to suggest variant prices. */
  base_price: z.number().positive().nullable(),
  /** The shop sells this model new (sealed) too. */
  is_new_available: z.boolean(),
});

export type PhoneModel = z.infer<typeof phoneModelSchema>;
export type ModelColor = z.infer<typeof modelColorSchema>;
/** The few model fields every product view needs. */
export type ModelRef = Pick<PhoneModel, "id" | "brand" | "name" | "colors">;

/** A model's colour name in a language; French / Italian fall back to null when the official name isn't filled in yet. */
export function modelColorName(color: Pick<ModelColor, "name_en" | "name_fr" | "name_it">, locale: "fr" | "en" | "it"): string | null {
  return locale === "fr" ? color.name_fr : locale === "it" ? color.name_it : color.name_en;
}

export const gradeInfoSchema = z.object({
  id: z.enum(["new", ...grades]),
  position: z.number().int().min(0),
  /** Only "new" applies to sealed phones. */
  forNewPhones: z.boolean(),
  /** EXAMPLE euros over the "correct" price, to suggest prices. null for new. */
  surcharge: z.number().min(0).nullable(),
  summary: localizedLongTextSchema,
  screen: localizedLongTextSchema,
  body: localizedLongTextSchema,
});

export const batteryOptionInfoSchema = z.object({
  id: z.enum(batteryOptions),
  position: z.number().int().min(0),
  minHealthPercent: z.number().int().min(1).max(100),
  /** Extra price in euros. */
  surcharge: z.number().min(0),
  /** "{min}" is replaced with minHealthPercent. */
  explanation: localizedLongTextSchema,
});

export type GradeInfo = z.infer<typeof gradeInfoSchema>;
export type BatteryOptionInfo = z.infer<typeof batteryOptionInfoSchema>;

// ---------------------------------------------------------------------------
// Products: data/products.json, one row per variant (a stock unit of a model)
// ---------------------------------------------------------------------------

export const productSchema = z
  .object({
    id: slug,
    /** models.id */
    modelId: slug,
    /** Shown at the bottom of the product page. */
    sku: z.string().regex(/^[A-Z0-9-]{3,80}$/, "Capital letters, digits and dashes"),
    condition: z.enum(conditions),
    /** One of the model's storage options. */
    storageGb: z.number().int().positive(),
    /** The model's official colour (colors[].name_en). */
    colorName: z.string().trim().min(1, "Pick a colour").max(40),
    /** Colour family, for the neutral illustration and filters. */
    color: z.enum(colors),
    /** Refurbished only. */
    grade: z.enum(grades).nullable(),
    /** Refurbished only. */
    battery: z.enum(batteryOptions).nullable(),
    /** Refurbished only: measured battery health in %. */
    batteryHealth: z.number().int().min(1).max(100).nullable(),
    warrantyMonths: z.number().int().positive().max(60),
    /** Selling price in euros, VAT included. */
    price: z.number().positive(),
    /** Previous price, shown crossed out when the item is on special price. */
    compareAtPrice: z.number().positive().nullable(),
    stock: z.number().int().min(0),
    /** Used when stock is 0: "none" means sold out, the others keep the phone orderable. */
    supplierAvailability: z.enum(supplierAvailabilities),
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
      if (p.battery === null) ctx.addIssue({ code: "custom", path: ["battery"], message: "Pick the battery option" });
      if (p.batteryHealth === null) {
        ctx.addIssue({ code: "custom", path: ["batteryHealth"], message: "A refurbished phone needs a battery health" });
      }
      if (p.battery === "new" && p.batteryHealth !== null && p.batteryHealth < 100) {
        ctx.addIssue({ code: "custom", path: ["batteryHealth"], message: "A new battery is at 100%" });
      }
    }
    if (p.condition === "new" && (p.grade !== null || p.battery !== null || p.batteryHealth !== null)) {
      ctx.addIssue({ code: "custom", path: ["grade"], message: "A new phone has no grade or battery details" });
    }
    if (p.compareAtPrice !== null && p.compareAtPrice <= p.price) {
      ctx.addIssue({ code: "custom", path: ["compareAtPrice"], message: "Must be higher than the price" });
    }
  });

export type Brand = z.infer<typeof brandSchema>;
export type Product = z.infer<typeof productSchema>;
/** Full model rows on the server; the admin's browser works with ModelRef only. */
export type Catalog<M extends ModelRef = ModelRef> = {
  currency: "EUR";
  brands: Brand[];
  models: M[];
  products: Product[];
};

/** A product (variant) as the storefront shows it: model and brand resolved, derived badges and price comparison. */
export type CatalogItem = Product & {
  /** brands.id */
  brand: string;
  brandName: string;
  /** Model name without the brand, e.g. "iPhone 16". */
  model: string;
  /** The colour's official name per language (null: not filled in yet). */
  colorNames: { en: string; fr: string | null; it: string | null };
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
