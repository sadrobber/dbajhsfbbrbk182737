import type { Customer, Invoice, Order, Ticket, TradeIn } from "./records";
import type { Brand, Deal, PackageDefinition, Product } from "./schema";

/** Everything in /data, table by table. */
export type Database = {
  brands: Brand[];
  products: Product[];
  deals: Deal[];
  packages: PackageDefinition[];
  customers: Customer[];
  orders: Order[];
  "trade-ins": TradeIn[];
  tickets: Ticket[];
  invoices: Invoice[];
};

/**
 * What a database would enforce with primary and foreign keys:
 * unique ids per table, and every "<thing>Id" pointing at an existing row.
 * Returns a list of problems (empty when consistent).
 */
export function findIntegrityProblems(db: Partial<Database>): string[] {
  const problems: string[] = [];

  for (const [table, rows] of Object.entries(db) as [string, { id: string }[]][]) {
    const seen = new Set<string>();
    for (const row of rows) {
      if (seen.has(row.id)) problems.push(`${table}: duplicate id "${row.id}"`);
      seen.add(row.id);
    }
  }

  const ids = (rows: { id: string }[] | undefined) => (rows ? new Set(rows.map((row) => row.id)) : null);
  const brands = ids(db.brands);
  const products = ids(db.products);
  const packages = ids(db.packages);
  const customers = ids(db.customers);
  const orders = ids(db.orders);

  const check = (known: Set<string> | null, value: string | null, where: string) => {
    if (known && value !== null && !known.has(value)) problems.push(`${where} points to a missing row "${value}"`);
  };

  for (const p of db.products ?? []) check(brands, p.brand, `products/${p.id}.brand`);
  for (const d of db.deals ?? []) check(products, d.productId, `deals/${d.id}.productId`);
  for (const o of db.orders ?? []) {
    check(customers, o.customerId, `orders/${o.id}.customerId`);
    o.lines.forEach((line, i) => {
      check(products, line.productId, `orders/${o.id}.lines[${i}].productId`);
      check(packages, line.packageId, `orders/${o.id}.lines[${i}].packageId`);
    });
  }
  for (const t of db["trade-ins"] ?? []) {
    check(customers, t.customerId, `trade-ins/${t.id}.customerId`);
    check(orders, t.orderId, `trade-ins/${t.id}.orderId`);
  }
  for (const t of db.tickets ?? []) {
    check(customers, t.customerId, `tickets/${t.id}.customerId`);
    check(orders, t.orderId, `tickets/${t.id}.orderId`);
  }
  for (const i of db.invoices ?? []) check(orders, i.orderId, `invoices/${i.id}.orderId`);

  const dealProducts = new Set<string>();
  for (const d of db.deals ?? []) {
    if (dealProducts.has(d.productId)) problems.push(`deals: product "${d.productId}" is listed twice`);
    dealProducts.add(d.productId);
  }

  return problems;
}
