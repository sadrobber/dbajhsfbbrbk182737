import type { z } from "zod";
import { type AdminTranslator, adminHasKey, adminTranslateDynamic } from "@/i18n/admin";

type Issue = z.core.$ZodIssue;

/**
 * An issue in the staff member's language: our schemas use codes as messages
 * (Validation.<code>); zod's own checks are described from their kind.
 */
function messageOf(issue: Issue, t: AdminTranslator): string {
  if (adminHasKey(t, `Validation.${issue.message}`)) return adminTranslateDynamic(t, `Validation.${issue.message}`);
  switch (issue.code) {
    case "invalid_type":
      return t(issue.expected === "number" ? "Validation.invalidNumber" : issue.expected === "int" ? "Validation.invalidInteger" : "Validation.invalid");
    case "too_small": {
      const min = Number(issue.minimum);
      if (issue.origin === "string") return min <= 1 ? t("Validation.required") : t("Validation.invalid");
      if (issue.origin === "array") return t("Validation.tooFew", { min });
      return issue.inclusive ? t("Validation.atLeast", { min }) : t("Validation.moreThan", { min });
    }
    case "too_big": {
      const max = Number(issue.maximum);
      if (issue.origin === "string") return t("Validation.tooLong", { max });
      if (issue.origin === "array") return t("Validation.tooMany", { max });
      return issue.inclusive ? t("Validation.atMost", { max }) : t("Validation.lessThan", { max });
    }
    case "invalid_format":
      return t("Validation.invalidFormat");
    case "invalid_value":
      return t("Validation.pickOne");
    default:
      return t("Validation.invalid");
  }
}

/** First message per field, keyed by dotted path ("price", "items.2.label.fr"). */
export function fieldErrorsOf(error: z.ZodError, t: AdminTranslator): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    result[key] ??= messageOf(issue, t);
  }
  return result;
}
