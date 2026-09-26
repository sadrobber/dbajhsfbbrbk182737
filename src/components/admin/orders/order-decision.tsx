"use client";

import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmAvailabilityAction, declineAvailabilityAction, refreshPaymentAction } from "@/app/admin/(panel)/orders/actions";
import { adminButton, adminInput } from "@/components/admin/styles";
import { Field } from "@/components/admin/ui";
import type { ActionResult } from "@/server/admin/action-result";

/**
 * Staff's decision on an order waiting for an availability check.
 * `charges`: confirming charges the customer's card (a "24-48h" order).
 */
export function OrderDecision({
  orderId,
  charges,
  amount,
  customerLanguage,
  suggestions,
}: {
  orderId: string;
  charges: boolean;
  amount: string;
  customerLanguage: string;
  /** In-stock phones staff can offer instead, in one click. */
  suggestions: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"choose" | "confirm" | "decline">("choose");
  const [alternative, setAlternative] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div className="grid gap-4">
      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 font-semibold text-danger">
          {error}
        </p>
      )}

      {step === "choose" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={adminButton("primary")} onClick={() => setStep("confirm")}>
            <Check aria-hidden="true" className="size-4" />
            Available
          </button>
          <button type="button" className={adminButton("danger")} onClick={() => setStep("decline")}>
            <X aria-hidden="true" className="size-4" />
            Not available
          </button>
        </div>
      )}

      {step === "confirm" && (
        <div className="grid gap-3 rounded-xl border border-line bg-surface-1 p-4">
          <p className="font-semibold">
            {charges
              ? `Charge ${amount} to the customer’s card and confirm the order?`
              : "Confirm that it’s available? The customer is told to come and pay in the shop."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={adminButton("primary")} disabled={pending} onClick={() => run(() => confirmAvailabilityAction(orderId))}>
              {pending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {charges ? `Yes, charge ${amount}` : "Yes, confirm"}
            </button>
            <button type="button" className={adminButton("ghost")} disabled={pending} onClick={() => setStep("choose")}>
              Back
            </button>
          </div>
        </div>
      )}

      {step === "decline" && (
        <div className="grid gap-3 rounded-xl border border-line bg-surface-1 p-4">
          <p className="font-semibold">
            {charges ? "The card authorisation is cancelled: the customer pays nothing." : "The request is closed."} Suggest an alternative:
          </p>
          <Field label="What you offer instead (shown to the customer)" hint={`Write it in the customer’s language: ${customerLanguage}.`}>
            <textarea
              value={alternative}
              onChange={(e) => setAlternative(e.target.value)}
              maxLength={500}
              rows={4}
              className={`${adminInput} py-2`}
            />
          </Field>
          {suggestions.length > 0 && (
            <div className="grid gap-1.5">
              <p className="text-[0.875rem] font-semibold text-fg-muted">In stock now, similar price:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={adminButton("secondary", "min-h-9 text-[0.875rem]")}
                    onClick={() => setAlternative((text) => (text ? `${text}\n${suggestion}` : suggestion))}
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={adminButton("dangerSolid")}
              disabled={pending}
              onClick={() => run(() => declineAvailabilityAction(orderId, alternative))}
            >
              {pending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {charges ? "Cancel the authorisation" : "Close the request"}
            </button>
            <button type="button" className={adminButton("ghost")} disabled={pending} onClick={() => setStep("choose")}>
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** For an order still waiting for payment: asks the provider again (useful when webhooks aren't set up). */
export function RefreshPaymentButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <button
        type="button"
        className={adminButton("secondary", "w-fit")}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await refreshPaymentAction(orderId);
            if (result.ok) router.refresh();
            else setError(result.error);
          })
        }
      >
        {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="size-4" />}
        Check the payment again
      </button>
      {error && <p className="font-semibold text-danger">{error}</p>}
    </div>
  );
}
