"use client";

import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { type DealInput, saveDealsAction } from "@/app/admin/(panel)/deals/actions";
import { fieldErrorsOf } from "@/components/admin/form-errors";
import { LocalizedTextInput } from "@/components/admin/localized-text-input";
import { PreviewFrame, type PreviewMessages, usePreviewTranslator } from "@/components/admin/preview";
import { GRADE_LABELS } from "@/components/admin/products/product-draft";
import { ProductThumb } from "@/components/admin/products/product-thumb";
import { stockTone } from "@/components/admin/stock";
import { SaveBar, useUnsavedChangesWarning } from "@/components/admin/save-bar";
import { adminButton, adminCard, adminInput, adminSelect, iconButton } from "@/components/admin/styles";
import { PageHeader, Pill } from "@/components/admin/ui";
import { DealCard } from "@/components/product/deal-card";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { enrichCatalog, selectGreatDeals } from "@/lib/data/catalog-logic";
import { type Brand, type Deal, dealSchema, type ModelRef, type Product, promoBadges, type PromoBadge } from "@/lib/data/schema";
import { buildProductCardView } from "@/lib/product-view";

const euro = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" });
const EMPTY_LABEL = { fr: "", en: "", it: "" };

const toInputs = (deals: Deal[]): DealInput[] =>
  deals.map(({ productId, promoBadge, promoLabel }) => ({ productId, promoBadge, promoLabel }));

export function DealsManager({
  deals,
  products,
  brands,
  models,
  maxItems,
  lowStockThreshold,
  messages,
}: {
  deals: Deal[];
  products: Product[];
  brands: Brand[];
  models: ModelRef[];
  maxItems: number;
  lowStockThreshold: number;
  messages: PreviewMessages;
}) {
  const [baseline, setBaseline] = useState(() => toInputs(deals));
  const [entries, setEntries] = useState(baseline);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [locale, setLocale] = useState<Locale>("fr");

  const dirty = JSON.stringify(entries) !== JSON.stringify(baseline);
  useUnsavedChangesWarning(dirty);

  const items = useMemo(() => enrichCatalog({ currency: "EUR", brands, models, products }), [brands, models, products]);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const badgeLabels = messages.en.Product.badges;

  const validation = dealSchema.array().safeParse(entries.map((entry, position) => ({ ...entry, id: "deal", position })));
  const errors = submitted && !validation.success ? fieldErrorsOf(validation.error) : {};

  // What the homepage will show: same selection rule as the shop (in stock, in order, capped).
  const shown = selectGreatDeals(items, {
    deals: entries.map((entry, position) => ({ ...entry, id: entry.productId, position })),
    maxItems,
  });
  const shownIds = new Set(shown.map((item) => item.id));

  const t = usePreviewTranslator(messages, locale);
  const cards = shown.map((item) => buildProductCardView(item, { t, locale, lowStockThreshold, promo: item.promo }));

  const update = (next: DealInput[]) => {
    setEntries(next);
    setSaved(false);
    setError(null);
  };
  const move = (index: number, by: -1 | 1) => {
    const next = [...entries];
    const [entry] = next.splice(index, 1);
    next.splice(index + by, 0, entry);
    update(next);
  };
  const setPromo = (index: number, promoBadge: PromoBadge | null) =>
    update(
      entries.map((e, i) =>
        i === index ? { ...e, promoBadge, promoLabel: promoBadge === "custom" ? (e.promoLabel ?? EMPTY_LABEL) : null } : e,
      ),
    );

  const candidates = useMemo(() => {
    const listed = new Set(entries.map((e) => e.productId));
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return items
      .filter((item) => !listed.has(item.id))
      .filter((item) => {
        const haystack = `${item.brandName} ${item.model} ${item.storageGb}gb ${item.condition} ${item.color}`.toLowerCase();
        return words.every((word) => haystack.includes(word));
      })
      .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.brandName.localeCompare(b.brandName));
  }, [entries, items, query]);

  function save() {
    setSubmitted(true);
    if (!validation.success) {
      setError("Type the text of each custom badge (French at least).");
      return;
    }
    startTransition(async () => {
      const result = await saveDealsAction(entries);
      if (result.ok) {
        const next = toInputs(result.data);
        setBaseline(next);
        setEntries(next);
        setSaved(true);
        setSubmitted(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <PageHeader
        title="Great Deals"
        description={`Choose the phones in the homepage's Great Deals, put them in order and add a promo badge. The first ${maxItems} in stock are shown; sold-out phones are skipped automatically.`}
      />

      <PreviewFrame title={`Live preview · homepage Great Deals (${cards.length} shown)`} locale={locale} onLocaleChange={setLocale}>
        {cards.length > 0 ? (
          <div className="flex gap-4 overflow-x-hidden">
            {cards.map((card) => (
              <div key={card.id} className="w-[17rem] shrink-0">
                <DealCard product={card} labels={{ view: t("Product.view"), previousPrice: t("Product.previousPrice") }} />
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-fg-muted">No phone in stock is selected: the section is hidden on the homepage.</p>
        )}
      </PreviewFrame>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_24rem]">
        <section aria-labelledby="deals-list-title" className={cn(adminCard, "p-4 sm:p-5")}>
          <h2 id="deals-list-title" className="font-display text-lg font-bold">
            On the homepage, in this order
          </h2>
          {entries.length === 0 && <p className="mt-3 text-fg-muted">No phone yet. Add some from the list.</p>}
          <ol className="mt-3 grid gap-3">
            {entries.map((entry, index) => {
              const item = byId.get(entry.productId);
              if (!item) return null;
              const stock = stockTone(item.stock, lowStockThreshold, item.supplierAvailability);
              const hiddenReason = shownIds.has(item.id) ? null : item.stock <= 0 ? "Hidden: none in the shop" : `Hidden: only ${maxItems} are shown`;
              return (
                <li key={entry.productId} className={cn("rounded-xl border border-line p-3", hiddenReason && "bg-surface-1")}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 font-bold tabular-nums">{index + 1}</span>
                    <ProductThumb product={item} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {item.brandName} {item.model}{" "}
                        <span className="font-normal text-fg-muted">
                          · {item.storageGb >= 1024 ? `${item.storageGb / 1024} TB` : `${item.storageGb} GB`}
                          {item.condition === "refurbished" && item.grade && ` · refurbished, ${GRADE_LABELS[item.grade]}`}
                        </span>
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.875rem]">
                        <span className="font-semibold tabular-nums">{euro.format(item.price)}</span>
                        <Pill tone={stock.tone}>{stock.label}</Pill>
                        {hiddenReason && <Pill tone="warning">{hiddenReason}</Pill>}
                      </p>
                    </div>
                    <label className="w-full sm:w-52">
                      <span className="sr-only">Promo badge for {item.model}</span>
                      <select
                        value={entry.promoBadge ?? ""}
                        onChange={(e) => setPromo(index, (e.target.value || null) as PromoBadge | null)}
                        className={adminSelect}
                      >
                        <option value="">No promo badge</option>
                        {promoBadges.map((badge) => (
                          <option key={badge} value={badge}>
                            {badge === "custom" ? "Custom text…" : badgeLabels[badge]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex">
                      <button type="button" className={iconButton} disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${item.model} up`}>
                        <ArrowUp aria-hidden="true" className="size-4" />
                      </button>
                      <button
                        type="button"
                        className={iconButton}
                        disabled={index === entries.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label={`Move ${item.model} down`}
                      >
                        <ArrowDown aria-hidden="true" className="size-4" />
                      </button>
                      <button
                        type="button"
                        className={iconButton}
                        onClick={() => update(entries.filter((_, i) => i !== index))}
                        aria-label={`Remove ${item.model} from Great Deals`}
                      >
                        <X aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  </div>
                  {entry.promoBadge === "custom" && (
                    <div className="mt-3">
                      <LocalizedTextInput
                        label="Badge text"
                        maxLength={24}
                        value={entry.promoLabel ?? EMPTY_LABEL}
                        onChange={(promoLabel) => update(entries.map((e, i) => (i === index ? { ...e, promoLabel } : e)))}
                        error={errors[`${index}.promoLabel.fr`] ?? errors[`${index}.promoLabel`]}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="deals-add-title" className={cn(adminCard, "p-4 sm:p-5 xl:sticky xl:top-4")}>
          <h2 id="deals-add-title" className="font-display text-lg font-bold">
            Add a phone
          </h2>
          <label className="relative mt-3 block">
            <span className="sr-only">Search phones to add</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-fg-subtle" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className={cn(adminInput, "pl-10")}
            />
          </label>
          <ul className="mt-3 grid max-h-[28rem] gap-1 overflow-y-auto">
            {candidates.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-1">
                <ProductThumb product={item} className="h-11 w-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {item.brandName} {item.model}
                  </p>
                  <p className="text-[0.8125rem] text-fg-subtle">
                    {euro.format(item.price)} · {item.condition === "new" || !item.grade ? "new" : `refurb, ${GRADE_LABELS[item.grade]}`}
                    {item.stock <= 0 && " · sold out"}
                  </p>
                </div>
                <button
                  type="button"
                  className={adminButton("secondary", "min-h-9 px-3")}
                  onClick={() => update([...entries, { productId: item.id, promoBadge: null, promoLabel: null }])}
                  aria-label={`Add ${item.brandName} ${item.model} (${item.id}) to Great Deals`}
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Add
                </button>
              </li>
            ))}
            {candidates.length === 0 && <li className="p-2 text-fg-muted">Nothing to add.</li>}
          </ul>
        </section>
      </div>

      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onDiscard={() => {
          update(baseline);
          setSubmitted(false);
        }}
        onSave={save}
      />
    </>
  );
}
