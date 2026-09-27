import { describe, expect, it } from "vitest";
import { getTranslator } from "@/i18n/messages";
import { bestCaseTradeIns, pickTradeIn, tradeInConfigSchema, tradeInPriceSchema } from "@/lib/data/pricing";
import { catalog } from "@/test/fixtures";
import tradeInConfig from "../../../data/tradein-config.json";
import tradeInPrices from "../../../data/tradein-prices.json";
import { modelsByBrand, modelTitle, parseComparePair } from "./pairs";
import { compareSpecs, rankOf } from "./specs";

const model = (id: string) => catalog.models.find((m) => m.id === id)!;
const rowsOf = (mine: string, want: string, locale: "fr" | "en" = "en") =>
  compareSpecs(model(mine), model(want), getTranslator(locale), locale).flatMap((section) => section.rows);

describe("comparison pages", () => {
  it("read two model ids from the address", () => {
    expect(parseComparePair("apple-iphone-12-vs-apple-iphone-16")).toEqual({ mine: "apple-iphone-12", want: "apple-iphone-16" });
    expect(parseComparePair("apple-iphone-12")).toBeNull();
    expect(parseComparePair("-vs-apple-iphone-16")).toBeNull();
    // Model ids never contain "-vs-", so any two of them make a valid address.
    expect(catalog.models.filter((m) => m.id.includes("-vs-"))).toEqual([]);
  });

  it("name and group phones the way customers know them", () => {
    expect(modelTitle(model("apple-iphone-16"))).toBe("Apple iPhone 16");
    expect(modelTitle(model("google-pixel-9a"))).toBe("Google Pixel 9a");
    const groups = modelsByBrand(catalog.models);
    expect(groups[0].brand).toBe("Apple");
    expect(groups.flatMap((g) => g.models)).toHaveLength(catalog.models.length);
  });
});

describe("spec comparison", () => {
  it("marks the better side only where more is clearly better", () => {
    const rows = rowsOf("apple-iphone-12", "apple-iphone-16");
    const row = (key: string) => rows.find((r) => r.key === key)!;
    expect(row("battery").better).toBe("want");
    expect(row("released").better).toBe("want");
    expect(row("chip")).toMatchObject({ mine: "A14 Bionic", better: null, differs: true });
    // Size and weight are a matter of taste.
    expect(row("size").better).toBeNull();
    expect(row("weight").better).toBeNull();
  });

  it("formats units in the page language and keeps spec texts as they are", () => {
    const fr = rowsOf("apple-iphone-12", "apple-iphone-16", "fr");
    expect(fr.find((r) => r.key === "size")!.mine).toBe("6,1″");
    expect(fr.find((r) => r.key === "mainCamera")!.mine).toBe("12 Mpx");
    expect(fr.find((r) => r.key === "released")!.mine).toMatch(/2020/);
  });

  it("hides rows unknown for both phones and extras neither phone has", () => {
    for (const row of rowsOf("google-pixel-9a", "samsung-galaxy-s25")) {
      expect(row.mine !== null || row.want !== null).toBe(true);
    }
    expect(rowsOf("google-pixel-9a", "samsung-galaxy-s25").some((r) => r.key === "dynamicIsland")).toBe(false);
    const iphones = rowsOf("apple-iphone-12", "apple-iphone-16");
    expect(iphones.find((r) => r.key === "actionButton")).toMatchObject({ mine: "No", want: "Yes", better: "want" });
  });

  it("shows both sizes of a foldable", () => {
    const foldable = catalog.models.find((m) => m.form_factor === "foldable")!;
    const row = compareSpecs(foldable, model("apple-iphone-16"), getTranslator("en"), "en")
      .flatMap((s) => s.rows)
      .find((r) => r.key === "dimensions")!;
    expect(row.mine).toMatch(/Folded: .* · Unfolded: /);
  });

  it("ranks the text specs it compares", () => {
    expect(rankOf("wifi", "Wi-Fi 6E")! > rankOf("wifi", "Wi-Fi 6")!).toBe(true);
    expect(rankOf("water", "IP68")! > rankOf("water", "IP67")!).toBe(true);
    expect(rankOf("water", "IP68 / IP69")).toBe(96);
    expect(rankOf("network", "5G (Apple C1 modem)")).toBe(5);
    expect(rankOf("network", "4G / 5G (by version)")).toBe(4);
  });
});

describe("trade-in estimates", () => {
  const prices = tradeInPriceSchema.array().parse(tradeInPrices.rows);
  const config = tradeInConfigSchema.parse(tradeInConfig);

  it("give the best-case offer per storage, smallest first, with the shop-credit bonus", () => {
    const estimates = bestCaseTradeIns(prices, config, "apple-iphone-12");
    expect(estimates.length).toBeGreaterThan(0);
    expect(estimates.map((e) => e.storageGb)).toEqual([...estimates.map((e) => e.storageGb)].sort((a, b) => a - b));
    for (const e of estimates) {
      const base = prices.find((p) => p.modelId === "apple-iphone-12" && p.storageGb === e.storageGb)!.basePrice;
      expect(e.amount).toBe(base);
      expect(e.storeCreditAmount).toBe(Math.round((base * (100 + config.storeCreditBonusPercent)) / 100));
    }
  });

  it("use the stated storage, else the smallest", () => {
    const estimates = bestCaseTradeIns(prices, config, "apple-iphone-12");
    expect(pickTradeIn(estimates, 128)?.storageGb).toBe(128);
    expect(pickTradeIn(estimates, 999)?.storageGb).toBe(estimates[0].storageGb);
    expect(pickTradeIn([], 128)).toBeNull();
  });
});
