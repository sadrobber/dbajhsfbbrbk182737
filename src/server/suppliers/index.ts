import "server-only";
import { updateRows } from "@/lib/data/json-store";
import { manualSuppliers } from "./manual";
import type { SupplierConnector } from "./types";

export type { SupplierAnswer, SupplierConnector } from "./types";

/** The active supplier connector. Add API adapters here as suppliers offer them. */
export function supplierConnector(): SupplierConnector {
  return manualSuppliers;
}

/**
 * Applies a supplier stock feed to the products' "when out of stock" setting.
 * Nothing calls it on a schedule yet: run it from a cron route or job once a
 * connector implements fetchCatalogAvailability. Returns the products changed.
 */
export async function syncSupplierCatalog(connector = supplierConnector()): Promise<number> {
  if (!connector.fetchCatalogAvailability) return 0;
  const feed = new Map((await connector.fetchCatalogAvailability()).map((entry) => [entry.productId, entry.availability]));
  let changed = 0;
  await updateRows("products", (rows) =>
    rows.map((row) => {
      const availability = feed.get(row.id);
      if (!availability || availability === row.supplierAvailability) return row;
      changed++;
      return { ...row, supplierAvailability: availability };
    }),
  );
  return changed;
}
