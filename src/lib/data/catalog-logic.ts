import {
  type Badge,
  type Catalog,
  type CatalogItem,
  type ColorKey,
  type DealPromo,
  type Merchandising,
  type Product,
  type Supply,
  supplies,
} from "./schema";

/** A Great Deals product, with the extra badge set for it in the admin. */
export type DealItem = CatalogItem & { promo: DealPromo | null };

/** Display priority when a card has room for only one or two badges. */
const BADGE_PRIORITY: Badge[] = ["deal_of_the_week", "special_price", "last_one", "new_arrival"];

/** "Last one available" always follows the real stock, whatever the data says. */
function deriveBadges(badges: Badge[], stock: number): Badge[] {
  const result: Badge[] = badges.filter((b) => b !== "last_one");
  if (stock === 1) result.push("last_one");
  return [...new Set(result)].sort((a, b) => BADGE_PRIORITY.indexOf(a) - BADGE_PRIORITY.indexOf(b));
}

/**
 * Resolves each variant's model, brand and colour names, derived badges and
 * the "new version" price comparison. Variants whose model is missing are
 * left out (the integrity check reports them).
 */
export function enrichCatalog(catalog: Catalog): CatalogItem[] {
  const brandIds = new Map(catalog.brands.map((b) => [b.name, b.id]));
  const models = new Map(catalog.models.map((m) => [m.id, m]));

  return catalog.products.flatMap((product) => {
    const model = models.get(product.modelId);
    if (!model) return [];
    const newVersion =
      product.condition === "refurbished"
        ? catalog.products.find((p) => p.condition === "new" && p.modelId === product.modelId && p.storageGb === product.storageGb)
        : undefined;
    const saving = newVersion && newVersion.price > product.price ? newVersion.price - product.price : null;
    const color = model.colors.find((c) => c.name_en === product.colorName);

    return [
      {
        ...product,
        brand: brandIds.get(model.brand) ?? model.brand.toLowerCase(),
        brandName: model.brand,
        model: model.name,
        colorNames: { en: product.colorName, fr: color?.name_fr ?? null, it: color?.name_it ?? null },
        badges: deriveBadges(product.badges, product.stock),
        newVersionPrice: saving !== null && newVersion ? newVersion.price : null,
        saving,
      },
    ];
  });
}

/** Models the shop can sell right now: at least one variant in stock or orderable from a supplier. */
export function modelsInShop<M extends { id: string }>(models: M[], items: Pick<CatalogItem, "modelId" | "stock" | "supplierAvailability">[]): M[] {
  const orderable = new Set(items.filter((item) => supplyOf(item) !== null).map((item) => item.modelId));
  return models.filter((m) => orderable.has(m.id));
}

const COLOR_FAMILIES: [RegExp, ColorKey][] = [
  [/black|obsidian|midnight|graphite|onyx|jet|charcoal|carbon|space gr/i, "black"],
  [/white|starlight|porcelain|cream|snow|chalk|frost|pearl/i, "white"],
  [/teal|blue|navy|icy|ultramarine|sky|aqua|bay|indigo|glacier/i, "blue"],
  [/green|mint|sage|olive|jade|aloe|lime|pistachio/i, "green"],
  [/purple|lavender|violet|iris|lilac/i, "purple"],
  [/pink|rose|peony|coral|hibiscus|red/i, "pink"],
  [/gold|yellow|amber|sand|desert|orange|lemon|mocha/i, "gold"],
  [/silver|natural|titanium|moonstone/i, "silver"],
  [/gray|grey/i, "grey"],
];

/** A sensible illustration colour for an official colour name ("Sierra Blue" -> blue). Staff can change it. */
export function colorFamilyOf(colorName: string): ColorKey {
  return COLOR_FAMILIES.find(([pattern]) => pattern.test(colorName))?.[1] ?? "grey";
}

/**
 * How `quantity` of a product can be ordered now, or null when it can't.
 * The shop's own stock comes first; past it, the supplier availability applies.
 */
export function supplyOf(product: Pick<Product, "stock" | "supplierAvailability">, quantity = 1): Supply | null {
  if (product.stock >= quantity) return "in_store";
  if (product.supplierAvailability === "none") return null;
  return product.supplierAvailability;
}

/** The order-level supply: its most restrictive line decides how it is paid. */
export function strictestSupply(list: Supply[]): Supply {
  return list.reduce<Supply>((worst, supply) => (supplies.indexOf(supply) > supplies.indexOf(worst) ? supply : worst), "in_store");
}

export function inStock(items: CatalogItem[]): CatalogItem[] {
  return items.filter((item) => item.stock > 0);
}

/** Products listed in Great Deals, in their order, sold-out ones skipped. */
export function selectGreatDeals(items: CatalogItem[], greatDeals: Merchandising["greatDeals"]): DealItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return greatDeals.deals
    .flatMap((deal) => {
      const item = byId.get(deal.productId);
      if (!item || item.stock <= 0) return [];
      const promo = deal.promoBadge ? { badge: deal.promoBadge, label: deal.promoLabel } : null;
      return [{ ...item, promo }];
    })
    .slice(0, greatDeals.maxItems);
}

/** Refurbished phones in stock, most premium first. */
export function selectRefurbishedPicks(items: CatalogItem[], settings: Merchandising): CatalogItem[] {
  return items
    .filter((item) => item.condition === "refurbished" && item.stock > 0)
    .sort((a, b) => b.price - a.price || a.id.localeCompare(b.id))
    .slice(0, settings.refurbishedPicks.maxItems);
}

/** The cheapest variant of a model that can be ordered, new and refurbished (for "from €…"). */
export function modelOffers(items: CatalogItem[], modelId: string): { new: CatalogItem | null; refurbished: CatalogItem | null } {
  const orderable = items.filter((item) => item.modelId === modelId && supplyOf(item) !== null);
  const cheapest = (condition: CatalogItem["condition"]) =>
    orderable.filter((item) => item.condition === condition).sort((a, b) => a.price - b.price || a.id.localeCompare(b.id))[0] ?? null;
  return { new: cheapest("new"), refurbished: cheapest("refurbished") };
}
