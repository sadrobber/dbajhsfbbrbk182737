import "server-only";
import { dataSource } from ".";
import { type DealItem, enrichCatalog, inStock, selectGreatDeals, selectRefurbishedPicks } from "./catalog-logic";
import type { CatalogItem } from "./schema";

/**
 * The only functions the UI and the advisor use to read data.
 * They stay the same when the data source changes.
 */

export async function getCatalogItems(): Promise<CatalogItem[]> {
  return enrichCatalog(await dataSource.getCatalog());
}

export async function getAvailableItems(): Promise<CatalogItem[]> {
  return inStock(await getCatalogItems());
}

export async function getItem(id: string): Promise<CatalogItem | null> {
  return (await getCatalogItems()).find((item) => item.id === id) ?? null;
}

export async function getMerchandising() {
  return dataSource.getMerchandising();
}

export async function getGreatDeals(): Promise<DealItem[]> {
  const [items, settings] = await Promise.all([getCatalogItems(), getMerchandising()]);
  return selectGreatDeals(items, settings.greatDeals);
}

export async function getRefurbishedPicks(): Promise<CatalogItem[]> {
  const [items, settings] = await Promise.all([getCatalogItems(), getMerchandising()]);
  return selectRefurbishedPicks(items, settings);
}

export async function getPackages() {
  return (await getMerchandising()).packages;
}

export async function getPackage(id: string) {
  return (await getPackages()).find((pkg) => pkg.id === id) ?? null;
}
