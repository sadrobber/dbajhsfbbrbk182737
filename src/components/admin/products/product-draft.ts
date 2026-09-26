import {
  type Brand,
  type ColorKey,
  type Condition,
  type GoodFor,
  type Grade,
  manualBadges,
  type Product,
  type SupplierAvailability,
  type Visual,
} from "@/lib/data/schema";

export type ManualBadge = (typeof manualBadges)[number];

/** What the product form edits. Numbers stay text while typing, so fields can be empty. */
export type ProductDraft = {
  id: string | null;
  brand: string;
  model: string;
  condition: Condition;
  storageGb: string;
  color: ColorKey;
  grade: Grade | "";
  batteryHealth: string;
  warrantyMonths: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  supplierAvailability: SupplierAvailability;
  badges: ManualBadge[];
  goodFor: GoodFor[];
  visual: Visual;
  photos: string[];
};

export function newDraft(brands: Brand[]): ProductDraft {
  return {
    id: null,
    brand: brands[0]?.id ?? "",
    model: "",
    condition: "new",
    storageGb: "128",
    color: "black",
    grade: "",
    batteryHealth: "",
    warrantyMonths: "24",
    price: "",
    compareAtPrice: "",
    stock: "1",
    supplierAvailability: "none",
    badges: ["new_arrival"],
    goodFor: ["social"],
    visual: "duo",
    photos: [],
  };
}

export function draftOf(product: Product): ProductDraft {
  return {
    id: product.id,
    brand: product.brand,
    model: product.model,
    condition: product.condition,
    storageGb: String(product.storageGb),
    color: product.color,
    grade: product.grade ?? "",
    batteryHealth: product.batteryHealth === null ? "" : String(product.batteryHealth),
    warrantyMonths: String(product.warrantyMonths),
    price: String(product.price),
    compareAtPrice: product.compareAtPrice === null ? "" : String(product.compareAtPrice),
    stock: String(product.stock),
    supplierAvailability: product.supplierAvailability,
    badges: product.badges.filter((b): b is ManualBadge => (manualBadges as readonly string[]).includes(b)),
    goodFor: product.goodFor,
    visual: product.visual,
    photos: product.photos,
  };
}

const toNumber = (text: string) => (text.trim() === "" ? Number.NaN : Number(text.replace(",", ".")));
const orNull = (text: string) => (text.trim() === "" ? null : toNumber(text));

/** The product as it would be saved (may be invalid: the schema says why). */
export function productOf(draft: ProductDraft): Product {
  const refurbished = draft.condition === "refurbished";
  return {
    id: draft.id ?? "new-product",
    brand: draft.brand,
    model: draft.model.trim(),
    condition: draft.condition,
    storageGb: toNumber(draft.storageGb),
    color: draft.color,
    grade: refurbished && draft.grade ? draft.grade : null,
    batteryHealth: refurbished ? orNull(draft.batteryHealth) : null,
    warrantyMonths: toNumber(draft.warrantyMonths),
    price: toNumber(draft.price),
    compareAtPrice: orNull(draft.compareAtPrice),
    stock: toNumber(draft.stock),
    supplierAvailability: draft.supplierAvailability,
    badges: draft.badges,
    goodFor: draft.goodFor,
    visual: draft.visual,
    photos: draft.photos,
  };
}

/** Forgiving version for the live preview: half-typed numbers show as 0 instead of breaking the card. */
export function previewProductOf(draft: ProductDraft): Product {
  const product = productOf(draft);
  const safe = (n: number | null, fallback: number) => (n === null ? null : Number.isFinite(n) && n > 0 ? n : fallback);
  const price = safe(product.price, 0) ?? 0;
  const compare = safe(product.compareAtPrice, 0);
  return {
    ...product,
    model: product.model || "New phone",
    storageGb: safe(product.storageGb, 128) ?? 128,
    warrantyMonths: safe(product.warrantyMonths, 12) ?? 12,
    price,
    compareAtPrice: compare !== null && compare > price ? compare : null,
    stock: Number.isFinite(product.stock) ? Math.max(0, product.stock) : 0,
    grade: product.condition === "refurbished" ? (product.grade ?? "A") : null,
    batteryHealth: product.condition === "refurbished" ? Math.min(100, safe(product.batteryHealth, 90) ?? 90) : null,
    goodFor: product.goodFor.length > 0 ? product.goodFor : ["easy"],
  };
}
