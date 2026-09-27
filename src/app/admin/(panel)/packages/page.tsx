import type { Metadata } from "next";
import { PackagesManager } from "@/components/admin/packages/packages-manager";
import { listPackages } from "@/lib/data/admin-repository";
import { requireAdmin } from "@/server/admin/auth";
import { getAdminI18n } from "@/server/admin/i18n";
import { getPreviewMessages } from "@/server/admin/preview-messages";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("Nav.packages") };
}

export default async function PackagesPage() {
  await requireAdmin();
  return <PackagesManager packages={await listPackages()} messages={getPreviewMessages()} />;
}
