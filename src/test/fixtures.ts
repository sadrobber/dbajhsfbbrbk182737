import { storefrontSettings } from "@/config/site.config";
import { enrichCatalog, inStock } from "@/lib/data/catalog-logic";
import { brandSchema, dealSchema, gaugeSchema, type Merchandising, packageSchema, productSchema } from "@/lib/data/schema";
import brands from "../../data/brands.json";
import deals from "../../data/deals.json";
import gauge from "../../data/gauge-config.json";
import packages from "../../data/packages.json";
import products from "../../data/products.json";

export const catalog = {
  currency: "EUR" as const,
  brands: brandSchema.array().parse(brands.rows),
  products: productSchema.array().parse(products.rows),
};
export const catalogItems = enrichCatalog(catalog);
export const availableItems = inStock(catalogItems);
export const settings: Merchandising = {
  lowStockThreshold: storefrontSettings.lowStockThreshold,
  greatDeals: { deals: dealSchema.array().parse(deals.rows), maxItems: storefrontSettings.greatDealsMaxItems },
  refurbishedPicks: { maxItems: storefrontSettings.refurbishedPicksMaxItems },
  gauge: gaugeSchema.parse(gauge),
  packages: packageSchema.array().parse(packages.rows),
  serviceArea: storefrontSettings.serviceArea,
};
export const packageIds = settings.packages.map((pkg) => pkg.id);
