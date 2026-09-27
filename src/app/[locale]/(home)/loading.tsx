import { getTranslations } from "next-intl/server";
import { container } from "@/components/ui/styles";

const block = "rounded-2xl bg-[linear-gradient(90deg,var(--color-surface-2),var(--color-surface-1),var(--color-surface-2))] bg-[length:200%_100%] motion-safe:animate-shimmer";

/** Homepage skeleton: the hero's shape and a row of cards, while the catalogue loads. */
export default async function HomeLoading() {
  const t = await getTranslations("Common");
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className={`${container} grid items-center gap-10 pb-16 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:pb-24 lg:pt-20`}>
        <div className="grid gap-5">
          <div className={`${block} h-9 w-64 rounded-full`} />
          <div className={`${block} h-24 w-full max-w-xl md:h-36`} />
          <div className={`${block} h-14 w-full max-w-lg`} />
          <div className="flex gap-3">
            <div className={`${block} h-16 w-52 rounded-full`} />
            <div className={`${block} h-16 w-52 rounded-full`} />
          </div>
        </div>
        <div className={`${block} mx-auto h-[21rem] w-full max-w-[26rem] rounded-[2.5rem] sm:h-[27rem] lg:h-[34rem]`} />
      </div>
      <div aria-hidden="true" className={`${container} flex gap-5 overflow-hidden pb-16`}>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className={`${block} h-[26rem] w-[82%] max-w-[23rem] shrink-0 rounded-[2rem] sm:w-[46%] lg:w-[22rem]`} />
        ))}
      </div>
    </div>
  );
}
