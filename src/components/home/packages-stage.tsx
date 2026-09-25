"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PackagesThree } from "@/components/three/lazy-scenes";
import { scrollProgress } from "@/components/three/support";
import { cn } from "@/lib/cn";

/**
 * Scroll-driven stage above the package cards: accessories float out around the
 * phone (Max Protection), then settle and the phone powers on (Ready-to-Use).
 * The legend shows which package the animation is illustrating.
 */
export function PackagesStage({
  fallback,
  labels,
}: {
  fallback: ReactNode;
  labels: { protection: string; ready: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const [phase, setPhase] = useState<"protection" | "ready">("protection");

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      progress.current = scrollProgress(rect.top, rect.height, window.innerHeight);
      setPhase(progress.current < 0.55 ? "protection" : "ready");
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="mb-8 sm:mb-10">
      <PackagesThree progress={progress} fallback={fallback} className="mx-auto w-full max-w-4xl" />
      <ul className="mt-3 flex flex-wrap justify-center gap-2">
        {(["protection", "ready"] as const).map((key) => (
          <li
            key={key}
            className={cn(
              "rounded-full px-4 py-1.5 text-[0.9375rem] font-semibold transition-colors duration-500",
              phase === key ? "bg-accent text-white" : "bg-surface-2 text-fg-muted",
            )}
          >
            {labels[key]}
          </li>
        ))}
      </ul>
    </div>
  );
}
