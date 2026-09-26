/** Admin class names: plain, dense, clear focus rings. Same colour tokens as the shop. */

const focus = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

export const adminInput = `min-h-11 w-full rounded-xl border border-line-strong/60 bg-ink px-3 text-[1rem] text-fg placeholder:text-fg-subtle disabled:bg-surface-2 disabled:text-fg-subtle aria-invalid:border-danger ${focus}`;

export const adminSelect = `${adminInput} pr-8`;

export const adminCheckbox = "size-5 shrink-0 rounded accent-[#0066ff]";

const buttonBase = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[0.9375rem] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;

const variants = {
  primary: "bg-accent text-white hover:bg-[#0052cc]",
  secondary: "border border-line-strong/60 bg-ink text-fg hover:bg-surface-2",
  ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
  danger: "border border-danger/40 bg-ink text-danger hover:bg-danger-soft",
  dangerSolid: "bg-danger text-white hover:bg-[#8f1230]",
} as const;

export function adminButton(variant: keyof typeof variants = "secondary", extra = ""): string {
  return `${buttonBase} ${variants[variant]} ${extra}`;
}

export const iconButton = `inline-grid size-9 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30 ${focus}`;

export const adminCard = "rounded-2xl border border-line bg-ink shadow-[0_1px_2px_rgb(15_20_35/0.05)]";

export const tableHead = "px-3 py-2.5 text-left text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-fg-subtle";
export const tableCell = "px-3 py-3 align-middle";
