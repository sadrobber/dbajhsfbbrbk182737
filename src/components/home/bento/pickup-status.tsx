"use client";

import { BellIcon, CheckIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { memo, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const STEP_MS = 1700;
const NOTICE_MS = 3000;

/**
 * "Live status": an order moving through its real stages, with a breathing
 * dot on the current one; at "ready", a notification pops in with a small
 * overshoot, stays three seconds and leaves. Without motion: the ready state.
 */
export const PickupStatus = memo(function PickupStatus({ steps, notice }: { steps: string[]; notice: { title: string; detail: string } }) {
  const scope = useRef<HTMLDivElement>(null);
  const inView = useInView(scope, { amount: 0.5 });
  const reduce = useReducedMotion();
  const last = steps.length - 1;
  const [current, setCurrent] = useState(last);
  const [showNotice, setShowNotice] = useState(true);

  useEffect(() => {
    if (!inView || reduce) return;
    let step = 0;
    let timer = 0;
    const next = () => {
      setCurrent(step);
      setShowNotice(step === last);
      const wait = step === last ? NOTICE_MS + 400 : STEP_MS;
      step = step === last ? 0 : step + 1;
      timer = window.setTimeout(next, wait);
    };
    next();
    return () => window.clearTimeout(timer);
  }, [inView, reduce, last]);

  return (
    <div ref={scope} aria-hidden="true" className="relative flex h-full flex-col">
      <ol className="grid gap-3">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={step} className="flex items-center gap-3">
              <span
                className={cn(
                  "relative grid size-7 shrink-0 place-items-center rounded-full border transition-colors duration-500",
                  done && "border-success bg-success text-white",
                  active && "border-accent bg-accent-soft",
                  !done && !active && "border-line bg-ink",
                )}
              >
                {done && <CheckIcon weight="bold" className="size-3.5" />}
                {active && (
                  <motion.span
                    className="size-2.5 rounded-full bg-accent"
                    animate={reduce ? undefined : { scale: [1, 1.45, 1], opacity: [1, 0.55, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </span>
              <span className={cn("text-[0.9375rem] transition-colors duration-500", active ? "font-semibold text-fg" : "text-fg-muted")}>{step}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-auto min-h-[4.5rem] pt-4">
        <AnimatePresence>
          {showNotice && current === last && (
            <motion.div
              key="notice"
              initial={{ opacity: 0, y: 18, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96, transition: { duration: 0.25 } }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="flex items-center gap-3 rounded-2xl border border-white/60 bg-ink/90 p-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_18px_36px_-18px_rgb(15_20_35/0.35)] backdrop-blur"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-white">
                <BellIcon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.9375rem] font-semibold leading-tight">{notice.title}</span>
                <span className="block text-[0.8125rem] leading-snug text-fg-muted">{notice.detail}</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
