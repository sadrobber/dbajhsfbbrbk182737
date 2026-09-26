import "server-only";
import { randomUUID } from "node:crypto";
import { readRows, updateRows } from "./json-store";
import type { Customer, Order } from "./records";

/**
 * Reads and writes for orders placed online and their customers. Used by the
 * checkout and the order workflow (src/server/orders); the admin screens reach
 * it through ./admin-repository.ts. Moving to a real database means
 * re-implementing this file.
 */

export const getOrder = async (id: string): Promise<Order | null> => (await readRows("orders")).find((o) => o.id === id) ?? null;

export async function findOrderByCheckoutId(checkoutId: string): Promise<Order | null> {
  return (await readRows("orders")).find((o) => o.payment?.checkoutId === checkoutId) ?? null;
}

export const getCustomer = async (id: string): Promise<Customer | null> =>
  (await readRows("customers")).find((c) => c.id === id) ?? null;

function uniqueId(prefix: string, taken: { id: string }[]): string {
  for (;;) {
    const id = `${prefix}-${randomUUID().slice(0, 8)}`;
    if (!taken.some((row) => row.id === id)) return id;
  }
}

/** Order numbers run per year: NC-2026-0119, NC-2026-0120... */
function nextOrderNumber(orders: Order[], now: Date): string {
  const year = now.getUTCFullYear();
  const pattern = new RegExp(`^NC-${year}-(\\d+)$`);
  const last = Math.max(0, ...orders.map((o) => Number(pattern.exec(o.number)?.[1] ?? 0)));
  return `NC-${year}-${String(last + 1).padStart(4, "0")}`;
}

export async function insertOrder(fields: Omit<Order, "id" | "number">): Promise<Order> {
  let created: Order | undefined;
  await updateRows("orders", (rows) => {
    created = { ...fields, id: uniqueId("ord", rows), number: nextOrderNumber(rows, new Date(fields.createdAt)) };
    return [...rows, created];
  });
  return created!;
}

/**
 * Read-modify-write of one order, serialized with every other order write, so
 * two callers (say the payment webhook and the customer's return page) never
 * both apply the same step. `change` returns null to leave the order as it is.
 */
export async function updateOrder(id: string, change: (order: Order) => Order | null): Promise<{ order: Order; changed: boolean }> {
  let result: { order: Order; changed: boolean } | undefined;
  await updateRows("orders", (rows) => {
    const current = rows.find((row) => row.id === id);
    if (!current) throw new Error(`Order ${id} not found`);
    const next = change(current);
    result = { order: next ?? current, changed: next !== null };
    return next ? rows.map((row) => (row.id === id ? next : row)) : rows;
  });
  return result!;
}

export type CustomerDetails = Pick<Customer, "firstName" | "lastName" | "email" | "phone" | "town" | "marketingOptIn">;

/**
 * Customers are matched by email. Checkout has no login, so a returning
 * customer's record is left as it is: anyone typing their email must not be
 * able to change their phone number or email preferences.
 */
export async function saveCustomer(details: CustomerDetails): Promise<Customer> {
  let saved: Customer | undefined;
  await updateRows("customers", (rows) => {
    saved = rows.find((row) => row.email.toLowerCase() === details.email.toLowerCase());
    if (saved) return rows;
    saved = { ...details, id: uniqueId("cus", rows), createdAt: new Date().toISOString() };
    return [...rows, saved];
  });
  return saved!;
}

/** Adds `delta` to each product's stock (negative to take it), never below 0. */
export async function adjustStock(changes: { productId: string; delta: number }[]): Promise<void> {
  if (changes.length === 0) return;
  await updateRows("products", (rows) =>
    rows.map((row) => {
      const delta = changes.filter((c) => c.productId === row.id).reduce((sum, c) => sum + c.delta, 0);
      return delta === 0 ? row : { ...row, stock: Math.max(0, row.stock + delta) };
    }),
  );
}
