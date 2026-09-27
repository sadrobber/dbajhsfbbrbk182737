import { describe, expect, it } from "vitest";
import {
  invoiceStatuses,
  orderChannels,
  orderStatuses,
  paymentStatuses,
  tradeInConditions,
  tradeInStatuses,
} from "@/lib/data/records";
import { batteryOptions, conditions, grades, iconKeys, supplierAvailabilities, supplies, visuals } from "@/lib/data/schema";
import en from "../../messages/admin/en.json";
import fr from "../../messages/admin/fr.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : flatten(value, `${prefix}${key}.`),
  );
}

function get(tree: Tree, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node as Tree | undefined)?.[key], tree);
}

const files = { en, fr } as Record<string, Tree>;

describe("admin translation files", () => {
  it("have exactly the same keys in French and English", () => {
    expect(flatten(files.fr).sort()).toEqual(flatten(files.en).sort());
  });

  it("label every value the records can hold", () => {
    const groups: Record<string, readonly string[]> = {
      orderStatus: orderStatuses,
      orderChannel: orderChannels,
      supply: supplies,
      supplierAvailability: supplierAvailabilities,
      paymentStatus: paymentStatuses,
      tradeInStatus: tradeInStatuses,
      tradeInCondition: tradeInConditions,
      invoiceStatus: invoiceStatuses,
      grade: grades,
      gradeShort: grades,
      battery: batteryOptions,
      condition: conditions,
      visual: visuals,
      icon: iconKeys,
    };
    for (const [locale, tree] of Object.entries(files)) {
      for (const [group, values] of Object.entries(groups)) {
        for (const value of values) {
          expect(typeof get(tree, `Labels.${group}.${value}`), `${locale}: Labels.${group}.${value}`).toBe("string");
        }
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
