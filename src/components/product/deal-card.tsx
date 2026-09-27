import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ProductCardView } from "@/lib/product-view";
import { Availability, ProductBadge, visualBackdrop } from "./product-bits";
import { ProductPicture } from "./product-picture";

/** Card for the Great Deals section: big visual, badges, price and availability. */
export function DealCard({
  product,
  labels,
}: {
  product: ProductCardView;
  labels: { view: string; previousPrice: string };
}) {
  const showsLastOneBadge = product.badges.some((badge) => badge.key === "last_one");

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-line bg-ink shadow-diffusion transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_28px_50px_-22px_rgb(15_20_35/0.2)] has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-3 has-[a:focus-visible]:outline-accent-strong">
      <div className="relative aspect-[5/4] overflow-hidden" style={{ backgroundImage: visualBackdrop(product.color) }}>
        {product.badges.length > 0 && (
          <ul className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
            {product.badges.slice(0, 2).map((badge) => (
              <li key={badge.key}>
                <ProductBadge badge={badge.key} label={badge.label} />
              </li>
            ))}
          </ul>
        )}
        <ProductPicture
          photo={product.photo}
          color={product.color}
          visual={product.visual}
          sizes="(min-width: 1024px) 24rem, 80vw"
          photoClassName="p-6 pt-14 transition duration-500 group-hover:-translate-y-2"
          className="fade-bottom absolute bottom-[-18%] left-1/2 h-[98%] -translate-x-1/2 transition duration-500 group-hover:-translate-y-2 group-hover:rotate-[-3deg]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div>
          <p className="text-[0.9375rem] font-semibold text-fg-subtle">{product.brandName}</p>
          <h3 className="mt-0.5 font-display text-[1.375rem] font-bold leading-tight tracking-[-0.02em]">
            <Link href={product.href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {product.model}
            </Link>
          </h3>
          <p className="mt-1.5 text-fg-muted">
            {product.storageLabel} · {product.colorLabel} · {product.conditionLabel}
          </p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            {product.compareAtPrice && (
              <p className="text-[0.9375rem] text-fg-subtle">
                <span className="sr-only">{labels.previousPrice}: </span>
                <s>{product.compareAtPrice}</s>
              </p>
            )}
            <p className="font-display text-[1.75rem] font-extrabold leading-none tracking-[-0.02em]">{product.price}</p>
          </div>
          <span
            aria-hidden="true"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface-3 px-4 text-[0.9375rem] font-semibold text-fg transition group-hover:bg-accent group-hover:text-white"
          >
            {labels.view}
            <ArrowRight className="size-4" />
          </span>
        </div>

        {/* The row is kept (empty) when the badge already says "last one", so prices line up. */}
        <div className="min-h-6">
          {!(showsLastOneBadge && product.availability.tone === "last") && (
            <Availability tone={product.availability.tone} label={product.availability.label} />
          )}
        </div>
      </div>
    </article>
  );
}
