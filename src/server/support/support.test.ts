import { afterEach, describe, expect, it, vi } from "vitest";
import { type SupportContact, supportKnowledge } from "@/config/support.config";
import { getTranslator } from "@/i18n/messages";
import { batteryOptionInfoSchema, gradeInfoSchema } from "@/lib/data/schema";
import { supportRequestSchema } from "@/lib/support/contract";
import { catalogItems, settings } from "@/test/fixtures";
import batteryOptions from "../../../data/battery-options.json";
import grades from "../../../data/grades.json";
import { cleanReply, offlineReply, runSupport } from ".";
import { buildKnowledge, cleanOwnerKnowledge, contactLines } from "./knowledge";
import { buildSupportPrompt } from "./prompt";

const noContact: SupportContact = { email: null, phone: null, address: null, openingHours: null };
const fullContact: SupportContact = {
  email: "contact@example.test",
  phone: "+33 4 93 00 00 00",
  address: "1 rue de l’Exemple, Menton",
  openingHours: "Mon–Sat 9:30–19:00",
};

const knowledge = (contact: SupportContact, ownerKnowledge = supportKnowledge) =>
  buildKnowledge({
    brandName: "Novacell",
    t: getTranslator("en"),
    items: catalogItems,
    grades: gradeInfoSchema.array().parse(grades.rows),
    batteryOptions: batteryOptionInfoSchema.array().parse(batteryOptions.rows),
    settings,
    contact,
    ownerKnowledge,
  });

describe("support knowledge", () => {
  it("never passes the owner's TODO placeholders to the model", () => {
    expect(cleanOwnerKnowledge(supportKnowledge)).toBe("");
    expect(knowledge(noContact)).not.toMatch(/TODO/);
  });

  it("keeps the owner's real answers, with their headings", () => {
    const text = "## Delivery\nTODO: shipping?\n\n## Returns\n14 days, in the original box.\n";
    expect(cleanOwnerKnowledge(text)).toBe("## Returns\n14 days, in the original box.");
  });

  it("lists only the contact details that are filled in", () => {
    expect(contactLines(noContact)).toEqual([]);
    expect(contactLines({ ...noContact, phone: " +33 4 93 00 00 00 " })).toEqual(["Phone: +33 4 93 00 00 00"]);
  });

  it("describes the shop from its live data", () => {
    const text = knowledge(fullContact);
    expect(text).toContain("# Ordering and payment on the website");
    expect(text).toContain("authorised now but not charged");
    expect(text).toContain("Apple iPhone 16: new from €");
    expect(text).toContain("Max Protection Package");
    expect(text).toContain("Email: contact@example.test");
    // Promo codes stay private.
    expect(text).not.toMatch(/promo code/i);
  });

  it("leaves out phones that can't be ordered at all", () => {
    const soldOut = catalogItems.map((item) => ({ ...item, stock: 0, supplierAvailability: "none" as const }));
    const text = buildKnowledge({
      brandName: "Novacell",
      t: getTranslator("en"),
      items: soldOut,
      grades: [],
      batteryOptions: [],
      settings,
      contact: noContact,
      ownerKnowledge: "",
    });
    expect(text).toContain("No phone can be ordered at the moment.");
  });
});

describe("support prompt", () => {
  it("forbids making up contact details when none are set", () => {
    const prompt = buildSupportPrompt({ brandName: "Novacell", siteLocale: "fr", knowledge: "x", contact: [] });
    expect(prompt).toContain("never make up an email, phone number, address or opening hours");
    expect(prompt).toContain("reply in French");
  });

  it("gives the contact details when they are set", () => {
    const prompt = buildSupportPrompt({
      brandName: "Novacell",
      siteLocale: "en",
      knowledge: "x",
      contact: contactLines(fullContact),
    });
    expect(prompt).toContain("Email: contact@example.test; Phone: +33 4 93 00 00 00");
  });
});

describe("support answers", () => {
  it("strips Markdown and caps the length", () => {
    expect(cleanReply("## Hours\n**Open** every day, see [our page](/store).")).toBe("Hours\nOpen every day, see our page (/store).");
    const long = `${"This is a sentence. ".repeat(100)}`;
    const cleaned = cleanReply(long);
    expect(cleaned.length).toBeLessThanOrEqual(1200);
    expect(cleaned.endsWith(".")).toBe(true);
  });

  it("answers in the page's language without an AI", () => {
    expect(offlineReply("fr")).toContain("n’est pas disponible");
    expect(offlineReply("it")).toContain("non è disponibile");
  });

  describe("without an AI provider", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("returns the offline answer", async () => {
      vi.stubEnv("AI_PROVIDER", "demo");
      const reply = await runSupport({ locale: "en", messages: [{ role: "user", text: "When are you open?" }] });
      expect(reply).toEqual({ engine: "offline", reply: offlineReply("en") });
    });
  });

  it("only accepts a conversation that ends with the visitor's question", () => {
    const base = { locale: "fr" };
    expect(supportRequestSchema.safeParse({ ...base, messages: [{ role: "user", text: "Bonjour" }] }).success).toBe(true);
    expect(supportRequestSchema.safeParse({ ...base, messages: [] }).success).toBe(false);
    expect(
      supportRequestSchema.safeParse({
        ...base,
        messages: [
          { role: "user", text: "Bonjour" },
          { role: "assistant", text: "Bonjour !" },
        ],
      }).success,
    ).toBe(false);
    expect(supportRequestSchema.safeParse({ ...base, messages: [{ role: "user", text: "x".repeat(601) }] }).success).toBe(false);
  });
});
