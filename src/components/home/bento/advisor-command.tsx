"use client";

import { ArrowRightIcon, SparkleIcon } from "@phosphor-icons/react/dist/ssr";
import { animate, type AnimationPlaybackControlsWithThen, motion, type MotionValue, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { memo, useEffect, useRef } from "react";
import { useAdvisor } from "@/components/advisor/advisor-provider";

type Labels = { cta: string; thinking: string; inputLabel: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * "Command input": the advisor's example questions typed one after the other,
 * a short search shimmer, then the three kinds of suggestion it gives.
 * Everything runs on motion values, so the loop never re-renders React.
 */
export const AdvisorCommand = memo(function AdvisorCommand({ examples, slots, labels }: { examples: string[]; slots: string[]; labels: Labels }) {
  const { open, send } = useAdvisor();
  const scope = useRef<HTMLDivElement>(null);
  const inView = useInView(scope, { amount: 0.4 });
  const reduce = useReducedMotion();

  const text = useMotionValue(examples[0] ?? "");
  const count = useMotionValue(text.get().length);
  const typed = useTransform(() => text.get().slice(0, Math.round(count.get())));
  const thinking = useMotionValue(0);
  const results = useMotionValue(1);

  useEffect(() => {
    if (!inView || reduce || examples.length === 0) return;
    let cancelled = false;
    let running: AnimationPlaybackControlsWithThen | null = null;
    const play = async (animation: AnimationPlaybackControlsWithThen) => {
      running = animation;
      await animation;
    };

    (async () => {
      let index = Math.max(0, examples.indexOf(text.get()));
      while (!cancelled) {
        const example = examples[index % examples.length];
        text.set(example);
        count.set(0);
        results.set(0);
        await play(animate(count, example.length, { duration: example.length * 0.045, ease: "linear" }));
        if (cancelled) return;
        await play(animate(thinking, 1, { duration: 0.25 }));
        await sleep(1100);
        if (cancelled) return;
        await play(animate(thinking, 0, { duration: 0.2 }));
        await play(animate(results, 1, { type: "spring", stiffness: 100, damping: 20 }));
        await sleep(2400);
        index += 1;
      }
    })();

    return () => {
      cancelled = true;
      running?.stop();
    };
  }, [inView, reduce, examples, text, count, thinking, results]);

  const shimmerHeight = useTransform(thinking, [0, 1], ["0rem", "2.5rem"]);

  return (
    <div ref={scope} className="flex h-full flex-col gap-5">
      <div className="flex min-h-14 items-center gap-3 rounded-full border border-line bg-canvas px-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.9)]">
        <SparkleIcon aria-hidden="true" className="size-5 shrink-0 text-accent-text" />
        <p className="min-w-0 flex-1 truncate text-[0.9375rem] sm:text-base">
          <span className="sr-only">{labels.inputLabel}: </span>
          <motion.span>{typed}</motion.span>
          <span aria-hidden="true" className="ml-0.5 inline-block h-5 w-0.5 translate-y-1 bg-accent motion-safe:animate-blink" />
        </p>
      </div>

      <motion.div aria-hidden="true" style={{ opacity: thinking, height: shimmerHeight }} className="overflow-hidden">
        <p className="flex items-center gap-3 text-[0.875rem] font-medium text-fg-muted">
          <span className="h-2 w-24 rounded-full bg-[linear-gradient(90deg,var(--color-surface-2),var(--color-accent-soft),var(--color-surface-2))] bg-[length:200%_100%] motion-safe:animate-shimmer" />
          {labels.thinking}
        </p>
      </motion.div>

      <ul aria-hidden="true" className="grid gap-2">
        {slots.map((slot, index) => (
          <SlotRow key={slot} label={slot} index={index} progress={results} />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          open();
          send(text.get());
        }}
        className="mt-auto inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-fg px-5 font-semibold text-ink transition hover:-translate-y-0.5 active:scale-[0.98]"
      >
        {labels.cta}
        <ArrowRightIcon aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
});

/** One suggestion as the advisor shows it (phone, kind, details), arriving a beat after the previous one. */
function SlotRow({ label, index, progress }: { label: string; index: number; progress: MotionValue<number> }) {
  const start = index * 0.2;
  // A faint preview while the question is typed, the real row once "found".
  const opacity = useTransform(progress, [start, start + 0.5], [0.35, 1]);
  const y = useTransform(progress, [start, start + 0.5], [6, 0]);
  const first = index === 0;
  return (
    <motion.li style={{ opacity, y }} className="flex items-center gap-3 rounded-2xl border border-line bg-ink p-2.5 pr-4">
      <span className="h-11 w-8 shrink-0 rounded-lg bg-[linear-gradient(160deg,var(--color-surface-3),var(--color-surface-1))]" />
      <span className="grid min-w-0 flex-1 gap-1.5">
        <span
          className={
            first
              ? "w-fit rounded-full bg-accent px-2.5 py-0.5 text-[0.8125rem] font-semibold text-white"
              : "w-fit rounded-full bg-surface-2 px-2.5 py-0.5 text-[0.8125rem] font-semibold text-fg-muted"
          }
        >
          {label}
        </span>
        <span className="h-2 w-2/3 rounded-full bg-surface-2" />
      </span>
      <span className="h-3 w-12 shrink-0 rounded-full bg-surface-3" />
    </motion.li>
  );
}
