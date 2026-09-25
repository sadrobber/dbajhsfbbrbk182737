import type { Catalog, Merchandising } from "./schema";

/**
 * Where the storefront gets its data.
 *
 * Today: local files (src/data/catalog.json + src/config/site.config.ts).
 * Later: a database or a headless commerce backend with an admin panel and
 * real-time stock. Implement this interface for the new backend and switch
 * it in ./index.ts. Nothing in the UI needs to change.
 */
export interface DataSource {
  getCatalog(): Promise<Catalog>;
  getMerchandising(): Promise<Merchandising>;
}
