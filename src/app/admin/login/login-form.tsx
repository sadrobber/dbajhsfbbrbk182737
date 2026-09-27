"use client";

import { useActionState } from "react";
import { useAdminI18n } from "@/components/admin/i18n";
import { adminButton, adminInput } from "@/components/admin/styles";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const { t } = useAdminI18n();
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null, email: "" });

  return (
    <form action={action} className="mt-6 grid gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="grid gap-1.5">
        <span className="font-semibold">{t("Login.email")}</span>
        <input name="email" type="email" autoComplete="username" required defaultValue={state.email} className={adminInput} />
      </label>
      <label className="grid gap-1.5">
        <span className="font-semibold">{t("Login.password")}</span>
        <input name="password" type="password" autoComplete="current-password" required className={adminInput} />
      </label>
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 font-semibold text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={adminButton("primary")}>
        {pending ? t("Login.submitting") : t("Login.submit")}
      </button>
    </form>
  );
}
