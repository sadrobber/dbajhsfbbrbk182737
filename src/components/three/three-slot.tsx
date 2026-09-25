"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { decideThreeMode, detectCapabilities } from "./support";

/** What every 3D scene receives from its slot. */
export type SceneControls = {
  /** On screen: render frames. Off screen: the scene is paused. */
  active: boolean;
  /** Called once the first frame is drawn, to cross-fade from the static image. */
  onReady: () => void;
  /** Called if the device cannot keep a smooth frame rate: back to the static image. */
  onSlow: () => void;
};

class SceneErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Runs a callback when the browser is idle (or soon, where idle callbacks are missing). Returns a cancel function. */
function whenIdle(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, 300);
  return () => window.clearTimeout(id);
}

/**
 * Shows the static fallback (server-rendered, works without JavaScript), then,
 * on capable devices only, loads the 3D scene when it comes near the screen and
 * fades it in over the fallback. Never loads on reduced motion, without WebGL
 * or on low-end devices; drops back to the fallback if frames get too slow.
 */
export function ThreeSlot({
  fallback,
  render,
  className,
}: {
  fallback: ReactNode;
  render: (controls: SceneControls) => ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Decide once, after hydration, then wait until the slot is near the screen
  // and the browser is idle, so 3D never delays the page or its buttons.
  useEffect(() => {
    const node = ref.current;
    if (!node || decideThreeMode(detectCapabilities()) !== "3d") return;

    let cancelIdle: (() => void) | undefined;
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        near.disconnect();
        cancelIdle = whenIdle(() => setMounted(true));
      },
      { rootMargin: "400px 0px" },
    );
    const onScreen = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.01 });
    near.observe(node);
    onScreen.observe(node);
    const enable = window.setTimeout(() => setEnabled(true), 0);
    return () => {
      near.disconnect();
      onScreen.disconnect();
      window.clearTimeout(enable);
      cancelIdle?.();
    };
  }, []);

  const showScene = enabled && mounted && !failed;

  return (
    <div ref={ref} aria-hidden="true" className={cn("relative", className)}>
      <div className={cn("transition-opacity duration-700", showScene && ready ? "opacity-0" : "opacity-100")}>
        {fallback}
      </div>
      {showScene && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-700",
            ready ? "opacity-100" : "opacity-0",
          )}
        >
          <SceneErrorBoundary onError={() => setFailed(true)}>
            {render({
              active,
              onReady: () => setReady(true),
              // "?3d=on" forces 3D even on slow devices (demos, testing).
              onSlow: () => detectCapabilities().override !== "on" && setFailed(true),
            })}
          </SceneErrorBoundary>
        </div>
      )}
    </div>
  );
}
