/** Shared class names. Large tap targets (48px+) and visible focus everywhere. */

export const container = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

const buttonBase =
  "inline-flex items-center justify-center gap-2.5 rounded-full font-semibold tracking-[-0.01em] transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent-strong";

export const buttonSize = {
  lg: "min-h-16 px-7 text-lg",
  md: "min-h-13 px-6 text-[1.0625rem]",
  sm: "min-h-11 px-4 text-[0.9375rem]",
} as const;

export const buttonVariant = {
  primary:
    "bg-accent text-white shadow-glow hover:-translate-y-0.5 hover:bg-[#1a5fcb] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_18px_34px_-16px_rgb(27_103_218/0.7)] active:translate-y-0",
  secondary:
    "border border-line-strong bg-ink text-fg hover:-translate-y-0.5 hover:border-fg hover:bg-surface-1 active:translate-y-0",
  dark: "bg-fg text-ink hover:-translate-y-0.5 hover:bg-[#262833] active:translate-y-0",
} as const;

export function buttonClass(
  variant: keyof typeof buttonVariant = "primary",
  size: keyof typeof buttonSize = "md",
): string {
  return `${buttonBase} ${buttonSize[size]} ${buttonVariant[variant]}`;
}

export const eyebrow =
  "inline-flex items-center gap-2 rounded-full border border-line bg-ink/80 px-3.5 py-1.5 text-[0.9375rem] font-medium text-fg-muted";
