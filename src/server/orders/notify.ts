import "server-only";
import type { Customer, Order } from "@/lib/data/records";

export type OrderEvent =
  /** New order for staff to handle: "24-48h" authorised, or "on request". */
  | "availability_to_check"
  /** Staff confirmed: charged, or (on request) the customer can come and pay. */
  | "availability_confirmed"
  /** Staff couldn't get it: authorisation released, alternative suggested. */
  | "availability_declined";

/**
 * Tells the customer or the shop that an order moved on. No email provider is
 * connected yet, so this only logs; the customer sees the same news on their
 * order page. Connect an email or SMS service here.
 */
export async function notifyOrderEvent(event: OrderEvent, order: Order, customer: Customer | null): Promise<void> {
  console.info(`[orders] ${event}: ${order.number} (${order.status}) for ${customer?.email ?? order.customerId}`);
}
