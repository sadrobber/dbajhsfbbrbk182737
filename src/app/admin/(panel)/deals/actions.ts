"use server";

import { saveDeals } from "@/lib/data/admin-repository";
import { type Deal, dealSchema } from "@/lib/data/schema";
import { type ActionResult, failure, refreshEverywhere } from "@/server/admin/action-result";
import { requireAdmin } from "@/server/admin/auth";

export type DealInput = Pick<Deal, "productId" | "promoBadge" | "promoLabel">;

export async function saveDealsAction(entries: DealInput[]): Promise<ActionResult<Deal[]>> {
  await requireAdmin();
  try {
    const valid = dealSchema
      .array()
      .max(40)
      .parse(entries.map((entry, position) => ({ ...entry, id: "deal", position })));
    const saved = await saveDeals(valid.map(({ productId, promoBadge, promoLabel }) => ({ productId, promoBadge, promoLabel })));
    refreshEverywhere();
    return { ok: true, data: saved };
  } catch (error) {
    return failure(error);
  }
}
