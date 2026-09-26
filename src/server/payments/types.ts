import type { PaymentProvider, PaymentStatus } from "@/lib/data/records";

/**
 * What the shop needs from a payment provider. Vendor code stays in the
 * adapters (./stripe-adapter.ts, ./demo-adapter.ts); orders and screens only
 * see this interface.
 */
export interface PaymentGateway {
  readonly provider: PaymentProvider;
  /** Starts a hosted payment page. "manual" capture only authorises the card. */
  createCheckout(request: CheckoutRequest): Promise<{ checkoutId: string; redirectUrl: string }>;
  /** Where the payment stands, read from the provider (never from the browser). */
  getState(checkoutId: string): Promise<PaymentState>;
  /** Charges an authorised payment. */
  capture(paymentId: string): Promise<void>;
  /** Cancels an authorisation: the customer is never charged. */
  release(paymentId: string): Promise<void>;
}

export type CheckoutRequest = {
  orderId: string;
  orderNumber: string;
  email: string;
  locale: "fr" | "en" | "it";
  /** Names in the customer's language; unit prices in euros, VAT included. */
  lines: { name: string; quantity: number; unitPrice: number }[];
  capture: "automatic" | "manual";
  /** Where the customer lands after paying. The order is then checked with getState, never trusted from the URL. */
  successUrl: string;
  cancelUrl: string;
};

export type PaymentState = {
  status: PaymentStatus;
  paymentId: string | null;
};

/** A refusal from the provider that staff or customers should read (expired authorisation...). */
export class PaymentError extends Error {}
