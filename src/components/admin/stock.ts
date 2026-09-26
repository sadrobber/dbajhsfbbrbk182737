import type { PillTone } from "./ui";

/** Stock as staff read it, with the same thresholds as the shop's badges. */
export function stockTone(stock: number, lowStockThreshold: number): { tone: PillTone; label: string } {
  if (stock <= 0) return { tone: "danger", label: "Sold out" };
  if (stock === 1) return { tone: "warning", label: "Last one" };
  if (stock <= lowStockThreshold) return { tone: "warning", label: `Only ${stock} left` };
  return { tone: "success", label: `${stock} in stock` };
}
