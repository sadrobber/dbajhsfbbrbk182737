import type { Metadata } from "next";
import { adminDate } from "@/components/admin/labels";
import { RecordLink } from "@/components/admin/record-links";
import { type RecordRow, RecordTable } from "@/components/admin/record-table";
import { PageHeader, Pill, PlaceholderDataBanner } from "@/components/admin/ui";
import { getMessagesFor } from "@/i18n/messages";
import { listCustomers, listOrders, listTickets, listTradeIns } from "@/lib/data/admin-repository";
import { requireAdmin } from "@/server/admin/auth";

// NOTE: orders, customers, trade-ins, tickets and invoices currently show placeholder data since there is
// no real checkout or customer flow yet — these screens are ready for real data once that's built.

export const metadata: Metadata = { title: "Customers" };

const count = (list: { customerId: string }[]) => {
  const counts = new Map<string, number>();
  for (const item of list) counts.set(item.customerId, (counts.get(item.customerId) ?? 0) + 1);
  return counts;
};

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireAdmin();
  const [customers, orders, tickets, tradeIns, { q }] = await Promise.all([
    listCustomers(),
    listOrders(),
    listTickets(),
    listTradeIns(),
    searchParams,
  ]);
  const towns = getMessagesFor("en").Local.towns as Record<string, string>;
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
          since: adminDate.format(new Date(customer.createdAt)),
          orders: orderCount > 0 ? <RecordLink href={`/admin/orders?q=${encodeURIComponent(customer.email)}`}>{orderCount}</RecordLink> : "0",
          tickets: ticketCount > 0 ? <RecordLink href={`/admin/tickets?q=${encodeURIComponent(customer.email)}`}>{ticketCount}</RecordLink> : "0",
          tradeIns:
            tradeInCount > 0 ? <RecordLink href={`/admin/trade-ins?q=${encodeURIComponent(customer.email)}`}>{tradeInCount}</RecordLink> : "0",
          marketing: customer.marketingOptIn ? <Pill tone="success">Yes</Pill> : <Pill>No</Pill>,
        },
      };
    });

  return (
    <>
      <PageHeader title="Customers" description="People who bought, traded in or signed up in store." />
      <PlaceholderDataBanner />
      <RecordTable
        caption="Customers"
        searchPlaceholder="Search by name, email, phone or town…"
        initialQuery={typeof q === "string" ? q : ""}
        minWidth="62rem"
        columns={[
          { key: "name", label: "Name" },
          { key: "contact", label: "Contact" },
          { key: "town", label: "Town" },
          { key: "since", label: "Customer since" },
          { key: "orders", label: "Orders", align: "right" },
          { key: "tickets", label: "Tickets", align: "right" },
          { key: "tradeIns", label: "Trade-ins", align: "right" },
          { key: "marketing", label: "News by email" },
        ]}
        filters={[
          {
            key: "town",
            label: "Town",
            allLabel: "All towns",
            options: Object.entries(towns).map(([value, label]) => ({ value, label })),
          },
          {
            key: "marketing",
            label: "News by email",
            allLabel: "Any email preference",
            options: [
              { value: "yes", label: "Wants news by email" },
              { value: "no", label: "No news by email" },
            ],
          },
        ]}
        rows={rows}
      />
    </>
  );
}
