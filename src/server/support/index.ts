import "server-only";
import { BRAND_NAME } from "@/config/site.config";
import { supportContact, supportKnowledge } from "@/config/support.config";
import { getTranslator } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";
import { getCatalogItems, getMerchandising, getOptions } from "@/lib/data/queries";
import { SUPPORT_MAX_REPLY_LENGTH, type SupportReply, type SupportRequest, type SupportTurn } from "@/lib/support/contract";
import { AiProviderError, getAiClient, type AiMessage } from "@/server/advisor/ai-adapter";
import { buildKnowledge, contactLines } from "./knowledge";
import { buildSupportPrompt } from "./prompt";

/** Room for a short answer; the prompt asks for 2–3 sentences. */
const MAX_ANSWER_TOKENS = 1024;

export function getSupportMode(): SupportReply["engine"] {
  return getAiClient() ? "ai" : "offline";
}

/** The conversation as the model sees it, starting with a visitor message. */
function toAiMessages(history: SupportTurn[]): AiMessage[] {
  const messages = history.map((turn): AiMessage => ({ role: turn.role, content: turn.text }));
  while (messages[0]?.role === "assistant") messages.shift();
  return messages;
}

/** Plain text for the chat bubble: no Markdown, no runaway length. */
export function cleanReply(text: string): string {
  const plain = text
    .replace(/\r\n/g, "\n")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (plain.length <= SUPPORT_MAX_REPLY_LENGTH) return plain;
  const cut = plain.slice(0, SUPPORT_MAX_REPLY_LENGTH - 1);
  const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return sentenceEnd > SUPPORT_MAX_REPLY_LENGTH / 2 ? cut.slice(0, sentenceEnd + 1) : `${cut.trimEnd()}…`;
}

/** What the visitor reads when no AI can answer: the shop's contact details. */
export function offlineReply(locale: Locale): string {
  const t = getTranslator(locale);
  const { email, phone, address, openingHours } = supportContact;
  const lines = [
    email && t("Support.contact.email", { value: email }),
    phone && t("Support.contact.phone", { value: phone }),
    address && t("Support.contact.address", { value: address }),
    openingHours && t("Support.contact.hours", { value: openingHours }),
  ].filter((line): line is string => Boolean(line));
  return lines.length > 0 ? `${t("Support.offline")} ${t("Support.offlineContact")}\n${lines.join("\n")}` : `${t("Support.offline")} ${t("Support.offlineNoContact")}`;
}

let warnedNoContact = false;

/**
 * Answers one visitor question.
 * With an AI provider configured, the model answers from the shop's live data
 * and the owner's knowledge text. Without one, or if the call fails, the
 * visitor gets the shop's contact details instead.
 */
export async function runSupport(request: SupportRequest): Promise<SupportReply> {
  const ai = getAiClient();
  if (ai) {
    try {
      const [items, settings, options] = await Promise.all([getCatalogItems(), getMerchandising(), getOptions()]);
      const contact = contactLines(supportContact);
      if (contact.length === 0 && !warnedNoContact) {
        warnedNoContact = true;
        console.warn("[support] No contact details in src/config/support.config.ts yet: the chat can't pass them on.");
      }
      const knowledge = buildKnowledge({
        brandName: BRAND_NAME,
        t: getTranslator("en"),
        items,
        grades: options.grades,
        batteryOptions: options.batteryOptions,
        settings,
        contact: supportContact,
        ownerKnowledge: supportKnowledge,
      });
      const answer = await ai.generateText({
        system: buildSupportPrompt({ brandName: BRAND_NAME, siteLocale: request.locale, knowledge, contact }),
        messages: toAiMessages(request.messages),
        maxTokens: MAX_ANSWER_TOKENS,
      });
      const reply = cleanReply(answer);
      if (reply) return { reply, engine: "ai" };
    } catch (error) {
      console.warn(
        `[support] ${ai.provider} (${ai.model}) failed, answering with the contact details:`,
        error instanceof AiProviderError ? error.message : error,
      );
    }
  }
  return { reply: offlineReply(request.locale), engine: "offline" };
}
