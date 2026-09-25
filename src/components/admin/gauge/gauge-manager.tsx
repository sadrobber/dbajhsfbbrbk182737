"use client";

import { Gamepad2, Laptop, type LucideIcon, Smartphone } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { saveGaugeAction } from "@/app/admin/(panel)/gauge/actions";
import { fieldErrorsOf } from "@/components/admin/form-errors";
import { PreviewFrame, type PreviewMessages, usePreviewTranslator } from "@/components/admin/preview";
import { SaveBar, useUnsavedChangesWarning } from "@/components/admin/save-bar";
import { adminButton, adminCard, adminCheckbox, adminInput } from "@/components/admin/styles";
import { Field, Fieldset, PageHeader } from "@/components/admin/ui";
import { GaugeRing } from "@/components/home/gauge-meter";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { type GaugeSettings, gaugeSchema, type PrizeKey, prizeKeys } from "@/lib/data/schema";
import { formatPercent } from "@/lib/format";

const PRIZE_ICONS: Record<PrizeKey, LucideIcon> = { smartphone: Smartphone, computer: Laptop, console: Gamepad2 };

type GaugeDraft = Omit<GaugeSettings, "percent" | "targetTickets"> & { percent: string; targetTickets: string };

const toDraft = (g: GaugeSettings): GaugeDraft => ({ ...g, percent: String(g.percent), targetTickets: String(g.targetTickets) });
const fromDraft = (d: GaugeDraft): GaugeSettings => ({
  ...d,
  percent: d.percent.trim() === "" ? Number.NaN : Number(d.percent),
  targetTickets: d.targetTickets.trim() === "" ? Number.NaN : Number(d.targetTickets),
});

export function GaugeManager({
  gauge,
  ticketsIssued,
  messages,
}: {
  gauge: GaugeSettings;
  ticketsIssued: number;
  messages: PreviewMessages;
}) {
  const [baseline, setBaseline] = useState(() => toDraft(gauge));
  const [draft, setDraft] = useState(baseline);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [locale, setLocale] = useState<Locale>("fr");
  const t = usePreviewTranslator(messages, locale);

  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useUnsavedChangesWarning(dirty);
  const result = gaugeSchema.safeParse(fromDraft(draft));
  const errors = submitted && !result.success ? fieldErrorsOf(result.error) : {};

  const target = Number(draft.targetTickets);
  const fromTickets = Number.isFinite(target) && target > 0 ? Math.min(100, Math.round((ticketsIssued / target) * 100)) : null;
  const previewPercent = Math.max(0, Math.min(100, Number(draft.percent) || 0));

  const set = (change: Partial<GaugeDraft>) => {
    setDraft((d) => ({ ...d, ...change }));
    setSaved(false);
    setError(null);
  };

  function save() {
    setSubmitted(true);
    if (!result.success) {
      setError("Some fields need attention.");
      return;
    }
    startTransition(async () => {
      const response = await saveGaugeAction(result.data);
      if (response.ok) {
        const next = toDraft(response.data);
        setBaseline(next);
        setDraft(next);
        setSaved(true);
        setSubmitted(false);
      } else {
        setError(response.error);
      }
    });
  }

  return (
    <>
      <PageHeader
        title="The Gauge"
        description="Each purchase gives the customer a ticket; when the Gauge reaches 100% the prizes are drawn. The homepage shows the percentage below."
      />

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_26rem]">
        <div className={cn(adminCard, "grid gap-6 p-4 sm:p-6")}>
          <label className="flex items-center justify-between gap-4 rounded-xl bg-surface-1 p-4">
            <span>
              <span className="block font-semibold">Show the Gauge on the homepage</span>
              <span className="text-[0.875rem] text-fg-muted">Turn off between two draws.</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={draft.enabled}
              onChange={(e) => set({ enabled: e.target.checked })}
              className="h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full bg-line-strong transition before:block before:size-6 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition checked:bg-accent checked:before:translate-x-[1.35rem] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
            />
          </label>

          <div className="grid gap-1.5">
            <label htmlFor="gauge-percent" className="text-[0.9375rem] font-semibold">
              Current fill (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={100}
                value={previewPercent}
                onChange={(e) => set({ percent: e.target.value })}
                aria-label="Current fill (%), slider"
                className="h-2 flex-1 cursor-pointer accent-[#0066ff]"
              />
              <input
                id="gauge-percent"
                inputMode="numeric"
                value={draft.percent}
                onChange={(e) => set({ percent: e.target.value })}
                aria-invalid={Boolean(errors.percent)}
                aria-describedby="gauge-percent-help"
                className={cn(adminInput, "w-24 text-right")}
              />
            </div>
            <span id="gauge-percent-help" className={cn("text-[0.8125rem]", errors.percent ? "font-semibold text-danger" : "text-fg-subtle")}>
              {errors.percent ?? "What customers see on the homepage."}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Target (tickets for the draw)" error={errors.targetTickets}>
              <input
                inputMode="numeric"
                value={draft.targetTickets}
                onChange={(e) => set({ targetTickets: e.target.value })}
                aria-invalid={Boolean(errors.targetTickets)}
                className={adminInput}
              />
            </Field>
            <div className="grid content-start gap-1.5">
              <span className="text-[0.9375rem] font-semibold">Tickets issued so far</span>
              <p className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-display text-2xl font-extrabold tabular-nums">{ticketsIssued}</span>
                {fromTickets !== null && (
                  <span className="text-fg-muted">
                    = {fromTickets}% of the target
                    {String(fromTickets) !== draft.percent && (
                      <button type="button" className="ml-2 font-semibold text-accent-text underline" onClick={() => set({ percent: String(fromTickets) })}>
                        Use {fromTickets}%
                      </button>
                    )}
                  </span>
                )}
              </p>
              <Link href="/admin/tickets" className="w-fit text-[0.875rem] text-accent-text underline">
                See who has tickets
              </Link>
            </div>
          </div>

          <Fieldset legend="Prizes" error={errors.prizes}>
            <div className="grid gap-2 sm:grid-cols-3">
              {prizeKeys.map((prize) => {
                const Icon = PRIZE_ICONS[prize];
                const checked = draft.prizes.includes(prize);
                return (
                  <label
                    key={prize}
                    className={cn(
                      "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 font-semibold",
                      checked ? "border-accent bg-accent-soft" : "border-line-strong/60",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        set({ prizes: checked ? draft.prizes.filter((p) => p !== prize) : prizeKeys.filter((p) => p === prize || draft.prizes.includes(p)) })
                      }
                      className={adminCheckbox}
                    />
                    <Icon aria-hidden="true" className="size-5 text-accent-text" />
                    {messages.en.Gauge.prizes[prize]}
                  </label>
                );
              })}
            </div>
          </Fieldset>

          <p className="text-[0.875rem] text-fg-subtle">
            The official rules page is <code>{draft.rulesPath}</code>. Its text lives in <code>messages/*.json</code> until the rules are final.
          </p>
          <a href="/fr#gauge-title" target="_blank" rel="noreferrer" className={adminButton("secondary", "w-fit")}>
            Open the homepage
          </a>
        </div>

        <PreviewFrame title="Live preview · homepage" locale={locale} onLocaleChange={setLocale} className="xl:sticky xl:top-4">
          {draft.enabled ? (
            <div className="grid gap-4">
              <div className="relative mx-auto aspect-square w-full max-w-[16rem]">
                <GaugeRing value={previewPercent} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="font-display text-[3.5rem] font-extrabold leading-none tracking-[-0.04em]">
                    {formatPercent(locale, previewPercent)}
                  </p>
                  <p className="mt-1 font-semibold text-fg-muted">{t("Gauge.filled")}</p>
                </div>
              </div>
              <p className="text-center text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-fg-subtle">{t("Gauge.prizesTitle")}</p>
              <ul className="grid grid-cols-3 gap-2">
                {draft.prizes.map((prize) => {
                  const Icon = PRIZE_ICONS[prize];
                  return (
                    <li key={prize} className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface-2/70 p-3 text-center text-[0.875rem] font-semibold">
                      <Icon aria-hidden="true" className="size-6 text-accent-text" />
                      {t(`Gauge.prizes.${prize}`)}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="py-10 text-center text-fg-muted">The Gauge section is hidden on the homepage.</p>
          )}
        </PreviewFrame>
      </div>

      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onDiscard={() => {
          setDraft(baseline);
          setSubmitted(false);
          setError(null);
        }}
        onSave={save}
      />
    </>
  );
}
