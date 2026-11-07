// Language coverage and language-led market discovery.
// Pure functions: seed data is passed in. See 06_LANGUAGE_AND_AGENT_COVERAGE.md.
//
// Rules kept here:
// - Only fluent/native-level and professional proficiency count as full coverage
//   (administrator-configurable via FULL_COVERAGE).
// - Conversational proficiency is "limited" coverage.
// - Primary-language markets and diaspora-origin proxies are always separate.
// - A country with no language mapping is "unmapped" (research pending), never "unsupported".

import type { LanguageMarketSeed, Proficiency } from "./types";

export const FULL_COVERAGE: ReadonlySet<Proficiency> = new Set<Proficiency>(["fluent", "professional"]);

export type AgentLanguages = Record<string, Proficiency>;

export type MarketCoverage =
  | { status: "full"; languages: string[] }
  | { status: "limited"; languages: string[] }
  /** The country is mapped to languages, but none of them is selected. */
  | { status: "gap"; languages: string[] }
  /** No language mapping exists for this country yet. */
  | { status: "unmapped"; languages: string[] };

/** Coverage of one country given the languages the team supports. */
export function marketCoverage(
  iso2: string,
  agent: AgentLanguages,
  seeds: LanguageMarketSeed[],
): MarketCoverage {
  const rows = seeds.filter((s) => s.iso2 === iso2);
  if (rows.length === 0) return { status: "unmapped", languages: [] };
  const matched = rows.filter((r) => agent[r.code]);
  if (matched.length === 0) {
    return { status: "gap", languages: [...new Set(rows.map((r) => r.code))] };
  }
  const full = matched.filter((r) => FULL_COVERAGE.has(agent[r.code]));
  if (full.length > 0) return { status: "full", languages: [...new Set(full.map((r) => r.code))] };
  return { status: "limited", languages: [...new Set(matched.map((r) => r.code))] };
}

export type LanguageCandidate = {
  iso2: string;
  /** Selected languages that link to this market. */
  languages: string[];
  coverage: "full" | "limited";
  /** Strongest-evidence relationship type among the links. */
  relationship: string;
  confidence: string;
};

export type Discovery = {
  /** Language is official, dominant or widely used. */
  primary: LanguageCandidate[];
  /** Diaspora-origin proxies. Not speaker counts. */
  diaspora: LanguageCandidate[];
};

/** Markets that the selected agent languages open up, kept in two separate groups. */
export function discoverMarkets(agent: AgentLanguages, seeds: LanguageMarketSeed[]): Discovery {
  const byKey = new Map<string, LanguageCandidate & { diaspora: boolean }>();
  for (const s of seeds) {
    const prof = agent[s.code];
    if (!prof) continue;
    const key = `${s.diaspora ? "d" : "p"}:${s.iso2}`;
    const coverage = FULL_COVERAGE.has(prof) ? "full" : "limited";
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        iso2: s.iso2,
        languages: [s.code],
        coverage,
        relationship: s.relationship,
        confidence: s.confidence,
        diaspora: s.diaspora,
      });
    } else {
      if (!existing.languages.includes(s.code)) existing.languages.push(s.code);
      if (coverage === "full") existing.coverage = "full";
    }
  }
  const all = [...byKey.values()];
  const strip = (c: LanguageCandidate & { diaspora: boolean }): LanguageCandidate => ({
    iso2: c.iso2,
    languages: c.languages,
    coverage: c.coverage,
    relationship: c.relationship,
    confidence: c.confidence,
  });
  return {
    primary: all.filter((c) => !c.diaspora).map(strip),
    diaspora: all.filter((c) => c.diaspora).map(strip),
  };
}
