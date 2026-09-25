/**
 * When to show real-time 3D, and when to keep the static illustration.
 * Pure decision logic (unit-tested) + a browser probe.
 */

export type ThreeMode = "3d" | "static";

export type Capabilities = {
  webgl: boolean;
  reducedMotion: boolean;
  /** navigator.deviceMemory in GB, when the browser exposes it. */
  deviceMemory?: number;
  /** navigator.hardwareConcurrency (CPU cores), when exposed. */
  cores?: number;
  /** The user asked the browser to save data. */
  saveData?: boolean;
  /** "?3d=on" or "?3d=off" in the URL, for demos and testing. */
  override?: "on" | "off" | null;
};

export function decideThreeMode(c: Capabilities): ThreeMode {
  if (c.override === "off" || !c.webgl) return "static";
  if (c.override === "on") return "3d";
  if (c.reducedMotion || c.saveData) return "static";
  // Low-end devices keep the lightweight illustration.
  if (c.deviceMemory !== undefined && c.deviceMemory <= 2) return "static";
  if (c.cores !== undefined && c.cores <= 2) return "static";
  return "3d";
}

/** 0 when the element's top enters at the bottom of the screen, 1 when its bottom leaves at the top. */
export function scrollProgress(top: number, height: number, viewportHeight: number): number {
  const total = viewportHeight + height;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, (viewportHeight - top) / total));
}

/** Smooth 0..1 ramp between two edges (like GLSL smoothstep). */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

let cached: Capabilities | null = null;

/** Reads the browser once per page load. */
export function detectCapabilities(): Capabilities {
  if (cached) return cached;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const param = new URLSearchParams(window.location.search).get("3d");
  cached = {
    webgl: hasWebGL(),
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    deviceMemory: nav.deviceMemory,
    cores: nav.hardwareConcurrency || undefined,
    saveData: nav.connection?.saveData ?? false,
    override: param === "on" || param === "off" ? param : null,
  };
  return cached;
}
