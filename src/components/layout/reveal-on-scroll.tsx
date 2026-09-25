"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Fades sections marked with the "reveal" class in once, when they come into view.
 * Sections already on screen are left alone; nothing happens with reduced motion.
 */
export function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".reveal")).filter((section) => {
      if (section.dataset.reveal === "shown") return false;
      if (section.dataset.reveal === "pending") return true;
      return section.getBoundingClientRect().top > window.innerHeight;
    });
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = "shown";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const section of sections) {
      section.dataset.reveal = "pending";
      observer.observe(section);
    }
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
