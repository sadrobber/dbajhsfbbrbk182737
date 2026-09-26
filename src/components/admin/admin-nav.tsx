"use client";

import {
  FileText,
  Flame,
  Gauge,
  type LucideIcon,
  Package,
  Receipt,
  Repeat,
  Smartphone,
  Ticket,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export const ADMIN_SECTIONS: { href: string; label: string; icon: LucideIcon; group: "shop" | "records" }[] = [
  { href: "/admin/products", label: "Products", icon: Smartphone, group: "shop" },
  { href: "/admin/deals", label: "Great Deals", icon: Flame, group: "shop" },
  { href: "/admin/packages", label: "Packages", icon: Package, group: "shop" },
  { href: "/admin/gauge", label: "Gauge", icon: Gauge, group: "shop" },
  { href: "/admin/orders", label: "Orders", icon: Receipt, group: "records" },
  { href: "/admin/customers", label: "Customers", icon: Users, group: "records" },
  { href: "/admin/trade-ins", label: "Trade-ins", icon: Repeat, group: "records" },
  { href: "/admin/tickets", label: "Tickets", icon: Ticket, group: "records" },
  { href: "/admin/invoices", label: "Invoices", icon: FileText, group: "records" },
];

export function AdminNav() {
  const pathname = usePathname();

  const link = (section: (typeof ADMIN_SECTIONS)[number]) => {
    const active = pathname === section.href || pathname.startsWith(`${section.href}/`);
    const Icon = section.icon;
    return (
      <li key={section.href} className="shrink-0">
        <Link
          href={section.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-semibold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-night-accent",
            active ? "bg-white text-fg" : "text-night-muted hover:bg-white/10 hover:text-white",
          )}
        >
          <Icon aria-hidden="true" className={cn("size-5", active ? "text-accent" : "")} />
          {section.label}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Admin sections" className="min-w-0">
      <p className="mb-1 hidden px-3 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-night-muted/80 lg:block">Shop</p>
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {ADMIN_SECTIONS.filter((s) => s.group === "shop").map(link)}
        <li aria-hidden="true" className="mx-1 my-2 hidden border-t border-white/10 lg:block" />
        <li className="hidden px-3 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-night-muted/80 lg:block">Records</li>
        {ADMIN_SECTIONS.filter((s) => s.group === "records").map(link)}
      </ul>
    </nav>
  );
}
