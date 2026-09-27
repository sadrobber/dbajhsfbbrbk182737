import { getTranslations } from "next-intl/server";
import { PackageCard } from "@/components/product/package-card";
import { PhoneVisual } from "@/components/product/phone-visual";
import { ConfigIcon } from "@/components/ui/config-icon";
import { SectionHeading } from "@/components/ui/section-heading";
import { container } from "@/components/ui/styles";
import { getTranslator } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";
import type { PackageDefinition } from "@/lib/data/schema";
import { translateDynamic } from "@/lib/i18n-dynamic";
import { buildPackageCardView } from "@/lib/package-view";
import { PackagesStage } from "./packages-stage";

/** Static version of the exploded view: the phone with its accessories around it. */
function PackagesStill() {
  const bubbles: { icon: "case" | "screen" | "plug" | "cable"; className: string }[] = [
    { icon: "case", className: "left-[14%] top-[14%]" },
    { icon: "screen", className: "left-[20%] bottom-[16%]" },
    { icon: "plug", className: "right-[14%] top-[18%]" },
    { icon: "cable", className: "right-[20%] bottom-[14%]" },
  ];
  return (
    <div aria-hidden="true" className="relative mx-auto h-[19rem] w-full max-w-3xl sm:h-[24rem]">
      <div className="absolute inset-x-[20%] inset-y-[10%] rounded-full bg-[radial-gradient(closest-side,rgba(15,20,35,0.08),transparent)] blur-2xl" />
      <PhoneVisual
        view="front"
        color="black"
        className="absolute left-1/2 top-[4%] h-[88%] -translate-x-1/2 drop-shadow-[0_30px_30px_rgba(15,20,35,0.25)]"
      />
      {bubbles.map(({ icon, className }) => (
        <span
          key={icon}
          className={`absolute grid size-16 place-items-center rounded-2xl border border-line bg-ink text-accent-text shadow-diffusion sm:size-20 ${className}`}
        >
          <ConfigIcon name={icon} className="size-8 sm:size-9" />
        </span>
      ))}
    </div>
  );
}

/** "More than just a phone": the two service packages, contents as icons. */
export async function PackagesSection({ packages, locale }: { packages: PackageDefinition[]; locale: Locale }) {
  if (packages.length === 0) return null;
  const t = await getTranslations("Packages");
  const translator = getTranslator(locale);

  return (
    <section aria-labelledby="packages-title" className={`${container} reveal py-16 sm:py-24`}>
      <SectionHeading id="packages-title" title={t("title")} subtitle={t("subtitle")} />
      <PackagesStage
        labels={{
          protection: translateDynamic(t, `${packages[0]?.id}.name`),
          ready: translateDynamic(t, `${(packages[1] ?? packages[0])?.id}.name`),
        }}
        fallback={<PackagesStill />}
      />
      <ul className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        {packages.map((pkg, index) => (
          <li key={pkg.id}>
            <PackageCard pkg={buildPackageCardView(pkg, translator, locale)} highlighted={index === 0} />
          </li>
        ))}
      </ul>
    </section>
  );
}
