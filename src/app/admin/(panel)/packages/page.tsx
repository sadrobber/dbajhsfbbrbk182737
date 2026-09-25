import type { Metadata } from "next";
import { PackagesManager } from "@/components/admin/packages/packages-manager";
import { listPackages } from "@/lib/data/admin-repository";
import { requireAdmin } from "@/server/admin/auth";
import { getPreviewMessages } from "@/server/admin/preview-messages";

export const metadata: Metadata = { title: "Packages" };

export default async function PackagesPage() {
  await requireAdmin();
  return <PackagesManager packages={await listPackages()} messages={getPreviewMessages()} />;
}
