import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { optionsFrom, ORDER_STATUS_TONE, SUPPLY_TONE } from "@/components/admin/labels";
import { CustomerLink, customerSearchText, RecordLink } from "@/components/admin/record-links";
import { type RecordRow, RecordTable } from "@/components/admin/record-table";
import { adminButton, adminCard } from "@/components/admin/styles";
import { Banner, PageHeader, Pill } from "@/components/admin/ui";
import { listCustomers, listInvoices, listOrders } from "@/lib/data/admin-repository";
import { orderChannels, orderStatuses, orderStatusesToCheck } from "@/lib/data/records";
import { supplies } from "@/lib/data/schema";
import { requireAdmin } from "@/server/admin/auth";
import { getAdminI18n } from "@/server/admin/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("Orders.title") };
}

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const [orders, customers, invoices, { q }, { t, formats }] = await Promise.all([
    listOrders(),
    listCustomers(),
    listInvoices(),
    searchParams,
    getAdminI18n(),
  ]);
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const invoiceByOrder = new Map(invoices.map((i) => [i.orderId, i]));
  const newestFirst = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const toCheck = newestFirst.filter((order) => orderStatusesToCheck.includes(order.status));

  const rows: RecordRow[] = newestFirst.map((order) => {
    const customer = customerById.get(order.customerId);
    const invoice = invoiceByOrder.get(order.id);
    return {
      id: order.id,
      search: `${order.number} ${customerSearchText(customer)} ${order.lines.map((l) => l.description).join(" ")}`.toLowerCase(),
      facets: { status: order.status, channel: order.channel, supply: order.supply },
      cells: {
        number: <RecordLink href={`/admin/orders/${order.id}`}>{order.number}</RecordLink>,
        date: formats.date.format(new Date(order.createdAt)),
        customer: <CustomerLink customer={customer} t={t} />,
        items: (
          <ul className="grid gap-0.5 text-[0.875rem]">
            {order.lines.map((line, i) => (
              <li key={i}>
                {line.quantity > 1 && `${line.quantity} × `}
                {line.description}
              </li>
            ))}
          </ul>
        ),
        supply: <Pill tone={SUPPLY_TONE[order.supply]}>{t(`Labels.supply.${order.supply}`)}</Pill>,
        channel: t(`Labels.orderChannel.${order.channel}`),
        total: <span className="font-semibold">{formats.euro.format(order.total)}</span>,
        status: <Pill tone={ORDER_STATUS_TONE[order.status]}>{t(`Labels.orderStatus.${order.status}`)}</Pill>,
        invoice: invoice ? <RecordLink href={`/admin/invoices?q=${invoice.number}`}>{invoice.number}</RecordLink> : <span className="text-fg-subtle">—</span>,
      },
    };
  });

  return (
    <>
      <PageHeader title={t("Orders.title")} description={t("Orders.description")} />

      {toCheck.length > 0 && (
        <section id="to-confirm" aria-labelledby="to-confirm-title" className="grid scroll-mt-6 gap-3">
          <h2 id="to-confirm-title" className="font-display text-xl font-bold">
            {t("Orders.toConfirmTitle", { count: toCheck.length })}
          </h2>
          <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {toCheck.map((order) => {
              const customer = customerById.get(order.customerId);
              return (
                <li key={order.id} className={`${adminCard} grid gap-2 border-danger/30 p-4`}>
                  <p className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold tabular-nums">{order.number}</span>
                    <Pill tone={ORDER_STATUS_TONE[order.status]}>{t(`Labels.orderStatus.${order.status}`)}</Pill>
                  </p>
                  <p className="text-[0.9375rem]">
                    {order.lines
                      .filter((line) => line.supply !== "in_store")
                      .map((line) => line.description)
                      .join(", ")}
                  </p>
                  <p className="text-[0.875rem] text-fg-muted">
                    {customer ? `${customer.firstName} ${customer.lastName}` : t("Common.unknownCustomer")} ·{" "}
                    {formats.date.format(new Date(order.createdAt))} · {formats.euro.format(order.total)}
                  </p>
                  <Link href={`/admin/orders/${order.id}`} className={adminButton("primary", "mt-1 w-fit")}>
                    {t("Orders.checkAndDecide")}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Banner tone="warning">
        <strong>{t("Orders.placeholderTitle")}</strong> {t("Orders.placeholderText")}
      </Banner>
      <RecordTable
        caption={t("Orders.caption")}
        searchPlaceholder={t("Orders.searchPlaceholder")}
        initialQuery={typeof q === "string" ? q : ""}
        minWidth="76rem"
        columns={[
          { key: "number", label: t("Orders.colOrder") },
          { key: "date", label: t("Orders.colDate") },
          { key: "customer", label: t("Orders.colCustomer") },
          { key: "items", label: t("Orders.colItems") },
          { key: "supply", label: t("Orders.colStock") },
          { key: "channel", label: t("Orders.colChannel") },
          { key: "total", label: t("Orders.colTotal"), align: "right" },
          { key: "status", label: t("Orders.colStatus") },
          { key: "invoice", label: t("Orders.colInvoice") },
        ]}
        filters={[
          {
            key: "status",
            label: t("Orders.status"),
            allLabel: t("Orders.allStatuses"),
            options: optionsFrom(orderStatuses, (s) => t(`Labels.orderStatus.${s}`)),
          },
          { key: "supply", label: t("Orders.stock"), allLabel: t("Orders.anyStock"), options: optionsFrom(supplies, (s) => t(`Labels.supply.${s}`)) },
          {
            key: "channel",
            label: t("Orders.channel"),
            allLabel: t("Orders.allChannels"),
            options: optionsFrom(orderChannels, (c) => t(`Labels.orderChannel.${c}`)),
          },
        ]}
        rows={rows}
      />
    </>
  );
}
