import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * ============================================================================
 *  TEMPORARY ADMIN LOGIN: NOT production-grade authentication.
 * ============================================================================
 *  One shared email/password from environment variables, a signed cookie,
 *  no user accounts, no roles, no password hashing, no 2FA.
 *  Replace with real authentication before launch (see README, "Admin").
 *
 *  Used by src/proxy.ts (first gate) and by every admin page and server action
 *  (second gate), so it must not import "server-only".
 */

export const SESSION_COOKIE = "novacell_admin";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

/** Development-only fallback, used when ADMIN_EMAIL / ADMIN_PASSWORD are not set. Never used in production. */
export const DEV_CREDENTIALS = { email: "admin@novacell.test", password: "novacell-dev" } as const;

export type AdminCredentials = { email: string; password: string; source: "env" | "dev-default" };

export function getAdminCredentials(): AdminCredentials | null {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) return { email, password, source: "env" };
  if (process.env.NODE_ENV !== "production") return { ...DEV_CREDENTIALS, source: "dev-default" };
  // Production without credentials: the admin stays locked.
  return null;
}

function signingKey(credentials: AdminCredentials): string {
  // Tied to the credentials, so changing the password signs everyone out.
  return (
    process.env.ADMIN_SESSION_SECRET ||
    createHash("sha256").update(`novacell-admin|${credentials.email}|${credentials.password}`).digest("hex")
  );
}

function sign(payload: string, credentials: AdminCredentials): string {
  return createHmac("sha256", signingKey(credentials)).update(payload).digest("base64url");
}

function sameText(a: string, b: string): boolean {
  // Compare fixed-length digests so the timing says nothing about the secret.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export function checkCredentials(email: string, password: string): boolean {
  const credentials = getAdminCredentials();
  if (!credentials) return false;
  const emailOk = sameText(email.trim().toLowerCase(), credentials.email.toLowerCase());
  const passwordOk = sameText(password, credentials.password);
  return emailOk && passwordOk;
}

export function createSessionToken(now = Date.now()): string | null {
  const credentials = getAdminCredentials();
  if (!credentials) return null;
  const payload = Buffer.from(
    JSON.stringify({ sub: credentials.email, exp: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS }),
  ).toString("base64url");
  return `${payload}.${sign(payload, credentials)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): { email: string } | null {
  const credentials = getAdminCredentials();
  if (!credentials || !token) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  if (!sameText(signature, sign(payload, credentials))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: unknown; exp?: unknown };
    if (typeof data.exp !== "number" || data.exp * 1000 <= now) return null;
    if (data.sub !== credentials.email) return null;
    return { email: credentials.email };
  } catch {
    return null;
  }
}

/** Only same-site admin paths, so ?next= can't send people elsewhere. */
export function safeAdminRedirect(next: unknown): string {
  return typeof next === "string" && /^\/admin(\/[\w\-/]*)?(\?[\w\-=&%.]*)?$/.test(next) && !next.startsWith("/admin/login")
    ? next
    : "/admin";
}
