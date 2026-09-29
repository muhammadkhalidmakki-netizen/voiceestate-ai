// Conservative, browser-side extraction of qualification details and lead
// stage from what the LEAD says. Every extractor returns nothing unless the
// text clearly supports a value: ambiguous, conflicting or negated statements
// are ignored. Only ever feed this finished USER utterances, never assistant
// messages.
//
// This file must stay free of relative imports so it can be unit-tested
// directly with `node --test` (see tests/).

export type Qualification = {
  purpose: string;
  budget: string;
  property: string;
  preferredArea: string;
};

export type LeadStage =
  | "New Lead"
  | "Qualified"
  | "Follow-up"
  | "Not Interested"
  | "Junk · Job Enquiry"
  | "Wrong Number";

export const JOB_STAGE: LeadStage = "Junk · Job Enquiry";
export const WRONG_NUMBER_STAGE: LeadStage = "Wrong Number";

export const NOT_PROVIDED = "Not provided";

export const EMPTY_QUALIFICATION: Qualification = {
  purpose: NOT_PROVIDED,
  budget: NOT_PROVIDED,
  property: NOT_PROVIDED,
  preferredArea: NOT_PROVIDED,
};

// ---------- number helpers ----------

const UNITS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};
const TEENS: Record<string, number> = {
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const UNIT_WORDS = Object.keys(UNITS).join("|");
const BASE_WORDS = [
  ...Object.keys(UNITS),
  ...Object.keys(TEENS),
  ...Object.keys(TENS),
].join("|");

// digits ("2", "2,000,000", "1.5") or words ("two", "twenty five",
// "two point five", "two and a half")
const NUM = `(?:\\d[\\d,]*(?:\\.\\d+)?|(?:${BASE_WORDS})(?:[\\s-](?:${UNIT_WORDS}))?(?:\\s+point\\s+(?:${UNIT_WORDS})(?:\\s+(?:${UNIT_WORDS}))*)?(?:\\s+and\\s+a\\s+half)?)`;

function wordsToInt(words: string): number | null {
  const parts = words.split(/[\s-]+/).filter(Boolean);
  let total = 0;
  for (const p of parts) {
    if (p in UNITS) total += UNITS[p];
    else if (p in TEENS) total += TEENS[p];
    else if (p in TENS) total += TENS[p];
    else return null;
  }
  return total > 0 ? total : null;
}

function parseNumber(raw: string): number | null {
  let t = raw.toLowerCase().trim();
  if (/^\d/.test(t)) {
    const n = parseFloat(t.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  let add = 0;
  if (/\s+and\s+a\s+half$/.test(t)) {
    add = 0.5;
    t = t.replace(/\s+and\s+a\s+half$/, "");
  }
  const point = t.match(/^(.*?)\s+point\s+(.+)$/);
  if (point) {
    const whole = wordsToInt(point[1]);
    const digits = point[2]
      .split(/\s+/)
      .map((w) => UNITS[w])
      .join("");
    if (whole === null || !digits || digits.includes("undefined")) return null;
    return parseFloat(`${whole}.${digits}`);
  }
  const whole = wordsToInt(t);
  return whole === null ? null : whole + add;
}

// ---------- purpose ----------

const INVEST_RE =
  /\b(invest(?:ment|ing|or|ors|ed)?|rental (?:income|yield|returns?)|roi|capital (?:gains?|appreciation))\b/i;
const OWN_HOME_RE =
  /\b(to live in|live there|for my (?:own )?family|for my (?:own )?(?:use|home)|for myself|for us to live|end[- ]?use|own use|my own home|home for (?:myself|us|my family)|move (?:in|there|to dubai))\b/i;
const NEGATED_INVEST_RE =
  /\b(?:not|no|isn'?t|nor|never|don'?t|without)\b[^.?!]{0,25}\binvest/i;

export function extractPurpose(text: string): string | null {
  const invest = INVEST_RE.test(text) && !NEGATED_INVEST_RE.test(text);
  const home = OWN_HOME_RE.test(text);
  if (invest && !home) return "Investment";
  if (home && !invest) return "Own Home";
  return null; // neither, or both (ambiguous)
}

// ---------- budget ----------

const SCALE: Record<string, number> = {
  million: 1e6,
  mil: 1e6,
  m: 1e6,
  thousand: 1e3,
  k: 1e3,
};

// Includes common speech-to-text spellings ("A.E.D.", "durhams").
const CURRENCY_WORD =
  "a\\.?e\\.?d\\.?|d[iue]rh?[ae]ms?|dirhems?|dhs?|usd|dollars?|gbp|pounds?|eur|euros?|\\$|£|€";
const CURRENCY_ANY = new RegExp(`(?<![\\w])(?:${CURRENCY_WORD})(?![a-z])`, "gi");

function currencyCode(word: string): string | null {
  const w = word.toLowerCase().replace(/\./g, "");
  if (/^(aed|d[iue]rh?[ae]ms?|dirhems?|dhs?)$/.test(w)) return "AED";
  if (/^(usd|dollars?|\$)$/.test(w)) return "USD";
  if (/^(gbp|pounds?|£)$/.test(w)) return "GBP";
  if (/^(eur|euros?|€)$/.test(w)) return "EUR";
  return null;
}

// amount then currency: "2 million dirhams", "500,000 dollars"
const AMOUNT_THEN_CUR = new RegExp(
  `(?<![\\w.])(${NUM})\\s*(million|mil|thousand|k|m)?\\s*(${CURRENCY_WORD})(?![a-z])`,
  "gi",
);
// currency then amount: "AED 2 million", "$500,000"
const CUR_THEN_AMOUNT = new RegExp(
  `(?<![\\w])(aed|usd|gbp|eur|\\$|£|€)\\s*(${NUM})\\s*(million|mil|thousand|k|m)?(?![a-z])`,
  "gi",
);
// amount with a scale word but no currency next to it: "around 1.5 million"
const AMOUNT_SCALED = new RegExp(
  `(?<![\\w.])(${NUM})\\s*(million|mil|thousand|k|m)(?![a-z])`,
  "gi",
);
const AMOUNT_PLAIN = /(?<![\w.,])(\d{1,3}(?:,\d{3})+|\d{5,})(?![\w,]|\.\d)/g;

const RANGE_RE = new RegExp(
  `${NUM}\\s*(?:million|mil|thousand|k|m)?\\s*(?:to|and|or|-|–)\\s*${NUM}\\s*(?:million|mil|thousand|k|m)\\b`,
  "i",
);
const NOT_A_BUDGET_RE =
  /\b(?:per|a|each|every)\s+(?:month|year|sq(?:uare)?\.?\s*f(?:ee)?t)\b|\bmonthly\b|\binstal+ments?\b|\bdown\s*payment\b/i;

const MIN_BUDGET = 10_000;

export function formatMoney(amount: number, cur: string): string {
  return `${cur} ${Math.round(amount).toLocaleString("en-US")}`;
}

export function formatPendingBudget(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")} · currency not confirmed`;
}

export type BudgetResult = {
  /** Fully specified budget, e.g. "AED 2,000,000" (currency was stated). */
  budget: string | null;
  /** Amount stated with no currency, waiting for the lead to confirm one. */
  pendingAmount: number | null;
};

const NO_BUDGET: BudgetResult = { budget: null, pendingAmount: null };

export function analyzeBudget(text: string): BudgetResult {
  if (NOT_A_BUDGET_RE.test(text) || RANGE_RE.test(text)) return NO_BUDGET;

  // 1) currency stated right next to the amount
  const strict = new Set<string>();
  for (const m of text.matchAll(AMOUNT_THEN_CUR)) {
    const n = parseNumber(m[1]);
    const cur = currencyCode(m[3]);
    if (n === null || !cur) continue;
    const scale = m[2] ? SCALE[m[2].toLowerCase()] : 1;
    strict.add(formatMoney(n * scale, cur));
  }
  for (const m of text.matchAll(CUR_THEN_AMOUNT)) {
    const n = parseNumber(m[2]);
    const cur = currencyCode(m[1]);
    if (n === null || !cur) continue;
    const scale = m[3] ? SCALE[m[3].toLowerCase()] : 1;
    strict.add(formatMoney(n * scale, cur));
  }
  if (/\bhalf a million\s+(?:aed|dirhams?)\b/i.test(text)) {
    strict.add(formatMoney(500_000, "AED"));
  }
  if (strict.size > 1) return NO_BUDGET; // conflicting amounts
  if (strict.size === 1) {
    const [value] = [...strict];
    const amount = parseInt(value.replace(/\D/g, ""), 10);
    return amount >= MIN_BUDGET ? { budget: value, pendingAmount: null } : NO_BUDGET;
  }

  // 2) amount and currency in the same message but not adjacent
  //    ("in AED, around two million")
  const scaled = new Set<number>();
  for (const m of text.matchAll(AMOUNT_SCALED)) {
    const n = parseNumber(m[1]);
    if (n !== null) scaled.add(n * SCALE[m[2].toLowerCase()]);
  }
  if (/\bhalf a million\b/i.test(text)) scaled.add(500_000);
  const plain = new Set<number>();
  for (const m of text.matchAll(AMOUNT_PLAIN)) {
    const n = parseInt(m[1].replace(/,/g, ""), 10);
    if (n >= MIN_BUDGET) plain.add(n);
  }
  const currencies = new Set<string>();
  for (const m of text.matchAll(CURRENCY_ANY)) {
    const code = currencyCode(m[0]);
    if (code) currencies.add(code);
  }
  const amounts = new Set([...scaled, ...plain]);

  if (amounts.size === 1 && currencies.size === 1) {
    const [amount] = [...amounts];
    const [cur] = [...currencies];
    return amount >= MIN_BUDGET
      ? { budget: formatMoney(amount, cur), pendingAmount: null }
      : NO_BUDGET;
  }

  // 3) amount with a scale word and NO currency anywhere: remember it, but
  //    do not guess the currency
  if (currencies.size === 0 && scaled.size === 1 && plain.size === 0) {
    const [amount] = [...scaled];
    if (amount >= MIN_BUDGET) return { budget: null, pendingAmount: amount };
  }

  return NO_BUDGET;
}

export function extractBudget(text: string): string | null {
  return analyzeBudget(text).budget;
}

/**
 * If the whole utterance is just a currency ("dirhams", "in AED", "it's
 * dollars"), returns its code. Used to complete a budget stated without one.
 */
export function currencyOnlyReply(text: string): string | null {
  const t = text
    .toLowerCase()
    .replace(/[.,!?;:]+$/g, "")
    .trim();
  const m = t.match(
    new RegExp(
      `^(?:(?:it'?s|that'?s|that is|it is|in|yes|yeah|yep|sorry|oh|um|uh|so|sure)[,\\s]+)*(${CURRENCY_WORD})(?:\\s+(?:please|only|sorry))?$`,
      "i",
    ),
  );
  return m ? currencyCode(m[1]) : null;
}

// ---------- property ----------

const BEDS_RE = new RegExp(
  `(?<![\\w.])(\\d{1,2}|${UNIT_WORDS}|ten)[\\s-]*(?:bed(?:room)?s?|br|bhk)\\b`,
  "gi",
);
// "two or three bedroom", "2-3 bed": a range, not a single clear choice
const BED_RANGE_RE = new RegExp(
  `(?<![\\w.])(?:\\d{1,2}|${UNIT_WORDS}|ten)\\s*(?:or|to|and|-|–)\\s*(?:\\d{1,2}|${UNIT_WORDS}|ten)[\\s-]*(?:bed(?:room)?s?|br|bhk)\\b`,
  "i",
);
const OWNS_ALREADY_RE = /\bi\s+(?:already\s+|currently\s+)?(?:have|own|live in)\b/i;

const TYPES: [RegExp, string][] = [
  [/\b(?:apartments?|flats?)\b/i, "Apartment"],
  [/\bvillas?\b/i, "Villa"],
  [/\btownhouses?\b/i, "Townhouse"],
  [/\bpenthouses?\b/i, "Penthouse"],
];

export function extractProperty(text: string): string | null {
  if (OWNS_ALREADY_RE.test(text) || BED_RANGE_RE.test(text)) return null;

  const counts = new Set<string>();
  for (const m of text.matchAll(BEDS_RE)) {
    const raw = m[1].toLowerCase();
    const n = /^\d/.test(raw) ? parseInt(raw, 10) : (UNITS[raw] ?? 10);
    if (n >= 1 && n <= 10) counts.add(String(n));
  }
  if (counts.size > 1) return null;

  const types = TYPES.filter(([re]) => re.test(text)).map(([, label]) => label);
  const type = types.length === 1 ? types[0] : null;

  const parts: string[] = [];
  if (counts.size === 1) parts.push(`${[...counts][0]} Bedroom`);
  else if (/\bstudio\b/i.test(text)) parts.push("Studio");
  if (type) parts.push(type);

  return parts.length ? parts.join(" ") : null;
}

// ---------- preferred area ----------

const AREAS: [RegExp, string][] = [
  [/\bcreek harbou?r\b/i, "Dubai Creek Harbour"],
  [/\bdowntown(?: dubai)?\b/i, "Downtown Dubai"],
  [/\bdubai marina\b|\bmarina\b/i, "Dubai Marina"],
  [/\bpalm jumeirah\b|\bthe palm\b/i, "Palm Jumeirah"],
  [/\bbusiness bay\b/i, "Business Bay"],
  [/\bdubai hills(?: estate)?\b/i, "Dubai Hills Estate"],
  [/\bjumeirah village circle\b|\bjvc\b/i, "Jumeirah Village Circle"],
  [/\bjumeirah lakes? towers\b|\bjlt\b/i, "Jumeirah Lakes Towers"],
  [/\bdubai south\b/i, "Dubai South"],
  [/\bdubai harbou?r\b/i, "Dubai Harbour"],
  [/\bdubai islands\b/i, "Dubai Islands"],
  [/\bdubai silicon oasis\b/i, "Dubai Silicon Oasis"],
  [/\bmohammed bin rashid city\b|\bmbr city\b/i, "Mohammed Bin Rashid City"],
  [/\bmeydan\b/i, "Meydan"],
  [/\barjan\b/i, "Arjan"],
  [/\bal furjan\b/i, "Al Furjan"],
  [/\bdamac hills\b/i, "Damac Hills"],
  [/\bsobha hartland\b/i, "Sobha Hartland"],
  [/\bbluewaters\b/i, "Bluewaters"],
  [/\bcity walk\b/i, "City Walk"],
  [/\btown square\b/i, "Town Square"],
  [/\bdubailand\b/i, "Dubailand"],
  [/\bal barsha\b/i, "Al Barsha"],
  [/\bal rowaiyah\b/i, "Al Rowaiyah"],
];
// The assistant's third question is "Any area or lifestyle preference in mind,
// or are you open to suggestions?", so "open" is a real answer.
export const OPEN_AREA = "Open to suggestions";
const OPEN_AREA_RE =
  /\b(?:open\s+(?:to|for)\s+(?:any\s+|all\s+|your\s+|some\s+|the\s+)?(?:suggestions?|options?|ideas?|recommendations?|areas?|locations?)|no\s+(?:particular\s+|specific\s+)?(?:area\s+)?preference|any\s+(?:area|location)|(?<!not\s)(?<!n't\s)anywhere(?:\s+in\s+dubai)?|not\s+sure\s+(?:yet\s+)?(?:about\s+)?(?:the\s+)?(?:area|location)|up\s+to\s+you|whatever\s+you\s+(?:suggest|recommend|think)|flexible\s+on\s+(?:the\s+)?(?:area|location))\b/i;
// a short bare answer ("open", "not sure", "no") to the area question
const ASKED_AREA_RE =
  /\b(?:area|location|lifestyle)\b[^.?!]{0,40}\b(?:preference|in\s+mind)\b|open\s+to\s+suggestions|which\s+area|where\s+in\s+dubai/i;
// A short reply to the area question that means "no fixed area".
const OPEN_REPLY_RE =
  /\bopen\b|\bnot\s+sure\b|\bno\s+(?:particular\s+|specific\s+)?preference\b|\bnothing\s+(?:specific|in\s+particular)\b|\bflexible\b|\bwhatever\b|\bany(?:thing|where|\s+area)?\b|\byou\s+(?:suggest|recommend|decide|choose|tell\s+me)\b|\bup\s+to\s+you\b|^\W*no\W*$/i;
const NOT_OPEN_RE = /\bnot\s+open\b|\bno\s+way\b/i;

function isOpenAreaReply(text: string): boolean {
  const t = text.trim();
  return t.split(/\s+/).length <= 9 && OPEN_REPLY_RE.test(t) && !NOT_OPEN_RE.test(t);
}

const AREA_NEGATION_RE =
  /\b(?:not|except|avoid|other than|anywhere but|instead of|rather than)\b[^.?!]{0,20}$/i;

export function extractArea(text: string): string | null {
  const hits = new Set<string>();
  for (const [re, label] of AREAS) {
    const m = re.exec(text);
    if (!m) continue;
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    if (AREA_NEGATION_RE.test(before)) continue;
    hits.add(label);
  }
  if (hits.size === 0 && OPEN_AREA_RE.test(text)) return OPEN_AREA;
  if (hits.size !== 1) return null; // several areas: don't guess
  return [...hits][0];
}

/** Returns only the fields clearly supported by this one user message. */
export function extractQualification(text: string): Partial<Qualification> {
  const out: Partial<Qualification> = {};
  const purpose = extractPurpose(text);
  const budget = extractBudget(text);
  const property = extractProperty(text);
  const area = extractArea(text);
  if (purpose) out.purpose = purpose;
  if (budget) out.budget = budget;
  if (property) out.property = property;
  if (area) out.preferredArea = area;
  return out;
}

// ---------- lead stage signals ----------

const TIMING =
  "(?:later|tomorrow|tonight|next\\s+(?:week|month)|in\\s+(?:an?\\s+hour|\\d+\\s+(?:minutes?|hours?|days?)|the\\s+(?:morning|afternoon|evening))|after\\s+\\w+|on\\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|another\\s+time|this\\s+(?:evening|afternoon|weekend)|(?:in\\s+)?(?:a|a\\s+couple\\s+of|a\\s+few)\\s+(?:days|weeks))";

const FOLLOW_UP_RES: RegExp[] = [
  new RegExp(
    `\\b(?:call|ring|contact|reach|phone|text|message|whatsapp|email|ping)(?:\\s+me)?(?:\\s+back)?\\s+${TIMING}`,
    "i",
  ),
  new RegExp(`\\bgive\\s+me\\s+a\\s+(?:call|ring)(?:\\s+back)?\\s+${TIMING}`, "i"),
  /\bcall\s+(?:me\s+)?back\b/i,
  /\bcall-?back\b/i,
  /\bget\s+back\s+to\s+me\b/i,
  new RegExp(`\\b(?:talk|speak)\\s+(?:to\\s+me\\s+)?${TIMING}`, "i"),
  /\b(?:not\s+a\s+good\s+time|bad\s+time|busy\s+right\s+now|can'?t\s+talk\s+(?:right\s+)?now)\b/i,
];

const NOT_INTERESTED_RES: RegExp[] = [
  /\bnot\s+(?:really\s+|that\s+|very\s+|so\s+|at\s+all\s+)?interested\b/i,
  /\bno\s+longer\s+(?:interested|looking)\b/i,
  /\b(?:stop|quit)\s+(?:calling|contacting|messaging)\b/i,
  /\bdo(?:n'?t|\s+not)\s+(?:call|contact|message|ping)\s+me\b/i,
  /\bremove\s+(?:me|my\s+number)\b/i,
];
// "not interested right now" is a soft no: treat as a follow-up, not a refusal
const SOFT_NO_RE = /\bnot\s+interested\s+(?:right\s+now|at\s+the\s+moment|currently|now)\b/i;

const INTENT_RES: RegExp[] = [
  /(?<!not\s)(?<!not\s(?:really|very|that|so)\s)(?<!un)\binterested\b/i,
  /\b(?:want|wants|looking|planning|plan|ready|like|wish)\s+to\s+(?:buy|invest|purchase|book|see|view|visit)\b/i,
  /\bi(?:'d|\s+would)\s+like\s+(?:to|a|some|more)\b/i,
  /\bsend\s+(?:me\s+)?(?:the\s+|those\s+|more\s+)?(?:details|info|information|brochure|it)\b/i,
  /\bsounds?\s+(?:good|great|interesting|perfect)\b/i,
  /\blet'?s\s+(?:do\s+it|go|proceed|move\s+forward)\b/i,
];

// The lead is asking about work, not a property (a junk lead, not a refusal).
const JOB_RES: RegExp[] = [
  /\b(?:looking\s+for|need|want|seeking|searching\s+for)\s+(?:a\s+|any\s+)?(?:job|work|employment|vacanc(?:y|ies)|position)\b/i,
  /\bany\s+(?:job|vacanc(?:y|ies)|openings?|positions?)\b/i,
  /\bare\s+you\s+hiring\b/i,
  /\b(?:job|hiring|vacanc(?:y|ies)|recruitment|career)\s+(?:opening|enquiry|inquiry|position|opportunit(?:y|ies))\b/i,
  /\b(?:is\s+this|was\s+this)\s+(?:about|for|regarding)\s+(?:a\s+)?job\b/i,
  /\b(?:applied|apply|applying)\s+(?:for|to)[^.?!]{0,30}\b(?:job|position|vacancy)\b/i,
  /\b(?:send|share|email)\s+(?:you\s+)?(?:my\s+)?(?:cv|resume)\b/i,
];

// A wrong number / wrong person.
const WRONG_NUMBER_RES: RegExp[] = [
  /\bwrong\s+(?:number|person)\b/i,
  /\byou(?:'ve|\s+have|\s+got|'ve\s+got)\s+(?:got\s+)?the\s+wrong\b/i,
  /\bno\s+one\s+(?:here\s+)?(?:by|with)\s+that\s+name\b/i,
  /\bi(?:'m|\s+am)\s+not\s+james\b/i,
];

export type StageSignals = {
  notInterested: boolean;
  followUp: boolean;
  intent: boolean;
  jobEnquiry: boolean;
  wrongNumber: boolean;
};

export function detectStageSignals(text: string): StageSignals {
  const soft = SOFT_NO_RE.test(text);
  const followUp = soft || FOLLOW_UP_RES.some((re) => re.test(text));
  const notInterested = !soft && NOT_INTERESTED_RES.some((re) => re.test(text));
  const jobEnquiry = JOB_RES.some((re) => re.test(text));
  const wrongNumber = WRONG_NUMBER_RES.some((re) => re.test(text));
  const intent =
    !notInterested &&
    !soft &&
    !jobEnquiry &&
    !wrongNumber &&
    INTENT_RES.some((re) => re.test(text));
  return { notInterested, followUp, intent, jobEnquiry, wrongNumber };
}

// ---------- live lead state (browser-side) ----------

export type LiveLead = {
  qualification: Qualification;
  stage: LeadStage;
  /** Budget amount awaiting a currency confirmation, if any. */
  pendingAmount: number | null;
  /** Has the lead shown buying / investment intent during this call? */
  intentSeen: boolean;
};

export const INITIAL_LIVE_LEAD: LiveLead = {
  qualification: EMPTY_QUALIFICATION,
  stage: "New Lead",
  pendingAmount: null,
  intentSeen: false,
};

/**
 * The core of qualification, as the assistant actually collects it: the
 * purpose and a currency-confirmed budget. Area and property are welcome extras
 * (the lead may say "open to suggestions", and property type is never asked).
 */
export function isCoreQualified(q: Qualification, pendingAmount: number | null) {
  return (
    q.purpose !== NOT_PROVIDED &&
    q.budget !== NOT_PROVIDED &&
    pendingAmount === null
  );
}

/** Keeps the assistant's last two finished sentences as reply context. */
export function rememberAssistant(previous: string, sentence: string): string {
  const parts = previous.split("\n").filter(Boolean);
  parts.push(sentence.trim());
  return parts.slice(-2).join("\n");
}

/** What the assistant said just before the lead replied. Used only to READ the
 *  lead's reply ("yes" to what?), never to decide a stage by itself. */
export type ReplyContext = { assistantText?: string };

// The assistant asked the lead something that a "yes" means interest in:
// "Does that sound interesting?", "Want me to send you the details?",
// "Is WhatsApp okay?", "how does that sound?".
const OFFER_RE =
  /whats\s?app|send\s+(?:you|it|the|everything|over)|full\s+details|share\s+(?:the\s+)?details|brochure|sound(?:s)?\s+(?:interesting|good|great)|how\s+does\s+that\s+sound|work\s+for\s+you|want\s+me\s+to|would\s+you\s+like|shall\s+i|are\s+you\s+interested/i;

export function assistantMadeOffer(assistantText: string | undefined): boolean {
  return !!assistantText && assistantText.includes("?") && OFFER_RE.test(assistantText);
}

const AFFIRMATIVE_START_RE =
  /^\W*(?:yes|yeah|yep|yup|yea|sure|okay|ok|please|go\s+ahead|sounds\s+(?:good|great)|that\s+works|of\s+course|absolutely|definitely|perfect|great|fine|alright|why\s+not|do\s+it|send\s+it)\b/i;
const NEGATION_RE = /\b(?:no|not|don'?t|do\s+not|never|later|busy|maybe|but)\b/i;

/** A short, clean "yes": "Yes please", "Sure, go ahead" (not "yes but later"). */
export function isAffirmativeReply(text: string): boolean {
  const t = text.trim();
  return (
    t.split(/\s+/).length <= 12 && AFFIRMATIVE_START_RE.test(t) && !NEGATION_RE.test(t)
  );
}

// Wording that marks a new amount as the lead restating / correcting their
// budget ("actually 4 million", "because it is 4 million"), as opposed to a
// passing mention of some other number.
const BUDGET_REVISION_CUE_RE =
  /\b(?:budget|actually|instead|rather|more\s+like|make\s+it|up\s+to|go\s+up|can\s+go|spend|afford|maxim\w*|it(?:'s|\s+is)|that(?:'s|\s+is))\b/i;

/** Applies ONE finished user utterance. Never call this with assistant text. */
export function applyUserMessage(
  state: LiveLead,
  text: string,
  context: ReplyContext = {},
): LiveLead {
  const q: Qualification = { ...state.qualification };
  let pendingAmount = state.pendingAmount;

  const updates = extractQualification(text);
  if (updates.purpose) q.purpose = updates.purpose;
  if (updates.property) q.property = updates.property;
  // "Open to suggestions" is a real answer, but never replaces a specific area.
  let areaUpdate = updates.preferredArea;
  if (areaUpdate === OPEN_AREA && q.preferredArea !== NOT_PROVIDED) areaUpdate = undefined;
  if (
    !areaUpdate &&
    q.preferredArea === NOT_PROVIDED &&
    context.assistantText &&
    ASKED_AREA_RE.test(context.assistantText) &&
    isOpenAreaReply(text)
  ) {
    areaUpdate = OPEN_AREA; // a bare "open" / "not sure" to the area question
  }
  if (areaUpdate) q.preferredArea = areaUpdate;

  const budget = analyzeBudget(text);
  const budgetConfirmed = q.budget !== NOT_PROVIDED && pendingAmount === null;
  if (budget.budget) {
    q.budget = budget.budget;
    pendingAmount = null;
  } else if (budget.pendingAmount !== null && !budgetConfirmed) {
    q.budget = formatPendingBudget(budget.pendingAmount);
    pendingAmount = budget.pendingAmount;
  } else if (
    budget.pendingAmount !== null &&
    budgetConfirmed &&
    BUDGET_REVISION_CUE_RE.test(text)
  ) {
    // A currency-less restatement of a budget whose currency the lead already
    // confirmed in this call: keep that currency (not a fresh guess).
    const confirmedCurrency = /^([A-Z]{3}) /.exec(q.budget)?.[1];
    if (confirmedCurrency) {
      q.budget = formatMoney(budget.pendingAmount, confirmedCurrency);
    }
  } else if (pendingAmount !== null) {
    const cur = currencyOnlyReply(text);
    if (cur) {
      q.budget = formatMoney(pendingAmount, cur);
      pendingAmount = null;
    }
  }

  const signals = detectStageSignals(text);
  // A bare "yes" counts as interest when it answers the assistant's offer.
  const saidYesToOffer =
    isAffirmativeReply(text) &&
    assistantMadeOffer(context.assistantText) &&
    !signals.notInterested &&
    !signals.followUp &&
    !signals.jobEnquiry &&
    !signals.wrongNumber;
  const intentNow = signals.intent || saidYesToOffer;
  const intentSeen = state.intentSeen || intentNow;

  let stage = state.stage;
  if (signals.jobEnquiry) {
    stage = JOB_STAGE;
  } else if (signals.wrongNumber) {
    stage = WRONG_NUMBER_STAGE;
  } else if (signals.notInterested) {
    stage = "Not Interested";
  } else if (signals.followUp) {
    stage = "Follow-up";
  } else if (
    isCoreQualified(q, pendingAmount) &&
    intentSeen &&
    (stage === "New Lead" || intentNow)
  ) {
    stage = "Qualified";
  }

  return { qualification: q, stage, pendingAmount, intentSeen };
}
