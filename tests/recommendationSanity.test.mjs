// Sanity tests on the REAL data (your edited sheets): the recommendation must not favour markets with capital
// restrictions or weak buyer quality just because their leads are cheap.
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

process.env.INTEL_LIVE = "1";
register("./helpers/app-loader.mjs", import.meta.url);
const { recommendMarkets, INTEL } = await import("../src/lib/market-planning/intel/data.ts");
const { opportunityOf, OPPORTUNITY } = await import("../src/lib/market-planning/intel/opportunity.ts");
const { buildCandidates, effectiveLanguages } = await import("../src/lib/market-planning/intel/recommend.ts");
const { marketQuality } = await import("../src/lib/market-planning/intel/dashboard.ts");

const SOURCES = ["client-regional-proxy", "modelled-estimate", "user-assumption"];
// Markets with no proven Dubai demand and real restrictions. Markets with proven demand (e.g. Pakistan, Russia, Egypt, Lebanon)
// may now appear, because real buyers from there show that capital moves.
const RESTRICTED = ["SY", "IR", "AF", "SD", "SS", "KP", "CU", "VE", "YE", "MM", "LY", "BY"];
const rec = (amount, languages) => recommendMarkets({ mode: "budget", amount, languages, allowedCplSources: SOURCES });

test("restricted-capital markets are never recommended at any common budget or language mix", () => {
  for (const amount of [5000, 10000, 25000, 50000]) {
    for (const languages of [{ en: "professional" }, { en: "professional", ar: "professional" }, { ar: "professional" }, { en: "professional", ur: "professional", hi: "professional" }]) {
      const isos = rec(amount, languages).markets.map((m) => m.iso2);
      for (const bad of RESTRICTED) assert.ok(!isos.includes(bad), `${bad} recommended at ${amount} for ${Object.keys(languages)}`);
    }
  }
});

test("10k English: a strong buyer market (US/UK/Germany/India/Singapore) leads, and Lebanon and Egypt do not make the list", () => {
  const r = rec(10000, { en: "professional" });
  const isos = r.markets.map((m) => m.iso2);
  assert.ok(r.markets.length >= 3, "should not collapse to one or two markets");
  assert.ok(!isos.includes("LB"), "Lebanon should not be recommended");
  assert.ok(!isos.includes("EG"), "Egypt should not be recommended at this budget");
  const top = [...r.markets].sort((a, b) => b.share - a.share)[0].iso2;
  assert.ok(["US", "GB", "DE", "IN", "SG"].includes(top), `top market was ${top}`);
  assert.ok(Math.abs(r.markets.reduce((s, m) => s + m.share, 0) - 1) < 0.01);
});

test("a strong buyer market beats cheap leads from a restricted market in the ranking", () => {
  const { candidates } = buildCandidates(effectiveLanguages({ en: "professional" }, INTEL.config), INTEL, { allowedCplSources: SOURCES });
  const rank = (k) => candidates.findIndex((c) => c.iso2 === k);
  assert.ok(rank("US") >= 0 && rank("US") < rank("EG"), "US should outrank Egypt");
  assert.ok(rank("US") < rank("LB"), "US should outrank Lebanon");
  assert.ok(rank("GB") < rank("PK"), "UK should outrank Pakistan");
});

test("opportunity score: capital controls lower a market, and weak access shows in the total", () => {
  const sd = opportunityOf("SD");
  const de = opportunityOf("DE");
  assert.ok(sd.accessFactor < 0.8, `Sudan access factor ${sd.accessFactor}`);
  assert.equal(de.accessFactor, 1);
  assert.ok(de.total > sd.total, "Germany should score above Sudan");
  assert.ok(opportunityOf("US").total > opportunityOf("EG").total);
});

test("Best markets for sales ranks on quality-weighted leads, so a strong market is not buried by cheap-lead markets", () => {
  const q = (k) => marketQuality(k, { en: "professional" });
  const emphasis = INTEL.config.selection.quality_emphasis;
  // 9 US leads vs 20 Pakistan leads at 1.5% close: US should win once quality counts.
  assert.ok(9 * q("US") ** emphasis > 20 * q("PK") ** emphasis);
});

// ---- close rate by market ----
const { closeRateMultiplier, marketCloseRate, isWeakForSales } = await import("../src/lib/market-planning/intel/dashboard.ts");
const EN = { en: "professional" };

test("close rate: strong buyer markets close more than the base, weak ones far less, always inside the limits", () => {
  assert.ok(closeRateMultiplier("US", EN) > 1, "US above base");
  assert.ok(closeRateMultiplier("IN", EN) > 1, "India above base");
  assert.ok(closeRateMultiplier("SD", EN) < 0.25, "Sudan far below base");
  for (const iso of Object.keys(INTEL.countries)) {
    const m = closeRateMultiplier(iso, EN);
    assert.ok(m >= 0.2 / 1.5 - 1e-9 && m <= 2.5 / 1.5 + 1e-9, `${iso} multiplier ${m}`);
  }
});

test("close rate: Sudan only at 10k brings far fewer sales than the recommended mix, and is flagged weak", () => {
  const sudanLeads = 333;
  const sudanSales = sudanLeads * marketCloseRate("SD", 0.015, EN);
  assert.ok(sudanSales < 1.5, `Sudan sales ${sudanSales}`);
  assert.ok(isWeakForSales("SD", EN));
  assert.ok(!isWeakForSales("US", EN) && !isWeakForSales("IN", EN) && !isWeakForSales("GB", EN));
});

test("close rate: a blend of markets lands between its best and worst market and follows the leads", () => {
  const leads = { IN: 200, CA: 60, SG: 70 };
  const total = Object.values(leads).reduce((a, b) => a + b, 0);
  const sales = Object.entries(leads).reduce((s, [k, n]) => s + n * marketCloseRate(k, 0.015, EN), 0);
  const blended = sales / total;
  const rates = Object.keys(leads).map((k) => marketCloseRate(k, 0.015, EN));
  assert.ok(blended >= Math.min(...rates) && blended <= Math.max(...rates));
  assert.ok(Math.abs(blended - marketCloseRate("IN", 0.015, EN)) < Math.abs(blended - Math.min(...rates)), "India has most leads, so the blend sits near India");
});

test("proven Dubai demand cancels the capital-access penalty: Pakistan, Russia, Egypt, Turkiye are not weak, unproven markets still are", () => {
  for (const iso of ["PK", "RU", "EG", "TR"]) assert.ok(!isWeakForSales(iso, EN), `${iso} should not be weak`);
  for (const iso of ["SD", "AF", "SY", "SS", "IR"]) assert.ok(isWeakForSales(iso, EN), `${iso} should stay weak`);
  // the penalty is reduced, not removed, below fully proven demand
  const pk = opportunityOf("PK");
  assert.ok(pk.accessFactor > 0.9, `Pakistan access factor ${pk.accessFactor}`);
  assert.ok(opportunityOf("SD").accessFactor < 0.8);
});

test("no data is not weakness: unknown demand stays unknown, wealthy hubs are not marked weak, client sales prove demand", () => {
  // unknown Dubai demand is left blank in the data, never a made-up low number
  assert.equal(OPPORTUNITY.scores.AT.s[0], null);
  assert.equal(OPPORTUNITY.scores.NZ.s[0], null);
  // motivations estimated from currency stress can only raise a country above neutral
  for (const iso of ["SC", "NZ", "MU", "MT"]) assert.ok(OPPORTUNITY.scores[iso].s[2] >= 40, `${iso} motivations`);
  for (const iso of ["SC", "NZ", "MU", "MT", "CY", "BS", "AT"]) assert.ok(!isWeakForSales(iso, EN), `${iso} should not be weak`);
  // a client sale (client_boost above 0) counts as proven demand: Seychelles has real sales
  assert.ok(OPPORTUNITY.scores.SC.b > 0);
  assert.ok(opportunityOf("SC").parts.find((p) => p.key === "dubai_demand").score >= 60);
});

test("close rate follows the buyer score in a straight line (not squared)", () => {
  const a = closeRateMultiplier("IN", EN);
  const b = closeRateMultiplier("PK", EN);
  const qa = marketQuality("IN", EN);
  const qb = marketQuality("PK", EN);
  assert.ok(Math.abs(b / a - qb / qa) < 0.02, `ratio ${b / a} vs ${qb / qa}`);
});

// ---- language and cost per lead ----
const { languageCplFactor, scaleCpl, LANGUAGE_CPL } = await import("../src/lib/market-planning/intel/recommend.ts");
const F = (iso, l) => languageCplFactor(iso, l, INTEL);

test("language CPL: a language that reaches fewer people in a country makes leads dearer, English stays the baseline", () => {
  assert.equal(F("DE", EN), 1);
  assert.ok(F("DE", { ar: "professional" }) > 1.4 && F("DE", { ar: "professional" }) <= 2.5, "Germany with Arabic only");
  assert.ok(F("DE", { fr: "professional" }) > 1.2, "Germany with French only");
  assert.ok(F("FR", { fr: "professional" }) < 1, "France with French is a little cheaper than English");
  assert.ok(F("SA", { ar: "professional" }) <= 1, "Saudi Arabia with Arabic is not dearer");
  assert.ok(F("GB", { ar: "professional" }) > 1.2, "UK with Arabic only is dearer than English");
});

test("language CPL: always inside the limits, never scales a figure the user typed", () => {
  for (const iso of Object.keys(INTEL.countries)) for (const l of [{ ar: "professional" }, { fr: "professional" }, { hi: "professional" }, EN]) {
    const f = F(iso, l);
    assert.ok(f >= LANGUAGE_CPL.min - 1e-9 && f <= LANGUAGE_CPL.max + 1e-9, `${iso} ${f}`);
  }
  const typed = { lo: 80, hi: 80, base: 80, relation: "point", source: "user-assumption", confidence: "user" };
  assert.equal(scaleCpl(typed, 2).hi, 80);
  const bench = { lo: 40, hi: 60, base: 50, relation: "range", source: "client-regional-proxy", confidence: "x" };
  const s = scaleCpl(bench, 1.5);
  assert.deepEqual([s.lo, s.hi, s.base], [60, 90, 75]);
});

test("language CPL: Arabic only at 25k keeps Germany out unless it earns its place at the higher CPL", () => {
  const r = rec(25000, { ar: "professional" });
  for (const m of r.markets.filter((x) => x.iso2 === "DE")) {
    assert.ok(m.cpl.hi > 50 * 1.4, `Germany CPL with Arabic: ${m.cpl.hi}`);
  }
});

test("language data: researched Punjabi speaker counts are in place for Canada, Australia, the UK, the US, New Zealand and the UAE", () => {
  for (const iso of ["CA", "AU", "GB", "US", "NZ", "AE"]) assert.ok((INTEL.languageShare[iso]?.pa ?? 0) > 0.05, `${iso} Punjabi share`);
  assert.ok(INTEL.languageShare.CA.pa > 2 && INTEL.languageShare.CA.pa < 2.6, "Canada: 942,000 of about 41.6 million");
  assert.ok(INTEL.languageShare.GB.pa < 1, "UK census figure replaced the older CLDR share");
});

// ---- budget spread and language reach ----
const { languageReach } = await import("../src/lib/market-planning/intel/dashboard.ts");

test("budget spread: a big budget adds more markets instead of piling into one", () => {
  const n = (amount, l) => rec(amount, l).markets.length;
  assert.ok(n(50000, { pa: "professional" }) >= 5, "Punjabi at 50k");
  assert.ok(n(50000, { hi: "professional", ur: "professional" }) >= 5, "Hindi + Urdu at 50k");
  assert.ok(n(50000, EN) >= 8, "English at 50k");
  assert.ok(n(250000, { pa: "professional" }) >= n(10000, { pa: "professional" }));
  for (const amount of [25000, 100000]) {
    const top = Math.max(...rec(amount, { pa: "professional" }).markets.map((m) => m.share));
    assert.ok(top <= 0.6 + 1e-9, `largest share at ${amount}: ${top}`);
  }
});

test("language reach: researched communities are reachable, unknown is 'no data' not zero", () => {
  assert.notEqual(languageReach("CA", { pa: "professional" }).level, "low");
  assert.notEqual(languageReach("FR", { ar: "professional" }).level, "low");
  assert.notEqual(languageReach("SA", { ur: "professional" }).level, "low");
  assert.ok(languageReach("SA", { ur: "professional" }).speakers > 100000);
  assert.equal(languageReach("IN", { hi: "professional" }).level, "strong");
  const none = Object.keys(INTEL.countries).filter((k) => languageReach(k, { pa: "professional" }).level === "nodata");
  assert.ok(none.length > 0, "some countries have no Punjabi data at all");
});

test("language reach: big diaspora communities count (UK Hindi, Urdu and Punjabi are partial; Arabic in France is partial or better)", () => {
  for (const code of ["hi", "ur", "pa"]) assert.ok(["partial", "strong"].includes(languageReach("GB", { [code]: "professional" }).level), `UK ${code}`);
  assert.ok(["partial", "strong"].includes(languageReach("FR", { ar: "professional" }).level));
  assert.ok(["partial", "strong"].includes(languageReach("US", { ar: "professional" }).level));
  assert.ok(["partial", "strong"].includes(languageReach("AE", { hi: "professional" }).level));
  // a country with almost no speakers is still low
  assert.equal(languageReach("NO", { ur: "professional" }).level, "low");
});
