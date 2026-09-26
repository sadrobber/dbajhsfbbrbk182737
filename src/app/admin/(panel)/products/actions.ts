"use server";

import { randomUUID } from "node:crypto";
import { createProduct, deleteProduct, updateProduct } from "@/lib/data/admin-repository";
import { saveUpload } from "@/lib/data/json-store";
import { manualBadges, type Product, productSchema } from "@/lib/data/schema";
import { type ActionResult, failure, refreshEverywhere } from "@/server/admin/action-result";
import { requireAdmin } from "@/server/admin/auth";

export async function saveProductAction(input: Product, isNew: boolean): Promise<ActionResult<Product>> {
  await requireAdmin();
  try {
    // "Last one available" always follows the stock; staff can't set it by hand.
    const product = productSchema.parse({
      ...input,
      id: isNew ? "new-product" : input.id,
      badges: input.badges.filter((badge) => (manualBadges as readonly string[]).includes(badge)),
    });
    const { id, ...fields } = product;
    const saved = isNew ? await createProduct(fields) : await updateProduct({ ...fields, id });
    refreshEverywhere();
    return { ok: true, data: saved };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deleteProduct(String(id));
    refreshEverywhere();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Checks the file's first bytes, not just its name or declared type. */
function imageExtension(bytes: Uint8Array): "jpg" | "png" | "webp" | "avif" | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (ascii(1, 4) === "PNG" && bytes[0] === 0x89) return "png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) return "avif";
  return null;
}

/** Stores photos in data/uploads and returns their URLs. They are attached to the product when it is saved. */
export async function uploadProductPhotosAction(formData: FormData): Promise<ActionResult<string[]>> {
  await requireAdmin();
  const files = formData.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0) return { ok: false, error: "Choose at least one photo." };
  if (files.length > 6) return { ok: false, error: "Six photos at most per product." };

  try {
    const urls: string[] = [];
    for (const file of files) {
      if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: `"${file.name}" is over 5 MB.` };
      const bytes = new Uint8Array(await file.arrayBuffer());
      const extension = imageExtension(bytes);
      if (!extension) return { ok: false, error: `"${file.name}" isn't a JPEG, PNG, WebP or AVIF image.` };
      const name = `p-${randomUUID()}.${extension}`;
      await saveUpload(name, bytes);
      urls.push(`/api/media/${name}`);
    }
    return { ok: true, data: urls };
  } catch (error) {
    return failure(error);
  }
}
