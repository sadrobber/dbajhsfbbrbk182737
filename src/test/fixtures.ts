import { merchandising } from "@/config/site.config";
import rawCatalog from "@/data/catalog.json";
import { enrichCatalog, inStock } from "@/lib/data/catalog-logic";
import { catalogSchema } from "@/lib/data/schema";

export const catalogItems = enrichCatalog(catalogSchema.parse(rawCatalog));
export const availableItems = inStock(catalogItems);
export const settings = merchandising;
export const packageIds = merchandising.packages.map((pkg) => pkg.id);
