import { ArrowsLeftRightIcon as ArrowLeftRight, PlugsIcon as Cable, CheckCircleIcon as CircleCheck, HeadsetIcon as Headset, PlugChargingIcon as PlugZap, SlidersIcon as Settings2, ShieldCheckIcon as ShieldCheck, DeviceMobileIcon as Smartphone, SparkleIcon as Sparkles, StorefrontIcon as Store, UserCheckIcon as UserCheck, WrenchIcon as Wrench } from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import type { IconKey } from "@/lib/data/schema";

/** Maps the icon names used in site.config.ts to actual icons. */
const ICONS: Record<IconKey, PhosphorIcon> = {
  plug: PlugZap,
  cable: Cable,
  screen: Smartphone,
  case: ShieldCheck,
  settings: Settings2,
  transfer: ArrowLeftRight,
  user: UserCheck,
  check: CircleCheck,
  shield: ShieldCheck,
  sparkles: Sparkles,
  store: Store,
  support: Headset,
  repair: Wrench,
};

export function ConfigIcon({ name, className }: { name: IconKey; className?: string }) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" className={className} />;
}
