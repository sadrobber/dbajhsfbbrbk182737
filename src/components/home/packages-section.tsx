import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ConfigIcon } from "@/components/ui/config-icon";
import { SectionHeading } from "@/components/ui/section-heading";
import { buttonClass, container } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import type { PackageDefinition } from "@/lib/data/schema";
import { formatPrice } from "@/lib/format";
import { translateDynamic } from "@/lib/i18n-dynamic";
import { paths } from "@/lib/paths";

/** "More than just a phone": the two service packages, contents as icons. */
export async function PackagesSection({ packages, locale }: { packages: PackageDefinition[]; locale: Locale }) {
  if (packages.length === 0) return null;
  const t = await getTranslations("Packages");
  const common = await getTranslations("Common");

  return (
    <section aria-labelledby="packages-title" className={`${container} reveal py-14 sm:py-20`}>
      <SectionHeading id="packages-title" title={t("title")} subtitle={t("subtitle")} />
      <ul className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        {packages.map((pkg, index) => (
          <li key={pkg.id}>
            <article
              className={cn(
                "relative flex h-full flex-col overflow-hidden rounded-[2rem] border p-6 sm:p-8",
                index === 0
                  ? "border-accent/40 bg-[linear-gradient(160deg,rgba(0,102,255,0.22),rgba(13,13,18,0.9)_55%)]"
                  : "border-line bg-[linear-gradient(160deg,rgba(138,92,255,0.18),rgba(13,13,18,0.9)_55%)]",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-14 place-items-center rounded-2xl bg-accent text-white shadow-glow">
                  <ConfigIcon name={pkg.icon} className="size-7" />
                </span>
                <p className="font-display text-[2.5rem] font-extrabold leading-none tracking-[-0.03em]">
                  {formatPrice(locale, pkg.price)}
                </p>
              </div>
              <h3 className="mt-6 font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em]">
                {translateDynamic(t, `${pkg.id}.name`)}
              </h3>
              <p className="mt-2 text-lg text-fg-muted">{translateDynamic(t, `${pkg.id}.tagline`)}</p>

              <h4 className="mt-7 text-[0.9375rem] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                {t("includes")}
              </h4>
              <ul className="mt-3 grid grid-cols-2 gap-3">
                {pkg.items.map((item) => (
                  <li
                    key={item.key}
                    className={cn(
                      "relative flex flex-col items-center gap-2.5 rounded-2xl p-4 text-center",
                      item.todo ? "border border-dashed border-line-strong bg-surface-1/60" : "bg-surface-2",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-12 place-items-center rounded-full",
                        item.todo ? "bg-surface-3 text-fg-subtle" : "bg-accent-soft text-accent-text",
                      )}
                    >
                      <ConfigIcon name={item.icon} className="size-6" />
                    </span>
                    <span className="text-[1rem] font-semibold leading-tight">
                      {translateDynamic(t, `items.${item.key}`)}
                    </span>
                    {item.todo && (
                      <span
                        title={common("todoHint")}
                        className="absolute right-2 top-2 rounded-md border border-warning/60 px-1.5 py-0.5 text-[0.75rem] font-bold tracking-wide text-warning"
                      >
                        {common("todo")}
                        <span className="sr-only"> ({common("todoHint")})</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-7">
                <Link href={paths.package(pkg.id)} className={buttonClass("secondary", "md")}>
                  {t("learnMore")}
                  <ArrowRight aria-hidden="true" className="size-5" />
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
