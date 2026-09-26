"use client";

import { ArrowLeft, ImagePlus, Loader2, Star, Trash2, X } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveProductAction, deleteProductAction, uploadProductPhotosAction } from "@/app/admin/(panel)/products/actions";
import { fieldErrorsOf } from "@/components/admin/form-errors";
import { SUPPLIER_AVAILABILITY } from "@/components/admin/labels";
import { useUnsavedChangesWarning } from "@/components/admin/save-bar";
import { PreviewFrame, type PreviewMessages, usePreviewTranslator } from "@/components/admin/preview";
import { adminButton, adminCheckbox, adminInput, adminSelect, iconButton } from "@/components/admin/styles";
import { Banner, Field, Fieldset } from "@/components/admin/ui";
import { DealCard } from "@/components/product/deal-card";
import { RefurbCard } from "@/components/product/refurb-card";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { enrichCatalog } from "@/lib/data/catalog-logic";
import {
  type Brand,
  colors,
  type Condition,
  goodForTags,
  grades,
  manualBadges,
  type Product,
  productSchema,
  supplierAvailabilities,
  visuals,
} from "@/lib/data/schema";
import { buildProductCardView } from "@/lib/product-view";
import { draftOf, newDraft, type ProductDraft, previewProductOf, productOf } from "./product-draft";

const STORAGE_OPTIONS = [32, 64, 128, 256, 512, 1024, 2048];
const MAX_PHOTOS = 6;

const VISUAL_LABELS: Record<(typeof visuals)[number], string> = {
  duo: "Two lenses in a square",
  trio: "Three lenses in a square",
  column: "Lenses in a column",
  bar: "Camera bar",
  single: "Single lens",
};

const GRADE_LABELS: Record<(typeof grades)[number], string> = {
  "A+": "A+ · like new",
  A: "A · very good",
  B: "B · good",
};

export function ProductEditor({
  product,
  products,
  brands,
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
  inGreatDeals: boolean;
  orderCount: number;
  lowStockThreshold: number;
  messages: PreviewMessages;
  onClose: () => void;
  onSaved: (product: Product, created: boolean) => void;
  onDeleted: (label: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [initial] = useState<ProductDraft>(() => (product ? draftOf(product) : newDraft(brands)));
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [locale, setLocale] = useState<Locale>("fr");
  const isNew = product === null;
  const en = messages.en.Product;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useUnsavedChangesWarning(dirty);
  const validation = productSchema.safeParse(productOf(draft));
  const errors = submitted && !validation.success ? fieldErrorsOf(validation.error) : serverFieldErrors;

  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function requestClose() {
    if (pending || uploading) return;
    if (dirty && !window.confirm("Discard your changes to this product?")) return;
    onClose();
  }

  function changeCondition(condition: Condition) {
    setDraft((d) => ({
      ...d,
      condition,
      grade: condition === "refurbished" ? d.grade || "A" : "",
      batteryHealth: condition === "refurbished" ? d.batteryHealth : "",
      warrantyMonths: d.warrantyMonths || (condition === "refurbished" ? "12" : "24"),
    }));
  }

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function save() {
    setSubmitted(true);
    setServerFieldErrors({});
    if (!validation.success) {
      setError("Some fields need attention.");
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
      if (result.ok) onDeleted(`${brands.find((b) => b.id === product.brand)?.name ?? ""} ${product.model}`);
      else {
        setError(result.error);
        setConfirmDelete(false);
      }
    });
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (draft.photos.length + files.length > MAX_PHOTOS) {
      setError(`A product can have ${MAX_PHOTOS} photos at most.`);
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
  const t = usePreviewTranslator(messages, locale);
  const previewItem = useMemo(() => {
    const candidate = previewProductOf(draft);
    const others = products.filter((p) => p.id !== candidate.id);
    return enrichCatalog({ currency: "EUR", brands, products: [...others, candidate] }).find((item) => item.id === candidate.id)!;
  }, [draft, products, brands]);
  const card = buildProductCardView(previewItem, { t, locale, lowStockThreshold });

  const title = isNew ? "Add a product" : `Edit ${brands.find((b) => b.id === product.brand)?.name ?? ""} ${product.model}`;

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
            <button type="button" className={iconButton} onClick={requestClose} aria-label="Back to the list">
              <ArrowLeft aria-hidden="true" className="size-5" />
            </button>
            <h2 id="product-editor-title" className="truncate font-display text-xl font-extrabold tracking-[-0.02em]">
              {title}
            </h2>
          </div>
          <button type="button" className={iconButton} onClick={requestClose} aria-label="Close">
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

            <Section title="Phone">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Brand" error={errors.brand}>
                  <select value={draft.brand} onChange={(e) => set("brand", e.target.value)} className={adminSelect}>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Model" error={errors.model} hint="Without the brand, e.g. “Galaxy S25”.">
                  <input
                    value={draft.model}
                    onChange={(e) => set("model", e.target.value)}
                    aria-invalid={Boolean(errors.model)}
                    className={adminInput}
                    autoFocus={isNew}
                  />
                </Field>
                <Fieldset legend="Condition">
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
                        {condition === "new" ? "New" : "Refurbished"}
                      </label>
                    ))}
                  </div>
                </Fieldset>
                <Field label="Storage" error={errors.storageGb}>
                  <select value={draft.storageGb} onChange={(e) => set("storageGb", e.target.value)} className={adminSelect}>
                    {[...new Set([...STORAGE_OPTIONS, Number(draft.storageGb)].filter(Number.isFinite))]
                      .sort((a, b) => a - b)
                      .map((gb) => (
                        <option key={gb} value={gb}>
                          {gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Colour" error={errors.color}>
                  <select value={draft.color} onChange={(e) => set("color", e.target.value as ProductDraft["color"])} className={adminSelect}>
                    {colors.map((color) => (
                      <option key={color} value={color}>
                        {en.colors[color]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Illustration" hint="Drawn when the product has no photo.">
                  <select value={draft.visual} onChange={(e) => set("visual", e.target.value as ProductDraft["visual"])} className={adminSelect}>
                    {visuals.map((visual) => (
                      <option key={visual} value={visual}>
                        {VISUAL_LABELS[visual]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            {draft.condition === "refurbished" && (
              <Section title="Refurbished details">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Condition grade" error={errors.grade}>
                    <select value={draft.grade} onChange={(e) => set("grade", e.target.value as ProductDraft["grade"])} className={adminSelect}>
                      {grades.map((grade) => (
                        <option key={grade} value={grade}>
                          {GRADE_LABELS[grade]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Battery health (%)" error={errors.batteryHealth}>
                    <input
                      inputMode="numeric"
                      value={draft.batteryHealth}
                      onChange={(e) => set("batteryHealth", e.target.value)}
                      aria-invalid={Boolean(errors.batteryHealth)}
                      placeholder="e.g. 92"
                      className={adminInput}
                    />
                  </Field>
                </div>
              </Section>
            )}

            <Section title="Price and stock">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Price (€, VAT incl.)" error={errors.price}>
                  <input
                    inputMode="decimal"
                    value={draft.price}
                    onChange={(e) => set("price", e.target.value)}
                    aria-invalid={Boolean(errors.price)}
                    className={adminInput}
                  />
                </Field>
                <Field label="Previous price (€)" error={errors.compareAtPrice} hint="Optional. Shown crossed out.">
                  <input
                    inputMode="decimal"
                    value={draft.compareAtPrice}
                    onChange={(e) => set("compareAtPrice", e.target.value)}
                    aria-invalid={Boolean(errors.compareAtPrice)}
                    className={adminInput}
                  />
                </Field>
                <Field label="Stock in the shop" error={errors.stock} hint={`≤ ${lowStockThreshold} shows “Only X left”. At 0, see below.`}>
                  <input
                    inputMode="numeric"
                    value={draft.stock}
                    onChange={(e) => set("stock", e.target.value)}
                    aria-invalid={Boolean(errors.stock)}
                    className={adminInput}
                  />
                </Field>
                <Field label="Warranty (months)" error={errors.warrantyMonths}>
                  <input
                    inputMode="numeric"
                    value={draft.warrantyMonths}
                    onChange={(e) => set("warrantyMonths", e.target.value)}
                    aria-invalid={Boolean(errors.warrantyMonths)}
                    className={adminInput}
                  />
                </Field>
                <Field
                  label="When the shop’s stock runs out"
                  error={errors.supplierAvailability}
                  className="sm:col-span-2 lg:col-span-4"
                  hint="“Supplier, 24–48h”: customers can still order; their card is authorised and only charged once you confirm availability in Orders. “On request”: they send a request, nothing is paid online."
                >
                  <select
                    value={draft.supplierAvailability}
                    onChange={(e) => set("supplierAvailability", e.target.value as ProductDraft["supplierAvailability"])}
                    className={adminSelect}
                  >
                    {supplierAvailabilities.map((value) => (
                      <option key={value} value={value}>
                        {SUPPLIER_AVAILABILITY[value]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            <Section title="Badges and highlights">
              <div className="grid gap-5 lg:grid-cols-2">
                <Fieldset legend="Badges">
                  {manualBadges.map((badge) => (
                    <label key={badge} className="flex min-h-9 items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={draft.badges.includes(badge)}
                        onChange={() => set("badges", toggle(draft.badges, badge))}
                        className={adminCheckbox}
                      />
                      {en.badges[badge]}
                    </label>
                  ))}
                  <p className="text-[0.8125rem] text-fg-subtle">
                    “Last one available” and “Only X left” are added automatically from the stock.
                    {inGreatDeals && " This phone is in Great Deals: set its deal badge in Great Deals."}
                  </p>
                </Fieldset>
                <Fieldset legend="Good for (most relevant first)" error={errors.goodFor}>
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
                          {en.goodFor[tag]}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[0.8125rem] text-fg-subtle">Tick in order of importance. Used by the shopping advisor too.</p>
                </Fieldset>
              </div>
            </Section>

            <Section title="Photos">
              <div className="grid gap-3">
                {draft.photos.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {draft.photos.map((photo, index) => (
                      <li key={photo} className="grid gap-1.5">
                        <span className="relative block aspect-[3/4] overflow-hidden rounded-xl border border-line bg-surface-2">
                          <Image src={photo} alt={`Photo ${index + 1}`} fill sizes="10rem" className="object-contain p-1" />
                          {index === 0 && (
                            <span className="absolute left-1.5 top-1.5 rounded-md bg-fg px-1.5 py-0.5 text-[0.75rem] font-bold text-ink">Main</span>
                          )}
                        </span>
                        <span className="flex justify-center gap-1">
                          <button
                            type="button"
                            className={iconButton}
                            disabled={index === 0}
                            onClick={() => set("photos", [photo, ...draft.photos.filter((p) => p !== photo)])}
                            aria-label={`Make photo ${index + 1} the main photo`}
                            title="Make main photo"
                          >
                            <Star aria-hidden="true" className="size-4" />
                          </button>
                          <button
                            type="button"
                            className={iconButton}
                            onClick={() => set("photos", draft.photos.filter((p) => p !== photo))}
                            aria-label={`Remove photo ${index + 1}`}
                            title="Remove photo"
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-fg-muted">No photo yet: the shop shows the neutral illustration.</p>
                )}
                <label
                  className={cn(
                    adminButton("secondary", "w-fit cursor-pointer has-focus-visible:outline-3 has-focus-visible:outline-accent-strong"),
                    (uploading || draft.photos.length >= MAX_PHOTOS) && "pointer-events-none opacity-50",
                  )}
                >
                  {uploading ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : <ImagePlus aria-hidden="true" className="size-5" />}
                  {uploading ? "Uploading…" : "Add photos"}
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
                  JPEG, PNG, WebP or AVIF, 5 MB max, up to {MAX_PHOTOS}. A plain light background looks best. The first photo is the main one.
                </p>
              </div>
            </Section>
          </div>

          <aside className="grid content-start gap-4 xl:sticky xl:top-0">
            <PreviewFrame title="Live preview · Great Deals card" locale={locale} onLocaleChange={setLocale}>
              <div className="mx-auto max-w-[22rem]">
                <DealCard product={card} labels={{ view: t("Product.view"), previousPrice: t("Product.previousPrice") }} />
              </div>
            </PreviewFrame>
            {draft.condition === "refurbished" && (
              <PreviewFrame title="Live preview · Refurbished picks card" locale={locale} onLocaleChange={setLocale}>
                <div className="mx-auto max-w-[22rem]">
                  <RefurbCard product={card} />
                </div>
              </PreviewFrame>
            )}
            {!isNew && orderCount > 0 && (
              <Banner>
                In {orderCount} order{orderCount > 1 ? "s" : ""}. Orders keep their own copy of the name and price, so editing is safe.
              </Banner>
            )}
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-ink px-4 py-3 sm:px-6">
          <div>
            {!isNew &&
              (confirmDelete ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">Delete this product for good?</span>
                  <button type="button" className={adminButton("dangerSolid")} onClick={remove} disabled={pending}>
                    Yes, delete
                  </button>
                  <button type="button" className={adminButton("ghost")} onClick={() => setConfirmDelete(false)}>
                    Keep it
                  </button>
                </span>
              ) : (
                <button type="button" className={adminButton("danger")} onClick={() => setConfirmDelete(true)} disabled={pending}>
                  <Trash2 aria-hidden="true" className="size-4" />
                  Delete
                </button>
              ))}
          </div>
          <div className="flex gap-2">
            <button type="button" className={adminButton("secondary")} onClick={requestClose} disabled={pending}>
              Cancel
            </button>
            <button type="submit" className={adminButton("primary", "min-w-32")} disabled={pending || uploading}>
              {pending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {isNew ? "Add product" : "Save changes"}
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
