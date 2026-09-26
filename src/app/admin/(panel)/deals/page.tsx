import type { Metadata } from "next";
import { DealsManager } from "@/components/admin/deals/deals-manager";
import { storefrontSettings } from "@/config/site.config";
import { listBrands, listDeals, listProducts } from "@/lib/data/admin-repository";
import { requireAdmin } from "@/server/admin/auth";
import { getPreviewMessages } from "@/server/admin/preview-messages";

export const metadata: Metadata = { title: "Great Deals" };

export default async function DealsPage() {
  await requireAdmin();
  const [deals, products, brands] = await Promise.all([listDeals(), listProducts(), listBrands()]);
  return (
    <DealsManager
      deals={deals}
      products={products}
      brands={brands}
      maxItems={storefrontSettings.greatDealsMaxItems}
      lowStockThreshold={storefrontSettings.lowStockThreshold}
      messages={getPreviewMessages()}
    />
  );
}
