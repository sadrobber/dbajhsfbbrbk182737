import type { Metadata } from "next";
import Link from "next/link";
import { CustomerLink, customerSearchText, RecordLink } from "@/components/admin/record-links";
import { type RecordRow, RecordTable } from "@/components/admin/record-table";
import { adminCard } from "@/components/admin/styles";
import { PageHeader, Pill, PlaceholderDataBanner } from "@/components/admin/ui";
import { getGauge, listCustomers, listOrders, listTickets } from "@/lib/data/admin-repository";
import { requireAdmin } from "@/server/admin/auth";
import { getAdminI18n } from "@/server/admin/i18n";

// NOTE: tickets are placeholder data until paid orders issue them.

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("Tickets.title") };
}

export default async function TicketsPage({ searchParams }: PageProps<"/admin/tickets">) {
  await requireAdmin();
  const [tickets, customers, orders, gauge, { q }, { t, formats }] = await Promise.all([
    listTickets(),
    listCustomers(),
    listOrders(),
    getGauge(),
    searchParams,
    getAdminI18n(),
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
      const linkedOrders = [...new Map(sorted.flatMap((ticket) => {
        const order = orderById.get(ticket.orderId);
        return order ? [[order.id, order] as const] : [];
      })).values()];
      return {
        id: customerId,
        search: `${customerSearchText(customer)} ${sorted.map((ticket) => ticket.number).join(" ")} ${linkedOrders.map((o) => o.number).join(" ")}`.toLowerCase(),
        cells: {
          customer: <CustomerLink customer={customer} t={t} />,
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
              {sorted.map((ticket) => (
                <Pill key={ticket.id}>{ticket.number}</Pill>
              ))}
            </span>
          ),
          orders: (
            <span className="flex flex-wrap gap-x-2">
              {linkedOrders.map((order) => (
                <RecordLink key={order.id} href={`/admin/orders/${order.id}`}>
                  {order.number}
                </RecordLink>
              ))}
            </span>
          ),
          latest: formats.date.format(new Date(sorted[sorted.length - 1].issuedAt)),
        },
      };
    });

  return (
    <>
      <PageHeader title={t("Tickets.title")} description={t("Tickets.description")} />
      <PlaceholderDataBanner t={t} />
      <dl className={`${adminCard} grid grid-cols-2 gap-4 p-4 sm:grid-cols-4`}>
        <div>
          <dt className="text-[0.875rem] text-fg-muted">{t("Tickets.issued")}</dt>
          <dd className="font-display text-2xl font-extrabold">{tickets.length}</dd>
        </div>
        <div>
          <dt className="text-[0.875rem] text-fg-muted">{t("Tickets.customers")}</dt>
          <dd className="font-display text-2xl font-extrabold">{byCustomer.size}</dd>
        </div>
        <div>
          <dt className="text-[0.875rem] text-fg-muted">{t("Tickets.target")}</dt>
          <dd className="font-display text-2xl font-extrabold">
            {gauge.targetTickets} <span className="text-base font-semibold text-fg-muted">{t("Tickets.reached", { percent: share })}</span>
          </dd>
        </div>
        <div>
          <dt className="text-[0.875rem] text-fg-muted">{t("Tickets.gauge")}</dt>
          <dd className="font-display text-2xl font-extrabold">
            {gauge.enabled ? `${gauge.percent} %` : t("Tickets.hidden")}{" "}
            <Link href="/admin/gauge" className="text-base font-semibold text-accent-text underline">
              {t("Tickets.edit")}
            </Link>
          </dd>
        </div>
      </dl>
      <RecordTable
        caption={t("Tickets.caption")}
        searchPlaceholder={t("Tickets.searchPlaceholder")}
        initialQuery={typeof q === "string" ? q : ""}
        columns={[
          { key: "customer", label: t("Tickets.colCustomer") },
          { key: "count", label: t("Tickets.colCount"), align: "right" },
          { key: "numbers", label: t("Tickets.colNumbers") },
          { key: "orders", label: t("Tickets.colOrders") },
          { key: "latest", label: t("Tickets.colLatest") },
        ]}
        rows={rows}
      />
    </>
  );
}
