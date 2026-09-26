import type { SupplierConnector } from "./types";

/** No supplier API yet: staff check availability themselves and record the answer in the admin. */
export const manualSuppliers: SupplierConnector = {
  label: "Manual check (call or email your suppliers)",
  async checkOrder(lines) {
    return lines.map((line) => ({ productId: line.productId, status: "unknown", note: null }));
  },
};
