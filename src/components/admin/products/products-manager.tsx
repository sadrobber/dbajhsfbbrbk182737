"use client";

import { Pencil, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { adminButton, adminCard, adminInput, adminSelect, tableCell, tableHead } from "@/components/admin/styles";
import { useAdminI18n } from "@/components/admin/i18n";
import { storageText, stockTone } from "@/components/admin/stock";
import { PageHeader, Pill } from "@/components/admin/ui";
import type { PreviewMessages } from "@/components/admin/preview";
import { cn } from "@/lib/cn";
import type { AdminModel } from "@/lib/data/admin-repository";
import { type Brand, modelColorName, type Product } from "@/lib/data/schema";
import { ProductEditor } from "./product-editor";
import { ProductThumb } from "./product-thumb";

type StockFilter = "all" | "in" | "low" | "out";

export function ProductsManager({
  products,
  brands,
  models,
  dealProductIds,
  orderCounts,
  lowStockThreshold,
  messages,
  initialQuery,
}: {
  products: Product[];
  brands: Brand[];
  models: AdminModel[];
  dealProductIds: string[];
  orderCounts: Record<string, number>;
  lowStockThreshold: number;
  messages: PreviewMessages;
  initialQuery: string;
}) {
  const { t, locale, formats } = useAdminI18n();
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

  const modelById = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);
  const brandNameById = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);
  const deals = useMemo(() => new Set(dealProductIds), [dealProductIds]);
  const nameOf = (p: Pick<Product, "modelId">) => modelById.get(p.modelId)?.label ?? p.modelId;
  /** The official colour name in the admin's language, English until the French one is filled in. */
  const colourName = (p: Pick<Product, "modelId" | "colorName">) => {
    const colour = modelById.get(p.modelId)?.colors.find((c) => c.name_en === p.colorName);
    return (colour ? modelColorName(colour, locale) : null) ?? p.colorName;
  };

  const visible = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      const model = modelById.get(p.modelId);
      if (condition !== "all" && p.condition !== condition) return false;
      if (brand !== "all" && model?.brand !== brandNameById.get(brand)) return false;
      if (stock === "in" && p.stock <= 0) return false;
      if (stock === "low" && (p.stock <= 0 || p.stock > lowStockThreshold)) return false;
      if (stock === "out" && p.stock > 0) return false;
      const haystack =
        `${model?.label ?? ""} ${p.modelId} ${p.id} ${p.sku} ${p.storageGb}gb ${p.colorName} ${p.grade ? t(`Labels.gradeShort.${p.grade}`) : ""}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }, [products, query, condition, brand, stock, lowStockThreshold, modelById, brandNameById, t]);

  const editedProduct = editing?.id ? (products.find((p) => p.id === editing.id) ?? null) : null;

  return (
    <>
      <PageHeader
        title={t("Products.title")}
        description={t("Products.description")}
        actions={
          <button type="button" className={adminButton("primary")} onClick={() => setEditing({ id: null })}>
            <Plus aria-hidden="true" className="size-5" />
            {t("Products.add")}
          </button>
        }
      />

      <div className={cn(adminCard, "grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]")}>
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">{t("Products.searchLabel")}</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Products.searchPlaceholder")}
            className={cn(adminInput, "pl-10")}
          />
        </label>
        <label>
          <span className="sr-only">{t("Products.condition")}</span>
          <select value={condition} onChange={(e) => setCondition(e.target.value as typeof condition)} className={adminSelect}>
            <option value="all">{t("Products.allConditions")}</option>
            <option value="new">{t("Products.newOnly")}</option>
            <option value="refurbished">{t("Products.refurbishedOnly")}</option>
          </select>
        </label>
        <label>
          <span className="sr-only">{t("Products.brand")}</span>
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className={adminSelect}>
            <option value="all">{t("Products.allBrands")}</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2 lg:col-span-1">
          <span className="sr-only">{t("Products.stock")}</span>
          <select value={stock} onChange={(e) => setStock(e.target.value as StockFilter)} className={adminSelect}>
            <option value="all">{t("Products.anyStock")}</option>
            <option value="in">{t("Products.inStock")}</option>
            <option value="low">{t("Products.lowStock", { threshold: lowStockThreshold })}</option>
            <option value="out">{t("Products.soldOut")}</option>
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
          <caption className="sr-only">{t("Products.caption", { count: visible.length })}</caption>
          <thead className="border-b border-line bg-surface-1">
            <tr>
              <th scope="col" className={tableHead}>
                {t("Products.colProduct")}
              </th>
              <th scope="col" className={tableHead}>
                {t("Products.colCondition")}
              </th>
              <th scope="col" className={tableHead}>
                {t("Products.colStorageColour")}
              </th>
              <th scope="col" className={cn(tableHead, "text-right")}>
                {t("Products.colPrice")}
              </th>
              <th scope="col" className={tableHead}>
                {t("Products.colStock")}
              </th>
              <th scope="col" className={tableHead}>
                {t("Products.colBadges")}
              </th>
              <th scope="col" className={tableHead}>
                <span className="sr-only">{t("Products.colActions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const stockInfo = stockTone(t, p.stock, lowStockThreshold, p.supplierAvailability);
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
                        <p className="font-semibold">{nameOf(p)}</p>
                        <p className="text-[0.8125rem] text-fg-subtle">{p.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className={tableCell}>
                    {p.condition === "new" || !p.grade ? (
                      <Pill tone="info">{t("Products.new")}</Pill>
                    ) : (
                      <span className="grid gap-0.5">
                        <Pill>{t("Products.refurbishedGrade", { grade: t(`Labels.gradeShort.${p.grade}`) })}</Pill>
                        <span className="text-[0.8125rem] text-fg-subtle">
                          {p.battery === "new" ? t("Products.newBattery") : t("Products.batteryPercent", { value: p.batteryHealth ?? 0 })}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className={tableCell}>
                    {storageText(t, p.storageGb)} · {colourName(p)}
                  </td>
                  <td className={cn(tableCell, "text-right tabular-nums")}>
                    <span className="font-semibold">{formats.euro.format(p.price)}</span>
                    {p.compareAtPrice !== null && (
                      <s className="block text-[0.8125rem] text-fg-subtle">{formats.euro.format(p.compareAtPrice)}</s>
                    )}
                  </td>
                  <td className={tableCell}>
                    <Pill tone={stockInfo.tone}>{stockInfo.label}</Pill>
                  </td>
                  <td className={tableCell}>
                    <div className="flex flex-wrap gap-1">
                      {deals.has(p.id) && <Pill tone="info">{t("Products.greatDeal")}</Pill>}
                      {p.badges.map((badge) => (
                        <Pill key={badge}>{messages[locale].Product.badges[badge]}</Pill>
                      ))}
                    </div>
                  </td>
                  <td className={cn(tableCell, "text-right")}>
                    <button
                      type="button"
                      className={adminButton("secondary", "min-h-9")}
                      onClick={() => setEditing({ id: p.id })}
                      aria-label={t("Products.editLabel", { name: nameOf(p), sku: p.sku })}
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                      {t("Common.edit")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && <p className="p-6 text-center text-fg-muted">{t("Products.noMatch")}</p>}
      </div>
      <p className="text-[0.875rem] text-fg-subtle">
        {t("Products.count", { shown: visible.length, total: products.length })}
      </p>

      {editing && (
        <ProductEditor
          key={editing.id ?? "new"}
          product={editedProduct}
          products={products}
          brands={brands}
          models={models}
          inGreatDeals={editing.id ? deals.has(editing.id) : false}
          orderCount={editing.id ? (orderCounts[editing.id] ?? 0) : 0}
          lowStockThreshold={lowStockThreshold}
          messages={messages}
          onClose={() => setEditing(null)}
          onSaved={(saved, created) => {
            setEditing(null);
            setNotice({ text: t(created ? "Products.added" : "Products.saved", { name: nameOf(saved), sku: saved.sku }), id: saved.id });
          }}
          onDeleted={(label) => {
            setEditing(null);
            setNotice({ text: t("Products.deleted", { label }), id: null });
          }}
        />
      )}
    </>
  );
}
