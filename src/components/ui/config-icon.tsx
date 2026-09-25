import {
  ArrowLeftRight,
  Cable,
  CircleCheck,
  Headset,
  type LucideIcon,
  PlugZap,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  UserCheck,
  Wrench,
} from "lucide-react";
import type { IconKey } from "@/lib/data/schema";

/** Maps the icon names used in site.config.ts to actual icons. */
const ICONS: Record<IconKey, LucideIcon> = {
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
