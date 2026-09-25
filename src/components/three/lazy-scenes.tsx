"use client";

import dynamic from "next/dynamic";
import type { ReactNode, RefObject } from "react";
import { ThreeSlot } from "./three-slot";

// Each scene (and three.js itself) is a separate chunk, downloaded only when
// a capable device scrolls near it. Nothing 3D is rendered on the server.
const HeroScene = dynamic(() => import("./scenes/hero-scene"), { ssr: false });
const PackagesScene = dynamic(() => import("./scenes/packages-scene"), { ssr: false });
const GaugeScene = dynamic(() => import("./scenes/gauge-scene"), { ssr: false });
const TradeInScene = dynamic(() => import("./scenes/trade-in-scene"), { ssr: false });

type SlotProps = { fallback: ReactNode; className?: string };

export function HeroThree(props: SlotProps) {
  return <ThreeSlot {...props} render={(controls) => <HeroScene {...controls} />} />;
}

export function PackagesThree({ progress, ...props }: SlotProps & { progress: RefObject<number> }) {
  return <ThreeSlot {...props} render={(controls) => <PackagesScene {...controls} progress={progress} />} />;
}

export function GaugeThree({ value, ...props }: SlotProps & { value: number }) {
  return <ThreeSlot {...props} render={(controls) => <GaugeScene {...controls} value={value} />} />;
}

export function TradeInThree(props: SlotProps) {
  return <ThreeSlot {...props} render={(controls) => <TradeInScene {...controls} />} />;
}
