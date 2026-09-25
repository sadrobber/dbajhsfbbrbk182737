import type { Locale } from "@/i18n/routing";
import type { Condition, GoodFor } from "@/lib/data/schema";

/**
 * Rule-based reading of a customer message (French, English or Italian).
 * Used by demo mode, and to double-check the AI never quotes invented prices.
 */

export type Budget =
  | { kind: "max"; amount: number }
  | { kind: "around"; amount: number }
  | { kind: "min"; amount: number }
  | { kind: "range"; min: number; max: number };

export type Audience = "child" | "senior" | "gift";

export type Intent = {
  language: Locale | null;
  budget: Budget | null;
  priceLevel: "low" | "high" | null;
  brands: string[];
  otherBrands: boolean;
  excludedBrands: string[];
  /** Normalized model names from the catalogue, e.g. "iphone 15". */
  models: string[];
  condition: Condition | null;
  uses: GoodFor[];
  minStorageGb: number | null;
  audience: Audience[];
  wantsProtection: boolean;
  wantsSetupHelp: boolean;
  /** Every amount the customer wrote. */
  numbers: number[];
};

export type UnderstandContext = {
  /** Brands sold by the shop (id + display name). */
  brands: { id: string; name: string }[];
  /** Model names in the catalogue, e.g. "Galaxy S25". */
  models: string[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lowercase, no accents, simple apostrophes and spaces. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘`´]/g, "'")
    .replace(/[   ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Regex matching any of the given patterns as whole words. Patterns are regex sources. */
function words(patterns: string[]): RegExp {
  return new RegExp(`(?<![a-z0-9])(?:${patterns.join("|")})(?![a-z0-9])`, "g");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function test(regex: RegExp, text: string): boolean {
  regex.lastIndex = 0;
  return regex.test(text);
}

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

const LANGUAGE_WORDS: Record<Locale, string[]> = {
  fr: [
    "je", "j'ai", "tu", "vous", "nous", "les", "une", "des", "pour", "avec", "moins", "plus", "de", "du",
    "mon", "ma", "mes", "quel", "quels", "quelle", "quelles", "cherche", "veux", "voudrais", "bonjour",
    "merci", "est", "et", "ou", "telephone", "portable", "fille", "fils", "pas", "cher", "environ",
    "autour", "appareil", "meilleur", "batterie", "jeux", "neuf", "reconditionne", "occasion", "qui",
    "sur", "tres", "bien", "mais", "ecran", "mere", "grand", "sais", "ne", "encore", "petit", "avez",
    "votre", "vos", "entre", "aussi", "quoi", "combien", "faut",
  ],
  en: [
    "i'm", "im", "you", "the", "for", "with", "under", "over", "my", "me", "want", "need", "looking",
    "phone", "phones", "cheap", "around", "about", "which", "what", "best", "good", "battery", "camera",
    "new", "refurbished", "gift", "grandma", "grandmother", "hello", "hi", "thanks", "is", "and", "or",
    "to", "of", "daughter", "son", "below", "less", "than", "screen", "any", "do", "have", "don't",
    "dont", "know", "yet", "please", "something", "how", "much", "should",
  ],
  it: [
    "io", "il", "lo", "gli", "una", "uno", "per", "con", "meno", "piu", "di", "del", "della", "mia",
    "mio", "cerco", "voglio", "vorrei", "quale", "quali", "telefono", "cellulare", "economico", "circa",
    "intorno", "sotto", "batteria", "fotocamera", "giochi", "nuovo", "ricondizionato", "regalo", "nonna",
    "nonno", "ciao", "grazie", "e", "che", "sono", "buono", "migliore", "schermo", "figlia", "figlio",
    "ho", "hai", "mi", "non", "sui", "fino", "da", "ancora", "qualcosa", "tra", "oltre", "quanto",
  ],
};

const LANGUAGE_SETS = Object.fromEntries(
  Object.entries(LANGUAGE_WORDS).map(([lang, list]) => [lang, new Set(list)]),
) as Record<Locale, Set<string>>;

export function detectLanguage(raw: string): Locale | null {
  const text = normalize(raw);
  const tokens = text.split(/[^a-z0-9']+/).filter(Boolean);
  const score: Record<Locale, number> = { fr: 0, en: 0, it: 0 };

  for (const token of tokens) {
    for (const lang of Object.keys(score) as Locale[]) {
      if (LANGUAGE_SETS[lang].has(token)) score[lang] += 1;
    }
  }
  // Letters that only one of the languages uses.
  if (/[çâêîôûëïüÿœ]/i.test(raw)) score.fr += 2;
  if (/[ìò]/i.test(raw) || /(?:^|\s)è(?:\s|$)/i.test(raw)) score.it += 2;

  const ranked = (Object.entries(score) as [Locale, number][]).sort((a, b) => b[1] - a[1]);
  const [first, second] = ranked;
  if (first[1] === 0 || first[1] === second[1]) return null;
  return first[0];
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

const MAX_WORDS = [
  "moins de", "max", "maxi", "maximum", "jusqu'a", "pas plus de", "budget(?: de| d'environ)?", "sous",
  "inferieur a", "moins cher que", "under", "below", "less than", "up to", "no more than", "at most",
  "cheaper than", "meno di", "sotto(?: i| gli)?", "fino a", "massimo", "entro", "non piu di",
];
const MIN_WORDS = [
  "plus de", "au moins", "a partir de", "minimum", "superieur a", "over", "above", "more than",
  "at least", "from", "piu di", "oltre", "almeno", "sopra", "a partire da",
];
const AROUND_WORDS = [
  "autour de", "environ", "vers", "dans les", "a peu pres", "aux alentours de", "around", "about",
  "roughly", "approximately", "approx", "circa", "intorno a(?:i|gli)?", "sui", "sugli", "verso",
  "attorno a(?:i|gli)?", "~",
];

const AFTER_MAX = /^\s*(?:max(?:imum)?|ou moins|or less|o meno|au plus|at most|al massimo)(?![a-z])/;
const AFTER_MIN = /^\s*(?:ou plus|or more|o piu|minimum|in su|et plus|and up|and above)(?![a-z])/;

function lastKeywordBefore(before: string): Budget["kind"] | null {
  const window = before.slice(-28);
  let best: { kind: Budget["kind"]; index: number } | null = null;
  const check = (list: string[], kind: Budget["kind"]) => {
    const regex = new RegExp(`(?<![a-z0-9])(?:${list.join("|")})(?![a-z0-9])`, "g");
    for (const match of window.matchAll(regex)) {
      if (!best || match.index > best.index) best = { kind, index: match.index };
    }
  };
  check(MAX_WORDS, "max");
  check(MIN_WORDS, "min");
  check(AROUND_WORDS, "around");
  return (best as { kind: Budget["kind"] } | null)?.kind ?? null;
}

/** Turns "1 299", "1.299" or "1,299" into 1299. */
function joinThousands(text: string): string {
  return text.replace(/(\d)[ .,](?=\d{3}(?!\d))/g, "$1");
}

/** Numbers that are part of model names, storage sizes or percentages are not prices. */
function stripNonPriceNumbers(text: string): string {
  return (
    text
      // storage: 128 go / 256gb / 1 to / 1tb
      .replace(/(?<![a-z0-9])(?:32|64|128|256|512)\s?(?:go|gb|g)(?![a-z0-9])/g, " ")
      .replace(/(?<![a-z0-9])[12]\s?(?:to|tb)(?![a-z0-9])(?!\s*\d)/g, " ")
      // percentages
      .replace(/\d+\s?%/g, " ")
      // model numbers written after a model word: "iphone 15", "pixel 9", "note 14"
      .replace(
        /(?<![a-z0-9])(?:iphone|pixel|galaxy|note|redmi|doro|moto|nokia|xperia|mate|reno|nord|oneplus|find)\s+\d+(?![0-9])/g,
        " ",
      )
      // letter+digit tokens: s25, a56, 9a, 16e (but not 400e / 400eur, marked before)
      .replace(/(?<![a-z0-9<])[a-z]+\d+[a-z]*(?![a-z0-9])/g, " ")
      .replace(/(?<![a-z0-9<])\d+[a-z]+(?![a-z0-9>])/g, " ")
  );
}

export function parseBudget(text: string): { budget: Budget | null; numbers: number[] } {
  let s = joinThousands(normalize(text));
  // Mark amounts written with a currency: "€400", "400 €", "400e", "400 euros" -> "<400>"
  s = s
    .replace(/€\s?(\d+)/g, " <$1> ")
    .replace(/(\d+)\s?(?:€|euros?|eur)(?![a-z0-9])/g, " <$1> ")
    // "400e" is French shorthand for euros, but "300 e 600" is Italian for "300 and 600"
    .replace(/(\d+)\s?e(?![a-z0-9])(?!\s*[<\d])/g, " <$1> ");
  s = stripNonPriceNumbers(s);

  const amounts: { value: number; index: number; end: number; currency: boolean }[] = [];
  for (const match of s.matchAll(/<(\d+)>|(?<![a-z0-9<])(\d{2,5})(?![0-9>])/g)) {
    const value = Number(match[1] ?? match[2]);
    const currency = match[1] !== undefined;
    if (value >= 50 && value <= 5000) {
      amounts.push({ value, index: match.index, end: match.index + match[0].length, currency });
    }
  }
  const numbers = amounts.map((a) => a.value);
  if (amounts.length === 0) return { budget: null, numbers };

  // Ranges: "entre 300 et 600", "300-600 €", "from €300 to €600", "da 300 a 600"
  for (let i = 0; i < amounts.length - 1; i++) {
    const [a, b] = [amounts[i], amounts[i + 1]];
    const between = s.slice(a.end, b.index);
    if (/^\s*(?:et|and|a|to|e|-|–|—|\/)\s*$/.test(between) && a.value < b.value) {
      return { budget: { kind: "range", min: a.value, max: b.value }, numbers };
    }
  }

  const first = amounts[0];
  const before = s.slice(0, first.index);
  const after = s.slice(first.end);
  let kind: Budget["kind"] | null = lastKeywordBefore(before);
  if (!kind && AFTER_MAX.test(after)) kind = "max";
  if (!kind && AFTER_MIN.test(after)) kind = "min";

  return { budget: { kind: kind === "range" || !kind ? "around" : kind, amount: first.value } as Budget, numbers };
}

// ---------------------------------------------------------------------------
// Brands, models, condition, uses, audience
// ---------------------------------------------------------------------------

const BRAND_ALIASES: Record<string, string[]> = {
  apple: ["apple", "iphones?", "ios"],
  samsung: ["samsung", "galaxy"],
  google: ["google", "pixel"],
  xiaomi: ["xiaomi", "redmi"],
  doro: ["doro"],
  motorola: ["motorola", "moto"],
  oneplus: ["oneplus", "one plus"],
  nokia: ["nokia"],
  oppo: ["oppo"],
  honor: ["honor"],
  huawei: ["huawei"],
  fairphone: ["fairphone"],
  sony: ["sony", "xperia"],
  nothing: ["nothing phone"],
};

/** Human-readable names for brands the shop does not sell (for "we have no X in stock"). */
export const BRAND_DISPLAY_NAMES: Record<string, string> = {
  apple: "Apple", samsung: "Samsung", google: "Google", xiaomi: "Xiaomi", doro: "Doro",
  motorola: "Motorola", oneplus: "OnePlus", nokia: "Nokia", oppo: "Oppo", honor: "Honor",
  huawei: "Huawei", fairphone: "Fairphone", sony: "Sony", nothing: "Nothing",
};

const NEGATION = "(?:pas|no|not|non|sans|without|senza|sauf|except|tranne|hors|jamais|never)";
const NEGATION_FILLER = "(?:\\s+(?:de|d'|un|une|a|an|di|uno|d|of|any|the|le|la|les|un'))?";

const OTHER_BRANDS = words([
  "autres? marques?", "une autre marque", "d'autres marques", "other brands?", "another brand",
  "different brands?", "altre marche", "altra marca", "marche diverse",
]);
const ANDROID = words(["android"]);

const REFURB_NEGATED = new RegExp(
  `(?<![a-z0-9])${NEGATION}${NEGATION_FILLER}\\s*(?:reconditionn\\w*|recond|occasion|refurb\\w*|used|second[- ]hand|ricondizionat\\w*|usat\\w*)`,
);
const REFURBISHED = words([
  "reconditionn\\w*", "recond", "occasion", "seconde main", "refurb\\w*", "second[- ]hand", "used",
  "pre-?owned", "ricondizionat\\w*", "rigenerat\\w*", "usat[oaie]", "seconda mano",
]);
const NEW = words([
  "neuf", "neufs", "neuve", "neuves", "brand[- ]new", "sealed", "unopened", "only new",
  "nuovo di zecca", "nuovi", "(?:telefono|smartphone|cellulare) nuovo", "sous blister", "jamais utilise",
]);

const USE_PATTERNS: Record<GoodFor, RegExp> = {
  photo: words([
    "photos?", "appareil photo", "cameras?", "pictures?", "pics", "selfies?", "videos?", "foto",
    "fotocamera", "fotografi\\w*", "filmer", "photographie",
  ]),
  battery: words([
    "batterie", "autonomie", "battery", "batteries", "long lasting", "lasts? (?:all|the whole) day", "tient la journee",
    "batteria", "autonomia", "durata", "dure longtemps", "charge rapide",
  ]),
  gaming: words([
    "jeux?(?: video)?", "gaming", "gamer", "jouer", "games?", "play(?:ing)?", "giochi", "gioco",
    "giocare", "videogiochi", "fortnite", "pubg", "genshin", "roblox", "call of duty",
  ]),
  work: words([
    "travail", "travailler", "boulot", "professionnel(?:le)?", "bureau", "e-?mails?", "mails?",
    "teletravail", "for work", "at work", "work (?:phone|emails?)", "working from home", "business",
    "office", "lavoro", "lavorare", "ufficio",
    "professional\\w*", "reunions?", "meetings?", "visio",
  ]),
  social: words([
    "reseaux(?: sociaux)?", "social(?: media| network)?s?", "instagram", "insta", "tiktok", "snapchat",
    "whatsapp", "facebook",
  ]),
  easy: words([
    "simple", "simplicite", "facil[ei]", "easy", "easiest", "simplest", "semplice",
    "grosses? touches", "big buttons", "tasti grandi", "gros caracteres", "large text", "user friendly",
  ]),
};

const AUDIENCE_PATTERNS: Record<Audience, RegExp> = {
  child: words([
    "fille", "fils", "enfants?", "ados?", "adolescent\\w*", "collegien\\w*", "lyceen\\w*",
    "petit-fils", "petite-fille", "daughters?", "(?:my|our|his|her|for) sons?", "kids?",
    "child(?:ren)?", "teen(?:ager)?s?", "grandson", "granddaughter", "figli[oa]?", "bambin[oaie]",
    "adolescent[ei]", "nipote",
  ]),
  senior: words([
    "grand-?mere", "grand mere", "grand-?pere", "grand pere", "mamie", "papi", "papy", "seniors?",
    "personnes? agee?s?", "parents? agee?s?", "retraite\\w*", "grandma", "grandmother", "grandpa",
    "grandfather", "granny", "elderly", "older (?:person|people|parents?)", "old (?:person|people)",
    "pensioners?", "retired", "nonn[oai]", "anzian[oaie]", "pensionat[oaie]",
  ]),
  gift: words([
    "cadeau", "offrir", "gifts?", "present", "regalo", "regalare", "anniversaire", "birthday",
    "compleanno", "noel", "christmas", "natale",
  ]),
};

const PROTECTION = words([
  "coque", "protection", "proteger", "protege", "casse", "cassee", "tombe", "tomber", "maladroit\\w*",
  "case", "cover", "protect\\w*", "drops?", "dropping", "clumsy", "breaks?", "cracked", "custodia",
  "proteggere", "protezione", "cade", "cadere", "rompe", "rotto", "pellicola", "verre trempe",
  "tempered glass", "screen protector",
]);

const SETUP_HELP = words([
  "transfert", "transferer", "configurer", "configuration", "installer", "installation",
  "mise en service", "parametrer", "pas doue\\w*", "pas a l'aise", "transfer\\w*", "set ?up",
  "configure", "install", "not tech\\w*", "trasferi\\w*", "configura\\w*", "installa\\w*",
  "recuperer mes", "copy my",
]);

const PRICE_LOW = words([
  "pas cher", "pas trop cher", "le moins cher", "petit prix", "petit budget", "budget serre",
  "budget limite", "bon marche", "economique", "abordable", "cheap", "cheapest", "inexpensive",
  "affordable", "low budget", "tight budget", "budget-friendly", "economic[oi]", "poco costoso",
  "low cost", "prezzo basso", "non troppo caro", "il piu economico", "conveniente",
]);
const PRICE_HIGH = words([
  "haut de gamme", "premium", "flagship", "le top", "le plus puissant", "high[- ]end",
  "top of the range", "top[- ]end", "most powerful", "top di gamma", "fascia alta",
  "il piu potente", "top gamma",
]);

function detectBrands(text: string, context: UnderstandContext) {
  const aliases: Record<string, string[]> = { ...BRAND_ALIASES };
  for (const brand of context.brands) {
    aliases[brand.id] = [...new Set([...(aliases[brand.id] ?? []), escapeRegex(normalize(brand.name))])];
  }

  let remaining = text;
  const excluded = new Set<string>();
  for (const [id, list] of Object.entries(aliases)) {
    const negated = new RegExp(`(?<![a-z0-9])${NEGATION}${NEGATION_FILLER}\\s*(?:${list.join("|")})(?![a-z0-9])`, "g");
    if (test(negated, remaining)) {
      excluded.add(id);
      remaining = remaining.replace(negated, " ");
    }
  }
  if (test(ANDROID, remaining)) excluded.add("apple");

  const brands: string[] = [];
  for (const [id, list] of Object.entries(aliases)) {
    if (!excluded.has(id) && test(words(list), remaining)) brands.push(id);
  }
  return { brands, excludedBrands: [...excluded], otherBrands: test(OTHER_BRANDS, text) };
}

function detectModels(text: string, models: string[]): string[] {
  const found = new Set<string>();
  const variants = models
    .map((model) => normalize(model))
    .flatMap((model) => {
      const list = [model];
      const [head, ...rest] = model.split(" ");
      const tail = rest.join(" ");
      // "galaxy s25" can be written "s25"; "redmi note 14 pro" as "note 14 pro"
      if (rest.length > 0 && /\d/.test(tail) && /^(?:galaxy|redmi)$/.test(head)) list.push(tail);
      return list.map((variant) => ({ model, variant }));
    })
    .sort((a, b) => b.variant.length - a.variant.length);

  let remaining = text;
  for (const { model, variant } of variants) {
    const regex = new RegExp(`(?<![a-z0-9])${escapeRegex(variant).replace(/ /g, "\\s*")}(?![a-z0-9])`, "g");
    if (test(regex, remaining)) {
      found.add(model);
      remaining = remaining.replace(regex, " ");
    }
  }
  return [...found];
}

function detectStorage(text: string): number | null {
  const tb = text.match(/(?<![a-z0-9])([12])\s?(?:to|tb)(?![a-z0-9])(?!\s*\d)/);
  if (tb) return Number(tb[1]) * 1024;
  const gb = text.match(/(?<![a-z0-9])(32|64|128|256|512)\s?(?:go|gb|g)(?![a-z0-9])/);
  return gb ? Number(gb[1]) : null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function understand(raw: string, context: UnderstandContext): Intent {
  const text = normalize(raw);
  const { budget, numbers } = parseBudget(raw);
  const { brands, excludedBrands, otherBrands } = detectBrands(text, context);

  let condition: Condition | null = null;
  if (test(REFURB_NEGATED, text)) condition = "new";
  else if (test(REFURBISHED, text)) condition = "refurbished";
  else if (test(NEW, text)) condition = "new";

  const uses = (Object.keys(USE_PATTERNS) as GoodFor[]).filter((use) => test(USE_PATTERNS[use], text));
  const audience = (Object.keys(AUDIENCE_PATTERNS) as Audience[]).filter((a) => test(AUDIENCE_PATTERNS[a], text));

  return {
    language: detectLanguage(raw),
    budget,
    priceLevel: test(PRICE_HIGH, text) ? "high" : test(PRICE_LOW, text) ? "low" : null,
    brands,
    otherBrands,
    excludedBrands,
    models: detectModels(text, context.models),
    condition,
    uses,
    minStorageGb: detectStorage(text),
    audience,
    wantsProtection: test(PROTECTION, text),
    wantsSetupHelp: test(SETUP_HELP, text),
    numbers,
  };
}

/** Combines the customer's messages, the most recent one winning on conflicts. */
export function mergeIntents(intents: Intent[]): Intent {
  const merged: Intent = {
    language: null,
    budget: null,
    priceLevel: null,
    brands: [],
    otherBrands: false,
    excludedBrands: [],
    models: [],
    condition: null,
    uses: [],
    minStorageGb: null,
    audience: [],
    wantsProtection: false,
    wantsSetupHelp: false,
    numbers: [],
  };
  for (const intent of intents) {
    merged.language = intent.language ?? merged.language;
    if (intent.budget) {
      merged.budget = intent.budget;
      merged.priceLevel = null;
    }
    merged.priceLevel = intent.priceLevel ?? merged.priceLevel;
    if (intent.brands.length > 0 || intent.otherBrands) {
      merged.brands = intent.brands;
      merged.otherBrands = intent.otherBrands;
    }
    merged.excludedBrands = [...new Set([...merged.excludedBrands, ...intent.excludedBrands])];
    if (intent.models.length > 0) merged.models = intent.models;
    merged.condition = intent.condition ?? merged.condition;
    merged.uses = [...new Set([...intent.uses, ...merged.uses])];
    merged.minStorageGb = intent.minStorageGb ?? merged.minStorageGb;
    merged.audience = [...new Set([...merged.audience, ...intent.audience])];
    merged.wantsProtection ||= intent.wantsProtection;
    merged.wantsSetupHelp ||= intent.wantsSetupHelp;
    merged.numbers = [...merged.numbers, ...intent.numbers];
  }
  return merged;
}

/** Nothing usable to recommend from: time to ask one question. */
export function isVague(intent: Intent): boolean {
  return (
    !intent.budget &&
    !intent.priceLevel &&
    intent.brands.length === 0 &&
    !intent.otherBrands &&
    intent.excludedBrands.length === 0 &&
    intent.models.length === 0 &&
    !intent.condition &&
    intent.uses.length === 0 &&
    !intent.minStorageGb &&
    intent.audience.length === 0 &&
    !intent.wantsProtection &&
    !intent.wantsSetupHelp
  );
}
