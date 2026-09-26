/**
 * The cart lives in a cookie readable by the browser (for the header count):
 * "p:<productId>:<quantity>,k:<packageId>:<quantity>". It holds no prices;
 * the server re-reads the catalogue whenever it shows or orders the cart.
 */

export const CART_COOKIE = "nc_cart";
export const MAX_CART_LINES = 10;
export const MAX_QUANTITY = 3;

export type CartEntry = { kind: "product" | "package"; id: string; quantity: number };

const ENTRY = /^([pk]):([a-z0-9-]{1,80}):(\d{1,2})$/;

export function parseCart(value: string | undefined | null): CartEntry[] {
  if (!value) return [];
  const entries: CartEntry[] = [];
  for (const part of value.split(",")) {
    const match = ENTRY.exec(part);
    if (!match) continue;
    const kind = match[1] === "p" ? "product" : "package";
    const quantity = Math.min(MAX_QUANTITY, Number(match[3]));
    if (quantity < 1 || entries.some((e) => e.kind === kind && e.id === match[2])) continue;
    entries.push({ kind, id: match[2], quantity });
  }
  return entries.slice(0, MAX_CART_LINES);
}

export function serializeCart(entries: CartEntry[]): string {
  return entries.map((e) => `${e.kind === "product" ? "p" : "k"}:${e.id}:${e.quantity}`).join(",");
}

/** Adds one of an item (or sets its quantity), within the cart limits. */
export function setInCart(entries: CartEntry[], kind: CartEntry["kind"], id: string, quantity: number): CartEntry[] {
  const clamped = Math.max(0, Math.min(MAX_QUANTITY, Math.trunc(quantity)));
  const exists = entries.some((e) => e.kind === kind && e.id === id);
  if (!exists) return clamped > 0 && entries.length < MAX_CART_LINES ? [...entries, { kind, id, quantity: clamped }] : entries;
  return entries.flatMap((e) => (e.kind === kind && e.id === id ? (clamped > 0 ? [{ ...e, quantity: clamped }] : []) : [e]));
}

export function cartCount(entries: CartEntry[]): number {
  return entries.reduce((sum, e) => sum + e.quantity, 0);
}
