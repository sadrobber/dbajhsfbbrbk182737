import { createTranslator } from "next-intl";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import it from "../../messages/it.json";
import type { Locale } from "./routing";

// All UI text lives in /messages/<locale>.json. English is the reference for types.
export type Messages = typeof en;

const catalogs: Record<Locale, Messages> = { fr, en, it };

export function getMessagesFor(locale: Locale): Messages {
  return catalogs[locale];
}

/** Translator usable anywhere on the server (route handlers, tests), not only in React. */
export function getTranslator(locale: Locale) {
  return createTranslator({ locale, messages: catalogs[locale] });
}

export type Translator = ReturnType<typeof getTranslator>;
