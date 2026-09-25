import { getTranslator } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";
import type { AssistantMemory, ChatTurn } from "@/lib/advisor/contract";
import type { CatalogItem } from "@/lib/data/schema";
import { composeReply } from "./compose";
import { recommend } from "./recommend";
import { mergeIntents, understand, type Intent, type UnderstandContext } from "./understand";

export function understandConversation(history: ChatTurn[], items: CatalogItem[]): Intent {
  const context: UnderstandContext = {
    brands: [...new Map(items.map((item) => [item.brand, { id: item.brand, name: item.brandName }])).values()],
    models: [...new Set(items.map((item) => item.model))],
  };
  const intents = history.flatMap((turn) => (turn.role === "user" ? [understand(turn.text, context)] : []));
  return mergeIntents(intents);
}

/**
 * Demo mode: answers without any AI provider, with simple rules on budget,
 * brand, condition and "good for" tags. Also the fallback when the AI fails.
 */
export function demoReply(
  history: ChatTurn[],
  items: CatalogItem[],
  options: { siteLocale: Locale; packageIds: string[] },
): AssistantMemory {
  const intent = understandConversation(history, items);
  // Reply in the language the customer writes in (latest message first), else the site language.
  const locale = intent.language ?? options.siteLocale;

  const lastAssistant = [...history].reverse().find((turn) => turn.role === "assistant");
  const alreadyAsked = lastAssistant?.role === "assistant" && lastAssistant.memory.type === "question";

  const plan = recommend(intent, items, { alreadyAsked, packageIds: options.packageIds });
  return composeReply(plan, intent, {
    t: getTranslator(locale),
    locale,
    brandNames: new Map(items.map((item) => [item.brand, item.brandName])),
  });
}
