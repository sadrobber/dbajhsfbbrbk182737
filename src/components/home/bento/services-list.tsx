"use client";

import { ArrowsLeftRightIcon, HeadsetIcon, StorefrontIcon, WrenchIcon } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { memo, useEffect, useRef, useState } from "react";
import type { ServiceKey } from "@/lib/data/schema";
import { cn } from "@/lib/cn";

const ICONS: Record<ServiceKey, Icon> = {
  collection: StorefrontIcon,
  support: HeadsetIcon,
  data_transfer: ArrowsLeftRightIcon,
  after_sales: WrenchIcon,
};

const SPRING = { type: "spring", stiffness: 100, damping: 20 } as const;

/**
 * "Intelligent list": the shop's services take turns at the top (layout
 * animation, spring physics); the one on top shows its line. Static without motion.
 */
export const ServicesList = memo(function ServicesList({ services }: { services: { key: ServiceKey; title: string; text: string }[] }) {
  const scope = useRef<HTMLUListElement>(null);
  const inView = useInView(scope, { amount: 0.5 });
  const reduce = useReducedMotion();
  const [order, setOrder] = useState(services);

  useEffect(() => {
    if (!inView || reduce) return;
    const timer = window.setInterval(() => setOrder((list) => [...list.slice(1), list[0]]), 2600);
    return () => window.clearInterval(timer);
  }, [inView, reduce]);

  return (
    <ul ref={scope} className="grid gap-2">
      {order.map((service, index) => {
        const ServiceIcon = ICONS[service.key];
        const top = index === 0;
        return (
          <motion.li
            key={service.key}
            layout={!reduce}
            transition={SPRING}
            className={cn("flex items-start gap-3 rounded-2xl px-3 py-2.5 transition-colors duration-500", top ? "bg-accent-soft" : "bg-transparent")}
          >
            <ServiceIcon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", top ? "text-accent-text" : "text-fg-subtle")} />
            <span className="min-w-0">
              <span className="block font-semibold leading-tight">{service.title}</span>
              <span className={cn("block text-[0.875rem] leading-snug text-fg-muted", !top && "sr-only")}>{service.text}</span>
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
});
