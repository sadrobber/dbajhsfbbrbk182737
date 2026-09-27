import { CheckCircle2, Clock, CreditCard, Lightbulb, MessageSquareText, RefreshCw, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { ClearCart } from "@/components/checkout/clear-cart";
import { buttonClass, container } from "@/components/ui/styles";
import { getTranslator } from "@/i18n/messages";
import { Link } from "@/i18n/navigation";
import { intlLocale, routing } from "@/i18n/routing";
import { getCatalogItems, getOrder, getPackages } from "@/lib/data/queries";
import { formatPrice } from "@/lib/format";
import { describePackage, describeProduct } from "@/lib/orders/describe";
import { type OrderStage, stageOf } from "@/lib/orders/stage";
import { canViewOrder } from "@/server/orders/access";

// The link carries the order's secret: keep it out of search engines and referrers.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

const STAGE_ICONS: Record<OrderStage, typeof Clock> = {
  request_received: MessageSquareText,
  payment_pending: Clock,
  request_confirmed: CheckCircle2,
  availability_check: CreditCard,
  paid: CheckCircle2,
  preparing: Clock,
  ready: CheckCircle2,
  completed: CheckCircle2,
  unavailable: XCircle,
  cancelled: XCircle,
  refunded: XCircle,
};

/** The customer's view of their order, reached with the secret link from checkout. */
export default async function OrderPage({ params, searchParams }: PageProps<"/[locale]/orders/[id]">) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const { t: token } = await searchParams;

  const order = await getOrder(id);
  if (!order || !canViewOrder(order, typeof token === "string" ? token : undefined)) notFound();

  const t = getTranslator(locale);
  const [items, packages] = await Promise.all([getCatalogItems(), getPackages()]);
  // Lines are stored in English for staff; show them in the customer's language when the product still exists.
  const describe = (line: (typeof order.lines)[number]) => {
    const item = line.productId ? items.find((i) => i.id === line.productId) : undefined;
    const pkg = line.packageId ? packages.find((p) => p.id === line.packageId) : undefined;
    return item ? describeProduct(t, locale, item) : pkg ? describePackage(t, pkg) : line.description;
  };
  const stage = stageOf(order);
  const StageIcon = STAGE_ICONS[stage];
  const date = new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: "long", timeZone: "Europe/Paris" }).format(new Date(order.createdAt));
  const alternative = order.availabilityCheck?.status === "unavailable" ? order.availabilityCheck.alternative : null;

  return (
    <section className={`${container} grid max-w-3xl gap-6 py-10 sm:py-14`}>
      <ClearCart />
      <div>
        <h1 className="font-display text-[2.25rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-5xl">
          {t("Order.title", { number: order.number })}
        </h1>
        <p className="mt-2 text-fg-muted">{t("Order.placedOn", { date })}</p>
      </div>

      <div role="status" className="flex gap-4 rounded-3xl border border-line bg-surface-1 p-5">
        <StageIcon aria-hidden="true" className="mt-0.5 size-7 shrink-0 text-accent-text" />
        <div className="grid gap-2">
          <h2 className="font-display text-xl font-bold">{t(`Order.stage.${stage}.title`)}</h2>
          <p className="text-fg-muted">{t(`Order.stage.${stage}.text`)}</p>
          {stage === "payment_pending" && (
            // Checks the payment with the provider again, then comes back here.
            <a href={`/api/orders/${order.id}/return?t=${order.accessToken}`} className={buttonClass("secondary", "sm") + " w-fit"}>
              <RefreshCw aria-hidden="true" className="size-4" />
              {t("Order.refresh")}
            </a>
          )}
        </div>
      </div>

      {alternative && (
        <div className="flex gap-4 rounded-3xl border border-accent/30 bg-accent-soft p-5">
          <Lightbulb aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-accent-text" />
          <div>
            <h2 className="font-bold">{t("Order.alternative")}</h2>
            <p className="mt-1 whitespace-pre-line">{alternative}</p>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-line bg-ink p-5">
        <h2 className="font-display text-lg font-bold">{t("Order.items")}</h2>
        <ul className="mt-3 grid gap-2">
          {order.lines.map((line, index) => (
            <li key={index} className="flex justify-between gap-4">
              <span>
                {line.quantity > 1 && `${line.quantity} × `}
                {describe(line)}
              </span>
              <span className="font-semibold tabular-nums">{formatPrice(locale, line.unitPrice * line.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between border-t border-line pt-4 text-lg font-bold">
          <span>{t("Order.total")}</span>
          <span>{formatPrice(locale, order.total)}</span>
        </p>
        <p className="mt-3 text-fg-muted">{t("Order.pickup")}</p>
      </div>

      {order.payment?.provider === "demo" && <p className="rounded-2xl bg-warning-soft px-4 py-3 font-semibold">{t("Order.demo")}</p>}
      <p className="text-fg-muted">{t("Order.keepLink")}</p>
      <Link href="/" className={buttonClass("secondary", "md") + " w-fit"}>
        {t("Order.backToShop")}
      </Link>
    </section>
  );
}
