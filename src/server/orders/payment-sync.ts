import "server-only";
import { adjustStock, getCustomer, getOrder, updateOrder } from "@/lib/data/order-repository";
import type { Order } from "@/lib/data/records";
import { gatewayFor } from "@/server/payments";
import { notifyOrderEvent } from "./notify";

/** Stock the shop's own shelves give to an order: product lines served "in_store". */
export function shopStockChanges(order: Order, sign: 1 | -1) {
  return order.lines.flatMap((line) =>
    line.productId && line.supply === "in_store" ? [{ productId: line.productId, delta: sign * line.quantity }] : [],
  );
}

/**
 * Brings an order waiting for payment in line with the payment provider.
 * Called by the Stripe webhook, by the customer's return page and by staff.
 * Safe to call any number of times: each step is applied once.
 */
export async function syncOrderPayment(orderId: string): Promise<Order | null> {
  const order = await getOrder(orderId);
  if (!order?.payment || order.status !== "pending_payment" || order.payment.status !== "pending") return order;

  const { status, paymentId } = await gatewayFor(order.payment.provider).getState(order.payment.checkoutId);
  if (status === "pending") return order;

  const now = new Date().toISOString();
  const { order: updated, changed } = await updateOrder(orderId, (current): Order | null => {
    if (current.status !== "pending_payment" || current.payment?.status !== "pending") return null;
    const payment = { ...current.payment, paymentId, status };
    switch (status) {
      case "authorized":
        return {
          ...current,
          status: "awaiting_availability",
          payment: { ...payment, authorizedAt: now },
          availabilityCheck: current.availabilityCheck ?? { status: "to_confirm", checkedAt: null, checkedBy: null, alternative: null },
        };
      case "captured":
        return { ...current, status: "paid", payment: { ...payment, authorizedAt: now, capturedAt: now } };
      case "released":
      case "failed":
        return { ...current, status: "cancelled", payment: { ...payment, releasedAt: status === "released" ? now : null } };
    }
  });

  if (changed && (updated.status === "awaiting_availability" || updated.status === "paid")) {
    await adjustStock(shopStockChanges(updated, -1));
    if (updated.status === "awaiting_availability") {
      await notifyOrderEvent("availability_to_check", updated, await getCustomer(updated.customerId));
    }
  }
  return updated;
}
