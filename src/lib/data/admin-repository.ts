import "server-only";
import { readGaugeConfig, readRows, updateRows, writeGaugeConfig } from "./json-store";
import { orderStatusesToCheck } from "./records";
import type { AdminMessages } from "@/i18n/admin";
import type { Deal, GaugeSettings, ModelRef, PackageDefinition, PhoneModel, Product } from "./schema";

/**
 * Reads and writes for the admin. The admin UI calls only these functions,
 * so moving to a real database means re-implementing this file (and
 * ./local-source.ts for the shop), not touching the screens.
 */

/** An error staff should read. The code is a key of messages/admin Errors.<code>, translated by the admin. */
export type AdminErrorCode = keyof AdminMessages["Errors"];

export class AdminDataError extends Error {
  constructor(
    readonly code: AdminErrorCode,
    readonly values: Record<string, string | number> = {},
  ) {
    super(code);
    this.name = "AdminDataError";
  }
}

// --- catalogue ---------------------------------------------------------------

export const listBrands = () => readRows("brands");
export const listProducts = () => readRows("products");
export const listModels = () => readRows("models");

/** What the admin's forms and lists need from each model, without the full specs (~650 kB). */
export type AdminModel = ModelRef & {
  /** "Apple iPhone 16", "Samsung Galaxy S25" (full_name leaves the brand out for Apple). */
  label: string;
  storage_gb: number[];
  release_year: number | null;
  status: PhoneModel["data_quality"]["status"];
  missing_fields: string[];
};

export async function listAdminModels(): Promise<AdminModel[]> {
  return (await listModels()).map((m) => ({
    id: m.id,
    brand: m.brand,
    name: m.name,
    label: `${m.brand} ${m.name}`,
    colors: m.colors,
    storage_gb: m.specs.storage_gb,
    release_year: m.release.year,
    status: m.data_quality.status,
    missing_fields: m.data_quality.missing_fields,
  }));
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The product must match its model: the model exists, and offers this storage and colour. */
async function assertFitsModel(product: Omit<Product, "id">) {
  const model = (await listModels()).find((m) => m.id === product.modelId);
  if (!model) throw new AdminDataError("pickModel");
  if (!model.specs.storage_gb.includes(product.storageGb)) {
    throw new AdminDataError("storageNotOffered", { model: `${model.brand} ${model.name}`, storage: product.storageGb });
  }
  if (model.colors.length > 0 && !model.colors.some((c) => c.name_en === product.colorName)) {
    throw new AdminDataError("colourNotOffered", { model: `${model.brand} ${model.name}`, colour: product.colorName });
  }
  return model;
}

/**
 * Creates a product (a variant). Its id, used in URLs, is built from the model,
 * storage, colour and condition; the SKU from the id.
 */
export async function createProduct(input: Omit<Product, "id" | "sku">): Promise<Product> {
  await assertFitsModel({ ...input, sku: "NC-NEW" });
  let created: Product | undefined;
  await updateRows("products", (rows) => {
    const shortModel = input.modelId.replace(/^(apple|google|samsung|xiaomi|oneplus|nothing)-/, "");
    const condition = input.condition === "new" ? "new" : `${input.grade ?? "refurb"}${input.battery === "new" ? "-new-battery" : ""}`;
    const base = slugify(`${shortModel} ${input.storageGb} ${input.colorName} ${condition}`) || "product";
    let id = base;
    for (let n = 2; rows.some((row) => row.id === id); n++) id = `${base}-${n}`;
    created = { ...input, id, sku: `NC-${id.toUpperCase()}` };
    return [...rows, created];
  });
  return created!;
}

/** Updates a product. Its id and SKU never change (orders and labels refer to them). */
export async function updateProduct(product: Product): Promise<Product> {
  await assertFitsModel(product);
  let saved: Product | undefined;
  await updateRows("products", (rows) => {
    const current = rows.find((row) => row.id === product.id);
    if (!current) throw new AdminDataError("productGone");
    saved = { ...product, sku: current.sku };
    return rows.map((row) => (row.id === product.id ? saved! : row));
  });
  return saved!;
}

/**
 * Deletes a product and takes it out of Great Deals. Refused when orders
 * point to it (a database would do the same with a foreign key): set its
 * stock to 0 instead, which hides it from the shop.
 */
export async function deleteProduct(id: string): Promise<void> {
  const orders = await readRows("orders");
  const used = orders.filter((order) => order.lines.some((line) => line.productId === id)).length;
  if (used > 0) {
    throw new AdminDataError("productInOrders", { count: used });
  }
  await updateRows("deals", (rows) => rows.filter((deal) => deal.productId !== id).map((deal, position) => ({ ...deal, position })));
  await updateRows("products", (rows) => rows.filter((row) => row.id !== id));
}

// --- merchandising -----------------------------------------------------------

export async function listDeals(): Promise<Deal[]> {
  return [...(await readRows("deals"))].sort((a, b) => a.position - b.position);
}

/** Replaces the Great Deals list, in the given order. */
export async function saveDeals(entries: Omit<Deal, "id" | "position">[]): Promise<Deal[]> {
  const products = new Set((await listProducts()).map((p) => p.id));
  const missing = entries.find((entry) => !products.has(entry.productId));
  if (missing) throw new AdminDataError("dealProductGone", { product: missing.productId });
  if (new Set(entries.map((e) => e.productId)).size !== entries.length) throw new AdminDataError("dealListedTwice");

  return updateRows("deals", () =>
    entries.map((entry, position) => ({
      id: `deal-${entry.productId}`,
      productId: entry.productId,
      position,
      promoBadge: entry.promoBadge,
      promoLabel: entry.promoBadge === "custom" ? entry.promoLabel : null,
    })),
  );
}

export async function listPackages(): Promise<PackageDefinition[]> {
  return [...(await readRows("packages"))].sort((a, b) => a.position - b.position);
}

/** Updates one package's price and contents. Packages themselves (ids, names) are fixed. */
export async function savePackage(pkg: PackageDefinition): Promise<PackageDefinition> {
  await updateRows("packages", (rows) => {
    const current = rows.find((row) => row.id === pkg.id);
    if (!current) throw new AdminDataError("unknownPackage");
    return rows.map((row) => (row.id === pkg.id ? { ...pkg, position: current.position, icon: current.icon } : row));
  });
  return pkg;
}

export const getGauge = () => readGaugeConfig();
export const saveGauge = (gauge: GaugeSettings) => writeGaugeConfig(gauge);

// --- records -----------------------------------------------------------------
// NOTE: the rows shipped in data/*.json are placeholder examples. Orders and
// customers from the shop's checkout are added next to them; trade-ins,
// tickets and invoices have no customer flow yet.

export const listCustomers = () => readRows("customers");
export const listOrders = () => readRows("orders");
export { getCustomer, getOrder } from "./order-repository";

/** Orders waiting for staff to check availability ("24-48h" authorised, or "on request"). */
export async function countOrdersToCheck(): Promise<number> {
  return (await listOrders()).filter((o) => orderStatusesToCheck.includes(o.status)).length;
}
export const listTradeIns = () => readRows("trade-ins");
export const listTickets = () => readRows("tickets");
export const listInvoices = () => readRows("invoices");
