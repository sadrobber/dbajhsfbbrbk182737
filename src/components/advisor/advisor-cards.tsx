import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ConfigIcon } from "@/components/ui/config-icon";
import { ProductPicture } from "@/components/product/product-picture";
import { Availability, visualBackdrop } from "@/components/product/product-bits";
import type { AdvisorCard, AdvisorPackageCard } from "@/lib/advisor/contract";
import type { Slot } from "@/lib/advisor/constants";
import { cn } from "@/lib/cn";

const SLOT_STYLES: Record<Slot, string> = {
  right_choice: "bg-accent text-white",
  smart_deal: "bg-success-soft text-success",
  premium_option: "bg-warning-soft text-warning",
};

/** A recommended phone inside the chat. All text arrives translated from the server. */
export function AdvisorProductCard({ card }: { card: AdvisorCard }) {
  const { product } = card;
  const details = [product.storageLabel, product.colorLabel, product.conditionLabel, product.gradeLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group relative flex gap-4 rounded-3xl border border-line bg-surface-2 p-3.5 transition hover:border-accent/60 has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent-strong">
      <div
        className="relative h-32 w-[5.5rem] shrink-0 overflow-hidden rounded-2xl bg-surface-3"
        style={{ backgroundImage: visualBackdrop(product.color) }}
      >
        <ProductPicture
          photo={product.photo}
          color={product.color}
          visual={product.visual}
          sizes="5.5rem"
          photoClassName="p-2"
          className="fade-bottom absolute bottom-[-20%] left-1/2 h-[110%] -translate-x-1/2"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("inline-flex rounded-full px-3 py-1 text-[0.8125rem] font-bold", SLOT_STYLES[card.slot])}>
          {card.slotLabel}
        </p>
        <h3 className="mt-2 font-display text-lg font-bold leading-snug">
          <Link href={product.href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {product.brandName} {product.model}
          </Link>
        </h3>
        <p className="text-[0.9375rem] text-fg-muted">{details}</p>
        {product.batteryLabel && <p className="text-[0.9375rem] text-fg-muted">{product.batteryLabel}</p>}
        {card.reason && <p className="mt-1.5 text-[0.9375rem] leading-snug text-fg">{card.reason}</p>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="font-display text-xl font-extrabold">{product.price}</p>
          <Availability tone={product.availability.tone} label={product.availability.label} />
        </div>
      </div>
    </article>
  );
}

export function AdvisorPackageCardView({ pkg }: { pkg: AdvisorPackageCard }) {
  return (
    <article className="relative flex items-center gap-3 rounded-3xl border border-line bg-surface-2 p-3.5 transition hover:border-accent/60 has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-accent-strong">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-text">
        <ConfigIcon name={pkg.icon} className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold leading-snug">
          <Link href={pkg.href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {pkg.name}
          </Link>
        </h3>
        <p className="text-[0.9375rem] text-fg-muted">{pkg.tagline}</p>
      </div>
      <p className="shrink-0 font-display text-lg font-extrabold">{pkg.price}</p>
      <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-fg-subtle" />
    </article>
  );
}
