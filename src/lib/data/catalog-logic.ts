import type { Badge, Catalog, CatalogItem, DealPromo, Merchandising } from "./schema";

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

/** Resolves brand names, derived badges and the "new version" price comparison. */
export function enrichCatalog(catalog: Catalog): CatalogItem[] {
  const brandNames = new Map(catalog.brands.map((b) => [b.id, b.name]));

  return catalog.products.map((product) => {
    const newVersion =
      product.condition === "refurbished"
        ? catalog.products.find(
            (p) =>
              p.condition === "new" &&
              p.brand === product.brand &&
              p.model === product.model &&
              p.storageGb === product.storageGb,
          )
        : undefined;
    const saving = newVersion && newVersion.price > product.price ? newVersion.price - product.price : null;

    return {
      ...product,
      badges: deriveBadges(product.badges, product.stock),
      brandName: brandNames.get(product.brand) ?? product.brand,
      newVersionPrice: saving !== null && newVersion ? newVersion.price : null,
      saving,
    };
  });
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
