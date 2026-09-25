import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PhoneVisual } from "@/components/product/phone-visual";
import { HeroThree } from "@/components/three/lazy-scenes";
import { container, eyebrow } from "@/components/ui/styles";
import { HeroActions } from "./hero-actions";

/** Static illustration: shown first, and kept for reduced motion, no WebGL or low-end devices. */
function HeroVisual() {
  return (
    <div aria-hidden="true" className="relative mx-auto h-[21rem] w-full max-w-[26rem] sm:h-[27rem] lg:h-[36rem] lg:max-w-[32rem]">
      <div className="absolute inset-[6%] rounded-full bg-[radial-gradient(closest-side,rgba(0,102,255,0.22),rgba(0,102,255,0.06)_60%,transparent)] blur-2xl" />
      <PhoneVisual
        color="purple"
        visual="trio"
        className="absolute left-[2%] top-[16%] h-[70%] -rotate-[14deg] opacity-90 motion-safe:animate-float-slow"
      />
      <PhoneVisual
        color="silver"
        visual="column"
        className="absolute right-[2%] top-[14%] h-[70%] rotate-[12deg] opacity-90 motion-safe:animate-float-slow motion-safe:[animation-delay:-4.5s]"
      />
      <PhoneVisual
        view="front"
        color="black"
        className="absolute left-1/2 top-[2%] h-[94%] -translate-x-1/2 drop-shadow-[0_36px_40px_rgba(15,20,35,0.28)] motion-safe:animate-float"
      />
    </div>
  );
}

export async function Hero() {
  const t = await getTranslations("Hero");
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] bg-[radial-gradient(60%_50%_at_70%_20%,rgba(0,102,255,0.10),transparent_70%),radial-gradient(40%_40%_at_10%_10%,rgba(11,12,16,0.04),transparent_70%)]"
      />
      <div className={`${container} grid items-center gap-8 pb-12 pt-8 sm:pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-4 lg:pb-20 lg:pt-16`}>
        <div>
          <p className={eyebrow}>
            <MapPin aria-hidden="true" className="size-4 text-accent-text" />
            {t("eyebrow")}
          </p>
          <h1
            id="hero-title"
            className="mt-5 text-balance font-display text-[2.625rem] font-extrabold leading-[1.04] tracking-[-0.035em] sm:text-6xl lg:text-[4.75rem]"
          >
            {t("title")}
          </h1>
          <HeroActions />
        </div>
        <HeroThree className="mx-auto w-full max-w-[34rem]" fallback={<HeroVisual />} />
      </div>
    </section>
  );
}
