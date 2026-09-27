import { BatteryMediumIcon as BatteryMedium, ShieldCheckIcon as ShieldCheck, SparkleIcon as Sparkles } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ProductCardView } from "@/lib/product-view";
import { ProductPicture } from "./product-picture";
import { Availability, visualBackdrop } from "./product-bits";

/**
 * Card for refurbished picks: model, storage, colour, condition grade, battery
 * health, warranty, price, availability, and the saving vs new when the shop
 * sells the same phone new.
 */
export function RefurbCard({ product }: { product: ProductCardView }) {
  const facts = [
    { icon: Sparkles, label: product.gradeLabel },
    { icon: BatteryMedium, label: product.batteryLabel },
    { icon: ShieldCheck, label: product.warrantyLabel },
  ].filter((fact): fact is { icon: typeof Sparkles; label: string } => Boolean(fact.label));

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-line bg-ink shadow-diffusion transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_28px_50px_-22px_rgb(15_20_35/0.2)] has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-3 has-[a:focus-visible]:outline-accent-strong">
      <div className="flex items-center gap-4 p-5 pb-0 sm:p-6 sm:pb-0">
        <div
          className="relative h-32 w-24 shrink-0 overflow-hidden rounded-2xl bg-surface-2"
          style={{ backgroundImage: visualBackdrop(product.color) }}
        >
          <ProductPicture
            photo={product.photo}
            color={product.color}
            visual={product.visual}
            sizes="6rem"
            photoClassName="p-2"
            className="fade-bottom absolute bottom-[-22%] left-1/2 h-[112%] -translate-x-1/2 transition duration-500 group-hover:-translate-y-1.5"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-semibold text-fg-subtle">{product.brandName}</p>
          <h3 className="font-display text-[1.375rem] font-bold leading-tight tracking-[-0.02em]">
            <Link href={product.href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {product.model}
            </Link>
          </h3>
          <p className="mt-1 text-fg-muted">
            {product.storageLabel} · {product.colorLabel}
          </p>
        </div>
      </div>

      <ul className="flex flex-wrap gap-2 px-5 pt-4 sm:px-6">
        {facts.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[0.9375rem] text-fg"
          >
            <Icon aria-hidden="true" className="size-4 text-accent-text" />
            {label}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
          <p className="font-display text-[1.75rem] font-extrabold leading-none tracking-[-0.02em]">{product.price}</p>
          {product.saving && (
            <p className="rounded-full bg-success-soft px-3 py-1 text-[0.9375rem] font-bold text-success">{product.saving}</p>
          )}
        </div>
        {product.newVersionPrice && <p className="text-[0.9375rem] text-fg-subtle">{product.newVersionPrice}</p>}
        <Availability tone={product.availability.tone} label={product.availability.label} />
      </div>
    </article>
  );
}
