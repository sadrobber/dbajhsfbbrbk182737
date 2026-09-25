/** Shared by the chat panel and the server. No imports, so it stays tiny in the browser. */
export const SLOTS = ["right_choice", "smart_deal", "premium_option"] as const;
export type Slot = (typeof SLOTS)[number];

export const REPLY_TYPES = ["recommendations", "question", "no_match"] as const;
export type ReplyType = (typeof REPLY_TYPES)[number];

export const MAX_MESSAGE_LENGTH = 600;
/** Conversation turns sent back to the server with each question. */
export const MAX_TURNS = 16;
