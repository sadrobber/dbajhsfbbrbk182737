import "server-only";
import { storefrontSettings } from "@/config/site.config";
import { readGaugeConfig, readRows } from "./json-store";
import type { DataSource } from "./source";

/** Reads the JSON tables in /data (edited from the admin) and the settings in site.config.ts. */
export const localDataSource: DataSource = {
  async getCatalog() {
    const [brands, products] = await Promise.all([readRows("brands"), readRows("products")]);
    return { currency: "EUR", brands, products };
  },
  async getMerchandising() {
    const [deals, packages, gauge] = await Promise.all([readRows("deals"), readRows("packages"), readGaugeConfig()]);
    return {
      lowStockThreshold: storefrontSettings.lowStockThreshold,
      greatDeals: {
        deals: [...deals].sort((a, b) => a.position - b.position),
        maxItems: storefrontSettings.greatDealsMaxItems,
      },
      refurbishedPicks: { maxItems: storefrontSettings.refurbishedPicksMaxItems },
      gauge,
      packages: [...packages].sort((a, b) => a.position - b.position),
      serviceArea: storefrontSettings.serviceArea,
    };
  },
};
