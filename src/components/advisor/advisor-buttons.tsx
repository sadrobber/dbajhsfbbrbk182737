"use client";

import { SparkleIcon as Sparkles } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { useAdvisor } from "./advisor-provider";

/** Any "Help me choose" button on a page. The floating button hides while one is on screen. */
export function OpenAdvisorButton({
  label,
  size = "lg",
  className,
}: {
  label: string;
  size?: "lg" | "md";
  className?: string;
}) {
  const { open } = useAdvisor();
  return (
    <button type="button" onClick={open} data-advisor-anchor="" className={cn(buttonClass("primary", size), className)}>
      <Sparkles aria-hidden="true" className="size-5" />
      {label}
    </button>
  );
}

/**
 * Floating "Help me choose" button, shown once the page's own button has scrolled away.
 * It sits left of the support chat bubble, which owns the corner.
 */
export function AdvisorLauncher() {
  const t = useTranslations("Advisor");
  const { isOpen, open } = useAdvisor();
  const pathname = usePathname();
  const [anchorOnScreen, setAnchorOnScreen] = useState(true);

  useEffect(() => {
    const anchors = document.querySelectorAll("[data-advisor-anchor]");
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      setAnchorOnScreen(visible.size > 0);
    });
    anchors.forEach((anchor) => observer.observe(anchor));
    // No inline button on this page: the floating one is always available.
    const timer = anchors.length === 0 ? window.setTimeout(() => setAnchorOnScreen(false), 0) : undefined;
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [pathname]);

  const hidden = isOpen || anchorOnScreen;

  return (
    <div
      inert={hidden}
      className={cn(
        "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-20 z-30 transition duration-300 sm:right-[5.75rem]",
        hidden ? "pointer-events-none translate-y-4 opacity-0" : "translate-y-0 opacity-100",
      )}
    >
      <button type="button" onClick={open} className={cn(buttonClass("primary", "md"), "shadow-glow")}>
        <Sparkles aria-hidden="true" className="size-5" />
        {t("launcher")}
      </button>
    </div>
  );
}
