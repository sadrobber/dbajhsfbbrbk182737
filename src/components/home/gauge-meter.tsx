"use client";

import { useEffect, useRef, useState } from "react";
import { GaugeThree } from "@/components/three/lazy-scenes";

const SIZE = 320;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2 - 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** The gauge is a 270° arc with the opening at the bottom. */
const ARC = CIRCUMFERENCE * 0.75;

/**
 * The Gauge ring. Server-rendered at its real value (works without JavaScript),
 * then replayed from 0 the first time it scrolls into view.
 */
export function GaugeMeter({
  percent,
  percentSuffix,
  caption,
  label,
}: {
  percent: number;
  /** "%" or " %" depending on the language. */
  percentSuffix: string;
  caption: string;
  label: string;
}) {
  const value = Math.max(0, Math.min(100, percent));
  const ref = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState(value);
  const [display, setDisplay] = useState(value);

  // Replay the fill once, when the gauge first comes into view.
  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (node.getBoundingClientRect().top < window.innerHeight) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 1800;
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(value * eased));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame((now) => {
          setTarget(value);
          tick(now);
        });
      },
      { threshold: 0.35 },
    );
    frame = requestAnimationFrame(() => {
      setTarget(0);
      setDisplay(0);
      observer.observe(node);
    });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <div ref={ref} role="img" aria-label={label} className="relative mx-auto aspect-square w-full max-w-[20rem] sm:max-w-[22rem] lg:max-w-[27rem]">
      <div className="absolute inset-0">
        <GaugeThree
          value={target}
          className="size-full"
          fallback={<GaugeRing value={target} />}
        />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-[4.5rem] font-extrabold leading-none tracking-[-0.04em] sm:text-[5.25rem] lg:text-[6.25rem]">
          {display}
          <span className="text-[0.5em] text-accent-text">{percentSuffix}</span>
        </p>
        <p className="mt-1 text-lg font-semibold text-fg-muted">{caption}</p>
      </div>
    </div>
  );
}

/** The static ring (no animation, no 3D): fallback of the 3D Gauge, and the admin preview. */
export function GaugeRing({ value }: { value: number }) {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full -rotate-[225deg]" aria-hidden="true">
      <defs>
        <linearGradient id="gauge-gradient" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#1b52b8" />
          <stop offset="0.55" stopColor="#2f78e0" />
          <stop offset="1" stopColor="#9dbfe9" />
        </linearGradient>
      </defs>
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="#e3e6ec"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="url(#gauge-gradient)"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
        strokeDashoffset={ARC * (1 - value / 100)}
        className="gauge-arc"
      />
    </svg>
  );
}
