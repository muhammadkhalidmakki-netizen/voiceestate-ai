import { COUNTRY_BY_ISO, LANGUAGE_SEEDS } from "@/lib/market-planning/catalog";
import { discoverMarkets, marketCoverage } from "@/lib/market-planning/coverage";
import { roundedPercents, sumRange } from "@/lib/market-planning/model";
import type { MarketRow, PlannerView, RegionRow } from "./planner-context";
import { marketCloseRate } from "@/lib/market-planning/intel/dashboard";
import { isCustomized, planFor, uiLanguages, type PlannerState } from "./planner-state";

/** The plan's close rate: each market's own rate, weighted by the leads it brings. */
export function blendedCloseRate(rows: MarketRow[], base: number, languages: PlannerState["languages"]): number {
  let leadSum = 0;
  let salesSum = 0;
  for (const r of rows) {
    if (r.leads.lo === null) continue;
    leadSum += r.leads.lo;
    salesSum += r.leads.lo * marketCloseRate(r.iso2, base, languages);
  }
  return leadSum > 0 ? salesSum / leadSum : base;
}

/** Everything derived from the planner state. Nothing here is stored; it is recomputed on every change. */
export function buildDerived(state: PlannerState): Pick<
  PlannerView,
  "plan" | "rows" | "pct" | "effectiveCloseRate" | "regions" | "budgetPresets" | "leadPresets" | "discovery" | "customized" | "channel"
> {
  const { result, budgetPresets, leadPresets } = planFor(state);

  const rows: MarketRow[] = result.markets.map((m) => ({
    ...m,
    country: COUNTRY_BY_ISO.get(m.iso2)!,
    coverage: marketCoverage(m.iso2, uiLanguages(state.languages), LANGUAGE_SEEDS),
  }));

  const byRegion = new Map<string, MarketRow[]>();
  for (const r of rows) {
    const list = byRegion.get(r.country.region) ?? [];
    list.push(r);
    byRegion.set(r.country.region, list);
  }
  const regions: RegionRow[] = [...byRegion.entries()]
    .map(([region, markets]) => ({
      region,
      markets,
      share: markets.reduce((acc, m) => acc + m.share, 0),
      spend: sumRange(markets.map((m) => m.spend)),
      // Leads from markets that have a CPL; markets without one are left out, never zeroed.
      leads: markets.some((m) => m.cpl)
        ? sumRange(markets.filter((m) => m.cpl).map((m) => m.leads))
        : { lo: null, hi: null },
      partial: markets.some((m) => !m.cpl) && markets.some((m) => m.cpl),
    }))
    .sort((a, b) => b.share - a.share);

  // Blended close rate: each market's own rate, weighted by the leads it brings.
  const effectiveCloseRate = blendedCloseRate(rows, state.closeRate, state.languages);

  const meta = Math.min(1, Math.max(0, state.metaShare));
  const part = (v: number | null, k: number) => (v === null ? null : v * k);

  return {
    plan: result,
    rows,
    effectiveCloseRate,
    pct: roundedPercents(state.shares),
    regions,
    budgetPresets,
    leadPresets,
    discovery: discoverMarkets(uiLanguages(state.languages), LANGUAGE_SEEDS),
    customized: isCustomized(state),
    channel: {
      meta: { lo: part(result.budget.lo, meta), hi: part(result.budget.hi, meta) },
      google: { lo: part(result.budget.lo, 1 - meta), hi: part(result.budget.hi, 1 - meta) },
      metaShare: meta,
      googleShare: 1 - meta,
    },
  };
}
