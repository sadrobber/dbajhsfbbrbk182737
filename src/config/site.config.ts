import type { ServiceArea } from "@/lib/data/schema";

/**
 * ============================================================================
 *  SITE CONFIGURATION: settings that stay in code.
 * ============================================================================
 *
 *  - Brand name ............ BRAND_NAME (below)
 *  - Products, Great Deals, packages, the Gauge: edit them in the admin (/admin).
 *    They are stored in /data/*.json until a real database exists.
 *
 *  Texts (titles, labels, package names...) live in /messages/{fr,en,it}.json.
 */

/** Shop name, shown as a text wordmark everywhere. Change it here only. */
export const BRAND_NAME = "Novacell";

/** Keep false while prices and stock are mock data, so search engines skip the prototype. */
export const ALLOW_SEARCH_INDEXING = false;

export const storefrontSettings = {
  /** At or below this stock, cards say "Only N left". */
  lowStockThreshold: 3,
  /** The homepage shows at most this many Great Deals (sold-out ones are skipped). */
  greatDealsMaxItems: 6,
  /** All refurbished phones in stock, most premium first. */
  refurbishedPicksMaxItems: 8,
  serviceArea: {
    towns: ["menton", "monaco", "beausoleil", "cap-dail", "roquebrune-cap-martin", "sospel"],
    services: ["collection", "support", "data_transfer", "after_sales"],
  } satisfies ServiceArea,
};
