import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/** Current admin, or null. */
export async function getAdminSession(): Promise<{ email: string } | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/**
 * Call at the top of every admin page and every admin server action:
 * server actions can be called directly with a POST, whatever the proxy does.
 */
export async function requireAdmin(): Promise<{ email: string }> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
