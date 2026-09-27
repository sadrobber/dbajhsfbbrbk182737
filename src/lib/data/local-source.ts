import "server-only";
import { storefrontSettings } from "@/config/site.config";
import { readGaugeConfig, readRows, readTradeInConfig } from "./json-store";
import type { DataSource } from "./source";

const byPosition = <T extends { position: number }>(rows: T[]) => [...rows].sort((a, b) => a.position - b.position);

/** Reads the JSON tables in /data (edited from the admin) and the settings in site.config.ts. */
export const localDataSource: DataSource = {
  async getCatalog() {
    const [brands, models, products] = await Promise.all([readRows("brands"), readRows("models"), readRows("products")]);
    return { currency: "EUR", brands, models, products };
  },
  async getMerchandising() {
    const [deals, packages, gauge] = await Promise.all([readRows("deals"), readRows("packages"), readGaugeConfig()]);
    return {
      lowStockThreshold: storefrontSettings.lowStockThreshold,
      greatDeals: {
        deals: byPosition(deals),
        maxItems: storefrontSettings.greatDealsMaxItems,
      },
      refurbishedPicks: { maxItems: storefrontSettings.refurbishedPicksMaxItems },
      gauge,
      packages: byPosition(packages),
      serviceArea: storefrontSettings.serviceArea,
    };
  },
  async getOptions() {
    const [grades, batteryOptions] = await Promise.all([readRows("grades"), readRows("battery-options")]);
    return { grades: byPosition(grades), batteryOptions: byPosition(batteryOptions) };
  },
  getPromoCodes: () => readRows("promo-codes"),
  async getTradeInGrid() {
    const [prices, config] = await Promise.all([readRows("tradein-prices"), readTradeInConfig()]);
    return { prices, config };
  },
};
