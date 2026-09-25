import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ConfigIcon } from "@/components/ui/config-icon";
import { buttonClass } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import type { IconKey } from "@/lib/data/schema";

/** Everything a package card shows, already translated and formatted. */
export type PackageCardView = {
  price: string;
  icon: IconKey;
  name: string;
  tagline: string;
  items: { id: string; icon: IconKey; label: string; todo: boolean }[];
  labels: { includes: string; todo: string; todoHint: string; learnMore: string };
  href: string;
};

/** "More than just a phone" package: price, name, contents as icons. Used on the homepage and in the admin preview. */
export function PackageCard({ pkg, highlighted }: { pkg: PackageCardView; highlighted: boolean }) {
  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-[2rem] border p-6 sm:p-8",
        highlighted
          ? "border-accent/30 bg-[linear-gradient(160deg,rgba(0,102,255,0.09),#ffffff_55%)] shadow-card"
          : "border-line bg-[linear-gradient(160deg,rgba(11,12,16,0.05),#ffffff_55%)] shadow-card",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent text-white shadow-glow">
          <ConfigIcon name={pkg.icon} className="size-7" />
        </span>
        <p className="font-display text-[2.5rem] font-extrabold leading-none tracking-[-0.03em]">{pkg.price}</p>
      </div>
      <h3 className="mt-6 font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em]">{pkg.name}</h3>
      <p className="mt-2 text-lg text-fg-muted">{pkg.tagline}</p>

      <h4 className="mt-7 text-[0.9375rem] font-semibold uppercase tracking-[0.12em] text-fg-subtle">{pkg.labels.includes}</h4>
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {pkg.items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "relative flex flex-col items-center gap-2.5 rounded-2xl p-4 text-center",
              item.todo ? "border border-dashed border-line-strong bg-ink" : "bg-surface-1",
            )}
          >
            <span
              className={cn(
                "grid size-12 place-items-center rounded-full",
                item.todo ? "bg-surface-3 text-fg-subtle" : "bg-accent-soft text-accent-text",
              )}
            >
              <ConfigIcon name={item.icon} className="size-6" />
            </span>
            <span className="text-[1rem] font-semibold leading-tight">{item.label}</span>
            {item.todo && (
              <span
                title={pkg.labels.todoHint}
                className="absolute right-2 top-2 rounded-md border border-warning/60 px-1.5 py-0.5 text-[0.75rem] font-bold tracking-wide text-warning"
              >
                {pkg.labels.todo}
                <span className="sr-only"> ({pkg.labels.todoHint})</span>
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-7">
        <Link href={pkg.href} className={buttonClass("secondary", "md")}>
          {pkg.labels.learnMore}
          <ArrowRight aria-hidden="true" className="size-5" />
        </Link>
      </div>
    </article>
  );
}
