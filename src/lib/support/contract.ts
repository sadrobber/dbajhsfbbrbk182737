import { z } from "zod";
import { locales } from "@/i18n/routing";
import { SUPPORT_MAX_HISTORY, SUPPORT_MAX_MESSAGE_LENGTH, SUPPORT_MAX_REPLY_LENGTH } from "./constants";

/**
 * The contract between the support chat (browser) and POST /api/chat.
 * The server keeps nothing: the browser sends the conversation back with each question.
 */

export { SUPPORT_MAX_HISTORY, SUPPORT_MAX_MESSAGE_LENGTH, SUPPORT_MAX_REPLY_LENGTH };

export const supportTurnSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), text: z.string().trim().min(1).max(SUPPORT_MAX_MESSAGE_LENGTH) }),
  z.object({ role: z.literal("assistant"), text: z.string().trim().min(1).max(SUPPORT_MAX_REPLY_LENGTH) }),
]);
export type SupportTurn = z.infer<typeof supportTurnSchema>;

export const supportRequestSchema = z.object({
  locale: z.enum(locales),
  messages: z
    .array(supportTurnSchema)
    .min(1)
    .max(SUPPORT_MAX_HISTORY)
    .refine((messages) => messages.at(-1)?.role === "user", "The last message must be the visitor's question."),
});
export type SupportRequest = z.infer<typeof supportRequestSchema>;

/** "ai": answered by the language model. "offline": no AI available, the shop's contact details instead. */
export type SupportEngine = "ai" | "offline";

export type SupportReply = { reply: string; engine: SupportEngine };
