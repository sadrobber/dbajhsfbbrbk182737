import type { Metadata } from "next";
import Link from "next/link";
import { adminDate } from "@/components/admin/labels";
import { CustomerLink, customerSearchText, RecordLink } from "@/components/admin/record-links";
import { type RecordRow, RecordTable } from "@/components/admin/record-table";
import { adminCard } from "@/components/admin/styles";
import { PageHeader, Pill, PlaceholderDataBanner } from "@/components/admin/ui";
import { getGauge, listCustomers, listOrders, listTickets } from "@/lib/data/admin-repository";
import { requireAdmin } from "@/server/admin/auth";

// NOTE: orders, customers, trade-ins, tickets and invoices currently show placeholder data since there is
// no real checkout or customer flow yet — these screens are ready for real data once that's built.

export const metadata: Metadata = { title: "Tickets" };

export default async function TicketsPage({ searchParams }: PageProps<"/admin/tickets">) {
  await requireAdmin();
  const [tickets, customers, orders, gauge, { q }] = await Promise.all([
    listTickets(),
    listCustomers(),
    listOrders(),
    getGauge(),
    searchParams,
  ]);
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const orderById = new Map(orders.map((o) => [o.id, o]));

  // One row per customer: how many tickets they hold for the current Gauge.
  const byCustomer = new Map<string, typeof tickets>();
  for (const ticket of tickets) byCustomer.set(ticket.customerId, [...(byCustomer.get(ticket.customerId) ?? []), ticket]);
  const most = Math.max(1, ...[...byCustomer.values()].map((list) => list.length));
  const share = Math.round((tickets.length / gauge.targetTickets) * 100);

  const rows: RecordRow[] = [...byCustomer.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([customerId, list]) => {
      const customer = customerById.get(customerId);
      const sorted = [...list].sort((a, b) => a.issuedAt.localeCompare(b.issuedAt));
      const orderNumbers = [...new Set(sorted.map((t) => orderById.get(t.orderId)?.number).filter(Boolean))] as string[];
      return {
        id: customerId,
        search: `${customerSearchText(customer)} ${sorted.map((t) => t.number).join(" ")} ${orderNumbers.join(" ")}`.toLowerCase(),
        cells: {
          customer: <CustomerLink customer={customer} />,
          count: (
            <span className="flex items-center justify-end gap-3">
              <span aria-hidden="true" className="hidden h-2 w-24 overflow-hidden rounded-full bg-surface-2 sm:block">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${(list.length / most) * 100}%` }} />
              </span>
              <span className="font-display text-lg font-extrabold">{list.length}</span>
            </span>
          ),
          numbers: (
            <span className="flex flex-wrap gap-1">
              {sorted.map((t) => (
                <Pill key={t.id}>{t.number}</Pill>
              ))}
            </span>
          ),
          orders: (
            <span className="flex flex-wrap gap-x-2">
              {orderNumbers.map((number) => (
                <RecordLink key={number} href={`/admin/orders?q=${number}`}>
                  {number}
                </RecordLink>
              ))}
            </span>
          ),
          latest: adminDate.format(new Date(sorted[sorted.length - 1].issuedAt)),
        },
      };
    });

  return (
    <>
      <PageHeader
        title="Tickets"
        description="Gauge tickets: one per phone or package on a paid order. This is who takes part in the next draw, and with how many chances."
      />
      <PlaceholderDataBanner />
      <dl className={`${adminCard} grid grid-cols-2 gap-4 p-4 sm:grid-cols-4`}>
        <div>
          <dt className="text-[0.875rem] text-fg-muted">Tickets issued</dt>
          <dd className="font-display text-2xl font-extrabold">{tickets.length}</dd>
        </div>
        <div>
          <dt className="text-[0.875rem] text-fg-muted">Customers taking part</dt>
          <dd className="font-display text-2xl font-extrabold">{byCustomer.size}</dd>
        </div>
        <div>
          <dt className="text-[0.875rem] text-fg-muted">Draw target</dt>
          <dd className="font-display text-2xl font-extrabold">
            {gauge.targetTickets} <span className="text-base font-semibold text-fg-muted">({share}% reached)</span>
          </dd>
        </div>
        <div>
          <dt className="text-[0.875rem] text-fg-muted">Gauge on the homepage</dt>
          <dd className="font-display text-2xl font-extrabold">
            {gauge.enabled ? `${gauge.percent}%` : "Hidden"}{" "}
            <Link href="/admin/gauge" className="text-base font-semibold text-accent-text underline">
              Edit
            </Link>
          </dd>
        </div>
      </dl>
      <RecordTable
        caption="Tickets per customer"
        searchPlaceholder="Search by customer, ticket or order number…"
        initialQuery={typeof q === "string" ? q : ""}
        columns={[
          { key: "customer", label: "Customer" },
          { key: "count", label: "Tickets", align: "right" },
          { key: "numbers", label: "Ticket numbers" },
          { key: "orders", label: "From orders" },
          { key: "latest", label: "Latest ticket" },
        ]}
        rows={rows}
      />
    </>
  );
}
