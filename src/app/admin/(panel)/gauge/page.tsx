import type { Metadata } from "next";
import { GaugeManager } from "@/components/admin/gauge/gauge-manager";
import { getGauge, listTickets } from "@/lib/data/admin-repository";
import { requireAdmin } from "@/server/admin/auth";
import { getAdminI18n } from "@/server/admin/i18n";
import { getPreviewMessages } from "@/server/admin/preview-messages";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("Nav.gauge") };
}

export default async function GaugePage() {
  await requireAdmin();
  const [gauge, tickets] = await Promise.all([getGauge(), listTickets()]);
  return <GaugeManager gauge={gauge} ticketsIssued={tickets.length} messages={getPreviewMessages()} />;
}
