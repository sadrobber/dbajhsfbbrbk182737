/**
 * Simple in-memory limit per visitor, enough for a prototype on one server.
 * Behind several instances, move this to a shared store (e.g. Redis).
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

export function allowRequest(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > 5000) {
    for (const [k, times] of hits) if (times.every((time) => now - time >= WINDOW_MS)) hits.delete(k);
  }
  return true;
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}
