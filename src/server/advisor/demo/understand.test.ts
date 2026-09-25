import { describe, expect, it } from "vitest";
import { detectLanguage, parseBudget, understand, type UnderstandContext } from "./understand";

const context: UnderstandContext = {
  brands: [
    { id: "apple", name: "Apple" },
    { id: "samsung", name: "Samsung" },
    { id: "google", name: "Google" },
    { id: "xiaomi", name: "Xiaomi" },
    { id: "doro", name: "Doro" },
  ],
  models: ["iPhone 16", "iPhone 16e", "iPhone 15", "Galaxy S25", "Galaxy A56", "Redmi Note 14 Pro", "Pixel 9a"],
};

describe("detectLanguage", () => {
  it.each([
    ["Un iPhone pour ma fille, autour de 400 €", "fr"],
    ["Quels Samsung à moins de 300 € ?", "fr"],
    ["Un téléphone simple pour ma grand-mère", "fr"],
    ["An iPhone for my daughter, around €400", "en"],
    ["Which Samsung phones under €300?", "en"],
    ["I don't know yet", "en"],
    ["Un iPhone per mia figlia, sui 400 €", "it"],
    ["Quali Samsung sotto i 300 €?", "it"],
    ["La migliore fotocamera sotto i 700 €", "it"],
    ["Non lo so ancora", "it"],
  ])("%s -> %s", (text, expected) => {
    expect(detectLanguage(text)).toBe(expected);
  });

  it("returns null when there is nothing to go on", () => {
    expect(detectLanguage("Samsung")).toBeNull();
    expect(detectLanguage("400")).toBeNull();
  });
});

describe("parseBudget", () => {
  it.each([
    ["autour de 400 €", { kind: "around", amount: 400 }],
    ["around €400", { kind: "around", amount: 400 }],
    ["sui 400 €", { kind: "around", amount: 400 }],
    ["à moins de 300 €", { kind: "max", amount: 300 }],
    ["under €300", { kind: "max", amount: 300 }],
    ["sotto i 300 €", { kind: "max", amount: 300 }],
    ["Plus de 600 €", { kind: "min", amount: 600 }],
    ["Over €600", { kind: "min", amount: 600 }],
    ["Più di 600 €", { kind: "min", amount: 600 }],
    ["De 300 à 600 €", { kind: "range", min: 300, max: 600 }],
    ["€300 to €600", { kind: "range", min: 300, max: 600 }],
    ["Da 300 a 600 €", { kind: "range", min: 300, max: 600 }],
    ["tra 300 e 600 euro", { kind: "range", min: 300, max: 600 }],
    ["budget 1 000 €", { kind: "max", amount: 1000 }],
    ["500€ max", { kind: "max", amount: 500 }],
    ["400e", { kind: "around", amount: 400 }],
    ["450", { kind: "around", amount: 450 }],
  ])("%s", (text, expected) => {
    expect(parseBudget(text).budget).toEqual(expected);
  });

  it("ignores model numbers, storage and percentages", () => {
    expect(parseBudget("iPhone 15 128 Go").budget).toBeNull();
    expect(parseBudget("Galaxy S25 with 256GB").budget).toBeNull();
    expect(parseBudget("battery above 90%").budget).toBeNull();
    expect(parseBudget("Doro 8100").budget).toBeNull();
    expect(parseBudget("iPhone 16e under 700€").budget).toEqual({ kind: "max", amount: 700 });
  });
});

describe("understand", () => {
  it("reads brand, budget and audience", () => {
    const intent = understand("Un iPhone pour ma fille, autour de 400 €", context);
    expect(intent.brands).toEqual(["apple"]);
    expect(intent.budget).toEqual({ kind: "around", amount: 400 });
    expect(intent.audience).toContain("child");
    expect(intent.language).toBe("fr");
  });

  it("understands seniors and ease of use", () => {
    const intent = understand("A simple phone for my grandmother", context);
    expect(intent.uses).toContain("easy");
    expect(intent.audience).toContain("senior");
  });

  it("handles negations and other brands", () => {
    expect(understand("pas d'iPhone, un Android", context).excludedBrands).toContain("apple");
    expect(understand("pas d'iPhone, un Android", context).brands).not.toContain("apple");
    expect(understand("Show me other brands", context).otherBrands).toBe(true);
  });

  it("reads condition, including negated refurbished", () => {
    expect(understand("un iPhone reconditionné", context).condition).toBe("refurbished");
    expect(understand("un Samsung neuf", context).condition).toBe("new");
    expect(understand("not refurbished please", context).condition).toBe("new");
    expect(understand("I need a new phone", context).condition).toBeNull();
  });

  it("finds models without confusing 16 and 16e", () => {
    expect(understand("do you have the iPhone 16e?", context).models).toEqual(["iphone 16e"]);
    expect(understand("iphone 16 please", context).models).toEqual(["iphone 16"]);
    expect(understand("un s25", context).models).toEqual(["galaxy s25"]);
  });

  it("does not take Italian 'poco' for a brand or 'last' for battery", () => {
    expect(understand("un telefono poco costoso", context).brands).toEqual([]);
    expect(understand("the last one", context).uses).toEqual([]);
  });
});
