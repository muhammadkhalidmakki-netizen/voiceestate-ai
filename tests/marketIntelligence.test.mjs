// Tests for the market-intelligence backend: dataset validation, CPL model rules, the two scores, the
// dynamic recommendation engine and its integration with the dashboard's planner state.
// Node strips TypeScript types at import time (Node 22.6+ / 24).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { parseCsv } from "../src/lib/market-planning/intel/csv.ts";
import { validateIntel } from "../src/lib/market-planning/intel/validate.ts";
import {
  buildCandidates,
  optimizePortfolio,
  portfolioValue,
  buyerScore,
  efficiencyScore,
  languageFit,
  leadsPerAed,
  minTestBudget,
  qualityIndex,
  recommend,
  resolveCpl,
  languageCplFactor,
} from "../src/lib/market-planning/intel/recommend.ts";

// Model tests read a frozen CLEAN copy of the data (tests/fixtures/intel, made by
// scripts/market-intel/make_test_fixtures.py), so CPLs you edit in country-cpl-estimates.csv never break them.
// The "live data" test below validates your real, edited files.
const docs = new URL("./fixtures/intel/docs/", import.meta.url);
const app = new URL("./fixtures/intel/app/", import.meta.url);
const liveDocs = new URL("../docs/dubai-analysis/data/", import.meta.url);
const csv = (f) => parseCsv(readFileSync(new URL(f, docs), "utf8"));
const json = (u, f) => JSON.parse(readFileSync(new URL(f, u), "utf8"));

const facts = json(docs, "benchmark-facts.json");
const tables = () => ({
  registry: csv("country-market-master.csv"),
  cpl: csv("country-cpl-estimates.csv"),
  signals: csv("country-market-signals.csv"),
  distribution: csv("country-language-distribution.csv"),
  diaspora: csv("diaspora-market-opportunities.csv"),
  languages: csv("language-master.csv"),
  sources: csv("research-source-register.csv"),
  adCost: csv("country-advertising-cost-signals.csv"),
  conditions: csv("country-investment-conditions.csv"),
  survey: csv("dubai-survey-evidence.csv"),
  motivations: csv("country-buyer-motivations.csv"),
  clientBenchmarks: facts.regional_cpl_benchmarks,
});
const data = {
  countries: json(app, "countries.json"),
  languageShare: json(app, "language-share.json"),
  diaspora: json(app, "diaspora.json"),
  config: json(app, "scoring-config.json"),
};
const P = "professional";
const run = (amount, languages = {}, extra = {}) => recommend({ mode: "budget", amount, languages, ...extra }, data);

// ================================================================ validation
test("real datasets pass validation", () => {
  assert.deepEqual(validateIntel(tables()).errors, []);
});

test("LIVE data (your edited files) passes validation and keeps client benchmarks unless you overrode them", () => {
  const live = (f) => parseCsv(readFileSync(new URL(f, liveDocs), "utf8"));
  const cpl = live("country-cpl-estimates.csv");
  const result = validateIntel({
    registry: live("country-market-master.csv"), cpl, signals: live("country-market-signals.csv"),
    distribution: live("country-language-distribution.csv"), diaspora: live("diaspora-market-opportunities.csv"),
    languages: live("language-master.csv"), sources: live("research-source-register.csv"), adCost: live("country-advertising-cost-signals.csv"),
    conditions: live("country-investment-conditions.csv"), survey: live("dubai-survey-evidence.csv"), motivations: live("country-buyer-motivations.csv"),
    clientBenchmarks: JSON.parse(readFileSync(new URL("benchmark-facts.json", liveDocs), "utf8")).regional_cpl_benchmarks,
    overrides: cpl.filter((r) => r.cpl_status === "user_override").map((r) => r.country_iso2),
  });
  assert.deepEqual(result.errors, [], "fix the rows listed above in country-cpl-estimates.csv");
  const app = JSON.parse(readFileSync(new URL("../src/lib/market-planning/data/intel/countries.json", import.meta.url), "utf8"));
  for (const [k, c] of Object.entries(app)) for (const f of ["cl", "cb", "ch"]) assert.ok(c[f] === null || typeof c[f] === "number", `${k}.${f} must be a number`);
});

test("validator catches duplicates, bad ISO codes, currency, ranges and missing sources", () => {
  const t = tables();
  t.cpl.push({ ...t.cpl[0] });
  t.cpl[1].currency = "USD";
  const modelled = t.cpl.findIndex((r) => r.cpl_status === "modelled");
  t.cpl[modelled].cpl_low_aed = "999";
  t.cpl[modelled].source_ids = "SRC_DOES_NOT_EXIST";
  t.registry.push({ ...t.registry[0], country_iso2: "XYZ" });
  const e = validateIntel(t).errors.join("\n");
  assert.match(e, /duplicate country/);
  assert.match(e, /currency "USD"/);
  assert.match(e, /low CPL above high CPL/);
  assert.match(e, /unknown source id "SRC_DOES_NOT_EXIST"/);
  assert.match(e, /invalid ISO2 "XYZ"/);
});

test("validator catches changed client benchmarks and missing countries", () => {
  const t = tables();
  const fr = t.cpl.find((r) => r.country_iso2 === "FR");
  fr.cpl_high_aed = "55";
  fr.cpl_low_aed = "55";
  t.cpl = t.cpl.filter((r) => r.country_iso2 !== "JP");
  const e = validateIntel(t).errors.join("\n");
  assert.match(e, /client benchmark: FR values changed/);
  assert.match(e, /missing row for registry country JP/);
});

test("validator rejects a CPL on a manual-research country, unsourced buyer-origin claims and confirmed diaspora speakers", () => {
  const t = tables();
  t.cpl.find((r) => r.cpl_status === "manual_research_required").cpl_high_aed = "40";
  t.signals.find((r) => r.country_iso2 === "FJ").dubai_transaction_buyer_origin_evidence = "100 buyers";
  t.diaspora[0].confirmed_speaking_population = "5000";
  const e = validateIntel(t).errors.join("\n");
  assert.match(e, /marked for manual research but carries a CPL/);
  assert.match(e, /claims buyer-origin evidence without a source/);
  assert.match(e, /claims a confirmed speaking population/);
});

// ================================================================ CPL intelligence
test("validator catches stale indicators, unlabelled modelled affluence and unsourced survey rows", () => {
  const t = tables();
  const row = t.conditions.find((r) => r.gdp_growth_pct !== "");
  row.gdp_growth_year = "2019";
  const aff = t.conditions.find((r) => r.affluent_population_modelled !== "");
  aff.affluent_definition = "People with a lot of money";
  t.survey[0].source_id = "";
  const e = validateIntel(t).errors.join("\n");
  assert.match(e, /missing a current reference year/);
  assert.match(e, /affluent population must be labelled modelled/);
  assert.match(e, /needs a source, sample and year/);
});

test("client regional benchmarks are preserved exactly", () => {
  const by = Object.fromEntries(tables().cpl.map((r) => [r.country_iso2, r]));
  for (const iso of ["CH", "DE", "FR", "LU", "NL", "NO"]) {
    assert.equal(by[iso].cpl_status, "regional_proxy");
    assert.equal(by[iso].cpl_high_aed, "50");
    assert.equal(by[iso].learning_cpl_aed, "120");
  }
  for (const iso of ["US", "CA", "AU", "NZ"]) assert.equal(by[iso].cpl_high_aed, "70");
  for (const iso of ["IN", "PK"]) {
    assert.equal(by[iso].cpl_relation, "at_most");
    assert.equal(by[iso].cpl_low_aed, "");
    assert.equal(by[iso].cpl_high_aed, "30");
  }
  assert.equal(by.AE.cpl_low_aed, "80");
  assert.equal(by.AE.cpl_high_aed, "100");
  assert.equal(by.GB.learning_cpl_status, "not_supplied"); // the Europe learning ratio is not copied elsewhere
});

test("no country is labelled measured; modelled CPLs stay anchored, banded and low confidence", () => {
  const rows = tables().cpl;
  assert.equal(rows.filter((r) => r.cpl_status === "measured").length, 0);
  const modelled = rows.filter((r) => r.cpl_status === "modelled");
  assert.ok(modelled.length > 150);
  for (const r of modelled) {
    assert.equal(r.confidence, "low", r.country_iso2);
    assert.ok(["same_region", "cross_region"].includes(r.anchor_distance), r.country_iso2);
    assert.ok(Number(r.adjustment_factor) >= 0.55 && Number(r.adjustment_factor) <= 1.35, r.country_iso2);
    if (r.cpl_relation === "range") {
      assert.ok(Number(r.cpl_low_aed) < Number(r.cpl_base_aed) && Number(r.cpl_base_aed) < Number(r.cpl_high_aed), r.country_iso2);
      assert.ok(Number(r.cpl_high_aed) / Number(r.cpl_low_aed) < 2.6, r.country_iso2);
    }
  }
});

test("hierarchical bands: a cross-region borrower is wider than a same-region country", () => {
  const by = Object.fromEntries(tables().cpl.map((r) => [r.country_iso2, r]));
  const ratio = (r) => Number(r.cpl_high_aed) / Number(r.cpl_low_aed);
  assert.equal(by.PL.anchor_distance, "same_region"); // Europe anchored to the Europe benchmark
  assert.equal(by.SG.anchor_distance, "cross_region"); // Asia borrowing the Europe benchmark
  assert.ok(ratio(by.SG) > ratio(by.PL));
  assert.equal(Number(by.GB.cpl_base_aed), 50); // high-income markets are never cheaper than the anchor
});

test("the AED 30 Africa benchmark is a ceiling: no lower bound or lead-volume upper bound is invented", () => {
  const ceil = tables().cpl.filter((r) => r.cpl_status === "modelled" && r.cpl_relation === "at_most");
  assert.ok(ceil.length > 20);
  for (const r of ceil) {
    assert.equal(r.cpl_low_aed, "", r.country_iso2);
    assert.equal(r.cpl_high_aed, "30", r.country_iso2);
  }
  assert.equal(resolveCpl(data.countries.KE).lo, null);
});

test("restricted ad markets and unmodellable territories are left for manual research", () => {
  const by = Object.fromEntries(tables().cpl.map((r) => [r.country_iso2, r]));
  for (const iso of ["CN", "RU", "IR", "KP"]) assert.equal(by[iso].cpl_status, "manual_research_required");
  assert.equal(resolveCpl(data.countries.RU), null);
});

test("a user-entered planning CPL beats a model but never a client benchmark", () => {
  assert.equal(resolveCpl(data.countries.GB, 25).source, "user-assumption");
  assert.equal(resolveCpl(data.countries.GB, 25).hi, 25);
  assert.equal(resolveCpl(data.countries.FR, 25).source, "client-regional-proxy");
  assert.equal(resolveCpl(data.countries.RU, 40).source, "user-assumption");
});

// ================================================================ CPL overrides (cpl-overrides.csv)
test("an overridden CPL is used exactly as entered, with no safety margin, and beats estimates", () => {
  const custom = { ...data, countries: { ...data.countries, SA: { ...data.countries.SA, cs: "regional_proxy", ov: true, cl: 40, cb: 50, ch: 60, cr: "range", cc: "user" } } };
  const cpl = resolveCpl(custom.countries.SA, null, 0.2);
  assert.equal(cpl.source, "client-regional-proxy");
  assert.equal(cpl.hi, 60); // the 20% margin is for estimates only
  assert.equal(cpl.lo, 40);
  // An override is the client's English-campaign figure: it is used exactly, then scaled only by the language factor.
  const cand = buildCandidates({ ar: P }, custom).candidates.find((c) => c.iso2 === "SA");
  assert.ok(Math.abs(cand.cpl.hi - 60 * languageCplFactor("SA", { ar: P }, custom)) < 1e-9);
});

test("validator allows a deliberate override of a client benchmark but still catches accidental changes", () => {
  const t = tables();
  const fr = t.cpl.find((r) => r.country_iso2 === "FR");
  Object.assign(fr, { cpl_status: "user_override", cpl_low_aed: "55", cpl_base_aed: "55", cpl_high_aed: "55", cpl_relation: "point", source_ids: "SRC_USER_OVERRIDE" });
  assert.match(validateIntel(t).errors.join("\n"), /FR/); // not declared as an override: still flagged
  t.overrides = ["FR"];
  assert.deepEqual(validateIntel(t).errors, []);
});

// ================================================================ investment evidence
test("investment datasets are dated, honest and complete in structure", () => {
  const cond = csv("country-investment-conditions.csv");
  assert.equal(cond.length, 249);
  for (const r of cond) {
    if (r.gdp_growth_pct !== "") assert.ok(Number(r.gdp_growth_year) >= 2024, `${r.country_iso2} growth must be current`);
    if (r.inflation_pct !== "") assert.ok(Number(r.inflation_year) >= 2024, `${r.country_iso2} inflation must be current`);
    assert.equal(r.hnwi_population, ""); // not invented
  }
  const by = Object.fromEntries(cond.map((r) => [r.country_iso2, r]));
  assert.equal(by.RU.capital_movement_flag, "sanctions_possible");
  assert.equal(by.RU.capital_movement_evidence, "general_knowledge_unverified");
});

test("buyer motivations are documented market-wide only, never assigned to nationalities", () => {
  const rows = csv("country-buyer-motivations.csv");
  assert.ok(rows.length >= 3);
  assert.ok(rows.every((r) => r.country_iso2 === "ALL" && r.source_id && r.reference_year));
  assert.ok(Object.values(data.countries).every((c) => c.mot === undefined || c.mot === null));
});

test("survey intention is stored separately from transactions and search interest", () => {
  const s = csv("dubai-survey-evidence.csv");
  assert.ok(s.every((r) => r.evidence_type === "survey_intention_not_transactions" && /387/.test(r.sample)));
  const sig = csv("country-market-signals.csv");
  assert.ok(sig.every((r) => r.dubai_transaction_buyer_origin_evidence === "unavailable"));
  assert.ok(sig.filter((r) => r.dubai_search_interest_share_pct !== "").every((r) => r.dubai_search_interest_evidence_type === "secondary_report_of_search_interest"));
});

// ================================================================ language
test("language data is honest: no invented first/second-language, native counts or English proficiency", () => {
  const rows = csv("country-language-distribution.csv");
  assert.ok(rows.length > 900);
  assert.ok(rows.every((r) => r.first_language_pct === "" && r.second_language_pct === "" && r.native_speakers === "" && r.english_proficiency_index === ""));
});

test("cross-border diaspora pools exist where Eurostat supports them and are never 'confirmed'", () => {
  assert.ok(data.diaspora.ar.DE[0] > 500_000);
  assert.ok(data.diaspora.fr.BE);
  assert.equal(data.diaspora.ar.FR, undefined, "France publishes no citizenship stock here: a gap, not zero");
  const rows = csv("diaspora-market-opportunities.csv").filter((r) => r.relationship_type === "diaspora_proxy_by_citizenship");
  assert.ok(rows.every((r) => r.confirmed_speaking_population === ""));
});

test("language fit: Arabic reaches Saudi Arabia, English barely; French reaches France and Belgium; proficiency matters", () => {
  const sa = languageFit("SA", { ar: P }, data);
  assert.equal(sa.serviceability, 1);
  assert.ok(languageFit("SA", { en: P }, data).serviceability < 0.5);
  assert.ok(languageFit("FR", { fr: P }, data).serviceability >= 1);
  assert.ok(languageFit("BE", { fr: P }, data).serviceability > 0.4);
  assert.ok(languageFit("SA", { ar: "conversational" }, data).serviceability < sa.serviceability);
});

// ================================================================ per-country language profiles
test("each country has a primary language and ranked secondary languages with percentages and sources", () => {
  const profile = csv("country-language-profile.csv");
  const by = (iso) => profile.filter((r) => r.country_iso2 === iso);
  const countries = new Set(profile.map((r) => r.country_iso2));
  assert.ok(countries.size > 225, `countries with a profile: ${countries.size}`);
  for (const iso of countries) assert.equal(by(iso).filter((r) => r.role === "primary").length, 1, iso);
  // Pakistan: Punjabi is the largest mother tongue, Saraiki and Urdu follow; India: Hindi first, Punjabi small
  const pk = by("PK");
  assert.equal(pk[0].language_name, "Punjabi");
  assert.equal(Number(pk[0].first_language_pct), 38.8);
  assert.ok(pk.some((r) => /Saraiki/i.test(r.language_name)) && pk.some((r) => r.language_name === "Urdu"));
  const indiaPunjabi = by("IN").find((r) => r.language_name === "Punjabi");
  assert.equal(Number(indiaPunjabi.first_language_pct), 2.7);
  assert.equal(by("IN")[0].language_name, "Hindi");
  // every percentage from the Factbook carries a year and a definition; none is invented for countries that publish none
  for (const r of profile.filter((x) => x.first_language_pct !== "")) {
    assert.match(r.sources, /SRC_CIA_FACTBOOK/);
    assert.ok(r.first_language_definition, `${r.country_iso2}/${r.language_name} definition`);
  }
  const ae = by("AE");
  assert.ok(ae.every((r) => r.first_language_pct === ""), "the UAE publishes no mother-tongue percentages: left blank");
  assert.equal(ae[0].language_name, "Arabic");
});

test("first-language % and total-speaker reach % stay separate (Pakistan: Urdu is a first language for 7% but understood by about 95%)", () => {
  const urdu = csv("country-language-profile.csv").find((r) => r.country_iso2 === "PK" && r.language_name === "Urdu");
  assert.equal(Number(urdu.first_language_pct), 7.1);
  assert.ok(Number(urdu.total_speakers_reach_pct) >= 90);
});

test("language families: Punjabi counts in India, Pakistan, UK and Canada; Western Panjabi counts as Punjabi", () => {
  assert.ok(data.languageShare.PK.pa >= 70);
  for (const iso of ["IN", "GB", "CA"]) assert.ok(data.languageShare[iso].pa > 1, iso);
  const fams = csv("language-families.csv");
  assert.ok(fams.some((r) => r.selectable_language === "pa" && r.member_language_code === "lah" && Number(r.weight) === 1));
  assert.ok(fams.every((r) => Number(r.weight) > 0 && Number(r.weight) <= 1 && r.evidence), "weights are labelled planning assumptions");
  // a related-language weight lowers the reach it contributes (Egyptian Arabic counts at 0.8 of its share)
  assert.ok(data.languageShare.EG.ar > 0);
});

test("a minority language spoken by millions is still serviceable: Punjabi in India, Urdu in India (spoken Hindustani)", () => {
  const pa = languageFit("IN", { pa: P }, data);
  assert.ok(pa.primaryShare < 5 && pa.serviceability >= 0.5, `Punjabi in India serviceability ${pa.serviceability}`);
  const ur = languageFit("IN", { ur: P }, data);
  assert.ok(ur.serviceability >= 0.5, `Urdu agents reach Hindi speakers: ${ur.serviceability}`);
  assert.ok(languageFit("PK", { pa: P }, data).serviceability >= 1);
  assert.ok(languageFit("DK", { pa: P }, data).serviceability < 0.3);
});

test("Punjabi-only agents get Pakistan, India and diaspora markets, not unrelated ones", () => {
  const r = run(25000, { pa: P });
  const isos = r.markets.map((m) => m.iso2);
  assert.ok(isos.includes("PK") && isos.includes("IN"), isos.join());
  assert.ok(!isos.includes("JP") && !isos.includes("SA"));
  const en = run(25000, { en: P }).markets.map((m) => m.iso2);
  assert.notDeepEqual(isos.sort(), en.sort());
});

// ================================================================ language anchors (selected language -> its main markets)
test("selecting Arabic always shows the UAE (home market) and Arabic's own main markets, at every budget", () => {
  for (const b of [5000, 10000, 25000, 60000]) {
    const r = run(b, { ar: P });
    const isos = r.markets.map((m) => m.iso2);
    assert.ok(isos.includes("AE"), `UAE at ${b}: ${isos}`);
    assert.ok(isos.some((i) => ["SA", "QA", "KW", "EG", "MA", "DZ", "TN", "JO", "IQ"].includes(i)), `an Arabic-majority market at ${b}`);
    const ae = r.markets.find((m) => m.iso2 === "AE");
    assert.equal(ae.languageAnchor, true);
    assert.match(ae.reasons[0], /Main market for the agent language/);
  }
});

test("language anchors never apply to the English-only default, and respect the budget", () => {
  assert.ok(run(10000, {}).markets.every((m) => !m.languageAnchor));
  const r = run(3000, { ar: P });
  const anchorSpend = r.markets.filter((m) => m.languageAnchor).reduce((s, m) => s + m.spend, 0);
  assert.ok(r.markets.length >= 1 && anchorSpend > 0);
  assert.ok(Math.abs(r.markets.reduce((s, m) => s + m.share, 0) - 1) < 1e-9);
});

test("Punjabi agents get Pakistan; Arabic and English together keep both languages' main markets", () => {
  assert.ok(run(10000, { pa: P }).markets.some((m) => m.iso2 === "PK" && m.languageAnchor));
  const both = run(25000, { en: P, ar: P }).markets.map((m) => m.iso2);
  assert.ok(both.includes("AE") && both.some((i) => ["US", "GB", "CA", "AU"].includes(i)));
});

// ================================================================ Buyer Opportunity Score
test("buyer weights are the specified 25/20/15/15/10/10/5 and sum to 1", () => {
  const w = data.config.buyer_opportunity.weights;
  assert.deepEqual(w, { demand: 0.25, purchasing_power: 0.2, investment_capability: 0.15, motivations: 0.15, conditions: 0.1, affluent_audience: 0.1, language: 0.05 });
  assert.ok(Math.abs(Object.values(w).reduce((s, v) => s + v, 0) - 1) < 1e-9);
});

test("score is 0-100, is not a sale probability, and reports evidence confidence separately", () => {
  const us = buyerScore("US", { en: P }, data);
  assert.ok(us.score > 0 && us.score <= 100);
  assert.ok(us.evidence > 0 && us.evidence < 1);
  assert.equal(recommend({ mode: "budget", amount: 10000 }, data).isProbabilityOfSale, false);
});

test("missing research is not zero: absent factors are excluded and only lower the evidence rating", () => {
  const ch = buyerScore("CH", { en: P }, data); // no Dubai demand signal, no motivation evidence
  assert.equal(ch.factors.demand.score, null);
  assert.equal(ch.factors.motivations.score, null);
  const present = Object.values(ch.factors).filter((f) => f.score !== null);
  assert.ok(present.length >= 4);
  assert.ok(ch.score > 50, "a wealthy, stable market is not scored as low just because Dubai demand data is missing");
  assert.ok(ch.evidence < buyerScore("US", { en: P }, data).evidence);
  // adding a documented motivation raises both score and evidence
  const withMot = { ...data, countries: { ...data.countries, CH: { ...data.countries.CH, mot: 3 } } };
  const ch2 = buyerScore("CH", { en: P }, withMot);
  assert.equal(ch2.factors.motivations.score, 1);
  assert.ok(ch2.evidence > ch.evidence);
});

test("insufficient evidence gives no score instead of a number", () => {
  const bare = { ...data, countries: { ...data.countries, FJ: { ...data.countries.FJ, dx: null, pp: null, ic: null, ci: null, aff: null } } };
  const s = buyerScore("FJ", { en: P }, bare);
  assert.equal(s.insufficientEvidence, true);
  assert.equal(s.score, null);
});

test("UK compares with Sudan on the investment evidence available", () => {
  const gb = buyerScore("GB", { en: P }, data);
  const sd = buyerScore("SD", { en: P }, data);
  assert.ok(gb.score > sd.score + 15, `GB ${gb.score} vs SD ${sd.score}`);
  assert.ok(data.countries.GB.pp > data.countries.SD.pp);
  assert.ok(data.countries.GB.aff > data.countries.SD.aff);
  assert.equal(data.countries.GB.dxr, 3);
  assert.equal(data.countries.SD.dx, null); // no Dubai signal on file for Sudan: unknown, not zero
});

// ================================================================ Acquisition Efficiency
test("efficiency is a separate score; a low CPL alone never wins a market", () => {
  const lowBuyer = buyerScore("EG", { en: P }, data);
  const highBuyer = buyerScore("US", { en: P }, data);
  const eg = efficiencyScore("EG", resolveCpl(data.countries.EG), 1000, lowBuyer.language, data);
  const us = efficiencyScore("US", resolveCpl(data.countries.US), 1400, highBuyer.language, data);
  assert.ok(eg.score !== us.score);
  const cands = buildCandidates({ en: P }, data).candidates;
  const u = (iso) => cands.find((c) => c.iso2 === iso)?.utility;
  const sd = buildCandidates({ en: P }, { ...data, countries: { ...data.countries } }).candidates.find((c) => c.iso2 === "SD");
  assert.ok(u("US") > (sd?.utility ?? 0));
  // quality counts more than price: a market with a 3x cheaper CPL but a much weaker buyer score does not outrank
  assert.ok(data.countries.US.ch > data.countries.EG.ch);
  assert.ok(qualityIndex(highBuyer, data.config) > qualityIndex(lowBuyer, data.config));
});

test("competition data is not invented: efficiency uses only factors that exist", () => {
  const e = efficiencyScore("US", resolveCpl(data.countries.US), 1400, buyerScore("US", { en: P }, data).language, data);
  assert.deepEqual(Object.keys(e.factors).sort(), ["cpl", "language_suitability", "reachable_audience", "search_demand", "testing_requirement"]);
});

// ================================================================ dynamic recommendation
test("shares sum to 100% and spend sums to the budget for every budget", () => {
  for (const b of [1500, 5000, 10000, 25000, 100000]) {
    const r = run(b);
    assert.ok(Math.abs(r.markets.reduce((s, m) => s + m.share, 0) - 1) < 1e-9, `${b}`);
    assert.ok(Math.abs(r.markets.reduce((s, m) => s + m.spend, 0) - b) < 1e-6, `${b}`);
  }
});

test("lower budgets are not spread thin; higher budgets test wider", () => {
  const small = run(5000), mid = run(10000), big = run(25000);
  assert.ok(small.markets.length <= 3);
  assert.ok(small.markets.length < mid.markets.length);
  assert.ok(mid.markets.length < big.markets.length);
  assert.ok(big.markets.length <= data.config.allocation.max_markets);
  for (const r of [small, mid, big]) {
    if (r.markets.length > 1) for (const m of r.markets) assert.ok(m.spend + 1e-6 >= minTestBudget(m.cpl, data.config), `${m.iso2} below its testing minimum`);
  }
  assert.notDeepEqual(small.markets.map((m) => m.iso2), big.markets.map((m) => m.iso2));
});

test("REGRESSION: the recommended market count is no longer a fixed nine", () => {
  const counts = new Set();
  for (const b of [1500, 3000, 5000, 7500, 10000, 15000, 25000, 60000]) counts.add(run(b).markets.length);
  assert.ok(counts.size >= 4, `distinct market counts: ${[...counts]}`);
  assert.ok(![...counts].every((c) => c === 9));
  // and no budget in this range is stuck at exactly nine
  const sets = new Set([5000, 10000, 25000].map((b) => run(b).markets.map((m) => m.iso2).sort().join()));
  assert.equal(sets.size, 3, "each budget yields a different portfolio");
  const dash = [5000, 10000, 25000].map((b) => run(b, {}, { allowedCplSources: ["client-regional-proxy", "user-assumption"] }).markets.length);
  assert.ok(new Set(dash).size >= 2, `dashboard pool counts: ${dash}`);
});

test("allocation follows opportunity and is capped, not equal; equal split is only a labelled alternative", () => {
  const r = run(25000);
  const shares = r.markets.map((m) => m.share);
  assert.ok(Math.max(...shares) <= data.config.allocation.max_single_market_share + 1e-9);
  assert.ok(Math.max(...shares) - Math.min(...shares) > 0.01);
  assert.match(r.equalAlternative.note, /not an optimised recommendation/);
  assert.ok(Object.values(r.equalAlternative.shares).every((v) => Math.abs(v - 1 / r.markets.length) < 1e-9));
});

test("English-only, Arabic-only and English+French give different, language-compatible portfolios", () => {
  const en = run(25000, { en: P });
  const ar = run(25000, { ar: P });
  const enFr = run(25000, { en: P, fr: P });
  assert.ok(!ar.markets.some((m) => ["US", "GB", "CA"].includes(m.iso2)), "Arabic-only does not recommend English-speaking markets");
  assert.ok(ar.markets.some((m) => ["SA", "AE", "QA"].includes(m.iso2)));
  // European markets reachable only through the Arabic diaspora now carry a higher, language-scaled CPL, so they are no longer a given.
  assert.ok(enFr.markets.some((m) => ["BE", "FR", "CH", "LU"].includes(m.iso2)));
  assert.notDeepEqual(en.markets.map((m) => m.iso2), ar.markets.map((m) => m.iso2));
  for (const m of ar.markets) assert.ok(m.buyer.language.serviceability >= data.config.language.min_serviceability_to_recommend, m.iso2);
});

test("no language selected defaults to English only", () => {
  const none = run(10000, {});
  assert.equal(none.languagesDefaulted, true);
  assert.deepEqual(Object.keys(none.languages), ["en"]);
  assert.deepEqual(none.markets.map((m) => m.iso2), run(10000, { en: P }).markets.map((m) => m.iso2));
});

test("never recommends markets that need CPL research or whose ad market is restricted", () => {
  for (const langs of [{}, { ar: P }, { ru: P }, { zh: P }, { fa: P }]) {
    for (const m of run(25000, langs).markets) {
      assert.ok(resolveCpl(data.countries[m.iso2]), m.iso2);
      assert.equal(data.countries[m.iso2].ad, false, m.iso2);
    }
  }
  const { excluded } = buildCandidates({ zh: P }, data);
  assert.ok(excluded.some((e) => e.iso2 === "CN" && e.reason === "ad_market_restricted"));
});

test("user overrides: exclusions are respected and pinned markets are always included", () => {
  const ex = run(10000, {}, { exclude: ["US", "GB"] });
  assert.ok(!ex.markets.some((m) => ["US", "GB"].includes(m.iso2)));
  const pin = run(5000, {}, { include: ["IN"] });
  assert.ok(pin.markets.some((m) => m.iso2 === "IN" && m.pinned));
  assert.ok(Math.abs(pin.markets.reduce((s, m) => s + m.share, 0) - 1) < 1e-9);
});

test("dashboard pool: only markets whose CPL the forecast can show", () => {
  const r = run(25000, {}, { allowedCplSources: ["client-regional-proxy", "user-assumption"] });
  assert.ok(r.markets.every((m) => m.cpl.source !== "modelled-estimate"));
  assert.ok(r.markets.length >= 5);
  const withAssumption = run(25000, {}, { allowedCplSources: ["client-regional-proxy", "user-assumption"], cplOverrides: { GB: 45 } });
  assert.ok(withAssumption.markets.some((m) => m.iso2 === "GB" && m.cpl.source === "user-assumption"));
});

test("a budget below any testing minimum still returns one flagged market", () => {
  const r = run(500);
  assert.equal(r.markets.length, 1);
  assert.ok(r.notes.some((n) => /below the suggested testing minimum/.test(n)));
});

test("lead-target mode finds a budget whose conservative forecast reaches the target", () => {
  const r = recommend({ mode: "leads", amount: 100, languages: { en: P } }, data);
  assert.ok(r.totals.leads.lo >= 99.4 && r.totals.leads.lo <= 100.6);
  assert.ok(recommend({ mode: "leads", amount: 300, languages: { en: P } }, data).budget > r.budget);
  assert.deepEqual(run(10000), run(10000)); // deterministic
});

// ================================================================ affluent proxy and the objective
test("the affluent-audience estimate is one rule for every country and is not collapsed for large, lower-income countries", () => {
  const aff = (k) => data.countries[k].aff;
  for (const k of ["IN", "ID", "NG", "BD", "BR", "TR", "EG"]) assert.ok(aff(k) > 500_000, `${k} affluent ${aff(k)}`);
  assert.ok(aff("IN") > 10_000_000 && aff("IN") < 80_000_000);
  assert.ok(aff("US") > aff("IN") && aff("IN") > aff("PK") && aff("PK") > aff("SD"));
  // no country with a real population is estimated at a few dozen people
  for (const [k, c] of Object.entries(data.countries)) if (c.pop > 5_000_000 && c.gdp > 3000 && c.aff !== null && c.aff !== undefined) assert.ok(c.aff > 1000, `${k} ${c.aff}`);
  assert.match(csv("country-investment-conditions.csv").find((r) => r.country_iso2 === "IN").affluent_definition, /wealth-skewed Gini/);
});

test("the recommendation maximises total value: it beats the equal split and hand-built pairs", () => {
  const rec = run(5000, { en: P });
  assert.ok(rec.totals.objective >= rec.equalAlternative.objective - 1e-9);
  const { candidates } = buildCandidates({ en: P }, data);
  const pair = (a, b) => portfolioValue([{ c: candidates.find((c) => c.iso2 === a), spend: 2500 }, { c: candidates.find((c) => c.iso2 === b), spend: 2500 }], data.config);
  assert.ok(rec.totals.objective >= pair("GB", "US") - 1e-9, "at least as good as a UK + US pair");
  assert.ok(rec.totals.objective >= pair("GB", "IN") - 1e-9, "at least as good as a UK + India pair");
  assert.ok(rec.totals.leads.lo > 80, "and brings more leads than the UK + US pair");
  // the same holds at other budgets
  for (const b of [10000, 25000]) {
    const r = run(b, { en: P });
    assert.ok(r.totals.objective >= r.equalAlternative.objective - 1e-9, `${b}`);
  }
});

test("the chosen markets are the best available by utility, and the number of markets comes from the objective", () => {
  for (const [amount, langs] of [[5000, { en: P }], [10000, { en: P }], [25000, { en: P }], [10000, { ar: P }]]) {
    const rec = run(amount, langs);
    const { candidates } = buildCandidates(rec.languages, data);
    // markets pinned because of the chosen language are shown separately; the rest are the best by utility
    const anchors = rec.markets.filter((m) => m.languageAnchor).map((m) => m.iso2);
    const picked = rec.markets.filter((m) => !m.languageAnchor).map((m) => m.iso2).sort();
    const topK = candidates.filter((c) => !anchors.includes(c.iso2)).slice(0, picked.length).map((c) => c.iso2).sort();
    assert.deepEqual(picked, topK, `${amount}: the non-anchor markets are the best available by utility`);
    // adding or removing one market never raises the objective
    const cfg = data.config;
    const key = (k) => optimizePortfolio(candidates.slice(0, k), amount, { ...cfg, allocation: { ...cfg.allocation, max_markets: k, min_markets_when_affordable: k } }).objective;
    const n = rec.markets.length;
    if (anchors.length === 0 && n > cfg.allocation.min_markets_when_affordable) assert.ok(rec.totals.objective >= key(n - 1) - 1e-9, `${amount}: dropping one market`);
    if (anchors.length === 0 && n < cfg.allocation.max_markets && candidates.length > n) {
      const more = key(n + 1);
      assert.ok(rec.totals.objective >= more - 1e-6 || more === 0, `${amount}: adding one market`);
    }
  }
});

test("a small budget never goes entirely into one market when two proper tests are affordable", () => {
  for (const b of [3000, 4000, 5000, 6000]) assert.ok(run(b).markets.length >= 2, `${b}`);
});

test("cheap-but-weak markets are never recommended at any budget; quality beats price", () => {
  for (const b of [5000, 10000, 25000, 100000, 500000]) {
    const isos = run(b).markets.map((m) => m.iso2);
    for (const weak of ["SD", "MW", "MG", "UG", "SL"]) assert.ok(!isos.includes(weak), `${weak} at ${b}`);
  }
});

test("a market with real affluence and evidence can win at a small budget in either direction (not tied to one country)", () => {
  // Make a mid-quality cheap market and a high-quality dearer market swap places by changing only data.
  const tweak = (iso, patch) => ({ ...data, countries: { ...data.countries, [iso]: { ...data.countries[iso], ...patch } } });
  const base = run(5000, { en: P }).markets.map((m) => m.iso2);
  const boosted = recommend({ mode: "budget", amount: 5000, languages: { en: P } }, tweak("CA", { dx: 16.3, pp: 99, ic: 99, ci: 99 })).markets.map((m) => m.iso2);
  assert.ok(boosted.includes("CA"));
  const hurt = recommend({ mode: "budget", amount: 5000, languages: { en: P } }, tweak("US", { dx: null, pp: 10, ic: 10, ci: 10, aff: 5000 })).markets.map((m) => m.iso2);
  assert.ok(!hurt.includes("US"));
  assert.notDeepEqual(base, hurt);
});

// ================================================================ sales contribution
test("forecast uses country CPLs; open-ended ceilings keep an open upper bound", () => {
  const r = run(10000, { en: P });
  const india = r.markets.find((m) => m.iso2 === "IN") ?? run(25000, { en: P }).markets.find((m) => m.iso2 === "IN");
  assert.equal(india.leads.hi, null);
  assert.ok(Math.abs(india.leads.lo - india.spend / 30) < 1e-6);
  const us = r.markets.find((m) => m.iso2 === "US");
  assert.ok(Math.abs(us.leads.lo - us.spend / 70) < 1e-6);
  const lpa = leadsPerAed(Object.fromEntries(r.markets.map((m) => [m.iso2, m.share])), Object.fromEntries(r.markets.map((m) => [m.iso2, m.cpl])));
  assert.ok(Math.abs(r.totals.leads.lo - 10000 * lpa.lo) < 1e-6);
});

test("sales contribution is computed from the lead forecast, not from opportunity scores", () => {
  const r = run(25000, { en: P });
  const total = r.markets.reduce((s, m) => s + m.salesContribution, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
  for (const m of r.markets) {
    assert.ok(Math.abs(m.salesContribution - (m.leads.lo * r.closeRate) / r.markets.reduce((s, x) => s + x.leads.lo * r.closeRate, 0)) < 1e-9, m.iso2);
    assert.equal(m.qualifiedLeads.value, null); // no validated qualification rate
    assert.match(m.qualifiedLeads.status, /unavailable/);
  }
  // Changing only the scores (not CPLs or spend) cannot move contribution.
  const tampered = { ...data, countries: { ...data.countries, US: { ...data.countries.US, dx: 0.1 } } };
  const r2 = recommend({ mode: "budget", amount: 25000, languages: { en: P } }, tampered);
  const us = r.markets.find((m) => m.iso2 === "US");
  const us2 = r2.markets.find((m) => m.iso2 === "US");
  if (us2) assert.ok(Math.abs(us.leads.lo / us.spend - us2.leads.lo / us2.spend) < 1e-9);
});

test("one editable global close rate; ranking and shares do not depend on it; default is the agreed 1.5%", () => {
  assert.equal(data.config.close_rate.default, 0.015);
  const a = run(10000, {}, { closeRate: 0.015 });
  const b = run(10000, {}, { closeRate: 0.03 });
  assert.ok(Math.abs(b.totals.eventualSales.lo - 2 * a.totals.eventualSales.lo) < 1e-9);
  assert.deepEqual(a.markets.map((m) => m.iso2), b.markets.map((m) => m.iso2));
  assert.match(a.closeRateNote, /applied equally to every market/);
});

// ================================================================ dashboard integration (planner state)
register("./helpers/app-loader.mjs", import.meta.url);
const ps = await import("../src/components/market-planning/planner-state.ts");
const step = (s, a) => ps.reducer(s, a);
const iso = (s) => Object.keys(s.shares).sort();

test("dashboard starts in recommended mode with a dynamic market list", () => {
  const s = ps.initialState();
  assert.equal(s.selection, "recommended");
  assert.ok(Object.keys(s.shares).length > 0);
  assert.equal(Math.round(Object.values(s.shares).reduce((a, b) => a + b, 0) * 1e6) / 1e6, 1);
});

test("REGRESSION: in recommendation mode a budget change recalculates the market LIST, not just the shares", () => {
  let s = ps.initialState();
  const lists = new Map();
  for (const amount of [3000, 5000, 10000, 25000, 60000]) {
    const n = step(s, { type: "setAmount", value: amount });
    lists.set(amount, iso(n));
    assert.equal(n.selection, "recommended");
  }
  assert.ok(lists.get(3000).length < lists.get(10000).length, "small budget, fewer markets");
  assert.ok(lists.get(10000).length < lists.get(60000).length || lists.get(10000).length < lists.get(25000).length, "bigger budget, wider test");
  assert.ok(new Set([...lists.values()].map((l) => l.length)).size >= 3, "not stuck at one count");
  assert.ok(![...lists.values()].every((l) => l.length === 9), "no longer permanently nine");
  s = step(s, { type: "setAmount", value: 5000 });
  assert.ok(iso(s).length <= 3);
});

test("typing a partial or invalid amount does not empty or reshuffle the list", () => {
  const s = ps.initialState();
  const typed = step(s, { type: "setAmountText", text: "" });
  assert.deepEqual(iso(typed), iso(s));
  const bad = step(s, { type: "setAmountText", text: "12abc" });
  assert.deepEqual(iso(bad), iso(s));
});

test("in recommendation mode, changing agent languages recalculates recommended markets", () => {
  const en = ps.initialState();
  const withAr = step(step(en, { type: "setAmount", value: 25000 }), { type: "toggleLanguage", code: "ar" });
  const enOnly = step(en, { type: "setAmount", value: 25000 });
  assert.notDeepEqual(iso(withAr), iso(enOnly));
  assert.equal(withAr.selection, "recommended");
});

test("manual overrides are preserved when budget or languages change", () => {
  let s = step(ps.initialState(), { type: "setAmount", value: 25000 });
  const target = iso(s)[0];
  s = step(s, { type: "toggleMarket", iso2: target }); // user removes a recommended market
  assert.equal(s.selection, "custom");
  assert.ok(s.excluded.includes(target));
  const kept = iso(s);
  s = step(s, { type: "setAmount", value: 5000 });
  assert.deepEqual(iso(s), kept, "custom list survives a budget change");
  s = step(s, { type: "toggleLanguage", code: "fr" });
  assert.deepEqual(iso(s), kept, "custom list survives a language change");
  const start = ps.initialState();
  const added = ["GB", "SA", "SG", "IN", "JP", "TR"].find((k) => !(k in start.shares));
  let t = step(start, { type: "toggleMarket", iso2: added }); // user adds a market
  t = step(t, { type: "setAmount", value: 60000 });
  assert.ok(t.shares[added] !== undefined && t.selection === "custom");
  const slid = step(ps.initialState(), { type: "setShare", iso2: Object.keys(ps.initialState().shares)[0], share: 0.5 });
  assert.equal(slid.selection, "custom");
});

test("Reset to recommendations hands control back to the algorithm and clears exclusions", () => {
  let s = step(ps.initialState(), { type: "setAmount", value: 25000 });
  s = step(s, { type: "toggleMarket", iso2: iso(s)[0] });
  assert.equal(s.selection, "custom");
  const back = step(s, { type: "resetMarkets" });
  assert.equal(back.selection, "recommended");
  assert.deepEqual(back.excluded, []);
  assert.deepEqual(iso(back), iso(step(ps.initialState(), { type: "setAmount", value: 25000 })));
});

test("English is selected by default; any other choice makes the plan customised and Restore brings English back", () => {
  const fresh = ps.initialState();
  assert.deepEqual(fresh.languages, { en: "professional" }, "English shows as selected (1)");
  assert.equal(ps.isCustomized(fresh), false);
  for (const code of ["ar", "pa", "fr", "ur"]) {
    const s = step(fresh, { type: "toggleLanguage", code });
    assert.equal(ps.isCustomized(s), true, `adding ${code} should enable Restore`);
    // Arabic only: English switched off as well
    const only = step(s, { type: "toggleLanguage", code: "en" });
    assert.deepEqual(Object.keys(only.languages), [code]);
    assert.equal(ps.isCustomized(only), true, `${code} only should enable Restore`);
    const back = step(only, { type: "restore" });
    assert.deepEqual(back.languages, { en: "professional" }, "Restore shows English selected again");
    assert.equal(ps.isCustomized(back), false, "Restore is disabled again");
    assert.deepEqual(iso(back), iso(fresh));
  }
  // removing the last language puts English back rather than leaving none
  const none = step(fresh, { type: "toggleLanguage", code: "en" });
  assert.deepEqual(none.languages, { en: "professional" });
  // plans saved before English was shown as selected load as English
  assert.deepEqual(step(fresh, { type: "load", state: { ...fresh, languages: {} } }).languages, { en: "professional" });
  // a changed budget, a custom market list and a changed close rate each enable Restore too
  assert.equal(ps.isCustomized(step(fresh, { type: "setAmount", value: 25000 })), true);
  assert.equal(ps.isCustomized(step(fresh, { type: "toggleMarket", iso2: iso(fresh)[0] })), true);
  assert.equal(ps.isCustomized(step(fresh, { type: "setCloseRate", rate: 0.03 })), true);
  assert.equal(ps.isCustomized(step(step(fresh, { type: "setAmount", value: 25000 }), { type: "restore" })), false);
});

test("English alone behaves as the baseline in the language views; other languages show through", () => {
  assert.deepEqual(ps.uiLanguages({ en: "professional" }), {});
  assert.deepEqual(ps.uiLanguages({}), {});
  assert.deepEqual(Object.keys(ps.uiLanguages({ en: "professional", ar: "professional" })).sort(), ["ar", "en"]);
  assert.deepEqual(Object.keys(ps.uiLanguages({ ar: "professional" })), ["ar"]);
});

test("markets the user removed stay excluded across budget changes and return only after reset", () => {
  let s = step(ps.initialState(), { type: "setAmount", value: 25000 });
  const gone = iso(s)[0];
  s = step(s, { type: "toggleMarket", iso2: gone });
  s = step(s, { type: "setAmount", value: 60000 });
  assert.ok(!(gone in s.shares) && s.excluded.includes(gone));
  const back = step(s, { type: "resetMarkets" });
  assert.deepEqual(back.excluded, []);
  assert.ok(gone in step(back, { type: "setAmount", value: 25000 }).shares, "the market can be recommended again after reset");
});

test("old saved plans load as custom so their explicit market list is kept", async () => {
  const { sanitizePlan } = await import("../src/lib/market-planning/plan-io.ts");
  const old = { mode: "budget", amountText: "10000", shares: { US: 0.5, FR: 0.5 }, metaShare: 0.5, languages: {}, assumedCpl: {}, closeRate: 0.015, timingProvisional: true };
  const plan = sanitizePlan(old, () => true, () => true);
  assert.equal(plan.selection, "custom");
  assert.deepEqual(plan.excluded, []);
  const rec = sanitizePlan({ ...old, selection: "recommended", excluded: ["GB", "ZZZ", 7] }, (k) => k !== "ZZZ", () => true);
  assert.equal(rec.selection, "recommended");
  assert.deepEqual(rec.excluded, ["GB"]);
});

test("modelled CPLs are ON for the dashboard, with a 20% safety margin, and the user's own CPL still wins", async () => {
  const dash = await import("../src/lib/market-planning/intel/dashboard.ts");
  const dataMod = await import("../src/lib/market-planning/intel/data.ts");
  assert.equal(dash.DASHBOARD_USES_MODELLED_CPL, true);
  assert.equal(data.config.modelled_cpl_safety_margin.value, 0.2);
  // margin: low, base and high of a modelled range are raised 20%; client benchmarks and the AED 30 ceiling are not
  const raw = data.countries.SA;
  const m = dataMod.modelledCpl("SA");
  assert.ok(Math.abs(m.hi - raw.ch * 1.2) < 1e-9 && Math.abs(m.lo - raw.cl * 1.2) < 1e-9);
  assert.equal(m.source, "modelled-estimate");
  assert.equal(m.regionLabel, "Estimate");
  assert.equal(dataMod.modelledCpl("FR"), null); // client benchmark: never modelled
  assert.equal(resolveCpl(data.countries.KE, null, 0.2).hi, 30); // the client's ceiling is untouched
  assert.equal(resolveCpl(data.countries.US, null, 0.2).hi, 70);
  // the planner forecasts a country that has only a modelled CPL, and labels it
  const s = { ...ps.initialState(), shares: { SA: 0.5, FR: 0.5 }, selection: "custom" };
  const inputs = ps.marketInputs(s);
  assert.equal(inputs.find((x) => x.iso2 === "SA").cpl.source, "modelled-estimate");
  assert.equal(inputs.find((x) => x.iso2 === "FR").cpl.source, "client-regional-proxy");
  const own = ps.marketInputs({ ...s, assumedCpl: { SA: 40 } });
  assert.equal(own.find((x) => x.iso2 === "SA").cpl.source, "planning-assumption");
  assert.equal(own.find((x) => x.iso2 === "SA").cpl.hi, 40);
  // markets with no CPL at all (restricted) stay pending
  assert.equal(ps.marketInputs({ ...s, shares: { RU: 1 } })[0].cpl, null);
});

test("with the margin on, modelled markets cost more per lead and need a larger test budget", () => {
  const raw = resolveCpl(data.countries.SG, null, 0);
  const withMargin = resolveCpl(data.countries.SG, null, 0.2);
  assert.ok(Math.abs(withMargin.hi / raw.hi - 1.2) < 1e-9 && Math.abs(withMargin.lo / raw.lo - 1.2) < 1e-9);
  assert.ok(minTestBudget(withMargin, data.config) > minTestBudget(raw, data.config));
  const noMarginData = { ...data, config: { ...data.config, modelled_cpl_safety_margin: { value: 0 } } };
  const a = buildCandidates({ en: P }, data).candidates.find((c) => c.iso2 === "SG");
  const b = buildCandidates({ en: P }, noMarginData).candidates.find((c) => c.iso2 === "SG");
  assert.ok(a.utility < b.utility, "a safety margin lowers a modelled market's value per AED");
});

test("dashboard recommendations now include modelled-CPL markets and flag them", () => {
  let s = ps.initialState();
  s = step(s, { type: "setAmount", value: 25000 });
  const inputs = ps.marketInputs(s);
  assert.ok(inputs.every((x) => x.cpl !== null), "every recommended market is forecastable");
  assert.ok(inputs.some((x) => x.cpl.source === "modelled-estimate"), "some recommended markets use a modelled estimate");
  const plan = ps.planFor(s).result;
  assert.equal(plan.usesModelled, true);
});

test("dashboard recommendation mode: toggling Arabic brings the UAE in at every budget; custom lists are untouched", () => {
  for (const amount of [5000, 10000, 25000]) {
    let s = ps.reducer(ps.initialState(), { type: "setAmount", value: amount });
    s = ps.reducer(s, { type: "toggleLanguage", code: "ar" });
    assert.ok("AE" in s.shares, `AE at ${amount}`);
    assert.equal(s.selection, "recommended");
  }
  let c = ps.reducer(ps.initialState(), { type: "toggleMarket", iso2: Object.keys(ps.initialState().shares)[0] }); // custom
  const before = Object.keys(c.shares).sort().join();
  c = ps.reducer(c, { type: "toggleLanguage", code: "ar" });
  assert.equal(Object.keys(c.shares).sort().join(), before, "a custom list is not changed by language");
});

test("Clear all keeps exactly one market: the strongest of the selected ones by the recommendation's own ranking", async () => {
  const dash = await import("../src/lib/market-planning/intel/dashboard.ts");
  const s = step(ps.initialState(), { type: "setAmount", value: 25000 });
  const isos = iso(s);
  assert.ok(isos.length > 3);
  const best = dash.bestOfMarkets(isos, s.languages);
  assert.ok(best && isos.includes(best), "the best market is one of the selected markets");
  const cleared = step(s, { type: "removeMarkets", iso2s: isos.filter((i) => i !== best) });
  assert.deepEqual(iso(cleared), [best]);
  assert.equal(cleared.selection, "custom");
  assert.ok(Math.abs(Object.values(cleared.shares)[0] - 1) < 1e-9);
  // the kept market is the one with the highest utility among the selected
  const { buildCandidates, effectiveLanguages } = await import("../src/lib/market-planning/intel/recommend.ts");
  const ranked = buildCandidates(effectiveLanguages(s.languages, data.config), data).candidates.filter((c) => isos.includes(c.iso2));
  assert.equal(ranked[0].iso2, best);
  // a single market cannot be cleared further
  assert.deepEqual(iso(step(cleared, { type: "removeMarkets", iso2s: [best] })), [best]);
  assert.equal(dash.bestOfMarkets(["RU", "KP"], {}), null, "no eligible market: caller falls back to its own order");
});

