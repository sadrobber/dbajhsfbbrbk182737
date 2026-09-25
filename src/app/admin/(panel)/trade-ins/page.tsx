import type { Metadata } from "next";
import { adminDate, adminEuro, optionsOf, TRADE_IN_CONDITION, TRADE_IN_STATUS } from "@/components/admin/labels";
import { CustomerLink, customerSearchText, RecordLink } from "@/components/admin/record-links";
import { type RecordRow, RecordTable } from "@/components/admin/record-table";
import { PageHeader, Pill, PlaceholderDataBanner } from "@/components/admin/ui";
import { listCustomers, listOrders, listTradeIns } from "@/lib/data/admin-repository";
import { requireAdmin } from "@/server/admin/auth";

// NOTE: orders, customers, trade-ins, tickets and invoices currently show placeholder data since there is
// no real checkout or customer flow yet — these screens are ready for real data once that's built.

export const metadata: Metadata = { title: "Trade-ins" };

export default async function TradeInsPage({ searchParams }: PageProps<"/admin/trade-ins">) {
  await requireAdmin();
  const [tradeIns, customers, orders, { q }] = await Promise.all([listTradeIns(), listCustomers(), listOrders(), searchParams]);
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const waiting = tradeIns.filter((t) => t.status === "submitted").length;

  const rows: RecordRow[] = [...tradeIns]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((tradeIn) => {
      const customer = customerById.get(tradeIn.customerId);
      const order = tradeIn.orderId ? orderById.get(tradeIn.orderId) : undefined;
      const status = TRADE_IN_STATUS[tradeIn.status];
      const device = `${tradeIn.device.brand} ${tradeIn.device.model} · ${tradeIn.device.storageGb} GB`;
      return {
        id: tradeIn.id,
        search: `${device} ${customerSearchText(customer)} ${order?.number ?? ""}`.toLowerCase(),
        facets: { status: tradeIn.status, condition: tradeIn.condition },
        cells: {
          date: adminDate.format(new Date(tradeIn.createdAt)),
          customer: <CustomerLink customer={customer} />,
          device: <span className="font-semibold">{device}</span>,
          condition: TRADE_IN_CONDITION[tradeIn.condition],
          estimate: adminEuro.format(tradeIn.estimate),
          status: <Pill tone={status.tone}>{status.label}</Pill>,
          order: order ? <RecordLink href={`/admin/orders?q=${order.number}`}>{order.number}</RecordLink> : <span className="text-fg-subtle">—</span>,
        },
      };
    });

  return (
    <>
      <PageHeader
        title="Trade-ins"
        description={`Estimate requests for customers' old phones.${waiting > 0 ? ` ${waiting} new request${waiting > 1 ? "s" : ""} to answer.` : ""}`}
      />
      <PlaceholderDataBanner />
      <RecordTable
        caption="Trade-in requests"
        searchPlaceholder="Search by customer, phone model or order…"
        initialQuery={typeof q === "string" ? q : ""}
        columns={[
          { key: "date", label: "Requested" },
          { key: "customer", label: "Customer" },
          { key: "device", label: "Phone traded in" },
          { key: "condition", label: "Condition" },
          { key: "estimate", label: "Estimate", align: "right" },
          { key: "status", label: "Status" },
          { key: "order", label: "Used on order" },
        ]}
        filters={[
          { key: "status", label: "Status", allLabel: "All statuses", options: optionsOf(TRADE_IN_STATUS) },
          { key: "condition", label: "Condition", allLabel: "Any condition", options: optionsOf(TRADE_IN_CONDITION) },
        ]}
        rows={rows}
      />
    </>
  );
}
