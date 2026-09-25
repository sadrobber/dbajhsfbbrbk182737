import "server-only";
import { BRAND_NAME } from "@/config/site.config";
import { getTranslator } from "@/i18n/messages";
import {
  MAX_TURNS,
  type AdvisorMode,
  type AdvisorReply,
  type AdvisorRequest,
  type AssistantMemory,
  type ChatTurn,
} from "@/lib/advisor/contract";
import { getAvailableItems, getMerchandising } from "@/lib/data/queries";
import { translateDynamic } from "@/lib/i18n-dynamic";
import { AiProviderError, getAiClient, type AiMessage } from "./ai-adapter";
import { demoReply, understandConversation } from "./demo";
import { guardModelOutput } from "./guard";
import { buildOutputSchema } from "./output-schema";
import { presentReply } from "./present";
import { buildSystemPrompt } from "./prompt";

export function getAdvisorMode(): AdvisorMode {
  return getAiClient() ? "ai" : "demo";
}

/** The conversation as the language model sees it: customer text, and its own earlier JSON answers. */
function toAiMessages(history: ChatTurn[]): AiMessage[] {
  const messages: AiMessage[] = history.map((turn) =>
    turn.role === "user"
      ? { role: "user", content: turn.text }
      : { role: "assistant", content: JSON.stringify(turn.memory) },
  );
  while (messages[0]?.role === "assistant") messages.shift();
  return messages;
}

/**
 * Answers one customer question.
 * With an AI provider configured, the model answers and the guard checks it
 * against the catalogue. Without one, or if anything goes wrong, the rule-based
 * demo engine answers, so the customer always gets a useful reply.
 */
export async function runAdvisor(request: AdvisorRequest): Promise<AdvisorReply> {
  const [items, settings] = await Promise.all([getAvailableItems(), getMerchandising()]);
  const history = request.messages.slice(-MAX_TURNS * 2);
  const packageIds = settings.packages.map((pkg) => pkg.id);

  let memory: AssistantMemory | null = null;
  let engine: AdvisorReply["engine"] = "demo";

  const ai = getAiClient();
  if (ai && items.length > 0) {
    try {
      const en = getTranslator("en");
      const output = await ai.generateObject({
        system: buildSystemPrompt({
          brandName: BRAND_NAME,
          siteLocale: request.locale,
          towns: settings.serviceArea.towns.map((town) => translateDynamic(en, `Local.towns.${town}`)),
          items,
          packages: settings.packages,
        }),
        messages: toAiMessages(history),
        schema: buildOutputSchema(
          items.map((item) => item.id),
          packageIds,
        ),
        schemaName: "advisor_reply",
      });
      memory = guardModelOutput(output, {
        items,
        packageIds,
        packagePrices: settings.packages.map((pkg) => pkg.price),
        customerNumbers: understandConversation(history, items).numbers,
        siteLocale: request.locale,
      });
      if (memory) engine = "ai";
      else console.warn("[advisor] The AI answer did not pass the catalogue checks. Answering in demo mode.");
    } catch (error) {
      console.warn(
        `[advisor] ${ai.provider} (${ai.model}) failed, answering in demo mode:`,
        error instanceof AiProviderError ? error.message : error,
      );
    }
  }

  memory ??= demoReply(history, items, { siteLocale: request.locale, packageIds });
  return presentReply(memory, { engine, items, settings, siteLocale: request.locale });
}
