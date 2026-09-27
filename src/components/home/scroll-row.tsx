"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Children, type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const control =
  "grid size-12 place-items-center rounded-full border border-line-strong/60 bg-ink text-fg transition hover:border-fg active:scale-[0.96] disabled:pointer-events-none disabled:opacity-35";

/**
 * A horizontal row of cards on every screen size: swipe on touch, the two
 * buttons (or the keyboard, following focus) elsewhere. Cards arrive one after
 * the other when the section is revealed.
 */
export function ScrollRow({ label, labels, children }: { label: string; labels: { previous: string; next: string }; children: ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      setEdges({ start: list.scrollLeft <= 4, end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 4 });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    list.addEventListener("scroll", schedule, { passive: true });
    const resize = new ResizeObserver(schedule);
    resize.observe(list);
    return () => {
      cancelAnimationFrame(frame);
      list.removeEventListener("scroll", schedule);
      resize.disconnect();
    };
  }, []);

  const move = (direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollBy({ left: direction * list.clientWidth * 0.85, behavior: smooth ? "smooth" : "auto" });
  };

  return (
    <div>
      <ul
        ref={listRef}
        aria-label={label}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 pb-6 pt-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0"
      >
        {Children.map(children, (child, index) => (
          <li className="stagger-item w-[82%] max-w-[23rem] shrink-0 snap-start sm:w-[46%] lg:w-[22rem]" style={{ "--index": index } as CSSProperties}>
            {child}
          </li>
        ))}
      </ul>
      <div className={cn("mt-1 flex gap-2", edges.start && edges.end && "invisible")}>
        <button type="button" onClick={() => move(-1)} disabled={edges.start} className={control}>
          <CaretLeftIcon aria-hidden="true" className="size-5" />
          <span className="sr-only">{labels.previous}</span>
        </button>
        <button type="button" onClick={() => move(1)} disabled={edges.end} className={control}>
          <CaretRightIcon aria-hidden="true" className="size-5" />
          <span className="sr-only">{labels.next}</span>
        </button>
      </div>
    </div>
  );
}
