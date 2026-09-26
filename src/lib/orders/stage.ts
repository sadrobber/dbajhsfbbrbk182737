import type { Order } from "@/lib/data/records";

/** What the customer is told about their order (Order.stage.<stage> in messages). */
export type OrderStage =
  | "request_received"
  | "payment_pending"
  | "request_confirmed"
  | "availability_check"
  | "paid"
  | "preparing"
  | "ready"
  | "completed"
  | "unavailable"
  | "cancelled"
  | "refunded";

export function stageOf(order: Pick<Order, "status" | "payment" | "availabilityCheck">): OrderStage {
  switch (order.status) {
    case "quote_requested":
      return "request_received";
    case "pending_payment":
      // No online payment: an "on request" order staff have confirmed.
      return order.payment ? "payment_pending" : "request_confirmed";
    case "awaiting_availability":
      return "availability_check";
    case "paid":
      return "paid";
    case "preparing":
      return "preparing";
    case "ready_for_pickup":
      return "ready";
    case "completed":
      return "completed";
    case "cancelled":
      return order.availabilityCheck?.status === "unavailable" ? "unavailable" : "cancelled";
    case "refunded":
      return "refunded";
  }
}
