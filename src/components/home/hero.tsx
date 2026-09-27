import { CalendarCheckIcon, MapPinIcon, RecycleIcon, StackIcon } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { PhoneVisual } from "@/components/product/phone-visual";
import { HeroThree } from "@/components/three/lazy-scenes";
import { container, eyebrow } from "@/components/ui/styles";
import { HeroActions } from "./hero-actions";

/** Figures from the live catalogue, already formatted. */
export type HeroFacts = { phones: number; refurbishedFrom: string | null; warrantyMonths: number | null };

/** Static illustration: shown first, and kept for reduced motion, no WebGL or low-end devices. */
function HeroVisual() {
  return (
    <div aria-hidden="true" className="relative mx-auto h-[21rem] w-full max-w-[26rem] sm:h-[27rem] lg:h-[34rem] lg:max-w-[30rem]">
      <div className="absolute inset-x-[8%] bottom-[4%] h-[18%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(15,20,35,0.14),transparent)]" />
      <PhoneVisual
        color="silver"
        visual="trio"
        className="absolute left-[2%] top-[16%] h-[70%] -rotate-[14deg] motion-safe:animate-float-slow"
      />
      <PhoneVisual
        color="blue"
        visual="column"
        className="absolute right-[2%] top-[14%] h-[70%] rotate-[12deg] motion-safe:animate-float-slow motion-safe:[animation-delay:-4.5s]"
      />
      <PhoneVisual
        view="front"
        color="black"
        className="absolute left-1/2 top-[2%] h-[94%] -translate-x-1/2 drop-shadow-[0_36px_40px_rgba(15,20,35,0.24)] motion-safe:animate-float"
      />
    </div>
  );
}

/** Split hero: the promise and the two ways in on the left, the phones on the right. */
export async function Hero({ facts }: { facts: HeroFacts }) {
  const t = await getTranslations("Hero");
  const figures = [
    { icon: StackIcon, text: t("facts.phones", { count: facts.phones }) },
    facts.refurbishedFrom ? { icon: RecycleIcon, text: t("facts.refurbishedFrom", { price: facts.refurbishedFrom }) } : null,
    facts.warrantyMonths ? { icon: CalendarCheckIcon, text: t("facts.warranty", { months: facts.warrantyMonths }) } : null,
  ].filter((figure) => figure !== null);

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-[linear-gradient(180deg,var(--color-canvas),var(--color-ink)_70%)]">
      <div className={`${container} grid grid-cols-[minmax(0,1fr)] items-center gap-10 pb-16 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-6 lg:pb-24 lg:pt-20`}>
        <div className="max-w-2xl">
          <p className={eyebrow}>
            <MapPinIcon aria-hidden="true" className="size-4 text-accent-text" />
            {t("eyebrow")}
          </p>
          <h1 id="hero-title" className="mt-6 max-w-[15ch] text-balance font-display text-4xl font-bold leading-none tracking-tighter md:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-fg-muted md:text-lg">{t("subtitle")}</p>
          <HeroActions />

          <ul aria-label={t("facts.label")} className="mt-10 grid gap-4 border-t border-line pt-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-line">
            {figures.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 sm:px-5 sm:first:pl-0">
                <Icon aria-hidden="true" className="size-6 shrink-0 text-accent-text" />
                <span className="text-[0.9375rem] font-semibold leading-snug tabular-nums">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <HeroThree className="mx-auto w-full max-w-[32rem] lg:translate-x-6" fallback={<HeroVisual />} />
      </div>
    </section>
  );
}
