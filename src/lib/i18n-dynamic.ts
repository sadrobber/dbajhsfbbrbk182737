/**
 * Translation keys built from configuration (package ids, towns, services...)
 * cannot be checked by TypeScript. This helper accepts them; the unit tests check
 * that every configured key exists in all three message files.
 */
type AnyTranslator = (key: never, values?: never) => string;

export function translateDynamic(
  t: AnyTranslator,
  key: string,
  values?: Record<string, string | number>,
): string {
  return (t as unknown as (key: string, values?: Record<string, string | number>) => string)(key, values);
}
