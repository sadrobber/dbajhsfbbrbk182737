"use client";

import { ShoppingBagIcon as ShoppingBag } from "@phosphor-icons/react/dist/ssr";
import { useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";
import { readCartCount, subscribeToCart } from "./cart-cookie";

/** Header link to the cart, with the number of items once there are some. */
export function CartLink({ label }: { label: string }) {
  const count = useSyncExternalStore(subscribeToCart, readCartCount, () => 0);

  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `${label} (${count})` : label}
      className="relative inline-grid size-12 place-items-center rounded-full text-fg transition hover:bg-surface-1 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
    >
      <ShoppingBag aria-hidden="true" className="size-6" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.75rem] font-bold leading-5 text-white"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
