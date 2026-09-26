import type { Catalog, Merchandising } from "./schema";

/**
 * Where the storefront gets its data.
 *
 * Today: the JSON tables in /data (edited from /admin) + src/config/site.config.ts.
 * Later: a real database with real-time stock. Implement this interface for
 * it and switch it in ./index.ts (and replace ./admin-repository.ts for the
 * admin's writes). Nothing in the UI needs to change.
 */
export interface DataSource {
  getCatalog(): Promise<Catalog>;
  getMerchandising(): Promise<Merchandising>;
}
