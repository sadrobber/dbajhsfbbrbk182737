import type { InvoiceStatus, OrderStatus, TradeInStatus } from "@/lib/data/records";
import type { PillTone } from "./ui";

/** Labels and colours for statuses shown in the back office. */

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: PillTone }> = {
  pending_payment: { label: "Awaiting payment", tone: "warning" },
  paid: { label: "Paid", tone: "info" },
  preparing: { label: "Preparing", tone: "info" },
  ready_for_pickup: { label: "Ready for pickup", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  refunded: { label: "Refunded", tone: "danger" },
};

export const ORDER_CHANNEL = { in_store: "In store", click_and_collect: "Click & collect", delivery: "Delivery" } as const;

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
