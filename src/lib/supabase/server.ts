import "server-only";
import { createAdminClient } from "@supabase/server/core";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase on the server, with the SECRET key: bypasses Row Level Security.
 * Reads SUPABASE_URL and SUPABASE_SECRET_KEY from the environment.
 *
 * "server-only" makes the build fail if a client component imports this,
 * so the secret key can never reach the browser. Nothing in the browser
 * needs Supabase today; if that changes, add NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (never the secret key).
 */

let admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  // No user session is stored on this client, so one instance can serve every request.
  admin ??= createAdminClient();
  return admin;
}
