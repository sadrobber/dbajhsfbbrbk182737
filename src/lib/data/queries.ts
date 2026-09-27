import "server-only";
import { dataSource } from ".";
import { type DealItem, enrichCatalog, inStock, modelOffers, modelsInShop, selectGreatDeals, selectRefurbishedPicks } from "./catalog-logic";
import {
  applyPromoCode,
  bestCaseTradeIns,
  type PromoResult,
  quoteTradeIn,
  type TradeInAnswers,
  type TradeInEstimate,
  type TradeInQuote,
} from "./pricing";
import type { CatalogItem, PhoneModel } from "./schema";

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

// --- models (the spec database) ------------------------------------------------------

/** Every model, sold or not (trade-in wizard, comparison pages). */
export async function getModels(): Promise<PhoneModel[]> {
  return (await dataSource.getCatalog()).models;
}

export async function getModel(id: string): Promise<PhoneModel | null> {
  return (await getModels()).find((m) => m.id === id) ?? null;
}

/** Models with at least one variant the shop can sell now: the only ones shown in the shop. */
export async function getShopModels(): Promise<PhoneModel[]> {
  const catalog = await dataSource.getCatalog();
  return modelsInShop(catalog.models, enrichCatalog(catalog));
}

/** A model and all its variants (in stock or not), for its product page. */
export async function getModelWithVariants(id: string): Promise<{ model: PhoneModel; variants: CatalogItem[] } | null> {
  const catalog = await dataSource.getCatalog();
  const model = catalog.models.find((m) => m.id === id);
  if (!model) return null;
  return { model, variants: enrichCatalog(catalog).filter((item) => item.modelId === id) };
}

/** Condition grades and battery options, in display order. */
export async function getOptions() {
  return dataSource.getOptions();
}

// --- merchandising ------------------------------------------------------------------

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

// --- pricing --------------------------------------------------------------------------

/** Checks a promo code against an order subtotal (euros, VAT incl.). */
export async function checkPromoCode(code: string, subtotal: number): Promise<PromoResult> {
  return applyPromoCode(await dataSource.getPromoCodes(), code, subtotal);
}

/** Models the shop buys back, with their storage options. */
export async function getTradeInModels(): Promise<{ model: PhoneModel; storageGb: number[] }[]> {
  const [{ prices }, models] = await Promise.all([dataSource.getTradeInGrid(), getModels()]);
  return models.flatMap((model) => {
    const storageGb = prices.filter((p) => p.modelId === model.id).map((p) => p.storageGb);
    return storageGb.length > 0 ? [{ model, storageGb }] : [];
  });
}

export async function getTradeInQuote(answers: TradeInAnswers): Promise<TradeInQuote> {
  const { prices, config } = await dataSource.getTradeInGrid();
  return quoteTradeIn(prices, config, answers);
}

/** Best-case trade-in offer per storage size for a model (empty: the shop doesn't list it), and the shop-credit bonus. */
export async function getTradeInEstimates(modelId: string): Promise<{ estimates: TradeInEstimate[]; storeCreditBonusPercent: number }> {
  const { prices, config } = await dataSource.getTradeInGrid();
  return { estimates: bestCaseTradeIns(prices, config, modelId), storeCreditBonusPercent: config.storeCreditBonusPercent };
}

// --- comparison ------------------------------------------------------------------------

/** Two models side by side: specs, what the shop sells of each, and the first one's trade-in estimates. */
export async function getComparison(mineId: string, wantId: string) {
  const [mine, want, items, tradeIn] = await Promise.all([
    getModel(mineId),
    getModel(wantId),
    getCatalogItems(),
    getTradeInEstimates(mineId),
  ]);
  if (!mine || !want) return null;
  return {
    mine: { model: mine, offers: modelOffers(items, mine.id) },
    want: { model: want, offers: modelOffers(items, want.id) },
    tradeIn,
  };
}

/** An order, for the customer's order page. The page must check the order's access token. */
export { getOrder } from "./order-repository";
