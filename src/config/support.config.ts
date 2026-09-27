/**
 * ============================================================================
 *  SUPPORT CHAT: what the assistant knows beyond the live shop data.
 * ============================================================================
 *
 *  The support chat (bubble in the bottom-right corner) already knows, from
 *  the shop's own data: the phones for sale and their prices, the condition
 *  grades, batteries, warranty lengths, packages, how ordering and payment
 *  work, the towns served and the Gauge. Fill in the rest here.
 *
 *  - Contact: leave a field null until you have it. The assistant never makes
 *    up a phone number or an address: it only gives what is written here.
 *  - Knowledge: plain text, any language (English or French is best).
 *    Lines starting with "TODO" are ignored, so the assistant never reads out
 *    a placeholder. Replace each TODO with the real answer.
 *
 *  The AI key goes in .env.local (AI_PROVIDER, AI_API_KEY, AI_MODEL,
 *  AI_BASE_URL), never here: see .env.example.
 */

export type SupportContact = {
  email: string | null;
  phone: string | null;
  address: string | null;
  openingHours: string | null;
};

export const supportContact: SupportContact = {
  // TODO: e.g. "contact@novacell.fr"
  email: null,
  // TODO: e.g. "+33 4 93 00 00 00"
  phone: null,
  // TODO: e.g. "12 avenue de Verdun, 06500 Menton"
  address: null,
  // TODO: e.g. "Monday to Saturday, 9:30–12:30 and 14:00–19:00. Closed on Sunday."
  openingHours: null,
};

export const supportKnowledge = `
## Delivery
TODO: Do you ship phones, or is pickup in the shop the only option? Where, how fast, at what price?

## Returns and refunds
TODO: How many days to return a phone, in what condition, how the refund is paid.

## Warranty and repairs
TODO: What the warranty covers, how to use it, whether you repair phones bought elsewhere.

## Payment in the shop
TODO: Cash, card, payment in instalments?

## Setting up a new phone
TODO: What the data transfer service includes and what it costs.

## Other questions customers often ask
TODO: One question and its answer per line.
`;
