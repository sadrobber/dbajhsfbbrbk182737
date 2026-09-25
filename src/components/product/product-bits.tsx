import { cn } from "@/lib/cn";
import type { Badge } from "@/lib/data/schema";
import type { AvailabilityTone } from "@/lib/product-view";

const BADGE_STYLES: Record<Badge, string> = {
  deal_of_the_week: "bg-accent text-white",
  special_price: "bg-rose text-white",
  last_one: "bg-warning text-ink",
  new_arrival: "bg-fg text-ink",
};

export function ProductBadge({ badge, label }: { badge: Badge; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[0.8125rem] font-bold tracking-[0.01em] shadow-sm",
        BADGE_STYLES[badge],
      )}
    >
      {label}
    </span>
  );
}

const TONE_STYLES: Record<AvailabilityTone, { text: string; dot: string }> = {
  ok: { text: "text-success", dot: "bg-success" },
  low: { text: "text-warning", dot: "bg-warning" },
  last: { text: "text-warning", dot: "bg-warning motion-safe:animate-pulse-soft" },
  out: { text: "text-fg-subtle", dot: "bg-fg-subtle" },
};

export function Availability({ tone, label, className }: { tone: AvailabilityTone; label: string; className?: string }) {
  const style = TONE_STYLES[tone];
  return (
    <p className={cn("inline-flex items-center gap-2 text-[0.9375rem] font-semibold", style.text, className)}>
      <span aria-hidden="true" className={cn("size-2.5 rounded-full", style.dot)} />
      {label}
    </p>
  );
}

/** Soft glow behind the phone illustration, tinted per colour family. */
export function visualBackdrop(color: string): string {
  const tints: Record<string, string> = {
    black: "rgba(90,169,255,0.18)",
    white: "rgba(255,255,255,0.14)",
    blue: "rgba(90,169,255,0.28)",
    green: "rgba(74,222,128,0.18)",
    purple: "rgba(167,139,250,0.26)",
    grey: "rgba(148,163,184,0.18)",
    silver: "rgba(203,213,225,0.2)",
    pink: "rgba(244,114,182,0.22)",
    gold: "rgba(251,191,36,0.2)",
  };
  return `radial-gradient(60% 60% at 50% 60%, ${tints[color] ?? tints.black}, transparent 70%)`;
}
