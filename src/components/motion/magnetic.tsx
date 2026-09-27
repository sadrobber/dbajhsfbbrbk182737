"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { PointerEvent, ReactNode } from "react";

const SPRING = { stiffness: 100, damping: 20, mass: 0.5 };

/**
 * Pulls its content a few pixels toward the mouse. Motion values only (no React
 * re-render per frame); nothing happens with touch, pens or reduced motion.
 */
export function Magnetic({ children, strength = 0.25, className }: { children: ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING);
  const springY = useSpring(y, SPRING);

  const follow = (event: PointerEvent<HTMLDivElement>) => {
    if (reduce || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - (box.left + box.width / 2)) * strength);
    y.set((event.clientY - (box.top + box.height / 2)) * strength);
  };
  const release = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div className={className} style={{ x: springX, y: springY }} onPointerMove={follow} onPointerLeave={release}>
      {children}
    </motion.div>
  );
}
