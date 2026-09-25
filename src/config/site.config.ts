import type { Merchandising } from "@/lib/data/schema";

/**
 * ============================================================================
 *  SITE CONFIGURATION: the one file to edit until the back office exists.
 * ============================================================================
 *
 *  - Brand name ............ BRAND_NAME
 *  - Gauge % ............... merchandising.gauge.percent
 *  - Great Deals ........... merchandising.greatDeals.productIds (ids from src/data/catalog.json)
 *  - Packages .............. merchandising.packages
 *
 *  Texts (titles, labels, package names...) live in /messages/{fr,en,it}.json.
 *  The UI reads these settings through src/lib/data, so they can move to a
 *  database and an admin panel later without touching any component.
 */

/** Shop name, shown as a text wordmark everywhere. Change it here only. */
export const BRAND_NAME = "Novacell";

/** Keep false while prices and stock are mock data, so search engines skip the prototype. */
export const ALLOW_SEARCH_INDEXING = false;

export const merchandising = {
  lowStockThreshold: 3,

  greatDeals: {
    // Shown in this order. Sold-out products are skipped automatically.
    productIds: [
      "galaxy-s25-256",
      "pixel-9a-128",
      "iphone-16-128",
      "iphone-17-256",
      "redmi-note-14-pro-256",
      "iphone-13-128-refurb",
    ],
    maxItems: 6,
  },

  refurbishedPicks: {
    // All refurbished phones in stock, most premium first.
    maxItems: 8,
  },

  gauge: {
    enabled: true,
    percent: 67,
    prizes: ["smartphone", "computer", "console"],
    rulesPath: "/rules",
  },

  packages: [
    {
      id: "max-protection",
      price: 49,
      icon: "shield",
      items: [
        { key: "wall_charger", icon: "plug" },
        { key: "charging_cable", icon: "cable" },
        { key: "screen_protection", icon: "screen", todo: true }, // TODO: confirm package contents
        { key: "case", icon: "case", todo: true }, // TODO: confirm package contents
      ],
    },
    {
      id: "ready-to-use",
      price: 79,
      icon: "sparkles",
      items: [
        // TODO: confirm the services included in the Ready-to-Use Package
        { key: "setup", icon: "settings", todo: true },
        { key: "data_transfer", icon: "transfer", todo: true },
        { key: "accounts", icon: "user", todo: true },
        { key: "final_check", icon: "check", todo: true },
      ],
    },
  ],

  serviceArea: {
    towns: ["menton", "monaco", "beausoleil", "cap-dail", "roquebrune-cap-martin", "sospel"],
    services: ["collection", "support", "data_transfer", "after_sales"],
  },
} satisfies Merchandising;
