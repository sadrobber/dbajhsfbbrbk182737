import type { PromoCode, TradeInPrice } from "./pricing";
import type { Customer, Invoice, Order, Ticket, TradeIn } from "./records";
import type { BatteryOptionInfo, Brand, Deal, GradeInfo, PackageDefinition, PhoneModel, Product } from "./schema";

/** Everything in /data, table by table. */
export type Database = {
  brands: Brand[];
  models: PhoneModel[];
  grades: GradeInfo[];
  "battery-options": BatteryOptionInfo[];
  products: Product[];
  deals: Deal[];
  packages: PackageDefinition[];
  "promo-codes": PromoCode[];
  "tradein-prices": TradeInPrice[];
  customers: Customer[];
  orders: Order[];
  "trade-ins": TradeIn[];
  tickets: Ticket[];
  invoices: Invoice[];
};

/**
 * What a database would enforce with primary and foreign keys:
 * unique ids per table, and every "<thing>Id" pointing at an existing row.
 * Also: a variant's storage and colour exist on its model.
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
  const products = ids(db.products);
  const packages = ids(db.packages);
  const customers = ids(db.customers);
  const orders = ids(db.orders);
  const models = db.models ? new Map(db.models.map((m) => [m.id, m])) : null;
  const modelIds = models ? new Set(models.keys()) : null;
  const brandNames = db.brands ? new Set(db.brands.map((b) => b.name)) : null;

  const check = (known: Set<string> | null, value: string | null, where: string) => {
    if (known && value !== null && !known.has(value)) problems.push(`${where} points to a missing row "${value}"`);
  };

  for (const m of db.models ?? []) check(brandNames, m.brand, `models/${m.id}.brand`);
  const skus = new Set<string>();
  for (const p of db.products ?? []) {
    check(modelIds, p.modelId, `products/${p.id}.modelId`);
    const model = models?.get(p.modelId);
    if (model && !model.specs.storage_gb.includes(p.storageGb)) {
      problems.push(`products/${p.id}: ${p.storageGb} GB isn't a storage option of ${model.full_name}`);
    }
    // Models whose colours aren't known yet accept any name.
    if (model && model.colors.length > 0 && !model.colors.some((c) => c.name_en === p.colorName)) {
      problems.push(`products/${p.id}: "${p.colorName}" isn't a colour of ${model.full_name}`);
    }
    if (skus.has(p.sku)) problems.push(`products: duplicate sku "${p.sku}"`);
    skus.add(p.sku);
  }
  for (const d of db.deals ?? []) check(products, d.productId, `deals/${d.id}.productId`);
  for (const t of db["tradein-prices"] ?? []) {
    check(modelIds, t.modelId, `tradein-prices/${t.id}.modelId`);
    const model = models?.get(t.modelId);
    if (model && !model.specs.storage_gb.includes(t.storageGb)) {
      problems.push(`tradein-prices/${t.id}: ${t.storageGb} GB isn't a storage option of ${model.full_name}`);
    }
  }
  const promoCodes = new Set<string>();
  for (const c of db["promo-codes"] ?? []) {
    if (promoCodes.has(c.code)) problems.push(`promo-codes: code "${c.code}" is listed twice`);
    promoCodes.add(c.code);
  }
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
