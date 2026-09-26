import "server-only";
import { readGaugeConfig, readRows, updateRows, writeGaugeConfig } from "./json-store";
import { orderStatusesToCheck } from "./records";
import type { Deal, GaugeSettings, PackageDefinition, Product } from "./schema";

/**
 * Reads and writes for the admin. The admin UI calls only these functions,
 * so moving to a real database means re-implementing this file (and
 * ./local-source.ts for the shop), not touching the screens.
 */

export class AdminDataError extends Error {}

// --- catalogue ---------------------------------------------------------------

export const listBrands = () => readRows("brands");
export const listProducts = () => readRows("products");

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function assertBrandExists(brand: string) {
  if (!(await listBrands()).some((b) => b.id === brand)) throw new AdminDataError(`Unknown brand "${brand}".`);
}

/** Creates a product. Its id (used in the product URL) is built from brand, model, storage and condition. */
export async function createProduct(input: Omit<Product, "id">): Promise<Product> {
  await assertBrandExists(input.brand);
  const rows = await updateRows("products", (rows) => {
    const base =
      slugify(`${input.brand} ${input.model} ${input.storageGb} ${input.condition === "refurbished" ? "refurb" : ""}`) || "product";
    let id = base;
    for (let n = 2; rows.some((row) => row.id === id); n++) id = `${base}-${n}`;
    return [...rows, { ...input, id }];
  });
  return rows[rows.length - 1];
}

export async function updateProduct(product: Product): Promise<Product> {
  await assertBrandExists(product.brand);
  await updateRows("products", (rows) => {
    if (!rows.some((row) => row.id === product.id)) throw new AdminDataError("This product no longer exists.");
    return rows.map((row) => (row.id === product.id ? product : row));
  });
  return product;
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
    throw new AdminDataError(
      `This product appears in ${used} order${used > 1 ? "s" : ""}, so it can't be deleted. Set its stock to 0 to hide it from the shop.`,
    );
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
  if (missing) throw new AdminDataError(`Product "${missing.productId}" no longer exists.`);
  if (new Set(entries.map((e) => e.productId)).size !== entries.length) throw new AdminDataError("A product is listed twice.");

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
    if (!current) throw new AdminDataError("Unknown package.");
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
