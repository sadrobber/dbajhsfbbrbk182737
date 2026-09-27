import { describe, expect, it } from "vitest";
import { colorFamilyOf, modelsInShop } from "./catalog-logic";
import { findIntegrityProblems } from "./integrity";
import { applyPromoCode, promoCodeSchema, quoteTradeIn, type TradeInAnswers, tradeInConfigSchema, tradeInPriceSchema } from "./pricing";
import { customerSchema, invoiceSchema, orderSchema, ticketSchema, tradeInSchema } from "./records";
import { batteryOptionInfoSchema, gradeInfoSchema, grades } from "./schema";
import { catalog, catalogItems, settings } from "@/test/fixtures";
import batteryOptions from "../../../data/battery-options.json";
import customers from "../../../data/customers.json";
import gradeRows from "../../../data/grades.json";
import invoices from "../../../data/invoices.json";
import orders from "../../../data/orders.json";
import promoCodes from "../../../data/promo-codes.json";
import tickets from "../../../data/tickets.json";
import tradeInConfig from "../../../data/tradein-config.json";
import tradeInPrices from "../../../data/tradein-prices.json";
import tradeIns from "../../../data/trade-ins.json";

const db = {
  brands: catalog.brands,
  models: catalog.models,
  grades: gradeInfoSchema.array().parse(gradeRows.rows),
  "battery-options": batteryOptionInfoSchema.array().parse(batteryOptions.rows),
  products: catalog.products,
  deals: settings.greatDeals.deals,
  packages: settings.packages,
  "promo-codes": promoCodeSchema.array().parse(promoCodes.rows),
  "tradein-prices": tradeInPriceSchema.array().parse(tradeInPrices.rows),
  customers: customerSchema.array().parse(customers.rows),
  orders: orderSchema.array().parse(orders.rows),
  "trade-ins": tradeInSchema.array().parse(tradeIns.rows),
  tickets: ticketSchema.array().parse(tickets.rows),
  invoices: invoiceSchema.array().parse(invoices.rows),
};
const tradeIn = tradeInConfigSchema.parse(tradeInConfig);

describe("data/*.json", () => {
  it("is consistent like a database would be (unique ids, no dangling references, variants fit their model)", () => {
    expect(findIntegrityProblems(db)).toEqual([]);
  });

  it("order totals add up and invoices match their order", () => {
    for (const order of db.orders) {
      expect(order.total, order.id).toBe(order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
    }
    for (const invoice of db.invoices) {
      const order = db.orders.find((o) => o.id === invoice.orderId);
      expect(invoice.total, invoice.id).toBe(order?.total);
      expect(Math.round((invoice.totalExclVat + invoice.vat) * 100) / 100, invoice.id).toBe(invoice.total);
    }
  });

  it("has the whole spec database, with incomplete models flagged", () => {
    expect(db.models.length).toBe(252);
    for (const model of db.models) {
      const unknown = model.specs.battery_mah === null || model.specs.dimensions_mm === null || model.specs.weight_g === null;
      if (unknown) expect(model.data_quality.missing_fields.length, model.id).toBeGreaterThan(0);
    }
  });

  it("describes every grade, in display order", () => {
    expect(db.grades.map((g) => g.id)).toEqual(["new", ...grades]);
    expect(db.grades.filter((g) => g.forNewPhones).map((g) => g.id)).toEqual(["new"]);
  });
});

describe("findIntegrityProblems", () => {
  it("reports duplicate ids and dangling foreign keys", () => {
    const problems = findIntegrityProblems({
      brands: catalog.brands,
      products: [catalog.products[0], catalog.products[0]],
      deals: [{ id: "d", productId: "nope", position: 0, promoBadge: null, promoLabel: null }],
    });
    expect(problems).toContain(`products: duplicate id "${catalog.products[0].id}"`);
    expect(problems).toContain('deals/d.productId points to a missing row "nope"');
  });

  it("refuses a variant in a storage or colour its model doesn't come in", () => {
    const product = { ...catalog.products[0], storageGb: 3, colorName: "Hot Pink" };
    const problems = findIntegrityProblems({ models: catalog.models, products: [product] });
    expect(problems.some((p) => p.includes("3 GB isn't a storage option"))).toBe(true);
    expect(problems.some((p) => p.includes('"Hot Pink" isn\'t a colour'))).toBe(true);
  });
});

describe("catalogue", () => {
  it("gives each variant its model, brand and official colour names", () => {
    const item = catalogItems.find((i) => i.id === "iphone-16-128")!;
    expect(item).toMatchObject({ brand: "apple", brandName: "Apple", model: "iPhone 16", colorNames: { en: "Teal", fr: null, it: null } });
  });

  it("shows in the shop only models with something to sell", () => {
    const shown = modelsInShop(catalog.models, catalogItems).map((m) => m.id);
    expect(shown).toContain("apple-iphone-16");
    expect(shown).toContain("samsung-galaxy-z-fold7"); // on request
    expect(shown).not.toContain("apple-iphone-6s");
  });

  it("guesses the illustration colour from the official name", () => {
    expect(colorFamilyOf("Sierra Blue")).toBe("blue");
    expect(colorFamilyOf("Midnight")).toBe("black");
    expect(colorFamilyOf("Titanium Whitesilver")).toBe("white");
    expect(colorFamilyOf("Unknown shade")).toBe("grey");
  });
});

describe("promo codes", () => {
  const codes = db["promo-codes"];
  const now = new Date("2026-10-01T10:00:00Z");

  it("applies a valid code, case-insensitively", () => {
    expect(applyPromoCode(codes, " bienvenue10 ", 400, now)).toMatchObject({ ok: true, discount: 40 });
    expect(applyPromoCode(codes, "NOVACELL30", 350, now)).toMatchObject({ ok: true, discount: 30 });
  });

  it("refuses unknown, expired or too-small orders", () => {
    expect(applyPromoCode(codes, "NOPE", 400, now)).toEqual({ ok: false, reason: "unknown" });
    expect(applyPromoCode(codes, "ETE2026", 400, now)).toEqual({ ok: false, reason: "expired" });
    expect(applyPromoCode(codes, "BIENVENUE10", 100, now)).toEqual({ ok: false, reason: "min_order", minOrder: 200 });
  });
});

describe("trade-in quote", () => {
  const prices = db["tradein-prices"];
  const perfect: TradeInAnswers = {
    modelId: "apple-iphone-15",
    storageGb: 128,
    worksNormally: true,
    screen: "perfect",
    body: "perfect",
    batteryAbove80: true,
    biometricsWork: true,
    unlocked: true,
  };
  const base = prices.find((p) => p.modelId === "apple-iphone-15" && p.storageGb === 128)!.basePrice;

  it("pays the base price for a perfect phone, plus the bonus as store credit", () => {
    expect(quoteTradeIn(prices, tradeIn, perfect)).toEqual({
      kind: "offer",
      amount: base,
      storeCreditAmount: Math.round((base * (100 + tradeIn.storeCreditBonusPercent)) / 100),
    });
  });

  it("deducts for each problem", () => {
    const d = tradeIn.deductionsPercent;
    const quote = quoteTradeIn(prices, tradeIn, { ...perfect, screen: "cracked", batteryAbove80: false });
    expect(quote).toMatchObject({ kind: "offer", amount: Math.round((base * (100 - d.screen.cracked - d.batteryBelow80)) / 100) });
  });

  it("follows the policies for locked or dead phones, and unknown models", () => {
    expect(quoteTradeIn(prices, tradeIn, { ...perfect, unlocked: false })).toEqual({ kind: "refused", reason: "locked" });
    expect(quoteTradeIn(prices, tradeIn, { ...perfect, worksNormally: false })).toEqual({
      kind: "recycle",
      amount: tradeIn.notWorking.recycleOffer,
    });
    expect(quoteTradeIn(prices, tradeIn, { ...perfect, modelId: "apple-iphone-6s" })).toEqual({ kind: "not_bought" });
  });
});
