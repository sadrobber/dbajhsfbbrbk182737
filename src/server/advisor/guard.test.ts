import { describe, expect, it } from "vitest";
import { availableItems, catalogItems, packageIds, settings } from "@/test/fixtures";
import { amountsIn, guardModelOutput, type GuardContext } from "./guard";
import type { ModelOutput } from "./output-schema";

const context: GuardContext = {
  items: availableItems,
  packageIds,
  packagePrices: settings.packages.map((p) => p.price),
  customerNumbers: [400],
  siteLocale: "fr",
};

const output = (overrides: Partial<ModelOutput>): ModelOutput => ({
  language: "en",
  type: "recommendations",
  message: "Here are a few good options.",
  recommendations: [],
  packages: [],
  quickReplies: [],
  ...overrides,
});

describe("amountsIn", () => {
  it("reads euro amounts in all formats", () => {
    expect(amountsIn("€449 or 1 299 € or 79 euros, even 1.099,00 €")).toEqual([449, 1299, 79, 1099]);
    expect(amountsIn("battery 90% and 128 GB")).toEqual([]);
  });
});

describe("guardModelOutput", () => {
  it("drops invented, sold-out and duplicate products", () => {
    const result = guardModelOutput(
      output({
        recommendations: [
          { slot: "right_choice", productId: "iphone-14-128-refurb", reason: "Great value" },
          { slot: "right_choice", productId: "iphone-13-128-refurb", reason: "Duplicate slot" },
          { slot: "smart_deal", productId: "iphone-99-ultra", reason: "Does not exist" },
          { slot: "premium_option", productId: "galaxy-s24-128-refurb", reason: "Sold out" },
        ],
      }),
      context,
    );
    expect(result?.recommendations.map((r) => r.productId)).toEqual(["iphone-14-128-refurb"]);
  });

  it("keeps slot prices consistent with the Right Choice", () => {
    const result = guardModelOutput(
      output({
        recommendations: [
          { slot: "right_choice", productId: "iphone-14-128-refurb", reason: "" },
          { slot: "smart_deal", productId: "iphone-17-256", reason: "More expensive: not a deal" },
          { slot: "premium_option", productId: "iphone-13-128-refurb", reason: "Cheaper: not premium" },
        ],
      }),
      context,
    );
    expect(result?.recommendations.map((r) => r.slot)).toEqual(["right_choice"]);
  });

  it("promotes a lone alternative to Right Choice", () => {
    const result = guardModelOutput(
      output({ recommendations: [{ slot: "premium_option", productId: "iphone-15-128-refurb", reason: "" }] }),
      context,
    );
    expect(result?.recommendations[0]).toMatchObject({ slot: "right_choice", productId: "iphone-15-128-refurb" });
  });

  it("replaces a message quoting a price that does not exist", () => {
    const result = guardModelOutput(
      output({
        message: "The iPhone 14 is only €199 today!",
        recommendations: [{ slot: "right_choice", productId: "iphone-14-128-refurb", reason: "Now €150 off" }],
      }),
      context,
    );
    expect(result?.message).toBe("Here are my picks for you:");
    expect(result?.recommendations[0].reason).toBe("");
  });

  it("keeps real prices and the customer's own budget", () => {
    const result = guardModelOutput(
      output({
        message: "Around €400, the iPhone 14 at €379 is a great pick.",
        recommendations: [{ slot: "right_choice", productId: "iphone-14-128-refurb", reason: "€21 under budget" }],
      }),
      context,
    );
    expect(result?.message).toContain("€379");
  });

  it("falls back to demo mode when no valid product is left", () => {
    expect(
      guardModelOutput(output({ recommendations: [{ slot: "right_choice", productId: "nope", reason: "" }] }), context),
    ).toBeNull();
  });

  it("a question carries no products and at most 4 short answers", () => {
    const result = guardModelOutput(
      output({
        type: "question",
        message: "What is your budget?",
        recommendations: [{ slot: "right_choice", productId: "iphone-14-128-refurb", reason: "" }],
        quickReplies: ["< €300", "€300–600", "> €600", "Not sure", "Fifth answer"],
      }),
      context,
    );
    expect(result?.recommendations).toEqual([]);
    expect(result?.quickReplies).toHaveLength(4);
  });

  it("only keeps known packages and strips markdown", () => {
    const result = guardModelOutput(
      output({
        message: "**Great** choice",
        recommendations: [{ slot: "right_choice", productId: "pixel-9a-128", reason: "" }],
        packages: ["max-protection", "gold-package", "max-protection"],
      }),
      context,
    );
    expect(result?.packages).toEqual(["max-protection"]);
    expect(result?.message).toBe("Great choice");
  });

  it("reads an unknown reply type from the content", () => {
    const withProducts = guardModelOutput(
      output({ type: "answer", recommendations: [{ slot: "right_choice", productId: "pixel-9a-128", reason: "" }] }),
      context,
    );
    expect(withProducts?.type).toBe("recommendations");
    const unknownSlot = guardModelOutput(
      output({ recommendations: [{ slot: "best", productId: "pixel-9a-128", reason: "" }] }),
      context,
    );
    expect(unknownSlot).toBeNull();
  });

  it("uses the real catalogue for checks", () => {
    expect(catalogItems.length).toBeGreaterThanOrEqual(15);
  });
});
