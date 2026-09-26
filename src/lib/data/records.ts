import { z } from "zod";
import { slug, supplies } from "./schema";

/**
 * Back-office records: customers, orders, trade-ins, Gauge tickets, invoices.
 *
 * NOTE: the rows shipped in data/*.json are placeholder examples. Orders and
 * customers placed through the shop's checkout are added next to them;
 * trade-ins, tickets and invoices have no customer flow yet.
 *
 * Each schema is one table; "<thing>Id" fields are foreign keys, checked by
 * ./integrity.ts.
 */

const isoDate = z.iso.datetime();
const money = z.number().min(0);

export const orderStatuses = [
  /** "On request" order: nothing paid online, staff check availability and get back to the customer. */
  "quote_requested",
  "pending_payment",
  /** Card authorised, not charged: staff check with suppliers, then charge or release it. */
  "awaiting_availability",
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
export const paymentProviders = ["stripe", "demo"] as const;
export const paymentStatuses = ["pending", "authorized", "captured", "released", "failed"] as const;
export const availabilityCheckStatuses = ["to_confirm", "confirmed", "unavailable"] as const;

export type OrderStatus = (typeof orderStatuses)[number];
/** Orders staff must act on: check with suppliers, then confirm or decline. */
export const orderStatusesToCheck: readonly OrderStatus[] = ["awaiting_availability", "quote_requested"];
export type PaymentProvider = (typeof paymentProviders)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
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
    /** How the line was offered when ordered (packages are always "in_store"). */
    supply: z.enum(supplies),
  })
  .refine((line) => (line.productId === null) !== (line.packageId === null), "a line is either a product or a package");

/** The online payment of an order. A future `payments` table (order_id + these columns). */
export const paymentSchema = z.object({
  provider: z.enum(paymentProviders),
  /** Stripe Checkout Session id (or the demo's). */
  checkoutId: z.string().min(1),
  /** Stripe PaymentIntent id, known once the customer has paid or been authorised. */
  paymentId: z.string().min(1).nullable(),
  /** "manual": the card is only authorised, staff charge it after checking availability. */
  capture: z.enum(["automatic", "manual"]),
  status: z.enum(paymentStatuses),
  amount: money,
  authorizedAt: isoDate.nullable(),
  capturedAt: isoDate.nullable(),
  releasedAt: isoDate.nullable(),
});

/** Staff's supplier check, for "24-48h" and "on request" orders. */
export const availabilityCheckSchema = z.object({
  status: z.enum(availabilityCheckStatuses),
  checkedAt: isoDate.nullable(),
  checkedBy: z.string().nullable(),
  /** What staff offered instead when the phone isn't available, shown to the customer. */
  alternative: z.string().trim().max(500).nullable(),
});

export const orderSchema = z.object({
  id: slug,
  number: z.string().min(1),
  customerId: slug,
  createdAt: isoDate,
  status: z.enum(orderStatuses),
  channel: z.enum(orderChannels),
  lines: z.array(orderLineSchema).min(1),
  total: money,
  /** The most restrictive line's supply: decides whether the card is charged, authorised or not used. */
  supply: z.enum(supplies),
  /** null: no online payment (in store, or an "on request" order). */
  payment: paymentSchema.nullable(),
  availabilityCheck: availabilityCheckSchema.nullable(),
  /** Secret in the customer's order link. null for orders taken in store. */
  accessToken: z
    .string()
    .regex(/^[A-Za-z0-9_-]{24,}$/)
    .nullable(),
  /** Customer's language, for their order page and messages. */
  locale: z.enum(["fr", "en", "it"]),
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
export type OrderLine = z.infer<typeof orderLineSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type AvailabilityCheck = z.infer<typeof availabilityCheckSchema>;
export type TradeIn = z.infer<typeof tradeInSchema>;
export type Ticket = z.infer<typeof ticketSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
