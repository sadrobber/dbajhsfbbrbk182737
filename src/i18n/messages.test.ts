import { describe, expect, it } from "vitest";
import { prizeKeys } from "@/lib/data/schema";
import { settings } from "@/test/fixtures";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import it_ from "../../messages/it.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : flatten(value, `${prefix}${key}.`),
  );
}

function get(tree: Tree, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node as Tree | undefined)?.[key], tree);
}

const files = { en, fr, it: it_ } as Record<string, Tree>;

describe("translation files", () => {
  it("have exactly the same keys in French, English and Italian", () => {
    const reference = flatten(files.en).sort();
    expect(flatten(files.fr).sort()).toEqual(reference);
    expect(flatten(files.it).sort()).toEqual(reference);
  });

  it("contain every label the site configuration refers to", () => {
    const keys = [
      ...settings.packages.flatMap((pkg) => [`Packages.${pkg.id}.name`, `Packages.${pkg.id}.tagline`]),
      ...settings.serviceArea.towns.map((town) => `Local.towns.${town}`),
      ...settings.serviceArea.services.flatMap((s) => [`Local.services.${s}.title`, `Local.services.${s}.text`]),
      ...prizeKeys.map((prize) => `Gauge.prizes.${prize}`),
    ];
    for (const [locale, tree] of Object.entries(files)) {
      for (const key of keys) {
        expect(typeof get(tree, key), `${locale}: ${key}`).toBe("string");
      }
    }
  });

  it("never puts an apostrophe right before a placeholder (ICU would swallow it)", () => {
    for (const [locale, tree] of Object.entries(files)) {
      for (const key of flatten(tree)) {
        expect(String(get(tree, key)), `${locale}: ${key}`).not.toMatch(/'\{/);
      }
    }
  });
});
