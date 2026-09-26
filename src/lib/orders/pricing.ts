import { strictestSupply, supplyOf } from "@/lib/data/catalog-logic";
import type { OrderLine } from "@/lib/data/records";
import type { CatalogItem, PackageDefinition, Supply } from "@/lib/data/schema";
import type { CartEntry } from "./cart";

export type PricedCart = {
  lines: OrderLine[];
  /** Decides the payment: charged now, card authorised, or nothing paid online. */
  supply: Supply;
  total: number;
  /** Entries that can't be ordered any more (removed, sold out, unknown). */
  unavailable: CartEntry[];
};

export const roundMoney = (amount: number) => Math.round(amount * 100) / 100;

/**
 * Prices a cart from the catalogue, never from what the browser sent.
 * `describe` gives the line text kept on the order (a snapshot).
 */
export function priceCart(
  cart: CartEntry[],
  items: CatalogItem[],
  packages: PackageDefinition[],
  describe: { product: (item: CatalogItem) => string; package: (pkg: PackageDefinition) => string },
): PricedCart {
  const lines: OrderLine[] = [];
  const unavailable: CartEntry[] = [];

  for (const entry of cart) {
    if (entry.kind === "product") {
      const item = items.find((i) => i.id === entry.id);
      const supply = item ? supplyOf(item, entry.quantity) : null;
      if (!item || !supply) {
        unavailable.push(entry);
        continue;
      }
      lines.push({
        productId: item.id,
        packageId: null,
        description: describe.product(item),
        quantity: entry.quantity,
        unitPrice: item.price,
        supply,
      });
    } else {
      const pkg = packages.find((p) => p.id === entry.id);
      if (!pkg) {
        unavailable.push(entry);
        continue;
      }
      lines.push({
        productId: null,
        packageId: pkg.id,
        description: describe.package(pkg),
        quantity: entry.quantity,
        unitPrice: pkg.price,
        supply: "in_store",
      });
    }
  }

  return {
    lines,
    supply: strictestSupply(lines.map((line) => line.supply)),
    total: roundMoney(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)),
    unavailable,
  };
}
