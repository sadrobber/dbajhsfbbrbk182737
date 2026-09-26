import { describe, expect, it } from "vitest";
import { strictestSupply, supplyOf } from "@/lib/data/catalog-logic";
import { catalogItems, settings } from "@/test/fixtures";
import { parseCart, serializeCart, setInCart } from "./cart";
import { priceCart } from "./pricing";
import { stageOf } from "./stage";

const describe_ = { product: (item: { id: string }) => item.id, package: (pkg: { id: string }) => pkg.id };

describe("supplyOf", () => {
  it("uses the shop's stock first, then the supplier setting", () => {
    expect(supplyOf({ stock: 2, supplierAvailability: "none" })).toBe("in_store");
    expect(supplyOf({ stock: 2, supplierAvailability: "within_48h" }, 3)).toBe("within_48h");
    expect(supplyOf({ stock: 0, supplierAvailability: "on_request" })).toBe("on_request");
    expect(supplyOf({ stock: 0, supplierAvailability: "none" })).toBeNull();
  });

  it("gives the order the most restrictive line's supply", () => {
    expect(strictestSupply([])).toBe("in_store");
    expect(strictestSupply(["in_store", "within_48h", "in_store"])).toBe("within_48h");
    expect(strictestSupply(["within_48h", "on_request"])).toBe("on_request");
  });
});

describe("cart cookie", () => {
  it("round-trips and ignores anything malformed", () => {
    const cart = [
      { kind: "product" as const, id: "iphone-16-128", quantity: 2 },
      { kind: "package" as const, id: "max-protection", quantity: 1 },
    ];
    expect(parseCart(serializeCart(cart))).toEqual(cart);
    expect(parseCart("p:iphone-16-128:1,x:evil:1,p:../etc:1,p:BAD:1,p:iphone-16-128:2,p:pixel:0")).toEqual([
      { kind: "product", id: "iphone-16-128", quantity: 1 },
    ]);
    expect(parseCart("p:iphone-16-128:99")[0].quantity).toBe(3);
  });

  it("sets quantities within limits and removes at 0", () => {
    let cart = setInCart([], "product", "a", 1);
    cart = setInCart(cart, "product", "a", 5);
    expect(cart).toEqual([{ kind: "product", id: "a", quantity: 3 }]);
    expect(setInCart(cart, "product", "a", 0)).toEqual([]);
  });
});

describe("priceCart", () => {
  const inStore = catalogItems.find((i) => i.stock > 0)!;
  const soldOut = { ...inStore, id: "sold-out", stock: 0, supplierAvailability: "none" as const };
  const supplier = { ...inStore, id: "supplier", stock: 0, supplierAvailability: "within_48h" as const, price: 1000 };
  const items = [inStore, soldOut, supplier];
  const pkg = settings.packages[0];

  it("prices from the catalogue and picks the order's supply", () => {
    const priced = priceCart(
      [
        { kind: "product", id: inStore.id, quantity: 1 },
        { kind: "product", id: "supplier", quantity: 1 },
        { kind: "package", id: pkg.id, quantity: 1 },
      ],
      items,
      settings.packages,
      describe_,
    );
    expect(priced.supply).toBe("within_48h");
    expect(priced.total).toBe(inStore.price + 1000 + pkg.price);
    expect(priced.lines.map((l) => l.supply)).toEqual(["in_store", "within_48h", "in_store"]);
    expect(priced.unavailable).toEqual([]);
  });

  it("reports what can't be ordered", () => {
    const priced = priceCart(
      [
        { kind: "product", id: "sold-out", quantity: 1 },
        { kind: "product", id: "unknown", quantity: 1 },
      ],
      items,
      settings.packages,
      describe_,
    );
    expect(priced.lines).toEqual([]);
    expect(priced.unavailable.map((e) => e.id)).toEqual(["sold-out", "unknown"]);
  });
});

describe("stageOf", () => {
  const base = { payment: null, availabilityCheck: null };
  it("tells apart a paid order waiting for payment and a confirmed request", () => {
    expect(stageOf({ ...base, status: "pending_payment" })).toBe("request_confirmed");
    expect(
      stageOf({
        ...base,
        status: "pending_payment",
        payment: {
          provider: "demo",
          checkoutId: "x",
          paymentId: null,
          capture: "manual",
          status: "pending",
          amount: 1,
          authorizedAt: null,
          capturedAt: null,
          releasedAt: null,
        },
      }),
    ).toBe("payment_pending");
  });

  it("explains a cancellation for unavailability", () => {
    expect(
      stageOf({ ...base, status: "cancelled", availabilityCheck: { status: "unavailable", checkedAt: null, checkedBy: null, alternative: null } }),
    ).toBe("unavailable");
    expect(stageOf({ ...base, status: "cancelled" })).toBe("cancelled");
  });
});
