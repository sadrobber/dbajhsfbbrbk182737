"use client";

import { ArrowLeft, ImagePlus, Loader2, Star, Trash2, X } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveProductAction, deleteProductAction, uploadProductPhotosAction } from "@/app/admin/(panel)/products/actions";
import { fieldErrorsOf } from "@/components/admin/form-errors";
import { useAdminI18n } from "@/components/admin/i18n";
import { useUnsavedChangesWarning } from "@/components/admin/save-bar";
import { storageText } from "@/components/admin/stock";
import { PreviewFrame, type PreviewMessages, usePreviewTranslator } from "@/components/admin/preview";
import { adminButton, adminCheckbox, adminInput, adminSelect, iconButton } from "@/components/admin/styles";
import { Banner, Field, Fieldset } from "@/components/admin/ui";
import { DealCard } from "@/components/product/deal-card";
import { RefurbCard } from "@/components/product/refurb-card";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import type { AdminModel } from "@/lib/data/admin-repository";
import { colorFamilyOf, enrichCatalog } from "@/lib/data/catalog-logic";
import {
  batteryOptions,
  type Brand,
  colors,
  type Condition,
  goodForTags,
  grades,
  manualBadges,
  type Product,
  modelColorName,
  productSchema,
  supplierAvailabilities,
  visuals,
} from "@/lib/data/schema";
import { buildProductCardView } from "@/lib/product-view";
import { draftOf, newDraft, type ProductDraft, previewProductOf, productOf } from "./product-draft";

const MAX_PHOTOS = 6;

export function ProductEditor({
  product,
  products,
  brands,
  models,
  inGreatDeals,
  orderCount,
  lowStockThreshold,
  messages,
  onClose,
  onSaved,
  onDeleted,
}: {
  /** null: a new product. */
  product: Product | null;
  products: Product[];
  brands: Brand[];
  models: AdminModel[];
  inGreatDeals: boolean;
  orderCount: number;
  lowStockThreshold: number;
  messages: PreviewMessages;
  onClose: () => void;
  onSaved: (product: Product, created: boolean) => void;
  onDeleted: (label: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [initial] = useState<ProductDraft>(() => (product ? draftOf(product) : newDraft()));
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { t, locale } = useAdminI18n();
  const [previewLocale, setPreviewLocale] = useState<Locale>("fr");
  const isNew = product === null;
  /** The shop's own labels (badges, colours, uses) in the admin's language. */
  const shopLabels = messages[locale].Product;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useUnsavedChangesWarning(dirty);
  const validation = productSchema.safeParse(productOf(draft));
  const errors = submitted && !validation.success ? fieldErrorsOf(validation.error, t) : serverFieldErrors;

  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function requestClose() {
    if (pending || uploading) return;
    if (dirty && !window.confirm(t("ProductEditor.discardConfirm"))) return;
    onClose();
  }

  function changeCondition(condition: Condition) {
    setDraft((d) => ({
      ...d,
      condition,
      grade: condition === "refurbished" ? d.grade || "excellent" : "",
      battery: condition === "refurbished" ? d.battery || "standard" : "",
      batteryHealth: condition === "refurbished" ? d.batteryHealth : "",
      warrantyMonths: d.warrantyMonths || (condition === "refurbished" ? "12" : "24"),
    }));
  }

  const model = models.find((m) => m.id === draft.modelId) ?? null;
  const modelsByBrand = useMemo(() => {
    const groups = new Map<string, AdminModel[]>();
    for (const m of [...models].sort((a, b) => (b.release_year ?? 0) - (a.release_year ?? 0) || a.name.localeCompare(b.name))) {
      groups.set(m.brand, [...(groups.get(m.brand) ?? []), m]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [models]);

  /** A new model keeps the storage and colour only when it offers them. */
  function changeModel(modelId: string) {
    const next = models.find((m) => m.id === modelId);
    setDraft((d) => {
      const storageGb = next?.storage_gb.includes(Number(d.storageGb)) ? d.storageGb : String(next?.storage_gb[0] ?? "");
      const colorName = next?.colors.some((c) => c.name_en === d.colorName) ? d.colorName : (next?.colors[0]?.name_en ?? "");
      return { ...d, modelId, storageGb, colorName, color: colorName ? colorFamilyOf(colorName) : d.color };
    });
  }

  function changeColor(colorName: string) {
    setDraft((d) => ({ ...d, colorName, color: colorFamilyOf(colorName) }));
  }

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function save() {
    setSubmitted(true);
    setServerFieldErrors({});
    if (!validation.success) {
      setError(t("Common.fieldsNeedAttention"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveProductAction(validation.data, isNew);
      if (result.ok) {
        onSaved(result.data, isNew);
      } else {
        setError(result.error);
        setServerFieldErrors(result.fieldErrors ?? {});
        setSubmitted(false);
      }
    });
  }

  function remove() {
    if (!product) return;
    startTransition(async () => {
      const result = await deleteProductAction(product.id);
      if (result.ok) onDeleted(`${models.find((m) => m.id === product.modelId)?.label ?? product.modelId} (${product.sku})`);
      else {
        setError(result.error);
        setConfirmDelete(false);
      }
    });
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (draft.photos.length + files.length > MAX_PHOTOS) {
      setError(t("ProductEditor.maxPhotos", { max: MAX_PHOTOS }));
      return;
    }
    const form = new FormData();
    for (const file of Array.from(files)) form.append("photos", file);
    setUploading(true);
    setError(null);
    try {
      const result = await uploadProductPhotosAction(form);
      if (result.ok) setDraft((d) => ({ ...d, photos: [...d.photos, ...result.data] }));
      else setError(result.error);
    } finally {
      setUploading(false);
    }
  }

  // Live preview: the same card components and view builder as the shop.
  const previewT = usePreviewTranslator(messages, previewLocale);
  const previewItem = useMemo(() => {
    const candidate = previewProductOf(draft);
    const others = products.filter((p) => p.id !== candidate.id);
    // Before a model is picked, the card shows a placeholder name.
    const previewModels = candidate.modelId
      ? models
      : [...models, { id: "", brand: "", name: t("ProductEditor.newPhone"), colors: [] }];
    return enrichCatalog({ currency: "EUR", brands, models: previewModels, products: [...others, candidate] }).find(
      (item) => item.id === candidate.id,
    )!;
  }, [draft, products, brands, models, t]);
  const card = buildProductCardView(previewItem, { t: previewT, locale: previewLocale, lowStockThreshold });

  const title = isNew
    ? t("ProductEditor.addTitle")
    : t("ProductEditor.editTitle", { name: models.find((m) => m.id === product.modelId)?.label ?? product.modelId });

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="product-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-[78rem] bg-surface-1 p-0 text-fg backdrop:bg-night/55"
    >
      <form
        className="flex h-full flex-col"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line bg-ink px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" className={iconButton} onClick={requestClose} aria-label={t("ProductEditor.backToList")}>
              <ArrowLeft aria-hidden="true" className="size-5" />
            </button>
            <h2 id="product-editor-title" className="truncate font-display text-xl font-extrabold tracking-[-0.02em]">
              {title}
            </h2>
          </div>
          <button type="button" className={iconButton} onClick={requestClose} aria-label={t("Common.close")}>
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <div className="grid flex-1 gap-6 overflow-y-auto p-4 sm:p-6 xl:grid-cols-[1fr_24rem]">
          <div className="grid content-start gap-6">
            {error && (
              <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 font-semibold text-danger">
                {error}
              </p>
            )}

            <Section title={t("ProductEditor.sectionPhone")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("ProductEditor.model")}
                  error={errors.modelId && t("ProductEditor.pickModel")}
                  className="sm:col-span-2"
                  hint={
                    model?.status === "needs_check" ? (
                      <span className="font-semibold text-warning">
                        {model.missing_fields.length > 0
                          ? t("ProductEditor.specsToCheckMissing", { fields: model.missing_fields.join(", ") })
                          : t("ProductEditor.specsToCheckHint")}
                      </span>
                    ) : (
                      t("ProductEditor.modelHint")
                    )
                  }
                >
                  <select
                    value={draft.modelId}
                    onChange={(e) => changeModel(e.target.value)}
                    aria-invalid={Boolean(errors.modelId)}
                    className={adminSelect}
                    autoFocus={isNew}
                  >
                    <option value="" disabled>
                      {t("ProductEditor.chooseModel")}
                    </option>
                    {modelsByBrand.map(([brand, list]) => (
                      <optgroup key={brand} label={brand}>
                        {list.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                            {m.release_year ? ` (${m.release_year})` : ""}
                            {m.status === "needs_check" ? ` · ${t("ProductEditor.specsToCheck")}` : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                <Fieldset legend={t("ProductEditor.condition")}>
                  <div className="flex gap-2">
                    {(["new", "refurbished"] as const).map((condition) => (
                      <label
                        key={condition}
                        className={cn(
                          "flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 font-semibold has-focus-visible:outline-3 has-focus-visible:outline-accent-strong",
                          draft.condition === condition ? "border-accent bg-accent-soft text-accent-text" : "border-line-strong/60 bg-ink",
                        )}
                      >
                        <input
                          type="radio"
                          name="condition"
                          value={condition}
                          checked={draft.condition === condition}
                          onChange={() => changeCondition(condition)}
                          className="sr-only"
                        />
                        {t(`Labels.condition.${condition}`)}
                      </label>
                    ))}
                  </div>
                </Fieldset>
                <Field label={t("ProductEditor.storage")} error={errors.storageGb}>
                  <select
                    value={draft.storageGb}
                    onChange={(e) => set("storageGb", e.target.value)}
                    className={adminSelect}
                    disabled={!model}
                  >
                    {(model?.storage_gb ?? []).map((gb) => (
                      <option key={gb} value={gb}>
                        {storageText(t, gb)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label={t("ProductEditor.colour")}
                  error={errors.colorName}
                  hint={model && model.colors.length === 0 ? t("ProductEditor.colourUnknownHint") : undefined}
                >
                  {model && model.colors.length === 0 ? (
                    <input value={draft.colorName} onChange={(e) => changeColor(e.target.value)} className={adminInput} />
                  ) : (
                    <select value={draft.colorName} onChange={(e) => changeColor(e.target.value)} className={adminSelect} disabled={!model}>
                      {(model?.colors ?? []).map((c) => (
                        <option key={c.name_en} value={c.name_en}>
                          {modelColorName(c, locale) ?? c.name_en}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label={t("ProductEditor.illustrationColour")} hint={t("ProductEditor.illustrationColourHint")}>
                  <select value={draft.color} onChange={(e) => set("color", e.target.value as ProductDraft["color"])} className={adminSelect}>
                    {colors.map((color) => (
                      <option key={color} value={color}>
                        {shopLabels.colors[color]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("ProductEditor.illustration")} hint={t("ProductEditor.illustrationHint")}>
                  <select value={draft.visual} onChange={(e) => set("visual", e.target.value as ProductDraft["visual"])} className={adminSelect}>
                    {visuals.map((visual) => (
                      <option key={visual} value={visual}>
                        {t(`Labels.visual.${visual}`)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            {draft.condition === "refurbished" && (
              <Section title={t("ProductEditor.sectionRefurbished")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("ProductEditor.grade")} error={errors.grade}>
                    <select value={draft.grade} onChange={(e) => set("grade", e.target.value as ProductDraft["grade"])} className={adminSelect}>
                      {grades.map((grade) => (
                        <option key={grade} value={grade}>
                          {t(`Labels.grade.${grade}`)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("ProductEditor.battery")} error={errors.battery}>
                    <select
                      value={draft.battery}
                      onChange={(e) => {
                        const battery = e.target.value as ProductDraft["battery"];
                        setDraft((d) => ({ ...d, battery, batteryHealth: battery === "new" ? "100" : d.batteryHealth }));
                      }}
                      className={adminSelect}
                    >
                      {batteryOptions.map((option) => (
                        <option key={option} value={option}>
                          {t(`Labels.battery.${option}`)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("ProductEditor.batteryHealth")} error={errors.batteryHealth}>
                    <input
                      inputMode="numeric"
                      value={draft.batteryHealth}
                      onChange={(e) => set("batteryHealth", e.target.value)}
                      aria-invalid={Boolean(errors.batteryHealth)}
                      placeholder={t("ProductEditor.batteryHealthPlaceholder")}
                      className={adminInput}
                    />
                  </Field>
                </div>
              </Section>
            )}

            <Section title={t("ProductEditor.sectionPrice")}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label={t("ProductEditor.price")} error={errors.price}>
                  <input
                    inputMode="decimal"
                    value={draft.price}
                    onChange={(e) => set("price", e.target.value)}
                    aria-invalid={Boolean(errors.price)}
                    className={adminInput}
                  />
                </Field>
                <Field label={t("ProductEditor.previousPrice")} error={errors.compareAtPrice} hint={t("ProductEditor.previousPriceHint")}>
                  <input
                    inputMode="decimal"
                    value={draft.compareAtPrice}
                    onChange={(e) => set("compareAtPrice", e.target.value)}
                    aria-invalid={Boolean(errors.compareAtPrice)}
                    className={adminInput}
                  />
                </Field>
                <Field label={t("ProductEditor.stock")} error={errors.stock} hint={t("ProductEditor.stockHint", { threshold: lowStockThreshold })}>
                  <input
                    inputMode="numeric"
                    value={draft.stock}
                    onChange={(e) => set("stock", e.target.value)}
                    aria-invalid={Boolean(errors.stock)}
                    className={adminInput}
                  />
                </Field>
                <Field label={t("ProductEditor.warranty")} error={errors.warrantyMonths}>
                  <input
                    inputMode="numeric"
                    value={draft.warrantyMonths}
                    onChange={(e) => set("warrantyMonths", e.target.value)}
                    aria-invalid={Boolean(errors.warrantyMonths)}
                    className={adminInput}
                  />
                </Field>
                <Field
                  label={t("ProductEditor.whenOut")}
                  error={errors.supplierAvailability}
                  className="sm:col-span-2 lg:col-span-4"
                  hint={t("ProductEditor.whenOutHint")}
                >
                  <select
                    value={draft.supplierAvailability}
                    onChange={(e) => set("supplierAvailability", e.target.value as ProductDraft["supplierAvailability"])}
                    className={adminSelect}
                  >
                    {supplierAvailabilities.map((value) => (
                      <option key={value} value={value}>
                        {t(`Labels.supplierAvailability.${value}`)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            <Section title={t("ProductEditor.sectionBadges")}>
              <div className="grid gap-5 lg:grid-cols-2">
                <Fieldset legend={t("ProductEditor.badges")}>
                  {manualBadges.map((badge) => (
                    <label key={badge} className="flex min-h-9 items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={draft.badges.includes(badge)}
                        onChange={() => set("badges", toggle(draft.badges, badge))}
                        className={adminCheckbox}
                      />
                      {shopLabels.badges[badge]}
                    </label>
                  ))}
                  <p className="text-[0.8125rem] text-fg-subtle">
                    {t("ProductEditor.badgesHint")}
                    {inGreatDeals && ` ${t("ProductEditor.badgesInDeals")}`}
                  </p>
                </Fieldset>
                <Fieldset legend={t("ProductEditor.goodFor")} error={errors.goodFor}>
                  <div className="flex flex-wrap gap-2">
                    {goodForTags.map((tag) => {
                      const rank = draft.goodFor.indexOf(tag);
                      return (
                        <label
                          key={tag}
                          className={cn(
                            "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-[0.9375rem] font-semibold has-focus-visible:outline-3 has-focus-visible:outline-accent-strong",
                            rank >= 0 ? "border-accent bg-accent-soft text-accent-text" : "border-line-strong/60 bg-ink",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={rank >= 0}
                            onChange={() => set("goodFor", toggle(draft.goodFor, tag))}
                            className="sr-only"
                          />
                          {rank >= 0 && (
                            <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-accent text-[0.75rem] text-white">
                              {rank + 1}
                            </span>
                          )}
                          {shopLabels.goodFor[tag]}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[0.8125rem] text-fg-subtle">{t("ProductEditor.goodForHint")}</p>
                </Fieldset>
              </div>
            </Section>

            <Section title={t("ProductEditor.sectionPhotos")}>
              <div className="grid gap-3">
                {draft.photos.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {draft.photos.map((photo, index) => (
                      <li key={photo} className="grid gap-1.5">
                        <span className="relative block aspect-[3/4] overflow-hidden rounded-xl border border-line bg-surface-2">
                          <Image src={photo} alt={t("ProductEditor.photoAlt", { number: index + 1 })} fill sizes="10rem" className="object-contain p-1" />
                          {index === 0 && (
                            <span className="absolute left-1.5 top-1.5 rounded-md bg-fg px-1.5 py-0.5 text-[0.75rem] font-bold text-ink">{t("ProductEditor.mainPhoto")}</span>
                          )}
                        </span>
                        <span className="flex justify-center gap-1">
                          <button
                            type="button"
                            className={iconButton}
                            disabled={index === 0}
                            onClick={() => set("photos", [photo, ...draft.photos.filter((p) => p !== photo)])}
                            aria-label={t("ProductEditor.makeMainLabel", { number: index + 1 })}
                            title={t("ProductEditor.makeMain")}
                          >
                            <Star aria-hidden="true" className="size-4" />
                          </button>
                          <button
                            type="button"
                            className={iconButton}
                            onClick={() => set("photos", draft.photos.filter((p) => p !== photo))}
                            aria-label={t("ProductEditor.removePhotoLabel", { number: index + 1 })}
                            title={t("ProductEditor.removePhoto")}
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-fg-muted">{t("ProductEditor.noPhoto")}</p>
                )}
                <label
                  className={cn(
                    adminButton("secondary", "w-fit cursor-pointer has-focus-visible:outline-3 has-focus-visible:outline-accent-strong"),
                    (uploading || draft.photos.length >= MAX_PHOTOS) && "pointer-events-none opacity-50",
                  )}
                >
                  {uploading ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : <ImagePlus aria-hidden="true" className="size-5" />}
                  {uploading ? t("ProductEditor.uploading") : t("ProductEditor.addPhotos")}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    className="sr-only"
                    disabled={uploading || draft.photos.length >= MAX_PHOTOS}
                    onChange={(e) => {
                      void upload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className="text-[0.8125rem] text-fg-subtle">
                  {t("ProductEditor.photosHint", { max: MAX_PHOTOS })}
                </p>
              </div>
            </Section>
          </div>

          <aside className="grid content-start gap-4 xl:sticky xl:top-0">
            <PreviewFrame title={t("ProductEditor.previewDeal")} locale={previewLocale} onLocaleChange={setPreviewLocale}>
              <div className="mx-auto max-w-[22rem]">
                <DealCard product={card} labels={{ view: previewT("Product.view"), previousPrice: previewT("Product.previousPrice") }} />
              </div>
            </PreviewFrame>
            {draft.condition === "refurbished" && (
              <PreviewFrame title={t("ProductEditor.previewRefurb")} locale={previewLocale} onLocaleChange={setPreviewLocale}>
                <div className="mx-auto max-w-[22rem]">
                  <RefurbCard product={card} />
                </div>
              </PreviewFrame>
            )}
            {!isNew && orderCount > 0 && (
              <Banner>
                {t("ProductEditor.inOrders", { count: orderCount })}
              </Banner>
            )}
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-ink px-4 py-3 sm:px-6">
          <div>
            {!isNew &&
              (confirmDelete ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{t("ProductEditor.deleteConfirm")}</span>
                  <button type="button" className={adminButton("dangerSolid")} onClick={remove} disabled={pending}>
                    {t("ProductEditor.deleteYes")}
                  </button>
                  <button type="button" className={adminButton("ghost")} onClick={() => setConfirmDelete(false)}>
                    {t("ProductEditor.keep")}
                  </button>
                </span>
              ) : (
                <button type="button" className={adminButton("danger")} onClick={() => setConfirmDelete(true)} disabled={pending}>
                  <Trash2 aria-hidden="true" className="size-4" />
                  {t("Common.delete")}
                </button>
              ))}
          </div>
          <div className="flex gap-2">
            <button type="button" className={adminButton("secondary")} onClick={requestClose} disabled={pending}>
              {t("Common.cancel")}
            </button>
            <button type="submit" className={adminButton("primary", "min-w-32")} disabled={pending || uploading}>
              {pending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {isNew ? t("ProductEditor.addSubmit") : t("Common.save")}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-ink p-4 sm:p-5">
      <h3 className="mb-4 font-display text-[1.0625rem] font-bold">{title}</h3>
      {children}
    </section>
  );
}
