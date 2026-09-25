"use server";

import { savePackage } from "@/lib/data/admin-repository";
import { type PackageDefinition, packageSchema } from "@/lib/data/schema";
import { type ActionResult, failure, refreshEverywhere } from "@/server/admin/action-result";
import { requireAdmin } from "@/server/admin/auth";

export async function savePackagesAction(packages: PackageDefinition[]): Promise<ActionResult<PackageDefinition[]>> {
  await requireAdmin();
  try {
    const valid = packageSchema.array().max(10).parse(packages);
    for (const pkg of valid) await savePackage(pkg);
    refreshEverywhere();
    return { ok: true, data: valid };
  } catch (error) {
    return failure(error);
  }
}
