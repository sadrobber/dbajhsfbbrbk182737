import type { Translator } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";
import { type Badge, type CatalogItem, type ColorKey, type Condition, type DealPromo, type Grade, localize, type Visual } from "@/lib/data/schema";
import { formatPercent, formatPrice } from "@/lib/format";
import { localizedPath, paths } from "@/lib/paths";

/**
 * Everything a product card displays, already translated and formatted.
 * Built on the server, so homepage cards and advisor cards look the same
 * and the browser never formats prices itself.
 */
export type ProductCardView = {
  id: string;
  href: string;
  brandName: string;
  model: string;
  condition: Condition;
  conditionLabel: string;
  gradeLabel: string | null;
  storageLabel: string;
  color: ColorKey;
  colorLabel: string;
  batteryLabel: string | null;
  warrantyLabel: string;
  price: string;
  compareAtPrice: string | null;
  newVersionPrice: string | null;
  saving: string | null;
  availability: { tone: AvailabilityTone; label: string };
  badges: CardBadge[];
  goodFor: string[];
  visual: Visual;
  /** Main product photo, or null to draw the neutral illustration. */
  photo: string | null;
};

/** "custom" is a Great Deals promo badge with text typed in the admin. */
export type CardBadge = { key: Badge | "custom"; label: string };

export type AvailabilityTone = "ok" | "low" | "last" | "out";

const GRADE_KEYS = { "A+": "aPlus", A: "a", B: "b" } as const;

export function gradeLabel(t: Translator, grade: Grade): string {
  return t(`Product.grade.${GRADE_KEYS[grade]}`);
}

export function storageLabel(t: Translator, gb: number): string {
  return gb >= 1024 && gb % 1024 === 0
    ? t("Product.storageTb", { value: gb / 1024 })
    : t("Product.storageGb", { value: gb });
}

export function availabilityOf(
  t: Translator,
  stock: number,
  lowStockThreshold: number,
): { tone: AvailabilityTone; label: string } {
  if (stock <= 0) return { tone: "out", label: t("Product.stock.soldOut") };
  if (stock === 1) return { tone: "last", label: t("Product.stock.lastOne") };
  if (stock <= lowStockThreshold) return { tone: "low", label: t("Product.stock.fewLeft", { count: stock }) };
  return { tone: "ok", label: t("Product.stock.inStock") };
}

export function buildProductCardView(
  item: CatalogItem,
  options: {
    t: Translator;
    /** Language of the labels and prices. */
    locale: Locale;
    /** Language of the product link (the site language). Defaults to `locale`. */
    hrefLocale?: Locale;
    lowStockThreshold: number;
    /** Extra badge from the Great Deals settings, shown first. */
    promo?: DealPromo | null;
  },
): ProductCardView {
  const { t, locale, lowStockThreshold, promo } = options;
  const hrefLocale = options.hrefLocale ?? locale;

  return {
    id: item.id,
    href: localizedPath(hrefLocale, paths.product(item.id)),
    brandName: item.brandName,
    model: item.model,
    condition: item.condition,
    conditionLabel: t(`Product.condition.${item.condition}`),
    gradeLabel: item.grade ? gradeLabel(t, item.grade) : null,
    storageLabel: storageLabel(t, item.storageGb),
    color: item.color,
    colorLabel: t(`Product.colors.${item.color}`),
    batteryLabel:
      item.batteryHealth !== null
        ? t("Product.battery", { value: formatPercent(locale, item.batteryHealth) })
        : null,
    warrantyLabel: t("Product.warranty", { months: item.warrantyMonths }),
    price: formatPrice(locale, item.price),
    compareAtPrice: item.compareAtPrice !== null ? formatPrice(locale, item.compareAtPrice) : null,
    newVersionPrice:
      item.newVersionPrice !== null
        ? t("Product.newVersionPrice", { price: formatPrice(locale, item.newVersionPrice) })
        : null,
    saving: item.saving !== null ? t("Product.saving", { amount: formatPrice(locale, item.saving) }) : null,
    availability: availabilityOf(t, item.stock, lowStockThreshold),
    badges: cardBadges(t, locale, item.badges, promo ?? null),
    goodFor: item.goodFor.map((tag) => t(`Product.goodFor.${tag}`)),
    visual: item.visual,
    photo: item.photos[0] ?? null,
  };
}

function cardBadges(t: Translator, locale: Locale, badges: Badge[], promo: DealPromo | null): CardBadge[] {
  const list: CardBadge[] = badges.map((key) => ({ key, label: t(`Product.badges.${key}`) }));
  if (!promo) return list;
  if (promo.badge === "custom") {
    return promo.label ? [{ key: "custom", label: localize(promo.label, locale) }, ...list] : list;
  }
  const key = promo.badge;
  return [{ key, label: t(`Product.badges.${key}`) }, ...list.filter((badge) => badge.key !== key)];
}
