"use server";

import { cookies, headers } from "next/headers";
import { redirect as nextRedirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { CART_COOKIE, type CartEntry, parseCart, serializeCart, setInCart } from "@/lib/orders/cart";
import { type CheckoutField, checkoutFormFrom, checkoutFormSchema } from "@/lib/orders/checkout-form";
import { placeOrder, type PlaceOrderResult } from "@/server/orders/checkout";

async function readCart(): Promise<CartEntry[]> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

/** Not httpOnly: the header reads it to show the item count. It holds ids and quantities only. */
async function writeCart(entries: CartEntry[]): Promise<void> {
  (await cookies()).set(CART_COOKIE, serializeCart(entries), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

const kindOf = (value: unknown): CartEntry["kind"] => (value === "package" ? "package" : "product");
// Server actions can be called with anything: only well-formed ids reach the cookie.
const isId = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9-]{1,80}$/.test(value);

/** "Add to cart": puts the item in the cart (once; quantities change on the cart page), then shows the cart. */
export async function addToCartAction(kind: CartEntry["kind"], id: string, locale: string): Promise<void> {
  if (isId(id)) {
    const cart = await readCart();
    const current = cart.find((e) => e.kind === kindOf(kind) && e.id === id)?.quantity ?? 0;
    await writeCart(setInCart(cart, kindOf(kind), id, Math.max(current, 1)));
  }
  redirect({ href: "/cart", locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale });
}

/** Quantity buttons on the cart page; 0 removes the item. */
export async function setCartQuantityAction(kind: CartEntry["kind"], id: string, quantity: number): Promise<void> {
  if (!isId(id)) return;
  await writeCart(setInCart(await readCart(), kindOf(kind), id, Number(quantity) || 0));
}

export type CheckoutState = {
  fieldErrors: Partial<Record<CheckoutField, true>>;
  problem: Exclude<PlaceOrderResult, { ok: true }>["reason"] | "generic" | null;
  /** What was typed, so the form keeps it after an error. */
  values: Record<string, string>;
};

/** The site's own address, for the pages the payment provider sends customers back to. */
async function siteOrigin(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

export async function placeOrderAction(locale: string, _previous: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const values = Object.fromEntries(
    ["firstName", "lastName", "email", "phone", "town", "marketingOptIn"].map((key) => [key, String(formData.get(key) ?? "")]),
  );
  const parsed = checkoutFormSchema.safeParse(checkoutFormFrom(formData));
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], true]));
    return { fieldErrors, problem: null, values };
  }

  let result: PlaceOrderResult;
  try {
    const siteLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
    result = await placeOrder(await readCart(), parsed.data, siteLocale, await siteOrigin());
  } catch (error) {
    console.error("[checkout] could not place the order:", error);
    return { fieldErrors: {}, problem: "generic", values };
  }
  if (!result.ok) return { fieldErrors: {}, problem: result.reason, values };
  // The payment page (or, for a request, the order page). The cart is emptied there.
  nextRedirect(result.redirectUrl);
}
