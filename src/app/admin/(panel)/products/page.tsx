import type { Metadata } from "next";
import { ProductsManager } from "@/components/admin/products/products-manager";
import { storefrontSettings } from "@/config/site.config";
import { listBrands, listDeals, listOrders, listProducts } from "@/lib/data/admin-repository";
import { requireAdmin } from "@/server/admin/auth";
import { getPreviewMessages } from "@/server/admin/preview-messages";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const [products, brands, deals, orders, { q }] = await Promise.all([
    listProducts(),
    listBrands(),
    listDeals(),
    listOrders(),
    searchParams,
  ]);
  const orderCounts: Record<string, number> = {};
  for (const order of orders) {
    for (const line of order.lines) if (line.productId) orderCounts[line.productId] = (orderCounts[line.productId] ?? 0) + 1;
  }

  return (
    <ProductsManager
      products={products}
      brands={brands}
      dealProductIds={deals.map((deal) => deal.productId)}
      orderCounts={orderCounts}
      lowStockThreshold={storefrontSettings.lowStockThreshold}
      messages={getPreviewMessages()}
      initialQuery={typeof q === "string" ? q : ""}
    />
  );
}
