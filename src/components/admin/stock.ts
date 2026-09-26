import type { SupplierAvailability } from "@/lib/data/schema";
import type { PillTone } from "./ui";

/** Stock as staff read it, with the same thresholds as the shop's badges. */
export function stockTone(
  stock: number,
  lowStockThreshold: number,
  supplierAvailability: SupplierAvailability = "none",
): { tone: PillTone; label: string } {
  if (stock <= 0) {
    if (supplierAvailability === "within_48h") return { tone: "info", label: "0 in shop · supplier 24–48h" };
    if (supplierAvailability === "on_request") return { tone: "neutral", label: "0 in shop · on request" };
    return { tone: "danger", label: "Sold out" };
  }
  if (stock === 1) return { tone: "warning", label: "Last one" };
  if (stock <= lowStockThreshold) return { tone: "warning", label: `Only ${stock} left` };
  return { tone: "success", label: `${stock} in stock` };
}
