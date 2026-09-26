import type { Metadata } from "next";
import { adminDate, adminEuro, INVOICE_STATUS, optionsOf } from "@/components/admin/labels";
import { CustomerLink, customerSearchText, RecordLink } from "@/components/admin/record-links";
import { type RecordRow, RecordTable } from "@/components/admin/record-table";
import { PageHeader, Pill, PlaceholderDataBanner } from "@/components/admin/ui";
import { listCustomers, listInvoices, listOrders } from "@/lib/data/admin-repository";
import { requireAdmin } from "@/server/admin/auth";

// NOTE: orders, customers, trade-ins, tickets and invoices currently show placeholder data since there is
// no real checkout or customer flow yet — these screens are ready for real data once that's built.

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage({ searchParams }: PageProps<"/admin/invoices">) {
  await requireAdmin();
  const [invoices, orders, customers, { q }] = await Promise.all([listInvoices(), listOrders(), listCustomers(), searchParams]);
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const rows: RecordRow[] = [...invoices]
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    .map((invoice) => {
      const order = orderById.get(invoice.orderId);
      const customer = order ? customerById.get(order.customerId) : undefined;
      const status = INVOICE_STATUS[invoice.status];
      return {
        id: invoice.id,
        search: `${invoice.number} ${order?.number ?? ""} ${customerSearchText(customer)}`.toLowerCase(),
        facets: { status: invoice.status },
        cells: {
          number: <span className="font-semibold tabular-nums">{invoice.number}</span>,
          date: adminDate.format(new Date(invoice.issuedAt)),
          order: order ? <RecordLink href={`/admin/orders?q=${order.number}`}>{order.number}</RecordLink> : "—",
          customer: <CustomerLink customer={customer} />,
          net: adminEuro.format(invoice.totalExclVat),
          vat: adminEuro.format(invoice.vat),
          total: <span className="font-semibold">{adminEuro.format(invoice.total)}</span>,
          status: <Pill tone={status.tone}>{status.label}</Pill>,
        },
      };
    });

  return (
    <>
      <PageHeader title="Invoices" description="One invoice per paid order. Amounts include 20% VAT. PDF invoices come with the real checkout." />
      <PlaceholderDataBanner />
      <RecordTable
        caption="Invoices"
        searchPlaceholder="Search by invoice, order or customer…"
        initialQuery={typeof q === "string" ? q : ""}
        columns={[
          { key: "number", label: "Invoice" },
          { key: "date", label: "Date" },
          { key: "order", label: "Order" },
          { key: "customer", label: "Customer" },
          { key: "net", label: "Excl. VAT", align: "right" },
          { key: "vat", label: "VAT", align: "right" },
          { key: "total", label: "Total", align: "right" },
          { key: "status", label: "Status" },
        ]}
        filters={[{ key: "status", label: "Status", allLabel: "All statuses", options: optionsOf(INVOICE_STATUS) }]}
        rows={rows}
      />
    </>
  );
}
