import { BRAND_NAME } from "@/config/site.config";
import { cn } from "@/lib/cn";

/** Text-only logo until a real one exists. The name comes from BRAND_NAME in site.config.ts. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-[1.5rem] font-extrabold tracking-[-0.04em]", className)}>
      {BRAND_NAME}
      <span aria-hidden="true" className="text-accent-text">
        .
      </span>
    </span>
  );
}
