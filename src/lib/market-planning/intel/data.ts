// Binds the generated datasets (scripts/market-intel/build_datasets.py) to the engine.
// Backend module: no UI imports. Safe to use from server code or from planner logic.

import countries from "../data/intel/countries.json";
import languageShare from "../data/intel/language-share.json";
import diaspora from "../data/intel/diaspora.json";
import config from "../data/intel/scoring-config.json";
import { opportunityOf } from "./opportunity";
import { recommend, resolveCpl } from "./recommend";
import type { IntelData, Recommendation, RecommendInput } from "./recommend";
import type { ResolvedCpl } from "../types";

export const INTEL = {
  countries,
  languageShare,
  diaspora,
  config,
  opportunityScore: (iso2: string) => opportunityOf(iso2, undefined, ["acquisition_economics"])?.total ?? null,
} as unknown as IntelData;

/** Dynamic, input-driven market recommendation (budget or lead target, languages). */
export function recommendMarkets(input: RecommendInput): Recommendation {
  return recommend(input, INTEL);
}

/**
 * A CPL you typed into cpl-overrides.csv, or null. It wins over client benchmarks and estimates and is used
 * exactly as entered (no safety margin).
 */
export function overrideCpl(iso2: string): ResolvedCpl | null {
  const c = INTEL.countries[iso2];
  if (!c?.ov || c.ch === null || c.cr === null) return null;
  return { lo: c.cr === "at_most" ? null : (c.cl ?? c.ch), hi: c.ch, relation: c.cr, source: "client-regional-proxy", regionLabel: "Your override" };
}

/**
 * Modelled (not client-supplied) CPL for a country, or null when the client already supplied a
 * regional benchmark or when research is still required. Clients' own benchmarks always win.
 */
export function modelledCpl(iso2: string): ResolvedCpl | null {
  const c = INTEL.countries[iso2];
  if (!c) return null;
  const cpl = resolveCpl(c, null, INTEL.config.modelled_cpl_safety_margin.value);
  if (!cpl || cpl.source !== "modelled-estimate") return null;
  return { lo: cpl.lo, hi: cpl.hi, relation: cpl.relation, source: "modelled-estimate", regionLabel: "Estimate" };
}
