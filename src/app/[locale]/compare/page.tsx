import { ArrowRight, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { buttonClass, container } from "@/components/ui/styles";
import { getTranslator } from "@/i18n/messages";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { FEATURED_COMPARISONS, modelsByBrand, modelTitle } from "@/lib/compare/pairs";
import { getModels } from "@/lib/data/queries";
import { localizedPath, paths } from "@/lib/paths";

export async function generateMetadata({ params }: PageProps<"/[locale]/compare">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = getTranslator(locale);
  return { title: t("Compare.title"), description: t("Compare.subtitle") };
}

const select =
  "min-h-13 w-full rounded-2xl border border-line-strong bg-ink px-4 text-[1.0625rem] text-fg transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

/** Pick two phones; the form sends them here and they open side by side. */
export default async function ComparePickerPage({ params, searchParams }: PageProps<"/[locale]/compare">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [models, query] = await Promise.all([getModels(), searchParams]);
  const known = new Set(models.map((m) => m.id));
  const pick = (value: unknown) => (typeof value === "string" && known.has(value) ? value : "");
  const mine = pick(query.mine);
  const want = pick(query.want);
  if (mine && want && mine !== want) redirect(localizedPath(locale, paths.compare(mine, want)));

  const t = getTranslator(locale);
  const groups = modelsByBrand(models);
  const byId = new Map(models.map((m) => [m.id, m]));
  const options = groups.map(({ brand, models: list }) => (
    <optgroup key={brand} label={brand}>
      {list.map((model) => (
        <option key={model.id} value={model.id}>
          {model.name}
          {model.release.year ? ` (${model.release.year})` : ""}
        </option>
      ))}
    </optgroup>
  ));

  return (
    <section className={`${container} py-10 sm:py-16`}>
      <div className="max-w-3xl">
        <h1 className="text-balance font-display text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
          {t("Compare.title")}
        </h1>
        <p className="mt-3 text-lg text-fg-muted">{t("Compare.subtitle")}</p>
      </div>

      <form method="get" action={localizedPath(locale, paths.compare())} className="mt-8 grid max-w-3xl gap-5 rounded-[2rem] border border-line bg-surface-1 p-5 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="font-semibold">{t("Compare.mine")}</span>
            <select name="mine" defaultValue={mine} required className={select}>
              <option value="" disabled>
                {t("Compare.choose")}
              </option>
              {options}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="font-semibold">{t("Compare.want")}</span>
            <select name="want" defaultValue={want} required className={select}>
              <option value="" disabled>
                {t("Compare.choose")}
              </option>
              {options}
            </select>
          </label>
        </div>
        {mine && mine === want && (
          <p role="alert" className="rounded-2xl bg-warning-soft px-4 py-3 text-warning">
            {t("Compare.samePhone")}
          </p>
        )}
        <div>
          <button type="submit" className={buttonClass("primary", "md")}>
            {t("Compare.submit")}
            <ArrowRight aria-hidden="true" className="size-5" />
          </button>
        </div>
      </form>

      <h2 className="mt-12 font-display text-2xl font-bold">{t("Compare.popular")}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURED_COMPARISONS.flatMap(([a, b]) => {
          const [first, second] = [byId.get(a), byId.get(b)];
          if (!first || !second) return [];
          return [
            <li key={`${a}-${b}`}>
              <Link
                href={paths.compare(a, b)}
                className="flex min-h-16 items-center gap-3 rounded-3xl border border-line bg-surface-1 px-5 py-3 font-semibold transition hover:border-accent/60 hover:bg-accent-soft"
              >
                <Smartphone aria-hidden="true" className="size-5 shrink-0 text-accent-text" />
                <span className="flex-1">{t("Compare.pageTitle", { mine: modelTitle(first), want: modelTitle(second) })}</span>
                <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-fg-subtle" />
              </Link>
            </li>,
          ];
        })}
      </ul>
    </section>
  );
}
