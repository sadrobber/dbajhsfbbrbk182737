import { cn } from "@/lib/cn";
import type { AvailabilityTone, CardBadge } from "@/lib/product-view";

const BADGE_STYLES: Record<CardBadge["key"], string> = {
  deal_of_the_week: "bg-accent text-white",
  special_price: "bg-rose text-white",
  last_one: "bg-warning text-ink",
  new_arrival: "bg-fg text-ink",
  custom: "bg-accent-text text-white",
};

export function ProductBadge({ badge, label }: { badge: CardBadge["key"]; label: string }) {
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
    black: "rgba(0,102,255,0.14)",
    white: "rgba(148,163,184,0.26)",
    blue: "rgba(0,102,255,0.18)",
    green: "rgba(34,197,94,0.16)",
    purple: "rgba(139,92,246,0.16)",
    grey: "rgba(100,116,139,0.18)",
    silver: "rgba(148,163,184,0.24)",
    pink: "rgba(236,72,153,0.14)",
    gold: "rgba(234,179,8,0.16)",
  };
  return `radial-gradient(60% 60% at 50% 60%, ${tints[color] ?? tints.black}, transparent 70%)`;
}
