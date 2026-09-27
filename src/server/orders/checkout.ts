import "server-only";
import { getTranslator } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";
import { insertOrder, saveCustomer, updateOrder } from "@/lib/data/order-repository";
import type { Order } from "@/lib/data/records";
import { getCatalogItems, getPackages } from "@/lib/data/queries";
import type { CartEntry } from "@/lib/orders/cart";
import type { CheckoutForm } from "@/lib/orders/checkout-form";
import { describePackage, describeProduct } from "@/lib/orders/describe";
import { type PricedCart, priceCart } from "@/lib/orders/pricing";
import { activeGateway } from "@/server/payments";
import { newAccessToken, orderPagePath } from "./access";
import { notifyOrderEvent } from "./notify";

/** Prices the cart for display, with line texts in the customer's language. */
export async function priceCartFor(cart: CartEntry[], locale: Locale): Promise<PricedCart> {
  const t = getTranslator(locale);
  const [items, packages] = await Promise.all([getCatalogItems(), getPackages()]);
  return priceCart(cart, items, packages, {
    product: (item) => describeProduct(t, locale, item),
    package: (pkg) => describePackage(t, pkg),
  });
}

export type PlaceOrderResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; reason: "empty" | "unavailable" | "changed" | "payments_off" };

/**
 * Turns the cart into an order.
 * - in_store: Stripe charges the card at once.
 * - within_48h: Stripe only authorises it; staff charge or release it after checking suppliers.
 * - on_request: no payment; the order waits for staff.
 * `origin` is the site's address, for the pages Stripe sends the customer back to.
 */
export async function placeOrder(cart: CartEntry[], form: CheckoutForm, locale: Locale, origin: string): Promise<PlaceOrderResult> {
  const [snapshot, customerView] = await Promise.all([priceCartFor(cart, "en"), priceCartFor(cart, locale)]);
  if (snapshot.lines.length === 0) return { ok: false, reason: "empty" };
  if (snapshot.unavailable.length > 0) return { ok: false, reason: "unavailable" };
  if (snapshot.supply !== form.expectedSupply || snapshot.total !== form.expectedTotal) return { ok: false, reason: "changed" };

  const payable = snapshot.supply !== "on_request";
  const gateway = payable ? activeGateway() : null;
  if (payable && !gateway) return { ok: false, reason: "payments_off" };

  const customer = await saveCustomer({
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    phone: form.phone,
    town: form.town,
    marketingOptIn: form.marketingOptIn,
  });
  const order = await insertOrder({
    customerId: customer.id,
    createdAt: new Date().toISOString(),
    status: payable ? "pending_payment" : "quote_requested",
    channel: "click_and_collect",
    lines: snapshot.lines,
    total: snapshot.total,
    supply: snapshot.supply,
    payment: null,
    availabilityCheck:
      snapshot.supply === "in_store" ? null : { status: "to_confirm", checkedAt: null, checkedBy: null, alternative: null },
    accessToken: newAccessToken(),
    locale,
  });
  const orderUrl = `${origin}${orderPagePath(order)}`;

  if (!gateway) {
    await notifyOrderEvent("availability_to_check", order, customer);
    return { ok: true, redirectUrl: orderUrl };
  }

  const capture = snapshot.supply === "within_48h" ? "manual" : "automatic";
  let checkout: { checkoutId: string; redirectUrl: string };
  try {
    checkout = await gateway.createCheckout({
      orderId: order.id,
      orderNumber: order.number,
      email: customer.email,
      locale,
      lines: customerView.lines.map((line) => ({ name: line.description, quantity: line.quantity, unitPrice: line.unitPrice })),
      capture,
      successUrl: `${origin}/api/orders/${order.id}/return?t=${order.accessToken}`,
      cancelUrl: `${origin}/${locale}/cart?cancelled=1`,
    });
  } catch (error) {
    await updateOrder(order.id, (current): Order => ({ ...current, status: "cancelled" }));
    throw error;
  }

  await updateOrder(order.id, (current): Order => ({
    ...current,
    payment: {
      provider: gateway.provider,
      checkoutId: checkout.checkoutId,
      paymentId: null,
      capture,
      status: "pending",
      amount: current.total,
      authorizedAt: null,
      capturedAt: null,
      releasedAt: null,
    },
  }));
  return { ok: true, redirectUrl: checkout.redirectUrl };
}
