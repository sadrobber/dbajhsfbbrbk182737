import { describe, expect, it } from "vitest";
import { findIntegrityProblems } from "./integrity";
import { customerSchema, invoiceSchema, orderSchema, ticketSchema, tradeInSchema } from "./records";
import { catalog, settings } from "@/test/fixtures";
import customers from "../../../data/customers.json";
import invoices from "../../../data/invoices.json";
import orders from "../../../data/orders.json";
import tickets from "../../../data/tickets.json";
import tradeIns from "../../../data/trade-ins.json";

const db = {
  brands: catalog.brands,
  products: catalog.products,
  deals: settings.greatDeals.deals,
  packages: settings.packages,
  customers: customerSchema.array().parse(customers.rows),
  orders: orderSchema.array().parse(orders.rows),
  "trade-ins": tradeInSchema.array().parse(tradeIns.rows),
  tickets: ticketSchema.array().parse(tickets.rows),
  invoices: invoiceSchema.array().parse(invoices.rows),
};

describe("data/*.json", () => {
  it("is consistent like a database would be (unique ids, no dangling references)", () => {
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
});
