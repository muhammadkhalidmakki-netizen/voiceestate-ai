// Country opportunity score: six dimensions (0-100) x your weights, from docs/dubai-analysis/data/country-opportunity-scores.csv.
// Backend module: no UI imports.
import raw from "../data/intel/opportunity.json";

export type OpportunityData = { dims: string[]; weights: number[]; scores: Record<string, { s: Array<number | null>; b: number }> };
export const OPPORTUNITY = raw as unknown as OpportunityData;

export const DIMENSION_LABELS: Record<string, { label: string; question: string }> = {
  dubai_demand: { label: "Dubai buyer demand", question: "Evidence this country's people want Dubai property" },
  financial_capacity: { label: "Financial capacity", question: "Can it produce buyers who afford Dubai property" },
  investment_motivations: { label: "Investment motivations", question: "Reasons to buy: yield, growth, residency, second home" },
  cross_border_readiness: { label: "Cross-border readiness", question: "Can residents move capital and invest abroad" },
  addressable_audience: { label: "Addressable audience", question: "How large an audience we can realistically reach" },
  acquisition_economics: { label: "Acquisition economics", question: "Can we reach them at a reasonable cost per lead" },
};

/** A dimension with no data counts at this cautious value in the total, and lowers the evidence discount. */
const PRIOR = 40;

export type OpportunityPart = { key: string; label: string; weight: number; score: number | null };
export type OpportunityResult = { total: number; evidence: number; boost: number; parts: OpportunityPart[]; /** 0.6..1: multiplier for weak capital access (controls, sanctions, currency crisis). 1 = none. */ accessFactor: number };

/** Cross-border readiness at or above this has no penalty; below it the total shrinks, to 0.6x at readiness 0. */
const ACCESS_FULL = 60;
/** A Dubai-demand score at or above this counts as proven demand and fully cancels the capital-access penalty. */
const PROVEN_DEMAND = 60;

/**
 * `without` drops dimensions and renormalises the rest. The allocation engine drops acquisition economics because
 * it already divides by cost per lead, and counting cost twice would over-favour cheap markets.
 */
export function opportunityOf(iso2: string, data: OpportunityData = OPPORTUNITY, without: string[] = []): OpportunityResult | null {
  const row = data.scores[iso2];
  if (!row) return null;
  const kept = data.dims.map((k) => !without.includes(k));
  const wTotal = data.weights.reduce((s, w, i) => s + (kept[i] ? w : 0), 0) || 1;
  let sum = 0;
  let known = 0;
  const parts: OpportunityPart[] = [];
  data.dims.forEach((key, i) => {
    if (!kept[i]) return;
    const score = key === "dubai_demand" && row.b > 0 ? Math.max(row.s[i] ?? 0, PROVEN_DEMAND) : row.s[i];
    const weight = data.weights[i] / wTotal;
    sum += weight * (score ?? PRIOR);
    if (score !== null) known += weight;
    parts.push({ key, label: DIMENSION_LABELS[key]?.label ?? key, weight, score });
  });
  const readiness = row.s[data.dims.indexOf("cross_border_readiness")];
  const rawAccess = readiness === null || readiness === undefined ? 1 : 0.6 + 0.4 * Math.min(1, readiness / ACCESS_FULL);
  // Proven demand cancels the capital-access penalty in proportion: if people from a country are really buying Dubai
  // property, capital is moving. At a Dubai-demand score of PROVEN_DEMAND or more the penalty is gone. A country with
  // only modelled demand (capped low) gets almost no relief, so unproven markets keep the full penalty.
  // Real client sales (a client_boost above 0) are proof of Dubai demand: at least PROVEN_DEMAND, whatever the data says.
  const rawDemand = row.s[data.dims.indexOf("dubai_demand")];
  const demand = row.b > 0 ? Math.max(rawDemand ?? 0, PROVEN_DEMAND) : rawDemand;
  const relief = demand === null || demand === undefined ? 0 : Math.min(1, demand / PROVEN_DEMAND);
  const accessFactor = rawAccess + (1 - rawAccess) * relief;
  const total = Math.max(0, Math.min(100, sum * (0.5 + 0.5 * known) * accessFactor + row.b));
  return { total, evidence: known, boost: row.b, parts, accessFactor };
}
