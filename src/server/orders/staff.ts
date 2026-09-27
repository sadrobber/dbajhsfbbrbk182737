import "server-only";
import { AdminDataError } from "@/lib/data/admin-repository";
import { adjustStock, getCustomer, getOrder, updateOrder } from "@/lib/data/order-repository";
import type { AvailabilityCheck, Order } from "@/lib/data/records";
import { gatewayFor, PaymentError } from "@/server/payments";
import { notifyOrderEvent } from "./notify";
import { shopStockChanges } from "./payment-sync";

/**
 * Staff's answer after checking with suppliers.
 * - "24-48h" order (card authorised): confirm charges the card, decline releases it.
 * - "on request" order (nothing paid): confirm tells the customer to come and pay, decline closes it.
 */

async function waitingOrder(orderId: string): Promise<Order> {
  const order = await getOrder(orderId);
  if (!order) throw new AdminDataError("orderGone");
  if (order.status !== "awaiting_availability" && order.status !== "quote_requested") throw new AdminDataError("orderNotWaiting");
  return order;
}

function authorisedPaymentId(order: Order): string {
  const id = order.payment?.status === "authorized" ? order.payment.paymentId : null;
  if (!id) throw new AdminDataError("noAuthorisation");
  return id;
}

async function callProvider(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (error instanceof PaymentError) throw new AdminDataError("paymentRefused", { detail: error.message });
    throw error;
  }
}

function check(status: AvailabilityCheck["status"], staffEmail: string, alternative: string | null): AvailabilityCheck {
  return { status, checkedAt: new Date().toISOString(), checkedBy: staffEmail, alternative };
}

export async function confirmAvailability(orderId: string, staffEmail: string): Promise<Order> {
  const order = await waitingOrder(orderId);
  const now = new Date().toISOString();

  if (order.status === "awaiting_availability") {
    const paymentId = authorisedPaymentId(order);
    await callProvider(() => gatewayFor(order.payment!.provider).capture(paymentId));
  }

  const { order: updated } = await updateOrder(orderId, (current) => {
    if (current.status !== order.status) throw new AdminDataError("orderNotWaiting");
    const availabilityCheck = check("confirmed", staffEmail, null);
    if (current.status === "quote_requested") return { ...current, status: "pending_payment", availabilityCheck };
    return { ...current, status: "paid", availabilityCheck, payment: { ...current.payment!, status: "captured", capturedAt: now } };
  });
  await notifyOrderEvent("availability_confirmed", updated, await getCustomer(updated.customerId));
  return updated;
}

export async function declineAvailability(orderId: string, staffEmail: string, alternative: string): Promise<Order> {
  const order = await waitingOrder(orderId);
  const now = new Date().toISOString();
  const suggestion = alternative.trim() || null;

  if (order.status === "awaiting_availability") {
    const paymentId = authorisedPaymentId(order);
    await callProvider(() => gatewayFor(order.payment!.provider).release(paymentId));
  }

  const { order: updated } = await updateOrder(orderId, (current) => {
    if (current.status !== order.status) throw new AdminDataError("orderNotWaiting");
    const availabilityCheck = check("unavailable", staffEmail, suggestion);
    const payment = current.payment ? { ...current.payment, status: "released" as const, releasedAt: now } : null;
    return { ...current, status: "cancelled", availabilityCheck, payment };
  });
  // In-store lines were taken from stock when the card was authorised: put them back.
  if (order.status === "awaiting_availability") await adjustStock(shopStockChanges(updated, 1));
  await notifyOrderEvent("availability_declined", updated, await getCustomer(updated.customerId));
  return updated;
}
