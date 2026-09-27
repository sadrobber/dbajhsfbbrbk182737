"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useAdminI18n } from "./i18n";
import { adminButton } from "./styles";

/** Sticky bar at the bottom of an editing screen: unsaved state, discard, save. */
export function SaveBar({
  dirty,
  pending,
  saved,
  error,
  onDiscard,
  onSave,
  saveLabel,
}: {
  dirty: boolean;
  pending: boolean;
  /** Just saved, nothing changed since. */
  saved: boolean;
  error: string | null;
  onDiscard: () => void;
  onSave: () => void;
  saveLabel?: string;
}) {
  const { t } = useAdminI18n();
  return (
    <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-ink/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-[0.9375rem] font-semibold">
          {error ? (
            <span role="alert" className="text-danger">
              {error}
            </span>
          ) : dirty ? (
            <span className="text-warning">{t("Common.unsavedChanges")}</span>
          ) : saved ? (
            <span className="inline-flex items-center gap-1.5 text-success">
              <Check aria-hidden="true" className="size-4" />
              {t("Common.savedShopUpToDate")}
            </span>
          ) : (
            <span className="text-fg-subtle">{t("Common.noChanges")}</span>
          )}
        </p>
        <div className="flex gap-2">
          <button type="button" className={adminButton("secondary")} onClick={onDiscard} disabled={!dirty || pending}>
            {t("Common.discard")}
          </button>
          <button type="button" className={adminButton("primary", "min-w-36")} onClick={onSave} disabled={!dirty || pending}>
            {pending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            {saveLabel ?? t("Common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Asks before leaving the page (reload, close tab) while changes are unsaved. */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}
