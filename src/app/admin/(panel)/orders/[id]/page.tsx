import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ORDER_STATUS_TONE, PAYMENT_STATUS_TONE, SUPPLY_TONE } from "@/components/admin/labels";
import { OrderDecision, RefreshPaymentButton } from "@/components/admin/orders/order-decision";
import { adminCard } from "@/components/admin/styles";
import { Banner, PageHeader, Pill } from "@/components/admin/ui";
import { getTranslator } from "@/i18n/messages";
import { getCustomer, getOrder, listBrands, listModels, listProducts } from "@/lib/data/admin-repository";
import { enrichCatalog, supplyOf } from "@/lib/data/catalog-logic";
import type { Payment } from "@/lib/data/records";
import { formatPrice } from "@/lib/format";
import { describeProduct } from "@/lib/orders/describe";
import { requireAdmin } from "@/server/admin/auth";
import { getAdminI18n } from "@/server/admin/i18n";
import { supplierConnector } from "@/server/suppliers";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[id]">): Promise<Metadata> {
  await requireAdmin();
  const [order, { t }] = await Promise.all([getOrder((await params).id), getAdminI18n()]);
  return { title: order ? t("OrderDetail.title", { number: order.number }) : t("Orders.title") };
}

/** Card authorisations last about 7 days at Stripe; after that the customer must pay again. */
const AUTHORISATION_DAYS = 7;
const DAY = 24 * 3600 * 1000;

/** When a card authorisation lapses, and whether that is less than two days away. */
function authorisationWindow(payment: Payment | null) {
  if (payment?.status !== "authorized" || !payment.authorizedAt) return { authorisedAt: null, expiresAt: null, expiresSoon: false };
  const authorisedAt = new Date(payment.authorizedAt);
  const expiresAt = new Date(authorisedAt.getTime() + AUTHORISATION_DAYS * DAY);
  return { authorisedAt, expiresAt, expiresSoon: expiresAt.getTime() - Date.now() < 2 * DAY };
}

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const order = await getOrder((await params).id);
  if (!order) notFound();
  const [customer, products, brands, models, { t, locale, formats }] = await Promise.all([
    getCustomer(order.customerId),
    listProducts(),
    listBrands(),
    listModels(),
    getAdminI18n(),
  ]);
  const items = enrichCatalog({ currency: "EUR", brands, models, products });

  const waiting = order.status === "awaiting_availability" || order.status === "quote_requested";
  const toSource = order.lines.filter((line) => line.productId && line.supply !== "in_store");
  const connector = supplierConnector();
  const answers = waiting ? await connector.checkOrder(toSource.map((line) => ({ productId: line.productId!, quantity: line.quantity }))) : [];

  // Alternatives staff can offer in one click: in-stock phones closest in price, in the customer's language.
  const wanted = toSource[0]?.productId ? items.find((item) => item.id === toSource[0].productId) : undefined;
  const customerT = getTranslator(order.locale);
  const suggestions = wanted
    ? items
        .filter((item) => item.id !== wanted.id && supplyOf(item) === "in_store")
        .sort((a, b) => Math.abs(a.price - wanted.price) - Math.abs(b.price - wanted.price))
        .slice(0, 3)
        .map((item) => `${describeProduct(customerT, order.locale, item)}: ${formatPrice(order.locale, item.price)}`)
    : [];

  const { authorisedAt, expiresAt, expiresSoon } = authorisationWindow(order.payment);
  const check = order.availabilityCheck;
  const dateTime = (iso: string) => formats.dateTime.format(new Date(iso));

  return (
    <>
      <Link href="/admin/orders" className="inline-flex w-fit items-center gap-2 font-semibold text-accent-text">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t("OrderDetail.allOrders")}
      </Link>
      <PageHeader
        title={t("OrderDetail.title", { number: order.number })}
        description={`${dateTime(order.createdAt)} · ${t(`Labels.orderChannel.${order.channel}`)} · ${formats.euro.format(order.total)}`}
        actions={<Pill tone={ORDER_STATUS_TONE[order.status]}>{t(`Labels.orderStatus.${order.status}`)}</Pill>}
      />

      {waiting && (
        <section aria-labelledby="decision-title" className={`${adminCard} grid gap-4 border-danger/30 p-5`}>
          <h2 id="decision-title" className="font-display text-xl font-bold">
            {t("OrderDetail.toConfirm")}
          </h2>
          <p className="max-w-3xl text-fg-muted">
            {order.status === "awaiting_availability"
              ? t("OrderDetail.explainAuthorised", { amount: formats.euro.format(order.total) })
              : t("OrderDetail.explainOnRequest")}
          </p>
          {expiresAt && authorisedAt && (
            <Banner tone={expiresSoon ? "warning" : "info"}>
              {t("OrderDetail.authorisedOn", {
                date: formats.dateTime.format(authorisedAt),
                deadline: formats.dateTime.format(expiresAt),
              })}
            </Banner>
          )}
          <div className="grid gap-2">
            <h3 className="font-semibold">{t("OrderDetail.toSource", { source: connector.label[locale] })}</h3>
            <ul className="grid gap-1.5">
              {toSource.map((line, index) => {
                const answer = answers.find((a) => a.productId === line.productId);
                return (
                  <li key={index} className="flex flex-wrap items-center gap-2">
                    <span>
                      {line.quantity} × {line.description}
                    </span>
                    <Pill tone={SUPPLY_TONE[line.supply]}>{t(`Labels.supply.${line.supply}`)}</Pill>
                    {answer && answer.status !== "unknown" && (
                      <Pill tone={answer.status === "available" ? "success" : "danger"}>
                        {answer.status === "available" ? t("OrderDetail.supplierAvailable") : t("OrderDetail.supplierUnavailable")}
                      </Pill>
                    )}
                    {answer?.note && <span className="text-[0.875rem] text-fg-muted">{answer.note}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
          <OrderDecision
            orderId={order.id}
            charges={order.status === "awaiting_availability"}
            amount={formats.euro.format(order.total)}
            customerLanguage={t(`OrderDetail.languages.${order.locale}`)}
            suggestions={suggestions}
          />
        </section>
      )}

      {check && check.status !== "to_confirm" && (
        <Banner tone={check.status === "confirmed" ? "info" : "warning"}>
          <strong>{check.status === "confirmed" ? t("OrderDetail.confirmedAvailable") : t("OrderDetail.declined")}</strong>
          {check.checkedAt && t("OrderDetail.checkedOn", { date: dateTime(check.checkedAt) })}
          {check.checkedBy && t("OrderDetail.checkedBy", { email: check.checkedBy })}.
          {check.alternative && (
            <span className="mt-1 block whitespace-pre-line">{t("OrderDetail.offeredInstead", { text: check.alternative })}</span>
          )}
        </Banner>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_24rem]">
        <section aria-labelledby="lines-title" className={`${adminCard} overflow-x-auto p-5`}>
          <h2 id="lines-title" className="mb-3 font-display text-lg font-bold">
            {t("OrderDetail.items")}
          </h2>
          <table className="w-full min-w-[36rem] border-collapse text-[0.9375rem]">
            <thead>
              <tr className="border-b border-line text-left text-[0.8125rem] uppercase tracking-[0.06em] text-fg-subtle">
                <th scope="col" className="py-2 pr-3 font-semibold">
                  {t("OrderDetail.colItem")}
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  {t("OrderDetail.colStock")}
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">
                  {t("OrderDetail.colQty")}
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  {t("OrderDetail.colPrice")}
                </th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line, index) => (
                <tr key={index} className="border-b border-line last:border-0">
                  <td className="py-2.5 pr-3">{line.description}</td>
                  <td className="py-2.5 pr-3">
                    <Pill tone={SUPPLY_TONE[line.supply]}>{t(`Labels.supply.${line.supply}`)}</Pill>
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{line.quantity}</td>
                  <td className="py-2.5 text-right tabular-nums">{formats.euro.format(line.unitPrice * line.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={3} className="pt-3 text-right font-semibold">
                  {t("OrderDetail.total")}
                </th>
                <td className="pt-3 text-right font-bold tabular-nums">{formats.euro.format(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <div className="grid gap-6">
          <section aria-labelledby="payment-title" className={`${adminCard} grid gap-3 p-5`}>
            <h2 id="payment-title" className="font-display text-lg font-bold">
              {t("OrderDetail.payment")}
            </h2>
            {order.payment ? (
              <dl className="grid gap-2 text-[0.9375rem]">
                <Row term={t("OrderDetail.paymentStatus")}>
                  <Pill tone={PAYMENT_STATUS_TONE[order.payment.status]}>{t(`Labels.paymentStatus.${order.payment.status}`)}</Pill>
                </Row>
                <Row term={t("OrderDetail.provider")}>{order.payment.provider === "stripe" ? "Stripe" : t("OrderDetail.providerDemo")}</Row>
                <Row term={t("OrderDetail.mode")}>
                  {order.payment.capture === "manual" ? t("OrderDetail.modeManual") : t("OrderDetail.modeAutomatic")}
                </Row>
                <Row term={t("OrderDetail.amount")}>{formats.euro.format(order.payment.amount)}</Row>
                {order.payment.authorizedAt && <Row term={t("OrderDetail.authorised")}>{dateTime(order.payment.authorizedAt)}</Row>}
                {order.payment.capturedAt && <Row term={t("OrderDetail.charged")}>{dateTime(order.payment.capturedAt)}</Row>}
                {order.payment.releasedAt && <Row term={t("OrderDetail.released")}>{dateTime(order.payment.releasedAt)}</Row>}
                {order.payment.paymentId && (
                  <Row term={t("OrderDetail.reference")}>
                    <code className="break-all text-[0.8125rem]">{order.payment.paymentId}</code>
                  </Row>
                )}
              </dl>
            ) : (
              <p className="text-fg-muted">
                {order.supply === "on_request" ? t("OrderDetail.noPaymentOnRequest") : t("OrderDetail.noPayment")}
              </p>
            )}
            {order.status === "pending_payment" && order.payment?.status === "pending" && <RefreshPaymentButton orderId={order.id} />}
          </section>

          <section aria-labelledby="customer-title" className={`${adminCard} grid gap-3 p-5`}>
            <h2 id="customer-title" className="font-display text-lg font-bold">
              {t("OrderDetail.customer")}
            </h2>
            {customer ? (
              <dl className="grid gap-2 text-[0.9375rem]">
                <Row term={t("OrderDetail.name")}>
                  {customer.firstName} {customer.lastName}
                </Row>
                <Row term={t("OrderDetail.email")}>
                  <a href={`mailto:${customer.email}`} className="text-accent-text underline-offset-2 hover:underline">
                    {customer.email}
                  </a>
                </Row>
                <Row term={t("OrderDetail.phone")}>
                  <a href={`tel:${customer.phone.replace(/[^+0-9]/g, "")}`} className="text-accent-text underline-offset-2 hover:underline">
                    {customer.phone}
                  </a>
                </Row>
                <Row term={t("OrderDetail.language")}>{t(`OrderDetail.languages.${order.locale}`)}</Row>
                <Row term={t("OrderDetail.customerSince")}>{formats.date.format(new Date(customer.createdAt))}</Row>
              </dl>
            ) : (
              <p className="text-fg-muted">{t("Common.unknownCustomer")}</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2">
      <dt className="text-fg-muted">{term}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
