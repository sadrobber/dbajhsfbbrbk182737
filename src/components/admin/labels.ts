import type { InvoiceStatus, OrderStatus, PaymentStatus, TradeInStatus } from "@/lib/data/records";
import type { Supply } from "@/lib/data/schema";
import type { PillTone } from "./ui";

/** Colours of the statuses shown in the back office. Their words are in messages/admin (Labels.*). */

export const ORDER_STATUS_TONE: Record<OrderStatus, PillTone> = {
  quote_requested: "danger",
  pending_payment: "warning",
  awaiting_availability: "danger",
  paid: "info",
  preparing: "info",
  ready_for_pickup: "info",
  completed: "success",
  cancelled: "neutral",
  refunded: "danger",
};

export const TRADE_IN_STATUS_TONE: Record<TradeInStatus, PillTone> = {
  submitted: "warning",
  quoted: "info",
  accepted: "info",
  rejected: "neutral",
  completed: "success",
};

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, PillTone> = { paid: "success", unpaid: "warning", credited: "neutral" };

export const SUPPLY_TONE: Record<Supply, PillTone> = { in_store: "success", within_48h: "info", on_request: "neutral" };

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, PillTone> = {
  pending: "warning",
  authorized: "info",
  captured: "success",
  released: "neutral",
  failed: "neutral",
};

/** Filter options for a list of keys, labelled in the staff member's language. */
export function optionsFrom<K extends string>(keys: readonly K[], label: (key: K) => string) {
  return keys.map((value) => ({ value, label: label(value) }));
}
