import { NextResponse } from "next/server";
import { findOrderByCheckoutId } from "@/lib/data/order-repository";
import { syncOrderPayment } from "@/server/orders/payment-sync";
import { refreshAfterOrderChange } from "@/server/orders/refresh";
import { checkoutIdFromStripeWebhook } from "@/server/payments/stripe-adapter";

/**
 * Stripe webhook: point it at /api/payments/stripe with the events
 * checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed and checkout.session.expired.
 * The event only says which checkout changed; the order is then updated
 * from Stripe's own state.
 */
export async function POST(request: Request) {
  let checkoutId: string | null;
  try {
    checkoutId = checkoutIdFromStripeWebhook(await request.text(), request.headers.get("stripe-signature"));
  } catch (error) {
    console.error("[payments] rejected Stripe webhook:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  if (checkoutId) {
    const order = await findOrderByCheckoutId(checkoutId);
    if (order) {
      await syncOrderPayment(order.id);
      refreshAfterOrderChange();
    }
  }
  return NextResponse.json({ received: true });
}
