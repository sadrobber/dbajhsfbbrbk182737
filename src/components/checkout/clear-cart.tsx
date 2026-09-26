"use client";

import { useEffect } from "react";
import { clearCartCookie } from "./cart-cookie";

/** On the order page: the cart has become an order, so it starts empty again. */
export function ClearCart() {
  useEffect(() => {
    clearCartCookie();
  }, []);
  return null;
}
