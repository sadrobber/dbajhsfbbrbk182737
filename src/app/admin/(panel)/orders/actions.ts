"use server";

import { type ActionResult, failure, failWith, refreshEverywhere } from "@/server/admin/action-result";
import { requireAdmin } from "@/server/admin/auth";
import { syncOrderPayment } from "@/server/orders/payment-sync";
import { confirmAvailability, declineAvailability } from "@/server/orders/staff";

/** Available: charges the authorised card ("24-48h"), or tells an "on request" customer to come and pay. */
export async function confirmAvailabilityAction(orderId: string): Promise<ActionResult> {
  const session = await requireAdmin();
  try {
    await confirmAvailability(String(orderId), session.email);
    refreshEverywhere();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

/** Not available: releases the card authorisation and records the alternative offered to the customer. */
export async function declineAvailabilityAction(orderId: string, alternative: string): Promise<ActionResult> {
  const session = await requireAdmin();
  const text = String(alternative ?? "").trim();
  if (text.length > 500) return failWith("suggestionTooLong");
  try {
    await declineAvailability(String(orderId), session.email, text);
    refreshEverywhere();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

/** Asks the payment provider again, for an order still shown as waiting for payment. */
export async function refreshPaymentAction(orderId: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await syncOrderPayment(String(orderId));
    refreshEverywhere();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
