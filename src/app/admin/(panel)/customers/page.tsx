import type { Metadata } from "next";
import { RecordLink } from "@/components/admin/record-links";
import { type RecordRow, RecordTable } from "@/components/admin/record-table";
import { PageHeader, Pill, PlaceholderDataBanner } from "@/components/admin/ui";
import { getMessagesFor } from "@/i18n/messages";
import { listCustomers, listOrders, listTickets, listTradeIns } from "@/lib/data/admin-repository";
import { requireAdmin } from "@/server/admin/auth";
import { getAdminI18n } from "@/server/admin/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("Customers.title") };
}

const count = (list: { customerId: string }[]) => {
  const counts = new Map<string, number>();
  for (const item of list) counts.set(item.customerId, (counts.get(item.customerId) ?? 0) + 1);
  return counts;
};

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireAdmin();
  const [customers, orders, tickets, tradeIns, { q }, { t, locale, formats }] = await Promise.all([
    listCustomers(),
    listOrders(),
    listTickets(),
    listTradeIns(),
    searchParams,
    getAdminI18n(),
  ]);
  // Town names are the shop's own labels, in the admin's language.
  const towns: Record<string, string> = { ...(getMessagesFor(locale).Local.towns as Record<string, string>), other: t("Customers.otherTown") };
  const orderCounts = count(orders);
  const ticketCounts = count(tickets);
  const tradeInCounts = count(tradeIns);

  const rows: RecordRow[] = [...customers]
    .sort((a, b) => a.lastName.localeCompare(b.lastName))
    .map((customer) => {
      const orderCount = orderCounts.get(customer.id) ?? 0;
      const ticketCount = ticketCounts.get(customer.id) ?? 0;
      const tradeInCount = tradeInCounts.get(customer.id) ?? 0;
      return {
        id: customer.id,
        search: `${customer.firstName} ${customer.lastName} ${customer.email} ${customer.phone} ${towns[customer.town] ?? customer.town}`.toLowerCase(),
        facets: { town: customer.town, marketing: customer.marketingOptIn ? "yes" : "no" },
        cells: {
          name: (
            <span className="font-semibold">
              {customer.firstName} {customer.lastName}
            </span>
          ),
          contact: (
            <span className="grid text-[0.875rem]">
              <a href={`mailto:${customer.email}`} className="text-accent-text underline-offset-2 hover:underline">
                {customer.email}
              </a>
              <span className="text-fg-muted">{customer.phone}</span>
            </span>
          ),
          town: towns[customer.town] ?? customer.town,
          since: formats.date.format(new Date(customer.createdAt)),
          orders: orderCount > 0 ? <RecordLink href={`/admin/orders?q=${encodeURIComponent(customer.email)}`}>{orderCount}</RecordLink> : "0",
          tickets: ticketCount > 0 ? <RecordLink href={`/admin/tickets?q=${encodeURIComponent(customer.email)}`}>{ticketCount}</RecordLink> : "0",
          tradeIns:
            tradeInCount > 0 ? <RecordLink href={`/admin/trade-ins?q=${encodeURIComponent(customer.email)}`}>{tradeInCount}</RecordLink> : "0",
          marketing: customer.marketingOptIn ? <Pill tone="success">{t("Common.yes")}</Pill> : <Pill>{t("Common.no")}</Pill>,
        },
      };
    });

  return (
    <>
      <PageHeader title={t("Customers.title")} description={t("Customers.description")} />
      <PlaceholderDataBanner t={t} />
      <RecordTable
        caption={t("Customers.caption")}
        searchPlaceholder={t("Customers.searchPlaceholder")}
        initialQuery={typeof q === "string" ? q : ""}
        minWidth="62rem"
        columns={[
          { key: "name", label: t("Customers.colName") },
          { key: "contact", label: t("Customers.colContact") },
          { key: "town", label: t("Customers.colTown") },
          { key: "since", label: t("Customers.colSince") },
          { key: "orders", label: t("Customers.colOrders"), align: "right" },
          { key: "tickets", label: t("Customers.colTickets"), align: "right" },
          { key: "tradeIns", label: t("Customers.colTradeIns"), align: "right" },
          { key: "marketing", label: t("Customers.colMarketing") },
        ]}
        filters={[
          {
            key: "town",
            label: t("Customers.town"),
            allLabel: t("Customers.allTowns"),
            options: Object.entries(towns).map(([value, label]) => ({ value, label })),
          },
          {
            key: "marketing",
            label: t("Customers.marketing"),
            allLabel: t("Customers.anyMarketing"),
            options: [
              { value: "yes", label: t("Customers.wantsNews") },
              { value: "no", label: t("Customers.noNews") },
            ],
          },
        ]}
        rows={rows}
      />
    </>
  );
}
