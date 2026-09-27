"use client";

import { CircleNotchIcon as Loader2, LockIcon as Lock } from "@phosphor-icons/react/dist/ssr";
import { useActionState } from "react";
import type { CheckoutState } from "@/app/[locale]/cart/actions";
import { buttonClass } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import type { Supply } from "@/lib/data/schema";
import type { CheckoutField } from "@/lib/orders/checkout-form";

export type CheckoutFormLabels = {
  title: string;
  required: string;
  fields: Record<"firstName" | "lastName" | "email" | "phone" | "town" | "townOther" | "marketing" | "pickup", string>;
  errors: Record<"firstName" | "lastName" | "email" | "phone" | "town", string>;
  problems: Record<NonNullable<CheckoutState["problem"]>, string>;
  submit: string;
  secure: string | null;
};

const input =
  "min-h-13 w-full rounded-2xl border border-line-strong bg-ink px-4 text-[1.0625rem] text-fg placeholder:text-fg-subtle aria-invalid:border-danger focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

const initialState: CheckoutState = { fieldErrors: {}, problem: null, values: {} };

/** Customer details and the pay / request button. Prices and availability are re-checked on the server. */
export function CheckoutForm({
  action,
  labels,
  towns,
  supply,
  total,
}: {
  action: (state: CheckoutState, formData: FormData) => Promise<CheckoutState>;
  labels: CheckoutFormLabels;
  towns: { value: string; label: string }[];
  supply: Supply;
  total: number;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errorOf = (field: CheckoutField) =>
    state.fieldErrors[field] && field in labels.errors ? labels.errors[field as keyof CheckoutFormLabels["errors"]] : undefined;

  const text = (field: "firstName" | "lastName" | "email" | "phone", type: string, autoComplete: string) => {
    const error = errorOf(field);
    return (
      <label className="grid content-start gap-1.5">
        <span className="font-semibold">{labels.fields[field]}</span>
        <input
          name={field}
          type={type}
          required
          autoComplete={autoComplete}
          defaultValue={state.values[field] ?? ""}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${field}-error` : undefined}
          className={input}
        />
        {error && (
          <span id={`${field}-error`} className="text-[0.9375rem] font-semibold text-danger">
            {error}
          </span>
        )}
      </label>
    );
  };

  const townError = errorOf("town");

  return (
    <form action={formAction} className="grid gap-4">
      <h2 className="font-display text-xl font-bold">{labels.title}</h2>
      <p className="-mt-2 text-[0.9375rem] text-fg-muted">{labels.required}</p>
      <input type="hidden" name="expectedSupply" value={supply} />
      <input type="hidden" name="expectedTotal" value={total} />
      <div className="grid gap-4 sm:grid-cols-2">
        {text("firstName", "text", "given-name")}
        {text("lastName", "text", "family-name")}
      </div>
      {text("email", "email", "email")}
      {text("phone", "tel", "tel")}
      <label className="grid content-start gap-1.5">
        <span className="font-semibold">{labels.fields.town}</span>
        <select
          name="town"
          required
          defaultValue={state.values.town ?? ""}
          aria-invalid={Boolean(townError)}
          aria-describedby={townError ? "town-error" : undefined}
          className={cn(input, "pr-10")}
        >
          <option value="" disabled>
            —
          </option>
          {towns.map((town) => (
            <option key={town.value} value={town.value}>
              {town.label}
            </option>
          ))}
          <option value="other">{labels.fields.townOther}</option>
        </select>
        {townError && (
          <span id="town-error" className="text-[0.9375rem] font-semibold text-danger">
            {townError}
          </span>
        )}
      </label>
      <p className="rounded-2xl bg-surface-1 px-4 py-3 font-semibold">{labels.fields.pickup}</p>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="marketingOptIn"
          defaultChecked={state.values.marketingOptIn === "on"}
          className="mt-1 size-5 shrink-0 accent-[#1b67da]"
        />
        <span>{labels.fields.marketing}</span>
      </label>

      {state.problem && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 font-semibold text-danger">
          {labels.problems[state.problem]}
        </p>
      )}

      <button type="submit" disabled={pending} className={cn(buttonClass("primary", "lg"), "w-full")}>
        {pending ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : supply !== "on_request" && <Lock aria-hidden="true" className="size-5" />}
        {labels.submit}
      </button>
      {labels.secure && <p className="text-center text-[0.9375rem] text-fg-muted">{labels.secure}</p>}
    </form>
  );
}
