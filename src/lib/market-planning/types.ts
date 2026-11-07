// Shared types for the Market Planning feature. Null always means "unknown",
// never zero.

export type PlanMode = "budget" | "leads";

export type CplRelation = "point" | "range" | "at_most";

/** A CPL reference. `lo` is null when only an upper bound is known ("AED 30 or less"). */
export type ResolvedCpl = {
  lo: number | null;
  hi: number;
  relation: CplRelation;
  /** Where the number comes from. */
  source: "client-regional-proxy" | "planning-assumption" | "modelled-estimate";
  /** Client benchmark region label, for regional proxies. */
  regionLabel?: string;
  /** How much the CPL was scaled for the selected agent languages (1 = not scaled). */
  languageFactor?: number;
};

export type Country = {
  iso2: string;
  name: string;
  region: string;
  subregion: string | null;
  benchmarkRegion: string | null;
  cplLow: number | null;
  cplHigh: number | null;
  cplRelation: CplRelation | null;
  demandRank: number | null;
  demandSharePct: number | null;
  marketClass: "core_candidate" | "test_candidate" | "benchmark_market" | null;
  researchStatus: string;
};

export type Proficiency = "fluent" | "professional" | "conversational";

export type LanguageMarketSeed = {
  code: string;
  language: string;
  iso2: string;
  relationship: string;
  diaspora: boolean;
  confidence: string;
  note: string;
  shareSource: string | null;
};

/** A range where either end may be unknown (null). */
export type Range = { lo: number | null; hi: number | null };

export type MarketInput = {
  iso2: string;
  /** Share of the monthly media budget, 0..1. */
  share: number;
  cpl: ResolvedCpl | null;
};

export type MarketResult = {
  iso2: string;
  share: number;
  cpl: ResolvedCpl | null;
  /** Spend for this market (a range in lead-target mode). */
  spend: Range;
  /** Estimated leads; null bounds mean open-ended or unknown. */
  leads: Range;
  covered: boolean;
};

export type MaturityComparison = {
  /** Share of the total plan that has both learning and mature benchmarks. */
  sliceShare: number;
  sliceMarkets: string[];
  learningCpl: number;
  matureCpl: number;
  /** (learning - mature) / learning, 0..1. Arithmetic only, not a forecast. */
  reduction: number;
  /** Same budget, different CPL. */
  sliceBudget: number;
  leadsLearning: number;
  leadsMature: number;
  /** Same lead volume (the mature estimate), different investment. */
  investmentLearning: number;
  investmentMature: number;
};

export type PlanResult = {
  valid: boolean;
  /** Validation message when the amount is not usable. */
  message: string | null;
  mode: PlanMode;
  budget: Range;
  leads: Range;
  /** Blended CPL across markets that have a CPL (range). */
  blendedCpl: Range;
  /** Share of the budget that sits in markets with a usable CPL. */
  coveredShare: number;
  coveredCount: number;
  pendingCount: number;
  usesAssumption: boolean;
  /** True when a market with a share uses a modelled (not client or user) CPL. */
  usesModelled: boolean;
  markets: MarketResult[];
  maturity: MaturityComparison | null;
};
