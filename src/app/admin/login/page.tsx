import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/layout/wordmark";
import { getAdminSession } from "@/server/admin/auth";
import { DEV_CREDENTIALS, getAdminCredentials, safeAdminRedirect } from "@/server/admin/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next } = await searchParams;
  const target = safeAdminRedirect(next);
  if (await getAdminSession()) redirect(target);
  const credentials = getAdminCredentials();

  return (
    <main className="grid min-h-dvh place-items-center bg-night px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-white">
          <Wordmark onDark />
          <span className="ml-2 align-middle text-[0.9375rem] font-semibold uppercase tracking-[0.14em] text-night-muted">Admin</span>
        </p>
        <div className="rounded-3xl bg-ink p-6 shadow-card sm:p-8">
          <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Sign in</h1>
          <p className="mt-1 text-fg-muted">Staff back office.</p>

          {credentials ? (
            <LoginForm next={target} />
          ) : (
            <p role="alert" className="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-[0.9375rem]">
              The admin login is off on this server: set <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code> in the environment.
            </p>
          )}

          <p className="mt-6 rounded-xl border border-line bg-surface-1 p-3 text-[0.875rem] leading-snug text-fg-muted">
            <strong className="text-fg">Temporary login.</strong> One shared password from environment variables. Not production-grade:
            replace it with real accounts, roles and hashed passwords before launch.
            {credentials?.source === "dev-default" && (
              <>
                <br />
                <span className="mt-2 block">
                  Development defaults: <code className="font-semibold text-fg">{DEV_CREDENTIALS.email}</code> /{" "}
                  <code className="font-semibold text-fg">{DEV_CREDENTIALS.password}</code>
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
