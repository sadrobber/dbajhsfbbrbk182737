import { ArrowLeftRight, ArrowRight, Check, Pencil, Recycle, Store } from "lucide-react";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { OpenAdvisorButton } from "@/components/advisor/advisor-buttons";
import { PhoneVisual } from "@/components/product/phone-visual";
import { container } from "@/components/ui/styles";
import { getTranslator, type Translator } from "@/i18n/messages";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { modelTitle, parseComparePair, visualForModel } from "@/lib/compare/pairs";
import { compareSpecs, type Side } from "@/lib/compare/specs";
import { pickTradeIn } from "@/lib/data/pricing";
import { getComparison, getModel } from "@/lib/data/queries";
import type { PhoneModel } from "@/lib/data/schema";
import { cn } from "@/lib/cn";
import { formatPercent, formatPrice } from "@/lib/format";
import { localizedPath, paths } from "@/lib/paths";
import { storageLabel } from "@/lib/product-view";

export async function generateMetadata({ params }: PageProps<"/[locale]/compare/[pair]">): Promise<Metadata> {
  const { locale, pair } = await params;
  const ids = parseComparePair(pair);
  if (!hasLocale(routing.locales, locale) || !ids) return {};
  const [mine, want] = await Promise.all([getModel(ids.mine), getModel(ids.want)]);
  if (!mine || !want) return {};
  const t = getTranslator(locale);
  const names = { mine: modelTitle(mine), want: modelTitle(want) };
  return { title: t("Compare.pageTitle", names), description: t("Compare.pageDescription", names) };
}

function released(model: PhoneModel, t: Translator, locale: Locale): string | null {
  if (!model.release.month) return model.release.year ? t("Compare.released", { date: String(model.release.year) }) : null;
  const [year, month] = model.release.month.split("-").map(Number);
  const date = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  return t("Compare.released", { date });
}

const card = "rounded-[2rem] border border-line bg-surface-1 p-5 sm:p-6";

/** Two phones side by side: prices (trade-in for the first, shop prices for the second) and every spec. */
export default async function ComparePage({ params, searchParams }: PageProps<"/[locale]/compare/[pair]">) {
  const { locale, pair } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const ids = parseComparePair(pair);
  if (!ids) notFound();
  if (ids.mine === ids.want) redirect(`${localizedPath(locale, paths.compare())}?mine=${encodeURIComponent(ids.mine)}`);
  const [data, query] = await Promise.all([getComparison(ids.mine, ids.want), searchParams]);
  if (!data) notFound();

  const t = getTranslator(locale);
  const price = (amount: number) => formatPrice(locale, amount);
  const { mine, want, tradeIn } = data;
  const names = { mine: modelTitle(mine.model), want: modelTitle(want.model) };
  const sections = compareSpecs(mine.model, want.model, t, locale);

  const storage = Number(typeof query.storage === "string" ? query.storage : NaN);
  const estimate = pickTradeIn(tradeIn.estimates, Number.isFinite(storage) ? storage : null);
  const cheapest = [want.offers.new, want.offers.refurbished].filter((item) => item !== null).sort((a, b) => a.price - b.price)[0] ?? null;
  const afterTradeIn = estimate && cheapest ? Math.max(0, cheapest.price - estimate.storeCreditAmount) : null;
  const sideName: Record<Side, string> = { mine: t("Compare.mine"), want: t("Compare.want") };

  const phoneHeader = (side: Side, model: PhoneModel) => (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="rounded-full bg-accent-soft px-3 py-1 text-[0.8125rem] font-bold text-accent-text">{sideName[side]}</p>
      <PhoneVisual color={side === "mine" ? "grey" : "blue"} visual={visualForModel(model)} className="h-40 w-auto sm:h-52" />
      <div>
        <p className="font-semibold text-fg-muted">{model.brand}</p>
        <h2 className="font-display text-xl font-extrabold leading-tight sm:text-2xl">{model.name}</h2>
        {released(model, t, locale) && <p className="mt-1 text-[0.9375rem] text-fg-muted">{released(model, t, locale)}</p>}
      </div>
    </div>
  );

  return (
    <section className={`${container} py-10 sm:py-14`}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link
          href={`${paths.compare()}?mine=${encodeURIComponent(mine.model.id)}&want=${encodeURIComponent(want.model.id)}`}
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-accent-text underline-offset-4 hover:underline"
        >
          <Pencil aria-hidden="true" className="size-4" />
          {t("Compare.change")}
        </Link>
        <Link
          href={paths.compare(want.model.id, mine.model.id)}
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-accent-text underline-offset-4 hover:underline"
        >
          <ArrowLeftRight aria-hidden="true" className="size-4" />
          {t("Compare.swap")}
        </Link>
      </div>

      <h1 className="mt-4 text-balance font-display text-[2rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
        {t("Compare.pageTitle", names)}
      </h1>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-8">
        {phoneHeader("mine", mine.model)}
        {phoneHeader("want", want.model)}
      </div>

      {/* --- Prices -------------------------------------------------------------------- */}
      <h2 className="mt-12 font-display text-2xl font-bold">{t("Compare.prices.title")}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className={card}>
          <p className="flex items-center gap-2 font-semibold text-fg-muted">
            <Recycle aria-hidden="true" className="size-5 text-accent-text" />
            {t("Compare.prices.tradeInTitle")} · {names.mine}
          </p>
          {estimate ? (
            <>
              <p className="mt-2 font-display text-3xl font-extrabold">{t("Compare.prices.upTo", { amount: price(estimate.amount) })}</p>
              <p className="mt-1 font-semibold text-success">
                {t("Compare.prices.asCredit", { amount: price(estimate.storeCreditAmount), percent: formatPercent(locale, tradeIn.storeCreditBonusPercent) })}
              </p>
              {tradeIn.estimates.length > 1 && (
                <div className="mt-4">
                  <p className="text-[0.9375rem] font-semibold">{t("Compare.prices.storage")}</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {tradeIn.estimates.map((option) => {
                      const current = option.storageGb === estimate.storageGb;
                      return (
                        <li key={option.storageGb}>
                          <Link
                            href={`${paths.compare(mine.model.id, want.model.id)}?storage=${option.storageGb}`}
                            scroll={false}
                            aria-current={current ? "true" : undefined}
                            className={cn(
                              "inline-flex min-h-11 items-center rounded-full border px-4 font-semibold transition",
                              current ? "border-accent bg-accent text-white" : "border-line-strong bg-ink hover:border-accent-text",
                            )}
                          >
                            {storageLabel(t, option.storageGb)}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              <p className="mt-4 text-[0.875rem] leading-snug text-fg-subtle">{t("Compare.prices.tradeInNote")}</p>
            </>
          ) : (
            <p className="mt-2 text-fg-muted">{t("Compare.prices.notBought")}</p>
          )}
        </div>

        <div className={card}>
          <p className="flex items-center gap-2 font-semibold text-fg-muted">
            <Store aria-hidden="true" className="size-5 text-accent-text" />
            {t("Compare.prices.shopTitle")} · {names.want}
          </p>
          {cheapest ? (
            <>
              <ul className="mt-2 grid gap-1">
                {want.offers.new && (
                  <li className="font-display text-2xl font-extrabold">{t("Compare.prices.newFrom", { price: price(want.offers.new.price) })}</li>
                )}
                {want.offers.refurbished && (
                  <li className="font-display text-2xl font-extrabold">
                    {t("Compare.prices.refurbishedFrom", { price: price(want.offers.refurbished.price) })}
                  </li>
                )}
              </ul>
              <Link
                href={paths.product(cheapest.id)}
                className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-accent-text underline-offset-4 hover:underline"
              >
                {t("Compare.prices.see")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </>
          ) : (
            <div className="mt-2 grid justify-items-start gap-4">
              <p className="text-fg-muted">{t("Compare.prices.notSold")}</p>
              <OpenAdvisorButton label={t("Compare.prices.askAdvisor")} size="md" />
            </div>
          )}
        </div>
      </div>

      {estimate && cheapest && afterTradeIn !== null && (
        <div className="mt-4 rounded-[2rem] bg-accent px-5 py-5 text-white sm:px-6">
          <p className="font-semibold text-white/80">{t("Compare.prices.upgradeTitle")}</p>
          <p className="mt-1 text-lg font-semibold sm:text-xl">
            {afterTradeIn > 0
              ? t("Compare.prices.upgradeText", { ...names, price: price(afterTradeIn) })
              : t("Compare.prices.upgradeFree", names)}
          </p>
        </div>
      )}

      {/* --- Specifications ---------------------------------------------------------- */}
      <div className="mt-12 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">{t("Compare.specs.title")}</h2>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.9375rem] text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <Check aria-hidden="true" className="size-4 text-success" />
            {t("Compare.specs.legendBetter")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-sm bg-accent-soft ring-1 ring-accent/30" />
            {t("Compare.specs.legendDiffers")}
          </span>
        </p>
      </div>

      {/* Which column is which, kept in view while scrolling the table. */}
      <div aria-hidden="true" className="sticky top-[4.5rem] z-10 mt-4 grid grid-cols-2 gap-3 border-b border-line bg-ink/95 py-3 backdrop-blur sm:grid-cols-[14rem_1fr_1fr]">
        <span className="hidden sm:block" />
        <span className="font-display font-bold">{mine.model.name}</span>
        <span className="font-display font-bold">{want.model.name}</span>
      </div>

      {sections.map((section) => (
        <section key={section.key} aria-labelledby={`specs-${section.key}`} className="mt-6">
          <h3 id={`specs-${section.key}`} className="font-display text-lg font-bold">
            {section.title}
          </h3>
          <dl className="mt-2 divide-y divide-line rounded-3xl border border-line">
            {section.rows.map((row) => (
              <div
                key={row.key}
                className={cn("grid grid-cols-2 gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-[14rem_1fr_1fr]", row.differs && "bg-accent-soft/60")}
              >
                <dt className="col-span-2 text-[0.9375rem] font-semibold text-fg-muted sm:col-span-1">{row.label}</dt>
                {(["mine", "want"] as const).map((side) => (
                  <dd key={side} className={cn("min-w-0 break-words", row.better === side && "font-semibold text-success")}>
                    <span className="sr-only">{sideName[side]}: </span>
                    {row[side] ?? <span className="text-fg-subtle">—</span>}
                    {row.better === side && (
                      <>
                        <Check aria-hidden="true" className="ml-1.5 inline size-4 align-[-0.125em]" />
                        <span className="sr-only"> ({t("Compare.specs.better")})</span>
                      </>
                    )}
                  </dd>
                ))}
              </div>
            ))}
          </dl>
        </section>
      ))}
    </section>
  );
}
