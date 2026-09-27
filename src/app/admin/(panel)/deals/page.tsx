import type { Metadata } from "next";
import { DealsManager } from "@/components/admin/deals/deals-manager";
import { storefrontSettings } from "@/config/site.config";
import { listAdminModels, listBrands, listDeals, listProducts } from "@/lib/data/admin-repository";
import { requireAdmin } from "@/server/admin/auth";
import { getAdminI18n } from "@/server/admin/i18n";
import { getPreviewMessages } from "@/server/admin/preview-messages";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("Nav.deals") };
}

export default async function DealsPage() {
  await requireAdmin();
  const [deals, products, brands, models] = await Promise.all([listDeals(), listProducts(), listBrands(), listAdminModels()]);
  // Only the models the shop has products for: the browser doesn't need the whole database.
  const used = new Set(products.map((p) => p.modelId));
  return (
    <DealsManager
      deals={deals}
      products={products}
      brands={brands}
      models={models.filter((m) => used.has(m.id))}
      maxItems={storefrontSettings.greatDealsMaxItems}
      lowStockThreshold={storefrontSettings.lowStockThreshold}
      messages={getPreviewMessages()}
    />
  );
}
