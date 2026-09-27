import { ClockIcon as Clock, ChatTextIcon as MessageSquareText, MinusIcon as Minus, PackageIcon as Package, PlusIcon as Plus, StorefrontIcon as Store, TrashIcon as Trash2 } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { CheckoutForm, type CheckoutFormLabels } from "@/components/checkout/checkout-form";
import { Availability, visualBackdrop } from "@/components/product/product-bits";
import { ProductPicture } from "@/components/product/product-picture";
import { buttonClass, container } from "@/components/ui/styles";
import { getTranslator } from "@/i18n/messages";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getCatalogItems, getMerchandising } from "@/lib/data/queries";
import type { Supply } from "@/lib/data/schema";
import { formatPrice } from "@/lib/format";
import { translateDynamic } from "@/lib/i18n-dynamic";
import { CART_COOKIE, type CartEntry, MAX_QUANTITY, parseCart } from "@/lib/orders/cart";
import type { AvailabilityTone } from "@/lib/product-view";
import { priceCartFor } from "@/server/orders/checkout";
import { placeOrderAction, setCartQuantityAction } from "./actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/cart">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  return { title: getTranslator(locale)("Cart.title"), robots: { index: false, follow: false } };
}

const SUPPLY_ICONS: Record<Supply, typeof Store> = { in_store: Store, within_48h: Clock, on_request: MessageSquareText };
const SUPPLY_TONES: Record<Supply, AvailabilityTone> = { in_store: "ok", within_48h: "supplier", on_request: "request" };
const SUPPLY_LABELS = { in_store: "inStock", within_48h: "within48h", on_request: "onRequest" } as const;

const iconButton =
  "inline-grid size-11 place-items-center rounded-full border border-line-strong bg-ink text-fg transition hover:bg-surface-1 disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

export default async function CartPage({ params, searchParams }: PageProps<"/[locale]/cart">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const { cancelled } = await searchParams;

  const t = getTranslator(locale);
  const cart = parseCart((await cookies()).get(CART_COOKIE)?.value);
  const [priced, items, settings] = await Promise.all([priceCartFor(cart, locale), getCatalogItems(), getMerchandising()]);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const price = (amount: number) => formatPrice(locale, amount);

  const quantityControls = (entry: Pick<CartEntry, "kind" | "id" | "quantity">, name: string) => (
    <div className="flex items-center gap-2">
      <form action={setCartQuantityAction.bind(null, entry.kind, entry.id, entry.quantity - 1)}>
        <button type="submit" className={iconButton} aria-label={t("Cart.decrease", { item: name })} disabled={entry.quantity <= 1}>
          <Minus aria-hidden="true" className="size-4" />
        </button>
      </form>
      <span className="min-w-6 text-center font-semibold tabular-nums">
        <span aria-hidden="true">{entry.quantity}</span>
        <span className="sr-only">{t("Cart.quantity", { count: entry.quantity })}</span>
      </span>
      <form action={setCartQuantityAction.bind(null, entry.kind, entry.id, entry.quantity + 1)}>
        <button type="submit" className={iconButton} aria-label={t("Cart.increase", { item: name })} disabled={entry.quantity >= MAX_QUANTITY}>
          <Plus aria-hidden="true" className="size-4" />
        </button>
      </form>
      <form action={setCartQuantityAction.bind(null, entry.kind, entry.id, 0)}>
        <button type="submit" className={iconButton} aria-label={t("Cart.remove", { item: name })}>
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </form>
    </div>
  );

  const heading = (
    <h1 className="font-display text-[2.25rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-5xl">{t("Cart.title")}</h1>
  );

  if (priced.lines.length === 0 && priced.unavailable.length === 0) {
    return (
      <section className={`${container} grid justify-items-start gap-6 py-12 sm:py-16`}>
        {heading}
        <p className="text-lg text-fg-muted">{t("Cart.empty")}</p>
        <Link href="/" className={buttonClass("secondary", "md")}>
          {t("Common.backHome")}
        </Link>
      </section>
    );
  }

  const packagesInCart = new Set(priced.lines.flatMap((line) => (line.packageId ? [line.packageId] : [])));
  const hasPhone = priced.lines.some((line) => line.productId);
  const addablePackages = hasPhone ? settings.packages.filter((pkg) => !packagesInCart.has(pkg.id)) : [];
  const canCheckout = priced.lines.length > 0 && priced.unavailable.length === 0;
  const ModeIcon = SUPPLY_ICONS[priced.supply];

  const labels: CheckoutFormLabels = {
    title: t("Cart.form.title"),
    required: t("Cart.form.required"),
    fields: {
      firstName: t("Cart.form.firstName"),
      lastName: t("Cart.form.lastName"),
      email: t("Cart.form.email"),
      phone: t("Cart.form.phone"),
      town: t("Cart.form.town"),
      townOther: t("Cart.form.townOther"),
      marketing: t("Cart.form.marketing"),
      pickup: t("Cart.form.pickup"),
    },
    errors: {
      firstName: t("Cart.errors.firstName"),
      lastName: t("Cart.errors.lastName"),
      email: t("Cart.errors.email"),
      phone: t("Cart.errors.phone"),
      town: t("Cart.errors.town"),
    },
    problems: {
      empty: t("Cart.problems.empty"),
      unavailable: t("Cart.problems.unavailable"),
      changed: t("Cart.problems.changed"),
      payments_off: t("Cart.problems.payments_off"),
      generic: t("Cart.problems.generic"),
    },
    submit: t(`Cart.submit.${priced.supply}`, { total: price(priced.total) }),
    secure: priced.supply === "on_request" ? null : t("Cart.secure"),
  };

  return (
    <section className={`${container} grid gap-8 py-10 sm:py-14`}>
      {heading}
      {cancelled && (
        <p role="status" className="rounded-2xl bg-warning-soft px-4 py-3 font-semibold">
          {t("Cart.cancelled")}
        </p>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="grid gap-8">
          <ul className="grid gap-3">
            {priced.lines.map((line) => {
              const item = line.productId ? itemById.get(line.productId) : undefined;
              const entry = { kind: item ? "product" : "package", id: (line.productId ?? line.packageId)!, quantity: line.quantity } as const;
              return (
                <li key={`${entry.kind}-${entry.id}`} className="flex flex-wrap items-center gap-4 rounded-3xl border border-line bg-ink p-4">
                  <div
                    className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-1"
                    style={item ? { backgroundImage: visualBackdrop(item.color) } : undefined}
                  >
                    {item ? (
                      <ProductPicture
                        photo={item.photos[0] ?? null}
                        color={item.color}
                        visual={item.visual}
                        sizes="5rem"
                        photoClassName="p-1.5"
                        className="absolute bottom-[-20%] left-1/2 h-[115%] -translate-x-1/2"
                      />
                    ) : (
                      <Package aria-hidden="true" className="size-8 text-accent-text" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{line.description}</p>
                    {item && (
                      <Availability tone={SUPPLY_TONES[line.supply]} label={t(`Product.stock.${SUPPLY_LABELS[line.supply]}`)} className="mt-1" />
                    )}
                  </div>
                  <div className="flex w-full items-center justify-between gap-4 sm:w-auto">
                    {quantityControls(entry, line.description)}
                    <p className="min-w-20 text-right font-display text-lg font-bold">{price(line.unitPrice * line.quantity)}</p>
                  </div>
                </li>
              );
            })}
            {priced.unavailable.map((entry) => {
              const item = entry.kind === "product" ? itemById.get(entry.id) : undefined;
              const name = item ? `${item.brandName} ${item.model}` : entry.id;
              return (
                <li key={`gone-${entry.kind}-${entry.id}`} className="flex flex-wrap items-center gap-4 rounded-3xl border border-danger/30 bg-danger-soft p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{name}</p>
                    <p className="text-danger">{t("Cart.unavailable")}</p>
                  </div>
                  {quantityControls(entry, name)}
                </li>
              );
            })}
          </ul>

          {addablePackages.length > 0 && (
            <div className="grid gap-3">
              <h2 className="font-display text-xl font-bold">{t("Cart.packagesTitle")}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {addablePackages.map((pkg) => (
                  <li key={pkg.id} className="flex items-center gap-4 rounded-3xl border border-line bg-surface-1 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{translateDynamic(t, `Packages.${pkg.id}.name`)}</p>
                      <p className="text-[0.9375rem] text-fg-muted">{translateDynamic(t, `Packages.${pkg.id}.tagline`)}</p>
                      <p className="mt-1 font-bold">{price(pkg.price)}</p>
                    </div>
                    <form action={setCartQuantityAction.bind(null, "package", pkg.id, 1)}>
                      <button type="submit" className={buttonClass("secondary", "sm")}>
                        <Plus aria-hidden="true" className="size-4" />
                        {t("Cart.addPackage")}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="grid gap-5 rounded-[2rem] border border-line bg-ink p-5 shadow-[0_1px_2px_rgb(15_20_35/0.05)] sm:p-6 lg:sticky lg:top-24">
          <h2 className="sr-only">{t("Cart.summary")}</h2>
          <div className="flex gap-3 rounded-2xl bg-surface-1 p-4">
            <ModeIcon aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-accent-text" />
            <div>
              <p className="font-bold">{t(`Cart.mode.${priced.supply}.title`)}</p>
              <p className="mt-1 text-[0.9375rem] text-fg-muted">{t(`Cart.mode.${priced.supply}.text`)}</p>
            </div>
          </div>
          <p className="flex items-baseline justify-between border-b border-line pb-4">
            <span className="text-lg font-semibold">{t("Cart.total")}</span>
            <span className="font-display text-3xl font-extrabold">{price(priced.total)}</span>
          </p>
          {canCheckout ? (
            <CheckoutForm
              action={placeOrderAction.bind(null, locale)}
              labels={labels}
              towns={settings.serviceArea.towns.map((town) => ({ value: town, label: translateDynamic(t, `Local.towns.${town}`) }))}
              supply={priced.supply}
              total={priced.total}
            />
          ) : (
            <p role="alert" className="font-semibold text-danger">
              {t("Cart.problems.unavailable")}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
