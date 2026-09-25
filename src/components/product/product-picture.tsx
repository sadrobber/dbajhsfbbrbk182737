import Image from "next/image";
import { cn } from "@/lib/cn";
import type { ColorKey, Visual } from "@/lib/data/schema";
import { PhoneVisual } from "./phone-visual";

/**
 * The product's main photo when staff uploaded one in the admin,
 * otherwise the neutral phone illustration. Decorative: the card names the product.
 */
export function ProductPicture({
  photo,
  color,
  visual,
  sizes,
  className,
  photoClassName,
}: {
  photo: string | null;
  color: ColorKey;
  visual: Visual;
  /** Rendered width, for responsive image sizes. */
  sizes: string;
  /** Classes for the illustration (positions it inside the frame). */
  className?: string;
  photoClassName?: string;
}) {
  if (photo) {
    return <Image src={photo} alt="" fill sizes={sizes} className={cn("object-contain p-3", photoClassName)} />;
  }
  return <PhoneVisual color={color} visual={visual} className={className} />;
}
