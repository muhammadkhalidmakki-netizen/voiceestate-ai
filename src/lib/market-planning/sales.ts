// Sales-timing helpers for the "When could your first sale happen?" section.
// Pure functions, no imports of data: everything is passed in.
//
// IMPORTANT status of the inputs (see 04_FORECAST_MODEL_AND_CALCULATION_RULES.md):
// - The close rate is an ILLUSTRATIVE, editable planning assumption (1.5% raw-lead-to-sale
//   from the original client discussion). It is not a confirmed client benchmark.
// - The 19-case timing checkpoints are historical observations whose denominator and
//   interpretation are unconfirmed. Turning them into a monthly distribution is a
//   PROVISIONAL assumption that the user switches on or off explicitly.

import type { Range } from "./types";

export const DEFAULT_CLOSE_RATE = 0.015;
export const MAX_CLOSE_RATE = 0.5;

export type Checkpoint = { day: number; share_percent: number };
export type Tail = { from_month: number; to_month: number; share_percent: number };

export function validateCloseRate(rate: number | null): { ok: true } | { ok: false; message: string } {
  if (rate === null || !Number.isFinite(rate)) return { ok: false, message: "Enter a close rate." };
  if (rate <= 0) return { ok: false, message: "Enter a rate above 0%." };
  if (rate > MAX_CLOSE_RATE) return { ok: false, message: `Enter ${MAX_CLOSE_RATE * 100}% or less.` };
  return { ok: true };
}

/** Eventual sales from a lead volume. Unknown stays unknown, never zero. */
export function eventualSales(leads: Range, closeRate: number): Range {
  if (!(closeRate > 0)) return { lo: null, hi: null };
  return {
    lo: leads.lo === null ? null : leads.lo * closeRate,
    hi: leads.hi === null ? null : leads.hi * closeRate,
  };
}

/**
 * Share of a cohort's eventual sales expected in each month after the leads arrive
 * (index 0 = the first 30 days). Built by interpolating linearly between the historical
 * checkpoints, then spreading the long tail evenly to its last month.
 * This is a provisional shape, not a measured distribution.
 */
export function monthlyTimingShares(checkpoints: Checkpoint[], tail: Tail, months = 26): number[] {
  const pts: Array<[number, number]> = [[0, 0]];
  for (const c of checkpoints) pts.push([c.day, c.share_percent / 100]);
  pts.push([tail.to_month * 30, 1]);
  const cumulative = (day: number) => {
    if (day <= 0) return 0;
    for (let i = 1; i < pts.length; i++) {
      if (day <= pts[i][0]) {
        const [d0, v0] = pts[i - 1];
        const [d1, v1] = pts[i];
        return v0 + ((v1 - v0) * (day - d0)) / (d1 - d0);
      }
    }
    return 1;
  };
  return Array.from({ length: months }, (_, m) => cumulative((m + 1) * 30) - cumulative(m * 30));
}

export type CohortMonth = {
  month: number;
  /** Leads generated this month. */
  newLeads: number;
  /** Earlier leads still inside the historical closing window (not yet fully matured). */
  maturingLeads: number;
  /** Expected sales closing this month, split by how old the leads are. */
  fromThisMonth: number;
  fromLastTwoMonths: number;
  fromThreeToFive: number;
  fromSixPlus: number;
  total: number;
  cumulative: number;
};

/**
 * Steady monthly lead volume, one cohort per month. Expected closes in month m come from
 * every earlier cohort c at age m - c, using the provisional monthly timing shares.
 */
export function cohortProjection(input: {
  monthlyLeads: number;
  closeRate: number;
  shares: number[];
  horizon?: number;
  /** Months after which a cohort is treated as fully matured for the "still maturing" count. */
  maturityMonths?: number;
}): CohortMonth[] {
  const { monthlyLeads, closeRate, shares } = input;
  const horizon = input.horizon ?? 12;
  const maturity = input.maturityMonths ?? 9;
  const eventual = monthlyLeads * closeRate;
  let cumulative = 0;
  return Array.from({ length: horizon }, (_, i) => {
    const month = i + 1;
    let a = 0;
    let b = 0;
    let c = 0;
    let d = 0;
    for (let cohort = 1; cohort <= month; cohort++) {
      const age = month - cohort;
      const closes = eventual * (shares[age] ?? 0);
      if (age === 0) a += closes;
      else if (age <= 2) b += closes;
      else if (age <= 5) c += closes;
      else d += closes;
    }
    const total = a + b + c + d;
    cumulative += total;
    return {
      month,
      newLeads: monthlyLeads,
      maturingLeads: monthlyLeads * Math.min(month - 1, maturity),
      fromThisMonth: a,
      fromLastTwoMonths: b,
      fromThreeToFive: c,
      fromSixPlus: d,
      total,
      cumulative,
    };
  });
}

// ---------------------------------------------------------------------------
// "When is my 1st, 2nd, 3rd sale?" helpers (all illustrative, see the header note).
// ---------------------------------------------------------------------------

export type SaleStep = {
  /** Which sale this is: 1st, 2nd, 3rd... */
  k: number;
  /** Expected day (counted from the start of lead generation) when the running total of
   *  expected sales reaches k. Null when it is not reached within the horizon. */
  days: number | null;
};

/**
 * Steady monthly lead volume. Finds the day at which the cumulative expected sales first
 * reach 1, 2, 3... by interpolating inside the month where each threshold is crossed.
 */
export function firstSales(input: {
  monthlyLeads: number;
  closeRate: number;
  shares: number[];
  steps?: number;
  horizonMonths?: number;
}): SaleStep[] {
  const steps = input.steps ?? 4;
  const months = cohortProjection({
    monthlyLeads: input.monthlyLeads,
    closeRate: input.closeRate,
    shares: input.shares,
    horizon: input.horizonMonths ?? 36,
  });
  const out: SaleStep[] = [];
  for (let k = 1; k <= steps; k++) {
    const idx = months.findIndex((m) => m.cumulative >= k);
    if (idx === -1) {
      out.push({ k, days: null });
      continue;
    }
    const prev = idx === 0 ? 0 : months[idx - 1].cumulative;
    const span = months[idx].cumulative - prev;
    const frac = span > 0 ? (k - prev) / span : 1;
    out.push({ k, days: Math.round((idx + frac) * 30) });
  }
  return out;
}

export type SalesMilestone = {
  label: string;
  /** Historical share of cases closed by this checkpoint, 0..1. */
  share: number;
  /** Expected sales from ONE month of leads by this checkpoint. */
  sales: number;
  tail?: boolean;
};

/** Expected cumulative sales from one month of leads at each historical checkpoint. */
export function milestoneSales(eventual: number, checkpoints: Checkpoint[], tail: Tail): SalesMilestone[] {
  return [
    ...checkpoints.map((c) => ({ label: `${c.day} days`, share: c.share_percent / 100, sales: (eventual * c.share_percent) / 100 })),
    { label: `${tail.from_month}–${tail.to_month} months`, share: 1, sales: eventual, tail: true },
  ];
}

/**
 * Timing for ONE month of leads (a "batch"): the day each of the 1st, 2nd, 3rd... sale lands.
 *
 * The 1st sale is always dated at the typical (median) time a lead takes to become a sale, whatever the budget:
 * a lead does not convert faster because more leads were bought. The later sales are spread evenly between
 * that day and the last checkpoint (about 9 months), so a bigger budget packs more sales into the same window
 * instead of pulling every date earlier. The slow tail beyond the last checkpoint is never dated.
 *
 * A sale the batch is not expected to produce (k more than 0.3 above `eventual`) is null: it needs more leads.
 * The even spread between the median and the last checkpoint is a simple planning assumption, not a measured shape.
 */
export function batchSaleDays(eventual: number, checkpoints: Checkpoint[], _tail: Tail, steps = 4, medianDays = 78): SaleStep[] {
  const last = checkpoints.length ? checkpoints[checkpoints.length - 1].day : 270;
  const out: SaleStep[] = [];
  for (let k = 1; k <= steps; k++) {
    if (!(eventual > 0) || k > eventual + 0.3) {
      out.push({ k, days: null });
      continue;
    }
    const spread = (last - medianDays) / (Math.max(eventual, 2) - 1);
    out.push({ k, days: Math.round(Math.min(last, medianDays + (k - 1) * spread)) });
  }
  return out;
}
