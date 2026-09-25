import { AlertTriangle, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em]">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Banner({ tone = "info", children }: { tone?: "info" | "warning"; children: ReactNode }) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border p-4 text-[0.9375rem] leading-snug",
        tone === "warning" ? "border-warning/30 bg-warning-soft text-fg" : "border-accent/20 bg-accent-soft text-fg",
      )}
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", tone === "warning" ? "text-warning" : "text-accent-text")} />
      <div>{children}</div>
    </div>
  );
}

/** Shown on every screen that lists placeholder records. */
export function PlaceholderDataBanner() {
  return (
    <Banner tone="warning">
      <strong>Placeholder data.</strong> There is no real checkout or customer flow yet, so these records are examples from{" "}
      <code>data/*.json</code>. This screen is ready for real data once that&rsquo;s built.
    </Banner>
  );
}

export type PillTone = "neutral" | "info" | "success" | "warning" | "danger";

const PILL_TONES: Record<PillTone, string> = {
  neutral: "bg-surface-2 text-fg-muted",
  info: "bg-accent-soft text-accent-text",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Pill({ tone = "neutral", children }: { tone?: PillTone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold", PILL_TONES[tone])}>
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid content-start gap-1.5", className)}>
      <span className="text-[0.9375rem] font-semibold">{label}</span>
      {children}
      {hint && !error && <span className="text-[0.8125rem] text-fg-subtle">{hint}</span>}
      {error && <span className="text-[0.8125rem] font-semibold text-danger">{error}</span>}
    </label>
  );
}

export function Fieldset({ legend, children, error }: { legend: string; children: ReactNode; error?: string }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-[0.9375rem] font-semibold">{legend}</legend>
      {children}
      {error && <span className="text-[0.8125rem] font-semibold text-danger">{error}</span>}
    </fieldset>
  );
}
