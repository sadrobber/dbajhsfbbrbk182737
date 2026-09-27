import { MapPinIcon } from "@phosphor-icons/react/dist/ssr";

/**
 * "Data stream": the towns served, scrolling endlessly (pure CSS, paused on
 * hover). With reduced motion the second copy is dropped and the list wraps.
 */
export function TownsStream({ towns }: { towns: string[] }) {
  const chips = (hidden: boolean) =>
    towns.map((town) => (
      <li
        key={`${town}-${hidden}`}
        aria-hidden={hidden || undefined}
        className={
          hidden
            ? "inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-ink px-4 py-2.5 font-semibold motion-reduce:hidden"
            : "inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-ink px-4 py-2.5 font-semibold"
        }
      >
        <MapPinIcon aria-hidden="true" className="size-5 text-accent-text" />
        {town}
      </li>
    ));

  return (
    <div className="relative flex h-full flex-col justify-between gap-8">
      <div className="[mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] motion-reduce:[mask-image:none]">
        <ul className="flex w-max gap-3 motion-safe:animate-marquee hover:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:flex-wrap">
          {chips(false)}
          {chips(true)}
        </ul>
      </div>
      <svg aria-hidden="true" viewBox="0 0 400 90" preserveAspectRatio="none" className="h-20 w-full">
        <defs>
          <linearGradient id="bento-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1b67da" stopOpacity="0.16" />
            <stop offset="1" stopColor="#1b67da" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 40 C 70 20, 120 70, 190 45 S 320 10, 400 35 L 400 90 L 0 90 Z" fill="url(#bento-sea)" />
        <path d="M0 58 C 80 38, 130 85, 200 62 S 330 28, 400 52" fill="none" stroke="#1b67da" strokeOpacity="0.2" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
