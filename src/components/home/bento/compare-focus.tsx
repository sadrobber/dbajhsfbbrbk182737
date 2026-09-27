"use client";

import { ArrowsLeftRightIcon, CheckIcon, RecycleIcon, ScalesIcon } from "@phosphor-icons/react/dist/ssr";
import { stagger, useAnimate, useInView, useReducedMotion } from "motion/react";
import { memo, useEffect } from "react";

export type CompareFocusRow = { label: string; mine: string; want: string };

/**
 * "Focus mode": two real phones side by side; the better values light up one
 * row after the other, then a small toolbar floats in. One motion timeline,
 * no React re-render. Without motion, everything is simply shown.
 */
export const CompareFocus = memo(function CompareFocus({
  names,
  rows,
  labels,
}: {
  names: { mine: string; want: string };
  rows: CompareFocusRow[];
  labels: { toolbar: string; better: string };
}) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const inView = useInView(scope, { amount: 0.5 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView || reduce) return;
    const spring = { type: "spring", stiffness: 100, damping: 20 } as const;
    const controls = animate(
      [
        ["[data-mark]", { opacity: 0, scale: 0.6 }, { duration: 0 }],
        ["[data-row]", { backgroundColor: "rgba(27,103,218,0)" }, { duration: 0, at: 0 }],
        ["[data-toolbar]", { opacity: 0, y: 16, scale: 0.96 }, { duration: 0, at: 0 }],
        ["[data-row]", { backgroundColor: "rgba(27,103,218,0.07)" }, { duration: 0.45, delay: stagger(0.35), at: 0.4 }],
        ["[data-mark]", { opacity: 1, scale: 1 }, { ...spring, delay: stagger(0.35), at: 0.4 }],
        ["[data-toolbar]", { opacity: 1, y: 0, scale: 1 }, { ...spring, at: "+0.1" }],
        ["[data-toolbar]", { opacity: 0, y: 16, scale: 0.96 }, { duration: 0.35, at: "+2.6" }],
        ["[data-row]", { backgroundColor: "rgba(27,103,218,0)" }, { duration: 0.35, at: "<" }],
        ["[data-mark]", { opacity: 0, scale: 0.6 }, { duration: 0.3, at: "<" }],
      ],
      { repeat: Infinity, repeatDelay: 0.6 },
    );
    return () => controls.stop();
  }, [inView, reduce, animate]);

  return (
    <div ref={scope} className="relative flex h-full flex-col" aria-hidden="true">
      <div className="grid grid-cols-[1fr_1fr] gap-3 border-b border-line pb-3 pl-3 text-[0.875rem] font-semibold">
        <span className="truncate text-fg-muted">{names.mine}</span>
        <span className="truncate">{names.want}</span>
      </div>
      <dl className="mt-2 grid gap-1">
        {rows.map((row) => (
          <div key={row.label} data-row="" className="rounded-2xl px-3 py-2" style={{ backgroundColor: "rgba(27,103,218,0.07)" }}>
            <dt className="text-[0.75rem] font-medium uppercase tracking-[0.08em] text-fg-subtle">{row.label}</dt>
            <dd className="mt-0.5 grid grid-cols-[1fr_1fr] gap-3 text-[0.9375rem] tabular-nums">
              <span className="text-fg-muted">{row.mine}</span>
              <span className="flex items-center gap-1.5 font-semibold text-success">
                <span>{row.want}</span>
                <CheckIcon data-mark="" weight="bold" className="size-4 shrink-0" />
                <span className="sr-only">{labels.better}</span>
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <div
        data-toolbar=""
        className="mx-auto mt-auto flex translate-y-0 items-center gap-1 rounded-full border border-white/10 bg-fg p-1.5 pl-4 text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_18px_30px_-16px_rgb(15_20_35/0.6)]"
      >
        <ScalesIcon className="size-4 opacity-70" />
        <RecycleIcon className="ml-1.5 size-4 opacity-70" />
        <span className="ml-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[0.8125rem] font-semibold text-white">
          <ArrowsLeftRightIcon className="size-4" />
          {labels.toolbar}
        </span>
      </div>
    </div>
  );
});
