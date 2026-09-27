import type { Slot } from "@/lib/advisor/contract";
import type { CatalogItem, GoodFor } from "@/lib/data/schema";
import { isVague, normalize, type Budget, type Intent } from "./understand";

/**
 * Rule-based selection used by demo mode.
 * Only phones in stock, at most one per slot:
 *  - right_choice:   best match for the request and budget
 *  - smart_deal:     at least 10% cheaper, still a good fit
 *  - premium_option: above the budget but within reach, at least as good a fit
 */

export type Pick = {
  slot: Slot;
  item: CatalogItem;
  /** Requested uses this phone is good for, most relevant first. */
  matchedUses: GoodFor[];
  fitsBudget: boolean;
};

export type Notice = "popular" | "closest" | "noBrand" | null;

export type Plan =
  | { kind: "question" }
  | { kind: "nothing" }
  | {
      kind: "recommendations";
      notice: Notice;
      /** Brand the customer asked for that is not in stock. */
      missingBrand: string | null;
      picks: Pick[];
      packages: string[];
      /** The budget stated by the customer (not one inferred from "cheap"). */
      statedBudget: Budget | null;
    };

/** Package ids from site.config.ts that demo mode knows how to suggest. */
export const PROTECTION_PACKAGE_ID = "max-protection";
export const READY_PACKAGE_ID = "ready-to-use";

/** Brands behind the "Other brands" shortcut are everything except these. */
const MAIN_BRANDS = ["apple", "samsung"];

function fitsBudget(price: number, budget: Budget | null): boolean {
  if (!budget) return true;
  switch (budget.kind) {
    case "max":
      return price <= budget.amount;
    case "around":
      return price >= budget.amount * 0.7 && price <= budget.amount * 1.1;
    case "min":
      return price >= budget.amount;
    case "range":
      return price >= budget.min && price <= budget.max;
  }
}

function budgetTarget(budget: Budget): number {
  return budget.kind === "range" ? budget.max : budget.amount;
}

/** How far above the budget a Premium Option may go. */
function premiumCap(budget: Budget | null): number {
  if (!budget) return Infinity;
  switch (budget.kind) {
    case "max":
      return budget.amount * 1.3;
    case "around":
      return budget.amount * 1.35;
    case "range":
      return budget.max * 1.25;
    case "min":
      return Infinity;
  }
}

function maxBy<T>(list: T[], score: (value: T) => number): T | undefined {
  let best: T | undefined;
  let bestScore = -Infinity;
  for (const value of list) {
    const s = score(value);
    if (s > bestScore) {
      best = value;
      bestScore = s;
    }
  }
  return best;
}

/** Share of the reference price saved (vs the new version or the previous price). */
function valueScore(item: CatalogItem): number {
  const reference = item.newVersionPrice ?? item.compareAtPrice;
  return reference ? (reference - item.price) / reference : 0;
}

export function recommend(
  intent: Intent,
  available: CatalogItem[],
  options: { alreadyAsked: boolean; packageIds: string[]; excludeModelIds?: string[] },
): Plan {
  const excluded = new Set(options.excludeModelIds ?? []);
  const inStockItems = available.filter((item) => item.stock > 0);
  // Not the phone they already have, unless nothing else is left.
  const others = inStockItems.filter((item) => !excluded.has(item.modelId));
  const items = (others.length > 0 ? others : inStockItems)
    .sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
  if (items.length === 0) return { kind: "nothing" };

  const vague = isVague(intent);
  if (vague && !options.alreadyAsked) return { kind: "question" };

  let notice: Notice = vague ? "popular" : null;
  let missingBrand: string | null = null;
  let pool = items;

  // Hard filters, each dropped if it would leave nothing.
  if (intent.models.length > 0) {
    const byModel = pool.filter((item) => intent.models.includes(normalize(item.model)));
    if (byModel.length > 0) pool = byModel;
  }
  if (intent.brands.length > 0) {
    const byBrand = pool.filter((item) => intent.brands.includes(item.brand));
    if (byBrand.length > 0) pool = byBrand;
    else {
      notice = "noBrand";
      missingBrand = intent.brands[0];
    }
  } else if (intent.otherBrands) {
    const others = pool.filter((item) => !MAIN_BRANDS.includes(item.brand));
    if (others.length > 0) pool = others;
  }
  if (intent.excludedBrands.length > 0) {
    const kept = pool.filter((item) => !intent.excludedBrands.includes(item.brand));
    if (kept.length > 0) pool = kept;
  }
  if (intent.condition) {
    const byCondition = pool.filter((item) => item.condition === intent.condition);
    if (byCondition.length > 0) pool = byCondition;
  }
  if (intent.minStorageGb) {
    const byStorage = pool.filter((item) => item.storageGb >= intent.minStorageGb!);
    if (byStorage.length > 0) pool = byStorage;
  }

  // Soft preferences: uses (a senior is looking for something easy to use).
  const uses = [...new Set<GoodFor>([...intent.uses, ...(intent.audience.includes("senior") ? ["easy" as const] : [])])];
  const matchedUses = (item: CatalogItem) =>
    item.goodFor.filter((tag) => uses.includes(tag));
  const fit = (item: CatalogItem) =>
    uses.reduce((sum, use) => {
      const rank = item.goodFor.indexOf(use);
      return rank === -1 ? sum : sum + (rank === 0 ? 3 : rank === 1 ? 2 : 1);
    }, 0);

  const budget: Budget | null =
    intent.budget ??
    (intent.priceLevel === "low"
      ? { kind: "max", amount: 300 }
      : intent.priceLevel === "high"
        ? { kind: "min", amount: 700 }
        : null);

  // 1. The Right Choice
  let rightChoice: CatalogItem;
  let rightFits = true;
  const inBudget = pool.filter((item) => fitsBudget(item.price, budget));
  if (budget && inBudget.length > 0) {
    const target = budgetTarget(budget);
    rightChoice = maxBy(
      inBudget,
      (item) => fit(item) * 100 + Math.max(0, 1 - Math.abs(item.price - target) / target) * 30 + valueScore(item) * 10,
    )!;
  } else if (budget) {
    const target = budgetTarget(budget);
    rightFits = false;
    notice ??= "closest";
    rightChoice = maxBy(pool, (item) => -Math.abs(item.price - target) / target * 100 + fit(item) * 5)!;
  } else {
    // No budget: a balanced pick among the best matches (the lower middle price).
    const bestFit = Math.max(...pool.map(fit));
    const top = pool.filter((item) => fit(item) === bestFit);
    rightChoice = top[Math.floor((top.length - 1) / 2)];
  }

  // 2. The Smart Deal: at least 10% cheaper, still relevant.
  const smartDeal = maxBy(
    pool.filter(
      (item) =>
        item.id !== rightChoice.id &&
        item.price <= rightChoice.price * 0.9 &&
        (uses.length === 0 || fit(item) > 0),
    ),
    (item) => fit(item) * 100 + valueScore(item) * 50 + (item.price / rightChoice.price) * 20,
  );

  // 3. The Premium Option: only when the Right Choice fits the budget and a better
  //    match is within reach.
  const cap = premiumCap(budget);
  const premium = rightFits
    ? maxBy(
        pool.filter(
          (item) =>
            item.id !== rightChoice.id &&
            item.id !== smartDeal?.id &&
            item.price >= rightChoice.price * 1.08 &&
            item.price <= cap &&
            fit(item) >= fit(rightChoice),
        ),
        (item) =>
          fit(item) * 100 +
          valueScore(item) * 30 -
          ((item.price - rightChoice.price) / rightChoice.price) * 10 +
          (item.condition === "new" ? 3 : 0),
      )
    : undefined;

  const picks: Pick[] = [
    { slot: "right_choice", item: rightChoice, matchedUses: matchedUses(rightChoice), fitsBudget: rightFits },
  ];
  if (smartDeal) {
    picks.push({
      slot: "smart_deal",
      item: smartDeal,
      matchedUses: matchedUses(smartDeal),
      fitsBudget: fitsBudget(smartDeal.price, budget),
    });
  }
  if (premium) {
    picks.push({ slot: "premium_option", item: premium, matchedUses: matchedUses(premium), fitsBudget: false });
  }

  const packages: string[] = [];
  if (intent.audience.includes("child") || intent.wantsProtection) packages.push(PROTECTION_PACKAGE_ID);
  if (intent.audience.includes("senior") || intent.audience.includes("gift") || intent.wantsSetupHelp) {
    packages.push(READY_PACKAGE_ID);
  }

  return {
    kind: "recommendations",
    notice,
    missingBrand,
    picks,
    packages: packages.filter((id) => options.packageIds.includes(id)),
    statedBudget: intent.budget,
  };
}
