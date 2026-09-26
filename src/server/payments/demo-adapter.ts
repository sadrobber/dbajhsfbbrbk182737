import { randomUUID } from "node:crypto";
import type { PaymentGateway } from "./types";

/**
 * Pretend payments for development: no card, no provider. The customer goes
 * straight back to the shop, as if they had paid ("automatic") or had their
 * card authorised ("manual"). Refused in production unless PAYMENT_PROVIDER=demo.
 */
export const demoGateway: PaymentGateway = {
  provider: "demo",

  async createCheckout(request) {
    const checkoutId = `demo_${request.capture}_${randomUUID().replaceAll("-", "")}`;
    return { checkoutId, redirectUrl: request.successUrl };
  },

  async getState(checkoutId) {
    return { status: checkoutId.startsWith("demo_manual_") ? "authorized" : "captured", paymentId: checkoutId };
  },

  async capture() {},
  async release() {},
};
