// Dynamic market recommendation engine (backend only; no UI, no React).
// Pure functions: datasets and scoring config are passed in, so everything is testable.
// Method: docs/dubai-analysis/data/dynamic-recommendation-methodology.md
//
// Two separate scores:
//   Buyer Opportunity Score   - how attractive a country is as a source of Dubai off-plan buyers.
//   Acquisition Efficiency    - how easily and cheaply a market can be tested.
// Neither is a probability of sale.

export type Proficiency = "fluent" | "professional" | "conversational";
export type PlanMode = "budget" | "leads";
export type Range = { lo: number | null; hi: number | null };

/** Compact country record (see scripts/market-intel/build_datasets.py). Null means unknown, never zero. */
export type IntelCountry = {
  n: string;
  rg: string;
  pop: number | null;
  gdp: number | null; // GDP per capita PPP
  net: number | null; // internet users %
  ip: number | null;
  pp: number | null; // purchasing power percentile 0..100
  dx: number | null; // DXBinteract-reported international search-interest share %
  dxr: number | null;
  cs: "regional_proxy" | "modelled" | "manual_research_required";
  cr: "point" | "range" | "at_most" | null;
  cl: number | null;
  cb: number | null;
  ch: number | null;
  cc: string;
  ad: boolean;
  ad_note?: string | null;
  gr?: number | null; // GDP growth %
  inf?: number | null;
  ps?: number | null;
  fx?: number | null;
  ofdi?: number | null;
  cred?: number | null;
  aff?: number | null; // modelled affluent population
  affs?: number | null;
  ic?: number | null; // investment capability index 0..100
  ci?: number | null; // conditions index 0..100
  cm?: string | null; // capital-movement flag
  /** Count of documented, country-specific motivation categories (none exist yet). */
  mot?: number | null;
  /** True when this CPL was typed into cpl-overrides.csv. */
  ov?: boolean;
};

export type BuyerKey =
  | "demand"
  | "purchasing_power"
  | "investment_capability"
  | "motivations"
  | "conditions"
  | "affluent_audience"
  | "language";
export type EfficiencyKey = "cpl" | "reachable_audience" | "language_suitability" | "testing_requirement" | "search_demand";

type Factor = { evidence_confidence?: number };

export type ScoringConfig = {
  model_version: string;
  buyer_opportunity: {
    weights: Record<BuyerKey, number>;
    factors: {
      demand: Factor;
      purchasing_power: Factor;
      investment_capability: Factor;
      motivations: Factor;
      conditions: Factor;
      affluent_audience: Factor & { affluent_full_reach: number; affluent_floor: number; diaspora_bonus_max: number };
      language: Factor;
    };
    aggregation: { min_available_weight_share: number };
  };
  acquisition_efficiency: {
    weights: Record<EfficiencyKey, number>;
    factors: {
      cpl: {
        cpl_ref_low_aed: number;
        cpl_ref_high_aed: number;
        evidence_confidence_by_cpl_status: Record<string, number>;
        evidence_confidence_for_ceiling_only: number;
      };
      reachable_audience: Factor & { online_full_reach: number };
      language_suitability: Factor;
      testing_requirement: Factor & { easy_budget_aed: number; hard_budget_aed: number };
      search_demand: Factor;
    };
    min_available_weight_share: number;
  };
  selection: {
    quality_emphasis: number;
    rank_missing_factor_prior: number;
    other_efficiency: { floor: number; weight: number };
  };
  language: {
    default_languages_when_none_selected: string[];
    proficiency_weight: Record<Proficiency, number>;
    primary_full_share_pct: number;
    min_serviceability_to_recommend: number;
    diaspora_only_serviceability: number;
    diaspora_pool_discount: number;
    diaspora_pool_full_reach: number;
    pool_full_reach: number;
    pool_serviceability?: { pool_zero: number; pool_full: number; max_serviceability: number };
  };
  allocation: {
    desired_test_leads_per_market: number;
    min_market_budget_floor_aed: number;
    uncertainty_premium_on_upper_cpl: Record<string, number>;
    max_markets: number;
    max_single_market_share: number;
    concentration_exponent: number;
    max_share_of_budget_reserved_for_minimums: number;
    scale_efficiency: { base_efficient_spend_aed: number; size_floor: number; size_span: number; beyond_efficiency: number };
    min_markets_when_affordable: number;
  };
  eligibility: {
    exclude_ad_restricted_markets: boolean;
    min_serviceability_exempt_if_demand_evidence: boolean;
    serviceability_exemption_languages: string[];
  };
  close_rate: { default: number };
  modelled_cpl_safety_margin: { value: number };
  language_anchors?: {
    enabled: boolean;
    markets_per_language: number;
    min_language_reach_pct: number;
    min_serviceability: number;
    home_markets: string[];
    max_share_of_budget_for_anchors: number;
  };
};

export type IntelData = {
  countries: Record<string, IntelCountry>;
  /** languageShare[iso2][languageCode] = % of population (CLDR; first or additional language). */
  languageShare: Record<string, Record<string, number>>;
  /** diaspora[languageCode][residenceIso2] = [language-compatible citizen stock, top origins]. */
  diaspora: Record<string, Record<string, [number, Array<[string, number]>]>>;
  config: ScoringConfig;
  /** Country opportunity score 0..100 from the six-dimension sheet (without cost per lead). When present it drives buyer quality. */
  opportunityScore?: (iso2: string) => number | null;
};

export type CplSource = "client-regional-proxy" | "modelled-estimate" | "user-assumption";

export type IntelCpl = {
  lo: number | null;
  hi: number;
  base: number | null;
  relation: "point" | "range" | "at_most";
  source: CplSource;
  confidence: string;
};

/** CPL for a country. A user-entered override is a point CPL; client benchmarks otherwise win over models. */
export function resolveCpl(c: IntelCountry, override?: number | null, modelledMargin = 0): IntelCpl | null {
  if (c.cs !== "regional_proxy" && override && override > 0) {
    return { lo: override, hi: override, base: override, relation: "point", source: "user-assumption", confidence: "user" };
  }
  if (c.cs === "manual_research_required" || c.ch === null || c.cr === null) {
    if (override && override > 0) return { lo: override, hi: override, base: override, relation: "point", source: "user-assumption", confidence: "user" };
    return null;
  }
  // Modelled ranges get a safety margin (fewer leads, never more). Client benchmarks and the AED 30
  // ceiling are the client's own numbers and are left exactly as supplied.
  const m = c.cs === "modelled" && c.cr !== "at_most" ? 1 + modelledMargin : 1;
  return {
    lo: c.cr === "at_most" ? null : (c.cl ?? c.ch) * m,
    hi: c.ch * m,
    base: c.cb === null ? null : c.cb * m,
    relation: c.cr,
    source: c.cs === "regional_proxy" ? "client-regional-proxy" : "modelled-estimate",
    confidence: c.cc,
  };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// ---------------------------------------------------------------- language and cost per lead
//
// Client CPL benchmarks are treated as English campaigns. A language that reaches fewer people in a country makes leads
// dearer there (smaller audience, more niche targeting); a language that reaches more makes them a little cheaper.
// factor = sqrt(English reach / selected-language reach), kept between LANGUAGE_CPL.min and LANGUAGE_CPL.max.
// The 0.5 exponent and the limits are planning assumptions, not measured elasticities.
export const LANGUAGE_CPL = { exponent: 0.5, min: 0.8, max: 2.5, englishFloor: 0.5, selectedFloor: 0.15 };

export function languageCplFactor(iso2: string, languages: Record<string, Proficiency>, data: IntelData): number {
  const sel = languageFit(iso2, languages, data).serviceability;
  if (sel === null) return 1; // no language data for this country: leave the CPL alone
  const en = languageFit(iso2, { en: "professional" }, data).serviceability ?? 0;
  const ratio = Math.max(en, LANGUAGE_CPL.englishFloor) / Math.max(sel, LANGUAGE_CPL.selectedFloor);
  return Math.min(LANGUAGE_CPL.max, Math.max(LANGUAGE_CPL.min, Math.pow(ratio, LANGUAGE_CPL.exponent)));
}

/** A CPL scaled by a factor. A figure the user typed is never scaled. */
export function scaleCpl(cpl: IntelCpl, factor: number): IntelCpl {
  if (cpl.source === "user-assumption" || factor === 1) return cpl;
  return { ...cpl, lo: cpl.lo === null ? null : cpl.lo * factor, hi: cpl.hi * factor, base: cpl.base === null ? null : cpl.base * factor };
}

const statusKey = (s: CplSource) => (s === "client-regional-proxy" ? "regional_proxy" : s === "modelled-estimate" ? "modelled" : "user_assumption");

// ---------------------------------------------------------------- language

export type LanguageFit = {
  via: string[];
  primaryShare: number;
  pool: number | null;
  diasporaPool: number;
  serviceability: number | null;
  opportunity: number | null;
  diasporaOnly: boolean;
  dataAvailable: boolean;
};

export function effectiveLanguages(languages: Record<string, Proficiency>, cfg: ScoringConfig): Record<string, Proficiency> {
  const keys = Object.keys(languages).filter((k) => k !== "other");
  if (keys.length > 0) return Object.fromEntries(keys.map((k) => [k, languages[k]]));
  return Object.fromEntries(cfg.language.default_languages_when_none_selected.map((k) => [k, "professional" as Proficiency]));
}

export function languageFit(iso2: string, languages: Record<string, Proficiency>, data: IntelData): LanguageFit {
  const cfg = data.config.language;
  const shares = data.languageShare[iso2];
  const country = data.countries[iso2];
  let best = 0;
  let sumPrimary = 0;
  let diasporaPool = 0;
  const via = new Set<string>();
  let diasporaServes = false;
  for (const [code, prof] of Object.entries(languages)) {
    const w = cfg.proficiency_weight[prof] ?? 0;
    const pct = shares?.[code] ?? 0;
    if (pct > 0) {
      via.add(code);
      best = Math.max(best, Math.min(1, pct / cfg.primary_full_share_pct) * w);
      if (country?.pop) sumPrimary += (country.pop * pct * w) / 100;
    }
    const d = data.diaspora[code]?.[iso2]?.[0] ?? 0;
    if (d > 0) {
      via.add(code);
      diasporaPool += d * w * cfg.diaspora_pool_discount;
      if (d >= 20_000) diasporaServes = true;
    }
  }
  if (!shares && diasporaPool === 0) {
    return { via: [], primaryShare: 0, pool: null, diasporaPool: 0, serviceability: null, opportunity: null, diasporaOnly: false, dataAvailable: false };
  }
  // A minority language spoken by millions is still worth serving: take the larger of share- and pool-based fit.
  const ps = cfg.pool_serviceability;
  // The audience is the speakers living there plus the (discounted) diaspora communities from the migration data,
  // so a country with a large Hindi, Urdu or Punjabi community counts even where the language is a minority.
  const audience = sumPrimary + diasporaPool;
  const poolBased =
    ps && audience > 0
      ? Math.min(ps.max_serviceability, clamp01((Math.log10(audience) - Math.log10(ps.pool_zero)) / (Math.log10(ps.pool_full) - Math.log10(ps.pool_zero))) * ps.max_serviceability)
      : 0;
  const shareFit = best;
  best = Math.max(best, poolBased);
  const diasporaOnly = shareFit < cfg.diaspora_only_serviceability && best < cfg.diaspora_only_serviceability && diasporaServes;
  const serviceability = diasporaOnly ? cfg.diaspora_only_serviceability : best;
  const pool = (country?.pop ? Math.min(sumPrimary, country.pop) : 0) + diasporaPool;
  const opportunity = pool > 0 ? clamp01(Math.log10(pool) / Math.log10(cfg.pool_full_reach)) : 0;
  return { via: [...via], primaryShare: shareFit * cfg.primary_full_share_pct, pool, diasporaPool, serviceability, opportunity, diasporaOnly, dataAvailable: true };
}

// ---------------------------------------------------------------- scores

export type FactorScore = { score: number | null; confidence: number };

export type Aggregate<K extends string> = {
  factors: Record<K, FactorScore>;
  /** 0..100 over the factors that have data; null when evidence is insufficient. */
  score: number | null;
  /** Evidence confidence 0..1, reported separately from the score. */
  evidence: number;
  availableWeightShare: number;
  insufficientEvidence: boolean;
};

function aggregate<K extends string>(factors: Record<K, FactorScore>, weights: Record<K, number>, minShare: number): Aggregate<K> {
  let wAll = 0;
  let wAvail = 0;
  let weighted = 0;
  let confidence = 0;
  for (const key of Object.keys(factors) as K[]) {
    const w = weights[key];
    wAll += w;
    const f = factors[key];
    if (f.score !== null) {
      wAvail += w;
      weighted += w * f.score;
      confidence += w * f.confidence;
    }
  }
  const availableWeightShare = wAll > 0 ? wAvail / wAll : 0;
  const insufficientEvidence = availableWeightShare < minShare;
  return {
    factors,
    score: wAvail > 0 && !insufficientEvidence ? (weighted / wAvail) * 100 : null,
    evidence: wAll > 0 ? confidence / wAll : 0,
    availableWeightShare,
    insufficientEvidence,
  };
}

export function maxDemandShare(data: IntelData): number {
  return Math.max(1, ...Object.values(data.countries).map((c) => c.dx ?? 0));
}

const NONE: FactorScore = { score: null, confidence: 0 };

export function minTestBudget(cpl: IntelCpl, cfg: ScoringConfig): number {
  const a = cfg.allocation;
  const premium = a.uncertainty_premium_on_upper_cpl[statusKey(cpl.source)] ?? 0;
  return Math.max(a.min_market_budget_floor_aed, a.desired_test_leads_per_market * cpl.hi * (1 + premium));
}

export function buyerScore(iso2: string, languages: Record<string, Proficiency>, data: IntelData): Aggregate<BuyerKey> & { language: LanguageFit } {
  const cfg = data.config.buyer_opportunity;
  const f = cfg.factors;
  const c = data.countries[iso2];
  const fit = languageFit(iso2, languages, data);
  const full = f.affluent_audience.affluent_full_reach;
  const floor = f.affluent_audience.affluent_floor;

  let affluent: FactorScore = NONE;
  if (c.aff !== null && c.aff !== undefined) {
    const base = c.aff > 1 ? clamp01((Math.log10(c.aff) - Math.log10(floor)) / (Math.log10(full) - Math.log10(floor))) : 0;
    const d = clamp01(Math.log10(1 + fit.diasporaPool) / Math.log10(data.config.language.diaspora_pool_full_reach));
    affluent = { score: base + (1 - base) * f.affluent_audience.diaspora_bonus_max * d, confidence: f.affluent_audience.evidence_confidence ?? 0.4 };
  }
  const factors: Record<BuyerKey, FactorScore> = {
    demand: c.dx !== null ? { score: Math.sqrt(c.dx / maxDemandShare(data)), confidence: f.demand.evidence_confidence ?? 0.7 } : NONE,
    purchasing_power: c.pp !== null ? { score: clamp01(c.pp / 100), confidence: f.purchasing_power.evidence_confidence ?? 0.8 } : NONE,
    investment_capability: c.ic !== null && c.ic !== undefined ? { score: clamp01(c.ic / 100), confidence: f.investment_capability.evidence_confidence ?? 0.5 } : NONE,
    motivations: c.mot !== null && c.mot !== undefined ? { score: clamp01(c.mot / 3), confidence: f.motivations.evidence_confidence ?? 0.6 } : NONE,
    conditions: c.ci !== null && c.ci !== undefined ? { score: clamp01(c.ci / 100), confidence: f.conditions.evidence_confidence ?? 0.7 } : NONE,
    affluent_audience: affluent,
    language: fit.serviceability !== null ? { score: fit.serviceability, confidence: f.language.evidence_confidence ?? 0.6 } : NONE,
  };
  return { ...aggregate(factors, cfg.weights, cfg.aggregation.min_available_weight_share), language: fit };
}

export function efficiencyScore(
  iso2: string,
  cpl: IntelCpl | null,
  minBudget: number | null,
  fit: LanguageFit,
  data: IntelData,
): Aggregate<EfficiencyKey> {
  const cfg = data.config.acquisition_efficiency;
  const f = cfg.factors;
  const c = data.countries[iso2];
  let cplF: FactorScore = NONE;
  if (cpl) {
    const value = cpl.base ?? cpl.hi;
    const lo = Math.log(f.cpl.cpl_ref_low_aed);
    const hi = Math.log(f.cpl.cpl_ref_high_aed);
    cplF = {
      score: clamp01((hi - Math.log(value)) / (hi - lo)),
      confidence: cpl.base === null ? f.cpl.evidence_confidence_for_ceiling_only : (f.cpl.evidence_confidence_by_cpl_status[statusKey(cpl.source)] ?? 0.4),
    };
  }
  let online: FactorScore = NONE;
  if (c.pop && c.net !== null) {
    const people = (c.pop * c.net) / 100;
    online = { score: people > 1 ? clamp01(Math.log10(people) / Math.log10(f.reachable_audience.online_full_reach)) : 0, confidence: f.reachable_audience.evidence_confidence ?? 0.7 };
  }
  let testing: FactorScore = NONE;
  if (minBudget !== null) {
    const t = f.testing_requirement;
    testing = { score: clamp01(1 - Math.log(minBudget / t.easy_budget_aed) / Math.log(t.hard_budget_aed / t.easy_budget_aed)), confidence: t.evidence_confidence ?? 0.5 };
  }
  const factors: Record<EfficiencyKey, FactorScore> = {
    cpl: cplF,
    reachable_audience: online,
    language_suitability: fit.opportunity !== null ? { score: fit.opportunity, confidence: f.language_suitability.evidence_confidence ?? 0.6 } : NONE,
    testing_requirement: testing,
    search_demand: c.dx !== null ? { score: Math.sqrt(c.dx / maxDemandShare(data)), confidence: f.search_demand.evidence_confidence ?? 0.7 } : NONE,
  };
  return aggregate(factors, cfg.weights, cfg.min_available_weight_share);
}

/** Buyer score used for ORDERING only: a missing factor counts at a cautious prior, not zero and not full marks. */
export function rankingBuyerScore(buyer: Aggregate<BuyerKey>, weights: Record<BuyerKey, number>, prior: number): number {
  let sum = 0;
  let wAll = 0;
  for (const key of Object.keys(buyer.factors) as BuyerKey[]) {
    const s = buyer.factors[key].score;
    sum += weights[key] * (s === null ? prior : s);
    wAll += weights[key];
  }
  return (sum / wAll) * 100;
}

/**
 * Quality index 0..1: how good a buyer market this is, with missing evidence discounted.
 * It is used to weight lead volume in the recommendation. It is not a close rate or a probability of sale.
 */
export function qualityIndex(buyer: Aggregate<BuyerKey>, cfg: ScoringConfig): number | null {
  if (buyer.score === null) return null;
  const b = rankingBuyerScore(buyer, cfg.buyer_opportunity.weights, cfg.selection.rank_missing_factor_prior) / 100;
  return clamp01(b * (0.5 + 0.5 * buyer.evidence));
}

/** Efficiency beyond the CPL itself (reach, language pool, testing, search demand), 0..1; neutral 0.5 if unknown. */
export function otherEfficiency(eff: Aggregate<EfficiencyKey>, cfg: ScoringConfig): number {
  const w = cfg.acquisition_efficiency.weights;
  let sum = 0;
  let wSum = 0;
  for (const key of Object.keys(eff.factors) as EfficiencyKey[]) {
    if (key === "cpl") continue;
    const s = eff.factors[key].score;
    if (s !== null) {
      sum += w[key] * s;
      wSum += w[key];
    }
  }
  return wSum > 0 ? sum / wSum : 0.5;
}

/** The CPL used for expected value: the base estimate if there is one, else the upper CPL (ceilings). */
export const cplForValue = (cpl: IntelCpl) => cpl.base ?? cpl.hi;

/**
 * Quality-weighted leads per AED x 100. More leads per AED and a better buyer market both raise it, and
 * quality counts more than price (quality_emphasis). This drives which markets are chosen and how the budget
 * is split.
 */
export function utilityPerAed(quality: number, cpl: IntelCpl, other: number, cfg: ScoringConfig): number {
  const s = cfg.selection;
  const mult = s.other_efficiency.floor + s.other_efficiency.weight * other;
  return (Math.pow(quality, s.quality_emphasis) / cplForValue(cpl)) * mult * 100;
}

// ---------------------------------------------------------------- candidates and selection

export type ExcludedReason =
  | "cpl_research_required"
  | "cpl_source_not_enabled"
  | "ad_market_restricted"
  | "language_not_serviceable"
  | "language_data_unavailable"
  | "insufficient_evidence"
  | "user_excluded";

export type Candidate = {
  iso2: string;
  cpl: IntelCpl;
  buyer: Aggregate<BuyerKey> & { language: LanguageFit };
  efficiency: Aggregate<EfficiencyKey>;
  /** 0..1 quality of the buyer market (evidence-discounted). */
  quality: number;
  /** Quality-weighted leads per AED x 100: the selection and allocation criterion. */
  utility: number;
  /** Same as utility; kept as the sort key. */
  rank: number;
  minBudget: number;
};

export type CandidateOptions = {
  exclude?: string[];
  /** User-entered planning CPLs (AED). */
  cplOverrides?: Record<string, number>;
  /** Restrict which CPL sources are usable (default: all). */
  allowedCplSources?: CplSource[];
};

export function buildCandidates(
  languages: Record<string, Proficiency>,
  data: IntelData,
  opts: CandidateOptions = {},
): { candidates: Candidate[]; excluded: Array<{ iso2: string; reason: ExcludedReason }> } {
  const cfg = data.config;
  const candidates: Candidate[] = [];
  const excluded: Array<{ iso2: string; reason: ExcludedReason }> = [];
  for (const iso2 of Object.keys(data.countries)) {
    const c = data.countries[iso2];
    if (opts.exclude?.includes(iso2)) {
      excluded.push({ iso2, reason: "user_excluded" });
      continue;
    }
    if (cfg.eligibility.exclude_ad_restricted_markets && c.ad) {
      excluded.push({ iso2, reason: "ad_market_restricted" });
      continue;
    }
    const baseCpl = resolveCpl(c, opts.cplOverrides?.[iso2], cfg.modelled_cpl_safety_margin?.value ?? 0);
    const cpl = baseCpl ? scaleCpl(baseCpl, languageCplFactor(iso2, languages, data)) : null;
    if (!cpl) {
      excluded.push({ iso2, reason: "cpl_research_required" });
      continue;
    }
    if (opts.allowedCplSources && !opts.allowedCplSources.includes(cpl.source)) {
      excluded.push({ iso2, reason: "cpl_source_not_enabled" });
      continue;
    }
    const buyer = buyerScore(iso2, languages, data);
    if (buyer.language.serviceability === null) {
      excluded.push({ iso2, reason: "language_data_unavailable" });
      continue;
    }
    const exempt =
      cfg.eligibility.min_serviceability_exempt_if_demand_evidence &&
      c.dx !== null &&
      cfg.eligibility.serviceability_exemption_languages.some((l) => l in languages);
    if (buyer.language.serviceability < cfg.language.min_serviceability_to_recommend && !exempt) {
      excluded.push({ iso2, reason: "language_not_serviceable" });
      continue;
    }
    const minBudget = minTestBudget(cpl, cfg);
    const efficiency = efficiencyScore(iso2, cpl, minBudget, buyer.language, data);
    const opp = data.opportunityScore ? data.opportunityScore(iso2) : null;
    const quality = opp !== null ? clamp01((opp / 100) * (0.85 + 0.15 * buyer.language.serviceability)) : qualityIndex(buyer, cfg);
    if (quality === null) {
      excluded.push({ iso2, reason: "insufficient_evidence" });
      continue;
    }
    const utility = utilityPerAed(quality, cpl, otherEfficiency(efficiency, cfg), cfg);
    candidates.push({ iso2, cpl, buyer, efficiency, quality, utility, rank: utility, minBudget });
  }
  candidates.sort((a, b) => b.rank - a.rank || a.iso2.localeCompare(b.iso2));
  return { candidates, excluded };
}

/** Spend a market can absorb at full efficiency (planning assumption; see config rationale). */
export function efficientSpendLimit(c: Candidate, cfg: ScoringConfig): number {
  const s = cfg.allocation.scale_efficiency;
  const size = c.buyer.factors.affluent_audience.score ?? 0.5;
  return s.base_efficient_spend_aed * (s.size_floor + s.size_span * size);
}

/** Total value of putting `spend` into a market: quality-weighted leads, with diminishing returns beyond its efficient spend. */
export function marketValue(c: Candidate, spend: number, cfg: ScoringConfig): number {
  const limit = efficientSpendLimit(c, cfg);
  // Beyond the efficient spend the value keeps growing but ever more slowly: the next dirham is worth limit / (limit + extra)
  // of a first-slice dirham. A flat half rate (the old rule) let one strong market absorb any budget; this lets bigger
  // budgets spread to the next-best markets once the first ones saturate.
  const extra = Math.max(0, spend - limit);
  return (c.utility / 100) * (Math.min(spend, limit) + limit * Math.log(1 + extra / limit));
}

export function portfolioValue(items: Array<{ c: Candidate; spend: number }>, cfg: ScoringConfig): number {
  return items.reduce((s, x) => s + marketValue(x.c, x.spend, cfg), 0);
}

export type Portfolio = { picked: Candidate[]; spend: Record<string, number>; objective: number; belowMinimum: boolean };

function fillBudget(set: Candidate[], budget: number, cfg: ScoringConfig): Record<string, number> {
  const k = set.length;
  const a = cfg.allocation;
  const spend = set.map((c) => c.minBudget);
  let remaining = budget - spend.reduce((s, v) => s + v, 0);
  const cap = k === 1 ? budget : Math.max(a.max_single_market_share, 1.2 / k) * budget;
  const step = Math.max(10, budget / 400);
  while (remaining > 1e-9) {
    const chunk = Math.min(step, remaining);
    let best = -1;
    let bestGain = -1;
    for (let i = 0; i < k; i++) {
      if (spend[i] + chunk > cap + 1e-9) continue;
      const gain = marketValue(set[i], spend[i] + chunk, cfg) - marketValue(set[i], spend[i], cfg);
      if (gain > bestGain) {
        bestGain = gain;
        best = i;
      }
    }
    if (best < 0) best = 0; // every market is at its cap (cannot happen: k x cap >= 1.2 x budget)
    spend[best] += chunk;
    remaining -= chunk;
  }
  return Object.fromEntries(set.map((c, i) => [c.iso2, spend[i]]));
}

/**
 * Chooses how many markets to test and how to split the budget so that total value (quality-weighted leads
 * with diminishing returns) is highest. Candidates are tried in utility order, 1..max_markets of them, each
 * needing its minimum test budget. Pinned markets always come first. No fixed number of markets.
 */
export function optimizePortfolio(candidates: Candidate[], budget: number, cfg: ScoringConfig, pinned: string[] = []): Portfolio {
  const pins = pinned.map((iso) => candidates.find((c) => c.iso2 === iso)).filter((c): c is Candidate => !!c);
  const order = [...pins, ...candidates.filter((c) => !pins.includes(c))];
  const kMin = Math.max(1, pins.length, cfg.allocation.min_markets_when_affordable ?? 1);
  const kMax = Math.min(cfg.allocation.max_markets, order.length);
  const tryRange = (from: number, to: number): Portfolio | null => {
    let found: Portfolio | null = null;
    for (let k = from; k <= to; k++) {
      const set = order.slice(0, k);
      if (set.reduce((s, c) => s + c.minBudget, 0) > budget + 1e-9) break;
      const spend = fillBudget(set, budget, cfg);
      const objective = portfolioValue(set.map((c) => ({ c, spend: spend[c.iso2] })), cfg);
      if (!found || objective > found.objective * (1 + 1e-9)) found = { picked: set, spend, objective, belowMinimum: false };
    }
    return found;
  };
  // Prefer at least the minimum number of markets; only fall back to fewer when the budget cannot fund them.
  let best: Portfolio | null = tryRange(Math.min(kMin, kMax), kMax) ?? tryRange(Math.max(1, pins.length), Math.min(kMin, kMax) - 1);
  if (!best && order.length > 0) {
    // The budget cannot fund even one proper test: show the top market, flagged.
    const top = order[0];
    best = { picked: [top], spend: { [top.iso2]: budget }, objective: marketValue(top, budget, cfg), belowMinimum: true };
  }
  return best ?? { picked: [], spend: {}, objective: 0, belowMinimum: false };
}

export function equalShares(isos: string[]): Record<string, number> {
  return Object.fromEntries(isos.map((k) => [k, 1 / isos.length]));
}

/** Leads per AED: lo uses the upper CPL, hi the lower CPL (null if any is open-ended). */
export function leadsPerAed(shares: Record<string, number>, cpls: Record<string, IntelCpl>) {
  let lo = 0;
  let hi: number | null = 0;
  for (const [iso, s] of Object.entries(shares)) {
    const cpl = cpls[iso];
    if (!cpl || s <= 0) continue;
    lo += s / cpl.hi;
    hi = hi === null || cpl.lo === null ? null : hi + s / cpl.lo;
  }
  return { lo, hi };
}

// ---------------------------------------------------------------- language anchors

/**
 * Markets that must be shown because of the agent languages the user chose: the best-value eligible markets
 * where a selected language is the main language, plus home markets (UAE) where it is spoken. Only for
 * explicitly selected languages, and only as many as fit within a share of the budget at their minimum tests.
 */
export function anchorMarkets(
  candidates: Candidate[],
  languages: Record<string, Proficiency>,
  explicit: boolean,
  budget: number,
  data: IntelData,
): string[] {
  const a = data.config.language_anchors;
  if (!a?.enabled || !explicit) return [];
  const reachOf = (iso: string, code: string) => data.languageShare[iso]?.[code] ?? 0;
  const prof = data.config.language.proficiency_weight;
  const wanted: string[] = [];
  const ok = (c: Candidate, code: string) =>
    reachOf(c.iso2, code) >= a.min_language_reach_pct && (c.buyer.language.serviceability ?? 0) >= a.min_serviceability && (prof[languages[code]] ?? 0) > 0.5;
  // The default language (English) is the baseline, not a reason to pin markets.
  const selected = Object.keys(languages).filter((k) => k !== "other" && !data.config.language.default_languages_when_none_selected.includes(k));
  // home markets first
  for (const home of a.home_markets) {
    const c = candidates.find((x) => x.iso2 === home);
    if (c && selected.some((code) => ok(c, code))) wanted.push(home);
  }
  // then, per language, the best-value markets where it is the main language
  for (const code of selected) {
    let n = 0;
    for (const c of candidates) {
      if (n >= a.markets_per_language) break;
      if (ok(c, code)) {
        if (!wanted.includes(c.iso2)) wanted.push(c.iso2);
        n++;
      }
    }
  }
  const out: string[] = [];
  let used = 0;
  for (const iso of wanted) {
    const c = candidates.find((x) => x.iso2 === iso);
    if (c && used + c.minBudget <= budget * a.max_share_of_budget_for_anchors) {
      out.push(iso);
      used += c.minBudget;
    }
  }
  return out;
}

// ---------------------------------------------------------------- recommendation

export type RecommendInput = {
  mode: PlanMode;
  /** Monthly budget in AED (mode "budget") or monthly lead target (mode "leads"). */
  amount: number;
  languages?: Record<string, Proficiency>;
  /** Illustrative raw-lead-to-sale rate; defaults to the editable global assumption. */
  closeRate?: number;
  /** Markets the user removed. Never recommended. */
  exclude?: string[];
  /** Markets the user pinned. Always included when eligible. */
  include?: string[];
  cplOverrides?: Record<string, number>;
  allowedCplSources?: CplSource[];
};

export type RecommendedMarket = {
  iso2: string;
  name: string;
  region: string;
  share: number;
  spend: number;
  cpl: IntelCpl;
  leads: Range;
  /** Pipeline: spend -> leads -> qualified leads (no valid rate) -> eventual sales (illustrative). */
  qualifiedLeads: { status: "unavailable_no_validated_rate"; value: null };
  eventualSales: Range;
  /** 0..1 buyer-market quality (evidence-discounted). Not a close rate. */
  quality: number;
  /** Leads weighted by quality: the quantity the recommendation maximises. Not sales. */
  qualityWeightedLeads: number;
  /** Share of modelled sales, from the conservative lead forecast. Illustrative, not guaranteed. */
  salesContribution: number | null;
  buyer: Aggregate<BuyerKey> & { language: LanguageFit };
  efficiency: Aggregate<EfficiencyKey>;
  rank: number;
  reasons: string[];
  flags: string[];
  evidenceLevel: "evidence_backed" | "exploratory";
  pinned: boolean;
  /** Included because a language you selected is mainly spoken here (or it is the UAE home market). */
  languageAnchor: boolean;
};

export type Recommendation = {
  modelVersion: string;
  isProbabilityOfSale: false;
  mode: PlanMode;
  languages: Record<string, Proficiency>;
  languagesDefaulted: boolean;
  budget: number;
  budgetRange: Range;
  leadTarget: number | null;
  markets: RecommendedMarket[];
  totals: { leads: Range; eventualSales: Range; blendedCpl: Range; qualityWeightedLeads: number; objective: number };
  closeRate: number;
  closeRateNote: string;
  equalAlternative: { note: string; shares: Record<string, number>; leads: Range; eventualSales: Range; qualityWeightedLeads: number; objective: number };
  excluded: Array<{ iso2: string; reason: ExcludedReason }>;
  excludedCounts: Partial<Record<ExcludedReason, number>>;
  notes: string[];
};

function forecast(shares: Record<string, number>, cpls: Record<string, IntelCpl>, budget: number, closeRate: number) {
  const lpa = leadsPerAed(shares, cpls);
  const leads: Range = { lo: budget * lpa.lo, hi: lpa.hi === null ? null : budget * lpa.hi };
  const sales: Range = { lo: leads.lo === null ? null : leads.lo * closeRate, hi: leads.hi === null ? null : leads.hi * closeRate };
  return { leads, sales, lpa };
}

function reasonsFor(c: Candidate, data: IntelData): { reasons: string[]; flags: string[] } {
  const country = data.countries[c.iso2];
  const reasons: string[] = [];
  const flags: string[] = [];
  const b = c.buyer.factors;
  if (country.dx !== null) reasons.push(`Reported Dubai search-interest share ${country.dx}% (rank ${country.dxr}); search interest, not purchases`);
  else flags.push("No Dubai demand signal on file");
  reasons.push(`Buyer quality ${Math.round(c.quality * 100)}/100 with ${Math.round(c.buyer.evidence * 100)}% evidence cover`);
  if ((b.purchasing_power.score ?? 0) >= 0.75) reasons.push("Strong purchasing power (GDP per capita PPP)");
  if ((b.affluent_audience.score ?? 0) >= 0.7) reasons.push("Large modelled affluent audience");
  if (c.cpl.source === "client-regional-proxy") reasons.push("CPL from your regional benchmark (a proxy, not a measured country CPL)");
  else if (c.cpl.source === "user-assumption") reasons.push("CPL from your own planning assumption");
  else flags.push(c.cpl.relation === "at_most" ? "Modelled CPL under the AED 30 planning ceiling" : "Modelled CPL range (low confidence)");
  if (c.buyer.language.diasporaOnly) flags.push("Reached through diaspora proxy, not the local language");
  else if (c.buyer.language.via.length > 0) reasons.push(`Language fit via ${c.buyer.language.via.join(", ")}`);
  if ((b.language.score ?? 1) < 0.3) flags.push("Limited agent-language coverage of the general population");
  if (b.motivations.score === null) flags.push("No country-specific buyer-motivation evidence");
  if (country.cm) flags.push("Capital-movement or sanctions flag (unverified)");
  if (c.cpl.source === "modelled-estimate") flags.push("Mature CPL only; no learning-phase CPL supplied");
  return { reasons, flags };
}

export function recommend(input: RecommendInput, data: IntelData): Recommendation {
  const cfg = data.config;
  const closeRate = input.closeRate ?? cfg.close_rate.default;
  const languagesDefaulted = Object.keys(input.languages ?? {}).filter((k) => k !== "other").length === 0;
  const languages = effectiveLanguages(input.languages ?? {}, cfg);
  const { candidates, excluded } = buildCandidates(languages, data, {
    exclude: input.exclude,
    cplOverrides: input.cplOverrides,
    allowedCplSources: input.allowedCplSources,
  });
  const excludedCounts: Partial<Record<ExcludedReason, number>> = {};
  for (const e of excluded) excludedCounts[e.reason] = (excludedCounts[e.reason] ?? 0) + 1;
  const notes: string[] = [
    "Model output, not a guaranteed result. Scores rank markets for testing and are not probabilities of sale.",
    "Sales are illustrative: leads x one editable global close rate. No country-specific close or qualification rate exists yet.",
  ];
  const empty: Range = { lo: null, hi: null };
  if (candidates.length === 0) {
    return {
      modelVersion: cfg.model_version, isProbabilityOfSale: false, mode: input.mode, languages, languagesDefaulted,
      budget: input.mode === "budget" ? input.amount : 0, budgetRange: empty, leadTarget: input.mode === "leads" ? input.amount : null,
      markets: [], totals: { leads: empty, eventualSales: empty, blendedCpl: empty, qualityWeightedLeads: 0, objective: 0 }, closeRate, closeRateNote: "",
      equalAlternative: { note: "", shares: {}, leads: empty, eventualSales: empty, qualityWeightedLeads: 0, objective: 0 }, excluded, excludedCounts,
      notes: [...notes, "No market passes the eligibility rules for these inputs."],
    };
  }

  const userPins = input.include ?? [];
  let pinned = userPins;
  const cplMap = (p: Candidate[]) => Object.fromEntries(p.map((c) => [c.iso2, c.cpl]));
  const solve = (b: number) => {
    // User pins first, then the markets the chosen agent languages call for.
    pinned = [...new Set([...userPins, ...anchorMarkets(candidates, languages, !languagesDefaulted, b, data)])];
    const pf = optimizePortfolio(candidates, b, cfg, pinned);
    return { picked: pf.picked, shares: Object.fromEntries(pf.picked.map((c) => [c.iso2, pf.spend[c.iso2] / b])), belowMinimum: pf.belowMinimum };
  };
  let budget = input.mode === "budget" ? input.amount : 0;
  let picked: Candidate[] = [];
  let shares: Record<string, number> = {};
  let belowMinimum = false;

  if (input.mode === "budget") {
    ({ picked, shares, belowMinimum } = solve(budget));
  } else {
    // Lead target: settle the market set first, then solve the budget whose conservative (upper-CPL) forecast hits the target.
    budget = input.amount * 60;
    let key = "";
    for (let i = 0; i < 8; i++) {
      ({ picked, shares, belowMinimum } = solve(budget));
      const lpa = leadsPerAed(shares, cplMap(picked));
      budget = lpa.lo > 0 ? input.amount / lpa.lo : budget;
      const next = picked.map((c) => c.iso2).join();
      if (next === key) break;
      key = next;
    }
    for (let i = 0; i < 6; i++) {
      ({ picked, shares, belowMinimum } = solve(budget));
      const lpa = leadsPerAed(shares, cplMap(picked));
      budget = lpa.lo > 0 ? input.amount / lpa.lo : budget;
    }
    ({ picked, shares, belowMinimum } = solve(budget));
  }

  const cpls = cplMap(picked);
  const total = forecast(shares, cpls, budget, closeRate);
  if (belowMinimum) {
    notes.push("This budget is below the suggested testing minimum for any single market, so only the top market is shown.");
  }

  const raw = picked.map((c) => {
    const share = shares[c.iso2];
    const spend = budget * share;
    const leads: Range = { lo: spend / c.cpl.hi, hi: c.cpl.lo === null ? null : spend / c.cpl.lo };
    return { c, share, spend, leads };
  });
  // Sales contribution comes from the conservative lead forecast, not from scores.
  const salesBase = raw.reduce((s, r) => s + (r.leads.lo ?? 0) * closeRate, 0);

  const markets: RecommendedMarket[] = raw.map(({ c, share, spend, leads }) => {
    const { reasons, flags } = reasonsFor(c, data);
    if (pinned.includes(c.iso2) && !userPins.includes(c.iso2)) reasons.unshift("Main market for the agent language(s) you selected");
    const sales: Range = { lo: leads.lo === null ? null : leads.lo * closeRate, hi: leads.hi === null ? null : leads.hi * closeRate };
    return {
      iso2: c.iso2, name: data.countries[c.iso2].n, region: data.countries[c.iso2].rg, share, spend, cpl: c.cpl, leads,
      qualifiedLeads: { status: "unavailable_no_validated_rate", value: null },
      eventualSales: sales,
      quality: c.quality,
      qualityWeightedLeads: (spend / cplForValue(c.cpl)) * c.quality,
      salesContribution: salesBase > 0 ? ((leads.lo ?? 0) * closeRate) / salesBase : null,
      buyer: c.buyer, efficiency: c.efficiency, rank: c.rank, reasons, flags,
      evidenceLevel: data.countries[c.iso2].dx !== null && c.cpl.source === "client-regional-proxy" ? "evidence_backed" : "exploratory",
      pinned: userPins.includes(c.iso2),
      languageAnchor: pinned.includes(c.iso2) && !userPins.includes(c.iso2),
    };
  });
  markets.sort((a, b) => b.share - a.share);

  const eq = equalShares(picked.map((c) => c.iso2));
  const eqF = forecast(eq, cpls, budget, closeRate);
  const lpa = total.lpa;
  return {
    modelVersion: cfg.model_version,
    isProbabilityOfSale: false,
    mode: input.mode,
    languages,
    languagesDefaulted,
    budget,
    budgetRange: {
      lo: input.mode === "leads" && lpa.hi !== null && lpa.hi > 0 ? input.amount / lpa.hi : input.mode === "budget" ? budget : null,
      hi: budget,
    },
    leadTarget: input.mode === "leads" ? input.amount : null,
    markets,
    totals: {
      leads: total.leads,
      eventualSales: total.sales,
      blendedCpl: { lo: lpa.hi === null ? null : 1 / lpa.hi, hi: lpa.lo > 0 ? 1 / lpa.lo : null },
      qualityWeightedLeads: markets.reduce((s, m) => s + m.qualityWeightedLeads, 0),
      objective: portfolioValue(picked.map((c) => ({ c, spend: budget * shares[c.iso2] })), cfg),
    },
    closeRate,
    closeRateNote: "Global provisional raw-lead-to-sale rate, applied equally to every market. Country sales are illustrative.",
    equalAlternative: {
      note: "Equal split of the same markets: a neutral alternative, not an optimised recommendation.",
      shares: eq,
      leads: eqF.leads,
      eventualSales: eqF.sales,
      qualityWeightedLeads: picked.reduce((s, c) => s + (budget * eq[c.iso2] / cplForValue(c.cpl)) * c.quality, 0),
      objective: portfolioValue(picked.map((c) => ({ c, spend: budget * eq[c.iso2] })), cfg),
    },
    excluded,
    excludedCounts,
    notes,
  };
}
