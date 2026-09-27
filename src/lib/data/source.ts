import type { PromoCode, TradeInConfig, TradeInPrice } from "./pricing";
import type { BatteryOptionInfo, Catalog, GradeInfo, Merchandising, PhoneModel } from "./schema";

/**
 * Where the storefront gets its data.
 *
 * Today: the JSON tables in /data (edited from /admin) + src/config/site.config.ts.
 * Later: a real database with real-time stock. Implement this interface for
 * it and switch it in ./index.ts (and replace ./admin-repository.ts for the
 * admin's writes). Nothing in the UI needs to change.
 */
export interface DataSource {
  getCatalog(): Promise<Catalog<PhoneModel>>;
  getMerchandising(): Promise<Merchandising>;
  /** Condition grades and battery options, in display order. */
  getOptions(): Promise<{ grades: GradeInfo[]; batteryOptions: BatteryOptionInfo[] }>;
  getPromoCodes(): Promise<PromoCode[]>;
  getTradeInGrid(): Promise<{ prices: TradeInPrice[]; config: TradeInConfig }>;
}
