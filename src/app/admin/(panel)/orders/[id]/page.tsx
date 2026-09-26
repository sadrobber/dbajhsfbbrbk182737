import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { adminDate, adminEuro, ORDER_CHANNEL, ORDER_STATUS, PAYMENT_STATUS, SUPPLY } from "@/components/admin/labels";
import { OrderDecision, RefreshPaymentButton } from "@/components/admin/orders/order-decision";
import { adminCard } from "@/components/admin/styles";
import { Banner, PageHeader, Pill } from "@/components/admin/ui";
import { getTranslator } from "@/i18n/messages";
import { getCustomer, getOrder, listBrands, listProducts } from "@/lib/data/admin-repository";
import { enrichCatalog, supplyOf } from "@/lib/data/catalog-logic";
import type { Payment } from "@/lib/data/records";
import { formatPrice } from "@/lib/format";
import { describeProduct } from "@/lib/orders/describe";
import { requireAdmin } from "@/server/admin/auth";
import { supplierConnector } from "@/server/suppliers";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[id]">): Promise<Metadata> {
  await requireAdmin();
  const order = await getOrder((await params).id);
  return { title: order ? `Order ${order.number}` : "Order" };
}

const LANGUAGES = { fr: "French", en: "English", it: "Italian" } as const;
/** Card authorisations last about 7 days at Stripe; after that the customer must pay again. */
const AUTHORISATION_DAYS = 7;
const adminDateTime = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });
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
  const [customer, products, brands] = await Promise.all([getCustomer(order.customerId), listProducts(), listBrands()]);
  const items = enrichCatalog({ currency: "EUR", brands, products });

  const status = ORDER_STATUS[order.status];
  const waiting = order.status === "awaiting_availability" || order.status === "quote_requested";
  const toSource = order.lines.filter((line) => line.productId && line.supply !== "in_store");
  const connector = supplierConnector();
  const answers = waiting ? await connector.checkOrder(toSource.map((line) => ({ productId: line.productId!, quantity: line.quantity }))) : [];

  // Alternatives staff can offer in one click: in-stock phones closest in price, in the customer's language.
  const wanted = toSource[0]?.productId ? items.find((item) => item.id === toSource[0].productId) : undefined;
  const t = getTranslator(order.locale);
  const suggestions = wanted
    ? items
        .filter((item) => item.id !== wanted.id && supplyOf(item) === "in_store")
        .sort((a, b) => Math.abs(a.price - wanted.price) - Math.abs(b.price - wanted.price))
        .slice(0, 3)
        .map((item) => `${describeProduct(t, item)}: ${formatPrice(order.locale, item.price)}`)
    : [];

  const { authorisedAt, expiresAt, expiresSoon } = authorisationWindow(order.payment);

  return (
    <>
      <Link href="/admin/orders" className="inline-flex w-fit items-center gap-2 font-semibold text-accent-text">
        <ArrowLeft aria-hidden="true" className="size-4" />
        All orders
      </Link>
      <PageHeader
        title={`Order ${order.number}`}
        description={`${adminDateTime.format(new Date(order.createdAt))} · ${ORDER_CHANNEL[order.channel]} · ${adminEuro.format(order.total)}`}
        actions={<Pill tone={status.tone}>{status.label}</Pill>}
      />

      {waiting && (
        <section aria-labelledby="decision-title" className={`${adminCard} grid gap-4 border-danger/30 p-5`}>
          <h2 id="decision-title" className="font-display text-xl font-bold">
            Availability to confirm
          </h2>
          <p className="max-w-3xl text-fg-muted">
            {order.status === "awaiting_availability"
              ? `The customer’s card is authorised for ${adminEuro.format(order.total)} but not charged. Check with your suppliers, then decide: “Available” charges the card, “Not available” cancels the authorisation so the customer pays nothing.`
              : "“On request” order: the customer paid nothing. Check with your suppliers, then decide. Either way, contact the customer to agree on the next step."}
          </p>
          {expiresAt && (
            <Banner tone={expiresSoon ? "warning" : "info"}>
              Authorised on {adminDateTime.format(authorisedAt!)}. Decide before about <strong>{adminDateTime.format(expiresAt)}</strong>: after
              that the bank drops the authorisation and the customer would have to pay again.
            </Banner>
          )}
          <div className="grid gap-2">
            <h3 className="font-semibold">To source · {connector.label}</h3>
            <ul className="grid gap-1.5">
              {toSource.map((line, index) => {
                const answer = answers.find((a) => a.productId === line.productId);
                return (
                  <li key={index} className="flex flex-wrap items-center gap-2">
                    <span>
                      {line.quantity} × {line.description}
                    </span>
                    <Pill tone={SUPPLY[line.supply].tone}>{SUPPLY[line.supply].label}</Pill>
                    {answer && answer.status !== "unknown" && (
                      <Pill tone={answer.status === "available" ? "success" : "danger"}>
                        Supplier: {answer.status === "available" ? "available" : "unavailable"}
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
            amount={adminEuro.format(order.total)}
            customerLanguage={LANGUAGES[order.locale]}
            suggestions={suggestions}
          />
        </section>
      )}

      {order.availabilityCheck && order.availabilityCheck.status !== "to_confirm" && (
        <Banner tone={order.availabilityCheck.status === "confirmed" ? "info" : "warning"}>
          <strong>{order.availabilityCheck.status === "confirmed" ? "Confirmed available" : "Declined: not available"}</strong>
          {order.availabilityCheck.checkedAt && ` on ${adminDateTime.format(new Date(order.availabilityCheck.checkedAt))}`}
          {order.availabilityCheck.checkedBy && ` by ${order.availabilityCheck.checkedBy}`}.
          {order.availabilityCheck.alternative && (
            <span className="mt-1 block whitespace-pre-line">Offered instead: {order.availabilityCheck.alternative}</span>
          )}
        </Banner>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_24rem]">
        <section aria-labelledby="lines-title" className={`${adminCard} overflow-x-auto p-5`}>
          <h2 id="lines-title" className="mb-3 font-display text-lg font-bold">
            Items
          </h2>
          <table className="w-full min-w-[36rem] border-collapse text-[0.9375rem]">
            <thead>
              <tr className="border-b border-line text-left text-[0.8125rem] uppercase tracking-[0.06em] text-fg-subtle">
                <th scope="col" className="py-2 pr-3 font-semibold">Item</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Stock</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Qty</th>
                <th scope="col" className="py-2 text-right font-semibold">Price</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line, index) => (
                <tr key={index} className="border-b border-line last:border-0">
                  <td className="py-2.5 pr-3">{line.description}</td>
                  <td className="py-2.5 pr-3">
                    <Pill tone={SUPPLY[line.supply].tone}>{SUPPLY[line.supply].label}</Pill>
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{line.quantity}</td>
                  <td className="py-2.5 text-right tabular-nums">{adminEuro.format(line.unitPrice * line.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={3} className="pt-3 text-right font-semibold">
                  Total
                </th>
                <td className="pt-3 text-right font-bold tabular-nums">{adminEuro.format(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <div className="grid gap-6">
          <section aria-labelledby="payment-title" className={`${adminCard} grid gap-3 p-5`}>
            <h2 id="payment-title" className="font-display text-lg font-bold">
              Payment
            </h2>
            {order.payment ? (
              <dl className="grid gap-2 text-[0.9375rem]">
                <Row term="Status">
                  <Pill tone={PAYMENT_STATUS[order.payment.status].tone}>{PAYMENT_STATUS[order.payment.status].label}</Pill>
                </Row>
                <Row term="Provider">{order.payment.provider === "stripe" ? "Stripe" : "Demo (no real payment)"}</Row>
                <Row term="Mode">{order.payment.capture === "manual" ? "Authorise now, charge after confirmation" : "Charged at checkout"}</Row>
                <Row term="Amount">{adminEuro.format(order.payment.amount)}</Row>
                {order.payment.authorizedAt && <Row term="Authorised">{adminDateTime.format(new Date(order.payment.authorizedAt))}</Row>}
                {order.payment.capturedAt && <Row term="Charged">{adminDateTime.format(new Date(order.payment.capturedAt))}</Row>}
                {order.payment.releasedAt && <Row term="Released">{adminDateTime.format(new Date(order.payment.releasedAt))}</Row>}
                {order.payment.paymentId && (
                  <Row term="Reference">
                    <code className="break-all text-[0.8125rem]">{order.payment.paymentId}</code>
                  </Row>
                )}
              </dl>
            ) : (
              <p className="text-fg-muted">No online payment{order.supply === "on_request" ? " (on request order)" : ""}.</p>
            )}
            {order.status === "pending_payment" && order.payment?.status === "pending" && <RefreshPaymentButton orderId={order.id} />}
          </section>

          <section aria-labelledby="customer-title" className={`${adminCard} grid gap-3 p-5`}>
            <h2 id="customer-title" className="font-display text-lg font-bold">
              Customer
            </h2>
            {customer ? (
              <dl className="grid gap-2 text-[0.9375rem]">
                <Row term="Name">
                  {customer.firstName} {customer.lastName}
                </Row>
                <Row term="Email">
                  <a href={`mailto:${customer.email}`} className="text-accent-text underline-offset-2 hover:underline">
                    {customer.email}
                  </a>
                </Row>
                <Row term="Phone">
                  <a href={`tel:${customer.phone.replace(/[^+0-9]/g, "")}`} className="text-accent-text underline-offset-2 hover:underline">
                    {customer.phone}
                  </a>
                </Row>
                <Row term="Language">{LANGUAGES[order.locale]}</Row>
                <Row term="Customer since">{adminDate.format(new Date(customer.createdAt))}</Row>
              </dl>
            ) : (
              <p className="text-fg-muted">Unknown customer.</p>
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
