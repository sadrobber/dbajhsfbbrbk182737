import type { PhoneModel, Visual } from "@/lib/data/schema";

/** Comparisons linked from the picker (and the ones the brief asked for first). */
export const FEATURED_COMPARISONS: readonly [mine: string, want: string][] = [
  ["apple-iphone-16", "apple-iphone-17"],
  ["apple-iphone-14", "apple-iphone-15"],
  ["apple-iphone-12", "apple-iphone-13"],
  ["apple-iphone-11", "apple-iphone-12"],
  ["apple-iphone-13", "apple-iphone-13-pro"],
];

/** "apple-iphone-12-vs-apple-iphone-16" -> the two model ids (model ids never contain "-vs-"). */
export function parseComparePair(pair: string): { mine: string; want: string } | null {
  const parts = pair.split("-vs-");
  return parts.length === 2 && parts[0] && parts[1] ? { mine: parts[0], want: parts[1] } : null;
}

/** The neutral illustration closest to a model's camera layout (there are no model photos). */
export function visualForModel(model: Pick<PhoneModel, "specs">): Visual {
  const count = model.specs.rear_cameras.length;
  return count <= 1 ? "single" : count === 2 ? "duo" : "trio";
}

/** Brands in the order customers know them best, then the rest alphabetically. */
const BRAND_ORDER = ["Apple", "Samsung", "Google", "Xiaomi", "OnePlus", "Nothing"];

/** Models grouped by brand, newest first: for the pickers. */
export function modelsByBrand<M extends Pick<PhoneModel, "id" | "brand" | "name" | "release">>(models: M[]): { brand: string; models: M[] }[] {
  const groups = new Map<string, M[]>();
  for (const model of models) groups.set(model.brand, [...(groups.get(model.brand) ?? []), model]);
  const rank = (brand: string) => {
    const index = BRAND_ORDER.indexOf(brand);
    return index === -1 ? BRAND_ORDER.length : index;
  };
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([brand, list]) => ({
      brand,
      models: [...list].sort((a, b) => (b.release.month ?? "").localeCompare(a.release.month ?? "") || a.name.localeCompare(b.name)),
    }));
}

/** "Apple iPhone 16", "Samsung Galaxy S25", "OnePlus 13". */
export function modelTitle(model: Pick<PhoneModel, "brand" | "full_name">): string {
  return model.full_name.toLowerCase().startsWith(model.brand.toLowerCase()) ? model.full_name : `${model.brand} ${model.full_name}`;
}
