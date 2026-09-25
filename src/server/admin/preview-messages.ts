import "server-only";
import { getMessagesFor } from "@/i18n/messages";
import { locales } from "@/i18n/routing";
import { pick } from "@/lib/pick";
import type { PreviewMessages } from "@/components/admin/preview";

/** The message namespaces the admin previews need (cards, packages, Gauge), in the three languages. */
export function getPreviewMessages(): PreviewMessages {
  return Object.fromEntries(
    locales.map((locale) => [locale, pick(getMessagesFor(locale), ["Product", "Packages", "Common", "Gauge", "Deals"] as const)]),
  ) as PreviewMessages;
}
