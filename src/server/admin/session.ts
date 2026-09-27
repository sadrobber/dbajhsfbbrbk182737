import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * ============================================================================
 *  TEMPORARY ADMIN LOGIN: NOT production-grade authentication.
 * ============================================================================
 *  Email/password pairs from environment variables, a signed cookie, no roles,
 *  no password hashing, no 2FA, no password reset.
 *  Replace with real authentication before launch (see README, "Admin").
 *
 *  One pair per person (hosts don't allow two variables with the same name):
 *    ADMIN_EMAIL    / ADMIN_PASSWORD        first person
 *    ADMIN_EMAIL_2  / ADMIN_PASSWORD_2      second person
 *    ADMIN_EMAIL_X  / ADMIN_PASSWORD_X      any suffix of letters, digits, "_"
 *  Removing a pair signs that person out; changing a password signs them out too.
 *
 *  Used by src/proxy.ts (first gate) and by every admin page and server action
 *  (second gate), so it must not import "server-only".
 */

export const SESSION_COOKIE = "novacell_admin";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

/** Development-only fallback, used when no admin is set in the environment. Never used in production. */
export const DEV_CREDENTIALS = { email: "admin@novacell.test", password: "novacell-dev" } as const;

export type AdminAccount = { email: string; password: string };
export type AdminAccounts = { accounts: AdminAccount[]; source: "env" | "dev-default" };

const warned = new Set<string>();
function warnOnce(message: string) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`[admin] ${message}`);
}

/** "", then the suffixes of ADMIN_EMAIL_<suffix> in a stable order (2 before 10). */
function accountSuffixes(): string[] {
  const suffixes = Object.keys(process.env).flatMap((name) => {
    const match = /^ADMIN_EMAIL(_[A-Za-z0-9_]+)$/.exec(name);
    return match ? [match[1]] : [];
  });
  return ["", ...suffixes.sort((a, b) => a.localeCompare(b, "en", { numeric: true }))];
}

/** Everyone who may sign in to the admin, or null when the admin is locked (production without accounts). */
export function getAdminAccounts(): AdminAccounts | null {
  const accounts: AdminAccount[] = [];
  const seen = new Set<string>();
  for (const suffix of accountSuffixes()) {
    const email = process.env[`ADMIN_EMAIL${suffix}`]?.trim();
    const password = process.env[`ADMIN_PASSWORD${suffix}`];
    if (!email && !password) continue;
    if (!email || !password) {
      warnOnce(`ADMIN_EMAIL${suffix} and ADMIN_PASSWORD${suffix} go together: this person can't sign in until both are set.`);
      continue;
    }
    if (seen.has(email.toLowerCase())) {
      warnOnce(`${email} is set twice (ADMIN_EMAIL${suffix}): only the first one counts.`);
      continue;
    }
    seen.add(email.toLowerCase());
    accounts.push({ email, password });
  }
  if (accounts.length > 0) return { accounts, source: "env" };
  if (process.env.NODE_ENV !== "production") return { accounts: [{ ...DEV_CREDENTIALS }], source: "dev-default" };
  // Production without accounts: the admin stays locked.
  return null;
}

function findAccount(email: string): AdminAccount | null {
  const wanted = email.trim().toLowerCase();
  return getAdminAccounts()?.accounts.find((account) => account.email.toLowerCase() === wanted) ?? null;
}

function signingKey(account: AdminAccount): string {
  // One key per person, tied to their password: changing it signs only them out.
  const secret = process.env.ADMIN_SESSION_SECRET || "novacell-admin";
  return createHash("sha256").update(`${secret}|${account.email}|${account.password}`).digest("hex");
}

function sign(payload: string, account: AdminAccount): string {
  return createHmac("sha256", signingKey(account)).update(payload).digest("base64url");
}

function sameText(a: string, b: string): boolean {
  // Compare fixed-length digests so the timing says nothing about the secret.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

/** The signed-in person's email when the pair matches an admin account, otherwise null. */
export function checkCredentials(email: string, password: string): string | null {
  const accounts = getAdminAccounts()?.accounts ?? [];
  const typed = email.trim().toLowerCase();
  let match: string | null = null;
  // Check every account, so the time taken doesn't reveal which emails exist.
  for (const account of accounts) {
    const emailOk = sameText(typed, account.email.toLowerCase());
    const passwordOk = sameText(password, account.password);
    if (emailOk && passwordOk && match === null) match = account.email;
  }
  return match;
}

export function createSessionToken(email: string, now = Date.now()): string | null {
  const account = findAccount(email);
  if (!account) return null;
  const payload = Buffer.from(
    JSON.stringify({ sub: account.email, exp: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS }),
  ).toString("base64url");
  return `${payload}.${sign(payload, account)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): { email: string } | null {
  if (!token) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: unknown; exp?: unknown };
    if (typeof data.sub !== "string" || typeof data.exp !== "number") return null;
    // Whose key signed it: that person must still be an admin.
    const account = findAccount(data.sub);
    if (!account || account.email !== data.sub) return null;
    if (!sameText(signature, sign(payload, account))) return null;
    if (data.exp * 1000 <= now) return null;
    return { email: account.email };
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
