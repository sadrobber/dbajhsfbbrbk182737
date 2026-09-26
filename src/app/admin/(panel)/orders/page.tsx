import type { Metadata } from "next";
import { adminDate, adminEuro, optionsOf, ORDER_CHANNEL, ORDER_STATUS } from "@/components/admin/labels";
import { CustomerLink, customerSearchText, RecordLink } from "@/components/admin/record-links";
import { type RecordRow, RecordTable } from "@/components/admin/record-table";
import { PageHeader, Pill, PlaceholderDataBanner } from "@/components/admin/ui";
import { listCustomers, listInvoices, listOrders } from "@/lib/data/admin-repository";
import { requireAdmin } from "@/server/admin/auth";

// NOTE: orders, customers, trade-ins, tickets and invoices currently show placeholder data since there is
// no real checkout or customer flow yet — these screens are ready for real data once that's built.

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const [orders, customers, invoices, { q }] = await Promise.all([listOrders(), listCustomers(), listInvoices(), searchParams]);
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const invoiceByOrder = new Map(invoices.map((i) => [i.orderId, i]));

  const rows: RecordRow[] = [...orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((order) => {
      const customer = customerById.get(order.customerId);
      const invoice = invoiceByOrder.get(order.id);
      const status = ORDER_STATUS[order.status];
      return {
        id: order.id,
        search: `${order.number} ${customerSearchText(customer)} ${order.lines.map((l) => l.description).join(" ")}`.toLowerCase(),
        facets: { status: order.status, channel: order.channel },
        cells: {
          number: <span className="font-semibold tabular-nums">{order.number}</span>,
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
          channel: ORDER_CHANNEL[order.channel],
          total: <span className="font-semibold">{adminEuro.format(order.total)}</span>,
          status: <Pill tone={status.tone}>{status.label}</Pill>,
          invoice: invoice ? <RecordLink href={`/admin/invoices?q=${invoice.number}`}>{invoice.number}</RecordLink> : <span className="text-fg-subtle">—</span>,
        },
      };
    });

  return (
    <>
      <PageHeader title="Orders" description="Every sale, in store or online, newest first." />
      <PlaceholderDataBanner />
      <RecordTable
        caption="Orders"
        searchPlaceholder="Search by order number, customer or phone…"
        initialQuery={typeof q === "string" ? q : ""}
        minWidth="68rem"
        columns={[
          { key: "number", label: "Order" },
          { key: "date", label: "Date" },
          { key: "customer", label: "Customer" },
          { key: "items", label: "Items" },
          { key: "channel", label: "Channel" },
          { key: "total", label: "Total", align: "right" },
          { key: "status", label: "Status" },
          { key: "invoice", label: "Invoice" },
        ]}
        filters={[
          { key: "status", label: "Status", allLabel: "All statuses", options: optionsOf(ORDER_STATUS) },
          { key: "channel", label: "Channel", allLabel: "All channels", options: optionsOf(ORDER_CHANNEL) },
        ]}
        rows={rows}
      />
    </>
  );
}
