import {
  type BatteryOption,
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
  sku: string | null;
  modelId: string;
  condition: Condition;
  storageGb: string;
  colorName: string;
  color: ColorKey;
  grade: Grade | "";
  battery: BatteryOption | "";
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

export function newDraft(): ProductDraft {
  return {
    id: null,
    sku: null,
    modelId: "",
    condition: "new",
    storageGb: "",
    colorName: "",
    color: "black",
    grade: "",
    battery: "",
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
    sku: product.sku,
    modelId: product.modelId,
    condition: product.condition,
    storageGb: String(product.storageGb),
    colorName: product.colorName,
    color: product.color,
    grade: product.grade ?? "",
    battery: product.battery ?? "",
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

/** The product as it would be saved (may be invalid: the schema says why). New products get their id and SKU on save. */
export function productOf(draft: ProductDraft): Product {
  const refurbished = draft.condition === "refurbished";
  return {
    id: draft.id ?? "new-product",
    sku: draft.sku ?? "NC-NEW",
    modelId: draft.modelId,
    condition: draft.condition,
    storageGb: toNumber(draft.storageGb),
    colorName: draft.colorName,
    color: draft.color,
    grade: refurbished && draft.grade ? draft.grade : null,
    battery: refurbished && draft.battery ? draft.battery : null,
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
  const refurbished = product.condition === "refurbished";
  return {
    ...product,
    storageGb: safe(product.storageGb, 128) ?? 128,
    colorName: product.colorName || "—",
    warrantyMonths: safe(product.warrantyMonths, 12) ?? 12,
    price,
    compareAtPrice: compare !== null && compare > price ? compare : null,
    stock: Number.isFinite(product.stock) ? Math.max(0, product.stock) : 0,
    grade: refurbished ? (product.grade ?? "excellent") : null,
    battery: refurbished ? (product.battery ?? "standard") : null,
    batteryHealth: refurbished ? Math.min(100, safe(product.batteryHealth, 90) ?? 90) : null,
    goodFor: product.goodFor.length > 0 ? product.goodFor : ["easy"],
  };
}
