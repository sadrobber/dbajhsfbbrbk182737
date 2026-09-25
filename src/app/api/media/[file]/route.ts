import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadsDirectory } from "@/lib/data/json-store";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };

/** Serves product photos uploaded in the admin (data/uploads). File names are random and never reused. */
export async function GET(_request: Request, { params }: RouteContext<"/api/media/[file]">) {
  const { file } = await params;
  const match = /^[a-z0-9-]+\.(jpg|png|webp|avif)$/.exec(file);
  if (!match) return new Response("Not found", { status: 404 });

  try {
    const bytes = await readFile(path.join(uploadsDirectory(), file));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": TYPES[match[1]],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
