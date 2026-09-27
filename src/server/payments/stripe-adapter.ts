import "server-only";
import Stripe from "stripe";
import { type PaymentGateway, PaymentError, type PaymentState } from "./types";

/**
 * Stripe Checkout (hosted payment page). "24-48h" orders use manual capture:
 * the card is authorised at checkout and charged when staff confirm.
 * Card authorisations expire after about 7 days, so staff must decide before then.
 *
 * The only file that talks to Stripe. Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
 */

let client: Stripe | null = null;

function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  client ??= new Stripe(key);
  return client;
}

const cents = (euros: number) => Math.round(euros * 100);

function toPaymentError(error: unknown): unknown {
  if (error instanceof Stripe.errors.StripeError && error.type === "StripeInvalidRequestError") {
    return new PaymentError(error.message);
  }
  return error;
}

export const stripeGateway: PaymentGateway = {
  provider: "stripe",

  async createCheckout(request) {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        customer_email: request.email,
        locale: request.locale,
        client_reference_id: request.orderId,
        metadata: { orderId: request.orderId },
        line_items: request.lines.map((line) => ({
          quantity: line.quantity,
          price_data: { currency: "eur", unit_amount: cents(line.unitPrice), product_data: { name: line.name } },
        })),
        payment_intent_data: {
          capture_method: request.capture,
          description: `Order ${request.orderNumber}`,
          metadata: { orderId: request.orderId, orderNumber: request.orderNumber },
        },
        // Unpaid checkouts expire after an hour; the webhook then cancels the order.
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
      },
      { idempotencyKey: `checkout-${request.orderId}` },
    );
    if (!session.url) throw new Error("Stripe returned no checkout URL.");
    return { checkoutId: session.id, redirectUrl: session.url };
  },

  async getState(checkoutId): Promise<PaymentState> {
    const session = await stripe().checkout.sessions.retrieve(checkoutId, { expand: ["payment_intent"] });
    const intent = typeof session.payment_intent === "string" ? null : session.payment_intent;
    if (session.status === "expired") return { status: "failed", paymentId: intent?.id ?? null };
    if (!intent || session.status !== "complete") return { status: "pending", paymentId: intent?.id ?? null };
    switch (intent.status) {
      case "requires_capture":
        return { status: "authorized", paymentId: intent.id };
      case "succeeded":
        return { status: "captured", paymentId: intent.id };
      case "canceled":
        return { status: "released", paymentId: intent.id };
      default:
        return { status: "pending", paymentId: intent.id };
    }
  },

  async capture(paymentId) {
    try {
      await stripe().paymentIntents.capture(paymentId, {}, { idempotencyKey: `capture-${paymentId}` });
    } catch (error) {
      throw toPaymentError(error);
    }
  },

  async release(paymentId) {
    try {
      await stripe().paymentIntents.cancel(paymentId, {}, { idempotencyKey: `release-${paymentId}` });
    } catch (error) {
      throw toPaymentError(error);
    }
  },
};

/**
 * Verifies a Stripe webhook and returns the Checkout Session it is about, or
 * null for events the shop doesn't use. Throws when the signature is wrong.
 */
export function checkoutIdFromStripeWebhook(rawBody: string, signature: string | null): string | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  if (!signature) throw new Error("Missing Stripe-Signature header.");
  const event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      return event.data.object.id;
    default:
      return null;
  }
}
