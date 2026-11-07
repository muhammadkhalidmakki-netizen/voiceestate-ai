// Typed access to the research data in docs/dubai-analysis/data (copied into
// ./data as JSON). Presentational components never hold benchmark numbers;
// everything comes through here.

import countriesJson from "./data/countries.json";
import benchmarks from "./data/benchmarks.json";
import portfolio from "./data/portfolio.json";
import languageJson from "./data/language-markets.json";
import sourcesJson from "./data/sources.json";
import type { Country, LanguageMarketSeed, ResolvedCpl } from "./types";
import { dashboardModelledCpl } from "./intel/dashboard";
import { overrideCpl } from "./intel/data";

export const COUNTRIES = countriesJson as unknown as Country[];
export const LANGUAGE_SEEDS = languageJson as unknown as LanguageMarketSeed[];
export const DATASET_VERSION: string = benchmarks.dataset_version;

export const COUNTRY_BY_ISO = new Map(COUNTRIES.map((c) => [c.iso2, c]));

/** Recommended starting selection (see recommended-portfolio.json). */
export const DEFAULT_SELECTION: string[] = portfolio.default_selected_countries.map(
  (c) => c.country_iso2,
);

const REASONS = new Map<string, string>();
for (const c of portfolio.default_selected_countries) REASONS.set(c.country_iso2, c.reason);
for (const c of portfolio.test_next_candidates) REASONS.set(c.country_iso2, c.reason);
for (const c of portfolio.benchmark_supported_watchlist) REASONS.set(c.country_iso2, c.reason);

export function reasonFor(iso2: string): string | null {
  return REASONS.get(iso2) ?? null;
}

/** Mature / reference CPL as a regional proxy. Null when no client benchmark maps to the country. */
export function matureCpl(country: Country): ResolvedCpl | null {
  if (country.cplHigh === null || country.cplRelation === null) return null;
  return {
    lo: country.cplRelation === "at_most" ? null : (country.cplLow ?? country.cplHigh),
    hi: country.cplHigh,
    relation: country.cplRelation,
    source: "client-regional-proxy",
    regionLabel: country.benchmarkRegion ?? undefined,
  };
}

/**
 * CPL the planner can use: the client benchmark, else a modelled estimate while that switch is on.
 * (A user's own planning CPL is applied separately and takes precedence over a modelled estimate.)
 */
export function planningCpl(country: Country): ResolvedCpl | null {
  return clientCpl(country) ?? dashboardModelledCpl(country.iso2);
}

/** Your CPL: a value from cpl-overrides.csv, else the client regional benchmark. */
export function clientCpl(country: Country): ResolvedCpl | null {
  return overrideCpl(country.iso2) ?? matureCpl(country);
}

/** Learning-phase CPL, supplied for Europe only. */
export const LEARNING_CPL: Record<string, number | undefined> = (() => {
  const out: Record<string, number | undefined> = {};
  for (const b of benchmarks.regional_cpl_benchmarks) {
    if (b.campaign_stage === "learning" && "cpl_point_aed" in b && b.cpl_point_aed) {
      for (const iso of b.countries) out[iso] = b.cpl_point_aed;
    }
  }
  return out;
})();

export const EUROPE_PATTERN = benchmarks.europe_observed_operating_pattern;
export const SALES_CYCLE = benchmarks.sales_cycle_observations;

export const MARKET_CLASS_LABEL: Record<string, string> = {
  core_candidate: "Core opportunity",
  test_candidate: "Worth testing",
  benchmark_market: "Monitor",
};

export function marketClassLabel(c: Country): string {
  return c.marketClass ? MARKET_CLASS_LABEL[c.marketClass] : "Research pending";
}

/** Region order for the market browser (most relevant to Dubai demand first). */
export const REGION_ORDER = ["Asia", "Europe", "Americas", "Oceania", "Africa", "Other territories"];

export const REGIONS = REGION_ORDER.map((name) => ({
  name,
  countries: COUNTRIES.filter((c) => c.region === name).sort((a, b) => a.name.localeCompare(b.name)),
}));

export type LanguageOption = { code: string; label: string; note?: string };

/** Agent languages the client can select. `mapped` is false when no market data exists yet. */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ru", label: "Russian" },
  { code: "ur", label: "Urdu" },
  { code: "hi", label: "Hindi" },
  { code: "zh", label: "Mandarin", note: "Mapped as Chinese; Mandarin and Cantonese are not separated yet." },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "tr", label: "Turkish" },
  { code: "pt", label: "Portuguese" },
  { code: "bn", label: "Bengali" },
  { code: "pa", label: "Punjabi" },
  { code: "id", label: "Indonesian" },
  { code: "other", label: "Other" },
];

const MAPPED_CODES = new Set(LANGUAGE_SEEDS.map((s) => s.code));
export const isLanguageMapped = (code: string) => MAPPED_CODES.has(code);
export const languageLabel = (code: string) =>
  LANGUAGE_OPTIONS.find((l) => l.code === code)?.label ?? code;

export const RELATIONSHIP_LABEL: Record<string, string> = {
  official_or_dominant: "Official or dominant language",
  spoken_language: "Widely spoken language",
  daily_use_or_official: "Daily-use or official language",
  diaspora_origin_proxy: "Diaspora-origin proxy",
};

// ---------- Sources and CPL provenance ----------

export type SourceRecord = {
  id: string;
  type: string;
  label: string;
  date?: string;
  period?: string;
  url?: string | null;
  urls?: string[];
};

export const SOURCES = sourcesJson.sources as unknown as SourceRecord[];
export const sourceById = (id: string) => SOURCES.find((s) => s.id === id) ?? null;

export const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

/** Provenance of the client CPL that a country inherits as a regional proxy. */
export function cplProvenance(iso2: string) {
  const mature = benchmarks.regional_cpl_benchmarks.find(
    (b) => b.countries.includes(iso2) && b.campaign_stage !== "learning",
  );
  if (!mature) return null;
  return {
    confidence: mature.confidence,
    scopeNote: mature.scope_note,
    sourceLabel: mature.source_label,
    sourceDate: mature.source_date,
    stage: mature.campaign_stage,
    coverageNote: "coverage_note" in mature ? (mature.coverage_note as string) : null,
  };
}

export const CHANNEL_RATES = benchmarks.channel_working_lead_rates;

export const DEMAND_SIGNAL_DEFINITION =
  "Share of international digital property-interest (searches) for Dubai residential property, " +
  "excluding UAE-based demand, as reported by secondary sources citing DXBinteract. " +
  "It is not a count of transactions, buyers, leads or conversions.";

export type RegionalBenchmark = {
  id: string;
  region_key: string;
  countries: string[];
  cpl_relation: string;
  cpl_point_aed?: number;
  cpl_low_aed?: number;
  cpl_high_aed?: number;
  campaign_stage: string;
  source_label: string;
  source_date: string;
  confidence: string;
  scope_note: string;
};

export const REGIONAL_BENCHMARKS = benchmarks.regional_cpl_benchmarks as unknown as RegionalBenchmark[];

export const REGION_KEY_LABEL: Record<string, string> = {
  europe: "Europe",
  south_asia_africa: "South Asia & Africa",
  north_america: "North America",
  oceania: "Oceania",
  uae: "UAE",
};
