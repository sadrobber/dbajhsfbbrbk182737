import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import type { CSSProperties, ReactNode } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { container } from "@/components/ui/styles";
import { BRAND_NAME } from "@/config/site.config";
import { Link } from "@/i18n/navigation";
import type { ServiceArea } from "@/lib/data/schema";
import { cn } from "@/lib/cn";
import { translateDynamic } from "@/lib/i18n-dynamic";
import { paths } from "@/lib/paths";
import { AdvisorCommand } from "./bento/advisor-command";
import { CompareFocus, type CompareFocusRow } from "./bento/compare-focus";
import { PickupStatus } from "./bento/pickup-status";
import { ServicesList } from "./bento/services-list";
import { TownsStream } from "./bento/towns-stream";

/** A real comparison to show in the compare tile. */
export type CompareShowcase = { mine: string; want: string; href: string; rows: CompareFocusRow[] };

/** White card on the canvas, its title and line underneath (not inside). */
function BentoTile({
  index,
  title,
  text,
  href,
  footer,
  className,
  children,
}: {
  index: number;
  title: string;
  text: string;
  /** Makes the whole tile a link. */
  href?: string;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={cn("stagger-item group relative flex flex-col gap-5", className)}
      style={{ "--index": index } as CSSProperties}
    >
      <div
        className={cn(
          "relative min-h-[19rem] flex-1 overflow-hidden rounded-[2.5rem] border border-line bg-ink p-7 shadow-diffusion sm:p-9",
          href && "transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 group-hover:shadow-[0_28px_50px_-22px_rgb(15_20_35/0.18)]",
        )}
      >
        {children}
      </div>
      <div className="px-2">
        <h3 className="font-display text-xl font-semibold tracking-tight">
          {href ? (
            <Link href={href} className="inline-flex items-center gap-2 after:absolute after:inset-0 after:rounded-[2.5rem] after:content-['']">
              {title}
              <ArrowRightIcon aria-hidden="true" className="size-4 transition group-hover:translate-x-1" />
            </Link>
          ) : (
            title
          )}
        </h3>
        <p className="mt-1.5 max-w-[48ch] leading-relaxed text-fg-muted">{text}</p>
        {footer}
      </div>
    </article>
  );
}

/** What the shop does besides selling phones, as a Bento grid of small live scenes. */
export async function ServicesBento({ area, compare }: { area: ServiceArea; compare: CompareShowcase | null }) {
  const [t, local, advisor, order] = await Promise.all([
    getTranslations("Services"),
    getTranslations("Local"),
    getTranslations("Advisor"),
    getTranslations("Order"),
  ]);
  const examples = (["daughter", "samsung", "senior", "photo"] as const).map((key) => advisor(`examples.${key}`));
  const slots = (["right_choice", "smart_deal", "premium_option"] as const).map((key) => advisor(`slots.${key}`));
  const steps = [order("stage.paid.title"), order("stage.preparing.title"), order("stage.ready.title")];
  const towns = area.towns.map((town) => translateDynamic(local, `towns.${town}`));
  const services = area.services.map((key) => ({
    key,
    title: translateDynamic(local, `services.${key}.title`),
    text: translateDynamic(local, `services.${key}.text`),
  }));

  return (
    <section aria-labelledby="services-title" className="reveal bg-canvas py-16 sm:py-24">
      <div className={container}>
        <SectionHeading id="services-title" title={t("title")} subtitle={t("subtitle")} />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
          <BentoTile index={0} title={t("advisor.title")} text={t("advisor.text")} className="md:col-span-2 lg:col-span-1">
            <AdvisorCommand
              examples={examples}
              slots={slots}
              labels={{ cta: t("advisor.cta"), thinking: t("advisor.thinking"), inputLabel: t("advisor.inputLabel") }}
            />
          </BentoTile>
          {compare && (
            <BentoTile index={1} title={t("compare.title")} text={t("compare.text")} href={compare.href}>
              <CompareFocus
                names={{ mine: compare.mine, want: compare.want }}
                rows={compare.rows}
                labels={{ toolbar: t("compare.toolbar"), better: t("compare.better") }}
              />
            </BentoTile>
          )}
          <BentoTile index={2} title={t("pickup.title")} text={t("pickup.text")}>
            <PickupStatus steps={steps} notice={{ title: t("pickup.notice"), detail: t("pickup.detail", { brand: BRAND_NAME }) }} />
          </BentoTile>
        </div>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
          <BentoTile
            index={3}
            title={local("title")}
            text={local("subtitle")}
            footer={
              <Link
                href={paths.store}
                className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-accent-text underline-offset-4 hover:underline"
              >
                {local("cta")}
                <ArrowRightIcon aria-hidden="true" className="size-4" />
              </Link>
            }
          >
            <TownsStream towns={towns} />
          </BentoTile>
          <BentoTile index={4} title={local("servicesLabel")} text={t("services.text")}>
            <ServicesList services={services} />
          </BentoTile>
        </div>
      </div>
    </section>
  );
}
