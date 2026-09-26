import type { Metadata } from "next";
import { GaugeManager } from "@/components/admin/gauge/gauge-manager";
import { getGauge, listTickets } from "@/lib/data/admin-repository";
import { requireAdmin } from "@/server/admin/auth";
import { getPreviewMessages } from "@/server/admin/preview-messages";

export const metadata: Metadata = { title: "Gauge" };

export default async function GaugePage() {
  await requireAdmin();
  const [gauge, tickets] = await Promise.all([getGauge(), listTickets()]);
  return <GaugeManager gauge={gauge} ticketsIssued={tickets.length} messages={getPreviewMessages()} />;
}
