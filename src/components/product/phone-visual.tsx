import type { ColorKey, Visual } from "@/lib/data/schema";

/**
 * Neutral phone illustration used until real product photos exist.
 * No brand shapes or logos: a coloured body and a generic camera layout.
 */

const PALETTE: Record<ColorKey, { body: string; edge: string; shine: string }> = {
  black: { body: "#26282f", edge: "#3b3e48", shine: "#5c606d" },
  white: { body: "#e8e6e1", edge: "#c9c6bf", shine: "#ffffff" },
  blue: { body: "#6d8fbc", edge: "#50709b", shine: "#a7c1e3" },
  green: { body: "#6f9b8c", edge: "#527c6e", shine: "#a6cdbf" },
  purple: { body: "#9a8fc6", edge: "#7a6fa9", shine: "#c8bfeb" },
  grey: { body: "#60636c", edge: "#484b53", shine: "#90949e" },
  silver: { body: "#c8ccd3", edge: "#a6abb4", shine: "#f1f3f6" },
  pink: { body: "#e6b8c3", edge: "#c796a3", shine: "#f7dce3" },
  gold: { body: "#d8c29b", edge: "#b8a079", shine: "#f0e2c6" },
};

type LensSpec = { x: number; y: number; r: number };

const LAYOUTS: Record<Visual, { module?: { x: number; y: number; w: number; h: number; r: number }; lenses: LensSpec[]; flash: { x: number; y: number } }> = {
  duo: {
    module: { x: 30, y: 24, w: 74, h: 74, r: 22 },
    lenses: [
      { x: 51, y: 45, r: 13 },
      { x: 83, y: 77, r: 13 },
    ],
    flash: { x: 85, y: 43 },
  },
  trio: {
    module: { x: 28, y: 22, w: 84, h: 84, r: 24 },
    lenses: [
      { x: 51, y: 45, r: 13 },
      { x: 89, y: 45, r: 13 },
      { x: 51, y: 83, r: 13 },
    ],
    flash: { x: 89, y: 83 },
  },
  column: {
    lenses: [
      { x: 46, y: 44, r: 13 },
      { x: 46, y: 78, r: 13 },
      { x: 46, y: 112, r: 13 },
    ],
    flash: { x: 74, y: 44 },
  },
  bar: {
    module: { x: 28, y: 32, w: 144, h: 42, r: 21 },
    lenses: [
      { x: 56, y: 53, r: 12 },
      { x: 90, y: 53, r: 12 },
    ],
    flash: { x: 122, y: 53 },
  },
  single: {
    module: { x: 30, y: 26, w: 50, h: 50, r: 16 },
    lenses: [{ x: 55, y: 51, r: 13 }],
    flash: { x: 96, y: 40 },
  },
};

function Lens({ x, y, r, gradientId }: LensSpec & { gradientId: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r + 4} fill="#07080c" opacity="0.92" />
      <circle cx={x} cy={y} r={r + 4} fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1.5" />
      <circle cx={x} cy={y} r={r} fill={`url(#${gradientId})`} />
      <circle cx={x} cy={y} r={r * 0.42} fill="#5b8cff" opacity="0.22" />
      <circle cx={x - r * 0.35} cy={y - r * 0.35} r={2.4} fill="#ffffff" opacity="0.7" />
    </g>
  );
}

export function PhoneVisual({
  color,
  visual = "duo",
  view = "back",
  className,
}: {
  color: ColorKey;
  visual?: Visual;
  view?: "back" | "front";
  className?: string;
}) {
  const palette = PALETTE[color];
  const id = `phone-${view}-${color}-${visual}`;

  if (view === "front") {
    return (
      <svg viewBox="0 0 200 400" className={className} aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={`${id}-screen`} cx="0.3" cy="0.2" r="1">
            <stop offset="0" stopColor="#3d8bff" />
            <stop offset="0.35" stopColor="#0a4fd6" />
            <stop offset="0.7" stopColor="#0b1638" />
            <stop offset="1" stopColor="#05070f" />
          </radialGradient>
          <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="14" y="4" width="172" height="392" rx="38" fill="#2b2d35" />
        <rect x="17" y="7" width="166" height="386" rx="35" fill="#101116" />
        <rect x="24" y="14" width="152" height="372" rx="29" fill={`url(#${id}-screen)`} />
        <circle cx="136" cy="118" r="54" fill="#5aa9ff" opacity="0.22" />
        <circle cx="62" cy="250" r="70" fill="#8a5cff" opacity="0.14" />
        <rect x="40" y="206" width="120" height="34" rx="17" fill="#ffffff" opacity="0.12" />
        <rect x="40" y="250" width="92" height="34" rx="17" fill="#ffffff" opacity="0.09" />
        <rect x="40" y="306" width="120" height="48" rx="24" fill="#0066ff" opacity="0.85" />
        <rect x="24" y="14" width="152" height="372" rx="29" fill={`url(#${id}-glass)`} />
        <circle cx="100" cy="32" r="5.5" fill="#000000" />
      </svg>
    );
  }

  const layout = LAYOUTS[visual];
  return (
    <svg viewBox="0 0 200 400" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette.shine} />
          <stop offset="0.45" stopColor={palette.body} />
          <stop offset="1" stopColor={palette.edge} />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0.45">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="0.35" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-lens`} cx="0.35" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#3a4a70" />
          <stop offset="0.5" stopColor="#0c1322" />
          <stop offset="1" stopColor="#04060b" />
        </radialGradient>
      </defs>
      <rect x="14" y="4" width="172" height="392" rx="38" fill={palette.edge} />
      <rect x="17" y="7" width="166" height="386" rx="35" fill={`url(#${id}-body)`} />
      <rect x="17" y="7" width="166" height="386" rx="35" fill={`url(#${id}-sheen)`} />
      {layout.module && (
        <rect
          x={layout.module.x}
          y={layout.module.y}
          width={layout.module.w}
          height={layout.module.h}
          rx={layout.module.r}
          fill="#000000"
          fillOpacity="0.16"
          stroke="#ffffff"
          strokeOpacity="0.16"
          strokeWidth="1.5"
        />
      )}
      {layout.lenses.map((lens) => (
        <Lens key={`${lens.x}-${lens.y}`} {...lens} gradientId={`${id}-lens`} />
      ))}
      <circle cx={layout.flash.x} cy={layout.flash.y} r="5" fill="#fff4d6" opacity="0.85" />
    </svg>
  );
}
