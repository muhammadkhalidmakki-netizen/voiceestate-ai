// Dataset validation for the market-intelligence tables. Pure: tables are passed in as parsed rows.
// Used by tests and by `node scripts/market-intel/validate.mjs`.

import type { Row } from "./csv";

export type Tables = {
  registry: Row[];
  cpl: Row[];
  signals: Row[];
  distribution: Row[];
  diaspora: Row[];
  languages: Row[];
  sources: Row[];
  adCost: Row[];
  conditions?: Row[];
  /** country-language-profile.csv */
  profile?: Row[];
  /** Countries whose CPL was overridden by the user; exempt from the client-benchmark-unchanged check. */
  overrides?: string[];
  survey?: Row[];
  motivations?: Row[];
  /** Client benchmark facts (benchmark-facts.json -> regional_cpl_benchmarks). */
  clientBenchmarks: Array<{
    countries: string[];
    campaign_stage: string;
    cpl_relation: string;
    cpl_point_aed?: number;
    cpl_low_aed?: number;
    cpl_high_aed?: number;
  }>;
};

export type ValidationResult = { errors: string[]; warnings: string[] };

const ISO2 = /^[A-Z]{2}$/;
const ISO3 = /^[a-z]{3}$/;
const CPL_STATUS = new Set(["regional_proxy", "modelled", "manual_research_required", "user_override"]);
const n = (s: string | undefined): number | null => (s === undefined || s === "" ? null : Number(s));

function dupes<T>(rows: T[], key: (r: T) => string): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const r of rows) {
    const k = key(r);
    if (seen.has(k)) dup.add(k);
    seen.add(k);
  }
  return [...dup];
}

export function validateIntel(t: Tables): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (m: string) => errors.push(m);

  // ---- registry
  const reg = new Set(t.registry.map((r) => r.country_iso2));
  for (const r of t.registry) if (!ISO2.test(r.country_iso2)) err(`registry: invalid ISO2 "${r.country_iso2}"`);
  for (const d of dupes(t.registry, (r) => r.country_iso2)) err(`registry: duplicate ISO2 ${d}`);

  // ---- sources register
  const sourceIds = new Set(t.sources.map((s) => s.source_id));
  for (const d of dupes(t.sources, (r) => r.source_id)) err(`sources: duplicate id ${d}`);
  const refs = (label: string, rows: Row[], col: string) => {
    for (const r of rows) {
      for (const id of (r[col] ?? "").split(";").filter(Boolean)) {
        if (!sourceIds.has(id)) err(`${label}: unknown source id "${id}" (${r.country_iso2 ?? r.language_code ?? ""})`);
      }
    }
  };

  // ---- CPL estimates
  const cplByIso = new Map(t.cpl.map((r) => [r.country_iso2, r]));
  for (const d of dupes(t.cpl, (r) => r.country_iso2)) err(`cpl: duplicate country ${d}`);
  for (const iso of reg) if (!cplByIso.has(iso)) err(`cpl: missing row for registry country ${iso}`);
  for (const r of t.cpl) {
    const id = r.country_iso2;
    if (!ISO2.test(id) || !reg.has(id)) err(`cpl: ${id} is not in the registry`);
    if (r.currency !== "AED") err(`cpl: ${id} currency "${r.currency}" (expected AED)`);
    if (!CPL_STATUS.has(r.cpl_status)) err(`cpl: ${id} invalid status "${r.cpl_status}"`);
    const lo = n(r.cpl_low_aed);
    const base = n(r.cpl_base_aed);
    const hi = n(r.cpl_high_aed);
    if (r.cpl_status === "manual_research_required") {
      if (lo !== null || base !== null || hi !== null) err(`cpl: ${id} is marked for manual research but carries a CPL`);
      continue;
    }
    if (hi === null || !(hi > 0)) err(`cpl: ${id} needs a positive high CPL`);
    for (const [label, v] of [["low", lo], ["base", base], ["high", hi]] as const) {
      if (v !== null && !(v > 0 && Number.isFinite(v))) err(`cpl: ${id} invalid ${label} CPL`);
    }
    if (lo !== null && hi !== null && lo > hi) err(`cpl: ${id} low CPL above high CPL`);
    if (base !== null && lo !== null && base < lo - 1e-9) err(`cpl: ${id} base below low`);
    if (base !== null && hi !== null && base > hi + 1e-9) err(`cpl: ${id} base above high`);
    if (r.cpl_relation === "at_most" && lo !== null) err(`cpl: ${id} is an upper bound ("at most") but has a low CPL`);
    if (r.cpl_relation === "point" && lo !== null && hi !== null && lo !== hi) err(`cpl: ${id} point CPL has different low and high`);
    if (!["point", "range", "at_most"].includes(r.cpl_relation)) err(`cpl: ${id} invalid relation "${r.cpl_relation}"`);
    if (!r.confidence) err(`cpl: ${id} missing confidence`);
    if (!r.research_date) err(`cpl: ${id} missing research date`);
    if (!r.methodology) err(`cpl: ${id} missing methodology`);
    if (r.cpl_status === "modelled" && r.measurement_type === "client_supplied_blended_regional_benchmark") {
      err(`cpl: ${id} is modelled but labelled as a client benchmark`);
    }
  }
  refs("cpl", t.cpl, "source_ids");

  // Client-supplied benchmarks must be preserved exactly.
  for (const b of t.clientBenchmarks) {
    if (b.campaign_stage === "learning") {
      for (const iso of b.countries) {
        const row = cplByIso.get(iso);
        if (!row || Number(row.learning_cpl_aed) !== b.cpl_point_aed) err(`client benchmark: learning CPL for ${iso} not preserved`);
      }
      continue;
    }
    for (const iso of b.countries) {
      const row = cplByIso.get(iso);
      if (!row) {
        err(`client benchmark: ${iso} missing`);
        continue;
      }
      const hi = b.cpl_point_aed ?? b.cpl_high_aed;
      const lo = b.cpl_relation === "at_most" ? null : (b.cpl_point_aed ?? b.cpl_low_aed ?? null);
      if (t.overrides?.includes(iso)) continue; // you overrode this one on purpose
      if (row.cpl_status !== "regional_proxy") err(`client benchmark: ${iso} must stay a regional proxy`);
      if (n(row.cpl_high_aed) !== (hi ?? null) || n(row.cpl_low_aed) !== lo || row.cpl_relation !== b.cpl_relation) {
        err(`client benchmark: ${iso} values changed`);
      }
    }
  }

  // ---- signals
  for (const d of dupes(t.signals, (r) => r.country_iso2)) err(`signals: duplicate country ${d}`);
  for (const iso of reg) if (!t.signals.some((r) => r.country_iso2 === iso)) err(`signals: missing row for ${iso}`);
  for (const r of t.signals) {
    const id = r.country_iso2;
    const pop = n(r.population);
    if (pop !== null && !(pop > 0)) err(`signals: ${id} population must be positive or blank (blank means unknown)`);
    const net = n(r.internet_users_pct);
    if (net !== null && (net < 0 || net > 100)) err(`signals: ${id} internet % out of range`);
    for (const k of ["purchasing_power_index_0_100", "investment_potential_index_0_100"]) {
      const v = n(r[k]);
      if (v !== null && (v < 0 || v > 100)) err(`signals: ${id} ${k} out of range`);
    }
    if (r.dubai_transaction_buyer_origin_evidence !== "unavailable" && !r.dubai_search_interest_source_id && !r.dubai_survey_source_id) {
      err(`signals: ${id} claims buyer-origin evidence without a source`);
    }
    const share = n(r.dubai_search_interest_share_pct);
    if (share !== null && (share < 0 || share > 100)) err(`signals: ${id} search interest share out of range`);
  }
  refs("signals", t.signals, "indicators_source_id");
  refs("signals", t.signals, "dubai_search_interest_source_id");
  refs("signals", t.signals, "dubai_survey_source_id");

  // ---- languages
  const langCodes = new Set(t.languages.map((l) => l.language_code));
  for (const d of dupes(t.languages, (r) => r.language_code)) err(`languages: duplicate code ${d}`);
  for (const l of t.languages) if (!ISO3.test(l.iso639_3)) err(`languages: invalid ISO 639-3 "${l.iso639_3}" for ${l.language_code}`);
  if (t.languages.filter((l) => l.default_agent_language === "true").map((l) => l.language_code).join() !== "en") {
    err("languages: English must be the only default agent language");
  }
  for (const code of ["en", "ar", "fr", "de", "ru", "ur", "hi", "zh", "es", "it", "tr", "pt", "bn", "pa", "id", "ja", "ko", "nl", "fa"]) {
    if (!langCodes.has(code)) err(`languages: required language ${code} missing`);
  }

  // ---- language distribution
  for (const d of dupes(t.distribution, (r) => `${r.country_iso2}|${r.language_code}`)) err(`distribution: duplicate ${d}`);
  for (const r of t.distribution) {
    const id = `${r.country_iso2}/${r.language_code}`;
    if (!reg.has(r.country_iso2)) err(`distribution: ${id} country not in registry`);
    const pct = n(r.speaker_share_pct_total);
    if (pct === null || pct < 0 || pct > 100) err(`distribution: ${id} share out of range`);
    if (r.in_catalog === "true" && !langCodes.has(r.language_code.split("_")[0]) && !langCodes.has(r.language_code)) {
      err(`distribution: ${id} flagged in catalog but missing from language master`);
    }
    if ((r.first_language_pct !== "" || r.native_speakers !== "") && !r.source_id) {
      err(`distribution: ${id} first-language/native figures need a source`);
    }
    const sp = n(r.est_total_speakers);
    const den = n(r.denominator_population);
    if (sp !== null && den !== null && sp > den * 1.001) err(`distribution: ${id} speakers exceed population`);
  }
  refs("distribution", t.distribution, "source_id");

  // ---- diaspora
  for (const d of dupes(t.diaspora, (r) => `${r.language_code}|${r.residence_country_iso2}|${r.origin_country_iso2}|${r.relationship_type}`)) {
    err(`diaspora: duplicate ${d}`);
  }
  for (const r of t.diaspora) {
    const id = `${r.language_code} ${r.origin_country_iso2}->${r.residence_country_iso2}`;
    if (!reg.has(r.residence_country_iso2)) err(`diaspora: ${id} residence not in registry`);
    if (r.origin_country_iso2 !== "" && !reg.has(r.origin_country_iso2)) err(`diaspora: ${id} origin not in registry`);
    if (!langCodes.has(r.language_code)) err(`diaspora: ${id} unknown language`);
    if (r.confirmed_speaking_population !== "") err(`diaspora: ${id} claims a confirmed speaking population`);
    const compat = n(r.estimated_language_compatible_population);
    const stock = n(r.origin_citizen_population_in_residence);
    if (compat !== null && stock !== null && compat > stock) err(`diaspora: ${id} compatible population exceeds citizen stock`);
  }
  refs("diaspora", t.diaspora.filter((r) => r.source_id), "source_id");

  // ---- advertising cost
  for (const d of dupes(t.adCost, (r) => r.country_iso2)) err(`adCost: duplicate ${d}`);
  for (const r of t.adCost) {
    if (r.meta_cpm_usd !== "" && !r.source_ids) err(`adCost: ${r.country_iso2} has a CPM without a source`);
    if (r.google_avg_cpc_usd !== "" && !r.source_ids) err(`adCost: ${r.country_iso2} has a CPC without a source`);
  }

  // ---- investment conditions, survey evidence and motivations (optional tables)
  if (t.conditions) {
    for (const d of dupes(t.conditions, (r) => r.country_iso2)) err(`conditions: duplicate ${d}`);
    for (const iso of reg) if (!t.conditions.some((r) => r.country_iso2 === iso)) err(`conditions: missing row for ${iso}`);
    for (const r of t.conditions) {
      const id = r.country_iso2;
      for (const [val, yr] of [["gdp_growth_pct", "gdp_growth_year"], ["inflation_pct", "inflation_year"], ["political_stability_wgi", "political_stability_year"], ["currency_change_vs_usd_pct", "currency_change_year"]] as const) {
        if (r[val] !== "" && !(Number(r[yr]) >= 2024)) err(`conditions: ${id} ${val} is missing a current reference year`);
      }
      for (const k of ["investment_capability_index_0_100", "conditions_index_0_100"]) {
        const v = n(r[k]);
        if (v !== null && (v < 0 || v > 100)) err(`conditions: ${id} ${k} out of range`);
      }
      if (r.hnwi_population !== "" && !r.sources) err(`conditions: ${id} HNWI figure without a source`);
      if (r.affluent_population_modelled !== "" && !/Modelled/.test(r.affluent_definition)) err(`conditions: ${id} affluent population must be labelled modelled`);
    }
    refs("conditions", t.conditions, "sources");
  }
  for (const r of t.survey ?? []) {
    if (!r.source_id || !r.sample || !r.survey_year) err(`survey: ${r.metric} needs a source, sample and year`);
    const v = n(r.value_pct);
    if (v === null || v < 0 || v > 100) err(`survey: ${r.metric} value out of range`);
    if (r.evidence_type !== "survey_intention_not_transactions") err(`survey: ${r.metric} must be labelled survey intention`);
  }
  refs("survey", t.survey ?? [], "source_id");
  for (const r of t.motivations ?? []) {
    if (!r.source_id || !r.reference_year) err(`motivations: ${r.motivation_category} needs a source and year`);
    if (r.country_iso2 !== "ALL" && r.evidence_status.startsWith("documented") && !r.sample_or_scope) err(`motivations: ${r.country_iso2} needs a sample or scope`);
  }
  refs("motivations", t.motivations ?? [], "source_id");

  // ---- per-country language profile (primary / secondary with percentages)
  if (t.profile) {
    const byCountry = new Map<string, Row[]>();
    for (const r of t.profile) {
      if (!reg.has(r.country_iso2)) err(`profile: ${r.country_iso2} is not in the registry`);
      byCountry.set(r.country_iso2, [...(byCountry.get(r.country_iso2) ?? []), r]);
      const p = n(r.first_language_pct);
      if (p !== null && (p < 0 || p > 100)) err(`profile: ${r.country_iso2}/${r.language_name} first-language % out of range`);
      if (p !== null && !/SRC_CIA_FACTBOOK/.test(r.sources)) err(`profile: ${r.country_iso2}/${r.language_name} has a first-language % without a source`);
      const reach = n(r.total_speakers_reach_pct);
      if (reach !== null && (reach < 0 || reach > 100)) err(`profile: ${r.country_iso2}/${r.language_name} reach % out of range`);
      if (r.selectable_language && !langCodes.has(r.selectable_language)) err(`profile: ${r.country_iso2}/${r.language_name} maps to unknown language ${r.selectable_language}`);
    }
    for (const [iso, list] of byCountry) {
      const ranks = list.map((r) => r.rank);
      if (new Set(ranks).size !== ranks.length) err(`profile: ${iso} has duplicate ranks`);
      if (list.filter((r) => r.role === "primary").length !== 1) err(`profile: ${iso} must have exactly one primary language`);
    }
    refs("profile", t.profile, "sources");
  }

  // ---- warnings (not failures)
  const modelled = t.cpl.filter((r) => r.cpl_status === "modelled").length;
  if (modelled > 0) warnings.push(`${modelled} countries rely on modelled CPL ranges (low confidence)`);
  const manual = t.cpl.filter((r) => r.cpl_status === "manual_research_required").length;
  if (manual > 0) warnings.push(`${manual} countries still need manual research`);
  return { errors, warnings };
}
