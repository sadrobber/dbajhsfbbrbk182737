import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fieldErrorsOf } from "@/components/admin/form-errors";
import { AdminDataError } from "@/lib/data/admin-repository";
import { ReadOnlyStoreError } from "@/lib/data/json-store";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Turns expected failures into a message for the screen; anything else is a real bug and is rethrown. */
export function failure(error: unknown): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  if (error instanceof z.ZodError) return { ok: false, error: "Some fields need attention.", fieldErrors: fieldErrorsOf(error) };
  if (error instanceof AdminDataError || error instanceof ReadOnlyStoreError) return { ok: false, error: error.message };
  throw error;
}

/** After a save: the shop pages and the admin re-render with the new data. */
export function refreshEverywhere(): void {
  revalidatePath("/[locale]", "layout");
  revalidatePath("/admin", "layout");
}
