"use client";

import { Pencil, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { adminButton, adminCard, adminInput, adminSelect, tableCell, tableHead } from "@/components/admin/styles";
import { stockTone } from "@/components/admin/stock";
import { PageHeader, Pill } from "@/components/admin/ui";
import type { PreviewMessages } from "@/components/admin/preview";
import { cn } from "@/lib/cn";
import type { Brand, Product } from "@/lib/data/schema";
import { ProductEditor } from "./product-editor";
import { ProductThumb } from "./product-thumb";

type StockFilter = "all" | "in" | "low" | "out";

const euro = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" });

export function ProductsManager({
  products,
  brands,
  dealProductIds,
  orderCounts,
  lowStockThreshold,
  messages,
  initialQuery,
}: {
  products: Product[];
  brands: Brand[];
  dealProductIds: string[];
  orderCounts: Record<string, number>;
  lowStockThreshold: number;
  messages: PreviewMessages;
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [condition, setCondition] = useState<"all" | Product["condition"]>("all");
  const [brand, setBrand] = useState("all");
  const [stock, setStock] = useState<StockFilter>("all");
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);
  const [notice, setNotice] = useState<{ text: string; id: string | null } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const brandNames = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);
  const deals = useMemo(() => new Set(dealProductIds), [dealProductIds]);
  const colorLabels = messages.en.Product.colors;

  const visible = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      if (condition !== "all" && p.condition !== condition) return false;
      if (brand !== "all" && p.brand !== brand) return false;
      if (stock === "in" && p.stock <= 0) return false;
      if (stock === "low" && (p.stock <= 0 || p.stock > lowStockThreshold)) return false;
      if (stock === "out" && p.stock > 0) return false;
      const haystack = `${brandNames.get(p.brand)} ${p.model} ${p.id} ${p.storageGb}gb ${p.color} ${p.grade ?? ""}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }, [products, query, condition, brand, stock, lowStockThreshold, brandNames]);

  const editedProduct = editing?.id ? (products.find((p) => p.id === editing.id) ?? null) : null;

  return (
    <>
      <PageHeader
        title="Products"
        description="New and refurbished phones. Changes appear on the shop as soon as you save."
        actions={
          <button type="button" className={adminButton("primary")} onClick={() => setEditing({ id: null })}>
            <Plus aria-hidden="true" className="size-5" />
            Add product
          </button>
        }
      />

      <div className={cn(adminCard, "grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]")}>
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Search products</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by brand, model, colour…"
            className={cn(adminInput, "pl-10")}
          />
        </label>
        <label>
          <span className="sr-only">Condition</span>
          <select value={condition} onChange={(e) => setCondition(e.target.value as typeof condition)} className={adminSelect}>
            <option value="all">New and refurbished</option>
            <option value="new">New only</option>
            <option value="refurbished">Refurbished only</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Brand</span>
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className={adminSelect}>
            <option value="all">All brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Stock</span>
          <select value={stock} onChange={(e) => setStock(e.target.value as StockFilter)} className={adminSelect}>
            <option value="all">Any stock</option>
            <option value="in">In stock</option>
            <option value="low">Low stock (≤ {lowStockThreshold})</option>
            <option value="out">Sold out</option>
          </select>
        </label>
      </div>

      <div aria-live="polite" className="min-h-0">
        {notice && (
          <p className="rounded-xl bg-success-soft px-4 py-3 font-semibold text-success">{notice.text}</p>
        )}
      </div>

      <div className={cn(adminCard, "overflow-x-auto")}>
        <table className="w-full min-w-[56rem] border-collapse text-[0.9375rem]">
          <caption className="sr-only">Products, {visible.length} shown</caption>
          <thead className="border-b border-line bg-surface-1">
            <tr>
              <th scope="col" className={tableHead}>
                Product
              </th>
              <th scope="col" className={tableHead}>
                Condition
              </th>
              <th scope="col" className={tableHead}>
                Storage · colour
              </th>
              <th scope="col" className={cn(tableHead, "text-right")}>
                Price
              </th>
              <th scope="col" className={tableHead}>
                Stock
              </th>
              <th scope="col" className={tableHead}>
                Badges
              </th>
              <th scope="col" className={tableHead}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const stockInfo = stockTone(p.stock, lowStockThreshold);
              return (
                <tr
                  key={p.id}
                  className={cn(
                    "border-b border-line last:border-0 hover:bg-surface-1",
                    notice?.id === p.id && "bg-accent-soft/60",
                  )}
                >
                  <td className={tableCell}>
                    <div className="flex items-center gap-3">
                      <ProductThumb product={p} />
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {brandNames.get(p.brand)} {p.model}
                        </p>
                        <p className="text-[0.8125rem] text-fg-subtle">{p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className={tableCell}>
                    {p.condition === "new" ? (
                      <Pill tone="info">New</Pill>
                    ) : (
                      <span className="grid gap-0.5">
                        <Pill>Refurbished {p.grade}</Pill>
                        <span className="text-[0.8125rem] text-fg-subtle">Battery {p.batteryHealth}%</span>
                      </span>
                    )}
                  </td>
                  <td className={tableCell}>
                    {p.storageGb >= 1024 ? `${p.storageGb / 1024} TB` : `${p.storageGb} GB`} · {colorLabels[p.color]}
                  </td>
                  <td className={cn(tableCell, "text-right tabular-nums")}>
                    <span className="font-semibold">{euro.format(p.price)}</span>
                    {p.compareAtPrice !== null && (
                      <s className="block text-[0.8125rem] text-fg-subtle">{euro.format(p.compareAtPrice)}</s>
                    )}
                  </td>
                  <td className={tableCell}>
                    <Pill tone={stockInfo.tone}>{stockInfo.label}</Pill>
                  </td>
                  <td className={tableCell}>
                    <div className="flex flex-wrap gap-1">
                      {deals.has(p.id) && <Pill tone="info">Great Deal</Pill>}
                      {p.badges.map((badge) => (
                        <Pill key={badge}>{messages.en.Product.badges[badge]}</Pill>
                      ))}
                    </div>
                  </td>
                  <td className={cn(tableCell, "text-right")}>
                    <button
                      type="button"
                      className={adminButton("secondary", "min-h-9")}
                      onClick={() => setEditing({ id: p.id })}
                      aria-label={`Edit ${brandNames.get(p.brand)} ${p.model} (${p.id})`}
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && <p className="p-6 text-center text-fg-muted">No product matches these filters.</p>}
      </div>
      <p className="text-[0.875rem] text-fg-subtle">
        {visible.length} of {products.length} products
      </p>

      {editing && (
        <ProductEditor
          key={editing.id ?? "new"}
          product={editedProduct}
          products={products}
          brands={brands}
          inGreatDeals={editing.id ? deals.has(editing.id) : false}
          orderCount={editing.id ? (orderCounts[editing.id] ?? 0) : 0}
          lowStockThreshold={lowStockThreshold}
          messages={messages}
          onClose={() => setEditing(null)}
          onSaved={(saved, created) => {
            setEditing(null);
            setNotice({ text: `${created ? "Added" : "Saved"} ${brandNames.get(saved.brand) ?? ""} ${saved.model}.`, id: saved.id });
          }}
          onDeleted={(label) => {
            setEditing(null);
            setNotice({ text: `Deleted ${label}.`, id: null });
          }}
        />
      )}
    </>
  );
}
