import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Order } from "@/lib/data/records";

/** The secret in a customer's order link: /[locale]/orders/<id>?t=<token>. */
export function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export function canViewOrder(order: Order, token: string | undefined): boolean {
  if (!order.accessToken || !token) return false;
  const expected = Buffer.from(order.accessToken);
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function orderPagePath(order: Pick<Order, "id" | "locale" | "accessToken">): string {
  return `/${order.locale}/orders/${order.id}?t=${order.accessToken ?? ""}`;
}
