import { CART_COOKIE, cartCount, parseCart } from "@/lib/orders/cart";

/** Browser side of the cart cookie (see src/lib/orders/cart.ts). */

export function readCartCount(): number {
  const raw = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${CART_COOKIE}=`))
    ?.slice(CART_COOKIE.length + 1);
  return cartCount(parseCart(raw ? decodeURIComponent(raw) : null));
}

export function clearCartCookie(): void {
  document.cookie = `${CART_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
}

/** The count changes through server actions, which the browser isn't told about: check now and then. */
export function subscribeToCart(onChange: () => void): () => void {
  const timer = window.setInterval(onChange, 1000);
  window.addEventListener("focus", onChange);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", onChange);
  };
}
