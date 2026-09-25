import { z } from "zod";
import { locales } from "@/i18n/routing";
import { REPLY_TYPES, SLOTS } from "@/lib/advisor/constants";

const oneOf = (values: readonly string[]) => `One of: ${values.map((v) => `"${v}"`).join(", ")}.`;

/**
 * The JSON the language model must return.
 *
 * Fields are plain strings whose allowed values are spelled out in their
 * descriptions (the same for every provider). They are deliberately permissive:
 * guard.ts validates each value, so one unknown product id drops that product
 * only, instead of throwing away the whole answer.
 */
export function buildOutputSchema(productIds: string[], packageIds: string[]) {
  return z.object({
    language: z.string().describe(`Language of the customer's last message. ${oneOf(locales)}`),
    type: z
      .string()
      .describe(
        `${oneOf(REPLY_TYPES)} "question" = one short follow-up question; "no_match" = nothing suitable.`,
      ),
    message: z.string().describe("One or two short, friendly sentences. No prices, no specs, no markdown."),
    recommendations: z
      .array(
        z.object({
          slot: z.string().describe(oneOf(SLOTS)),
          productId: z.string().describe(`Exact id of a phone in the catalogue. ${oneOf(productIds)}`),
          reason: z.string().describe("Why it suits this customer, in a few words. No prices."),
        }),
      )
      .describe("At most 3, each slot at most once. Empty for a question."),
    packages: z
      .array(z.string().describe(oneOf(packageIds)))
      .describe("Packages worth suggesting, often none."),
    quickReplies: z
      .array(z.string())
      .describe("For a question only: 2 to 4 short answers the customer can tap. Otherwise empty."),
  });
}

export type ModelOutput = z.infer<ReturnType<typeof buildOutputSchema>>;
