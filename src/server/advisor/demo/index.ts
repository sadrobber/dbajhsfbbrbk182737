import { getTranslator } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";
import type { AssistantMemory, ChatTurn } from "@/lib/advisor/contract";
import type { CatalogItem } from "@/lib/data/schema";
import { composeReply } from "./compose";
import { recommend } from "./recommend";
import { mergeIntents, understand, type Intent, type UnderstandContext } from "./understand";

/**
 * What the customer wants, from all their messages. `replacedTexts` swaps some
 * messages for a version without their current phone ("I have an iPhone 13" is not a wish).
 */
export function understandConversation(history: ChatTurn[], items: CatalogItem[], replacedTexts?: Map<number, string>): Intent {
  const context: UnderstandContext = {
    brands: [...new Map(items.map((item) => [item.brand, { id: item.brand, name: item.brandName }])).values()],
    models: [...new Set(items.map((item) => item.model))],
  };
  const intents = history.flatMap((turn, index) =>
    turn.role === "user" ? [understand(replacedTexts?.get(index) ?? turn.text, context)] : [],
  );
  return mergeIntents(intents);
}

/**
 * Demo mode: answers without any AI provider, with simple rules on budget,
 * brand, condition and "good for" tags. Also the fallback when the AI fails.
 */
export function demoReply(
  history: ChatTurn[],
  items: CatalogItem[],
  options: {
    siteLocale: Locale;
    packageIds: string[];
    /** Models not to suggest: the phone the customer already has. */
    excludeModelIds?: string[];
    replacedTexts?: Map<number, string>;
  },
): AssistantMemory {
  const intent = understandConversation(history, items, options.replacedTexts);
  // Language: from the customer's own words (a message without its phone name may be too short to tell).
  intent.language = understandConversation(history, items).language ?? intent.language;
  // Reply in the language the customer writes in (latest message first), else the site language.
  const locale = intent.language ?? options.siteLocale;

  const lastAssistant = [...history].reverse().find((turn) => turn.role === "assistant");
  // Asked what they need already (the "which phone do you have?" question doesn't count).
  const alreadyAsked =
    lastAssistant?.role === "assistant" && lastAssistant.memory.type === "question" && lastAssistant.memory.question !== "current_phone";

  const plan = recommend(intent, items, { alreadyAsked, packageIds: options.packageIds, excludeModelIds: options.excludeModelIds });
  return composeReply(plan, intent, {
    t: getTranslator(locale),
    locale,
    brandNames: new Map(items.map((item) => [item.brand, item.brandName])),
  });
}
