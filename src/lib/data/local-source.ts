import "server-only";
import { z } from "zod";
import { merchandising } from "@/config/site.config";
import rawCatalog from "@/data/catalog.json";
import { catalogSchema, type Catalog } from "./schema";
import type { DataSource } from "./source";

let validated: Catalog | null = null;

function loadCatalog(): Catalog {
  if (!validated) {
    const result = catalogSchema.safeParse(rawCatalog);
    if (!result.success) {
      throw new Error(`src/data/catalog.json is invalid:\n${z.prettifyError(result.error)}`);
    }
    validated = result.data;
  }
  return validated;
}

/** Reads the mock catalogue and the settings in site.config.ts. */
export const localDataSource: DataSource = {
  async getCatalog() {
    return loadCatalog();
  },
  async getMerchandising() {
    return merchandising;
  },
};
