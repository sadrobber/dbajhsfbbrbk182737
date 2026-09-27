import { z } from "zod";
import { slug } from "./schema";

/**
 * Pricing tables: promo codes (data/promo-codes.json) and the trade-in grid
 * (data/tradein-prices.json + data/tradein-config.json). Values are edited by
 * staff later; the functions here are the rules that apply them.
 */

const money = z.number().min(0);

export const promoCodeSchema = z
  .object({
    id: slug,
    /** What customers type, in capitals. */
    code: z.string().regex(/^[A-Z0-9]{3,20}$/),
    kind: z.enum(["percent", "fixed"]),
    /** percent: 1-100; fixed: euros. */
    value: z.number().positive(),
    /** Minimum order in euros (VAT incl.), or null. */
    minOrder: money.nullable(),
    expiresAt: z.iso.datetime().nullable(),
    active: z.boolean(),
  })
  .refine((c) => c.kind !== "percent" || c.value <= 100, { path: ["value"], message: "percentMax" });

export type PromoCode = z.infer<typeof promoCodeSchema>;

export type PromoResult =
  | { ok: true; code: PromoCode; discount: number }
  | { ok: false; reason: "unknown" | "expired" | "min_order"; minOrder?: number };

/** Checks a code typed by the customer against an order subtotal (euros). */
export function applyPromoCode(codes: PromoCode[], typed: string, subtotal: number, now = new Date()): PromoResult {
  const code = codes.find((c) => c.active && c.code === typed.trim().toUpperCase());
  if (!code) return { ok: false, reason: "unknown" };
  if (code.expiresAt && new Date(code.expiresAt) < now) return { ok: false, reason: "expired" };
  if (code.minOrder !== null && subtotal < code.minOrder) return { ok: false, reason: "min_order", minOrder: code.minOrder };
  const raw = code.kind === "percent" ? (subtotal * code.value) / 100 : code.value;
  return { ok: true, code, discount: Math.min(subtotal, Math.round(raw * 100) / 100) };
}

// --- trade-in -----------------------------------------------------------------------

export const tradeInPriceSchema = z.object({
  id: slug,
  /** models.id */
  modelId: slug,
  storageGb: z.number().int().positive(),
  /** Buy-back price in euros for a phone in perfect working order. */
  basePrice: z.number().positive(),
});

export const screenConditions = ["perfect", "light_scratches", "deep_scratches", "cracked"] as const;
export const bodyConditions = ["perfect", "light_wear", "heavy_wear", "damaged"] as const;

const policySchema = z.object({
  /** refuse: "we can't buy this one"; recycle: a flat recycling offer. */
  policy: z.enum(["refuse", "recycle"]),
  recycleOffer: money,
});

const percent = z.number().min(0).max(100);

export const tradeInConfigSchema = z.object({
  /** Extra % when the customer takes store credit instead of a bank transfer. */
  storeCreditBonusPercent: percent,
  /** No quote goes below this, in euros (except refusals). */
  minimumOffer: money,
  deductionsPercent: z.object({
    screen: z.object(Object.fromEntries(screenConditions.map((k) => [k, percent])) as Record<(typeof screenConditions)[number], typeof percent>),
    body: z.object(Object.fromEntries(bodyConditions.map((k) => [k, percent])) as Record<(typeof bodyConditions)[number], typeof percent>),
    batteryBelow80: percent,
    biometricsBroken: percent,
  }),
  /** Phones that don't turn on or work normally. */
  notWorking: policySchema,
  /** Phones still locked to a carrier or an iCloud / Google account. */
  locked: policySchema,
});

export type TradeInPrice = z.infer<typeof tradeInPriceSchema>;
export type TradeInConfig = z.infer<typeof tradeInConfigSchema>;

export type TradeInAnswers = {
  modelId: string;
  storageGb: number;
  worksNormally: boolean;
  screen: (typeof screenConditions)[number];
  body: (typeof bodyConditions)[number];
  batteryAbove80: boolean;
  biometricsWork: boolean;
  unlocked: boolean;
};

export type TradeInQuote =
  | { kind: "offer"; amount: number; storeCreditAmount: number }
  | { kind: "recycle"; amount: number }
  | { kind: "refused"; reason: "locked" | "not_working" }
  /** The shop doesn't buy this model / storage back (not in the grid). */
  | { kind: "not_bought" };

/** Instant estimate; the final offer is confirmed after inspection. */
export function quoteTradeIn(prices: TradeInPrice[], config: TradeInConfig, answers: TradeInAnswers): TradeInQuote {
  const price = prices.find((p) => p.modelId === answers.modelId && p.storageGb === answers.storageGb);
  if (!price) return { kind: "not_bought" };

  const policy = !answers.unlocked ? { ...config.locked, reason: "locked" as const } : !answers.worksNormally ? { ...config.notWorking, reason: "not_working" as const } : null;
  if (policy) return policy.policy === "refuse" ? { kind: "refused", reason: policy.reason } : { kind: "recycle", amount: policy.recycleOffer };

  const d = config.deductionsPercent;
  const deduction =
    d.screen[answers.screen] + d.body[answers.body] + (answers.batteryAbove80 ? 0 : d.batteryBelow80) + (answers.biometricsWork ? 0 : d.biometricsBroken);
  const amount = Math.max(config.minimumOffer, Math.round((price.basePrice * Math.max(0, 100 - deduction)) / 100));
  return { kind: "offer", amount, storeCreditAmount: Math.round((amount * (100 + config.storeCreditBonusPercent)) / 100) };
}
