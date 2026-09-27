import type { Metadata } from "next";
import { INVOICE_STATUS_TONE, optionsFrom } from "@/components/admin/labels";
import { CustomerLink, customerSearchText, RecordLink } from "@/components/admin/record-links";
import { type RecordRow, RecordTable } from "@/components/admin/record-table";
import { PageHeader, Pill, PlaceholderDataBanner } from "@/components/admin/ui";
import { listCustomers, listInvoices, listOrders } from "@/lib/data/admin-repository";
import { invoiceStatuses } from "@/lib/data/records";
import { requireAdmin } from "@/server/admin/auth";
import { getAdminI18n } from "@/server/admin/i18n";

// NOTE: invoices are placeholder data until the real checkout issues them.

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("Invoices.title") };
}

export default async function InvoicesPage({ searchParams }: PageProps<"/admin/invoices">) {
  await requireAdmin();
  const [invoices, orders, customers, { q }, { t, formats }] = await Promise.all([
    listInvoices(),
    listOrders(),
    listCustomers(),
    searchParams,
    getAdminI18n(),
  ]);
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const rows: RecordRow[] = [...invoices]
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    .map((invoice) => {
      const order = orderById.get(invoice.orderId);
      const customer = order ? customerById.get(order.customerId) : undefined;
      return {
        id: invoice.id,
        search: `${invoice.number} ${order?.number ?? ""} ${customerSearchText(customer)}`.toLowerCase(),
        facets: { status: invoice.status },
        cells: {
          number: <span className="font-semibold tabular-nums">{invoice.number}</span>,
          date: formats.date.format(new Date(invoice.issuedAt)),
          order: order ? <RecordLink href={`/admin/orders/${order.id}`}>{order.number}</RecordLink> : "—",
          customer: <CustomerLink customer={customer} t={t} />,
          net: formats.euro.format(invoice.totalExclVat),
          vat: formats.euro.format(invoice.vat),
          total: <span className="font-semibold">{formats.euro.format(invoice.total)}</span>,
          status: <Pill tone={INVOICE_STATUS_TONE[invoice.status]}>{t(`Labels.invoiceStatus.${invoice.status}`)}</Pill>,
        },
      };
    });

  return (
    <>
      <PageHeader title={t("Invoices.title")} description={t("Invoices.description")} />
      <PlaceholderDataBanner t={t} />
      <RecordTable
        caption={t("Invoices.caption")}
        searchPlaceholder={t("Invoices.searchPlaceholder")}
        initialQuery={typeof q === "string" ? q : ""}
        columns={[
          { key: "number", label: t("Invoices.colInvoice") },
          { key: "date", label: t("Invoices.colDate") },
          { key: "order", label: t("Invoices.colOrder") },
          { key: "customer", label: t("Invoices.colCustomer") },
          { key: "net", label: t("Invoices.colNet"), align: "right" },
          { key: "vat", label: t("Invoices.colVat"), align: "right" },
          { key: "total", label: t("Invoices.colTotal"), align: "right" },
          { key: "status", label: t("Invoices.colStatus") },
        ]}
        filters={[
          {
            key: "status",
            label: t("Invoices.status"),
            allLabel: t("Invoices.allStatuses"),
            options: optionsFrom(invoiceStatuses, (s) => t(`Labels.invoiceStatus.${s}`)),
          },
        ]}
        rows={rows}
      />
    </>
  );
}
