import { z } from "zod";
import { locales, type Locale } from "@/i18n/routing";
import type { IconKey } from "@/lib/data/schema";
import type { ProductCardView } from "@/lib/product-view";
import { MAX_MESSAGE_LENGTH, MAX_TURNS, REPLY_TYPES, SLOTS, type ReplyType, type Slot } from "./constants";

/**
 * The contract between the chat panel (browser) and POST /api/advisor.
 * The browser keeps the conversation and sends it back on every question.
 */

export { MAX_MESSAGE_LENGTH, MAX_TURNS, REPLY_TYPES, SLOTS, type ReplyType, type Slot };

/** The phone the customer has now (a models.id), once they said it. */
export const currentPhoneRefSchema = z.object({
  modelId: z.string().max(120),
  storageGb: z.number().int().positive().max(4096).nullable(),
});
export type CurrentPhoneRef = z.infer<typeof currentPhoneRefSchema>;

/** What a "question" reply asked: which phone they have now, or what they need. */
export const QUESTION_KINDS = ["current_phone", "needs"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

/**
 * What the advisor answered in an earlier turn (product ids, not product data).
 * Sent back as context so follow-up questions make sense.
 */
export const assistantMemorySchema = z.object({
  language: z.enum(locales),
  type: z.enum(REPLY_TYPES),
  message: z.string().max(1200),
  recommendations: z
    .array(
      z.object({
        slot: z.enum(SLOTS),
        productId: z.string().max(120),
        reason: z.string().max(400),
      }),
    )
    .max(3),
  packages: z.array(z.string().max(60)).max(3),
  quickReplies: z.array(z.string().max(120)).max(4),
  // Defaults keep conversations started before these fields existed working.
  question: z.enum(QUESTION_KINDS).nullable().default(null),
  currentPhone: currentPhoneRefSchema.nullable().default(null),
});
export type AssistantMemory = z.infer<typeof assistantMemorySchema>;

export const chatTurnSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH) }),
  z.object({ role: z.literal("assistant"), memory: assistantMemorySchema }),
]);
export type ChatTurn = z.infer<typeof chatTurnSchema>;

export const advisorRequestSchema = z
  .object({
    /** Language of the site the customer is on. */
    locale: z.enum(locales),
    messages: z.array(chatTurnSchema).min(1).max(MAX_TURNS * 2),
  })
  .refine((request) => request.messages.at(-1)?.role === "user", {
    message: "The last message must come from the customer.",
  });
export type AdvisorRequest = z.infer<typeof advisorRequestSchema>;

export type AdvisorCard = {
  slot: Slot;
  slotLabel: string;
  reason: string;
  product: ProductCardView;
  /** "Compare with my iPhone 12", when the customer's phone is known and different. */
  compare: { href: string; label: string } | null;
  /** "≈ €599 after trade-in", when their phone has a trade-in estimate. */
  afterTradeIn: string | null;
};

/** The customer's current phone, as the chat shows it. */
export type AdvisorCurrentPhone = {
  modelId: string;
  title: string;
  name: string;
  /** "Trade-in: up to €170 as shop credit (128 GB, perfect condition)", or why there is none. */
  tradeIn: string;
  note: string | null;
};

export type AdvisorPackageCard = {
  id: string;
  icon: IconKey;
  name: string;
  tagline: string;
  price: string;
  href: string;
  learnMore: string;
};

/** What POST /api/advisor returns: ready to render, in the customer's language. */
export type AdvisorReply = {
  language: Locale;
  type: ReplyType;
  message: string;
  cards: AdvisorCard[];
  packages: AdvisorPackageCard[];
  quickReplies: string[];
  currentPhone: AdvisorCurrentPhone | null;
  /** Headings for this reply, in the reply language. */
  labels: { packagesTitle: string };
  /** Which engine answered: "ai" (language model) or "demo" (rule-based). */
  engine: "ai" | "demo";
  /** To send back with the next question. */
  memory: AssistantMemory;
};

export type AdvisorMode = "ai" | "demo";
