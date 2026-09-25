/** Keeps only the given top-level keys of an object (e.g. message namespaces for the browser). */
export function pick<T extends Record<string, unknown>, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) result[key] = source[key];
  return result;
}
