"use server";

import { saveGauge } from "@/lib/data/admin-repository";
import { type GaugeSettings, gaugeSchema } from "@/lib/data/schema";
import { type ActionResult, failure, refreshEverywhere } from "@/server/admin/action-result";
import { requireAdmin } from "@/server/admin/auth";

export async function saveGaugeAction(input: GaugeSettings): Promise<ActionResult<GaugeSettings>> {
  await requireAdmin();
  try {
    const saved = await saveGauge(gaugeSchema.parse(input));
    refreshEverywhere();
    return { ok: true, data: saved };
  } catch (error) {
    return failure(error);
  }
}
