"use client";

import type { LocalizedText } from "@/lib/data/schema";
import { adminInput } from "./styles";

const LANGUAGES = [
  { key: "fr", label: "FR", name: "French" },
  { key: "en", label: "EN", name: "English" },
  { key: "it", label: "IT", name: "Italian" },
] as const;

/** One short text in French (required), English and Italian (fall back to French when empty). */
export function LocalizedTextInput({
  value,
  onChange,
  label,
  error,
  maxLength = 60,
}: {
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  /** Accessible name, e.g. "Badge text". */
  label: string;
  error?: string;
  maxLength?: number;
}) {
  return (
    <div className="@container grid gap-1.5">
      <div className="grid gap-2 @2xl:grid-cols-3">
        {LANGUAGES.map((language) => (
          <label key={language.key} className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 rounded bg-surface-2 px-1.5 text-[0.75rem] font-bold text-fg-muted">
              {language.label}
            </span>
            <span className="sr-only">
              {label} in {language.name}
              {language.key === "fr" ? " (required)" : " (optional, French is used when empty)"}
            </span>
            <input
              value={value[language.key]}
              maxLength={maxLength}
              onChange={(e) => onChange({ ...value, [language.key]: e.target.value })}
              placeholder={language.key === "fr" ? "Required" : value.fr || "Same as French"}
              aria-invalid={language.key === "fr" && Boolean(error)}
              className={`${adminInput} pl-12`}
            />
          </label>
        ))}
      </div>
      {error && <span className="text-[0.8125rem] font-semibold text-danger">{error}</span>}
    </div>
  );
}
