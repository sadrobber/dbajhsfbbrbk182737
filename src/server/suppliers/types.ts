import type { SupplierAvailability } from "@/lib/data/schema";

/**
 * What the shop can ask its suppliers. Today staff check by phone or email
 * (./manual.ts). When a supplier offers an API, write one adapter that
 * implements this interface and select it in ./index.ts: the checkout,
 * orders and admin screens stay as they are.
 */
export interface SupplierConnector {
  /** Shown to staff in the admin's language, e.g. "Manual check" or a supplier's name. */
  readonly label: { fr: string; en: string };
  /**
   * Asked when a "24-48h" or "on request" order arrives, and shown on the
   * order in the admin. "unknown" means staff must check themselves.
   */
  checkOrder(lines: { productId: string; quantity: number }[]): Promise<SupplierAnswer[]>;
  /**
   * Optional stock feed: what each supplier can deliver now. Applied to the
   * products' "when out of stock" setting by syncSupplierCatalog().
   */
  fetchCatalogAvailability?(): Promise<{ productId: string; availability: SupplierAvailability }[]>;
}

export type SupplierAnswer = {
  productId: string;
  status: "available" | "unavailable" | "unknown";
  /** Supplier's own words: delay, reference, price change... */
  note: string | null;
};
