"use client";

import type { LocalizedText } from "@/lib/data/schema";
import { useAdminI18n } from "./i18n";
import { adminInput } from "./styles";

const LANGUAGES = [
  { key: "fr", label: "FR" },
  { key: "en", label: "EN" },
  { key: "it", label: "IT" },
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
  const { t } = useAdminI18n();
  return (
    <div className="@container grid gap-1.5">
      <div className="grid gap-2 @2xl:grid-cols-3">
        {LANGUAGES.map((language) => {
          const languageName = t(`Common.languages.${language.key}`);
          return (
            <label key={language.key} className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 rounded bg-surface-2 px-1.5 text-[0.75rem] font-bold text-fg-muted">
                {language.label}
              </span>
              <span className="sr-only">
                {language.key === "fr"
                  ? t("LocalizedInput.srRequired", { label, language: languageName })
                  : t("LocalizedInput.srOptional", { label, language: languageName })}
              </span>
              <input
                value={value[language.key]}
                maxLength={maxLength}
                onChange={(e) => onChange({ ...value, [language.key]: e.target.value })}
                placeholder={language.key === "fr" ? t("LocalizedInput.required") : value.fr || t("LocalizedInput.sameAsFrench")}
                aria-invalid={language.key === "fr" && Boolean(error)}
                className={`${adminInput} pl-12`}
              />
            </label>
          );
        })}
      </div>
      {error && <span className="text-[0.8125rem] font-semibold text-danger">{error}</span>}
    </div>
  );
}
