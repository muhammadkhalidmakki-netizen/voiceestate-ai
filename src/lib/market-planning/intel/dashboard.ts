// Bridge between the dashboard's planner state and the recommendation engine. Backend logic only.
//
// DASHBOARD_USES_MODELLED_CPL is ON: countries without a client benchmark use a modelled CPL range
// (raised by the safety margin in market-scoring-config.json, labelled "Modelled estimate", low confidence).
// Client benchmarks and CPLs the user types in always win. Set it to false to go back to client
// benchmarks only; the dashboard then recommends only markets whose CPL the client supplied.

import { INTEL, modelledCpl, recommendMarkets } from "./data";
import type { ResolvedCpl } from "../types";
import { buildCandidates, buyerScore, effectiveLanguages, languageCplFactor, languageFit, qualityIndex } from "./recommend";
import { opportunityOf } from "./opportunity";
import type { CplSource, Proficiency, Recommendation, RecommendInput } from "./recommend";

export const DASHBOARD_USES_MODELLED_CPL = true;

const SOURCES: CplSource[] = DASHBOARD_USES_MODELLED_CPL
  ? ["client-regional-proxy", "modelled-estimate", "user-assumption"]
  : ["client-regional-proxy", "user-assumption"];

const cache = new Map<string, Recommendation>();

/** Recommended markets for the current planner inputs. Memoised: the inputs fully determine the result. */
export function recommendForDashboard(input: Omit<RecommendInput, "allowedCplSources">): Recommendation {
  const key = JSON.stringify(input);
  const hit = cache.get(key);
  if (hit) return hit;
  const rec = recommendMarkets({ ...input, allowedCplSources: SOURCES });
  if (cache.size > 40) cache.delete(cache.keys().next().value as string);
  cache.set(key, rec);
  return rec;
}

/**
 * The strongest of the given markets by the recommendation's own ranking (buyer quality and lead value for the
 * selected languages). Null when none of them is eligible, so the caller can fall back to its own order.
 */
export function bestOfMarkets(isos: string[], languages: Record<string, Proficiency>): string | null {
  const { candidates } = buildCandidates(effectiveLanguages(languages, INTEL.config), INTEL);
  const wanted = new Set(isos);
  return candidates.find((c) => wanted.has(c.iso2))?.iso2 ?? null;
}

/**
 * Buyer quality 0..1 of one market for the selected languages (buyer potential with missing evidence discounted),
 * or null when the market is not in the intelligence data. Used to rank markets by likely sales, not just by cheap leads.
 */
export function marketQuality(iso2: string, languages: Record<string, Proficiency>): number | null {
  // Cost per lead is left out: the lead count already reflects it, and counting it twice would favour cheap markets.
  const opp = opportunityOf(iso2, undefined, ["acquisition_economics"]);
  if (opp) return opp.total / 100;
  if (!INTEL.countries[iso2]) return null;
  return qualityIndex(buyerScore(iso2, effectiveLanguages(languages, INTEL.config), INTEL), INTEL.config);
}

/**
 * Strongest overall opportunity markets for the selected languages: buyer quality (Dubai demand, financial
 * capacity, motivations, investment readiness, reachable audience, language fit). Cost per lead is left out so cheap
 * but weak markets do not crowd the list.
 * Score is 0..100 relative to the best market. Dubai interest (DXB) is one input, so strong markets that the
 * search-interest ranking misses can appear.
 */
export function topOpportunities(n = 15): Array<{ iso2: string; score: number; dubaiInterest: number | null }> {
  const list = Object.keys(INTEL.countries)
    .filter((iso2) => iso2 !== "AE" && !INTEL.countries[iso2].ad)
    .map((iso2) => ({ iso2, total: opportunityOf(iso2)?.total ?? 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
  return list.map((o) => ({ iso2: o.iso2, score: Math.round(o.total), dubaiInterest: INTEL.countries[o.iso2]?.dx ?? null }));
}

/** Modelled CPL for the forecast, or null when the switch is off or the country has none. */
export function dashboardModelledCpl(iso2: string): ResolvedCpl | null {
  return DASHBOARD_USES_MODELLED_CPL ? modelledCpl(iso2) : null;
}

export { INTEL };

/** How strongly buyer quality counts against lead volume (same setting the recommendation uses). */
export const qualityEmphasis = (): number => INTEL.config.selection.quality_emphasis;

// ---------------------------------------------------------------- close rate by market
//
// The close rate is not one number for every country. The base rate (default 1.5%, editable) is the rate of the markets
// the app recommends for a typical AED 10,000 English plan. Each market is scaled by how its buyer score compares with
// that reference: rate = base x (quality / reference), kept between 0.133x and 1.667x of the base (0.2% to 2.5% at 1.5%).
// It is a model built from our buyer scores, not a measured conversion rate.

let referenceQuality: number | null = null;
function reference(): number {
  if (referenceQuality === null) {
    const langs = { en: "professional" as const };
    const r = recommendMarkets({ mode: "budget", amount: 10000, languages: langs, allowedCplSources: SOURCES });
    const q = r.markets.reduce((s, m) => s + m.share * (marketQuality(m.iso2, langs) ?? 0), 0);
    referenceQuality = q > 0 ? q : 0.65;
  }
  return referenceQuality;
}

export const CLOSE_MULT_MIN = 0.2 / 1.5;
export const CLOSE_MULT_MAX = 2.5 / 1.5;
/** A market whose close rate comes out below this share of the base is flagged as weak for sales. */
export const WEAK_MULT = 0.4;
/** Used when a market has no buyer data at all: a cautious half of the base. */
const UNKNOWN_MULT = 0.5;

/** How this market's close rate compares with the base (1 = the base rate). */
export function closeRateMultiplier(iso2: string, languages: Record<string, Proficiency>): number {
  const q = marketQuality(iso2, languages);
  if (q === null) return UNKNOWN_MULT;
  return Math.max(CLOSE_MULT_MIN, Math.min(CLOSE_MULT_MAX, q / reference()));
}

export function marketCloseRate(iso2: string, base: number, languages: Record<string, Proficiency>): number {
  return base * closeRateMultiplier(iso2, languages);
}

/** True when the market's buyer score is low enough that it closes far below the base rate. */
export function isWeakForSales(iso2: string, languages: Record<string, Proficiency>): boolean {
  return closeRateMultiplier(iso2, languages) < WEAK_MULT;
}

/** How much a country's CPL is scaled for the selected agent languages (1 = unchanged). */
export function languageCplFactorFor(iso2: string, languages: Record<string, Proficiency>): number {
  return languageCplFactor(iso2, effectiveLanguages(languages, INTEL.config), INTEL);
}

// ---------------------------------------------------------------- language reach (for the market picker)

export type ReachLevel = "strong" | "partial" | "limited" | "low" | "nodata";
export type LanguageReach = {
  level: ReachLevel;
  /** 0..1 how well the selected languages reach this country (the same figure the recommendation uses). */
  score: number;
  /** People the selected languages can reach here (speakers plus a discounted diaspora pool), or null when unknown. */
  speakers: number | null;
  /** Cost-per-lead factor for the selected languages (1 = the English benchmark). */
  cplFactor: number;
  /** The selected languages that have data in this country. */
  via: string[];
};

/** How well the selected agent languages reach one country. "nodata" means we hold no language figures for it, which is not the same as zero. */
export function languageReach(iso2: string, languages: Record<string, Proficiency>): LanguageReach {
  const langs = effectiveLanguages(languages, INTEL.config);
  const f = languageFit(iso2, langs, INTEL);
  const score = f.serviceability ?? 0;
  const level: ReachLevel = !f.dataAvailable ? "nodata" : score >= 0.6 ? "strong" : score >= 0.3 ? "partial" : score >= INTEL.config.language.min_serviceability_to_recommend ? "limited" : "low";
  return { level, score, speakers: f.dataAvailable ? Math.round(f.pool ?? 0) : null, cplFactor: languageCplFactor(iso2, langs, INTEL), via: f.via };
}
