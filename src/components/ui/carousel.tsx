import { Children, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Swipeable row on phones and tablets (CSS scroll snapping, no JavaScript),
 * regular grid on large screens.
 */
export function Carousel({
  label,
  children,
  columns = 3,
}: {
  label: string;
  children: ReactNode;
  columns?: 3 | 4;
}) {
  return (
    <ul
      aria-label={label}
      className={cn(
        "no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-6 pt-2 sm:-mx-6 sm:scroll-px-6 sm:px-6",
        "lg:mx-0 lg:grid lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0",
        columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4",
      )}
    >
      {Children.map(children, (child) => (
        <li className="w-[82%] max-w-[22rem] shrink-0 snap-start sm:w-[46%] lg:w-auto lg:max-w-none">{child}</li>
      ))}
    </ul>
  );
}
