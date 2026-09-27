import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fieldErrorsOf } from "@/components/admin/form-errors";
import { adminTranslateDynamic } from "@/i18n/admin";
import { AdminDataError } from "@/lib/data/admin-repository";
import { ReadOnlyStoreError } from "@/lib/data/json-store";
import { getAdminI18n } from "./i18n";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

type Failure = { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Turns expected failures into a message for the screen, in the staff
 * member's language; anything else is a real bug and is rethrown.
 */
export async function failure(error: unknown): Promise<Failure> {
  const { t } = await getAdminI18n();
  if (error instanceof z.ZodError) return { ok: false, error: t("Common.fieldsNeedAttention"), fieldErrors: fieldErrorsOf(error, t) };
  if (error instanceof AdminDataError) return { ok: false, error: adminTranslateDynamic(t, `Errors.${error.code}`, error.values) };
  if (error instanceof ReadOnlyStoreError) return { ok: false, error: t("Errors.readOnly") };
  throw error;
}

/** A message for the screen from an error code (messages/admin Errors.<code>). */
export async function failWith(code: AdminDataError["code"], values?: Record<string, string | number>): Promise<Failure> {
  return failure(new AdminDataError(code, values));
}

/** After a save: the shop pages and the admin re-render with the new data. */
export function refreshEverywhere(): void {
  revalidatePath("/[locale]", "layout");
  revalidatePath("/admin", "layout");
}
