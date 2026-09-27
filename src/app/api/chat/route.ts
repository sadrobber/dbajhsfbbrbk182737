import { NextResponse } from "next/server";
import { supportRequestSchema } from "@/lib/support/contract";
import { allowRequest, clientKey } from "@/server/advisor/rate-limit";
import { getSupportMode, runSupport } from "@/server/support";

// Reads environment variables and the live catalogue on every request.
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32 * 1024;
const NO_STORE = { "Cache-Control": "no-store" };

/** Tells the chat whether an AI answers or only the contact details. No secrets. */
export async function GET() {
  return NextResponse.json({ mode: getSupportMode() }, { headers: NO_STORE });
}

/** The support chat: one visitor question (with the conversation so far) in, one short answer out. */
export async function POST(request: Request) {
  // Its own counter, separate from the "Help me choose" advisor's.
  if (!allowRequest(`support:${clientKey(request)}`)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = supportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    return NextResponse.json(await runSupport(parsed.data), { headers: NO_STORE });
  } catch (error) {
    console.error("[support] Unexpected error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
