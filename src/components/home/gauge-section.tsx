import {
  DeviceMobileIcon,
  GameControllerIcon,
  InfoIcon,
  LaptopIcon,
  ShoppingBagIcon,
  TicketIcon,
  TrophyIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";
import { container } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { GaugeSettings, PrizeKey } from "@/lib/data/schema";
import { formatPercent } from "@/lib/format";
import { translateDynamic } from "@/lib/i18n-dynamic";
import { GaugeMeter } from "./gauge-meter";

const PRIZE_ICONS: Record<PrizeKey, Icon> = {
  smartphone: DeviceMobileIcon,
  computer: LaptopIcon,
  console: GameControllerIcon,
};

const STEPS: { key: "buy" | "ticket" | "win"; icon: Icon }[] = [
  { key: "buy", icon: ShoppingBagIcon },
  { key: "ticket", icon: TicketIcon },
  { key: "win", icon: TrophyIcon },
];

/** The Gauge: its progress (set in the admin), three steps, the prizes and the official rules. */
export async function GaugeSection({ gauge, locale }: { gauge: GaugeSettings; locale: Locale }) {
  const t = await getTranslations("Gauge");
  const percentSuffix = formatPercent(locale, 0).replace("0", "");

  return (
    <section aria-labelledby="gauge-title" className={`${container} reveal py-16 sm:py-24`}>
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <div className="order-2 overflow-hidden lg:order-1">
          <GaugeMeter
            percent={gauge.percent}
            percentSuffix={percentSuffix}
            caption={t("filled")}
            label={t("meterLabel", { percent: formatPercent(locale, gauge.percent) })}
          />
        </div>

        <div className="order-1 lg:order-2">
          <h2 id="gauge-title" className="max-w-[16ch] text-balance font-display text-3xl font-bold leading-none tracking-tighter md:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-fg-muted md:text-lg">{t("subtitle")}</p>

          <h3 className="mt-10 text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-fg-subtle">{t("howItWorks")}</h3>
          <ol className="mt-3 divide-y divide-line border-y border-line">
            {STEPS.map(({ key, icon: StepIcon }, index) => (
              <li key={key} className="stagger-item flex items-center gap-4 py-4" style={{ "--index": index } as CSSProperties}>
                <span className="w-6 font-display text-lg font-bold tabular-nums text-accent-text">{String(index + 1).padStart(2, "0")}</span>
                <StepIcon aria-hidden="true" className="size-6 shrink-0 text-fg-muted" />
                <span className="text-[1.0625rem] font-semibold">{t(`steps.${key}`)}</span>
              </li>
            ))}
          </ol>

          <h3 className="mt-10 text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-fg-subtle">{t("prizesTitle")}</h3>
          <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-4">
            {gauge.prizes.map((prize) => {
              const PrizeIcon = PRIZE_ICONS[prize];
              return (
                <li key={prize} className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-text">
                    <PrizeIcon aria-hidden="true" className="size-6" />
                  </span>
                  <span className="font-semibold leading-tight">{translateDynamic(t, `prizes.${prize}`)}</span>
                </li>
              );
            })}
          </ul>

          <Link
            href={gauge.rulesPath}
            className="mt-8 inline-flex min-h-11 w-fit items-center gap-2 text-[0.9375rem] text-fg-muted underline underline-offset-4 hover:text-fg"
          >
            <InfoIcon aria-hidden="true" className="size-4" />
            {t("rules")}
          </Link>
        </div>
      </div>
    </section>
  );
}
