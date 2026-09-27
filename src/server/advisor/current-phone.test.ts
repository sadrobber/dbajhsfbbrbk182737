import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdvisorReply, ChatTurn } from "@/lib/advisor/contract";
import { catalog } from "@/test/fixtures";
import { runAdvisor } from ".";
import { buildModelMatcher, isOwnedMention, matchText, resolveCurrentPhone } from "./current-phone";

const match = buildModelMatcher(catalog.models);
const idsIn = (text: string) => match(matchText(text)).map((m) => m.modelId);
const known = new Set(catalog.models.map((m) => m.id));

describe("finding phone models in a message", () => {
  it("recognises models however they are written", () => {
    expect(idsIn("un iPhone 12")).toEqual(["apple-iphone-12"]);
    expect(idsIn("my iphone 13 pro max")).toEqual(["apple-iphone-13-pro-max"]);
    expect(idsIn("un Samsung S21+")).toEqual(["samsung-galaxy-s21-plus"]);
    expect(idsIn("galaxy note 10")).toEqual(["samsung-galaxy-note10"]);
    expect(idsIn("Z Flip 3")).toEqual(["samsung-galaxy-z-flip3"]);
    expect(idsIn("Pixel 7a")).toEqual(["google-pixel-7a"]);
    expect(idsIn("Redmi Note 12 Pro")).toEqual(["xiaomi-redmi-note-12-pro-5g"]);
    expect(idsIn("Nothing Phone (2)")).toEqual(["nothing-phone-2"]);
    // "A52" and "A52 5G" are two models.
    expect(idsIn("galaxy a52")).toEqual(["samsung-galaxy-a52"]);
    expect(idsIn("galaxy a52 5g")).toEqual(["samsung-galaxy-a52-5g"]);
  });

  it("picks the newest model when a name is shared", () => {
    expect(idsIn("un iPhone SE")).toEqual(["apple-iphone-se-2022"]);
  });

  it("reads the storage written after the name", () => {
    expect(match(matchText("iPhone 12 128 Go"))[0]).toMatchObject({ modelId: "apple-iphone-12", storageGb: 128 });
    expect(match(matchText("S21 256gb"))[0]).toMatchObject({ storageGb: 256 });
  });

  it("tells a phone they own from a phone they want", () => {
    const owned = (text: string) => {
      const t = matchText(text);
      const [first] = match(t);
      return isOwnedMention(t.slice(0, first.start));
    };
    expect(owned("J'ai un iPhone 11")).toBe(true);
    expect(owned("je veux remplacer mon vieux Galaxy S9")).toBe(true);
    expect(owned("I have an iPhone 12")).toBe(true);
    expect(owned("my current phone is a Pixel 6")).toBe(true);
    expect(owned("Ho un iPhone 13")).toBe(true);
    expect(owned("Ma fille veut un iPhone 15")).toBe(false);
    expect(owned("I have a budget of €500 for an iPhone 15")).toBe(false);
    expect(owned("j'ai besoin d'un iPhone 15")).toBe(false);
  });
});

describe("the customer's current phone in a conversation", () => {
  const askMemory = {
    language: "fr" as const,
    type: "question" as const,
    message: "Quel téléphone avez-vous ?",
    recommendations: [],
    packages: [],
    quickReplies: [],
    question: "current_phone" as const,
    currentPhone: null,
  };

  it("takes the answer to the question, and leaves the rest of the message as the wish", () => {
    const history: ChatTurn[] = [
      { role: "user", text: "Un iPhone pour ma fille" },
      { role: "assistant", memory: askMemory },
      { role: "user", text: "iPhone 11, et elle voudrait un iPhone 15" },
    ];
    const state = resolveCurrentPhone(history, match, known);
    expect(state.asked).toBe(true);
    expect(state.phone).toEqual({ modelId: "apple-iphone-11", storageGb: null });
    expect(state.withoutCurrentPhone.get(2)).not.toContain("iphone 11");
    expect(state.withoutCurrentPhone.get(2)).toContain("iphone 15");
  });

  it("remembers it from an earlier answer, but not an unknown model id", () => {
    const remembered = { ...askMemory, type: "recommendations" as const, question: null, currentPhone: { modelId: "apple-iphone-12", storageGb: 64 } };
    expect(resolveCurrentPhone([{ role: "assistant", memory: remembered }, { role: "user", text: "Et moins cher ?" }], match, known).phone).toEqual({
      modelId: "apple-iphone-12",
      storageGb: 64,
    });
    const forged = { ...remembered, currentPhone: { modelId: "not-a-phone", storageGb: null } };
    expect(resolveCurrentPhone([{ role: "assistant", memory: forged }, { role: "user", text: "Et moins cher ?" }], match, known).phone).toBeNull();
  });
});

describe("the advisor asks which phone they have first", () => {
  afterEach(() => vi.unstubAllEnvs());
  const ask = (messages: ChatTurn[]) => runAdvisor({ locale: "fr", messages });
  const turn = (reply: AdvisorReply): ChatTurn => ({ role: "assistant", memory: reply.memory });

  it("asks it once, then recommends with a trade-in estimate and comparison links", async () => {
    vi.stubEnv("AI_PROVIDER", "demo");
    const first = await ask([{ role: "user", text: "Un iPhone pour ma fille, autour de 400 €" }]);
    expect(first.type).toBe("question");
    expect(first.memory.question).toBe("current_phone");
    expect(first.quickReplies).toHaveLength(2);

    const second = await ask([
      { role: "user", text: "Un iPhone pour ma fille, autour de 400 €" },
      turn(first),
      { role: "user", text: "Un iPhone 11 128 Go" },
    ]);
    expect(second.type).toBe("recommendations");
    expect(second.memory.currentPhone).toEqual({ modelId: "apple-iphone-11", storageGb: 128 });
    expect(second.currentPhone?.name).toBe("Apple iPhone 11");
    expect(second.currentPhone?.tradeIn).toMatch(/\d/);
    for (const card of second.cards) {
      expect(card.compare?.href).toMatch(/^\/fr\/compare\/apple-iphone-11-vs-apple-/);
      expect(card.afterTradeIn).toContain("après reprise");
    }
  });

  it("doesn't ask when the customer already said it, and never suggests that model", async () => {
    vi.stubEnv("AI_PROVIDER", "demo");
    const reply = await ask([{ role: "user", text: "J'ai un iPhone 13 et je voudrais un autre iPhone" }]);
    expect(reply.type).toBe("recommendations");
    expect(reply.memory.currentPhone?.modelId).toBe("apple-iphone-13");
    expect(reply.cards.length).toBeGreaterThan(0);
    for (const card of reply.cards) expect(card.product.id).not.toMatch(/^iphone-13-/);
  });

  it("moves on when the customer skips the question", async () => {
    vi.stubEnv("AI_PROVIDER", "demo");
    const first = await ask([{ role: "user", text: "Bonjour" }]);
    const second = await ask([{ role: "user", text: "Bonjour" }, turn(first), { role: "user", text: first.quickReplies[1] }]);
    // Still nothing to go on: now it asks what they need, not the phone again.
    expect(second.type).toBe("question");
    expect(second.memory.question).toBe("needs");
    expect(second.currentPhone).toBeNull();
  });
});
