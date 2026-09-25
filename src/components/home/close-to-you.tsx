import { ArrowLeftRight, ArrowRight, Headset, MapPin, Store, Wrench, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui/section-heading";
import { buttonClass, container } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import type { ServiceArea, ServiceKey } from "@/lib/data/schema";
import { translateDynamic } from "@/lib/i18n-dynamic";
import { paths } from "@/lib/paths";

const SERVICE_ICONS: Record<ServiceKey, LucideIcon> = {
  collection: Store,
  support: Headset,
  data_transfer: ArrowLeftRight,
  after_sales: Wrench,
};

/** "Close to you": the towns served and the in-person services. */
export async function CloseToYou({ area }: { area: ServiceArea }) {
  const t = await getTranslations("Local");
  return (
    <section aria-labelledby="local-title" className={`${container} reveal py-14 sm:py-20`}>
      <SectionHeading id="local-title" title={t("title")} subtitle={t("subtitle")} />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr] lg:gap-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-surface-1 p-6 sm:p-8">
          <svg aria-hidden="true" viewBox="0 0 400 300" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full opacity-60">
            <defs>
              <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0066ff" stopOpacity="0" />
                <stop offset="1" stopColor="#0066ff" stopOpacity="0.28" />
              </linearGradient>
            </defs>
            <path d="M0 210 C 70 190, 120 240, 190 215 S 320 180, 400 205 L 400 300 L 0 300 Z" fill="url(#sea)" />
            <path d="M0 235 C 80 215, 130 262, 200 240 S 330 205, 400 230" fill="none" stroke="#5aa9ff" strokeOpacity="0.25" strokeWidth="2" />
          </svg>
          <h3 className="relative text-[0.9375rem] font-semibold uppercase tracking-[0.12em] text-fg-subtle">{t("townsLabel")}</h3>
          <ul className="relative mt-4 flex flex-wrap gap-2.5">
            {area.towns.map((town) => (
              <li
                key={town}
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line bg-surface-2/90 px-4 text-[1.0625rem] font-semibold backdrop-blur"
              >
                <MapPin aria-hidden="true" className="size-5 text-accent-text" />
                {translateDynamic(t, `towns.${town}`)}
              </li>
            ))}
          </ul>
          <div className="relative mt-8">
            <Link href={paths.store} className={buttonClass("secondary", "md")}>
              {t("cta")}
              <ArrowRight aria-hidden="true" className="size-5" />
            </Link>
          </div>
        </div>

        <div>
          <h3 className="sr-only">{t("servicesLabel")}</h3>
          <ul className="grid h-full grid-cols-2 gap-3 sm:gap-4">
            {area.services.map((service) => {
              const Icon = SERVICE_ICONS[service];
              return (
                <li key={service} className="flex flex-col gap-3 rounded-[1.75rem] border border-line bg-surface-1 p-4 sm:p-6">
                  <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-text">
                    <Icon aria-hidden="true" className="size-6" />
                  </span>
                  <p className="font-display text-lg font-bold leading-tight sm:text-xl">
                    {translateDynamic(t, `services.${service}.title`)}
                  </p>
                  <p className="text-fg-muted">{translateDynamic(t, `services.${service}.text`)}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
