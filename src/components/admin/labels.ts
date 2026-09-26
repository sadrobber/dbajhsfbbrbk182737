import type { InvoiceStatus, OrderStatus, PaymentStatus, TradeInStatus } from "@/lib/data/records";
import type { SupplierAvailability, Supply } from "@/lib/data/schema";
import type { PillTone } from "./ui";

/** Labels and colours for statuses shown in the back office. */

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: PillTone }> = {
  quote_requested: { label: "On request · availability to confirm", tone: "danger" },
  pending_payment: { label: "Awaiting payment", tone: "warning" },
  awaiting_availability: { label: "Availability to confirm", tone: "danger" },
  paid: { label: "Paid", tone: "info" },
  preparing: { label: "Preparing", tone: "info" },
  ready_for_pickup: { label: "Ready for pickup", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  refunded: { label: "Refunded", tone: "danger" },
};

export const ORDER_CHANNEL = { in_store: "In store", click_and_collect: "Click & collect", delivery: "Delivery" } as const;

export const SUPPLY: Record<Supply, { label: string; tone: PillTone }> = {
  in_store: { label: "In store", tone: "success" },
  within_48h: { label: "Supplier 24–48h", tone: "info" },
  on_request: { label: "On request", tone: "neutral" },
};

export const SUPPLIER_AVAILABILITY: Record<SupplierAvailability, string> = {
  none: "Sold out (not orderable)",
  within_48h: "Supplier, 24–48h (card authorised, charged after you confirm)",
  on_request: "On request (no online payment)",
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: PillTone }> = {
  pending: { label: "Waiting for the customer", tone: "warning" },
  authorized: { label: "Authorised, not charged", tone: "info" },
  captured: { label: "Charged", tone: "success" },
  released: { label: "Authorisation cancelled", tone: "neutral" },
  failed: { label: "Not completed", tone: "neutral" },
};

export const TRADE_IN_STATUS: Record<TradeInStatus, { label: string; tone: PillTone }> = {
  submitted: { label: "New request", tone: "warning" },
  quoted: { label: "Quote sent", tone: "info" },
  accepted: { label: "Accepted", tone: "info" },
  rejected: { label: "Declined", tone: "neutral" },
  completed: { label: "Completed", tone: "success" },
};

export const TRADE_IN_CONDITION = { like_new: "Like new", good: "Good", worn: "Worn", broken: "Broken" } as const;

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: PillTone }> = {
  paid: { label: "Paid", tone: "success" },
  unpaid: { label: "Unpaid", tone: "warning" },
  credited: { label: "Credited (refund)", tone: "neutral" },
};

export const adminEuro = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" });
export const adminDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/Paris" });

export function optionsOf<K extends string>(labels: Record<K, string | { label: string }>) {
  return (Object.entries(labels) as [K, string | { label: string }][]).map(([value, label]) => ({
    value,
    label: typeof label === "string" ? label : label.label,
  }));
}
