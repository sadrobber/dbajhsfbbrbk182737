import { ArrowRight, Gamepad2, Info, Laptop, ShoppingBag, Smartphone, Ticket, Trophy, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { container } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { GaugeSettings, PrizeKey } from "@/lib/data/schema";
import { formatPercent } from "@/lib/format";
import { translateDynamic } from "@/lib/i18n-dynamic";
import { GaugeMeter } from "./gauge-meter";

const PRIZE_ICONS: Record<PrizeKey, LucideIcon> = {
  smartphone: Smartphone,
  computer: Laptop,
  console: Gamepad2,
};

const STEPS: { key: "buy" | "ticket" | "win"; icon: LucideIcon }[] = [
  { key: "buy", icon: ShoppingBag },
  { key: "ticket", icon: Ticket },
  { key: "win", icon: Trophy },
];

/** The Gauge: progress (from site.config.ts), three steps, prizes, and the official rules. */
export async function GaugeSection({ gauge, locale }: { gauge: GaugeSettings; locale: Locale }) {
  const t = await getTranslations("Gauge");
  const percentSuffix = formatPercent(locale, 0).replace("0", "");

  return (
    <section aria-labelledby="gauge-title" className={`${container} reveal py-14 sm:py-20`}>
      <div className="relative overflow-hidden rounded-[2.5rem] border border-accent/25 bg-ink px-5 py-10 shadow-card sm:px-10 sm:py-14 lg:px-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_20%_40%,rgba(0,102,255,0.10),transparent_70%)]"
        />
        <div className="relative grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div className="lg:order-2">
            <h2
              id="gauge-title"
              className="text-balance font-display text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[3.25rem]"
            >
              {t("title")}
            </h2>
            <p className="mt-3 max-w-xl text-lg text-fg-muted sm:text-xl">{t("subtitle")}</p>
          </div>

          <div className="lg:order-1 lg:row-span-2">
            <GaugeMeter
              percent={gauge.percent}
              percentSuffix={percentSuffix}
              caption={t("filled")}
              label={t("meterLabel", { percent: formatPercent(locale, gauge.percent) })}
            />
          </div>

          <div className="flex flex-col gap-8 lg:order-3">
            <div>
              <h3 className="text-[0.9375rem] font-semibold uppercase tracking-[0.12em] text-fg-subtle">{t("howItWorks")}</h3>
              <ol className="mt-3 grid gap-3 sm:grid-cols-3">
                {STEPS.map(({ key, icon: Icon }, index) => (
                  <li key={key} className="relative flex items-center gap-3 rounded-2xl bg-surface-2 p-4 sm:flex-col sm:items-start">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-white">
                      <Icon aria-hidden="true" className="size-6" />
                    </span>
                    <span className="text-[1.0625rem] font-bold leading-tight">
                      <span className="text-accent-text">{index + 1}. </span>
                      {t(`steps.${key}`)}
                    </span>
                    {index < STEPS.length - 1 && (
                      <ArrowRight
                        aria-hidden="true"
                        className="absolute -right-3.5 top-1/2 z-10 hidden size-7 -translate-y-1/2 rounded-full bg-ink p-1 text-accent-text sm:block"
                      />
                    )}
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="text-[0.9375rem] font-semibold uppercase tracking-[0.12em] text-fg-subtle">{t("prizesTitle")}</h3>
              <ul className="mt-3 grid grid-cols-3 gap-3">
                {gauge.prizes.map((prize) => {
                  const Icon = PRIZE_ICONS[prize];
                  return (
                    <li key={prize} className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface-2/70 p-4 text-center">
                      <Icon aria-hidden="true" className="size-8 text-accent-text" />
                      <span className="text-[0.9375rem] font-semibold leading-tight sm:text-[1rem]">
                        {translateDynamic(t, `prizes.${prize}`)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <Link
              href={gauge.rulesPath}
              className="inline-flex min-h-11 w-fit items-center gap-2 text-[0.9375rem] text-fg-muted underline underline-offset-4 hover:text-fg"
            >
              <Info aria-hidden="true" className="size-4" />
              {t("rules")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
