import Image from "next/image";
import { PhoneVisual } from "@/components/product/phone-visual";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/data/schema";

/** Small picture for admin lists: the main photo, or the illustration. */
export function ProductThumb({ product, className }: { product: Pick<Product, "photos" | "color" | "visual">; className?: string }) {
  return (
    <span className={cn("relative block h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-2", className)}>
      {product.photos[0] ? (
        <Image src={product.photos[0]} alt="" fill sizes="44px" className="object-contain p-0.5" />
      ) : (
        <PhoneVisual color={product.color} visual={product.visual} className="absolute bottom-[-18%] left-1/2 h-[110%] -translate-x-1/2" />
      )}
    </span>
  );
}
