import type { AdminTranslator } from "@/i18n/admin";
import type { SupplierAvailability } from "@/lib/data/schema";
import type { PillTone } from "./ui";

/** Stock as staff read it, with the same thresholds as the shop's badges. */
export function stockTone(
  t: AdminTranslator,
  stock: number,
  lowStockThreshold: number,
  supplierAvailability: SupplierAvailability = "none",
): { tone: PillTone; label: string } {
  if (stock <= 0) {
    if (supplierAvailability === "within_48h") return { tone: "info", label: t("Labels.stock.supplier") };
    if (supplierAvailability === "on_request") return { tone: "neutral", label: t("Labels.stock.onRequest") };
    return { tone: "danger", label: t("Labels.stock.soldOut") };
  }
  if (stock === 1) return { tone: "warning", label: t("Labels.stock.lastOne") };
  if (stock <= lowStockThreshold) return { tone: "warning", label: t("Labels.stock.fewLeft", { count: stock }) };
  return { tone: "success", label: t("Labels.stock.inStock", { count: stock }) };
}

/** "128 GB" / "128 Go", "1 TB" / "1 To". */
export function storageText(t: AdminTranslator, gb: number): string {
  return gb >= 1024 ? t("Common.tb", { value: gb / 1024 }) : t("Common.gb", { value: gb });
}
