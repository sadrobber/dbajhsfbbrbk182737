import "server-only";
import type { PaymentProvider } from "@/lib/data/records";
import { demoGateway } from "./demo-adapter";
import { stripeGateway } from "./stripe-adapter";
import type { PaymentGateway } from "./types";

export { PaymentError, type PaymentGateway } from "./types";

/**
 * The gateway new orders use, from PAYMENT_PROVIDER:
 *   stripe -> Stripe Checkout (needs STRIPE_SECRET_KEY)
 *   demo   -> pretend payments, the default outside production
 * null: online payment is off (production without a provider).
 */
export function activeGateway(): PaymentGateway | null {
  const provider = process.env.PAYMENT_PROVIDER || (process.env.NODE_ENV === "production" ? "" : "demo");
  if (provider === "stripe") return process.env.STRIPE_SECRET_KEY ? stripeGateway : null;
  if (provider === "demo") return demoGateway;
  return null;
}

/** An order keeps the gateway it was paid with, even if the setting changes later. */
export function gatewayFor(provider: PaymentProvider): PaymentGateway {
  return provider === "stripe" ? stripeGateway : demoGateway;
}
