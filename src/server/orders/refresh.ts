import "server-only";
import { revalidatePath } from "next/cache";

/** After an order changes stock or status: shop pages show the new stock, the admin the new status. */
export function refreshAfterOrderChange(): void {
  revalidatePath("/[locale]", "layout");
  revalidatePath("/admin", "layout");
}
