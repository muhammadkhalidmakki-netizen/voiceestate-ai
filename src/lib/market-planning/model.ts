// Pure calculation layer for the Market Planning forecast.
// No React, no data imports: everything is passed in, so it is easy to test.
// Rules follow docs/dubai-analysis/04_FORECAST_MODEL_AND_CALCULATION_RULES.md.
//
// Model in one line: every selected market holds a share `s` of the monthly
// media budget B and has a CPL. Leads per AED = sum(s / CPL) over markets that
// have a CPL. Budget and lead target are two views of the same line:
//   leads = B x leadsPerAed        budget = T / leadsPerAed
// so the two planning modes always stay in sync.

import type {
  MarketInput,
  MarketResult,
  MaturityComparison,
  PlanMode,
  PlanResult,
  Range,
  ResolvedCpl,
} from "./types";

export const LIMITS = {
  budget: { min: 500, max: 5_000_000 },
  leads: { min: 1, max: 50_000 },
} as const;

/** Planning levels for lead presets (editable in the UI by choosing custom). */
export const LEAD_PRESET_LEVELS = { entry: 50, recommended: 100, expansion: 200 } as const;

export function validateAmount(
  mode: PlanMode,
  value: number | null,
): { ok: true } | { ok: false; message: string } {
  const label = mode === "budget" ? "budget" : "lead target";
  if (value === null || !Number.isFinite(value)) {
    return { ok: false, message: `Enter a monthly ${label}.` };
  }
  const { min, max } = LIMITS[mode];
  if (value < min) {
    return {
      ok: false,
      message:
        mode === "budget"
          ? `Enter at least AED ${min.toLocaleString("en-US")}.`
          : `Enter at least ${min} lead.`,
    };
  }
  if (value > max) {
    return {
      ok: false,
      message:
        mode === "budget"
          ? `Enter AED ${max.toLocaleString("en-US")} or less.`
          : `Enter ${max.toLocaleString("en-US")} leads or fewer.`,
    };
  }
  return { ok: true };
}

/** Shares must sum to 1 across the selected markets. */
export function normalizeShares(shares: Record<string, number>): Record<string, number> {
  const keys = Object.keys(shares);
  if (keys.length === 0) return {};
  const total = keys.reduce((sum, k) => sum + Math.max(0, shares[k]), 0);
  if (total <= 0) return Object.fromEntries(keys.map((k) => [k, 1 / keys.length]));
  return Object.fromEntries(keys.map((k) => [k, Math.max(0, shares[k]) / total]));
}

export function equalShares(keys: string[]): Record<string, number> {
  return Object.fromEntries(keys.map((k) => [k, 1 / keys.length]));
}

/** Add a market with an equal share and scale the others down proportionally. */
export function addMarketShare(shares: Record<string, number>, iso2: string): Record<string, number> {
  if (iso2 in shares) return shares;
  const n = Object.keys(shares).length;
  if (n === 0) return { [iso2]: 1 };
  const incoming = 1 / (n + 1);
  const scaled = Object.fromEntries(
    Object.entries(shares).map(([k, v]) => [k, v * (1 - incoming)]),
  );
  return normalizeShares({ ...scaled, [iso2]: incoming });
}

export function removeMarketShare(shares: Record<string, number>, iso2: string): Record<string, number> {
  if (!(iso2 in shares)) return shares;
  const rest = { ...shares };
  delete rest[iso2];
  return normalizeShares(rest);
}

/** Set one market's share; the others fill the remainder in proportion. */
export function setMarketShare(
  shares: Record<string, number>,
  iso2: string,
  value: number,
): Record<string, number> {
  const keys = Object.keys(shares);
  if (!(iso2 in shares)) return shares;
  if (keys.length === 1) return { [iso2]: 1 };
  const clamped = Math.min(1, Math.max(0, value));
  const others = keys.filter((k) => k !== iso2);
  const otherTotal = others.reduce((sum, k) => sum + shares[k], 0);
  const remainder = 1 - clamped;
  const next: Record<string, number> = { [iso2]: clamped };
  for (const k of others) {
    next[k] = otherTotal > 0 ? (shares[k] / otherTotal) * remainder : remainder / others.length;
  }
  return next;
}

/** Whole-number percentages that always add up to exactly 100 (largest remainder). */
export function roundedPercents(shares: Record<string, number>): Record<string, number> {
  const keys = Object.keys(shares);
  if (keys.length === 0) return {};
  const raw = keys.map((k) => shares[k] * 100);
  const floors = raw.map((x) => Math.floor(x + 1e-9));
  let remainder = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x + 1e-9) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] += 1;
    remainder -= 1;
  }
  return Object.fromEntries(keys.map((k, i) => [k, floors[i]]));
}

export function splitChannels(budget: number, metaShare: number) {
  const m = Math.min(1, Math.max(0, metaShare));
  return { meta: budget * m, google: budget * (1 - m), metaShare: m, googleShare: 1 - m };
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function sumRange(items: Range[]): Range {
  let lo: number | null = 0;
  let hi: number | null = 0;
  for (const r of items) {
    lo = lo === null || r.lo === null ? null : lo + r.lo;
    hi = hi === null || r.hi === null ? null : hi + r.hi;
  }
  return { lo, hi };
}

/** Leads per AED across covered markets, as a range. `hi` is null when open-ended. */
export function leadsPerAed(markets: MarketInput[]): { lo: number; hi: number | null; coveredShare: number } {
  let lo = 0;
  let hi: number | null = 0;
  let coveredShare = 0;
  for (const m of markets) {
    if (!m.cpl || m.share <= 0) continue;
    coveredShare += m.share;
    lo += m.share / m.cpl.hi;
    hi = hi === null || m.cpl.lo === null ? null : hi + m.share / m.cpl.lo;
  }
  return { lo, hi, coveredShare };
}

function maturityComparison(
  markets: MarketInput[],
  learning: Record<string, number | undefined>,
  budget: number,
): MaturityComparison | null {
  const slice = markets.filter(
    (m) => m.share > 0 && m.cpl && m.cpl.lo === m.cpl.hi && learning[m.iso2] !== undefined,
  );
  if (slice.length === 0) return null;
  const sliceShare = slice.reduce((s, m) => s + m.share, 0);
  const matureLpa = slice.reduce((s, m) => s + m.share / (m.cpl as ResolvedCpl).hi, 0);
  const learningLpa = slice.reduce((s, m) => s + m.share / (learning[m.iso2] as number), 0);
  const matureCpl = sliceShare / matureLpa;
  const learningCpl = sliceShare / learningLpa;
  const leadsMature = budget * matureLpa;
  const leadsLearning = budget * learningLpa;
  return {
    sliceShare,
    sliceMarkets: slice.map((m) => m.iso2),
    learningCpl,
    matureCpl,
    reduction: (learningCpl - matureCpl) / learningCpl,
    sliceBudget: budget * sliceShare,
    leadsLearning,
    leadsMature,
    investmentLearning: leadsMature * learningCpl,
    investmentMature: budget * sliceShare,
  };
}

const EMPTY: Range = { lo: null, hi: null };

export function computePlan(input: {
  mode: PlanMode;
  amount: number | null;
  markets: MarketInput[];
  /** Learning-phase CPL by country, only where supplied. */
  learning: Record<string, number | undefined>;
}): PlanResult {
  const { mode, amount, learning } = input;
  const markets = input.markets;
  const check = validateAmount(mode, amount);
  const lpa = leadsPerAed(markets);
  const coveredCount = markets.filter((m) => m.cpl && m.share > 0).length;
  const pendingCount = markets.length - coveredCount;
  const usesAssumption = markets.some((m) => m.cpl?.source === "planning-assumption");
  const usesModelled = markets.some((m) => m.cpl?.source === "modelled-estimate" && m.share > 0);

  const base = {
    mode,
    coveredShare: lpa.coveredShare,
    coveredCount,
    pendingCount,
    usesAssumption,
    usesModelled,
  };

  const invalid = (message: string | null): PlanResult => ({
    ...base,
    valid: false,
    message,
    budget: EMPTY,
    leads: EMPTY,
    blendedCpl: EMPTY,
    markets: markets.map((m) => ({
      iso2: m.iso2,
      share: m.share,
      cpl: m.cpl,
      spend: EMPTY,
      leads: EMPTY,
      covered: !!m.cpl,
    })),
    maturity: null,
  });

  if (!check.ok) return invalid(check.message);
  const value = amount as number;

  // Blended CPL over covered markets only (never treats unknown as zero).
  const blendedCpl: Range =
    lpa.coveredShare > 0
      ? { lo: lpa.hi === null ? null : lpa.coveredShare / lpa.hi, hi: lpa.coveredShare / lpa.lo }
      : EMPTY;

  let budget: Range;
  let leads: Range;
  if (mode === "budget") {
    budget = { lo: value, hi: value };
    leads =
      lpa.coveredShare > 0
        ? { lo: value * lpa.lo, hi: lpa.hi === null ? null : value * lpa.hi }
        : EMPTY;
  } else {
    leads = { lo: value, hi: value };
    budget =
      lpa.coveredShare > 0
        ? { lo: lpa.hi === null ? null : value / lpa.hi, hi: value / lpa.lo }
        : EMPTY;
  }

  const results: MarketResult[] = markets.map((m) => {
    const spend: Range =
      mode === "budget"
        ? { lo: value * m.share, hi: value * m.share }
        : { lo: budget.lo === null ? null : budget.lo * m.share, hi: budget.hi === null ? null : budget.hi * m.share };
    let mLeads: Range = EMPTY;
    if (m.cpl && m.share > 0) {
      if (mode === "budget") {
        mLeads = {
          lo: (value * m.share) / m.cpl.hi,
          hi: m.cpl.lo === null ? null : (value * m.share) / m.cpl.lo,
        };
      } else if (budget.hi !== null) {
        // Leads this market contributes when the plan is sized at the upper budget.
        mLeads = {
          lo: (budget.hi * m.share) / m.cpl.hi,
          hi: m.cpl.lo === null ? null : (budget.hi * m.share) / m.cpl.lo,
        };
      }
    }
    return { iso2: m.iso2, share: m.share, cpl: m.cpl, spend, leads: mLeads, covered: !!m.cpl };
  });

  const referenceBudget = budget.hi ?? 0;
  const maturity = referenceBudget > 0 ? maturityComparison(markets, learning, referenceBudget) : null;

  return {
    ...base,
    valid: true,
    message: null,
    budget,
    leads,
    blendedCpl,
    markets: results,
    maturity,
  };
}

export type BudgetPreset = {
  id: "entry" | "recommended" | "expansion";
  label: string;
  level: number;
  budget: number;
  leads: Range;
};

export type LeadPreset = {
  id: "entry" | "recommended" | "expansion";
  label: string;
  target: number;
  budget: Range;
};

const PRESET_LABELS = { entry: "Entry test", recommended: "Recommended", expansion: "Expansion" } as const;
const BUDGET_PRESET_LABELS = { entry: "Minimum", recommended: "Recommended", expansion: "Expansion" } as const;

/**
 * Fixed monthly budget levels (AED). They do not move when the market mix changes, so the tile the user
 * picked stays highlighted; only the lead estimate under each tile follows the markets.
 */
export const BUDGET_PRESET_LEVELS = { entry: 5_000, recommended: 10_000, expansion: 25_000 } as const;

/** Budget presets at fixed levels, with the leads each would buy in the current markets. Null when no CPL. */
export function budgetPresets(markets: MarketInput[]): BudgetPreset[] | null {
  const lpa = leadsPerAed(markets);
  if (lpa.coveredShare <= 0) return null;
  return (Object.keys(BUDGET_PRESET_LABELS) as Array<keyof typeof BUDGET_PRESET_LABELS>).map((id) => {
    const level = LEAD_PRESET_LEVELS[id];
    const budget = BUDGET_PRESET_LEVELS[id];
    return {
      id,
      label: BUDGET_PRESET_LABELS[id],
      level,
      budget,
      leads: { lo: budget * lpa.lo, hi: lpa.hi === null ? null : budget * lpa.hi },
    };
  });
}

export function leadPresets(markets: MarketInput[]): LeadPreset[] | null {
  const lpa = leadsPerAed(markets);
  if (lpa.coveredShare <= 0) return null;
  return (Object.keys(PRESET_LABELS) as Array<keyof typeof PRESET_LABELS>).map((id) => {
    const target = LEAD_PRESET_LEVELS[id];
    return {
      id,
      label: PRESET_LABELS[id],
      target,
      budget: { lo: lpa.hi === null ? null : target / lpa.hi, hi: target / lpa.lo },
    };
  });
}

/** Value to carry into the other planning mode so both stay in sync. */
export function syncedAmount(result: PlanResult, toMode: PlanMode): number | null {
  if (!result.valid) return null;
  if (toMode === "leads") return result.leads.lo === null ? null : Math.max(1, Math.round(result.leads.lo));
  return result.budget.hi === null ? null : Math.max(LIMITS.budget.min, roundTo(result.budget.hi, 100));
}

export { sumRange };
