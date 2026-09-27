import { describe, expect, it } from "vitest";
import type { AssistantMemory, ChatTurn } from "@/lib/advisor/contract";
import { availableItems, catalogItems, packageIds } from "@/test/fixtures";
import { demoReply } from ".";

const ask = (text: string, siteLocale: "fr" | "en" | "it" = "fr", earlier: ChatTurn[] = []) =>
  demoReply([...earlier, { role: "user", text }], availableItems, { siteLocale, packageIds });

const ids = (reply: AssistantMemory) => reply.recommendations.map((r) => `${r.slot}:${r.productId}`);
const priceOf = (id: string) => catalogItems.find((item) => item.id === id)!.price;

describe("demo advisor", () => {
  it("an iPhone for a daughter around €400 (French)", () => {
    const reply = ask("Un iPhone pour ma fille, autour de 400 €");
    expect(reply.language).toBe("fr");
    expect(reply.type).toBe("recommendations");
    expect(ids(reply)).toEqual([
      "right_choice:iphone-14-128-refurb",
      "smart_deal:iphone-13-128-refurb",
      // The cheapest iPhone 15 (grade "Good"): closest above the budget.
      "premium_option:iphone-15-128-black-correct",
    ]);
    expect(reply.packages).toEqual(["max-protection"]);
    expect(reply.message).toContain("Apple");
    expect(reply.message).toContain("400");
  });

  it("Samsung phones under €300 (English)", () => {
    const reply = ask("Which Samsung phones under €300?", "fr");
    expect(reply.language).toBe("en");
    expect(ids(reply)).toEqual([
      "right_choice:galaxy-a56-128-refurb",
      "smart_deal:galaxy-a16-128",
      "premium_option:galaxy-a56-128",
    ]);
  });

  it("a simple phone for a grandmother (Italian)", () => {
    const reply = ask("Un telefono semplice per mia nonna", "fr");
    expect(reply.language).toBe("it");
    expect(reply.recommendations[0].productId).toBe("doro-8100-32");
    expect(reply.packages).toContain("ready-to-use");
  });

  it("best camera under €700", () => {
    const reply = ask("The best camera under €700", "en");
    expect(reply.recommendations[0].productId).toBe("iphone-16-128-black-excellent-new-battery");
    for (const rec of reply.recommendations) {
      expect(catalogItems.find((item) => item.id === rec.productId)!.goodFor).toContain("photo");
    }
  });

  it("asks one question when the request is vague, then recommends", () => {
    const first = ask("Bonjour");
    expect(first.type).toBe("question");
    expect(first.recommendations).toEqual([]);
    expect(first.quickReplies).toHaveLength(4);

    const second = ask("Je ne sais pas encore", "fr", [
      { role: "user", text: "Bonjour" },
      { role: "assistant", memory: first },
    ]);
    expect(second.type).toBe("recommendations");
    expect(second.recommendations.length).toBeGreaterThan(0);
  });

  it("understands a tapped quick reply as a budget", () => {
    const first = ask("Hello");
    const second = ask(first.quickReplies[1], "en", [
      { role: "user", text: "Hello" },
      { role: "assistant", memory: first },
    ]);
    expect(second.type).toBe("recommendations");
    for (const rec of second.recommendations.filter((r) => r.slot !== "premium_option")) {
      expect(priceOf(rec.productId)).toBeGreaterThanOrEqual(300);
      expect(priceOf(rec.productId)).toBeLessThanOrEqual(600);
    }
  });

  it("says so when a brand is not sold, and offers alternatives", () => {
    const reply = ask("Vous avez un Motorola ?");
    expect(reply.type).toBe("no_match");
    expect(reply.message).toContain("Motorola");
    expect(reply.recommendations.length).toBeGreaterThan(0);
  });

  it.each([
    "Un iPhone pour ma fille, autour de 400 €",
    "Which Samsung phones under €300?",
    "A Galaxy S24 please",
    "un reconditionné pas cher",
    "le plus puissant pour jouer",
    "Un téléphone pour le travail entre 500 et 900 €",
    "cheap phone with a great battery",
    "Un iPhone à moins de 200 €",
    "altre marche, sotto i 500 €",
    "iPhone 16e",
  ])("rules always hold: %s", (text) => {
    const reply = ask(text);
    const recs = reply.recommendations;
    expect(recs.length).toBeLessThanOrEqual(3);
    expect(new Set(recs.map((r) => r.slot)).size).toBe(recs.length);
    expect(new Set(recs.map((r) => r.productId)).size).toBe(recs.length);
    for (const rec of recs) {
      const item = catalogItems.find((i) => i.id === rec.productId);
      expect(item, rec.productId).toBeDefined();
      expect(item!.stock).toBeGreaterThan(0);
    }
    const right = recs.find((r) => r.slot === "right_choice");
    const smart = recs.find((r) => r.slot === "smart_deal");
    const premium = recs.find((r) => r.slot === "premium_option");
    if (recs.length > 0) expect(right).toBeDefined();
    if (smart) expect(priceOf(smart.productId)).toBeLessThan(priceOf(right!.productId));
    if (premium) expect(priceOf(premium.productId)).toBeGreaterThan(priceOf(right!.productId));
  });

  it("never recommends a sold-out phone", () => {
    const reply = ask("Galaxy S24 reconditionné");
    expect(reply.recommendations.map((r) => r.productId)).not.toContain("galaxy-s24-128-refurb");
  });
});
