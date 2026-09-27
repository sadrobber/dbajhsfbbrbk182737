import type { Metadata } from "next";
import { optionsFrom, TRADE_IN_STATUS_TONE } from "@/components/admin/labels";
import { CustomerLink, customerSearchText, RecordLink } from "@/components/admin/record-links";
import { type RecordRow, RecordTable } from "@/components/admin/record-table";
import { storageText } from "@/components/admin/stock";
import { PageHeader, Pill, PlaceholderDataBanner } from "@/components/admin/ui";
import { listCustomers, listOrders, listTradeIns } from "@/lib/data/admin-repository";
import { tradeInConditions, tradeInStatuses } from "@/lib/data/records";
import { requireAdmin } from "@/server/admin/auth";
import { getAdminI18n } from "@/server/admin/i18n";

// NOTE: trade-ins are placeholder data until the trade-in wizard exists.

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("TradeIns.title") };
}

export default async function TradeInsPage({ searchParams }: PageProps<"/admin/trade-ins">) {
  await requireAdmin();
  const [tradeIns, customers, orders, { q }, { t, formats }] = await Promise.all([
    listTradeIns(),
    listCustomers(),
    listOrders(),
    searchParams,
    getAdminI18n(),
  ]);
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const waiting = tradeIns.filter((tradeIn) => tradeIn.status === "submitted").length;

  const rows: RecordRow[] = [...tradeIns]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((tradeIn) => {
      const customer = customerById.get(tradeIn.customerId);
      const order = tradeIn.orderId ? orderById.get(tradeIn.orderId) : undefined;
      const device = `${tradeIn.device.brand} ${tradeIn.device.model} · ${storageText(t, tradeIn.device.storageGb)}`;
      return {
        id: tradeIn.id,
        search: `${device} ${customerSearchText(customer)} ${order?.number ?? ""}`.toLowerCase(),
        facets: { status: tradeIn.status, condition: tradeIn.condition },
        cells: {
          date: formats.date.format(new Date(tradeIn.createdAt)),
          customer: <CustomerLink customer={customer} t={t} />,
          device: <span className="font-semibold">{device}</span>,
          condition: t(`Labels.tradeInCondition.${tradeIn.condition}`),
          estimate: formats.euro.format(tradeIn.estimate),
          status: <Pill tone={TRADE_IN_STATUS_TONE[tradeIn.status]}>{t(`Labels.tradeInStatus.${tradeIn.status}`)}</Pill>,
          order: order ? <RecordLink href={`/admin/orders/${order.id}`}>{order.number}</RecordLink> : <span className="text-fg-subtle">—</span>,
        },
      };
    });

  return (
    <>
      <PageHeader
        title={t("TradeIns.title")}
        description={`${t("TradeIns.description")}${waiting > 0 ? ` ${t("TradeIns.waiting", { count: waiting })}` : ""}`}
      />
      <PlaceholderDataBanner t={t} />
      <RecordTable
        caption={t("TradeIns.caption")}
        searchPlaceholder={t("TradeIns.searchPlaceholder")}
        initialQuery={typeof q === "string" ? q : ""}
        columns={[
          { key: "date", label: t("TradeIns.colRequested") },
          { key: "customer", label: t("TradeIns.colCustomer") },
          { key: "device", label: t("TradeIns.colDevice") },
          { key: "condition", label: t("TradeIns.colCondition") },
          { key: "estimate", label: t("TradeIns.colEstimate"), align: "right" },
          { key: "status", label: t("TradeIns.colStatus") },
          { key: "order", label: t("TradeIns.colOrder") },
        ]}
        filters={[
          {
            key: "status",
            label: t("TradeIns.status"),
            allLabel: t("TradeIns.allStatuses"),
            options: optionsFrom(tradeInStatuses, (s) => t(`Labels.tradeInStatus.${s}`)),
          },
          {
            key: "condition",
            label: t("TradeIns.condition"),
            allLabel: t("TradeIns.anyCondition"),
            options: optionsFrom(tradeInConditions, (c) => t(`Labels.tradeInCondition.${c}`)),
          },
        ]}
        rows={rows}
      />
    </>
  );
}
