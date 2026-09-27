import type { ChatTurn, CurrentPhoneRef } from "@/lib/advisor/contract";
import type { PhoneModel } from "@/lib/data/schema";
import { normalize } from "./demo/understand";

/**
 * The phone the customer has now: found in what they write (any of the models
 * in the spec database, not only the ones for sale), so the advisor can skip
 * phones they already own, estimate a trade-in and offer a comparison.
 */

export type ModelMention = { modelId: string; start: number; end: number; storageGb: number | null };
export type MatchableModel = Pick<PhoneModel, "id" | "brand" | "name" | "full_name" | "release">;

/** The form every text is matched in: normalized, "+" spelled out, no brackets. */
export function matchText(raw: string): string {
  return normalize(raw)
    .replace(/\+/g, " plus ")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "galaxy note10" also matches "galaxy note 10", "s21" also "s 21". */
function aliasPattern(alias: string): string {
  return alias
    .split(" ")
    .map((word) => word.split(/(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])/).map(escape).join("\\s*"))
    .join("\\s*");
}

function aliasesOf(model: MatchableModel): string[] {
  const brand = matchText(model.brand);
  const name = matchText(model.name);
  const full = matchText(model.full_name);
  const list = new Set([full, `${brand} ${name}`]);
  // A name that is recognisable on its own: "iphone 13", "pixel 7a", "galaxy s21", "redmi note 12", "mi 11".
  if (/^(?:iphone|pixel|galaxy|redmi|mi) /.test(name)) list.add(name);
  // Samsung without "galaxy": "s21 fe", "note 20 ultra", "z flip 3", "a52".
  const shortSamsung = name.replace(/^galaxy /, "");
  if (brand === "samsung" && /^(?:[sazm]\d|note|z )/.test(shortSamsung)) list.add(shortSamsung);
  // Xiaomi without "redmi": "note 12 pro".
  if (brand === "xiaomi" && name.startsWith("redmi note ")) list.add(name.replace(/^redmi /, ""));
  // "... 5g" and a year ("iphone se 2022") may be left out.
  for (const alias of [...list]) {
    if (alias.endsWith(" 5g")) list.add(alias.slice(0, -3));
    if (/ 20\d\d$/.test(alias)) list.add(alias.slice(0, -5));
  }
  return [...list].filter((alias) => /\d|[a-z]{3}/.test(alias));
}

/**
 * Builds a function that finds model names in a text (already in matchText form).
 * When two models share an alias ("iphone se"), the newest one wins; a longer
 * alias always wins over a shorter one ("iphone 13 pro max" over "iphone 13").
 */
export function buildModelMatcher(models: MatchableModel[]): (text: string) => ModelMention[] {
  const byAlias = new Map<string, MatchableModel>();
  const newest = [...models].sort((a, b) => (b.release.month ?? "").localeCompare(a.release.month ?? ""));
  for (const model of newest) {
    for (const alias of aliasesOf(model)) if (!byAlias.has(alias)) byAlias.set(alias, model);
  }
  const entries = [...byAlias.entries()]
    .sort((a, b) => b[0].length - a[0].length)
    .map(([alias, model]) => ({ model, regex: new RegExp(`(?<![a-z0-9])${aliasPattern(alias)}(?![a-z0-9])`, "g") }));

  return (text) => {
    let remaining = text;
    const found: ModelMention[] = [];
    for (const { model, regex } of entries) {
      regex.lastIndex = 0;
      for (const match of remaining.matchAll(regex)) {
        const start = match.index;
        let end = start + match[0].length;
        // A storage size right after the name: "iphone 12 128 go", "s21 256gb".
        const storage = /^\s*(?:de\s+|da\s+|with\s+)?(32|64|128|256|512|1)\s?(go|gb|g|to|tb)(?![a-z0-9])/.exec(text.slice(end));
        let storageGb: number | null = null;
        if (storage) {
          storageGb = storage[2] === "to" || storage[2] === "tb" ? Number(storage[1]) * 1024 : Number(storage[1]);
          end += storage[0].length;
        }
        found.push({ modelId: model.id, start, end, storageGb });
        remaining = `${remaining.slice(0, start)}${" ".repeat(match[0].length)}${remaining.slice(start + match[0].length)}`;
      }
    }
    return found.sort((a, b) => a.start - b.start);
  };
}

// What comes right before a model the customer owns: "j'ai un", "mon vieux", "i have an", "my current phone is a", "ho un"...
const OWNER = "(?:j'?ai|je possede|j'utilise|actuellement|mon|i have|i've got|ive got|i got|i own|i use|i'm using|currently|my|ho|possiedo|uso|attualmente|il mio|la mia)";
const ARTICLE = "(?:un|une|a|an|uno|una|un'|le|la|il|lo|the)";
const ADJECTIVE = "(?:vieux|vieil|ancien|actuel|old|current|present|vecchio|attuale)";
const PHONE_WORD = "(?:telephone|portable|smartphone|tel|phone|mobile|telefono|cellulare)";
const LINK = "(?:est|c'est|is|it's|e|sono)";
const OWNED_BEFORE = new RegExp(
  `(?<![a-z0-9'])${OWNER}(?:\\s+${ARTICLE})?(?:\\s+${ADJECTIVE})?(?:\\s+${PHONE_WORD}(?:\\s+${ADJECTIVE})?(?:\\s*[,:]?\\s*${LINK})?(?:\\s+${ARTICLE})?)?\\s*[:,]?\\s*$`,
);

/** True when the text right before a model name says the customer owns it. */
export function isOwnedMention(before: string): boolean {
  return OWNED_BEFORE.test(before.slice(-60));
}

export type CurrentPhoneState = {
  phone: CurrentPhoneRef | null;
  /** The advisor already asked which phone they have (don't ask twice). */
  asked: boolean;
  /** Customer messages with the current phone removed, by index: for rules that read "what they want". */
  withoutCurrentPhone: Map<number, string>;
};

/**
 * Reads the conversation: an earlier answer's memory, an answer to the
 * "which phone do you have?" question, or "I have an iPhone 11" anywhere.
 * The latest statement wins. Unknown model ids from the browser are ignored.
 */
export function resolveCurrentPhone(
  history: ChatTurn[],
  match: (text: string) => ModelMention[],
  knownModelIds: Set<string>,
): CurrentPhoneState {
  let phone: CurrentPhoneRef | null = null;
  let asked = false;
  const withoutCurrentPhone = new Map<number, string>();

  history.forEach((turn, index) => {
    if (turn.role === "assistant") {
      if (turn.memory.question === "current_phone") asked = true;
      const remembered = turn.memory.currentPhone;
      if (remembered && knownModelIds.has(remembered.modelId)) phone = remembered;
      return;
    }
    const previous = history[index - 1];
    const answering = previous?.role === "assistant" && previous.memory.question === "current_phone";
    const text = matchText(turn.text);
    const mentions = match(text);
    const owned = mentions.find((mention, i) => (answering && i === 0) || isOwnedMention(text.slice(0, mention.start)));
    if (owned) {
      phone = { modelId: owned.modelId, storageGb: owned.storageGb };
      withoutCurrentPhone.set(index, `${text.slice(0, owned.start)} ${text.slice(owned.end)}`);
    }
  });

  return { phone, asked, withoutCurrentPhone };
}
