import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readRows } from "@/lib/data/json-store";
import { getOrder } from "@/lib/data/order-repository";
import type { CartEntry } from "@/lib/orders/cart";
import type { CheckoutForm } from "@/lib/orders/checkout-form";
import { placeOrder, priceCartFor } from "./checkout";
import { syncOrderPayment } from "./payment-sync";
import { confirmAvailability, declineAvailability } from "./staff";

// End to end on a copy of data/, with the demo payment gateway.

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "novacell-orders-"));
  await cp(path.join(process.cwd(), "data"), dir, { recursive: true });
  vi.stubEnv("NOVACELL_DATA_DIR", dir);
  vi.stubEnv("PAYMENT_PROVIDER", "demo");
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

const IN_STORE = "iphone-16-128";
const SUPPLIER_48H = "iphone-17-pro-256";
const ON_REQUEST = "galaxy-z-fold7-512";

const customer = {
  firstName: "Léa",
  lastName: "Martin",
  email: "lea.martin@example.com",
  phone: "+33 6 12 34 56 78",
  town: "menton",
  marketingOptIn: false,
};

async function order(cart: CartEntry[]) {
  const priced = await priceCartFor(cart, "fr");
  const form: CheckoutForm = { ...customer, expectedSupply: priced.supply, expectedTotal: priced.total };
  const result = await placeOrder(cart, form, "fr", "https://shop.test");
  if (!result.ok) throw new Error(result.reason);
  const orders = await readRows("orders");
  return { redirectUrl: result.redirectUrl, order: orders[orders.length - 1] };
}

const stockOf = async (id: string) => (await readRows("products")).find((p) => p.id === id)!.stock;

describe("order workflow", () => {
  it("in store: charged at once, stock taken", async () => {
    const before = await stockOf(IN_STORE);
    const { order: placed } = await order([{ kind: "product", id: IN_STORE, quantity: 1 }]);
    expect(placed).toMatchObject({ status: "pending_payment", supply: "in_store", payment: { status: "pending", capture: "automatic" } });

    const paid = await syncOrderPayment(placed.id);
    expect(paid).toMatchObject({ status: "paid", payment: { status: "captured" } });
    expect(await stockOf(IN_STORE)).toBe(before - 1);

    // A second sync (webhook + return page) changes nothing.
    await syncOrderPayment(placed.id);
    expect(await stockOf(IN_STORE)).toBe(before - 1);
  });

  it("24-48h: authorised, then charged when staff confirm", async () => {
    const { order: placed } = await order([
      { kind: "product", id: SUPPLIER_48H, quantity: 1 },
      { kind: "package", id: "max-protection", quantity: 1 },
    ]);
    expect(placed.payment).toMatchObject({ capture: "manual", status: "pending" });

    const authorised = await syncOrderPayment(placed.id);
    expect(authorised).toMatchObject({ status: "awaiting_availability", payment: { status: "authorized" }, availabilityCheck: { status: "to_confirm" } });

    const confirmed = await confirmAvailability(placed.id, "staff@shop.test");
    expect(confirmed).toMatchObject({ status: "paid", payment: { status: "captured" }, availabilityCheck: { status: "confirmed", checkedBy: "staff@shop.test" } });
    await expect(confirmAvailability(placed.id, "staff@shop.test")).rejects.toThrow(/no longer waiting/);
  });

  it("24-48h declined: authorisation released, in-store stock put back, alternative kept", async () => {
    const before = await stockOf(IN_STORE);
    const { order: placed } = await order([
      { kind: "product", id: IN_STORE, quantity: 1 },
      { kind: "product", id: SUPPLIER_48H, quantity: 1 },
    ]);
    await syncOrderPayment(placed.id);
    expect(await stockOf(IN_STORE)).toBe(before - 1);

    const declined = await declineAvailability(placed.id, "staff@shop.test", "iPhone 17 256 Go, en stock");
    expect(declined).toMatchObject({
      status: "cancelled",
      payment: { status: "released" },
      availabilityCheck: { status: "unavailable", alternative: "iPhone 17 256 Go, en stock" },
    });
    expect(await stockOf(IN_STORE)).toBe(before);
  });

  it("on request: no payment, straight to the order page, then confirmed by staff", async () => {
    const { order: placed, redirectUrl } = await order([{ kind: "product", id: ON_REQUEST, quantity: 1 }]);
    expect(placed).toMatchObject({ status: "quote_requested", payment: null, availabilityCheck: { status: "to_confirm" } });
    expect(redirectUrl).toBe(`https://shop.test/fr/orders/${placed.id}?t=${placed.accessToken}`);

    const confirmed = await confirmAvailability(placed.id, "staff@shop.test");
    expect(confirmed).toMatchObject({ status: "pending_payment", payment: null, availabilityCheck: { status: "confirmed" } });
  });

  it("refuses an order whose total changed since the customer saw it", async () => {
    const cart: CartEntry[] = [{ kind: "product", id: IN_STORE, quantity: 1 }];
    const result = await placeOrder(cart, { ...customer, expectedSupply: "in_store", expectedTotal: 1 }, "fr", "https://shop.test");
    expect(result).toEqual({ ok: false, reason: "changed" });
  });

  it("never rewrites an existing customer's details from the checkout", async () => {
    const existing = (await readRows("customers"))[0];
    const priced = await priceCartFor([{ kind: "product", id: ON_REQUEST, quantity: 1 }], "fr");
    await placeOrder(
      [{ kind: "product", id: ON_REQUEST, quantity: 1 }],
      { ...customer, email: existing.email.toUpperCase(), phone: "+33 0 00 00 00 00", expectedSupply: priced.supply, expectedTotal: priced.total },
      "fr",
      "https://shop.test",
    );
    const after = (await readRows("customers")).find((c) => c.id === existing.id);
    expect(after).toEqual(existing);
    const orders = await readRows("orders");
    expect((await getOrder(orders[orders.length - 1].id))?.customerId).toBe(existing.id);
  });
});
