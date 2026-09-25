import { NextResponse } from "next/server";
import { advisorRequestSchema } from "@/lib/advisor/contract";
import { getAdvisorMode, runAdvisor } from "@/server/advisor";
import { allowRequest, clientKey } from "@/server/advisor/rate-limit";

// Reads environment variables and the live catalogue on every request.
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

/** Tells the chat panel whether it runs on an AI provider or in demo mode. No secrets. */
export async function GET() {
  return NextResponse.json({ mode: getAdvisorMode() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!allowRequest(clientKey(request))) {
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

  const parsed = advisorRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const reply = await runAdvisor(parsed.data);
    return NextResponse.json(reply, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[advisor] Unexpected error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
