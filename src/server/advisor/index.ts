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
import { pickTradeIn } from "@/lib/data/pricing";
import { getAvailableItems, getMerchandising, getModels, getTradeInEstimates } from "@/lib/data/queries";
import type { PhoneModel } from "@/lib/data/schema";
import { translateDynamic } from "@/lib/i18n-dynamic";
import { AiProviderError, getAiClient, type AiMessage } from "./ai-adapter";
import { buildModelMatcher, type ModelMention, resolveCurrentPhone } from "./current-phone";
import { demoReply, understandConversation } from "./demo";
import { guardModelOutput } from "./guard";
import { buildOutputSchema } from "./output-schema";
import { type CurrentPhoneContext, presentReply } from "./present";
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

const matchers = new WeakMap<PhoneModel[], (text: string) => ModelMention[]>();
function matcherFor(models: PhoneModel[]) {
  let match = matchers.get(models);
  if (!match) {
    match = buildModelMatcher(models);
    matchers.set(models, match);
  }
  return match;
}

/**
 * Answers one customer question.
 * First, once, it asks which phone they have now (unless they said it): the
 * answer is used to skip that model, estimate its trade-in and link each
 * suggestion to a side-by-side comparison.
 * With an AI provider configured, the model answers and the guard checks it
 * against the catalogue. Without one, or if anything goes wrong, the rule-based
 * demo engine answers, so the customer always gets a useful reply.
 */
export async function runAdvisor(request: AdvisorRequest): Promise<AdvisorReply> {
  const [items, settings, models] = await Promise.all([getAvailableItems(), getMerchandising(), getModels()]);
  const history = request.messages.slice(-MAX_TURNS * 2);
  const packageIds = settings.packages.map((pkg) => pkg.id);
  const ai = getAiClient();

  // 1. The phone they have now.
  const phone = resolveCurrentPhone(history, matcherFor(models), new Set(models.map((m) => m.id)));
  const currentModel = phone.phone ? (models.find((m) => m.id === phone.phone!.modelId) ?? null) : null;
  let current: CurrentPhoneContext | null = null;
  if (phone.phone && currentModel) {
    const { estimates } = await getTradeInEstimates(currentModel.id);
    current = { model: currentModel, estimate: pickTradeIn(estimates, phone.phone.storageGb) };
  }

  if (!phone.phone && !phone.asked) {
    const language = understandConversation(history, items).language ?? request.locale;
    const t = getTranslator(language);
    const question: AssistantMemory = {
      language,
      type: "question",
      question: "current_phone",
      message: t("AdvisorReply.askCurrentPhone"),
      recommendations: [],
      packages: [],
      quickReplies: [t("AdvisorReply.currentPhoneReplies.none"), t("AdvisorReply.currentPhoneReplies.skip")],
      currentPhone: null,
    };
    return presentReply(question, { engine: ai ? "ai" : "demo", items, settings, siteLocale: request.locale });
  }

  // 2. What they want.
  // Real amounts the answer may quote besides prices: the trade-in estimate and each price after it.
  const credit = current?.estimate?.storeCreditAmount;
  const tradeInAmounts =
    current?.estimate && credit !== undefined
      ? [current.estimate.amount, credit, ...items.map((item) => Math.max(0, item.price - credit))]
      : [];

  let memory: AssistantMemory | null = null;
  let engine: AdvisorReply["engine"] = "demo";

  // Not the phone they already have (unless nothing else is in stock).
  const others = current ? items.filter((item) => item.modelId !== current.model.id) : items;
  const offerable = others.length > 0 ? others : items;

  if (ai && offerable.length > 0) {
    try {
      const en = getTranslator("en");
      const output = await ai.generateObject({
        system: buildSystemPrompt({
          brandName: BRAND_NAME,
          siteLocale: request.locale,
          towns: settings.serviceArea.towns.map((town) => translateDynamic(en, `Local.towns.${town}`)),
          items: offerable,
          packages: settings.packages,
          currentPhone: current,
        }),
        messages: toAiMessages(history),
        schema: buildOutputSchema(
          offerable.map((item) => item.id),
          packageIds,
        ),
        schemaName: "advisor_reply",
      });
      memory = guardModelOutput(output, {
        items: offerable,
        packageIds,
        packagePrices: settings.packages.map((pkg) => pkg.price),
        customerNumbers: understandConversation(history, items).numbers,
        extraAmounts: tradeInAmounts,
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

  memory ??= demoReply(history, items, {
    siteLocale: request.locale,
    packageIds,
    excludeModelIds: current ? [current.model.id] : [],
    replacedTexts: phone.withoutCurrentPhone,
  });
  // Remembered in every answer, so the next question knows it too.
  memory = { ...memory, currentPhone: phone.phone };
  return presentReply(memory, { engine, items, settings, siteLocale: request.locale, current });
}
