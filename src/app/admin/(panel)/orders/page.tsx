import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { adminDate, adminEuro, optionsOf, ORDER_CHANNEL, ORDER_STATUS, SUPPLY } from "@/components/admin/labels";
import { CustomerLink, customerSearchText, RecordLink } from "@/components/admin/record-links";
import { type RecordRow, RecordTable } from "@/components/admin/record-table";
import { adminButton, adminCard } from "@/components/admin/styles";
import { Banner, PageHeader, Pill } from "@/components/admin/ui";
import { listCustomers, listInvoices, listOrders } from "@/lib/data/admin-repository";
import { orderStatusesToCheck } from "@/lib/data/records";
import { requireAdmin } from "@/server/admin/auth";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const [orders, customers, invoices, { q }] = await Promise.all([listOrders(), listCustomers(), listInvoices(), searchParams]);
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const invoiceByOrder = new Map(invoices.map((i) => [i.orderId, i]));
  const newestFirst = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const toCheck = newestFirst.filter((order) => orderStatusesToCheck.includes(order.status));

  const rows: RecordRow[] = newestFirst.map((order) => {
    const customer = customerById.get(order.customerId);
    const invoice = invoiceByOrder.get(order.id);
    const status = ORDER_STATUS[order.status];
    return {
      id: order.id,
      search: `${order.number} ${customerSearchText(customer)} ${order.lines.map((l) => l.description).join(" ")}`.toLowerCase(),
      facets: { status: order.status, channel: order.channel, supply: order.supply },
      cells: {
        number: <RecordLink href={`/admin/orders/${order.id}`}>{order.number}</RecordLink>,
        date: adminDate.format(new Date(order.createdAt)),
        customer: <CustomerLink customer={customer} />,
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
        supply: <Pill tone={SUPPLY[order.supply].tone}>{SUPPLY[order.supply].label}</Pill>,
        channel: ORDER_CHANNEL[order.channel],
        total: <span className="font-semibold">{adminEuro.format(order.total)}</span>,
        status: <Pill tone={status.tone}>{status.label}</Pill>,
        invoice: invoice ? <RecordLink href={`/admin/invoices?q=${invoice.number}`}>{invoice.number}</RecordLink> : <span className="text-fg-subtle">—</span>,
      },
    };
  });

  return (
    <>
      <PageHeader title="Orders" description="Every sale, in store or online, newest first. Open an order to see its payment and act on it." />

      {toCheck.length > 0 && (
        <section id="to-confirm" aria-labelledby="to-confirm-title" className="grid scroll-mt-6 gap-3">
          <h2 id="to-confirm-title" className="font-display text-xl font-bold">
            Availability to confirm ({toCheck.length})
          </h2>
          <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {toCheck.map((order) => {
              const customer = customerById.get(order.customerId);
              return (
                <li key={order.id} className={`${adminCard} grid gap-2 border-danger/30 p-4`}>
                  <p className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold tabular-nums">{order.number}</span>
                    <Pill tone={ORDER_STATUS[order.status].tone}>{ORDER_STATUS[order.status].label}</Pill>
                  </p>
                  <p className="text-[0.9375rem]">
                    {order.lines
                      .filter((line) => line.supply !== "in_store")
                      .map((line) => line.description)
                      .join(", ")}
                  </p>
                  <p className="text-[0.875rem] text-fg-muted">
                    {customer ? `${customer.firstName} ${customer.lastName}` : "Unknown customer"} · {adminDate.format(new Date(order.createdAt))} ·{" "}
                    {adminEuro.format(order.total)}
                  </p>
                  <Link href={`/admin/orders/${order.id}`} className={adminButton("primary", "mt-1 w-fit")}>
                    Check and decide
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Banner tone="warning">
        <strong>Placeholder data mixed in.</strong> Orders NC-2026-0101 to NC-2026-0118 are examples from <code>data/orders.json</code>. Orders placed
        through the shop&rsquo;s checkout are real and appear next to them.
      </Banner>
      <RecordTable
        caption="Orders"
        searchPlaceholder="Search by order number, customer or phone…"
        initialQuery={typeof q === "string" ? q : ""}
        minWidth="76rem"
        columns={[
          { key: "number", label: "Order" },
          { key: "date", label: "Date" },
          { key: "customer", label: "Customer" },
          { key: "items", label: "Items" },
          { key: "supply", label: "Stock" },
          { key: "channel", label: "Channel" },
          { key: "total", label: "Total", align: "right" },
          { key: "status", label: "Status" },
          { key: "invoice", label: "Invoice" },
        ]}
        filters={[
          { key: "status", label: "Status", allLabel: "All statuses", options: optionsOf(ORDER_STATUS) },
          { key: "supply", label: "Stock", allLabel: "Any stock", options: optionsOf(SUPPLY) },
          { key: "channel", label: "Channel", allLabel: "All channels", options: optionsOf(ORDER_CHANNEL) },
        ]}
        rows={rows}
      />
    </>
  );
}
