"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { savePackagesAction } from "@/app/admin/(panel)/packages/actions";
import { fieldErrorsOf } from "@/components/admin/form-errors";
import { useAdminI18n } from "@/components/admin/i18n";
import { LocalizedTextInput } from "@/components/admin/localized-text-input";
import { PreviewFrame, type PreviewMessages, usePreviewTranslator } from "@/components/admin/preview";
import { SaveBar, useUnsavedChangesWarning } from "@/components/admin/save-bar";
import { adminButton, adminCard, adminCheckbox, adminInput, adminSelect, iconButton } from "@/components/admin/styles";
import { Field, PageHeader } from "@/components/admin/ui";
import { PackageCard } from "@/components/product/package-card";
import { ConfigIcon } from "@/components/ui/config-icon";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { type IconKey, iconKeys, type PackageDefinition, type PackageItem, packageSchema } from "@/lib/data/schema";
import { buildPackageCardView } from "@/lib/package-view";

type PackageDraft = Omit<PackageDefinition, "price"> & { price: string };

const toDraft = (pkg: PackageDefinition): PackageDraft => ({ ...pkg, price: String(pkg.price) });
const fromDraft = (draft: PackageDraft): PackageDefinition => ({
  ...draft,
  price: draft.price.trim() === "" ? Number.NaN : Number(draft.price.replace(",", ".")),
});

export function PackagesManager({ packages, messages }: { packages: PackageDefinition[]; messages: PreviewMessages }) {
  const [baseline, setBaseline] = useState(() => packages.map(toDraft));
  const [drafts, setDrafts] = useState(baseline);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const { t, locale } = useAdminI18n();
  const [previewLocale, setPreviewLocale] = useState<Locale>("fr");
  const previewT = usePreviewTranslator(messages, previewLocale);

  const dirty = JSON.stringify(drafts) !== JSON.stringify(baseline);
  useUnsavedChangesWarning(dirty);
  const results = drafts.map((draft) => packageSchema.safeParse(fromDraft(draft)));

  const updatePackage = (id: string, change: (draft: PackageDraft) => PackageDraft) => {
    setDrafts((all) => all.map((d) => (d.id === id ? change(d) : d)));
    setSaved(false);
    setError(null);
  };
  const updateItem = (id: string, index: number, change: Partial<PackageItem>) =>
    updatePackage(id, (d) => ({ ...d, items: d.items.map((item, i) => (i === index ? { ...item, ...change } : item)) }));

  function save() {
    setSubmitted(true);
    if (results.some((result) => !result.success)) {
      setError(t("Common.fieldsNeedAttention"));
      return;
    }
    startTransition(async () => {
      const result = await savePackagesAction(drafts.map(fromDraft));
      if (result.ok) {
        const next = result.data.map(toDraft);
        setBaseline(next);
        setDrafts(next);
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
        title={t("Packages.title")}
        description={t("Packages.description")}
      />

      {drafts.map((draft, packageIndex) => {
        const result = results[packageIndex];
        const errors = submitted && !result.success ? fieldErrorsOf(result.error, t) : {};
        const name = messages[locale].Packages[draft.id as "max-protection"]?.name ?? draft.id;
        const preview = buildPackageCardView(result.success ? result.data : { ...fromDraft(draft), price: 0 }, previewT, previewLocale);

        return (
          <section key={draft.id} aria-labelledby={`pkg-${draft.id}`} className="grid items-start gap-5 xl:grid-cols-[1fr_26rem]">
            <div className={cn(adminCard, "grid gap-5 p-4 sm:p-5")}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 id={`pkg-${draft.id}`} className="font-display text-xl font-extrabold tracking-[-0.02em]">
                  {name}
                </h2>
                <Field label={t("Packages.price")} error={errors.price} className="w-40">
                  <input
                    inputMode="decimal"
                    value={draft.price}
                    onChange={(e) => updatePackage(draft.id, (d) => ({ ...d, price: e.target.value }))}
                    aria-invalid={Boolean(errors.price)}
                    className={adminInput}
                  />
                </Field>
              </div>

              <div>
                <h3 className="text-[0.9375rem] font-semibold">{t("Packages.included")}</h3>
                <p className="text-[0.8125rem] text-fg-subtle">{t("Packages.includedHint")}</p>
                <ol className="mt-3 grid gap-3">
                  {draft.items.map((item, index) => (
                    <li key={item.id} className="grid gap-3 rounded-xl border border-line p-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text">
                          <ConfigIcon name={item.icon} className="size-5" />
                        </span>
                        <label className="min-w-44 flex-1">
                          <span className="sr-only">{t("Packages.iconFor", { number: index + 1 })}</span>
                          <select
                            value={item.icon}
                            onChange={(e) => updateItem(draft.id, index, { icon: e.target.value as IconKey })}
                            className={adminSelect}
                          >
                            {iconKeys.map((icon) => (
                              <option key={icon} value={icon}>
                                {t("Packages.iconOption", { name: t(`Labels.icon.${icon}`) })}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex min-h-11 items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={item.todo}
                            onChange={(e) => updateItem(draft.id, index, { todo: e.target.checked })}
                            className={adminCheckbox}
                          />
                          {t("Packages.toConfirm")}
                        </label>
                        <div className="ml-auto flex">
                          <button
                            type="button"
                            className={iconButton}
                            disabled={index === 0}
                            aria-label={t("Packages.moveUp", { number: index + 1 })}
                            onClick={() =>
                              updatePackage(draft.id, (d) => {
                                const items = [...d.items];
                                [items[index - 1], items[index]] = [items[index], items[index - 1]];
                                return { ...d, items };
                              })
                            }
                          >
                            <ArrowUp aria-hidden="true" className="size-4" />
                          </button>
                          <button
                            type="button"
                            className={iconButton}
                            disabled={index === draft.items.length - 1}
                            aria-label={t("Packages.moveDown", { number: index + 1 })}
                            onClick={() =>
                              updatePackage(draft.id, (d) => {
                                const items = [...d.items];
                                [items[index + 1], items[index]] = [items[index], items[index + 1]];
                                return { ...d, items };
                              })
                            }
                          >
                            <ArrowDown aria-hidden="true" className="size-4" />
                          </button>
                          <button
                            type="button"
                            className={iconButton}
                            aria-label={t("Packages.remove", { number: index + 1 })}
                            onClick={() => updatePackage(draft.id, (d) => ({ ...d, items: d.items.filter((_, i) => i !== index) }))}
                          >
                            <X aria-hidden="true" className="size-4" />
                          </button>
                        </div>
                      </div>
                      <LocalizedTextInput
                        label={t("Packages.item", { number: index + 1 })}
                        maxLength={40}
                        value={item.label}
                        onChange={(label) => updateItem(draft.id, index, { label })}
                        error={errors[`items.${index}.label.fr`]}
                      />
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  className={adminButton("secondary", "mt-3")}
                  disabled={draft.items.length >= 8}
                  onClick={() =>
                    updatePackage(draft.id, (d) => ({
                      ...d,
                      items: [
                        ...d.items,
                        { id: `item-${Date.now().toString(36)}`, icon: "check", label: { fr: "", en: "", it: "" }, todo: true },
                      ],
                    }))
                  }
                >
                  <Plus aria-hidden="true" className="size-4" />
                  {t("Packages.addItem")}
                </button>
              </div>
            </div>

            <PreviewFrame title={t("Packages.preview")} locale={previewLocale} onLocaleChange={setPreviewLocale} className="xl:sticky xl:top-4">
              <PackageCard pkg={preview} highlighted={packageIndex === 0} />
            </PreviewFrame>
          </section>
        );
      })}

      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onDiscard={() => {
          setDrafts(baseline);
          setSubmitted(false);
          setError(null);
        }}
        onSave={save}
      />
    </>
  );
}
