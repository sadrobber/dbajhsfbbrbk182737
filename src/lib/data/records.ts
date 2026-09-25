import { z } from "zod";
import { slug } from "./schema";

/**
 * Back-office records: customers, orders, trade-ins, Gauge tickets, invoices.
 *
 * NOTE: orders, customers, trade-ins, tickets and invoices currently show
 * placeholder data since there is no real checkout or customer flow yet —
 * these screens are ready for real data once that's built.
 *
 * Each schema is one table; "<thing>Id" fields are foreign keys, checked by
 * ./integrity.ts.
 */

const isoDate = z.iso.datetime();
const money = z.number().min(0);

export const orderStatuses = [
  "pending_payment",
  "paid",
  "preparing",
  "ready_for_pickup",
  "completed",
  "cancelled",
  "refunded",
] as const;
export const orderChannels = ["in_store", "click_and_collect", "delivery"] as const;
export const tradeInConditions = ["like_new", "good", "worn", "broken"] as const;
export const tradeInStatuses = ["submitted", "quoted", "accepted", "rejected", "completed"] as const;
export const invoiceStatuses = ["paid", "unpaid", "credited"] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type TradeInStatus = (typeof tradeInStatuses)[number];
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const customerSchema = z.object({
  id: slug,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  phone: z.string(),
  /** Key in messages: Local.towns.<town> */
  town: z.string(),
  createdAt: isoDate,
  marketingOptIn: z.boolean(),
});

/** One line of an order. A future `order_lines` table (order_id + these columns). */
export const orderLineSchema = z
  .object({
    productId: slug.nullable(),
    packageId: slug.nullable(),
    /** Snapshot at purchase time, so the order still reads right if the product changes. */
    description: z.string().min(1),
    quantity: z.number().int().positive(),
    unitPrice: money,
  })
  .refine((line) => (line.productId === null) !== (line.packageId === null), "a line is either a product or a package");

export const orderSchema = z.object({
  id: slug,
  number: z.string().min(1),
  customerId: slug,
  createdAt: isoDate,
  status: z.enum(orderStatuses),
  channel: z.enum(orderChannels),
  lines: z.array(orderLineSchema).min(1),
  total: money,
});

export const tradeInSchema = z.object({
  id: slug,
  customerId: slug,
  createdAt: isoDate,
  /** Free text: customers trade in phones the shop doesn't sell. */
  device: z.object({ brand: z.string().min(1), model: z.string().min(1), storageGb: z.number().int().positive() }),
  condition: z.enum(tradeInConditions),
  /** Estimated value in euros. */
  estimate: money,
  status: z.enum(tradeInStatuses),
  /** The purchase the trade-in value was used on, if any. */
  orderId: slug.nullable(),
});

export const ticketSchema = z.object({
  id: slug,
  number: z.string().min(1),
  customerId: slug,
  orderId: slug,
  issuedAt: isoDate,
});

export const invoiceSchema = z.object({
  id: slug,
  number: z.string().min(1),
  orderId: slug,
  issuedAt: isoDate,
  totalExclVat: money,
  vat: money,
  total: money,
  status: z.enum(invoiceStatuses),
});

export type Customer = z.infer<typeof customerSchema>;
export type Order = z.infer<typeof orderSchema>;
export type TradeIn = z.infer<typeof tradeInSchema>;
export type Ticket = z.infer<typeof ticketSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
